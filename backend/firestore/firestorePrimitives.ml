open Utils

module FirestoreUtils = struct

    let project_name : string ref = ref ""
    let database_name : string ref = ref ""
    let base_endpoint : string ref = ref ""

    let set_config = fun (project : string)
                         (database : string)
                         (base : string)
                         : unit ->
        project_name := project;
        database_name := database;
        base_endpoint := base


    let path_in_project = fun (path : string) : string ->
        Printf.sprintf "projects/%s/databases/%s/documents/%s"
            !project_name
            !database_name
            path

    (* The endpoint with which we can communicate with Firestore *)
    let endpoint = fun ?(version = "v1beta1") ?(params = []) (path : string) : Uri.t ->
        let url = Uri.of_string (Printf.sprintf "%s/%s/%s"
                                     !base_endpoint
                                     version
                                     (path_in_project path)) in
        Uri.with_query' url params


    (** [of_firestore json] converts [json] from its Firestore encoding to a regular JSON *)
    let rec of_firestore = fun (json : JSON.t) : JSON.t ->
        let rec extract_field = fun ((key, value) : (string * JSON.t)) : (string * JSON.t) ->
            (key, match value with
             | `Assoc [("mapValue", v)] -> of_firestore v
             | `Assoc [("integerValue", `String v)] -> `Int (int_of_string v)
             | `Assoc [("arrayValue", `Assoc ["values", `List l])] -> `List (List.map (fun x -> snd (extract_field ("k", x))) l)
             | `Assoc [(_, v)] -> v (* We just rely on the real type contained, not on the type name from firestore *)
             | _-> raise (Errors.UnexpectedError ("Invalid firestore JSON: unexpected value when extracting field: " ^ (JSON.to_string value)))) in
        match json with
        | `Assoc [] -> `Assoc []
        | `Assoc _ -> begin match JSON.Util.member "fields" json with
            | `Assoc fields -> `Assoc (List.map extract_field fields)
            | _ -> raise (Errors.UnexpectedError ("Invalid firestore JSON: not an object: " ^ (JSON.to_string json)))
        end
        | _ -> raise (Errors.UnexpectedError ("Invalid firestore JSON: not an object: " ^ (JSON.to_string json)))

    (** [to_firestore json] converts a regular [json] to the Firestore JSON encoding *)
    let to_firestore = fun ?(path : string option) (doc : JSON.t) : JSON.t  ->
        (* Types of values are documented here: https://cloud.google.com/firestore/docs/reference/rest/Shared.Types/ArrayValue#Value *)
        let rec transform_field = fun (v : JSON.t) : JSON.t ->
            match v with
            | `String v -> `Assoc [("stringValue", `String v)]
            | `Bool v -> `Assoc [("booleanValue", `Bool v)]
            | `Intlit v -> `Assoc [("integerValue", `String v)]
            | `Null -> `Assoc [("nullValue", `Null)]
            | `Assoc fields -> `Assoc [("mapValue", `Assoc [("fields", `Assoc (List.map transform_key_and_field fields))])]
            | `List v -> `Assoc [("arrayValue", `Assoc [("values", `List (List.map transform_field v))])]
            | `Float v -> `Assoc [("doubleValue", `Float v)]
            | `Int v -> `Assoc [("integerValue", `String (string_of_int v))]
            | _ -> raise (Errors.UnexpectedError ("Invalid object for firestore: unsupported field: " ^ (JSON.to_string v)))
        and transform_key_and_field = fun ((key, field) : string * JSON.t) : (string * JSON.t) ->
            (key, transform_field field) in
        let doc_with_fields : JSON.t = match doc with
            | `Assoc fields -> `Assoc (List.map transform_key_and_field fields)
            | _ -> raise (Errors.UnexpectedError "Invalid object for firestore") in
        let name = match path with
            | Some p -> [("name", `String ("projects/" ^ !project_name ^ "/databases/" ^ !database_name ^ "/documents/" ^ p))]
            | None -> [] in
        `Assoc (name @ [("fields", doc_with_fields)])
end
open FirestoreUtils


(** These are the primitive operations that we need to perform on firestore.
    It is a low-level API. *)
module type FIRESTORE_PRIMITIVES = sig

    (** [get_doc ~request ~path] retrieves the Firestore document from [path] and returns is at a JSON.
        [request] is used to store read/write statistics.
        @raise [DocumentNotFound path] if it is not found
        @raise [UnexpectedError reason] in case the document can't be converted to JSON *)
    val get_doc : request:Dream.request -> path:string -> JSON.t Lwt.t

    (** [try_get_doc ~request ~path] is like to [get_doc ~request ~path], but
        preferred to use when it is expected that the document may not exist. If
        the document does not exist, [None] is returned.
        @raise [UnexpectedError reason] in case the document can't be converted to JSON *)
    val try_get_doc : request:Dream.request -> path:string -> JSON.t Option.t Lwt.t

    (** [create_doc ~request ~collection ~doc] creates a new document with content [doc] in the provided [collection].
        [request] is used to store read/write statistics.
        @raise [UnexpectedError reason] in case Firestore rejects our creation. *)
    val create_doc : request:Dream.request -> collection:string -> doc:JSON.t -> string Lwt.t

    (** [set_doc ~request ~collection ~id ~doc] writes over a document that may already exist at [path/id], replacing it by [doc].
        The difference with [create_doc] is that [set_doc] enables creating a doc with a specific id.
        [request] is used to store read/write statistics.
        @raise [UnexpectedError reason] in case Firestore rejects our operation. *)
    val set_doc : request:Dream.request -> collection:string -> id:string -> doc:JSON.t -> unit Lwt.t

    (** [update_doc ~request ~path ~update] updates a document at [path] with a partial update [update].
        [request] is used to store read/write statistics.
        @raise [UnexpectedError reason] in case Firestore rejects our update. *)
    val update_doc : request:Dream.request -> path:string -> update:JSON.t -> unit Lwt.t

    (** [delete_doc ~request ~path] deletes the document at [path].
        [request] is used to store read/write statistics.
        @raise [UnexpectedError reason] in case Firestore rejects our deletion. *)
    val delete_doc : request:Dream.request -> path:string -> unit Lwt.t

end

module Make
        (External : External.EXTERNAL)
        (TokenRefresher : TokenRefresher.TOKEN_REFRESHER)
        (Stats : Stats.STATS)
    : FIRESTORE_PRIMITIVES = struct

    let logger : Dream.sub_log = Dream.sub_log "firestore"

    let is_error = fun (response : Cohttp.Response.t) ->
        Cohttp.Code.is_error (Cohttp.Code.code_of_status response.status)

    let try_get_doc = fun ~(request : Dream.request) ~(path : string) : JSON.t Option.t Lwt.t ->
        Stats.read request;
        logger.info (fun log -> log ~request "Getting %s" path);
        let* headers = TokenRefresher.header request in
        let* (response, body) = External.Http.get ~headers (endpoint path) in
        if is_error response then
            Lwt.return None
        else
            Lwt.return (Some (of_firestore (JSON.from_string body)))

    let get_doc = fun ~(request : Dream.request) ~(path : string) : JSON.t Lwt.t ->
        let* doc = try_get_doc ~request ~path in
        match doc with
        | Some found -> Lwt.return found
        | None -> raise (Errors.DocumentNotFound path)

    let create_doc = fun ~(request : Dream.request) ~(collection : string) ~(doc : JSON.t) : string Lwt.t ->
        let get_id_from_firestore_document_name (doc : JSON.t) : string =
            let name = JSON.Util.(doc |> member "name" |> to_string) in
            let elements = String.split_on_char '/' name in
            let id = List.nth elements (List.length elements - 1) in
            id in
        Stats.write request;
        logger.info (fun log -> log ~request "Creating %s: %s" collection (JSON.to_string doc));
        let* headers = TokenRefresher.header request in
        let firestore_doc = to_firestore doc in
        (* By asking only for _, firestore will not give us the document back, which is what we want *)
        let params = [("mask.fieldPaths", "_")] in
        let endpoint = endpoint ~params collection in
        (* Note: We *can't* create a doc and retrieve its id in a transaction, so we just ignore whether we are in a transaction *)
        let* (response, body) = External.Http.post_json ~headers firestore_doc endpoint in
        if is_error response
        then raise (Errors.UnexpectedError (Printf.sprintf "error on document creation for %s: %s" collection body))
        else Lwt.return (get_id_from_firestore_document_name (JSON.from_string body))

    let update_doc = fun ~(request : Dream.request) ~(path : string) ~(update : JSON.t) : unit Lwt.t ->
        let update_to_fields_and_firestore (update : JSON.t) : string list * JSON.t =
            let fields = match update with
                | `Assoc key_values -> List.map fst key_values
                | _ -> raise (Errors.UnexpectedError "invalid update: should be a Assoc") in
            (fields, to_firestore update) in
        Stats.write request;
        logger.info (fun log -> log ~request "Updating %s with %s" path (JSON.to_string update));
        (* We want only to update what we provide, and we don't care about the response so we provide an empty mask *)
        let (fields, firestore_update) = update_to_fields_and_firestore update in
        let update_params = List.map (fun field -> ("updateMask.fieldPaths", field)) fields in
        let params = ("mask.fieldPaths", "_") :: update_params in
        let endpoint = endpoint ~params path in
        let* headers = TokenRefresher.header request in
        let* (response, body) = External.Http.patch_json ~headers firestore_update endpoint in
        if is_error response
        then raise (Errors.UnexpectedError (Printf.sprintf "error on document update for %s: %s" path body))
        else Lwt.return ()

    let set_doc = fun ~(request : Dream.request) ~(collection : string) ~(id : string) ~(doc : JSON.t) : unit Lwt.t ->
        update_doc ~request ~path:(Printf.sprintf "%s/%s" collection id) ~update:doc

    let delete_doc = fun ~(request : Dream.request) ~(path : string) : unit Lwt.t ->
        Stats.write request;
        logger.info (fun log -> log ~request "Deleting %s" path);
        let* headers = TokenRefresher.header request in
        let* (response, body) = External.Http.delete ~headers (endpoint path) in
        if is_error response
        then raise (Errors.UnexpectedError (Printf.sprintf "error on document deletion for %s: %s" path body))
        else Lwt.return ()

end
