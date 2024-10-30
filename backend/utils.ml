(** [UnexpectedError reason] is raised upon unexpected errors *)
exception UnexpectedError of string

(** [DocumentNotFound path] is raised when a firestore document is missing. This will
    result in a [`Not_Found] response from our end *)
exception DocumentNotFound of string

(** [DocumentInvalid path] is raised when a firestore document exists but can't be
    converted to the proper type. This will result in a [`Not_Found] response from
    our end, as it's like the document does not exist. *)
exception DocumentInvalid of string

(** [BadInput input] is raised when the client did not include the correct information
    as part of their request *)
exception BadInput of string

(** We want to have let* denote a monadic operation from Lwt in order to have more readability *)
let ( let* ) = Lwt.bind

(** A wrapper around Yojson.Safe *)
module JSON = struct
    include Yojson.Safe

    (** We need conversion functions from and to JSON.t to be able to include a
        JSON.t inside another type that we want to convert *)
    let to_yojson = fun (json : t) : t -> json
    let of_yojson = fun (json : t) : (t, string) result -> Ok json

    (** Helper to define conversion for enum-like variants, as ppx-yojson's
        conversion is not what we want here.  [for_enum [value, json_value; ...]]
        provide conversion functions that transform the OCaml value [value] into
        the JSON value [json_value], and vice-versa. *)
    let for_enum = fun (values : ('a * t) list) : (('a -> t) * (t -> ('a, string) result)) ->
        let inversed_values = List.map (fun (x, y) -> (y, x)) values in
        let enum_to_yojson = fun (v : 'a) : t -> List.assoc v values in
        let enum_of_yojson = fun (json : t) : ('a, string) result ->
            match List.assoc_opt json inversed_values with
            | Some v -> Ok v
            | None -> Error "not a member of the enum" in
        (enum_to_yojson, enum_of_yojson)

end

module CryptoUtils = struct
    (** We will be using RSA keys only *)
    type public_key = Mirage_crypto_pk.Rsa.pub
    type private_key = Mirage_crypto_pk.Rsa.priv

    (** [public_key_of_certificate_string pem] extracts an RSA public key from the
        PEM string that represents a certificate. Raises [UnexpectedError] in case
        of failure. *)
    let public_key_of_certificate_string = fun (pem : string) : public_key ->
        let public_key = pem |> X509.Certificate.decode_pem in
        match public_key with
        | Error _ -> raise (UnexpectedError "Invalid certificate")
        | Ok cert -> match X509.Certificate.public_key cert with
            | `RSA pk -> pk
            | _ -> raise (UnexpectedError "Certificate does not contain an RSA public key")

end

module DreamUtils = struct
    let fail = fun (status : Dream.status) (reason : string) : Dream.response Lwt.t ->
        Dream.respond ~status
            (JSON.to_string (`Assoc [
                 "reason", `String reason
             ]))

    let authorization_header = fun (access_token : string) : (string * string) ->
        ("Authorization", "Bearer " ^ access_token)

    let get_json_param = fun (request : Dream.request) (field : string) : (JSON.t, string) result ->
        match Dream.query request field with
        | None -> Error (Printf.sprintf "parameter missing: %s" field)
        | Some value ->
            try Ok (Yojson.Safe.from_string value)
            with Yojson.Json_error error -> Error error
end

module FirestoreUtils = struct

    let path_in_project = fun (path : string) : string ->
        Printf.sprintf "projects/%s/databases/%s/documents/%s"
            !Options.project_name
            !Options.database_name
            path

    (* The endpoint with which we can communicate with Firestore *)
    let endpoint = fun ?(version = "v1beta1") ?(params = []) (path : string) : Uri.t ->
        let url = Uri.of_string (Printf.sprintf "%s/%s/%s"
                                     !Options.base_endpoint
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
             | _-> raise (UnexpectedError ("Invalid firestore JSON: unexpected value when extracting field: " ^ (JSON.to_string value)))) in
        match json with
        | `Assoc [] -> `Assoc []
        | `Assoc _ -> begin match JSON.Util.member "fields" json with
            | `Assoc fields -> `Assoc (List.map extract_field fields)
            | _ -> raise (UnexpectedError ("Invalid firestore JSON: not an object: " ^ (JSON.to_string json)))
        end
        | _ -> raise (UnexpectedError ("Invalid firestore JSON: not an object: " ^ (JSON.to_string json)))

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
            | _ -> raise (UnexpectedError ("Invalid object for firestore: unsupported field: " ^ (JSON.to_string v)))
        and transform_key_and_field = fun ((key, field) : string * JSON.t) : (string * JSON.t) ->
            (key, transform_field field) in
        let doc_with_fields : JSON.t = match doc with
            | `Assoc fields -> `Assoc (List.map transform_key_and_field fields)
            | _ -> raise (UnexpectedError "Invalid object for firestore") in
        let name = match path with
            | Some p -> [("name", `String ("projects/" ^ !Options.project_name ^ "/databases/" ^ !Options.database_name ^ "/documents/" ^ p))]
            | None -> [] in
        `Assoc (name @ [("fields", doc_with_fields)])
end
