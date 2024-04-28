open Alcotest
open Backend
open Utils
open TestUtils

(* TODO: maybe rename to GameEndpoint, to be able to always import Domain. Similarly for ConfigRoom *)
module Game = Game.Make(ExternalTests.Mock)(AuthTests.Mock)(FirestoreTests.Mock)(StatsTests.Mock)

let handler = Dream.router Game.routes

let tests = [
    "Game.routes POST game/", [

        lwt_test "should fail if the gameName is not provided" (fun () ->
            FirestoreTests.Mock.clear_calls ();
            AuthTests.Mock.set DomainTests.a_minimal_user.id DomainTests.a_user;

            (* When creating a game that does not exist *)
            (* Then it should fail *)
            lwt_check_raises "failure" ((=) (BadInput "Missing gameName in query")) (fun () ->
                let target = "game" in
                let request = Dream.request ~method_:`POST ~target "" in
                let* _ = handler request in
                Lwt.return ())
        );

        lwt_test "should fail if the gameName does not correspond to a real game" (fun () ->
            FirestoreTests.Mock.clear_calls ();
            AuthTests.Mock.set DomainTests.a_minimal_user.id DomainTests.a_user;

            (* When creating a game that does not exist *)
            (* Then it should fail *)
            lwt_check_raises "failure" ((=) (BadInput "gameName does not correspond to an existing game")) (fun () ->
                let target = "game?gameName=LaMarelle" in
                let request = Dream.request ~method_:`POST ~target "" in
                let* _ = handler request in
                Lwt.return ())
        );

        lwt_test "should fail if the user is already in a game" (fun () ->
            FirestoreTests.Mock.clear_calls ();
            (* Given a user already in a game *)
            let current_game = Some Domain.CurrentGame.{
                id = "some-other-game-id";
                game_name = "ConnectSix";
                opponent = None;
                role = Creator;
            } in
            AuthTests.Mock.set DomainTests.a_minimal_user.id { DomainTests.a_user with current_game };

            (* When creating a game *)
            (* Then it should fail *)
            lwt_check_raises "failure" ((=) (BadInput "User is already in a game")) (fun () ->
                let target = "game?gameName=P4" in
                let request = Dream.request ~method_:`POST ~target "" in
                let* _ = handler request in
                Lwt.return ())
        );

        lwt_test "should create game, config room, and chat" (fun () ->
            FirestoreTests.Mock.clear_calls ();
            (* Given a user already in a game *)
            AuthTests.Mock.set DomainTests.a_minimal_user.id DomainTests.a_user;

            (* When creating a game *)
            let target = "game?gameName=P4" in
            let request = Dream.request ~method_:`POST ~target "" in
            let* result = handler request in

            (* Then it should succeed and create the game, config room, and chat *)
            check status "response status" `Created (Dream.status result);
            let expected = [
                FirestoreTests.CreateGame Domain.Game.(to_yojson (initial "P4" DomainTests.a_minimal_user));
                FirestoreTests.CreateConfigRoom ("game_id", Domain.ConfigRoom.(to_yojson (initial DomainTests.a_minimal_user)));
                FirestoreTests.CreateChat "game_id";
            ] in
            check (list FirestoreTests.call) "calls" expected !FirestoreTests.Mock.calls;
            Lwt.return ()
        );
    ];

    "Game.routes GET game/:game_id", [
        lwt_test "should retrieve the game" (fun () ->
            FirestoreTests.Mock.clear_calls ();
            AuthTests.Mock.set DomainTests.a_minimal_user.id DomainTests.a_user;

            (* Given a game *)
            let game_id = "game_id" in
            let game = Domain.Game.initial "P4" DomainTests.a_minimal_user in
            FirestoreTests.Mock.Game.set game;

            (* When getting it *)
            let target = Printf.sprintf "game/%s" game_id in
            let request = Dream.request ~method_:`GET ~target "" in
            let* result = handler request in

            (* Then it should retrieve the game *)
            check status "response status" `OK (Dream.status result);
            let* body = Dream.body result in
            let game_from_body = Domain.Game.of_yojson (JSON.from_string body) in
            check game_eq "game" game (Result.get_ok game_from_body);
            Lwt.return ()
        );

        lwt_test "should retrieve the game name only if onlyGameName is passed" (fun () ->
            FirestoreTests.Mock.clear_calls ();
            AuthTests.Mock.set DomainTests.a_minimal_user.id DomainTests.a_user;

            (* Given a game *)
            let game = Domain.Game.initial "P4" DomainTests.a_minimal_user in
            FirestoreTests.Mock.Game.set game;

            (* When getting it *)
            let target = "game/game_id?onlyGameName" in
            let request = Dream.request ~method_:`GET ~target "" in
            let* result = handler request in

            (* Then it should retrieve the game *)
            check status "response status" `OK (Dream.status result);
            let* body = Dream.body result in
            let expected = `Assoc [
                "gameName", `String "P4";
            ] in
            check json_eq "game" expected (JSON.from_string body);
            Lwt.return ()
        );
    ];

    "Game.routes DELETE game/:game_id", [
        lwt_test "should delete the game, config room, and chat" (fun () ->
            FirestoreTests.Mock.clear_calls ();
            AuthTests.Mock.set DomainTests.a_minimal_user.id DomainTests.a_user;

            (* Given a game *)
            let game_id = "game_id" in
            let game = Domain.Game.initial "P4" DomainTests.a_minimal_user in
            FirestoreTests.Mock.Game.set game;

            (* When deleting it *)
            let target = Printf.sprintf "game/%s" game_id in
            let request = Dream.request ~method_:`DELETE ~target "" in
            let* result = handler request in

            (* Then it should delete the game, the config room, and the chat *)
            check status "response status" `OK (Dream.status result);
            let expected = [
                FirestoreTests.DeleteGame game_id;
                FirestoreTests.DeleteConfigRoom game_id;
                FirestoreTests.DeleteChat game_id;
            ] in
            check (list FirestoreTests.call) "calls" expected !FirestoreTests.Mock.calls;
            Lwt.return ()
        );
    ];

    "Game.routes POST game/:game-id", [
        lwt_test "should fail if no action is provided" (fun () ->
            (* Given a game *)
            let game_id = "game_id" in
            (* When making a POST request without action *)
            (* Then it should fail *)
            lwt_check_raises "failure" ((=) (BadInput "Missing action")) (fun () ->
                let target = Printf.sprintf "game/%s" game_id in
                let request = Dream.request ~method_:`POST ~target "" in
                let* _ = handler request in
                Lwt.return ())
        );

        lwt_test "should fail if an unknown action is provided" (fun () ->
            (* Given a game *)
            let game_id = "game_id" in
            (* When making a POST request without action *)
            (* Then it should fail *)
            lwt_check_raises "failure" ((=) (BadInput "Unknown action")) (fun () ->
                let target = Printf.sprintf "game/%s?action=doTheRoar" game_id in
                let request = Dream.request ~method_:`POST ~target "" in
                let* _ = handler request in
                Lwt.return ())
        );
    ];

    "Game.routes POST game/:game-id?action=resign", [
        lwt_test "should resign from the game (player zero)" (fun () ->
            FirestoreTests.Mock.clear_calls ();
            AuthTests.Mock.set DomainTests.a_minimal_user.id DomainTests.a_user;
            let now = 42 in
            ExternalTests.Mock.current_time := now;

            (* Given a game with an opponent *)
            let game_id = "game_id" in
            let game = {
                (Domain.Game.initial "P4" DomainTests.a_minimal_user) with
                player_one = Some DomainTests.another_minimal_user
            } in
            FirestoreTests.Mock.Game.set game;

            (* When resigning from it *)
            let target = Printf.sprintf "game/%s?action=resign" game_id in
            let request = Dream.request ~method_:`POST ~target "" in
            let* result = handler request in

            (* Then it should resign from the game *)
            check status "response status" `OK (Dream.status result);
            let winner = DomainTests.another_minimal_user in
            let loser = DomainTests.a_minimal_user in
            let end_game = Domain.Game.Updates.End.(to_yojson (get ~winner ~loser Domain.Game.GameResult.Resign)) in
            let end_game_event = Domain.Game.Event.(to_yojson (Action (Action.end_game DomainTests.a_minimal_user (now * 1000)))) in
            let expected = [
                FirestoreTests.UpdateGame (game_id, end_game);
                FirestoreTests.AddEvent (game_id, end_game_event);
            ] in
            check (list FirestoreTests.call) "calls" expected !FirestoreTests.Mock.calls;
            Lwt.return ()
        );

        lwt_test "should resign from the game (player one)" (fun () ->
            FirestoreTests.Mock.clear_calls ();
            AuthTests.Mock.set DomainTests.a_minimal_user.id DomainTests.a_user;
            let now = 42 in
            ExternalTests.Mock.current_time := now;

            (* Given a game with an opponent *)
            let game_id = "game_id" in
            let game = {
                (Domain.Game.initial "P4" DomainTests.another_minimal_user) with
                player_one = Some DomainTests.a_minimal_user
            } in
            FirestoreTests.Mock.Game.set game;

            (* When resigning from it *)
            let target = Printf.sprintf "game/%s?action=resign" game_id in
            let request = Dream.request ~method_:`POST ~target "" in
            let* result = handler request in

            (* Then it should resign from the game *)
            check status "response status" `OK (Dream.status result);
            let winner = DomainTests.another_minimal_user in
            let loser = DomainTests.a_minimal_user in
            let end_game = Domain.Game.Updates.End.(to_yojson (get ~winner ~loser Domain.Game.GameResult.Resign)) in
            let end_game_event = Domain.Game.Event.(to_yojson (Action (Action.end_game DomainTests.a_minimal_user (now * 1000)))) in
            let expected = [
                FirestoreTests.UpdateGame (game_id, end_game);
                FirestoreTests.AddEvent (game_id, end_game_event);
            ] in
            check (list FirestoreTests.call) "calls" expected !FirestoreTests.Mock.calls;
            Lwt.return ()
        );

        lwt_test "should fail when there is no opponent" (fun () ->
            FirestoreTests.Mock.clear_calls ();
            AuthTests.Mock.set DomainTests.a_minimal_user.id DomainTests.a_user;

            (* Given a game without an opponent *)
            let game_id = "game_id" in
            let game = Domain.Game.initial "P4" DomainTests.a_minimal_user in
            FirestoreTests.Mock.Game.set game;

            (* When resigning from it *)
            (* Then it should fail *)
            lwt_check_raises "failure" ((=) (BadInput "game has no opponent")) (fun () ->
                let target = Printf.sprintf "game/%s?action=resign" game_id in
                let request = Dream.request ~method_:`POST ~target "" in
                let* _ = handler request in
                Lwt.return ())
        );

    ];

    "Game.routes POST game/:game-id?action=notifyTimeout", [
        lwt_test "should end the game" (fun () ->
            FirestoreTests.Mock.clear_calls ();
            AuthTests.Mock.set DomainTests.a_minimal_user.id DomainTests.a_user;
            let now = 42 in
            ExternalTests.Mock.current_time := now;

            (* Given a game with an opponent *)
            let game_id = "game_id" in
            let game = {
                (Domain.Game.initial "P4" DomainTests.a_minimal_user) with
                player_one = Some DomainTests.another_minimal_user;
            } in
            FirestoreTests.Mock.Game.set game;

            (* When notifying the timeout of the opponent *)
            let winner = DomainTests.another_minimal_user in
            let winner_url = Dream.to_percent_encoded (JSON.to_string (Domain.MinimalUser.to_yojson winner)) in
            let loser = DomainTests.a_minimal_user in
            let loser_url = Dream.to_percent_encoded (JSON.to_string (Domain.MinimalUser.to_yojson loser)) in
            let target = Printf.sprintf "game/%s?action=notifyTimeout&winner=%s&loser=%s" game_id winner_url loser_url in
            let request = Dream.request ~method_:`POST ~target "" in
            let* result = handler request in

            (* Then it should end the game *)
            check status "response status" `OK (Dream.status result);
            let end_game = Domain.Game.Updates.End.(to_yojson (get ~winner ~loser Domain.Game.GameResult.Timeout)) in
            let end_game_event = Domain.Game.Event.(to_yojson (Action (Action.end_game DomainTests.a_minimal_user (now * 1000)))) in
            let expected = [
                FirestoreTests.UpdateGame (game_id, end_game);
                FirestoreTests.AddEvent (game_id, end_game_event);
            ] in
            check (list FirestoreTests.call) "calls" expected !FirestoreTests.Mock.calls;
            Lwt.return ()
        );

        lwt_test "should fail when winner/loser is missing" (fun () ->
            FirestoreTests.Mock.clear_calls ();
            AuthTests.Mock.set DomainTests.a_minimal_user.id DomainTests.a_user;

            (* Given a game *)
            let game_id = "game_id" in

            (* When notifying a timeout but without giving a winner/loser *)
            (* Then it should fail *)
            lwt_check_raises "failure" ((=) (BadInput "Missing or invalid winner or loser parameter")) (fun () ->
                let target = Printf.sprintf "game/%s?action=notifyTimeout" game_id in
                let request = Dream.request ~method_:`POST ~target "" in
                let* _ = handler request in
                Lwt.return ())
        );

        lwt_test "should fail when winner/loser is missing" (fun () ->
            FirestoreTests.Mock.clear_calls ();
            AuthTests.Mock.set DomainTests.a_minimal_user.id DomainTests.a_user;

            (* Given a game *)
            let game_id = "game_id" in

            (* When notifying a timeout but without giving a valid winner/loser *)
            (* Then it should fail *)
            lwt_check_raises "failure" ((=) (BadInput "Missing or invalid winner or loser parameter")) (fun () ->
                let target = Printf.sprintf "game/%s?action=notifyTimeout&winner=bli&loser=bla" game_id in
                let request = Dream.request ~method_:`POST ~target "" in
                let* _ = handler request in
                Lwt.return ())
        )
    ];

    "Game.routes POST game/:game-id?action=proposeDraw", [
        lwt_test "should propose a draw" (fun () ->
            FirestoreTests.Mock.clear_calls ();
            AuthTests.Mock.set DomainTests.a_minimal_user.id DomainTests.a_user;
            let now = 42 in
            ExternalTests.Mock.current_time := now;

            (* Given a game with an opponent *)
            let game_id = "game_id" in
            let game = {
                (Domain.Game.initial "P4" DomainTests.a_minimal_user) with
                player_one = Some DomainTests.another_minimal_user;
            } in
            FirestoreTests.Mock.Game.set game;

            (* When proposing a draw *)
            let target = Printf.sprintf "game/%s?action=proposeDraw" game_id in
            let request = Dream.request ~method_:`POST ~target "" in
            let* result = handler request in

            (* Then it should add the event *)
            check status "response status" `OK (Dream.status result);
            let propose_event = Domain.Game.Event.(to_yojson (Request (Request.draw DomainTests.a_minimal_user (now * 1000)))) in
            let expected = [
                FirestoreTests.AddEvent (game_id, propose_event);
            ] in
            check (list FirestoreTests.call) "calls" expected !FirestoreTests.Mock.calls;
            Lwt.return ()
        );
    ];

    "Game.routes POST game/:game-id?action=acceptDraw", [
        lwt_test "should accept a draw (player zero)" (fun () ->
            FirestoreTests.Mock.clear_calls ();
            AuthTests.Mock.set DomainTests.a_minimal_user.id DomainTests.a_user;
            let now = 42 in
            ExternalTests.Mock.current_time := now;

            (* Given a game with an opponent *)
            let game_id = "game_id" in
            let game = {
                (Domain.Game.initial "P4" DomainTests.a_minimal_user) with
                player_one = Some DomainTests.another_minimal_user;
            } in
            FirestoreTests.Mock.Game.set game;

            (* When accepting a draw *)
            let target = Printf.sprintf "game/%s?action=acceptDraw" game_id in
            let request = Dream.request ~method_:`POST ~target "" in
            let* result = handler request in

            (* Then it should add the event and end the game *)
            check status "response status" `OK (Dream.status result);
            let accept_event = Domain.Game.Event.(to_yojson (Reply (Reply.make DomainTests.a_minimal_user "Accept" "Draw" (now * 1000)))) in
            let update = Domain.Game.Updates.End.(to_yojson (get (Domain.Game.GameResult.AgreedDrawBy Domain.Player.Zero))) in
            let end_game_event = Domain.Game.Event.(to_yojson (Action (Action.end_game DomainTests.a_minimal_user (now * 1000)))) in
            let expected = [
                FirestoreTests.AddEvent (game_id, accept_event);
                FirestoreTests.UpdateGame (game_id, update);
                FirestoreTests.AddEvent (game_id, end_game_event);
            ] in
            check (list FirestoreTests.call) "calls" expected !FirestoreTests.Mock.calls;
            Lwt.return ()
        );

        lwt_test "should accept a draw (player one)" (fun () ->
            FirestoreTests.Mock.clear_calls ();
            AuthTests.Mock.set DomainTests.a_minimal_user.id DomainTests.a_user;
            let now = 42 in
            ExternalTests.Mock.current_time := now;

            (* Given a game with an opponent *)
            let game_id = "game_id" in
            let game = {
                (Domain.Game.initial "P4" DomainTests.another_minimal_user) with
                player_one = Some DomainTests.a_minimal_user;
            } in
            FirestoreTests.Mock.Game.set game;

            (* When accepting a draw *)
            let target = Printf.sprintf "game/%s?action=acceptDraw" game_id in
            let request = Dream.request ~method_:`POST ~target "" in
            let* result = handler request in

            (* Then it should add the event and end the game *)
            check status "response status" `OK (Dream.status result);
            let accept_event = Domain.Game.Event.(to_yojson (Reply (Reply.make DomainTests.a_minimal_user "Accept" "Draw" (now * 1000)))) in
            let update = Domain.Game.Updates.End.(to_yojson (get (Domain.Game.GameResult.AgreedDrawBy Domain.Player.One))) in
            let end_game_event = Domain.Game.Event.(to_yojson (Action (Action.end_game DomainTests.a_minimal_user (now * 1000)))) in
            let expected = [
                FirestoreTests.AddEvent (game_id, accept_event);
                FirestoreTests.UpdateGame (game_id, update);
                FirestoreTests.AddEvent (game_id, end_game_event);
            ] in
            check (list FirestoreTests.call) "calls" expected !FirestoreTests.Mock.calls;
            Lwt.return ()
        );
    ];

    "Game.routes POST game/:game-id?action=refuseDraw", [
        lwt_test "should add rejection event" (fun () ->
            FirestoreTests.Mock.clear_calls ();
            AuthTests.Mock.set DomainTests.a_minimal_user.id DomainTests.a_user;
            let now = 42 in
            ExternalTests.Mock.current_time := now;

            (* Given a game with an opponent *)
            let game_id = "game_id" in
            let game = {
                (Domain.Game.initial "P4" DomainTests.a_minimal_user) with
                player_one = Some DomainTests.another_minimal_user;
            } in
            FirestoreTests.Mock.Game.set game;

            (* When rejecting a draw *)
            let target = Printf.sprintf "game/%s?action=refuseDraw" game_id in
            let request = Dream.request ~method_:`POST ~target "" in
            let* result = handler request in

            (* Then it should add the event *)
            check status "response status" `OK (Dream.status result);
            let propose_event = Domain.Game.Event.(to_yojson (Reply (Reply.make DomainTests.a_minimal_user "Reject" "Draw" (now * 1000)))) in
            let expected = [
                FirestoreTests.AddEvent (game_id, propose_event);
            ] in
            check (list FirestoreTests.call) "calls" expected !FirestoreTests.Mock.calls;
            Lwt.return ()
        );
    ];

    "Game.routes POST game/:game-id?action=proposeRematch", [
        lwt_test "should propose a rematch" (fun () ->
            FirestoreTests.Mock.clear_calls ();
            AuthTests.Mock.set DomainTests.a_minimal_user.id DomainTests.a_user;
            let now = 42 in
            ExternalTests.Mock.current_time := now;

            (* Given a game with an opponent *)
            let game_id = "game_id" in
            let game = {
                (Domain.Game.initial "P4" DomainTests.a_minimal_user) with
                player_one = Some DomainTests.another_minimal_user;
            } in
            FirestoreTests.Mock.Game.set game;

            (* When proposing a rematch *)
            let target = Printf.sprintf "game/%s?action=proposeRematch" game_id in
            let request = Dream.request ~method_:`POST ~target "" in
            let* result = handler request in

            (* Then it should add the event *)
            check status "response status" `OK (Dream.status result);
            let propose_event = Domain.Game.Event.(to_yojson (Request (Request.rematch DomainTests.a_minimal_user (now * 1000)))) in
            let expected = [
                FirestoreTests.AddEvent (game_id, propose_event);
            ] in
            check (list FirestoreTests.call) "calls" expected !FirestoreTests.Mock.calls;
            Lwt.return ()
        );
    ];

    "Game.routes POST game/:game-id?action=acceptRematch", [
        lwt_test "should accept a rematch (player zero)" (fun () ->
            FirestoreTests.Mock.clear_calls ();
            AuthTests.Mock.set DomainTests.a_minimal_user.id DomainTests.a_user;
            let now = 42 in
            ExternalTests.Mock.current_time := now;

            (* Given a game with an opponent *)
            let game_id = "game_id" in
            let config_room = {
                (Domain.ConfigRoom.initial DomainTests.another_minimal_user)
                with chosen_opponent = Some DomainTests.a_minimal_user;
            } in
            let game = {
                (Domain.Game.initial "P4" DomainTests.a_minimal_user) with
                player_one = Some DomainTests.another_minimal_user;
            } in
            FirestoreTests.Mock.Game.set game;

            (* When accepting a rematch *)
            let target = Printf.sprintf "game/%s?action=acceptRematch" game_id in
            let request = Dream.request ~method_:`POST ~target "" in
            let* result = handler request in

            (* Then it should add the event and end the game *)
            let new_game_id = "game_id" in
            check status "response status" `Created (Dream.status result);
            let new_config_room = Domain.ConfigRoom.(rematch config_room FirstPlayer.ChosenPlayer DomainTests.a_minimal_user DomainTests.another_minimal_user) in
            let new_game = Domain.Game.(to_yojson (rematch "P4" new_config_room (now * 1000) ExternalTests.Mock.rand_bool)) in
            let accept_event = Domain.Game.Event.(to_yojson (Reply (Reply.make ~data:(`String new_game_id) DomainTests.a_minimal_user "Accept" "Rematch" (now * 1000)))) in
            let start_event = Domain.Game.Event.(to_yojson (Action (Action.start_game DomainTests.a_minimal_user (now * 1000)))) in
            let expected = [
                FirestoreTests.CreateGame new_game;
                FirestoreTests.CreateConfigRoom (new_game_id, Domain.ConfigRoom.to_yojson new_config_room);
                FirestoreTests.CreateChat new_game_id;
                FirestoreTests.AddEvent (game_id, accept_event);
                FirestoreTests.AddEvent (new_game_id, start_event);
            ] in
            check (list FirestoreTests.call) "calls" expected !FirestoreTests.Mock.calls;
            Lwt.return ()
        );

        lwt_test "should accept a rematch (player one)" (fun () ->
            FirestoreTests.Mock.clear_calls ();
            AuthTests.Mock.set DomainTests.a_minimal_user.id DomainTests.a_user;
            let now = 42 in
            ExternalTests.Mock.current_time := now;

            (* Given a game with an opponent *)
            let game_id = "game_id" in
            let config_room = {
                (Domain.ConfigRoom.initial DomainTests.another_minimal_user)
                with chosen_opponent = Some DomainTests.a_minimal_user;
            } in
            let game = {
                (Domain.Game.initial "P4" DomainTests.another_minimal_user) with
                player_one = Some DomainTests.a_minimal_user;
            } in
            FirestoreTests.Mock.Game.set game;

            (* When accepting a rematch *)
            let target = Printf.sprintf "game/%s?action=acceptRematch" game_id in
            let request = Dream.request ~method_:`POST ~target "" in
            let* result = handler request in

            (* Then it should add the event and end the game *)
            let new_game_id = "game_id" in
            check status "response status" `Created (Dream.status result);
            let new_config_room = Domain.ConfigRoom.(rematch config_room FirstPlayer.Creator DomainTests.a_minimal_user DomainTests.another_minimal_user) in
            let new_game = Domain.Game.(to_yojson (rematch "P4" new_config_room (now * 1000) ExternalTests.Mock.rand_bool)) in
            let accept_event = Domain.Game.Event.(to_yojson (Reply (Reply.make ~data:(`String new_game_id) DomainTests.a_minimal_user "Accept" "Rematch" (now * 1000)))) in
            let start_event = Domain.Game.Event.(to_yojson (Action (Action.start_game DomainTests.a_minimal_user (now * 1000)))) in
            let expected = [
                FirestoreTests.CreateGame new_game;
                FirestoreTests.CreateConfigRoom (new_game_id, Domain.ConfigRoom.to_yojson new_config_room);
                FirestoreTests.CreateChat new_game_id;
                FirestoreTests.AddEvent (game_id, accept_event);
                FirestoreTests.AddEvent (new_game_id, start_event);
            ] in
            check (list FirestoreTests.call) "calls" expected !FirestoreTests.Mock.calls;
            Lwt.return ()
        );
    ];

    "Game.routes POST game/:game-id?action=rejectRematch", [
        lwt_test "should add rejection event" (fun () ->
            FirestoreTests.Mock.clear_calls ();
            AuthTests.Mock.set DomainTests.a_minimal_user.id DomainTests.a_user;
            let now = 42 in
            ExternalTests.Mock.current_time := now;

            (* Given a game with an opponent *)
            let game_id = "game_id" in
            let game = {
                (Domain.Game.initial "P4" DomainTests.a_minimal_user) with
                player_one = Some DomainTests.another_minimal_user;
            } in
            FirestoreTests.Mock.Game.set game;

            (* When rejecting a rematch *)
            let target = Printf.sprintf "game/%s?action=rejectRematch" game_id in
            let request = Dream.request ~method_:`POST ~target "" in
            let* result = handler request in

            (* Then it should add the event *)
            check status "response status" `OK (Dream.status result);
            let propose_event = Domain.Game.Event.(to_yojson (Reply (Reply.make DomainTests.a_minimal_user "Reject" "Rematch" (now * 1000)))) in
            let expected = [
                FirestoreTests.AddEvent (game_id, propose_event);
            ] in
            check (list FirestoreTests.call) "calls" expected !FirestoreTests.Mock.calls;
            Lwt.return ()
        );
    ];

    "Game.routes POST game/:game-id?action=askTakeBack", [
        lwt_test "should propose a take back" (fun () ->
            FirestoreTests.Mock.clear_calls ();
            AuthTests.Mock.set DomainTests.a_minimal_user.id DomainTests.a_user;
            let now = 42 in
            ExternalTests.Mock.current_time := now;

            (* Given a game with an opponent *)
            let game_id = "game_id" in
            let game = {
                (Domain.Game.initial "P4" DomainTests.a_minimal_user) with
                player_one = Some DomainTests.another_minimal_user;
            } in
            FirestoreTests.Mock.Game.set game;

            (* When proposing a take back *)
            let target = Printf.sprintf "game/%s?action=askTakeBack" game_id in
            let request = Dream.request ~method_:`POST ~target "" in
            let* result = handler request in

            (* Then it should add the event *)
            check status "response status" `OK (Dream.status result);
            let propose_event = Domain.Game.Event.(to_yojson (Request (Request.take_back DomainTests.a_minimal_user (now * 1000)))) in
            let expected = [
                FirestoreTests.AddEvent (game_id, propose_event);
            ] in
            check (list FirestoreTests.call) "calls" expected !FirestoreTests.Mock.calls;
            Lwt.return ()
        );
    ];

    "Game.routes POST game/:game-id?action=acceptTakeBack", [
        lwt_test "should accept take back (during our turn)" (fun () ->
            FirestoreTests.Mock.clear_calls ();
            AuthTests.Mock.set DomainTests.a_minimal_user.id DomainTests.a_user;
            let now = 42 in
            ExternalTests.Mock.current_time := now;

            (* Given a game with an opponent (on our turn) *)
            let game_id = "game_id" in
            let game = {
                (Domain.Game.initial "P4" DomainTests.a_minimal_user) with
                player_one = Some DomainTests.another_minimal_user;
                turn = 2;
            } in
            FirestoreTests.Mock.Game.set game;

            (* When accepting a take back *)
            let target = Printf.sprintf "game/%s?action=acceptTakeBack" game_id in
            let request = Dream.request ~method_:`POST ~target "" in
            let* result = handler request in

            (* Then it should take back to previous opponent turn *)
            check status "response status" `OK (Dream.status result);
            let accept_event = Domain.Game.Event.(to_yojson (Reply (Reply.make DomainTests.a_minimal_user "Accept" "TakeBack" (now * 1000)))) in
            let update = Domain.Game.Updates.TakeBack.(to_yojson (get 1)) in
            let expected = [
                FirestoreTests.AddEvent (game_id, accept_event);
                FirestoreTests.UpdateGame (game_id, update);
            ] in
            check (list FirestoreTests.call) "calls" expected !FirestoreTests.Mock.calls;
            Lwt.return ()
        );

        lwt_test "should accept take back (during opponent turn)" (fun () ->
            FirestoreTests.Mock.clear_calls ();
            AuthTests.Mock.set DomainTests.a_minimal_user.id DomainTests.a_user;
            let now = 42 in
            ExternalTests.Mock.current_time := now;

            (* Given a game with an opponent (on their turn) *)
            let game_id = "game_id" in
            let game = {
                (Domain.Game.initial "P4" DomainTests.a_minimal_user) with
                player_one = Some DomainTests.another_minimal_user;
                turn = 3;
            } in
            FirestoreTests.Mock.Game.set game;

            (* When accepting a take back *)
            let target = Printf.sprintf "game/%s?action=acceptTakeBack" game_id in
            let request = Dream.request ~method_:`POST ~target "" in
            let* result = handler request in

            (* Then it should take back to previous opponent turn *)
            check status "response status" `OK (Dream.status result);
            let accept_event = Domain.Game.Event.(to_yojson (Reply (Reply.make DomainTests.a_minimal_user "Accept" "TakeBack" (now * 1000)))) in
            let update = Domain.Game.Updates.TakeBack.(to_yojson (get 1)) in
            let expected = [
                FirestoreTests.AddEvent (game_id, accept_event);
                FirestoreTests.UpdateGame (game_id, update);
            ] in
            check (list FirestoreTests.call) "calls" expected !FirestoreTests.Mock.calls;
            Lwt.return ()
        );

        lwt_test "should accept take back (as player one)" (fun () ->
            FirestoreTests.Mock.clear_calls ();
            AuthTests.Mock.set DomainTests.a_minimal_user.id DomainTests.a_user;
            let now = 42 in
            ExternalTests.Mock.current_time := now;

            (* Given a game with an opponent (on our turn) *)
            let game_id = "game_id" in
            let game = {
                (Domain.Game.initial "P4" DomainTests.another_minimal_user) with
                player_one = Some DomainTests.a_minimal_user;
                turn = 2;
            } in
            FirestoreTests.Mock.Game.set game;

            (* When accepting a take back *)
            let target = Printf.sprintf "game/%s?action=acceptTakeBack" game_id in
            let request = Dream.request ~method_:`POST ~target "" in
            let* result = handler request in

            (* Then it should take back to previous opponent turn *)
            check status "response status" `OK (Dream.status result);
            let accept_event = Domain.Game.Event.(to_yojson (Reply (Reply.make DomainTests.a_minimal_user "Accept" "TakeBack" (now * 1000)))) in
            let update = Domain.Game.Updates.TakeBack.(to_yojson (get 0)) in
            let expected = [
                FirestoreTests.AddEvent (game_id, accept_event);
                FirestoreTests.UpdateGame (game_id, update);
            ] in
            check (list FirestoreTests.call) "calls" expected !FirestoreTests.Mock.calls;
            Lwt.return ()
        );
    ];

    "Game.routes POST game/:game-id?action=refuseTakeBack", [
        lwt_test "should add rejection event" (fun () ->
            FirestoreTests.Mock.clear_calls ();
            AuthTests.Mock.set DomainTests.a_minimal_user.id DomainTests.a_user;
            let now = 42 in
            ExternalTests.Mock.current_time := now;

            (* Given a game with an opponent *)
            let game_id = "game_id" in
            let game = {
                (Domain.Game.initial "P4" DomainTests.a_minimal_user) with
                player_one = Some DomainTests.another_minimal_user;
            } in
            FirestoreTests.Mock.Game.set game;

            (* When rejecting a take back *)
            let target = Printf.sprintf "game/%s?action=refuseTakeBack" game_id in
            let request = Dream.request ~method_:`POST ~target "" in
            let* result = handler request in

            (* Then it should add the event *)
            check status "response status" `OK (Dream.status result);
            let propose_event = Domain.Game.Event.(to_yojson (Reply (Reply.make DomainTests.a_minimal_user "Reject" "TakeBack" (now * 1000)))) in
            let expected = [
                FirestoreTests.AddEvent (game_id, propose_event);
            ] in
            check (list FirestoreTests.call) "calls" expected !FirestoreTests.Mock.calls;
            Lwt.return ()
        );
    ];

    "Game.routes POST game/:game-id?action=addGlobalTime", [
        lwt_test "should add the event" (fun () ->
            FirestoreTests.Mock.clear_calls ();
            AuthTests.Mock.set DomainTests.a_minimal_user.id DomainTests.a_user;
            let now = 42 in
            ExternalTests.Mock.current_time := now;

            (* Given a game with an opponent *)
            let game_id = "game_id" in
            let game = {
                (Domain.Game.initial "P4" DomainTests.a_minimal_user) with
                player_one = Some DomainTests.another_minimal_user;
            } in
            FirestoreTests.Mock.Game.set game;

            (* When adding turn time *)
            let target = Printf.sprintf "game/%s?action=addGlobalTime" game_id in
            let request = Dream.request ~method_:`POST ~target "" in
            let* result = handler request in

            (* Then it should add the event *)
            check status "response status" `OK (Dream.status result);
            let event = Domain.Game.Event.(to_yojson (Action (Action.add_time DomainTests.a_minimal_user `Global (now * 1000)))) in
            let expected = [
                FirestoreTests.AddEvent (game_id, event);
            ] in
            check (list FirestoreTests.call) "calls" expected !FirestoreTests.Mock.calls;
            Lwt.return ()
        );
    ];

    "Game.routes POST game/:game-id?action=addTurnTime", [
        lwt_test "should add the event" (fun () ->
            FirestoreTests.Mock.clear_calls ();
            AuthTests.Mock.set DomainTests.a_minimal_user.id DomainTests.a_user;
            let now = 42 in
            ExternalTests.Mock.current_time := now;

            (* Given a game with an opponent *)
            let game_id = "game_id" in
            let game = {
                (Domain.Game.initial "P4" DomainTests.a_minimal_user) with
                player_one = Some DomainTests.another_minimal_user;
            } in
            FirestoreTests.Mock.Game.set game;

            (* When adding global time *)
            let target = Printf.sprintf "game/%s?action=addTurnTime" game_id in
            let request = Dream.request ~method_:`POST ~target "" in
            let* result = handler request in

            (* Then it should add the event *)
            check status "response status" `OK (Dream.status result);
            let event = Domain.Game.Event.(to_yojson (Action (Action.add_time DomainTests.a_minimal_user `Turn (now * 1000)))) in
            let expected = [
                FirestoreTests.AddEvent (game_id, event);
            ] in
            check (list FirestoreTests.call) "calls" expected !FirestoreTests.Mock.calls;
            Lwt.return ()
        );
    ];

    "Game.routes POST game/:game-id?action=move&move=...", [
        lwt_test "should do a move" (fun () ->
            FirestoreTests.Mock.clear_calls ();
            AuthTests.Mock.set DomainTests.a_minimal_user.id DomainTests.a_user;
            let now = 42 in
            ExternalTests.Mock.current_time := now;

            (* Given a game with an opponent *)
            let game_id = "game_id" in
            let game = {
                (Domain.Game.initial "P4" DomainTests.a_minimal_user) with
                player_one = Some DomainTests.another_minimal_user;
                turn = 0;
            } in
            FirestoreTests.Mock.Game.set game;

            (* When sending a move *)
            let move = `Assoc ["x", `Int 0] in
            let move_url = Dream.to_percent_encoded (JSON.to_string move) in
            let target = Printf.sprintf "game/%s?action=move&move=%s" game_id move_url in
            let request = Dream.request ~method_:`POST ~target "" in
            let* result = handler request in

            (* Then it should add the event and end the game *)
            check status "response status" `OK (Dream.status result);
            let update = Domain.Game.Updates.EndTurn.(to_yojson (get 0)) in
            let move_event = Domain.Game.Event.(to_yojson (Move (Move.of_json DomainTests.a_minimal_user move (now * 1000)))) in
            let expected = [
                FirestoreTests.AddEvent (game_id, move_event);
                FirestoreTests.UpdateGame (game_id, update);
            ] in
            check (list FirestoreTests.call) "calls" expected !FirestoreTests.Mock.calls;
            Lwt.return ()
        );

        lwt_test "should take scores into account" (fun () ->
            FirestoreTests.Mock.clear_calls ();
            AuthTests.Mock.set DomainTests.a_minimal_user.id DomainTests.a_user;
            let now = 42 in
            ExternalTests.Mock.current_time := now;

            (* Given a game with an opponent *)
            let game_id = "game_id" in
            let game = {
                (Domain.Game.initial "P4" DomainTests.a_minimal_user) with
                player_one = Some DomainTests.another_minimal_user;
                turn = 0;
            } in
            FirestoreTests.Mock.Game.set game;

            (* When sending a move with a score *)
            let move = `Assoc ["x", `Int 0] in
            let move_url = Dream.to_percent_encoded (JSON.to_string move) in
            let score0 = 42 in
            let score1 = 37 in
            let target = Printf.sprintf "game/%s?action=move&move=%s&score0=%d&score1=%d" game_id move_url score0 score1 in
            let request = Dream.request ~method_:`POST ~target "" in
            let* result = handler request in

            (* Then it should add the event and end the game *)
            check status "response status" `OK (Dream.status result);
            let update = Domain.Game.Updates.EndTurn.(to_yojson (get ~scores:(score0, score1) 0)) in
            let move_event = Domain.Game.Event.(to_yojson (Move (Move.of_json DomainTests.a_minimal_user move (now * 1000)))) in
            let expected = [
                FirestoreTests.AddEvent (game_id, move_event);
                FirestoreTests.UpdateGame (game_id, update);
            ] in
            check (list FirestoreTests.call) "calls" expected !FirestoreTests.Mock.calls;
            Lwt.return ()
        );

        lwt_test "should fail if no move is provided" (fun () ->
            (* Given a game *)
            let game_id = "game_id" in
            (* When making a POST request without action *)
            (* Then it should fail *)
            lwt_check_raises "failure" ((=) (BadInput "Missing or invalid move parameter")) (fun () ->
                let target = Printf.sprintf "game/%s?action=move" game_id in
                let request = Dream.request ~method_:`POST ~target "" in
                let* _ = handler request in
                Lwt.return ())
        );
    ];

    "Game.routes POST game/:game-id?action=moveAndEnd&move=...", [
        lwt_test "should do a move and end the game" (fun () ->
            FirestoreTests.Mock.clear_calls ();
            AuthTests.Mock.set DomainTests.a_minimal_user.id DomainTests.a_user;
            let now = 42 in
            ExternalTests.Mock.current_time := now;

            (* Given a game with an opponent *)
            let game_id = "game_id" in
            let game = {
                (Domain.Game.initial "P4" DomainTests.a_minimal_user) with
                player_one = Some DomainTests.another_minimal_user;
                turn = 0;
            } in
            FirestoreTests.Mock.Game.set game;

            (* When sending a move that ends the game in a draw *)
            let move = `Assoc ["x", `Int 0] in
            let move_url = Dream.to_percent_encoded (JSON.to_string move) in
            let target = Printf.sprintf "game/%s?action=moveAndEnd&move=%s" game_id move_url in
            let request = Dream.request ~method_:`POST ~target "" in
            let* result = handler request in

            (* Then it should add the event and end the game *)
            check status "response status" `OK (Dream.status result);
            let update = Domain.Game.Updates.EndWithMove.(to_yojson (get Domain.Game.GameResult.HardDraw 1)) in
            let move_event = Domain.Game.Event.(to_yojson (Move (Move.of_json DomainTests.a_minimal_user move (now * 1000)))) in
            let end_game = Domain.Game.Event.(to_yojson (Action (Action.end_game DomainTests.a_minimal_user (now * 1000)))) in
            let expected = [
                FirestoreTests.AddEvent (game_id, move_event);
                FirestoreTests.UpdateGame (game_id, update);
                FirestoreTests.AddEvent (game_id, end_game);
            ] in
            check (list FirestoreTests.call) "calls" expected !FirestoreTests.Mock.calls;
            Lwt.return ()
        );

        lwt_test "should set winner accordingly (player zero)" (fun () ->
            FirestoreTests.Mock.clear_calls ();
            AuthTests.Mock.set DomainTests.a_minimal_user.id DomainTests.a_user;
            let now = 42 in
            ExternalTests.Mock.current_time := now;

            (* Given a game with an opponent *)
            let game_id = "game_id" in
            let game = {
                (Domain.Game.initial "P4" DomainTests.a_minimal_user) with
                player_one = Some DomainTests.another_minimal_user;
                turn = 0;
            } in
            FirestoreTests.Mock.Game.set game;

            (* When sending a move that ends the game with player 0 as winner *)
            let move = `Assoc ["x", `Int 0] in
            let move_url = Dream.to_percent_encoded (JSON.to_string move) in
            let target = Printf.sprintf "game/%s?action=moveAndEnd&move=%s&winner=0" game_id move_url in
            let request = Dream.request ~method_:`POST ~target "" in
            let* result = handler request in

            (* Then it should add the event and end the game *)
            check status "response status" `OK (Dream.status result);
            let winner = DomainTests.a_minimal_user in
            let loser = DomainTests.another_minimal_user in
            let update = Domain.Game.Updates.EndWithMove.(to_yojson (get ~winner ~loser Domain.Game.GameResult.Victory 1)) in
            let move_event = Domain.Game.Event.(to_yojson (Move (Move.of_json DomainTests.a_minimal_user move (now * 1000)))) in
            let end_game = Domain.Game.Event.(to_yojson (Action (Action.end_game DomainTests.a_minimal_user (now * 1000)))) in
            let expected = [
                FirestoreTests.AddEvent (game_id, move_event);
                FirestoreTests.UpdateGame (game_id, update);
                FirestoreTests.AddEvent (game_id, end_game);
            ] in
            check (list FirestoreTests.call) "calls" expected !FirestoreTests.Mock.calls;
            Lwt.return ()
        );

        lwt_test "should set winner accordingly (player one)" (fun () ->
            FirestoreTests.Mock.clear_calls ();
            AuthTests.Mock.set DomainTests.a_minimal_user.id DomainTests.a_user;
            let now = 42 in
            ExternalTests.Mock.current_time := now;

            (* Given a game with an opponent *)
            let game_id = "game_id" in
            let game = {
                (Domain.Game.initial "P4" DomainTests.a_minimal_user) with
                player_one = Some DomainTests.another_minimal_user;
                turn = 0;
            } in
            FirestoreTests.Mock.Game.set game;

            (* When sending a move that ends the game with player 0 as winner *)
            let move = `Assoc ["x", `Int 0] in
            let move_url = Dream.to_percent_encoded (JSON.to_string move) in
            let target = Printf.sprintf "game/%s?action=moveAndEnd&move=%s&winner=1" game_id move_url in
            let request = Dream.request ~method_:`POST ~target "" in
            let* result = handler request in

            (* Then it should add the event and end the game *)
            check status "response status" `OK (Dream.status result);
            let winner = DomainTests.another_minimal_user in
            let loser = DomainTests.a_minimal_user in
            let update = Domain.Game.Updates.EndWithMove.(to_yojson (get ~winner ~loser Domain.Game.GameResult.Victory 1)) in
            let move_event = Domain.Game.Event.(to_yojson (Move (Move.of_json DomainTests.a_minimal_user move (now * 1000)))) in
            let end_game = Domain.Game.Event.(to_yojson (Action (Action.end_game DomainTests.a_minimal_user (now * 1000)))) in
            let expected = [
                FirestoreTests.AddEvent (game_id, move_event);
                FirestoreTests.UpdateGame (game_id, update);
                FirestoreTests.AddEvent (game_id, end_game);
            ] in
            check (list FirestoreTests.call) "calls" expected !FirestoreTests.Mock.calls;
            Lwt.return ()
        );

        lwt_test "should set scores accordingly" (fun () ->
            FirestoreTests.Mock.clear_calls ();
            AuthTests.Mock.set DomainTests.a_minimal_user.id DomainTests.a_user;
            let now = 42 in
            ExternalTests.Mock.current_time := now;

            (* Given a game with an opponent *)
            let game_id = "game_id" in
            let game = {
                (Domain.Game.initial "P4" DomainTests.a_minimal_user) with
                player_one = Some DomainTests.another_minimal_user;
                turn = 0;
            } in
            FirestoreTests.Mock.Game.set game;

            (* When sending a move that ends the game with player 0 as winner *)
            let move = `Assoc ["x", `Int 0] in
            let move_url = Dream.to_percent_encoded (JSON.to_string move) in
            let score0 = 2 in
            let score1 = 1 in
            let target = Printf.sprintf "game/%s?action=moveAndEnd&move=%s&winner=0&score0=%d&score1=%d" game_id move_url score0 score1 in
            let request = Dream.request ~method_:`POST ~target "" in
            let* result = handler request in

            (* Then it should add the event and end the game *)
            check status "response status" `OK (Dream.status result);
            let winner = DomainTests.a_minimal_user in
            let loser = DomainTests.another_minimal_user in
            let scores = (score0, score1) in
            let update = Domain.Game.Updates.EndWithMove.(to_yojson (get ~winner ~loser ~scores Domain.Game.GameResult.Victory 1)) in
            let move_event = Domain.Game.Event.(to_yojson (Move (Move.of_json DomainTests.a_minimal_user move (now * 1000)))) in
            let end_game = Domain.Game.Event.(to_yojson (Action (Action.end_game DomainTests.a_minimal_user (now * 1000)))) in
            let expected = [
                FirestoreTests.AddEvent (game_id, move_event);
                FirestoreTests.UpdateGame (game_id, update);
                FirestoreTests.AddEvent (game_id, end_game);
            ] in
            check (list FirestoreTests.call) "calls" expected !FirestoreTests.Mock.calls;
            Lwt.return ()
        );

        lwt_test "should fail if no move is provided" (fun () ->
            (* Given a game *)
            let game_id = "game_id" in
            (* When making a POST request without action *)
            (* Then it should fail *)
            lwt_check_raises "failure" ((=) (BadInput "Missing or invalid move parameter")) (fun () ->
                let target = Printf.sprintf "game/%s?action=moveAndEnd" game_id in
                let request = Dream.request ~method_:`POST ~target "" in
                let* _ = handler request in
                Lwt.return ())
        );

        lwt_test "should fail if invalid winner is provided" (fun () ->
            (* Given a game *)
            let game_id = "game_id" in
            (* When making a POST request with valid move but invalid winner/loser *)
            (* Then it should fail *)
            lwt_check_raises "failure" ((=) (BadInput "Invalid winner")) (fun () ->
                let move = `Assoc ["x", `Int 0] in
                let move_url = Dream.to_percent_encoded (JSON.to_string move) in
                let target = Printf.sprintf "game/%s?action=moveAndEnd&move=%s&winner=9" game_id move_url in
                let request = Dream.request ~method_:`POST ~target "" in
                let* _ = handler request in
                Lwt.return ())
        );
    ];

]
