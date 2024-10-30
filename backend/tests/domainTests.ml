open Alcotest
open TestUtils
open Backend
open Utils
open Domain

module type JSONable = sig
    type t
    val of_yojson : JSON.t -> (t, string) result
    val to_yojson : t -> JSON.t
end

let test_json_conversion (type t) (module M : JSONable with type t = t) (value : t) (json_value : JSON.t) =
    let eq : t testable =
        let pp ppf game = Fmt.pf ppf "%s" (JSON.to_string (M.to_yojson game)) in
        testable pp (=) in
    check json_eq "to JSON" json_value (M.to_yojson value);
    check eq "from JSON" value (Result.get_ok (M.of_yojson json_value));
    check json_eq "through firestore" json_value (FirestoreUtils.of_firestore (FirestoreUtils.to_firestore json_value))

let a_minimal_user : MinimalUser.t =
    { id = "uid"; name = "JeanJJ" }

let a_minimal_user_current_elo : float = 0.0

let a_minimal_user_json : JSON.t =
    `Assoc [("id", `String a_minimal_user.id); ("name", `String a_minimal_user.name)]

let a_user : User.t = {
    username = Some a_minimal_user.name;
    last_update_time = None;
    verified = true;
    current_game = None;
}

let another_minimal_user : MinimalUser.t =
    { id = "other-uid"; name = "Jeanne Jaja" }

let another_minimal_user_current_elo : float = 0.0

let another_minimal_user_json : JSON.t =
    `Assoc [("id", `String another_minimal_user.id); ("name", `String another_minimal_user.name)]

let another_user : User.t = {
    username = Some another_minimal_user.name;
    last_update_time = None;
    verified = true;
    current_game = None;
}

let elo_result_after_first_game_is_lost : User.EloInfo.t = {
    current_elo = 1.0;
    number_of_games_played = 1;
}

let elo_result_after_first_game_is_won : User.EloInfo.t = {
    current_elo = 30.0;
    number_of_games_played = 1;
}

let elo_result_after_first_game_is_draw : User.EloInfo.t = {
    current_elo = 1.0;
    number_of_games_played = 1;
}

let tests = [

    "Domain.MinimalUser show", [
        test "should work" (fun () ->
            (* Given a minimal user *)
            let minimal_user : MinimalUser.t = MinimalUser.{ id = "123"; name = "laponira"; } in
            (* When "showing" it *)
            let shown : string = MinimalUser.show minimal_user in
            (* Then it should have converted it to a legible string  that can be used for debugging *)
            let expected = "{ Domain.MinimalUser.id = \"123\"; name = \"laponira\" }" in
            check string "success" expected shown
        )
    ];

    "Domain.CurrentGame JSON conversion", [
        test "should convert to and from JSON when there is no opponent" (fun () ->
            (* Given a current game without opponent *)
            let current_game = CurrentGame.{
                id = "game-id";
                game_name = "P4";
                opponent = None;
                role = Player;
            } in
            let current_game_json = `Assoc [
                "id", `String "game-id";
                "typeGame", `String "P4";
                "opponent", `Null;
                "role", `String "Player";
            ] in
            (* When converting it to/from JSON *)
            (* Then it should work *)
            test_json_conversion (module CurrentGame) current_game current_game_json
        );

        test "should convert to and from JSON when there is an opponent" (fun () ->
            (* Given a current game without opponent *)
            let current_game : CurrentGame.t = CurrentGame.{
                id = "game-id";
                game_name = "P4";
                opponent = Some a_minimal_user;
                role = Player;
            } in
            let current_game_json = `Assoc [
                "id", `String "game-id";
                "typeGame", `String "P4";
                "opponent", a_minimal_user_json;
                "role", `String "Player";
            ] in
            (* When converting it to/from JSON *)
            (* Then it should work *)
            test_json_conversion (module CurrentGame) current_game current_game_json
        );
    ];

    "Domain.User JSON conversion", [

        test "should work" (fun () ->
            (* Given a user *)
            let user : User.t = User.{
                username = Some "foo";
                last_update_time = Some "24 September 2023 at 11:02:56 UTC-4";
                verified = true;
                current_game = None;
            } in
            let user_json = `Assoc [
                "username", `String "foo";
                "lastUpdateTime", `String "24 September 2023 at 11:02:56 UTC-4";
                "verified", `Bool true;
            ] in
            (* When converting it to and from JSON *)
            (* Then it should work *)
            test_json_conversion (module User) user user_json
        );

        test "should work when user has no update time" (fun () ->
            (* Given a user JSON without last update time *)
            let user_json = `Assoc [
                "verified", `Bool true;
                "currentGame", `Null;
                "username", `String "foo";
            ] in
            (* When converting it to a user *)
            let actual = Result.get_ok (User.of_yojson user_json) in
            (* Then it should give the expected user *)
            (* (we can't rely on test_json_conversion here as it would include last update time in one way) *)
            let expected : User.t = User.{
                username = Some "foo";
                last_update_time = None;
                verified = true;
                current_game = None;
            } in
            check user_eq "success" expected actual
        );

        test "should work when user has no current game field" (fun () ->
            (* Given a user JSON without last update time *)
            let user_json = `Assoc [
                "verified", `Bool true;
                "username", `String "foo";
            ] in
            (* When converting it to a user *)
            let actual = Result.get_ok (User.of_yojson user_json) in
            (* Then it should give the expected user *)
            (* (we can't rely on test_json_conversion here as it would include last update time in one way) *)
            let expected = User.{
                username = Some "foo";
                last_update_time = None;
                verified = true;
                current_game = None;
            } in
            check user_eq "success" expected actual
        );

        test "should work when user has a current game" (fun () ->
            (* Given a user JSON with current game *)
            let user_json = `Assoc [
                "verified", `Bool true;
                "username", `String "foo";
                "currentGame", `Assoc [
                    "id", `String "game-id";
                    "typeGame", `String "P4";
                    "opponent", `Null;
                    "role", `String "Player";
                ]
            ] in
            (* When converting it to a user *)
            let actual = Result.get_ok (User.of_yojson user_json) in
            (* Then it should give the expected user with a current game *)
            let expected = User.{
                username = Some "foo";
                last_update_time = None;
                verified = true;
                current_game = Some (CurrentGame.{
                    id = "game-id";
                    game_name = "P4";
                    opponent = None;
                    role = Player;
                })
            } in
            check user_eq "success" expected actual
        );

        test "should fail when user has extra field" (fun () ->
            (* Given a user JSON with an extra field *)
            let user_json = `Assoc [
                "currentGame", `Null;
                "lastUpdateTime", `String "2024-02-10T20:15:16.466Z";
                "observedPart", `Null;
                "username", `String "laziwofi";
                "verified", `Bool true
            ] in
            (* When converting it to a user *)
            let actual = User.of_yojson user_json in
            (* Then it should fail *)
            check (result user_eq string) "failure" (Error "Domain.User.t") actual
        );

    ];

    "Domain.User.to_minimal_user", [
        test "should convert to minimal user" (fun () ->
            (* Given a user *)
            let user = User.{
                username = Some "foo";
                last_update_time = Some "24 September 2023 at 11:02:56 UTC-4";
                verified = true;
                current_game = None;
            } in
            (* When converting it to a minimal user *)
            let actual : Domain.MinimalUser.t = User.to_minimal_user "some-id" user in
            (* Then it should keep its name and add the uid *)
            let expected = MinimalUser.{
                id = "some-id";
                name = "foo";
            } in
            check minimal_user_eq "success" expected actual
        );
    ];

    "Domain.ConfigRoom JSON conversion", [
        test "should work with initial config room" (fun () ->
            (* Given the initial config room *)
            let config_room : Domain.ConfigRoom.t = ConfigRoom.initial a_minimal_user a_minimal_user_current_elo in
            let config_room_json = `Assoc [
                "creator", a_minimal_user_json;
                "creator_elo", `Float a_minimal_user_current_elo;
                "chosenOpponent", `Null;
                "partStatus", `Int 0;
                "firstPlayer", `String "RANDOM";
                "partType", `String "STANDARD";
                "maximalMoveDuration", `Int (2*60);
                "totalPartDuration", `Int (30*60);
                "rulesConfig", `Null;
            ] in
            (* When converting it to and from JSON *)
            (* Then it should work *)
            test_json_conversion (module ConfigRoom) config_room config_room_json
        );

        test "should work with a config room that has a chosen opponent" (fun () ->
            (* Given a config room with a chosen opponent *)
            let config_room : Domain.ConfigRoom.t ={
                (ConfigRoom.initial a_minimal_user a_minimal_user_current_elo)
                with chosen_opponent = Some another_minimal_user
            } in
            let config_room_json = `Assoc [
                "creator", a_minimal_user_json;
                "creator_elo", `Float a_minimal_user_current_elo;
                "chosenOpponent", another_minimal_user_json;
                "partStatus", `Int 0;
                "firstPlayer", `String "RANDOM";
                "partType", `String "STANDARD";
                "maximalMoveDuration", `Int (2*60);
                "totalPartDuration", `Int (30*60);
                "rulesConfig", `Null;
            ] in
            (* When converting it to and from JSON *)
            (* Then it should work *)
            test_json_conversion (module ConfigRoom) config_room config_room_json
        );
    ];

    "Domain.ConfigRoom.rematch", [
        test "should change expected fields" (fun () ->
            (* Given a config room *)
            let config_room : Domain.ConfigRoom.t = { (ConfigRoom.initial a_minimal_user a_minimal_user_current_elo) with chosen_opponent = Some another_minimal_user } in
            (* When creating the rematch config room *)
            let first_player = ConfigRoom.FirstPlayer.Creator in
            let creator = another_minimal_user in
            let chosen_opponent : MinimalUser.t = a_minimal_user in
            let actual = ConfigRoom.rematch config_room first_player creator chosen_opponent in
            (* Then it should have updated game status, first player, creator, and chosen opponent *)
            let expected = {
                (ConfigRoom.initial a_minimal_user a_minimal_user_current_elo) with
                first_player;
                game_status = ConfigRoom.GameStatus.Started;
                creator;
                chosen_opponent = Some chosen_opponent;
            } in
            check config_room_eq "success" expected actual
        );
    ];

    "Domain.Game JSON conversion", [
        test "should convert an unstarted game correctly" (fun () ->
            (* Given an unstarted game *)
            let game : Domain.Game.t = Game.initial "P4" a_minimal_user a_minimal_user_current_elo in
            let game_json = `Assoc [
                "typeGame", `String "P4";
                "playerZero", a_minimal_user_json;
                "playerZeroElo", `Float a_minimal_user_current_elo;
                "turn", `Int (-1);
                "result", `Int 5;
                "playerOne", `Null;
                "beginning", `Null;
                "winner", `Null;
                "loser", `Null;
                "scorePlayerZero", `Null;
                "scorePlayerOne", `Null;
            ] in
            (* When converting it to and from JSON *)
            (* Then it should work *)
            test_json_conversion (module Game) game game_json
        );

        test "should convert a started game correctly" (fun () ->
            (* Given an started game *)
            let game : Domain.Game.t = {
                (Game.initial "P4" a_minimal_user a_minimal_user_current_elo) with
                player_one = Some another_minimal_user;
                turn = 0;
                beginning = Some 42;
            } in
            let game_json = `Assoc [
                "typeGame", `String "P4";
                "playerZero", a_minimal_user_json;
                "playerZeroElo", `Float a_minimal_user_current_elo;
                "turn", `Int 0;
                "result", `Int 5;
                "playerOne", another_minimal_user_json;
                "beginning", `Int 42;
                "winner", `Null;
                "loser", `Null;
                "scorePlayerZero", `Null;
                "scorePlayerOne", `Null;
            ] in
            (* When converting it to and from JSON *)
            (* Then it should work *)
            test_json_conversion (module Game) game game_json
        );

        test "should convert a finished game (with scores) correctly" (fun () ->
            (* Given an finished game *)
            let game : Domain.Game.t = {
                (Game.initial "P4" a_minimal_user a_minimal_user_current_elo) with
                player_one = Some another_minimal_user;
                turn = 8;
                result = Game.GameResult.Victory;
                beginning = Some 42;
                winner = Some a_minimal_user;
                loser = Some another_minimal_user;
                score_player_zero = Some 12;
                score_player_one = Some 11;
            } in
            let game_json = `Assoc [
                "typeGame", `String "P4";
                "playerZero", a_minimal_user_json;
                "playerZeroElo", `Float a_minimal_user_current_elo;
                "turn", `Int 8;
                "result", `Int 3;
                "playerOne", another_minimal_user_json;
                "beginning", `Int 42;
                "winner", a_minimal_user_json;
                "loser", another_minimal_user_json;
                "scorePlayerZero", `Int 12;
                "scorePlayerOne", `Int 11;
            ] in
            (* When converting it to and from JSON *)
            (* Then it should work *)
            test_json_conversion (module Game) game game_json
        );
    ];

    "Domain.Game.rematch", [
        test "should inherit players from config room and start the game" (fun () ->
            (* Given a config room *)
            let config_room : Domain.ConfigRoom.t = {
                (ConfigRoom.initial a_minimal_user a_minimal_user_current_elo) with
                chosen_opponent = Some another_minimal_user;
                first_player = ConfigRoom.FirstPlayer.Creator;
            } in
            (* When creating the rematch game *)
            let actual = Game.rematch "P4" config_room 42 ExternalTests.Mock.rand_bool in
            (* Then it should have updated the fields as expected *)
            let expected : Game.t = {
                (Game.initial "P4" a_minimal_user a_minimal_user_current_elo) with
                player_zero = a_minimal_user;
                player_one = Some another_minimal_user;
                beginning = Some 42;
                turn = 0;
            } in
            check game_eq "success" expected actual
        );
    ]
]
