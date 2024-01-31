open Utils

(** This middleware is used for Cross-Origin Request Sharing (CORS). It lets the
    clients know which HTTP methods are authorized when they do preflight
    requests. We have to allow CORS requests because the backend and frontend
    are not on the same domain (i.e., origin). *)
let middleware : Dream.middleware = fun handler request ->
  let headers = [
    ("Access-Control-Allow-Origin", !Options.frontend_origin);
    ("Access-Control-Allow-Methods", "GET, POST, HEAD, PATCH, DELETE");
    ("Access-Control-Allow-Headers", "Authorization");
    ("Access-Control-Allow-Credentials", "true");
    (* This enables browsers to cache this response for up to 24 hours, avoiding many OPTIONS requests *)
    ("Access-Control-Max-Age", "86400");
  ] in
  match Dream.method_ request with
  | `OPTIONS ->
    (* Upon a preflight request (OPTIONS), just send the headers *)
    Dream.empty ~headers `No_Content
  | _ ->
    let* response = handler request in
    (* We need to add the headers to any other response too *)
    List.iter (fun (name, value) -> Dream.add_header response name value) headers;
    Lwt.return (response)
