open Alcotest
open TestUtils
open Backend
open Utils

module Mock : Stats.STATS = struct
    let set_action _ _ = ()
    let set_user _ _ = ()
    let set_game_id _ _ = ()
    let read _ = ()
    let write _ = ()
    let new_game _ = ()
    let end_game _ = ()
    let new_move _ = ()
    let summary _ = Dream.empty `OK
end

module Stats = Stats.Impl

let tests = [
    "Stats.routes", [
        lwt_test "should provide summary when getting /stats (read)" (fun () ->
            (* Given a stats status where a read was performed in a game, by a user, for an action *)
            let request : Dream.request = Dream.request "/" in (* need a request for context *)
            Stats.set_action request "some-action";
            Stats.set_user request { id = "user-id"; name = "foo" };
            Stats.set_game_id request "game-id";
            Stats.read request;
            (* When getting /stats *)
            let* response = Stats.summary request in
            (* Then it should have recorded the read *)
            let* body = Dream.body response in
            let json = JSON.from_string body in
            let open JSON.Util in
            let reads json = json |> member "reads" |> to_int in
            let total_reads = json |> member "total" |> reads in
            let action_reads = json |> member "per_action" |> member "some-action" |> reads in
            let user_reads = json |> member "per_user" |> member "user-id" |> reads in
            let game_reads = json |> member "per_game" |> member "game-id" |> reads in
            check int "total reads" 1 total_reads;
            check int "per action" 1 action_reads;
            check int "per user" 1 user_reads;
            check int "per game" 1 game_reads;
            Lwt.return ()
        );
        lwt_test "should provide a summary when getting /stats (writes)" (fun () ->
            (* Given a stats status where a read was performed in a game, by a user, for an action *)
            let request : Dream.request = Dream.request "/" in (* need a request for context *)
            Stats.set_action request "some-action";
            Stats.set_user request { id = "user-id"; name = "foo" };
            Stats.set_game_id request "game-id";
            Stats.write request;
            (* When getting /stats *)
            let* response = Stats.summary request in
            (* Then it should have recorded the read *)
            let* body = Dream.body response in
            let json = JSON.from_string body in
            Printf.printf "%s\n" (JSON.to_string json);
            let open JSON.Util in
            let writes json = json |> member "writes" |> to_int in
            let total_writes = json |> member "total" |> writes in
            let action_writes = json |> member "per_action" |> member "some-action" |> writes in
            let user_writes = json |> member "per_user" |> member "user-id" |> writes in
            let game_writes = json |> member "per_game" |> member "game-id" |> writes in
            check int "total writes" 1 total_writes;
            check int "per action" 1 action_writes;
            check int "per user" 1 user_writes;
            check int "per game" 1 game_writes;
            Lwt.return ()
        );
        lwt_test "should provide summary when getting /stats (game stats)" (fun () ->
            (* Given a stats status where a game was played with 5 moves *)
            let n_moves = 5 in
            Stats.new_game ();
            for _ = 1 to n_moves do Stats.new_move () done;
            Stats.end_game ();
            (* When getting /stats *)
            let* response = Stats.summary (Dream.request "/") in
            (* Then it should have recorded the read *)
            let* body = Dream.body response in
            let json = JSON.from_string body in
            let open JSON.Util in
            let started = json |> member "games" |> member "started" |> to_int in
            let ended = json |> member "games" |> member "ended" |> to_int in
            let moves = json |> member "games" |> member "moves" |> to_int in
            check int "games started" 1 started;
            check int "games ended" 1 ended;
            check int "number of moves" n_moves moves;
            Lwt.return ()
        );
    ];
]
