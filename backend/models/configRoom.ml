open Utils

(** The status of the room in Firestore *)
module Status = struct
    type t = Created | ConfigProposed | Started | Finished

    let (to_yojson, of_yojson) =
        JSON.for_enum [
            Created, `String "Created";
            ConfigProposed, `String "ConfigProposed";
            Started, `String "Started";
            Finished, `String "Finished";
        ]
end

(** The description of the player who starts the game, in Firestore *)
module FirstPlayer = struct
    type t = Random | ChosenPlayer | Creator

    (* First player is stored as a capitalized string *)
    let (to_yojson, of_yojson) =
        JSON.for_enum [
            Random, `String "RANDOM";
            ChosenPlayer, `String "CHOSEN_PLAYER";
            Creator, `String "CREATOR";
        ]
end

(** The type of the game in terms of timing *)
module GameType = struct
    type t = Standard | Blitz | Custom

    (* Game types are stored as a capitalized string *)
    let (to_yojson, of_yojson) =
        JSON.for_enum [
            Standard, `String "STANDARD";
            Blitz, `String "BLITZ";
            Custom, `String "CUSTOM";
        ]

    (* The default values for times *)
    let standard_move_duration : int = 2*60
    let standard_game_duration : int = 30*60

end

(** The config room itself *)
type t = {
    creator: MinimalUser.t;
    creator_elo: float [@key "creatorElo"];
    chosen_opponent: MinimalUser.t option [@key "chosenOpponent"];
    status: Status.t [@key "partStatus"];
    first_player: FirstPlayer.t [@key "firstPlayer"];
    game_type: GameType.t [@key "partType"];
    maximal_move_duration: int [@key "maximalMoveDuration"];
    total_part_duration: int [@key "totalPartDuration"];
    rules_config: JSON.t [@key "rulesConfig"];
    game_name: string [@key "gameName"];
}
[@@deriving yojson]

(** The initial config room that we create when creating a new game *)
let initial = fun (creator : MinimalUser.t) (creator_elo : float) (game_name : string) : t -> {
    creator;
    creator_elo;
    first_player = FirstPlayer.Random;
    chosen_opponent = None;
    status = Status.Created;
    game_type = GameType.Standard;
    maximal_move_duration = GameType.standard_move_duration;
    total_part_duration = GameType.standard_game_duration;
    rules_config = `Null;
    game_name;
}

(** A config room with similar characteristics as the [config_room] parameter, but for its rematch *)
let rematch = fun (config_room : t)
                  (first_player : FirstPlayer.t)
                  (creator : MinimalUser.t)
                  (chosen_opponent : MinimalUser.t)
                  : t ->
    let status = Status.Started in
    { config_room with status; first_player; creator; chosen_opponent = Some chosen_opponent }

let is_unstarted = fun (config_room : t) : bool ->
    match config_room.status with
    | Started | Finished -> false
    | _ -> true

module Proposal = struct
    type t = {
        game_type: GameType.t [@key "partType"];
        maximal_move_duration: int [@key "maximalMoveDuration"];
        total_part_duration: int [@key "totalPartDuration"];
        first_player: FirstPlayer.t [@key "firstPlayer"];
        rules_config: JSON.t [@key "rulesConfig"];
    }
    [@@deriving yojson]

end
