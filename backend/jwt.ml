open Utils
open CryptoUtils

(** This module manages JSON Web Tokens (JWT), which are used to authentify
    ourselves to the firestore server, and to authentify users to ourselves. *)
module type JWT = sig

    (* A JWT token *)
    type t = {
        header: JSON.t; (** The header of the token *)
        payload: JSON.t; (** The payload of the token *)
        signature: string; (** The signature of the header + payload *)
    }

    (** [to_string token] converts a token to its string representation that is
        suitable to be passed around to another service *)
    val to_string : t -> string

    (** [make email private_key scopes audience] creates a new token from an
        email, a private key, a set of scopes, and an audience *)
    val make : string -> private_key -> string list -> string -> t

    (** [parse str] parses an existing token from its string representation.
        The signature of the token is NOT validated at this point. *)
    val parse : string -> t option

    (** [verify_and_get_uid token kid certificates] verifies that a token has
        been signed by the certificates with key id [kid]. Return the user id in
        case of success, otherwise return [None]. *)
    val verify_and_get_uid : t -> string -> (string * CryptoUtils.public_key) list -> string option
end

module Make (External : External.EXTERNAL) : JWT = struct

    type t = {
        header: JSON.t; (** The header of the token *)
        payload: JSON.t; (** The payload of the token *)
        signature: string; (** The signature of the header + payload *)
    }

    let b64 = Dream.to_base64url

    (** Sign a string with RS256 *)
    let sign = fun (private_key : private_key) (content : string) : string ->
        let pkcs1_sha256 = fun (m : string) : string ->
            Mirage_crypto_pk.Rsa.PKCS1.sign ~hash:`SHA256 ~key:private_key (`Message m) in
        content
        |> pkcs1_sha256

    (** Construct a JWT from an email [iss] private key [pk], a set of scopes
        [scopes] and an audience [audience] *)
    let make = fun (iss : string) (pk : private_key) (scopes : string list) (audience : string) : t ->
        let open JSON in
        let now = External.now () in
        let exp = now + 3600 in
        let header = `Assoc [
            ("alg", `String "RS256");
            ("typ", `String "JWT");
        ] in
        let header_b64 = b64 (to_string header) in
        let payload = `Assoc [
            ("iss", `String iss);
            ("scope", `String (String.concat " " scopes));
            ("aud", `String audience);
            ("exp", `Int exp);
            ("iat", `Int now);
        ] in
        let payload_b64 = b64 (to_string payload) in
        let header_and_payload = header_b64 ^ "." ^ payload_b64 in
        let signature = sign pk header_and_payload in
        { header; payload; signature }

    (** Transform the token into its string representation *)
    let to_string = fun (token : t) : string ->
        Printf.sprintf "%s.%s.%s"
            (Dream.to_base64url (JSON.to_string token.header))
            (Dream.to_base64url (JSON.to_string token.payload))
            (Dream.to_base64url token.signature)

    (** Parse a token from its string representation. Does NOT validate the signature. *)
    let parse = fun (token : string) : t option ->
        match String.split_on_char '.' token |> List.map Dream.from_base64url  with
        | [Some header_json; Some payload_json; Some signature] ->
            begin
                try
                    let header = JSON.from_string header_json in
                    let payload = JSON.from_string payload_json in
                    Some { header; payload; signature }
                with
                | Yojson.Json_error _ -> None
            end
        | _ -> None (* Token is invalid *)

    let verify_signature = fun (token : t) (pk : CryptoUtils.public_key) : bool ->
        let only_sha256 = function
            | `SHA256 -> true
            | _ -> false in
        let pkcs1_sha256_verify = fun (m : string) (signature : string) : bool ->
            Mirage_crypto_pk.Rsa.PKCS1.verify ~hashp:only_sha256 ~key:pk ~signature (`Message m) in
        let header_and_content_b64 = (token.header |> JSON.to_string |> b64) ^ "." ^ (token.payload |> JSON.to_string |> b64) in
        pkcs1_sha256_verify header_and_content_b64 token.signature

    (** Verify the signature of a JWT according to https://firebase.google.com/docs/auth/admin/verify-id-tokens.
        Depends on the public keys listed at https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com
        In case of success, the uid ("sub" field) is returned. *)
    let verify_and_get_uid = fun (token : t) (project_id : string) (pks : (string * CryptoUtils.public_key) list) : string option ->
        let check = fun (conditions : (string * (unit -> bool)) list) : bool ->
            List.for_all (fun (_field, cond) -> cond ()) conditions in
        let now = External.now () in
        let open JSON.Util in
        let number = fun (json : JSON.t) (field : string) : int ->
            to_int (member field json) in
        let str = fun (json : JSON.t) (field : string) : string ->
            to_string (member field json) in
        let all_checks = [
            (* algorithm must be RS256 *)
            "alg", (fun () ->
                if !Options.emulator then
                    (* The emulator doesn't sign the tokens *)
                    str token.header "alg" = "none"
                else
                    str token.header "alg" = "RS256");
            (* key must be one of the valid keys *)
            "kid", (fun () ->
                if !Options.emulator then
                    (* The emulator doesn't provide a key with the token *)
                    true
                else
                    List.mem_assoc (str token.header "kid") pks);
            (* expiration must be in the future *)
            "exp", (fun () -> now <= number token.payload "exp");
            (* "issued-at-time" must be in the past *)
            "iat", (fun () -> number token.payload "iat" <= now);
            (* audience must be the firebase project id *)
            "aud", (fun () -> str token.payload "aud" = project_id);
            (* issuer must be a specific url *)
            "iss", (fun () -> str token.payload "iss" =  ("https://securetoken.google.com/" ^ project_id));
            (* subject must be a non empty string *)
            "sub", (fun () -> String.length (str token.payload "sub") > 0);
            (* authentication time must be in the past *)
            "auth_time", (fun () -> number token.payload "auth_time" <= now);
            (* check the signature against the key *)
            "signature", (fun () ->
                (* We know the kid corresponds to an actual certificate from the kid check *)
                if !Options.emulator then
                    (* The emulator doesn't sign the tokens *)
                    true
                else
                    let pk = List.assoc (str token.header "kid") pks in
                    verify_signature token pk);
        ] in
        if check all_checks then
            (* If everything has succeeded, we can extract the uid from the "sub" field *)
            Some (str token.payload "sub")
        else
            None
end
