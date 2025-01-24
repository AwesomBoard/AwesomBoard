open Utils

(** This middleware is used for Cross-Origin Request Sharing (CORS). It lets the
    clients know which HTTP methods are authorized when they do preflight
    requests (i.e., OPTIONS). We have to allow CORS requests because the backend
    and frontend are not on the same domain (i.e., origin). *)
let middleware = fun (origin : string) : Dream.middleware ->
    fun (handler : Dream.handler) (request : Dream.request) ->
      let headers = [
          ("Access-Control-Allow-Origin", origin);
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
          (* This is a regular request that will be handled by the backend, so let's handle it *)
          let* response = handler request in
          (* We need to add the relevant headers for good CORS behavior *)
          List.iter (fun (name, value) -> Dream.add_header response name value) headers;
          Lwt.return (response)
