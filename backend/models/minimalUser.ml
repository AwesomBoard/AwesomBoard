(** A minimal user as represented in Firestore. *)
type t = {
    id: string; (** The user id *)
    name: string; (** The user name *)
}
[@@deriving yojson, show]
