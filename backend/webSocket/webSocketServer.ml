open Utils
open WebSocketMessage

module type WEBSOCKET_SERVER = sig

    val handle : Dream.handler

end

(** The list of available games *)
let games_list : StringSet.t =
    let read_file = fun (filename : string) : string ->
        let ch = open_in_bin filename in
        let s = really_input_string ch (in_channel_length ch) in
        close_in ch;
        s in
    read_file "games.txt"
    |> String.split_on_char '\n'
    |> List.filter (fun x -> String.length x > 0)
    |> StringSet.of_list

let game_exists = fun (game_name : string) : bool ->
    StringSet.mem game_name games_list

module Make
        (Auth : Firestore.Auth.AUTH)
        (External : Utils.External.EXTERNAL)
        (Chat : Persistence.Chat.CHAT)
        (ConfigRoom : Persistence.ConfigRoom.CONFIG_ROOM)
        (Game : Persistence.Game.GAME)
        (Elo : Persistence.Elo.ELO)
        (Stats : Firestore.Stats.STATS)
    : WEBSOCKET_SERVER = struct

    (** The clients currently connected. They each are associated an id and a websocket connection *)
    let clients : (int, Dream.websocket) Hashtbl.t = Hashtbl.create 16

    (** Tracks a new client, return its id *)
    let track : Dream.websocket -> int =
        let last_client_id = ref 0 in
        fun websocket ->
            last_client_id := !last_client_id + 1;
            Hashtbl.replace clients !last_client_id websocket;
            !last_client_id

    (** Sends a message to a client *)
    let send_to = fun (client_id : int) (message : WebSocketOutgoingMessage.t) : unit Lwt.t ->
        let ws = Hashtbl.find clients client_id in
        let message_str = message |> WebSocketOutgoingMessage.to_yojson |> JSON.to_string in
        Dream.send ws message_str

    (** Forgets a client. To be used when the client disconnects *)
    let forget = fun (client_id : int) : unit ->
        Hashtbl.remove clients client_id;
        SubscriptionManager.unsubscribe ~client_id

    (** Broadcasts a message to all subscribers of a game *)
    let broadcast = fun (kind : SubscriptionManager.subscription_kind)
                        (game_id : GameId.t)
                        (message : WebSocketOutgoingMessage.t) : unit Lwt.t ->
        let client_ids = SubscriptionManager.subscriptions_to game_id kind in
        client_ids
        |> IntSet.elements
        |> List.map (fun client_id -> send_to client_id message)
        |> Lwt.join

    (** When someone leaves, either by unsubscribing, or by being disconnected *)
    let unsubscribe = fun ~(request : Dream.request)
                           (user : Models.MinimalUser.t)
                           (client_id : int) : unit Lwt.t ->
        Dream.log "is unsubscribing";
        if SubscriptionManager.is_subscribed user then begin
            let kind, game_id = SubscriptionManager.subscription_of ~client_id in
            Dream.log "they were subscribed to game %s" (GameId.to_string game_id);
            SubscriptionManager.unsubscribe ~client_id;
            match kind with
            | Lobby | Game ->
                (* Leaving the lobby or a game is easy: nothing to do*)
                Lwt.return ()
            | ConfigRoom ->
                (* Leaving a config room, we need to potentially remove the candidate or remove the config room *)
                begin match%lwt ConfigRoom.get ~request game_id with
                | Some config_room when Models.ConfigRoom.is_unstarted config_room ->
                    Dream.log "leaving lobby!";
                    if config_room.creator = user then begin
                        Dream.log "is creator, I'm removing the config room";
                        (* This is a creator of an unstarted game, remove the config room *)
                        let* () = ConfigRoom.delete ~request game_id in
                        let update : WebSocketOutgoingMessage.t = ConfigRoomDeleted { game_id } in
                        Lwt.join [
                            broadcast ConfigRoom game_id update;
                            broadcast Lobby GameId.lobby update;
                        ]
                    end else
                        (* Remove from candidates and let others know *)
                        let* () = ConfigRoom.remove_candidate ~request game_id user in
                        broadcast ConfigRoom game_id (CandidateLeft { candidate = user })
                | _ ->
                    (* Either the game has started and there's nothing to do,
                       or the config room doesn't exist (which should not be the case).
                       Either case, there's nothing to do. *)
                    Lwt.return ()
                end
        end else begin
            Dream.log "not subscribed to anything?!";
            (* If they're not subscribed, leave them be, there's nothing to do *)
            Lwt.return ()
        end


    let end_game = fun ~(request : Dream.request)
                       ~(client_id : int)
                       ~(user : Models.MinimalUser.t)
                       (get_result : Models.Game.t -> Models.Game.Result.t)
                       (other_work : unit -> unit Lwt.t list)
                       : unit Lwt.t ->
        let _, game_id = SubscriptionManager.subscription_of ~client_id in
        match%lwt Lwt.both (Game.get ~request game_id) (ConfigRoom.get ~request game_id) with
        | Some game, Some config_room ->
            (* Change the status to the appropriate one *)
            let result = get_result game in
            let* () = Game.set_result ~request game_id result in
            let game = { game with result } in
            (* Add event *)
            let event = Models.GameEvent.{ time = External.now (); user; data = EventData.Action Action.end_game } in
            let* () = Game.add_event ~request game_id event in
            (* Update Elo of both players *)
            (* TODO: let* () = update_elo ~winner ~loser in *)
            (* Update config room *)
            let* () = ConfigRoom.finish ~request game_id in
            let config_room = { config_room with status = Models.ConfigRoom.Status.Finished } in
            (* Notify subscribers and do other stuff needed by the caller *)
            Lwt.join ([
                (* Game watchers get the game update + new event *)
                broadcast Game game_id (WebSocketOutgoingMessage.GameUpdate { game });
                broadcast Game game_id (WebSocketOutgoingMessage.GameEvent { event });
                (* Lobby watchers get the config room update *)
                broadcast Lobby GameId.lobby (WebSocketOutgoingMessage.ConfigRoomUpdate { game_id; config_room });
            ] @ (other_work ()))
        | _ ->
            send_to client_id (Error { reason = WebSocketOutgoingMessage.GameDoesNotExist })

    let check_subscription = fun ~(client_id : int) (user : Models.MinimalUser.t) (then_ : unit -> unit Lwt.t) : unit Lwt.t ->
        if SubscriptionManager.is_subscribed user then
            send_to client_id (Error { reason = WebSocketOutgoingMessage.AlreadySubscribed })
        else
            then_ ()

    let send_chat_messages = fun ~(request : Dream.request) ~(client_id : int) (game_id : GameId.t) : unit Lwt.t ->
        Chat.iter_messages request game_id (fun message ->
            send_to client_id (ChatMessage { message }))

    (** Handle a message on a WebSocket *)
    let handle_message = fun (request : Dream.request)
                             (client_id : int)
                             (user : Models.MinimalUser.t)
                             (message : WebSocketIncomingMessage.t)
                             : unit Lwt.t ->
        Dream.log "[%s] %s" user.name (message |> WebSocketIncomingMessage.to_yojson |> JSON.to_string);
        match message with
        | SubscribeLobby ->
            check_subscription ~client_id user @@ fun () ->
            SubscriptionManager.subscribe ~client_id user GameId.lobby Lobby;
            (* Send all ongoing games info *)
            Lwt.join [
                send_chat_messages ~request ~client_id GameId.lobby;
                ConfigRoom.iter_active_rooms ~request (fun game_id config_room ->
                    send_to client_id (ConfigRoomUpdate { game_id; config_room}))
            ]

        | SubscribeConfigRoom { game_id } ->
            check_subscription ~client_id user @@ fun () ->
            begin match%lwt ConfigRoom.get ~request game_id with
            | None -> send_to client_id (Error { reason = WebSocketOutgoingMessage.ConfigRoomDoesNotExist })
            | Some config_room ->
                SubscriptionManager.subscribe ~client_id user game_id ConfigRoom;
                begin match config_room.status with
                | Created | ConfigProposed ->
                    (* This config room is in progress *)
                    Dream.log "Subscribed, status is: %s" (JSON.to_string (Models.ConfigRoom.Status.to_yojson config_room.status));
                    Lwt.join [
                        begin
                            (* This is a new candidate! (unless it is the creator) *)
                            if user.id <> config_room.creator.id then
                                let* () = ConfigRoom.add_candidate ~request game_id user in
                                broadcast ConfigRoom game_id (CandidateJoined { candidate = user })
                            else
                                Lwt.return ()
                        end;
                        begin

                            (* Send config room first, and then candidates.
                               Doing the config room first is important so that
                               the client does not receive candidates without
                               knowing anything about the config room. *)
                            let* () = send_to client_id (ConfigRoomUpdate { game_id; config_room }) in
                            ConfigRoom.iter_candidates ~request game_id (fun candidate ->
                                send_to client_id (CandidateJoined { candidate }))
                        end;
                    ]
                | Started | Finished ->
                    (* The game has started, just send the config room so that the client knows about it *)
                    send_to client_id (ConfigRoomUpdate { game_id; config_room })
                end
            end
        | SubscribeGame { game_id } ->
            begin match%lwt Game.get ~request game_id with
                | None -> send_to client_id (Error { reason = WebSocketOutgoingMessage.GameDoesNotExist })
                | Some game ->
                  (* It is important to send the game first and then the events,
                     so that the client knows about the game before receiving
                     events *)
                    SubscriptionManager.subscribe ~client_id user game_id Game;
                    let* () = send_to client_id (GameUpdate { game }) in
                    Lwt.join [
                        send_chat_messages ~request ~client_id game_id;
                        Game.iter_events ~request game_id (fun event -> send_to client_id (GameEvent { event }))
                    ]
            end
        | Unsubscribe ->
            unsubscribe ~request user client_id
        | ChatSend { message = content } ->
            let kind, game_id = SubscriptionManager.subscription_of ~client_id in
            let message = Models.Message.{ sender = user; timestamp = External.now (); content } in
            Lwt.join [
                Chat.add_message request game_id message;
                broadcast kind game_id (ChatMessage { message });
            ]

        | Create { game_name; _ } when game_exists game_name = false ->
            raise (Errors.BadInput "gameName does not correspond to an existing game")
        | Create { game_name } ->
            (** Someone is creating a new game [game_name] *)
            (* Retrieve elo of the creator *)
            let* creator_elo_info : Models.Elo.t = Elo.get ~request ~user_id:user.id ~game_name in
            let creator_elo : float = creator_elo_info.current_elo in
            (* Create the config room *)
            let config_room : Models.ConfigRoom.t = Models.ConfigRoom.initial user creator_elo game_name in
            let* game_id : GameId.t = ConfigRoom.create ~request config_room in
            (* Send the id to the creator, and the config room to the observers of the lobby *)
            Lwt.join [
                send_to client_id (WebSocketOutgoingMessage.GameCreated { game_id });
                broadcast Lobby GameId.lobby (WebSocketOutgoingMessage.ConfigRoomUpdate { game_id; config_room });
            ]

        | SelectOpponent { opponent } ->
            (** Creator has chosen the opponent *)
            let _, game_id = SubscriptionManager.subscription_of ~client_id in
            begin match%lwt ConfigRoom.get ~request game_id with
            | None ->
                send_to client_id (Error { reason = WebSocketOutgoingMessage.ConfigRoomDoesNotExist })
            | Some config_room when user.id = config_room.creator.id ->
                (* Add the opponent and send the update to everyone *)
                let* () = ConfigRoom.select_opponent ~request game_id opponent in
                let update : WebSocketOutgoingMessage.t =
                    ConfigRoomUpdate { game_id;
                                       config_room = { config_room with chosen_opponent = Some opponent }} in
                Lwt.join [
                    broadcast ConfigRoom game_id update;
                    broadcast Lobby GameId.lobby update; (* need to notify the lobby too! *)
                ]
            | _ ->
                send_to client_id (Error { reason = WebSocketOutgoingMessage.NotAllowed })
            end
        | ProposeConfig { config } ->
            (** Creator proposes a config to the chosen opponent *)
            let _, game_id = SubscriptionManager.subscription_of ~client_id in
            begin match%lwt ConfigRoom.get ~request game_id with
            | None ->
                send_to client_id (Error { reason = WebSocketOutgoingMessage.ConfigRoomDoesNotExist })
            | Some config_room when user.id = config_room.creator.id && config_room.status = Created ->
                (* Change the config room and send the update to candidates only *)
                let* () = ConfigRoom.propose_config ~request game_id config in
                let update : WebSocketOutgoingMessage.t =
                    ConfigRoomUpdate { game_id;
                                       config_room = { config_room with
                                                       status = ConfigProposed;
                                                       game_type = config.game_type;
                                                       maximal_move_duration = config.maximal_move_duration;
                                                       first_player = config.first_player;
                                                       rules_config = config.rules_config } } in
                broadcast ConfigRoom game_id update;
            | _ ->
                send_to client_id (Error { reason = WebSocketOutgoingMessage.NotAllowed })
            end
        | ReviewConfig ->
            (** Creator wants to review the config *)
            let _, game_id = SubscriptionManager.subscription_of ~client_id in
            begin match%lwt ConfigRoom.get ~request game_id with
            | None ->
                send_to client_id (Error { reason = WebSocketOutgoingMessage.ConfigRoomDoesNotExist })
            | Some config_room when user.id = config_room.creator.id && config_room.status = ConfigProposed ->
                (* Change the config room and send the update to candidates only *)
                let* () = ConfigRoom.review ~request game_id in
                let update : WebSocketOutgoingMessage.t =
                    ConfigRoomUpdate { game_id;
                                       config_room = { config_room with
                                                       status = Created; } } in
                broadcast ConfigRoom game_id update;
            | _ ->
                send_to client_id (Error { reason = WebSocketOutgoingMessage.NotAllowed })
            end
        | AcceptConfig ->
            (** Selected opponent accepts the config *)
            let _, game_id = SubscriptionManager.subscription_of ~client_id in
            begin match%lwt ConfigRoom.get ~request game_id with
            | None ->
                send_to client_id (Error { reason = WebSocketOutgoingMessage.ConfigRoomDoesNotExist })
            | Some config_room when Some user = config_room.chosen_opponent && config_room.status = ConfigProposed ->
                (* Change the config room and send the update to everyone *)
                let* () = ConfigRoom.accept ~request game_id in
                let config_room_update : WebSocketOutgoingMessage.t =
                    ConfigRoomUpdate { game_id;
                                       config_room = { config_room with
                                                       status = Started; } } in
                (* Also, start the game! *)
                let game = Models.Game.initial config_room (External.now ()) External.rand_bool in
                let* () = Game.create ~request game_id game in
                Lwt.join [
                    broadcast ConfigRoom game_id config_room_update;
                    broadcast Lobby GameId.lobby config_room_update;
                ]
            | _ ->
                send_to client_id (Error { reason = WebSocketOutgoingMessage.NotAllowed })
            end
        | Resign ->
            (** Player resigns *)
            end_game ~request ~client_id ~user
                (fun game -> Models.Game.Result.Resign (Models.Game.player_of game user))
                (fun () -> [])
        | NotifyTimeout { timeouted_player } ->
            end_game ~request ~client_id ~user
                (fun _ -> Models.Game.Result.Timeout timeouted_player)
                (fun () -> [])
        | GameEnd { winner } ->
            end_game ~request ~client_id ~user
                (fun _ -> match winner with
                     | Models.Player.OrNone.None -> Models.Game.Result.HardDraw
                     | Models.Player.OrNone.Zero -> Models.Game.Result.Victory Models.Player.Zero
                     | Models.Player.OrNone.One -> Models.Game.Result.Victory Models.Player.One)
                (fun () -> [])
        | Propose { proposition } ->
            let _, game_id = SubscriptionManager.subscription_of ~client_id in
            let event = Models.GameEvent.{
                time = External.now ();
                user;
                data = EventData.Request { request_type = proposition };
            } in
            let* () = Game.add_event ~request game_id event in
            broadcast Game game_id (WebSocketOutgoingMessage.GameEvent { event });
        | Reject { proposition } ->
            let _, game_id = SubscriptionManager.subscription_of ~client_id in
            let event = Models.GameEvent.{
                time = External.now ();
                user;
                data = EventData.Reply { request_type = proposition; accept = false };
            } in
            let* () = Game.add_event ~request game_id event in
            broadcast Game game_id (WebSocketOutgoingMessage.GameEvent { event });
        | Accept { proposition } ->
            let _, game_id = SubscriptionManager.subscription_of ~client_id in
            let event = Models.GameEvent.{
                time = External.now ();
                user;
                data = EventData.Reply { request_type = proposition; accept = true };
            } in
            let* () = Game.add_event ~request game_id event in
            let send_event = broadcast Game game_id (WebSocketOutgoingMessage.GameEvent { event }) in
            begin match proposition with
                | TakeBack ->
                    (* nothing to do for take back, players will take it into account when receiving the event *)
                    send_event
                | Draw ->
                    end_game ~request ~client_id ~user
                        (fun game -> Models.Game.Result.AgreedDrawBy (Models.Game.player_of game user))
                        (fun () -> [send_event])
                | Rematch ->
                    (* TODO: create a config room + game and send it to the lobby / players *)
                    failwith "TODO: rematch"
            end
        | AddTime { kind } ->
            let _, game_id = SubscriptionManager.subscription_of ~client_id in
            let event = Models.GameEvent.{
                time = External.now ();
                user;
                data = EventData.Action (Action.add_time kind);
            } in
            let* () = Game.add_event ~request game_id event in
            broadcast Game game_id (WebSocketOutgoingMessage.GameEvent { event })
        | Move { move } ->
            let _, game_id = SubscriptionManager.subscription_of ~client_id in
            let event = Models.GameEvent.{
                time = External.now ();
                user;
                data = EventData.Move { move };
            } in
            let* () = Game.add_event ~request game_id event in
            broadcast Game game_id (WebSocketOutgoingMessage.GameEvent { event })

    (** The main handler *)
    let handle : Dream.handler = fun (request : Dream.request) ->
        Dream.websocket (fun (ws : Dream.websocket) ->
            let client_id = track ws in
            let rec loop = fun () ->
                let user = Auth.get_minimal_user request in
                match%lwt Dream.receive ws with
                | Some message ->
                    ignore handle_message;
                    let%lwt () = match message |> Utils.JSON.from_string |> WebSocketIncomingMessage.of_yojson with
                    | Ok message ->
                        handle_message request client_id user message
                    | Error e ->
                        Dream.log "ERROR: %s\n" e;
                        send_to client_id (Error { reason = WebSocketOutgoingMessage.NotUndestood }) in
                    loop ()
                | None ->
                    Dream.log "Closing connection to %d" client_id;
                    let* () = unsubscribe ~request user client_id in
                    (* Client left, forget about it *)
                    forget client_id;
                    Lwt.return ()
            in
            try loop ()
            with e ->
                Dream.log "UNEXPECTED: %s -- %s\n" (Printexc.to_string e) (Printexc.get_backtrace ());
                Lwt.return ()
        )
end
