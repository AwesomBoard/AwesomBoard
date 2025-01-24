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
