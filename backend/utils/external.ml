(** This module contains functions that rely on the external world.
    This allows us to mock them in our tests *)

module type EXTERNAL = sig
    (** Provide the current timestamp in seconds *)
    val now : unit -> int

    (** Provide the current timestamp in miliseconds *)
    val now_ms : unit -> int

    (** Provide a random boolean *)
    val rand_bool : unit -> bool

    module Http : sig
        (** Perform a GET request and return the response with its body *)
        val get : ?headers:Cohttp.Header.t -> Uri.t -> (Cohttp.Response.t  * string) Lwt.t

        (** Perform a POST request for a form, with the given params and return the response with its body *)
        val post_form : params:(string * string list) list -> Uri.t -> (Cohttp.Response.t * string) Lwt.t

        (** Perform a POST request with a JSON body and return the response with its body *)
        val post_json : ?headers:Cohttp.Header.t -> JSON.t -> Uri.t -> (Cohttp.Response.t * string) Lwt.t

        (** Perform a PATCH request with a JSON body and return the response with its body *)
        val patch_json : ?headers:Cohttp.Header.t -> JSON.t -> Uri.t ->  (Cohttp.Response.t * string) Lwt.t

        (** Perform a DELETE request *)
        val delete : ?headers:Cohttp.Header.t -> Uri.t -> (Cohttp.Response.t * string) Lwt.t

    end
end

module Impl : EXTERNAL = struct

    let now = fun () : int ->
        int_of_float (Unix.time ())

    let now_ms = fun () : int ->
        int_of_float (Unix.time () *. 1000.)

    let rand_bool = fun () : bool ->
        Random.bool ()

    module Http = struct
        let get = fun ?(headers : Cohttp.Header.t = Cohttp.Header.init ())
                       (endpoint : Uri.t)
                       : (Cohttp.Response.t * string) Lwt.t ->
            let%lwt (response, body) = Cohttp_lwt_unix.Client.get ~headers endpoint in
            let%lwt body_string = Cohttp_lwt.Body.to_string body in
            Lwt.return (response, body_string)

        let post_form = fun ~(params : (string * string list) list)
                             (endpoint : Uri.t)
                             : (Cohttp.Response.t * string) Lwt.t ->
            let%lwt (response, body) = Cohttp_lwt_unix.Client.post_form ~params endpoint in
            let%lwt body_string = Cohttp_lwt.Body.to_string body in
            Lwt.return (response, body_string)

        let post_json = fun ?(headers : Cohttp.Header.t = Cohttp.Header.init ())
                             (json : JSON.t)
                             (endpoint : Uri.t)
                             : (Cohttp.Response.t * string) Lwt.t ->
            let headers = Cohttp.Header.add headers "Content-Type" "application/json" in
            let body = `String (JSON.to_string json) in
            let%lwt (response, body) = Cohttp_lwt_unix.Client.post ~headers endpoint ~body in
            let%lwt body_string = Cohttp_lwt.Body.to_string body in
            Lwt.return (response, body_string)

        let patch_json = fun ?(headers : Cohttp.Header.t = Cohttp.Header.init ())
                              (json : JSON.t)
                              (endpoint : Uri.t)
                              : (Cohttp.Response.t * string) Lwt.t ->
            let headers = Cohttp.Header.add headers "Content-Type" "application/json" in
            let body = `String (JSON.to_string json) in
            let%lwt (response, body) = Cohttp_lwt_unix.Client.patch ~headers endpoint ~body in
            let%lwt body_string = Cohttp_lwt.Body.to_string body in
            Lwt.return (response, body_string)

        let delete = fun ?(headers : Cohttp.Header.t = Cohttp.Header.init ())
                          (endpoint : Uri.t)
                          : (Cohttp.Response.t * string) Lwt.t ->
            let%lwt (response, body) = Cohttp_lwt_unix.Client.delete ~headers endpoint in
            let%lwt body_string = Cohttp_lwt.Body.to_string body in
            Lwt.return (response, body_string)
    end
end
