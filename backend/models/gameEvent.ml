open Utils

(** A game event as represented in Firestore *)
module GameEvent = struct

    (** A request event as represented in Firestore*)
    module Request = struct
        type t = {
            event_type: string [@key "eventType"];
            time: int;
            user: MinimalUser.t;
            request_type: string [@key "requestType"];
        }
        [@@deriving yojson]

        let make = fun (user : MinimalUser.t) (request_type : string) (now : int) : t ->
            { event_type = "Request"; time = now; user; request_type }
        let draw = fun (user : MinimalUser.t) (now : int) : t ->
            make user "Draw" now
        let rematch = fun (user : MinimalUser.t) (now : int) : t ->
            make user "Rematch" now
        let take_back = fun (user : MinimalUser.t) (now : int) : t ->
            make user "TakeBack" now
    end

    (** A reply event as represented in Firestore *)
    module Reply = struct
        type t = {
            event_type: string [@key "eventType"];
            time: int;
            user: MinimalUser.t;
            reply: string;
            request_type: string [@key "requestType"];
            data: JSON.t option;
        }
        [@@deriving yojson]

        let make = fun ?(data : JSON.t option)
                        (user : MinimalUser.t)
                        (reply : string)
                        (request_type : string)
                        (now : int)
                        : t ->
            { event_type = "Reply"; time = now; user; reply; request_type; data }
        let accept = fun ?(data: JSON.t option)
                          (user : MinimalUser.t)
                          (proposition : string)
                          (now : int)
                          : t ->
            make user "Accept" proposition now ?data
        let refuse = fun ?(data: JSON.t option)
                          (user : MinimalUser.t)
                          (proposition : string)
                          (now : int)
                          : t ->
            make user "Reject" proposition now ?data
    end

    (** An action event, such as adding time *)
    module Action = struct
        type t = {
            event_type: string [@key "eventType"];
            time: int;
            user: MinimalUser.t;
            action: string;
        }
        [@@deriving yojson]

        let add_time = fun (user : MinimalUser.t) (kind : [ `Turn | `Global ]) (now : int) : t ->
            let action = match kind with
                | `Turn -> "AddTurnTime"
                | `Global -> "AddGlobalTime" in
            { event_type = "Action"; action; user; time = now }
        let start_game = fun (user : MinimalUser.t) (now : int) : t ->
            { event_type = "Action"; action = "StartGame"; user; time = now }
        let end_game = fun (user : MinimalUser.t) (now : int) : t ->
            { event_type = "Action"; action = "EndGame"; user; time = now }
    end

    (** The crucial part of any game: a move *)
    module Move = struct
        type t = {
            event_type: string [@key "eventType"];
            time: int;
            user: MinimalUser.t;
            move: JSON.t;
        }
        [@@deriving yojson]

        let of_json = fun (user : MinimalUser.t) (move : JSON.t) (now : int) : t ->
            { event_type = "Move"; user; move; time = now }
    end

    (** The possible events *)
    type t =
        | Request of Request.t
        | Reply of Reply.t
        | Action of Action.t
        | Move of Move.t
    [@@deriving yojson]

end

include GameEvent
