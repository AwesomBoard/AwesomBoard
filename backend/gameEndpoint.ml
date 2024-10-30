open Utils
open DreamUtils
open Domain

(** The /game/ endpoint, dealing with ongoing games *)
module type GAME_ENDPOINT = sig

    (** The routes of this endpoint *)
    val routes : Dream.route list
end

module Make
        (External : External.EXTERNAL)
        (Auth : Auth.AUTH)
        (Firestore : Firestore.FIRESTORE)
        (Stats : Stats.STATS)
    : GAME_ENDPOINT = struct

    (** The list of available games *)
    let games_list =
        let read_file = fun (filename : string) : string ->
            let ch = open_in_bin filename in
            let s = really_input_string ch (in_channel_length ch) in
            close_in ch;
            s in
        read_file "games.txt"
        |> String.split_on_char '\n'
        |> List.filter (fun x -> String.length x > 0)

    (** Respond with some JSON to the client *)
    let json_response = fun (status : Dream.status) (response : JSON.t) : Dream.response Lwt.t ->
        let headers = [("Content-Type", "application/json")] in
        Dream.respond ~headers ~status (JSON.to_string response)

    (** Create a game. Perform 1 read and 3 writes. *)
    let create : Dream.route = Dream.post "game" @@ fun request ->
        Stats.set_action request "CREATE game";
        (* Does the game name correspond to a game we have? *)
        match Dream.query request "gameName" with
        | None ->
            raise (BadInput "Missing gameName in query")
        | Some game_name when List.mem game_name games_list = false ->
            raise (BadInput "gameName does not correspond to an existing game")
        | Some game_name ->
            (* Is the user allowed to create a game? That is, the user should not have a current game *)
            let user : User.t = Auth.get_user request in
            match user.current_game with
            | Some _ -> raise (BadInput "User is already in a game")
            | None ->
                let uid : string = Auth.get_uid request in
                let creator : MinimalUser.t = User.to_minimal_user uid user in
                (* Read 1: retrieve elo *)
                let* creator_elo_info : Domain.User.EloInfo.t = Firestore.User.get_elo ~request ~user_id:uid ~type_game:game_name in
                let creator_elo : float = creator_elo_info.current_elo in
                (* Create the game, then the config room, then the chat room *)
                let game : Domain.Game.t = Game.initial game_name creator creator_elo in
                (* Write 1: create the game *)
                let* game_id : string = Firestore.Game.create ~request ~game in
                Stats.set_game_id request game_id;
                let config_room : ConfigRoom.t = ConfigRoom.initial creator creator_elo in
                (* Write 2: create the config room *)
                let* _ = Firestore.ConfigRoom.create ~request ~id:game_id ~config_room in
                (* Write 3: create the chat *)
                let* _ = Firestore.Chat.create ~request ~id:game_id in
                json_response `Created (`Assoc [("id", `String game_id)])

    (** Get a game, or only its name. Performs 1 read. *)
    let get : Dream.route = Dream.get "game/:game_id" @@ fun request ->
        let game_id : string = Dream.param request "game_id" in
        Stats.set_action request "GET game";
        Stats.set_game_id request game_id;
        match Dream.query request "onlyGameName" with
        | None ->
            (* Read 1: get the game *)
            let* game : Game.t = Firestore.Game.get ~request ~id:game_id in
            json_response `OK (Game.to_yojson game)
        | Some _ ->
            (* Read 1: get only the game name *)
            let* name : string = Firestore.Game.get_name ~request ~id:game_id in
            json_response `OK (`Assoc [("gameName", `String name)])

    (** Delete a game. Performs 3 writes. *)
    let delete : Dream.route = Dream.delete "game/:game_id" @@ fun request ->
        let game_id : string = Dream.param request "game_id" in
        Stats.set_action request "DELETE game";
        Stats.set_game_id request game_id;
        (* Write 1: delete the game *)
        let* _ = Firestore.Game.delete ~request ~id:game_id in
        (* Write 2: delete the chat *)
        let* _ = Firestore.ConfigRoom.delete ~request ~id:game_id in
        (* Write 3: delete the config room *)
        let* _ = Firestore.Chat.delete ~request ~id:game_id in
        Dream.empty `OK

    (** update the elo of the two Players. Performs 2 reads and 2 writes *)
    let end_game_elo_update = fun ~(request : Dream.request)  ~(game : Domain.Game.t) ~(winner : Elo.Winner.t): unit Lwt.t ->
        let type_game : string = game.type_game in
        (* Read 1: read the player zero elo *)
        let* player_zero_info : Domain.User.EloInfo.t = Firestore.User.get_elo ~request ~user_id:game.player_zero.id ~type_game in
        let game_player_one : MinimalUser.t = Option.get game.player_one in
        let game_player_one_id : string = game_player_one.id in
        (* Read 2: read the player one elo *)
        let* player_one_info : Domain.User.EloInfo.t = Firestore.User.get_elo ~request ~user_id:game_player_one_id ~type_game in
        let elo_info_pair = PlayerMap.{ zero = player_zero_info; one = player_one_info } in
        let new_elos : Elo.EloInfoPair.t = Elo.Calculation.new_elos elo_info_pair winner in
        let new_elo_zero : Domain.User.EloInfo.t = new_elos.zero in
        let new_elo_one : Domain.User.EloInfo.t = new_elos.one in
        (* Write 1: update the player zero elo *)
        let* _ = Firestore.User.update_elo ~request ~user_id:game.player_zero.id ~type_game:game.type_game ~new_elo:new_elo_zero in
        (* Write 2: update the player zero elo *)
        let* _ = Firestore.User.update_elo ~request ~user_id:game_player_one_id ~type_game:game.type_game ~new_elo:new_elo_one in
        Lwt.return ()

    (* Performs 2 reads and 2 writes *)
    let end_game_elo_update_win = fun ~(request : Dream.request) ~(game : Domain.Game.t) ~(winner : MinimalUser.t) : unit Lwt.t ->
        let winner_enum : Elo.Winner.t =
            if winner = game.player_zero
            then Player Zero
            else Player One in
        end_game_elo_update ~request ~game ~winner:winner_enum

    (* Performs 2 reads and 2 writes *)
    let end_game_elo_update_draw = fun ~(request : Dream.request) ~(game : Domain.Game.t): unit Lwt.t ->
        let winner_enum : Elo.Winner.t = Draw in
        end_game_elo_update ~request ~game ~winner:winner_enum

    (** Resign from a game. Perform 3 read and 4 writes. *)
    let resign = fun (request : Dream.request) (game_id : string) ->
        (* Read 1: retrieve the game *)
        let* game : Domain.Game.t = Firestore.Game.get ~request ~id:game_id in
        let resigner : MinimalUser.t = Auth.get_minimal_user request in
        let player_zero : MinimalUser.t = game.player_zero in
        match game.player_one with
        | None -> raise (BadInput "game has no opponent")
        | Some player_one ->
            Stats.end_game ();
            (* Write 1: end the game *)
            let winner : MinimalUser.t = if resigner = game.player_zero then player_one else player_zero in
            let loser : MinimalUser.t = resigner in
            let update : Domain.Game.Updates.End.t = Game.Updates.End.get ~winner ~loser Game.GameResult.Resign in
            let* _ = Firestore.Game.update ~request ~id:game_id ~update:(Game.Updates.End.to_yojson update) in
            (* Write 2: add the end action *)
            let now : int = External.now_ms () in
            let game_end = GameEvent.Action (GameEvent.Action.end_game resigner now) in
            let* _ = Firestore.Game.add_event ~request ~id:game_id ~event:game_end in
            (* Read 2 & 3: reads the elos *)
            (* Write 3 & 4: update the elos *)
            let* _ = end_game_elo_update_win ~request ~game ~winner in
            Dream.empty `OK

    (** End the game by a timeout from one player. Perform 4 read and 4 writes. *)
    let notify_timeout = fun (request : Dream.request) (game_id : string) (winner : MinimalUser.t) (loser : MinimalUser.t) ->
        Stats.end_game ();
        (* Read 1: TODO FOR REVIEW : ça fait quoi ça ? j'crois que ça retrieve pas le game non non *)
        let update : Game.Updates.End.t = Game.Updates.End.get ~winner ~loser Game.GameResult.Timeout in
        (* Write 1: end the game *)
        let* _ = Firestore.Game.update ~request ~id:game_id ~update:(Game.Updates.End.to_yojson update) in
        let requester : MinimalUser.t = Auth.get_minimal_user request in
        let now : int = External.now_ms () in
        let game_end : GameEvent.t = GameEvent.Action (GameEvent.Action.end_game requester now) in
        (* Write 2: add the end action *)
        let* _ = Firestore.Game.add_event ~request ~id:game_id ~event:game_end in
        (* Read 2: retrieve the game *)
        let* game : Domain.Game.t = Firestore.Game.get ~request ~id:game_id in
        (* Read 3 & 4: reads the elos *)
        (* Write 3 & 4: update the elos *)
        let* _ = end_game_elo_update_win ~request ~game ~winner in
        Dream.empty `OK

    (** Propose something to the opponent in-game. Perform 1 write. *)
    let propose = fun (request : Dream.request) (game_id : string) (proposition : string) ->
        let user : MinimalUser.t = Auth.get_minimal_user request in
        let now : int = External.now_ms () in
        let event : GameEvent.t = GameEvent.Request (GameEvent.Request.make user proposition now) in
        (* Write 1: add the request event *)
        let* _ = Firestore.Game.add_event ~request ~id:game_id ~event in
        Dream.empty `OK

    (** Reject a request from the opponent. Perform 1 write. *)
    let reject = fun (request : Dream.request) (game_id : string) (proposition : string) ->
        let user : MinimalUser.t = Auth.get_minimal_user request in
        let now : int = External.now_ms () in
        let event : GameEvent.t = GameEvent.Reply (GameEvent.Reply.refuse user proposition now) in
        (* Write 1: add the response *)
        let* _ = Firestore.Game.add_event ~request ~id:game_id ~event in
        Dream.empty `OK

    (** Accept a draw request from the opponent. Perform 3 read and 5 writes. *)
    let accept_draw = fun (request : Dream.request) (game_id : string) ->
        Stats.end_game ();
        (* Read 1: retrieve the game *)
        let* game : Game.t = Firestore.Game.get ~request ~id:game_id in
        let user : MinimalUser.t = Auth.get_minimal_user request in
        let now : int = External.now_ms () in
        let accept : GameEvent.t = GameEvent.Reply (GameEvent.Reply.accept user "Draw" now) in
        (* Write 1: add response *)
        let* _ = Firestore.Game.add_event ~request ~id:game_id ~event:accept in
        let player : Player.t = if user = game.player_zero then Player.Zero else Player.One in
        let update : Game.Updates.End.t = Game.Updates.End.get (Game.GameResult.AgreedDrawBy player) in
        (* Write 2: end the game *)
        let* _ = Firestore.Game.update ~request ~id:game_id ~update:(Game.Updates.End.to_yojson update) in
        let game_end : GameEvent.t = GameEvent.Action (GameEvent.Action.end_game user now) in
        (* Write 3: add the end event *)
        let* _ = Firestore.Game.add_event ~request ~id:game_id ~event:game_end in
        (* Read 2 & 3: read the elos *)
        (* Write 4 & 5: update the elos *)
        let* _ = end_game_elo_update_draw ~request ~game in
        Dream.empty `OK

    (** Accept a rematch request from the opponent. Perform 2 read and 3 writes. *)
    let accept_rematch = fun (request : Dream.request) (game_id : string) ->
        Stats.new_game ();
        (* Read 1: retrieve the game *)
        let* game : Domain.Game.t = Firestore.Game.get ~request ~id:game_id in
        (* Read 2: retrieve the config room *)
        let* config_room : Domain.ConfigRoom.t = Firestore.ConfigRoom.get ~request:request ~id:game_id in
        (* The user accepting the rematch becomes the creator *)
        let creator : MinimalUser.t = Auth.get_minimal_user request in
        let (chosen_opponent, first_player) =
            if game.player_zero = creator
            then (Option.get game.player_one, ConfigRoom.FirstPlayer.ChosenPlayer)
            else (game.player_zero, ConfigRoom.FirstPlayer.Creator) in
        let rematch_config_room : Domain.ConfigRoom.t =
            ConfigRoom.rematch config_room first_player creator chosen_opponent in
        let now : int = External.now_ms () in
        let rematch_game : Game.t = Game.rematch game.type_game rematch_config_room now External.rand_bool in
        (* Write 1: create the rematch game *)
        let* rematch_id : string = Firestore.Game.create ~request ~game:rematch_game in
        let user : MinimalUser.t = Auth.get_minimal_user request in
        (* Write 2: create the rematch config room *)
        let* _ = Firestore.ConfigRoom.create ~request ~id:rematch_id ~config_room:rematch_config_room in
        (* Write 3: create the rematch chat *)
        let* _ = Firestore.Chat.create ~request ~id:rematch_id in
        let accept_event : GameEvent.t = GameEvent.Reply (GameEvent.Reply.accept user "Rematch" ~data:(`String rematch_id) now) in
        (* Write 4: add the acceptance of the request in the previous game *)
        let* _ = Firestore.Game.add_event ~request ~id:game_id ~event:accept_event in
        let start_event : GameEvent.t = GameEvent.Action (GameEvent.Action.start_game user now) in
        (* Write 5: start the rematch *)
        let* _ = Firestore.Game.add_event ~request ~id:rematch_id ~event:start_event in
        json_response `Created (`Assoc [("id", `String game_id)])

    (** Accept a take back request from the opponent. Perform 1 read and 2 writes. *)
    let accept_take_back = fun (request : Dream.request) (game_id : string) ->
        (* Read 1: retrieve the game *)
        let* game : Game.t = Firestore.Game.get ~request ~id:game_id in
        let user : MinimalUser.t = Auth.get_minimal_user request in
        let requester_player_value : int = if game.player_zero = user then 1 else 0 in
        let new_turn : int =
            if requester_player_value = game.turn mod 2
            then game.turn - 2 (* Need to take back two turns to let the requester take back their move *)
            else game.turn - 1 in
        let now : int = External.now_ms () in
        let event : GameEvent.t = GameEvent.Reply (GameEvent.Reply.accept user "TakeBack" now) in
        (* Write 1: accept take back *)
        let* _ = Firestore.Game.add_event ~request ~id:game_id ~event in
        let update : Game.Updates.TakeBack.t = Game.Updates.TakeBack.get new_turn in
        (* Write 2: Change turn *)
        let* _ = Firestore.Game.update ~request ~id:game_id ~update:(Game.Updates.TakeBack.to_yojson update) in
        Dream.empty `OK

    (** Add time to the opponent. Perform 1 write. *)
    let add_time = fun (request : Dream.request) (game_id : string) (kind : [ `Turn | `Global ]) ->
        let user : MinimalUser.t = Auth.get_minimal_user request in
        let now : int = External.now_ms () in
        let event : GameEvent.t = GameEvent.Action (GameEvent.Action.add_time user kind now) in
        (* Write 1: add time *)
        let* _ = Firestore.Game.add_event ~request ~id:game_id ~event in
        Dream.empty `OK

    let scores_from_request = fun (request : Dream.request) : (int * int) option ->
        match (Dream.query request "score0", Dream.query request "score1") with
        | (Some score0, Some score1) -> Some (int_of_string score0, int_of_string score1)
        | _ -> None

    (** Perform a move. Perform 1 read and 2 writes. *)
    let move = fun (request : Dream.request) (game_id : string) (move : JSON.t) ->
        Stats.new_move ();
        (* Read 1: retrieve the game for the current turn *)
        let* game : Game.t = Firestore.Game.get ~request ~id:game_id in
        let user : MinimalUser.t = Auth.get_minimal_user request in
        let now : int = External.now_ms () in
        let event : GameEvent.t = GameEvent.Move (GameEvent.Move.of_json user move now) in
        (* Write 1: add the move *)
        let* _ = Firestore.Game.add_event ~request ~id:game_id ~event in
        let scores : (int * int) option = scores_from_request request in
        let update : Game.Updates.EndTurn.t = Game.Updates.EndTurn.get ?scores game.turn in
        (* Write 2: end the turn and update the scores *)
        let* _ = Firestore.Game.update ~request ~id:game_id ~update:(Game.Updates.EndTurn.to_yojson update) in
        Dream.empty `OK

    let call_adequat_elo_updater = fun ~(request : Dream.request) ~(game : Game.t) ~(result : Game.GameResult.t) ~(winner : MinimalUser.t option) : unit Lwt.t ->
        if result = Game.GameResult.Victory then
            end_game_elo_update_win ~request ~game ~winner:(Option.get winner)
        else
            end_game_elo_update_draw ~request ~game

    (** Similar to [move], but also ends the game. Perform 3 read and 5 writes *)
    let move_and_end = fun (request : Dream.request) (game_id : string) (move : JSON.t) ->
        Stats.new_move ();
        Stats.end_game ();
        (* Read 1: retrieve the game to have the current turn *)
        let* game : Game.t = Firestore.Game.get ~request ~id:game_id in
        let user : MinimalUser.t = Auth.get_minimal_user request in
        let now : int = External.now_ms () in
        let event = GameEvent.Move (GameEvent.Move.of_json user move now) in
        (* Write 1: add the move *)
        let* _ = Firestore.Game.add_event ~request ~id:game_id ~event in
        let scores : (int * int) option = scores_from_request request in
        let (result, winner, loser) = match Dream.query request "winner" with
            | Some "0" -> (Game.GameResult.Victory, Some game.player_zero, game.player_one)
            | Some "1" -> (Game.GameResult.Victory, game.player_one, Some game.player_zero)
            | None -> (Game.GameResult.HardDraw, None, None)
            | _ -> raise (BadInput "Invalid winner") in
        let update : Game.Updates.EndWithMove.t = Game.Updates.EndWithMove.get ?scores ?winner ?loser result (game.turn + 1) in
        (* Write 2: end the turn and game, update the scores *)
        let* _ = Firestore.Game.update ~request ~id:game_id ~update:(Game.Updates.EndWithMove.to_yojson update) in
        (* Write 3: add the game end action *)
        let game_end : GameEvent.t = Domain.GameEvent.Action (Domain.GameEvent.Action.end_game user now) in
        let* _ = Firestore.Game.add_event ~request ~id:game_id ~event:game_end in
        (* Read 2 & 3: read the elos *)
        (* Write 4 & 5: update the elos *)
        let* _ = call_adequat_elo_updater ~request ~game ~result ~winner in
        Dream.empty `OK

    let change : Dream.route = Dream.post "game/:game_id" @@ fun request ->
        let ( >>= ) = Result.bind in (* for convenience *)
        match Dream.query request "action" with
        | None -> raise (BadInput "Missing action")
        | Some action ->
            let game_id : string = Dream.param request "game_id" in
            Stats.set_action request (Printf.sprintf "POST game %s" action);
            Stats.set_game_id request game_id;
            match action with
            | "resign" -> resign request game_id
            | "notifyTimeout" ->
                let winner : (MinimalUser.t, string) result = get_json_param request "winner" >>= MinimalUser.of_yojson in
                let loser : (MinimalUser.t, string) result = get_json_param request "loser" >>= MinimalUser.of_yojson in
                begin match (winner, loser) with
                    | (Ok winner, Ok loser) -> notify_timeout request game_id winner loser
                    | _ -> raise (BadInput "Missing or invalid winner or loser parameter")
                end
            | "proposeDraw" -> propose request game_id "Draw"
            | "acceptDraw" -> accept_draw request game_id
            | "refuseDraw" -> reject request game_id "Draw"
            | "proposeRematch" -> propose request game_id "Rematch"
            | "acceptRematch" -> accept_rematch request game_id
            | "rejectRematch" -> reject request game_id "Rematch"
            | "askTakeBack" -> propose request game_id "TakeBack"
            | "acceptTakeBack" -> accept_take_back request game_id
            | "refuseTakeBack" -> reject request game_id "TakeBack"
            | "addGlobalTime" -> add_time request game_id `Global
            | "addTurnTime" -> add_time request game_id `Turn
            | "move" ->
                begin match get_json_param request "move" with
                    | Ok move_json -> move request game_id move_json
                    | _ -> raise (BadInput "Missing or invalid move parameter")
                end
            | "moveAndEnd" ->
                begin match get_json_param request "move" with
                    | Ok move_json -> move_and_end request game_id move_json
                    | _ -> raise (BadInput "Missing or invalid move parameter")
                end
            | _ -> raise (BadInput "Unknown action")

    let routes = [create; get; delete; change]
end
