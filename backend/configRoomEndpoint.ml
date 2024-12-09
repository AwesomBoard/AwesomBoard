open Utils
open DreamUtils
open Domain

(** The /config-room/ endpoint, dealing mostly with part creation *)
module type CONFIG_ROOM_ENDPOINT = sig
    (** The routes exposed by this endpoint *)
    val routes : Dream.route list
end

module Make
        (External : External.EXTERNAL)
        (Auth : Auth.AUTH)
        (Firestore : Firestore.FIRESTORE)
        (Stats : Stats.STATS)
    : CONFIG_ROOM_ENDPOINT = struct
    let ( >>= ) = Result.bind (* for convenience *)

    (** Route to join a config-room.
        Performs 1 read and up to 1 write *)
    let join_game : Dream.route = Dream.post "config-room/:game_id/candidates" @@ fun (request : Dream.request) ->
        let game_id : string = Dream.param request "game_id" in
        Stats.set_action request (Printf.sprintf "POST config-room/candidates");
        Stats.set_game_id request game_id;
        let user : MinimalUser.t = Auth.get_minimal_user request in
        (* Check if game exists, if it does not this will throw Not_found *)
        (* Read 1: retrieve the config room *)
        try
            let* config_room = Firestore.ConfigRoom.get ~request ~id:game_id in
            let* _ =
                if config_room.creator.id <> user.id then
                    (* Write 1: User is candidate, add it to candidate list *)
                    Firestore.ConfigRoom.add_candidate ~request ~id:game_id ~candidate:user
                else
                    (* If the user is creator, they should not be added to the candidate list *)
                    Lwt.return () in
            Dream.empty `OK
        with
        | Invalid_argument _->
            Dream.empty `Not_Found

    (** Route to remove a candidate (usually ourselves) from a config-room.
        Performs 1 read and up to 2 writes. *)
    let remove_candidate : Dream.route = Dream.delete "config-room/:game_id/candidates/:candidate_id" @@ fun (request : Dream.request) ->
        let game_id : string = Dream.param request "game_id" in
        let candidate_id = Dream.param request "candidate_id" in
        Stats.set_action request (Printf.sprintf "DELETE config-room/candidates");
        Stats.set_game_id request game_id;
        (* Read 1: get config room *)
        let* config_room = Firestore.ConfigRoom.get ~request ~id:game_id in
        (* Write 1: remove candidate from the config room *)
        let* _ = Firestore.ConfigRoom.remove_candidate ~request ~id:game_id ~candidate_id in
        (* Write 2: set config room "created" if it was the chosen opponent *)
        let* _ = match config_room.chosen_opponent with
            | Some opponent when candidate_id = opponent.id ->
                let update = ConfigRoom.Updates.ReviewConfigAndRemoveOpponent.(to_yojson get) in
                Firestore.ConfigRoom.update ~request ~id:game_id ~update
            | _ -> Lwt.return () in
        Dream.empty `OK

    (** Route to propose a config to the opponent.
        Performs 1 write. *)
    let propose_config = fun (request : Dream.request) (game_id : string) ->
        (* The config is attached as a json parameter to the request, we extract it *)
        match get_json_param request "config" >>= ConfigRoom.Updates.Proposal.of_yojson with
        | Error _ -> raise (BadInput "Invalid config proposal")
        | Ok update ->
            (* Write 1: update the config *)
            let update_json = ConfigRoom.Updates.Proposal.to_yojson update in
            let* _ = Firestore.ConfigRoom.update ~request ~id:game_id ~update:update_json in
            Dream.empty `OK

    (** Route to accept a config-room and start the game.
        Performs 1 read and 3 writes. *)
    let accept_config = fun (request : Dream.request) (game_id : string) ->
        Stats.new_game ();
        (* Read 1: retrieve the config room *)
        let* config_room = Firestore.ConfigRoom.get ~request ~id:game_id in
        (* Write 1: accept the config room *)
        let* _ = Firestore.ConfigRoom.accept ~request ~id:game_id in
        let now : int = External.now_ms () in
        let starting_config = Game.Updates.Start.get config_room now External.rand_bool in
        let accepter : MinimalUser.t = Auth.get_minimal_user request in
        (* Write 2: start the game *)
        let* _ = Firestore.Game.update ~request ~id:game_id ~update:(Game.Updates.Start.to_yojson starting_config) in
        let event = GameEvent.(Action (Action.start_game accepter now)) in
        (* Write 3: add a start action *)
        let* _ = Firestore.Game.add_event ~request ~id:game_id ~event in
        Dream.empty `OK

    (** Route to select the opponent in a config-room.
        Performs 1 write. *)
    let select_opponent = fun (request : Dream.request) (game_id : string) ->
        match get_json_param request "opponent" >>= MinimalUser.of_yojson with
        | Error _ -> raise (BadInput "Invalid opponent")
        | Ok opponent ->
            (* Write 1: update the config *)
            let update = ConfigRoom.Updates.SelectOpponent.(to_yojson (get opponent)) in
            let* _ = Firestore.ConfigRoom.update ~request ~id:game_id ~update in
            Dream.empty `OK

    (** Route to review a config-room.
        Perform 1 write. *)
    let review_config = fun (request : Dream.request) (game_id : string) ->
        let update = ConfigRoom.Updates.ReviewConfig.(to_yojson get) in
        let* _ = Firestore.ConfigRoom.update ~request ~id:game_id ~update in
        Dream.empty `OK

    (** Route to review a config-room and remove the opponent.
        Performs 1 write. *)
    let review_config_and_remove_opponent = fun (request : Dream.request) (game_id : string) ->
        let update = ConfigRoom.Updates.ReviewConfigAndRemoveOpponent.(to_yojson get) in
        let* _ = Firestore.ConfigRoom.update ~request ~id:game_id ~update in
        Dream.empty `OK

    (** Route to change a config room.
        Done by dispatching to one of the functions defined above *)
    let change : Dream.route =
        (* We respond to POST requests on e.g., config-room/some-id?action=... *)
        Dream.post "config-room/:game_id" @@ fun request ->
        match Dream.query request "action" with
        | None -> raise (BadInput "Missing action")
        | Some action ->
            let game_id : string = Dream.param request "game_id" in
            Stats.set_action request (Printf.sprintf "POST config-room %s" action);
            Stats.set_game_id request game_id;
            match action with
            | "propose" -> propose_config request game_id
            | "selectOpponent" -> select_opponent request game_id
            | "review" -> review_config request game_id
            | "accept" -> accept_config request game_id
            | "reviewConfigAndRemoveOpponent" -> review_config_and_remove_opponent request game_id
            | _ -> raise (BadInput "Unknown action")

    let routes = [join_game; remove_candidate; change]
end
