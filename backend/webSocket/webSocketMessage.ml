open Models
open Utils

(** All the messages we can receive *)
module WebSocketIncomingMessage = struct

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
        | SubscribeConfigRoom of { game_id : GameId.t [@key "gameId"] }
        | SubscribeGame of { game_id : GameId.t [@key "gameId"] }
        | SubscribeLobby
        | Unsubscribe

        (** Chat messages *)
        | ChatSend of { message : string }

        (** Config room messages *)
        | Create of { game_name : string [@key "gameName"] }
        | ProposeConfig of { config : ConfigRoom.Proposal.t }
        | SelectOpponent of { opponent : MinimalUser.t }
        | ReviewConfig
        | AcceptConfig

        (** Game messages *)
        | Move of { move : JSON.t }
        | GameEnd of { winner : Player.OrNone.t }
        | Resign
        | NotifyTimeout of { timeouted_player : Player.t [@key "timeoutedPlayer"] }
        | Propose of { proposition : GameEvent.Proposition.t  }
        | Reject of { proposition : GameEvent.Proposition.t }
        | Accept of { proposition : GameEvent.Proposition.t }
        | AddTime of { kind : [ `Turn | `Global ] }
    [@@deriving yojson]

end

module WebSocketOutgoingMessage = struct
    type error =
        | AlreadySubscribed
        | ConfigRoomDoesNotExist
        | GameDoesNotExist
        | NotAllowed
        | NotUndestood
    [@@deriving to_yojson]

    let error_to_yojson (e : error) =
        match error_to_yojson e with
        | `List [`String err] -> `String err
        | _ -> `String "unexpected-error"

    type t =
        (** Meta messages *)
        | Error of { reason : error }

        (** Chat messages *)
        | ChatMessage of { message : Message.t }

        (** Config room messages *)
        | GameCreated of { game_id : GameId.t [@key "gameId"] } (* TODO: Rename, it is an "ack" type of message *)
        | GameName of { game_name : string option [@key "gameName"] }
        | CandidateJoined of { candidate : MinimalUser.t }
        | CandidateLeft of { candidate : MinimalUser.t }
        | ConfigRoomUpdate of {
              game_id : GameId.t [@key "gameId"];
              config_room : ConfigRoom.t  [@key "configRoom"]
          }
        | ConfigRoomDeleted of { game_id : GameId.t [@key "gameId"] }

        (** Game messages *)
        | GameEvent of { event : GameEvent.t }
        | GameUpdate of { game : Game.t }
        | GameMove of { move : JSON.t }

    [@@deriving to_yojson]
end
