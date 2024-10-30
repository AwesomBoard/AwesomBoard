open Utils
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
        | None -> raise (DocumentNotFound path)

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
        then raise (UnexpectedError (Printf.sprintf "error on document creation for %s: %s" collection body))
        else Lwt.return (get_id_from_firestore_document_name (JSON.from_string body))

    let update_doc = fun ~(request : Dream.request) ~(path : string) ~(update : JSON.t) : unit Lwt.t ->
        let update_to_fields_and_firestore (update : JSON.t) : string list * JSON.t =
            let fields = match update with
                | `Assoc key_values -> List.map fst key_values
                | _ -> raise (UnexpectedError "invalid update: should be a Assoc") in
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
        then raise (UnexpectedError (Printf.sprintf "error on document update for %s: %s" path body))
        else Lwt.return ()

    let set_doc = fun ~(request : Dream.request) ~(collection : string) ~(id : string) ~(doc : JSON.t) : unit Lwt.t ->
        update_doc ~request ~path:(Printf.sprintf "%s/%s" collection id) ~update:doc

    let delete_doc = fun ~(request : Dream.request) ~(path : string) : unit Lwt.t ->
        Stats.write request;
        logger.info (fun log -> log ~request "Deleting %s" path);
        let* headers = TokenRefresher.header request in
        let* (response, body) = External.Http.delete ~headers (endpoint path) in
        if is_error response
        then raise (UnexpectedError (Printf.sprintf "error on document deletion for %s: %s" path body))
        else Lwt.return ()

end
