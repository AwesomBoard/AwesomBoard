open Alcotest
open Backend
open Utils
open TestUtils
open Domain

module ConfigRoomEndpoint = ConfigRoomEndpoint.Make(ExternalTests.Mock)(AuthTests.Mock)(FirestoreTests.Mock)(StatsTests.Mock)

let handler = Dream.router ConfigRoomEndpoint.routes

let tests = [
    "ConfigRoomEndpoint.routes POST config-room/:game_id/candidates", [

        lwt_test "should add user to candidates if they are not creator" (fun () ->
            FirestoreTests.Mock.clear_calls ();
            AuthTests.Mock.set DomainTests.a_minimal_user.id DomainTests.a_user;
            (* Given a game with a config room already existing *)
            let game_id : string = "game-id" in
            let config_room : Domain.ConfigRoom.t = ConfigRoom.initial DomainTests.another_minimal_user DomainTests.another_minimal_user_current_elo in
            FirestoreTests.Mock.ConfigRoom.set config_room;

            (* When joining the game *)
            let target = Printf.sprintf "config-room/%s/candidates" game_id in
            let request : Dream.request = Dream.request ~method_:`POST ~target "" in
            let* result = handler request in

            (* Then it should return OK and have added the candidate to the config room *)
            check status "response status" `OK (Dream.status result);
            let expected = [FirestoreTests.AddCandidate (game_id, DomainTests.a_minimal_user)] in
            check (list FirestoreTests.call) "calls" expected !FirestoreTests.Mock.calls;
            Lwt.return ()
        );

        lwt_test "should not add user to candidates if they are creator" (fun () ->
            FirestoreTests.Mock.clear_calls ();
            AuthTests.Mock.set DomainTests.a_minimal_user.id DomainTests.a_user;
            (* Given a game with a config room already existing *)
            let game_id : string = "game-id" in
            let config_room : Domain.ConfigRoom.t = ConfigRoom.initial DomainTests.a_minimal_user DomainTests.a_minimal_user_current_elo in
            FirestoreTests.Mock.ConfigRoom.set config_room;

            (* When joining the game as creator *)
            let target = Printf.sprintf "config-room/%s/candidates" game_id in
            let request : Dream.request = Dream.request ~method_:`POST ~target "" in
            let* result = handler request in

            (* Then it should return OK and have not added the candidate to the config room *)
            check status "response status" `OK (Dream.status result);
            let expected = [] in
            check (list FirestoreTests.call) "calls" expected !FirestoreTests.Mock.calls;
            Lwt.return ()
        );

    ];

    "ConfigRoomEndpoint.routes DELETE config-room/:game_id/:candidate_id", [
        lwt_test "should remove the candidate" (fun () ->
            FirestoreTests.Mock.clear_calls ();
            AuthTests.Mock.set DomainTests.a_minimal_user.id DomainTests.a_user;
            (* Given a game with a config room already existing, and where we are candidate *)
            let game_id : string = "game-id" in
            let config_room : Domain.ConfigRoom.t = ConfigRoom.initial DomainTests.a_minimal_user DomainTests.a_minimal_user_current_elo in
            FirestoreTests.Mock.ConfigRoom.set config_room;
            let uid = DomainTests.a_minimal_user.id in

            (* When removing ourselves from the game *)
            let target = Printf.sprintf "config-room/%s/candidates/%s" game_id uid in
            let request : Dream.request = Dream.request ~method_:`DELETE ~target "" in
            let* result = handler request in

            (* Then it should return OK and have removed the candidate to the config room *)
            check status "response status" `OK (Dream.status result);
            let expected = [FirestoreTests.RemoveCandidate (game_id, uid)] in
            check (list FirestoreTests.call) "calls" expected !FirestoreTests.Mock.calls;
            Lwt.return ()
        );

        lwt_test "should set part status to created when removing the chosen opponent" (fun () ->
            FirestoreTests.Mock.clear_calls ();
            AuthTests.Mock.set DomainTests.a_minimal_user.id DomainTests.a_user;
            (* Given a game with a config room already existing, and where we are the selected opponent *)
            let game_id : string = "game-id" in
            let config_room : Domain.ConfigRoom.t = {
                (ConfigRoom.initial DomainTests.another_minimal_user DomainTests.another_minimal_user_current_elo) with
                chosen_opponent = Some DomainTests.a_minimal_user
            } in
            FirestoreTests.Mock.ConfigRoom.set config_room;
            let uid = DomainTests.a_minimal_user.id in

            (* When removing ourselves from the game *)
            let target = Printf.sprintf "config-room/%s/candidates/%s" game_id uid in
            let request : Dream.request = Dream.request ~method_:`DELETE ~target "" in
            let* result = handler request in

            (* Then it should return OK and have removed the candidate to the config room *)
            check status "response status" `OK (Dream.status result);
            let expected = [
                FirestoreTests.RemoveCandidate (game_id, uid);
                FirestoreTests.UpdateConfigRoom (game_id, ConfigRoom.Updates.ReviewConfigAndRemoveOpponent.(to_yojson get));
            ] in
            check (list FirestoreTests.call) "calls" expected !FirestoreTests.Mock.calls;
            Lwt.return ()
        );
    ];

    "ConfigRoomEndpoint.routes POST config-room/:game-id?action=propose&config=...", [
        lwt_test "should update the config to propose it to the opponent" (fun () ->
            FirestoreTests.Mock.clear_calls ();
            AuthTests.Mock.set DomainTests.a_minimal_user.id DomainTests.a_user;
            (* Given a game with a config room already existing, with a selected opponent, and where we are creator *)
            let game_id : string = "game-id" in
            let config_room : Domain.ConfigRoom.t = {
                (ConfigRoom.initial DomainTests.a_minimal_user DomainTests.a_minimal_user_current_elo) with
                chosen_opponent = Some DomainTests.another_minimal_user
            } in
            FirestoreTests.Mock.ConfigRoom.set config_room;

            (* When proposing the config *)
            let update = ConfigRoom.Updates.Proposal.to_yojson {
                game_status = ConfigProposed;
                game_type = Standard;
                maximal_move_duration = 60;
                total_part_duration = 3600;
                first_player = Random;
                rules_config = `Assoc []
            } in
            let update_str = Dream.to_percent_encoded (JSON.to_string update) in
            let target = Printf.sprintf "config-room/%s?action=propose&config=%s" game_id update_str  in
            let request : Dream.request = Dream.request ~method_:`POST ~target "" in
            let* result = handler request in

            (* Then it should update the config accordingly *)
            check status "response status" `OK (Dream.status result);
            let expected = [FirestoreTests.UpdateConfigRoom (game_id, update)] in
            check (list FirestoreTests.call) "calls" expected !FirestoreTests.Mock.calls;
            Lwt.return ()
        );

        lwt_test "should fail if there is no config argument" (fun () ->
            FirestoreTests.Mock.clear_calls ();
            AuthTests.Mock.set DomainTests.a_minimal_user.id DomainTests.a_user;
            (* Given a game with a config room already existing, with a selected opponent, and where we are creator *)
            let game_id : string = "game-id" in
            let config_room : Domain.ConfigRoom.t = {
                (ConfigRoom.initial DomainTests.a_minimal_user DomainTests.a_minimal_user_current_elo) with
                chosen_opponent = Some DomainTests.another_minimal_user
            } in
            FirestoreTests.Mock.ConfigRoom.set config_room;

            (* When proposing the config but not providing a config *)
            (* Then it should fail with a BadInput exception *)
            let* _ = lwt_check_raises "failure" ((=) (BadInput "Invalid config proposal")) (fun () ->
                let target = Printf.sprintf "config-room/%s?action=propose" game_id in
                let request : Dream.request = Dream.request ~method_:`POST ~target "" in
                let* _ = handler request in
                Lwt.return ()) in
            (* and it should not have made any changes *)
            check (list FirestoreTests.call) "calls" [] !FirestoreTests.Mock.calls;
            Lwt.return ()
        );

        lwt_test "should fail if the config argument is ill-formed" (fun () ->
            FirestoreTests.Mock.clear_calls ();
            AuthTests.Mock.set DomainTests.a_minimal_user.id DomainTests.a_user;
            (* Given a game with a config room already existing, with a selected opponent, and where we are creator *)
            let game_id : string = "game-id" in
            let config_room : Domain.ConfigRoom.t = {
                (ConfigRoom.initial DomainTests.a_minimal_user DomainTests.a_minimal_user_current_elo) with
                chosen_opponent = Some DomainTests.another_minimal_user
            } in
            FirestoreTests.Mock.ConfigRoom.set config_room;

            (* When proposing the config but providing an ill-formed config *)
            (* Then it should fail with a BadInput exception *)
            let* _ = lwt_check_raises "failure" ((=) (BadInput "Invalid config proposal")) (fun () ->
                let target = Printf.sprintf "config-room/%s?action=propose&config={}" game_id in
                let request : Dream.request = Dream.request ~method_:`POST ~target "" in
                let* _ = handler request in
                Lwt.return ()) in
            (* and it should not have made any changes *)
            check (list FirestoreTests.call) "calls" [] !FirestoreTests.Mock.calls;
            Lwt.return ()
        );

        lwt_test "should fail if the config argument is invalid" (fun () ->
            FirestoreTests.Mock.clear_calls ();
            AuthTests.Mock.set DomainTests.a_minimal_user.id DomainTests.a_user;
            (* Given a game with a config room already existing, with a selected opponent, and where we are creator *)
            let game_id : string = "game-id" in
            let config_room : Domain.ConfigRoom.t = {
                (ConfigRoom.initial DomainTests.a_minimal_user DomainTests.a_minimal_user_current_elo) with
                chosen_opponent = Some DomainTests.another_minimal_user
            } in
            FirestoreTests.Mock.ConfigRoom.set config_room;

            (* When proposing the config *)
            (* Then it should fail *)
            lwt_check_raises "failure" ((=) (BadInput "Invalid config proposal")) (fun () ->
                let update = `Assoc [
                    "partStatus", ConfigRoom.GameStatus.(to_yojson Created);
                    "partType", ConfigRoom.GameType.(to_yojson Standard);
                    "maximalMoveDuration", `Int 60;
                    "totalPartDuration", `Int 3600;
                    "firstPlayer", ConfigRoom.FirstPlayer.(to_yojson Random);
                    "rulesConfig", `Assoc [];
                ] in
                let update_str = Dream.to_percent_encoded (JSON.to_string update) in
                let target = Printf.sprintf "config-room/%s?action=propose&config=%s" game_id update_str  in
                let request : Dream.request = Dream.request ~method_:`POST ~target "" in
                let* _ = handler request in
                Lwt.return ())
        );

    ];

    "ConfigRoomEndpoint.routes POST config-room/:game-id?action=accept", [
        lwt_test "should update the config room and game accordingly and send an action" (fun () ->
            FirestoreTests.Mock.clear_calls ();
            AuthTests.Mock.set DomainTests.a_minimal_user.id DomainTests.a_user;
            let now = 42 in
            ExternalTests.Mock.current_time_seconds := now;

            (* Given a game proposed to us *)
            let game_id : string = "game_id" in
            let config_room : Domain.ConfigRoom.t = {
                (ConfigRoom.initial DomainTests.another_minimal_user DomainTests.another_minimal_user_current_elo) with
                chosen_opponent = Some DomainTests.a_minimal_user
            } in
            FirestoreTests.Mock.ConfigRoom.set config_room;

            (* When accepting it *)
            let target = Printf.sprintf "config-room/%s?action=accept" game_id in
            let request : Dream.request = Dream.request ~method_:`POST ~target "" in
            let* result = handler request in

            (* Then it should update the config room, game, and send an action *)
            check status "response status" `OK (Dream.status result);
            let expected = [
                FirestoreTests.AcceptConfig game_id;
                FirestoreTests.UpdateGame (game_id, Game.Updates.Start.(to_yojson (get config_room (now * 1000) ExternalTests.Mock.rand_bool)));
                FirestoreTests.AddEvent (game_id, GameEvent.(to_yojson (Action (Action.start_game DomainTests.a_minimal_user (now * 1000)))));
            ] in
            check (list FirestoreTests.call) "calls" expected !FirestoreTests.Mock.calls;
            Lwt.return ()
        );

        lwt_test "should be able to randomly select chosen player" (fun () ->
            FirestoreTests.Mock.clear_calls ();
            AuthTests.Mock.set DomainTests.a_minimal_user.id DomainTests.a_user;
            ExternalTests.Mock.bool := false;
            let now = 42 in
            ExternalTests.Mock.current_time_seconds := now;

            (* Given a game proposed to us *)
            let game_id : string = "game_id" in
            let config_room : Domain.ConfigRoom.t = {
                (ConfigRoom.initial DomainTests.another_minimal_user DomainTests.another_minimal_user_current_elo) with
                chosen_opponent = Some DomainTests.a_minimal_user
            } in
            FirestoreTests.Mock.ConfigRoom.set config_room;

            (* When accepting it *)
            let target = Printf.sprintf "config-room/%s?action=accept" game_id in
            let request : Dream.request = Dream.request ~method_:`POST ~target "" in
            let* result = handler request in

            (* Then it should be able to select chosen player as starter *)
            check status "response status" `OK (Dream.status result);
            let expected = [
                FirestoreTests.AcceptConfig game_id;
                FirestoreTests.UpdateGame (game_id, Game.Updates.Start.(to_yojson {
                    player_zero = DomainTests.a_minimal_user;
                    player_one = DomainTests.another_minimal_user;
                    turn = 0;
                    beginning = Some (now * 1000);
                }));
                FirestoreTests.AddEvent (game_id, GameEvent.(to_yojson (Action (Action.start_game DomainTests.a_minimal_user (now * 1000)))));
            ] in
            check (list FirestoreTests.call) "calls" expected !FirestoreTests.Mock.calls;
            ExternalTests.Mock.bool := true;
            Lwt.return ()
        );
    ];

    "ConfigRoomEndpoint.routes POST config-room/:game-id?action=selectOpponent", [
        lwt_test "should update the config room accordingly" (fun () ->
            FirestoreTests.Mock.clear_calls ();
            AuthTests.Mock.set DomainTests.a_minimal_user.id DomainTests.a_user;

            (* Given a game *)
            let game_id : string = "game_id" in
            let config_room : Domain.ConfigRoom.t = ConfigRoom.initial DomainTests.a_minimal_user DomainTests.a_minimal_user_current_elo in
            FirestoreTests.Mock.ConfigRoom.set config_room;

            (* When selecting a candidate *)
            let opponent = DomainTests.a_minimal_user in
            let opponent_json = MinimalUser.to_yojson opponent in
            let opponent_str = Dream.to_percent_encoded (JSON.to_string opponent_json) in
            let target = Printf.sprintf "config-room/%s?action=selectOpponent&opponent=%s" game_id opponent_str in
            let request : Dream.request = Dream.request ~method_:`POST ~target "" in
            let* result = handler request in

            (* Then it should update the config room *)
            check status "response status" `OK (Dream.status result);
            let expected = [
                FirestoreTests.UpdateConfigRoom (game_id, ConfigRoom.Updates.SelectOpponent.(to_yojson (get opponent)));
            ] in
            check (list FirestoreTests.call) "calls" expected !FirestoreTests.Mock.calls;
            Lwt.return ()
        );

        lwt_test "should fail if there is no opponent argument" (fun () ->
            FirestoreTests.Mock.clear_calls ();
            AuthTests.Mock.set DomainTests.a_minimal_user.id DomainTests.a_user;

            (* Given a game *)
            let game_id : string = "game_id" in
            let config_room : Domain.ConfigRoom.t = ConfigRoom.initial DomainTests.a_minimal_user DomainTests.a_minimal_user_current_elo in
            FirestoreTests.Mock.ConfigRoom.set config_room;

            (* When selecting a candidate without specifying opponent *)
            (* Then it should fail with a BadInput exception *)
            let* _ = lwt_check_raises "failure" ((=) (BadInput "Invalid opponent")) (fun () ->
                let target = Printf.sprintf "config-room/%s?action=selectOpponent" game_id in
                let request : Dream.request = Dream.request ~method_:`POST ~target "" in
                let* _ = handler request in
                Lwt.return ()) in
            (* and it should not have made any changes *)

            check (list FirestoreTests.call) "calls" [] !FirestoreTests.Mock.calls;
            Lwt.return ()
        );

        lwt_test "should fail if the opponent argument is invalid" (fun () ->
            FirestoreTests.Mock.clear_calls ();
            AuthTests.Mock.set DomainTests.a_minimal_user.id DomainTests.a_user;

            (* Given a game *)
            let game_id : string = "game_id" in
            let config_room : Domain.ConfigRoom.t = ConfigRoom.initial DomainTests.a_minimal_user DomainTests.a_minimal_user_current_elo in
            FirestoreTests.Mock.ConfigRoom.set config_room;

            (* When selecting a candidate without specifying opponent *)
            (* Then it should fail with a BadInput exception *)
            let* _ = lwt_check_raises "failure" ((=) (BadInput "Invalid opponent")) (fun () ->
                let target = Printf.sprintf "config-room/%s?action=selectOpponent&opponent=oulala" game_id in
                let request : Dream.request = Dream.request ~method_:`POST ~target "" in
                let* _ = handler request in
                Lwt.return ()) in
            (* and it should not have made any changes *)
            check (list FirestoreTests.call) "calls" [] !FirestoreTests.Mock.calls;
            Lwt.return ()
        );
    ];

    "ConfigRoomEndpoint.routes POST config-room/:game-id?action=review", [
        lwt_test "should update the config room accordingly" (fun () ->
            FirestoreTests.Mock.clear_calls ();
            AuthTests.Mock.set DomainTests.a_minimal_user.id DomainTests.a_user;

            (* Given a game with a proposed config *)
            let game_id : string = "game_id" in
            let config_room : Domain.ConfigRoom.t = {
                (ConfigRoom.initial DomainTests.another_minimal_user DomainTests.another_minimal_user_current_elo) with
                chosen_opponent = Some DomainTests.a_minimal_user;
                game_status = ConfigRoom.GameStatus.ConfigProposed;
            } in
            FirestoreTests.Mock.ConfigRoom.set config_room;

            (* When reviewing the config *)
            let target = Printf.sprintf "config-room/%s?action=review" game_id in
            let request : Dream.request = Dream.request ~method_:`POST ~target "" in
            let* result = handler request in

            (* Then it should update the config room accordingly *)
            check status "response status" `OK (Dream.status result);
            let expected = [
                FirestoreTests.UpdateConfigRoom (game_id, ConfigRoom.Updates.ReviewConfig.(to_yojson get));
            ] in
            check (list FirestoreTests.call) "calls" expected !FirestoreTests.Mock.calls;
            Lwt.return ()
        );
    ];

    "ConfigRoomEndpoint.routes POST config-room/:game-id?action=reviewConfigAndRemoveOpponent", [
        lwt_test "should update the config accordingly" (fun () ->
            FirestoreTests.Mock.clear_calls ();
            AuthTests.Mock.set DomainTests.a_minimal_user.id DomainTests.a_user;

            (* Given a game with a proposed config *)
            let game_id : string = "game_id" in
            let config_room : Domain.ConfigRoom.t = {
                (ConfigRoom.initial DomainTests.another_minimal_user DomainTests.another_minimal_user_current_elo) with
                chosen_opponent = Some DomainTests.a_minimal_user;
                game_status = ConfigRoom.GameStatus.ConfigProposed;
            } in
            FirestoreTests.Mock.ConfigRoom.set config_room;

            (* When reviewing the config and removing the opponent *)
            let target = Printf.sprintf "config-room/%s?action=reviewConfigAndRemoveOpponent" game_id in
            let request : Dream.request = Dream.request ~method_:`POST ~target "" in
            let* result = handler request in

            (* Then it should update the config room accordingly *)
            check status "response status" `OK (Dream.status result);
            let expected = [
                FirestoreTests.UpdateConfigRoom (game_id, ConfigRoom.Updates.ReviewConfigAndRemoveOpponent.(to_yojson get));
            ] in
            check (list FirestoreTests.call) "calls" expected !FirestoreTests.Mock.calls;
            Lwt.return ()
        );
    ];

    "ConfigRoomEndpoint.routes POST config-room/:game-id", [
        lwt_test "should fail if no action is provided" (fun () ->
            (* Given a game *)
            let game_id : string = "game_id" in
            (* When making a POST request without action *)
            (* Then it should fail *)
            lwt_check_raises "failure" ((=) (BadInput "Missing action")) (fun () ->
                let target = Printf.sprintf "config-room/%s" game_id in
                let request : Dream.request = Dream.request ~method_:`POST ~target "" in
                let* _ = handler request in
                Lwt.return ())
        );

        lwt_test "should fail if an unknown action is provided" (fun () ->
            (* Given a game *)
            let game_id : string = "game_id" in
            (* When making a POST request without action *)
            (* Then it should fail *)
            lwt_check_raises "failure" ((=) (BadInput "Unknown action")) (fun () ->
                let target = Printf.sprintf "config-room/%s?action=doTheRoar" game_id in
                let request : Dream.request = Dream.request ~method_:`POST ~target "" in
                let* _ = handler request in
                Lwt.return ())
        );
    ]
]
