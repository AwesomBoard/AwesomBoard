open Utils

(** A request from a user *)
module Request = struct
    type t = {
        request_type: string [@key "requestType"];
    }
    [@@deriving yojson]

    let draw : t = { request_type = "Draw" }
    let rematch : t = { request_type = "Rematch" }
    let take_back : t = { request_type = "TakeBack" }
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
    type t = {
        action: string;
    }
    [@@deriving yojson]

    let add_time = fun (kind : [ `Turn | `Global ]) : t ->
        match kind with
        | `Turn -> { action = "AddTurnTime" }
        | `Global -> { action = "AddGlobalTime" }
    let start_game : t = { action = "StartGame" }
    let end_game : t = { action = "EndGame" }
end

(** The crucial part of any game: a move *)
module Move = struct
    (* It is simply represented as a JSON object *)
    type t = {
        move: JSON.t
    }
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

let to_yojson = fun (event: t) : JSON.t ->
    match EventData.to_yojson event.data with
    | `Assoc [(_, `Assoc data)] ->
        `Assoc ([
            ("time", `Int event.time);
            ("user", MinimalUser.to_yojson event.user);
        ] @ data)
    | _ -> failwith "Unexpected: invalid event"
