open Utils

(** A getter takes a contextual request and an id. It returns the document if found, and raises an error otherwise *)
type 'a getter = request:Dream.request -> id:string -> 'a Lwt.t
(** An updater takes a contextual request, an id, and a document update. It updates the corresponding document *)
type updater = request:Dream.request -> id:string -> update:JSON.t -> unit Lwt.t
(** A deleter takes a contextual request and an id. It deletes the corresponding document *)
type deleter = request:Dream.request -> id:string -> unit Lwt.t

(** This is the high-level firestore operations for the various data types *)
module type FIRESTORE_OPS = sig

    module User : sig
        (** Retrieve an user from its id *)
        val get : Models.User.t getter
    end

end

module Make (FirestorePrimitives : FirestorePrimitives.FIRESTORE_PRIMITIVES) : FIRESTORE_OPS = struct

    (* Generic version of get that retrieves a document at a given path *)
    let get = fun (request : Dream.request) (path : string) (of_yojson : JSON.t -> ('a, 'b) result) : 'a Lwt.t ->
        let get_or_fail doc (maybe_value : ('a, 'b) result)  : 'a =
            match maybe_value with
            | Ok value -> value
            | Error e -> raise (Errors.DocumentInvalid (Printf.sprintf "%s: %s - %s" path e (JSON.to_string doc))) in
        let* doc = FirestorePrimitives.get_doc ~request ~path in
        doc
        |> of_yojson
        |> get_or_fail doc
        |> Lwt.return

    module User = struct

        let get = fun ~(request : Dream.request) ~(id : string) : Models.User.t Lwt.t ->
            get request ("users/" ^ id) Models.User.of_yojson
    end


end
