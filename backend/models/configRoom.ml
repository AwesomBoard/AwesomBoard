open Utils

(** The config room document in Firestore *)
module ConfigRoom = struct

    (** The status of the game in Firestore *)
    module GameStatus = struct
        type t = Created | ConfigProposed | Started | Finished

        (* Game status are stored as numbers, with specific values *)
        (* TODO: change to strings for readability? *)
        let (to_yojson, of_yojson) =
            JSON.for_enum [
                Created, `Int 0;
                ConfigProposed, `Int 2;
                Started, `Int 3;
                Finished, `Int 4;
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
        creator_elo: float;
        chosen_opponent: MinimalUser.t option [@key "chosenOpponent"];
        game_status: GameStatus.t [@key "partStatus"];
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
        game_status = GameStatus.Created;
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
        let game_status = GameStatus.Started in
        { config_room with game_status; first_player; creator; chosen_opponent = Some chosen_opponent }


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

    (** The [Updates] module describes all types of updates that we can do to a
        document. It enables forcing the programmer to not over or under define the
        updates: types have to match precisely *)
    module Updates = struct
        (** This update changes the config room back to editing mode *)
        module ReviewConfig = struct
            type t = {
                game_status: GameStatus.t [@key "partStatus"];
            }
            [@@deriving to_yojson]

            let get : t = {
                game_status = GameStatus.Created;
            }
        end

        (** This update changes the config room back to editing mode, and removes the opponent *)
        module ReviewConfigAndRemoveOpponent = struct
            type t = {
                chosen_opponent: unit [@key "chosenOpponent"];
                game_status: GameStatus.t [@key "partStatus"];
            }
            [@@deriving to_yojson]

            let get : t = {
                chosen_opponent = ();
                game_status = GameStatus.Created;
            }
        end

        (** This update picks an opponent *)
        module SelectOpponent = struct
            type t = {
                chosen_opponent: MinimalUser.t [@key "chosenOpponent"];
            }
            [@@deriving to_yojson]

            let get = fun (opponent : MinimalUser.t) : t -> {
                chosen_opponent = opponent;
            }
        end

    end

end

include ConfigRoom
