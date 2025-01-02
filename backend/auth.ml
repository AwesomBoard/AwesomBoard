open Utils
open DreamUtils

(** This module provides a middleware that ensures that the user making a request to the backend is authenticated. *)
module type AUTH = sig
    (** [get_user request] returns the user that has made the request *)
    val get_user : Dream.request -> Domain.User.t

    (** [get_minimal_user request] returns the minimal user of the user that has made the request *)
    val get_minimal_user : Dream.request -> Domain.MinimalUser.t

    (** [get_uid] returns the user id of the user that has made the request *)
    val get_uid : Dream.request -> string

    (** The middleware that checks authentication *)
    val middleware : Dream.middleware
  end

module Make
        (Firestore:Firestore.FIRESTORE)
        (GoogleCertificates:GoogleCertificates.GOOGLE_CERTIFICATES)
        (Stats:Stats.STATS)
        (Jwt:Jwt.JWT) : AUTH = struct

    (* This field contains the id of the Firebase user that has been
       authenticated, as well as the Firestore document of the user *)
    let user_field : (string * Domain.User.t) Dream.field =
        (* This is just a tag that we will store with a value alongside requests when handling them *)
        Dream.new_field ~name:"user" ()

    let get_user_field = fun (request : Dream.request) : (string * Domain.User.t) ->
        match Dream.field request user_field with
        | None -> raise (UnexpectedError "No user stored. Is the Auth middleware missing?")
        | Some uid_and_user -> uid_and_user

    let get_user = fun (request : Dream.request) : Domain.User.t ->
        let (_, user) = get_user_field request in
        user

    let get_uid = fun (request : Dream.request) : string ->
        let (uid, _) = get_user_field request in
        uid

    let get_minimal_user = fun (request : Dream.request) : Domain.MinimalUser.t ->
        let (uid, user) = get_user_field request in
        Domain.User.to_minimal_user uid user

    (* An exception used internally to indicate a failure in the middleware *)
    exception AuthError of string

    (* This is the middleware. It receives a handler that will handle the request after us, and the request itself.
       The client should make a request with a token that was generated as follows:
       var token = await FirebaseAuth.instance.currentUser().getIdToken(); *)
    let middleware = fun (handler : Dream.handler) (request : Dream.request) ->
        let check_everything_and_process_request = fun () ->
            let websocket = ref false in
            (* Extract the Authorization header *)
            let authorization_header : string =
                (* The header is passed in Authorization in HTTP(S),
                   but in a special field Sec-WebSocket-Protocol for WebSocket connections *)
                match (Dream.header request "Authorization", Dream.header request "Sec-WebSocket-Protocol") with
                | None, None -> raise (AuthError "Authorization token is missing")
                | Some authorization, _ -> authorization
                | None, Some ws_header -> match String.split_on_char ',' ws_header with
                    | ["Authorization"; authorization] ->
                        websocket := true; (* need to remind ourselves to add header to the reply *)
                        (* Need to add Bearer in front of the token, which already contains a first space.
                           This way, we can treat it just like a normal HTTP header *)
                        "Bearer" ^ authorization
                    | _ -> raise (AuthError "Authorization token is missing")
            in
            (* Parse the token *)
            let user_token : string =
                match String.split_on_char ' ' authorization_header with
                | ["Bearer"; user_token] -> user_token
                | _ -> raise (AuthError "Authorization header is invalid") in
            let parsed_token : Jwt.t =
                match Jwt.parse user_token with
                | None -> raise (AuthError "Authorization token cannot be parsed")
                | Some token -> token in
            (* Check the token validity and extract its uid *)
            let* certificates : GoogleCertificates.certificates =
                GoogleCertificates.get () in
            let uid : string =
                match Jwt.verify_and_get_uid parsed_token (!Options.project_id) certificates with
                | None -> raise (AuthError "Authorization token cannot be verified")
                | Some uid -> uid in
            (* Get the user and check its verification status *)
            let* user : Domain.User.t = Firestore.User.get ~request ~id:uid in
            if user.verified then begin
                (* The user has a verified account, so we can finally call the handler *)
                Dream.set_field request user_field (uid, user);
                Stats.set_user request (Domain.User.to_minimal_user uid user);
                let* response : Dream.response = handler request in
                if !websocket then
                    (* WebSocket (in Chrome) expects the same header in the reply, otherwise it closes the connection *)
                    (* See https://github.com/aantron/dream/issues/375 *)
                    Dream.add_header response "Sec-WebSocket-Protocol" "Authorization";
                Lwt.return response
            end else
                raise (AuthError "User is not verified") in
        try check_everything_and_process_request ()
        with
        | AuthError reason ->
            fail `Unauthorized reason
        | DocumentNotFound _ | DocumentInvalid _ ->
            fail `Unauthorized "User is invalid"
end
