open Utils

(** This module deals with fetching Google certificates, needed by Firebase *)
module type GOOGLE_CERTIFICATES = sig

    (** Google certificates consist of an identifier (as a string) and a public
        key. There can be more than one certificate. Hence, they are represented
        as an association list *)
    type certificates = (string * Crypto.public_key) list

    (** [get ()] retrieves the Google certificates. It uses cached versions if there are any.
        @raise UnexpectedError in case it cannot fetch the certificates. *)
    val get : unit -> certificates Lwt.t

    (** [clear ()] clears the cached certificates. Useful for tests only *)
    val clear : unit -> unit
end

module Make (External : External.EXTERNAL) : GOOGLE_CERTIFICATES = struct

    type certificates = (string * Crypto.public_key) list

    (** Parses the Cache-Control header of a response to extract the max-age field *)
    let parse_max_age = fun (cache_control : string) : int ->
        let extract = fun (regexp : Str.regexp) (s : string) : string ->
            if Str.string_match regexp s 0 then
                Str.matched_group 1 s
            else raise (Errors.UnexpectedError "missing or invalid max-age") in
        cache_control
        |> extract (Str.regexp ".*max-age=\\([0-9]+\\),.*")
        |> int_of_string

    (** Fetches the certificates listed at https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com
        Returns the certificates and their expiration time (as a unix timestamp). *)
    let get_certificates = fun () : (certificates * int) Lwt.t ->
        let endpoint = Uri.of_string "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com" in
        let* (response, body_string) = External.Http.get endpoint in
        let body_content = JSON.from_string body_string in
        let max_age : int = match Cohttp.Header.get response.headers "Cache-Control" with
            | Some cache_control ->
                parse_max_age cache_control
            | None -> raise (Errors.UnexpectedError "No cache-control in response") in
        let certificates = match body_content with
            | `Assoc assoc when List.length assoc > 1 ->
                List.map (fun (id, cert) ->
                    (id,
                     Crypto.public_key_of_certificate_string (JSON.Util.to_string cert)))
                    assoc
            | _ -> raise (Errors.UnexpectedError "No certificates returned") in
        Lwt.return (certificates, External.now () + max_age)

    (** This contains the certificates that will be used when verifying a token *)
    let certificates_ref : ((string * Crypto.public_key) list * int) ref =
        ref ([], 0)

    (** Update the certificates stored in certificates_ref *)
    let update_certificates = fun () : (string * Crypto.public_key) list Lwt.t ->
        let* (keys, expiration) = get_certificates () in
        certificates_ref := (keys, expiration);
        Lwt.return keys

    let get = fun  () : (string * Crypto.public_key) list Lwt.t ->
        let now = External.now () in
        match !certificates_ref with
        | (_, expiration) when expiration < now ->
            update_certificates ()
        | (certificates, _) ->
            Lwt.return certificates

    let clear = fun () ->
        certificates_ref := ([], 0)
end
