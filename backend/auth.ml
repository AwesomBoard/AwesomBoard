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
            (* Extract the Authorization header *)
            let authorization_header : string =
                match Dream.header request "Authorization" with
                | None -> raise (AuthError "Authorization token is missing")
                | Some authorization -> authorization in
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
                handler request
            end else
                raise (AuthError "User is not verified") in
        try check_everything_and_process_request ()
        with
        | AuthError reason ->
            fail `Unauthorized reason
        | DocumentNotFound _ | DocumentInvalid _ ->
            fail `Unauthorized "User is invalid"
end
