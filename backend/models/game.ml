open Utils

(** A game as represented in Firestore (previously called "part") *)
module Game = struct

    (** The result of a game as represented in Firestore *)
    module GameResult = struct
        type t =
            | HardDraw
            | Resign
            | Victory
            | Timeout
            | Unachieved
            | AgreedDrawBy of Player.t

        (* Game results are represented as integers in Firestore *)
        let (to_yojson, of_yojson) =
            JSON.for_enum [
                HardDraw, `Int 0;
                Resign, `Int 1;
                Victory, `Int 3;
                Timeout, `Int 4;
                Unachieved, `Int 5;
                AgreedDrawBy Player.Zero, `Int 6;
                AgreedDrawBy Player.One, `Int 7;
            ]
    end

    (** A game *)
    type t = {
        type_game: string [@key "typeGame"];
        player_zero: MinimalUser.t [@key "playerZero"];
        player_zero_elo: float [@key "playerZeroElo"];
        turn: int;
        result: GameResult.t;

        player_one: MinimalUser.t option [@key "playerOne"];
        beginning: int option;
        winner: MinimalUser.t option;
        loser: MinimalUser.t option;
        score_player_zero: int option [@key "scorePlayerZero"];
        score_player_one: int option [@key "scorePlayerOne"];
    }
    [@@deriving yojson]

    (** The updates that can be made to a game *)
    module Updates = struct
        (** Starting a game *)
        module Start = struct
            type t = {
                player_zero: MinimalUser.t [@key "playerZero"];
                player_one: MinimalUser.t [@key "playerOne"];
                turn: int;
                beginning: int option;
            }
            [@@deriving to_yojson]

            let get = fun (config_room : ConfigRoom.t) (now : int) (rand_bool : unit -> bool) : t ->
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
                    player_zero;
                    player_one;
                    turn = 0;
                    beginning = Some now
                }
        end

        (** Ending a game without a last move, so this is for resigns, agreed draws, and timeouts *)
        module End = struct
            type t = {
                winner: MinimalUser.t option;
                loser: MinimalUser.t option;
                result: GameResult.t;
            }
            [@@deriving to_yojson]

            let get = fun ?(winner : MinimalUser.t option)
                          ?(loser : MinimalUser.t option)
                           (result : GameResult.t) : t ->
                { winner; loser; result; }
        end

        (** Ending a game with a last move, so this is a real victory/loss/draw *)
        module EndWithMove = struct
            type t = {
                turn: int;
                winner: MinimalUser.t option;
                loser: MinimalUser.t option;
                result: GameResult.t;
                score_player_zero: int option [@key "scorePlayerZero"];
                score_player_one: int option [@key "scorePlayerOne"];
            }
            [@@deriving to_yojson]

            let get = fun ?(winner : MinimalUser.t option)
                          ?(loser : MinimalUser.t option)
                          ?(scores : (int * int) option)
                           (result : GameResult.t)
                           (final_turn : int) : t ->
                let (score_player_zero, score_player_one) = match scores with
                    | None -> (None, None)
                    | Some (score0, score1) -> (Some score0, Some score1) in
                { winner; loser; result; score_player_zero; score_player_one; turn = final_turn }
        end

        (** Taking back a move *)
        module TakeBack = struct
            type t = {
                turn: int;
            }
            [@@deriving to_yojson]

            let get = fun (turn : int) : t ->
                { turn }
        end

        (** Ending a turn (after a move) *)
        module EndTurn = struct
            type t = {
                turn: int;
                score_player_zero: int option [@key "scorePlayerZero"];
                score_player_one: int option [@key "scorePlayerOne"];
            }
            [@@deriving to_yojson]

            let get = fun ?(scores : (int * int) option) (turn : int) : t ->
                let new_turn = turn + 1 in
                let (score_player_zero, score_player_one) = match scores with
                    | Some (score0, score1) -> (Some score0, Some score1)
                    | None -> (None, None) in
                { turn = new_turn; score_player_zero; score_player_one }
        end
    end

    (** Constructor for the initial game from its name and the creator *)
    let initial = fun (game_name : string) (creator : MinimalUser.t) (creator_elo : float) : t -> {
        type_game = game_name;
        player_zero = creator;
        player_zero_elo = creator_elo;
        turn = -1;
        result = GameResult.Unachieved;
        player_one = None;
        beginning = None;
        winner = None;
        loser = None;
        score_player_zero = None;
        score_player_one = None;
    }

    (** Constructor for a rematch, given the config room *)
    let rematch = fun (game_name : string) (config_room : ConfigRoom.t) (now : int) (rand_bool : unit -> bool) : t ->
        let starting : Updates.Start.t = Updates.Start.get config_room now rand_bool in
        let initial_game : t = initial game_name config_room.creator config_room.creator_elo  in
        {
            initial_game with
            player_zero = starting.player_zero;
            player_one = Some starting.player_one;
            turn = starting.turn;
            beginning = starting.beginning;
        }

end

include Game
