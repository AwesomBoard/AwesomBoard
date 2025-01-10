open Models
open Utils

(** All the messages we can receive *)
module WebSocketIncomingMessage = struct
    type proposition =
        | TakeBack
        | Draw
        | Rematch
    [@@deriving yojson]

    type t =
        (** Subscription messages *)
        | Subscribe of { game_id : string [@key "gameId"] }
        | Unsubscribe

        (** Chat messages *)
        | ChatSend of { message : string }

        (** Config room messages *)
        | Create of { game_name : string [@key "gameName"] }
        | Join of { game_id : string [@key "gameId"] }
        | GetGameName of { game_id : string [@key "gameId"] }
        | ProposeConfig of { config : ConfigRoom.Proposal.t }
        | AcceptConfig
        | SelectOpponent of { opponent : MinimalUser.t }
        | ReviewConfig
        | ReviewConfigAndRemoveOpponent
        (* | RemoveCandidate of { game_id : string; candidate_id : string } TODO: subsubmed by unsubscribe *)

        (** Game messages *)
        | Resign
        | NotifyTimeout of { winner : MinimalUser.t; loser : MinimalUser.t }
        | Propose of { proposition : proposition }
        | Reject of { proposition : proposition }
        | AcceptTakeBack
        | AcceptDraw
        | AcceptRematch
        | AddTime of { kind : [ `Turn | `Global ] }
    [@@deriving yojson]

end

module WebSocketOutgoingMessage = struct
    type t =
        (** Meta messages *)
        | Error of { reason : string }

        (** Chat messages *)
        | ChatMessage of { message : Message.t }

        (** Config room messages *)
        | GameCreated of { game_id : string [@key "gameId"] }
        | GameName of { game_name : string option [@key "gameName"] }
        | CandidateJoined of { candidate : MinimalUser.t }
        | CandidateLeft of { candidate : MinimalUser.t }
        | ConfigRoomUpdate of { update : ConfigRoom.t }

        (** Game messages *)
        | GameEvent of { event : GameEvent.t }
        | GameUpdate of { update : JSON.t }

    [@@deriving yojson]
end
