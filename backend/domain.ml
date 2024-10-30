open Utils

(** This file defines the domain types, i.e., what is used to store data in the database *)

(** A player is either player zero or one *)
module Player = struct
    type t = Zero | One

    (** Players are represented by numbers in the database *)
    let (to_yojson, of_yojson) =
        JSON.for_enum [
            Zero, `Int 0;
            One, `Int 1;
        ]

    let opponent_of = fun (player : t) : t ->
        match player with
        | Zero -> One
        | One -> Zero
end

(** It is sometimes useful to represent player maps *)
module PlayerMap = struct
    type 'a t = {
        zero : 'a;
        one : 'a;
    }

    let get = fun (map : 'a t) (player : Player.t) ->
        match player with
        | Zero -> map.zero
        | One -> map.one
end

(** The role a user may have in a config-room *)
module Role = struct
    type t = Player | Observer | Creator | ChosenOpponent | Candidate

    (** Roles are represented as strings in the database *)
    let (to_yojson, of_yojson) =
        JSON.for_enum [
            Player, `String "Player";
            Observer, `String "Observer";
            Creator, `String "Creator";
            ChosenOpponent, `String "ChosenOpponent";
            Candidate, `String "Candidate";
        ]
end

(** A minimal user as represented in Firestore. *)
module MinimalUser = struct
    type t = {
        id: string; (** The user id *)
        name: string; (** The user name *)
    }
    [@@deriving yojson, show]
end

(** The current game stored in the user document *)
module CurrentGame = struct
    type t = {
        id: string; (** The id of the game *)
        game_name: string [@key "typeGame"]; (** The name of the game *)
        opponent: MinimalUser.t option; (** The opponent against which the user is playing *)
        role: Role.t; (** The role of the user *)
    }
    [@@deriving yojson]
end

(** The user document in Firestore *)
module User = struct
    type t = {
        username: string option;
        last_update_time: string option [@default None] [@key "lastUpdateTime"];
        verified: bool;
        current_game: CurrentGame.t option [@default None] [@key "currentGame"];
    }
    [@@deriving yojson]

    let to_minimal_user = fun (uid : string) (user : t) : MinimalUser.t ->
        { id = uid; name = Option.get user.username }

    (** The user contains a sub-collection containing its elo score for each game.
        Each game therefore has an EloInfo.t *)
    module EloInfo = struct
        type t = {
            current_elo : float [@key "currentElo"];
            number_of_games_played : int [@key "numberOfGamesPlayed"];
        }
        [@@deriving yojson]

        let empty : t = {
            current_elo = 0.0;
            number_of_games_played = 0;
        }
    end

end

(** The config room document in Firestore *)
module ConfigRoom = struct

    (** The status of the game in Firestore *)
    module GameStatus = struct
        type t = Created | ConfigProposed | Started | Finished

        (* Game status are stored as numbers, with specific values *)
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
    }
    [@@deriving yojson]

    (** The initial config room that we create when creating a new game *)
    let initial = fun (creator : MinimalUser.t) (creator_elo : float) : t -> {
        creator;
        creator_elo;
        first_player = FirstPlayer.Random;
        chosen_opponent = None;
        game_status = GameStatus.Created;
        game_type = GameType.Standard;
        maximal_move_duration = GameType.standard_move_duration;
        total_part_duration = GameType.standard_game_duration;
        rules_config = `Null;
    }

    (** A config room with similar characteristics as the [config_room] parameter, but for its rematch *)
    let rematch = fun (config_room : t)
                      (first_player : FirstPlayer.t)
                      (creator : MinimalUser.t)
                      (chosen_opponent : MinimalUser.t)
                      : t ->
        let game_status = GameStatus.Started in
        { config_room with game_status; first_player; creator; chosen_opponent = Some chosen_opponent }


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

        module Proposal = struct
            type t = {
                game_status: GameStatus.t [@key "partStatus"];
                game_type: GameType.t [@key "partType"];
                maximal_move_duration: int [@key "maximalMoveDuration"];
                total_part_duration: int [@key "totalPartDuration"];
                first_player: FirstPlayer.t [@key "firstPlayer"];
                rules_config: JSON.t [@key "rulesConfig"];
            }
            [@@deriving yojson]

            let of_yojson = fun (json : JSON.t) : (t, string) result ->
                match of_yojson json with
                | Ok config when config.game_status = ConfigProposed ->
                    Ok config
                | Ok _ -> Error "invalid config proposal update: game_status must be ConfigProposed"
                | Error err -> Error err
        end
    end

end

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
        [@@deriving to_yojson]

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
        [@@deriving to_yojson]

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
        [@@deriving to_yojson]

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
        [@@deriving to_yojson]

        let of_json = fun (user : MinimalUser.t) (move : JSON.t) (now : int) : t ->
            { event_type = "Move"; user; move; time = now }
    end

    (** The possible events *)
    type t =
        | Request of Request.t
        | Reply of Reply.t
        | Action of Action.t
        | Move of Move.t

    let to_yojson = fun (event : t) : JSON.t ->
        match event with
        | Request request -> Request.to_yojson request
        | Reply reply -> Reply.to_yojson reply
        | Action action -> Action.to_yojson action
        | Move move -> Move.to_yojson move

end
