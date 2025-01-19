open Models
open Utils

(** All the messages we can receive *)
module WebSocketIncomingMessage = struct
    type proposition =
        | TakeBack
        | Draw
        | Rematch
    [@@deriving yojson]

    (** Lifecycles of config rooms are as follows:
       - Game creation:
         1. Creator creates a game: [Create { game_name = "Abalone" }] sent to server
         2. Server replies: [GameCreated { game_id = "abc" }] sent to creator
         3. Creator subscribes to its own game: [Subscribe { game_id = "abc" }] sent to server
         4. Candidate joins: [Subscribe { game_id = "abc" }] sent to server
         5. Server let everyone on this room know: [CandidateJoined { candidate }] sent to creator & other subscribers
         -. If other candidates join, same pattern
         -. If anyone leaves, [CandidateLeft { candidate }] sent to everyone
         6. Creator selects an opponent [SelectOpponent { opponent }] sent to server
         7. Server lets everyone know [ConfigRoomUpdate { game_id; config_room }] to everyone
         8. Creator proposes the config [ProposeConfig { config }] sent to server
         9. Server lets everyone know [ConfigRoomUpdate { game_id; config_room }] to everyone
         -. If creator reviews config, [ReviewConfig] sent to server, followed by [ConfigRoomUpdate] sent to the subscribers
         10. Eventually, chosen opponent accepts: [AcceptConfig] sent to the server
         11. The final update is sent to everyone and the game can start: [ConfigRoomUpdate] to everyone
    *)

    type t =
        (** Subscription messages *)
        | Subscribe of { game_id : string [@key "gameId"] }
        | Unsubscribe

        (** Chat messages *)
        | ChatSend of { message : string }

        (** Config room messages *)
        | Create of { game_name : string [@key "gameName"] }
        | GetGameName of { game_id : string [@key "gameId"] }
        | ProposeConfig of { config : ConfigRoom.Proposal.t }
        | SelectOpponent of { opponent : MinimalUser.t }
        | ReviewConfig
        | AcceptConfig

        (** Game messages *)
        | Resign
        | NotifyTimeout of { winner : MinimalUser.t; loser : MinimalUser.t }
        | Propose of { proposition : proposition }
        | Reject of { proposition : proposition }
        | AcceptTakeBack
        | AcceptDraw
        | AcceptRematch
        | AddTime of { kind : [ `Turn | `Global ] }
        | Move of { move : JSON.t }
    [@@deriving yojson]

end

module WebSocketOutgoingMessage = struct
    type t =
        (** Meta messages *)
        | Error of { reason : string }

        (** Chat messages *)
        | ChatMessage of { message : Message.t }

        (** Config room messages *)
        | GameCreated of { game_id : string [@key "gameId"] } (* TODO: Rename, it is an "ack" type of message *)
        | GameName of { game_name : string option [@key "gameName"] }
        | CandidateJoined of { candidate : MinimalUser.t }
        | CandidateLeft of { candidate : MinimalUser.t }
        | ConfigRoomUpdate of {
              game_id : string [@key "gameId"];
              config_room : ConfigRoom.t  [@key "configRoom"]
          }
        | ConfigRoomDeleted of { game_id : string [@key "gameId"] } (* TODO: use it! *)

        (** Game messages *)
        | GameEvent of { event : GameEvent.t }
        | GameUpdate of { game : Game.t }

    [@@deriving yojson]
end
