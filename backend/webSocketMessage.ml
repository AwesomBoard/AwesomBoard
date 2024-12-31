open Utils

type message_type = ChatSend
[@@deriving yojson]

type t = {
    message_type: message_type [@key "type"];
    id: string; (** The id of the game *)
    data: JSON.t;
}
[@@deriving yojson]
