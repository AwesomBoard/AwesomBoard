open Domain

(** All the messages we can receive *)
module WebSocketIncomingMessage = struct
    type proposition =
        | TakeBack
        | Draw
        | Rematch
    [@@deriving yojson]

    type t =
        (** Subscription messages *)
        | Subscribe of { game_id : string }
        | Unsubscribe

        (** Chat messages *)
        | ChatSend of { message : string }

        (** Config room messages *)
        | Create of { game_name : string }
        | ProposeConfig of { config : ConfigRoom.Proposal.t }
        | AcceptConfig
        | SelectOpponent of { opponent : MinimalUser.t }
        | ReviewConfig
        | ReviewConfigAndRemoveOpponent
        (* | JoinGame of { game_id : string } TODO: subsumed by subscribe *)
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
        | GameCreated of { game_id : string; config_room : ConfigRoom.t }
        | CandidateJoined of { candidate : MinimalUser.t }
        | CandidateLeft of { candidate : MinimalUser.t }
        | ConfigProposed of { config : ConfigRoom.Proposal.t }
        | OpponentSelected of { opponent : MinimalUser.t }
        | ConfigInReview
        | ConfigInReviewAndOpponentRemoved

        (** Game messages *)
        | GameEvent of { event : GameEvent.t }
        | PlayerResigned of { resigner : MinimalUser.t }
        | PlayerTimedOut of { winner : MinimalUser.t; loser : MinimalUser.t }

    [@@deriving yojson]
end
