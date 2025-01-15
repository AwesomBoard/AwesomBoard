open Utils

(** A request from a user *)
module Request = struct
    type t = string
    [@@deriving yojson]

    let draw : t = "Draw"
    let rematch : t = "Rematch"
    let take_back : t = "TakeBack"
end

(** A reply to a request *)
module Reply = struct
    type t = {
        request_type: string [@key "requestType"];
        reply: string;
        data: JSON.t option;
    }
    [@@deriving yojson]

    let accept = fun ?(data: JSON.t option) (proposition : string) : t ->
        { request_type = proposition; reply = "Accept"; data }
    let refuse = fun ?(data: JSON.t option) (proposition : string) : t ->
        { request_type = proposition; reply = "Reject"; data }
end

(** An action event, such as adding time *)
module Action = struct
    type t = string
    [@@deriving yojson]

    let add_time = fun (kind : [ `Turn | `Global ]) : t ->
        match kind with
        | `Turn -> "AddTurnTime"
        | `Global -> "AddGlobalTime"
    let start_game : t = "StartGame"
    let end_game : t = "EndGame"
end

(** The crucial part of any game: a move *)
module Move = struct
    (* It is simply represented as a JSON object *)
    type t = JSON.t
    [@@deriving yojson]
end

module EventData = struct
    type t =
        | Move of Move.t
        | Action of Action.t
        | Request of Request.t
        | Reply of Reply.t
    [@@deriving yojson]

end

(** A game event *)
type t = {
    time : int;
    user : MinimalUser.t;
    data: EventData.t;
}
[@@deriving yojson]
