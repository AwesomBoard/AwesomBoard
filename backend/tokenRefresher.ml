open Utils
open CryptoUtils

(** The token refresher manages the admin token of the backend. When a request
    need to be done to firestore, the token can be passed in the header with the
    [header] helper. This may trigger a renewal of the firestore admin token if ours
    is expired. This is all handled automatically by this middleware *)
module type TOKEN_REFRESHER = sig

    (** [header request] returns the header required to pass the token along with a query *)
    val header : Dream.request -> Cohttp.Header.t Lwt.t

    (** The middleware that has to be installed in order to use the token refresher *)
    val middleware : string -> Dream.middleware

end

module Make (External : External.EXTERNAL) (Jwt : Jwt.JWT) : TOKEN_REFRESHER = struct

    type token = {
        access_token : string;
        expiration_date : int;
    }

    type service_account = {
        email : string;
        private_key : private_key;
    }

    let read_service_account_from_file = fun (file : string) : service_account ->
        let open JSON.Util in
        let json =
            try JSON.from_file file
            with Sys_error e -> raise (UnexpectedError ("Cannot read service account from file: " ^ e))
        in
        let private_key = json
                          |> member "private_key"
                          |> to_string
                          |> X509.Private_key.decode_pem in
        match private_key with
        | Ok (`RSA pk) ->
            let email = json |> member "client_email" |> to_string in
            { email ; private_key = pk }
        | _ -> raise (UnexpectedError "Cannot read private key from service account file")

    let request_token = fun (sa : service_account) : token Lwt.t ->
        let open JSON.Util in
        let scopes = ["https://www.googleapis.com/auth/datastore"] in
        let audience = "https://www.googleapis.com/oauth2/v4/token" in
        let jwt = Jwt.make sa.email sa.private_key scopes audience in
        let endpoint = Uri.of_string "https://oauth2.googleapis.com/token" in
        let params = [("grant_type", ["urn:ietf:params:oauth:grant-type:jwt-bearer"]);
                      ("assertion", [Jwt.to_string jwt])] in
        let now = External.now () in
        let* (_response, body) = External.Http.post_form ~params endpoint in
        let json = JSON.from_string body in
        let access_token = json |> member "access_token" |> to_string in
        let expires_in = json |> member "expires_in" |> to_int in
        let expiration_date = now + expires_in in
        Lwt.return { access_token; expiration_date }

    let request_token_if_outdated = fun (sa : service_account) (token : token) : token Lwt.t ->
        let now = External.now () in
        if now > token.expiration_date then
            request_token sa
        else
            Lwt.return token

    let get_token_field : (unit -> string Lwt.t) Dream.field =
        Dream.new_field ~name:"token" ()

    let get_token = fun (request : Dream.request) : string Lwt.t ->
        match Dream.field request get_token_field with
        | None -> raise (UnexpectedError "get_token_field not set, the middleware is probably missing")
        | Some f -> f ()

    let header = fun (request : Dream.request) : Cohttp.Header.t Lwt.t ->
        let* token = get_token request in
        Lwt.return (Cohttp.Header.of_list [DreamUtils.authorization_header token])

    let middleware = fun (service_account_file : string) : Dream.middleware ->
        let service_account =
            if !Options.emulator = false
            then Some (read_service_account_from_file service_account_file)
            else None in
        let token_ref = ref None in
        (fun handler request ->
             Dream.set_field request get_token_field (fun () ->
                 if !Options.emulator then
                     (* No need to fetch a google token if we're dealing with the emulator, the string "owner" is sufficient *)
                     Lwt.return "owner"
                 else
                     let* token = match !token_ref with
                         | Some token -> request_token_if_outdated (Option.get service_account) token
                         | None -> request_token (Option.get service_account) in
                     token_ref := Some token;
                     Lwt.return token.access_token
             );
             handler request)

end
