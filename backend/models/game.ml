open Utils

(** A game as represented in Firestore (previously called "part") *)
module Game = struct

    (** The result of a game as represented in Firestore *)
    module GameResult = struct
        type t =
            | InProgress
            | Resign of Player.t
            | Victory of Player.t
            | Timeout of Player.t
            | AgreedDrawBy of Player.t
            | HardDraw

        (* Game results are represented as integers in Firestore *)
        let (to_yojson, of_yojson) =
            JSON.for_enum [
                HardDraw, `String "HardDraw";
                Resign Player.Zero, `String "ResignOfZero";
                Resign Player.One, `String "ResignOfOne";
                Victory Player.Zero, `String "VictoryOfZero";
                Victory Player.One, `String "VictoryOfOne";
                Timeout Player.Zero, `String "TimeoutOfZero";
                Timeout Player.One, `String "TimeoutOfOne";
                InProgress, `String "InProgress";
                AgreedDrawBy Player.Zero, `String "AgreedDrawByZero";
                AgreedDrawBy Player.One, `String "AgreedDrawByOne";
            ]
    end

    (** A game *)
    type t = {
        type_game: string [@key "typeGame"];
        player_zero: MinimalUser.t [@key "playerZero"];
        player_one: MinimalUser.t [@key "playerOne"];
        result: GameResult.t;
        beginning: int;
    }
    [@@deriving yojson]

    (** Constructor for the initial game from its name and the creator *)
    let initial = fun (config_room : ConfigRoom.t) (now : int) (rand_bool : unit -> bool) : t ->
        let starter = match config_room.first_player with
            | Random ->
                if rand_bool ()
                then ConfigRoom.FirstPlayer.Creator
                else ConfigRoom.FirstPlayer.ChosenPlayer
            | first -> first in
        let (player_zero, player_one) =
            if starter = ConfigRoom.FirstPlayer.Creator
            then (config_room.creator, Option.get config_room.chosen_opponent)
            else (Option.get config_room.chosen_opponent, config_room.creator) in
        {
            type_game = config_room.game_name;
            player_zero;
            player_one;
            result = GameResult.InProgress;
            beginning = now;
        }

    (** Constructor for a rematch *)
    let rematch = fun (game : t) (now : int) : t ->
        {
            type_game = game.type_game;
            player_zero = game.player_one;
            player_one = game.player_zero;
            result = GameResult.InProgress;
            beginning = now;
        }

end

include Game
