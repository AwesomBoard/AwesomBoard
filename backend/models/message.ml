(** A chat message *)
type t = {
    sender: MinimalUser.t;
    timestamp: int;
    content: string
}
[@@deriving yojson]
