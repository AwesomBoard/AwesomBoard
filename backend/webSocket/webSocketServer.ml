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
        SubscriptionManager.unsubscribe client_id

    (** Broadcasts a message to all subscribers of a game *)
    let broadcast = fun (game_id : int) (message : WebSocketOutgoingMessage.t) : unit Lwt.t ->
        let client_ids = SubscriptionManager.subscriptions_to game_id in
        client_ids
        |> IntSet.elements
        |> List.map (fun client_id -> send_to client_id message)
        |> Lwt.join

    (** Handle a message on a WebSocket *)
    let handle_message = fun (request : Dream.request)
                             (client_id : int)
                             (user : Models.MinimalUser.t)
                             (message : WebSocketIncomingMessage.t)
                             : unit Lwt.t ->
        Dream.log "[%s] %s" user.name (message |> WebSocketIncomingMessage.to_yojson |> JSON.to_string);
        match message with
        | Subscribe { game_id = game_id_str} ->
            (* Someone is joining a game *)
            let game_id = Id.of_string game_id_str in
            if SubscriptionManager.is_subscribed client_id then
                send_to client_id (Error { reason = "Already subscribed" })
            else begin
                SubscriptionManager.subscribe client_id game_id;
                let send_chat_messages =
                    (* Send all messages already in the chat *)
                    Chat.iter_messages request game_id (fun message ->
                        send_to client_id (ChatMessage { message })) in
                if game_id_str = "lobby" then
                    (* If this is the lobby, send all ongoing games infos *)
                    Lwt.join [
                        send_chat_messages;
                        ConfigRoom.iter_active_rooms ~request (fun game_id config_room ->
                            send_to client_id (ConfigRoomUpdate { game_id = Id.to_string game_id; config_room}))
                    ]
                else
                    (* Otherwise, send all current game infos *)
                    match%lwt ConfigRoom.get ~request ~game_id with
                    | None -> send_to client_id (Error { reason = "Game does not exist" })
                    | Some config_room -> begin match config_room.game_status with
                        | Created | ConfigProposed ->
                            Lwt.join [
                                begin
                                    (* This is a new candidate! (unless it is the creator) *)
                                    if user.id <> config_room.creator.id then
                                        let* () = ConfigRoom.add_candidate ~request ~game_id user in
                                        broadcast game_id (CandidateJoined { candidate = user })
                                    else
                                        Lwt.return ()
                                end;
                                begin
                                    (* Send config room first, and then
                                       candidates. Doing the config room first
                                       is important so that the client does not
                                       receive candidates without knowing
                                       anything about the config room. *)
                                    let* () = send_to client_id (ConfigRoomUpdate { game_id = game_id_str; config_room }) in
                                    ConfigRoom.iter_candidates ~request ~game_id (fun candidate ->
                                        send_to client_id (CandidateJoined { candidate }))
                                end;
                            ]
                        | Started | Finished ->
                            (* Send game and game events *)
                            let* game = Game.get ~request ~game_id in
                            (* It is important to send the game first and then
                               the events, so that the client knows about the
                               game before receiving events *)
                            let* () = send_to client_id (GameUpdate { update = game }) in
                            Game.iter_events ~request ~game_id (fun event -> send_to client_id (GameEvent { event }))
                    end
            end
        | Unsubscribe ->
            SubscriptionManager.unsubscribe client_id;
            Lwt.return ()

        | ChatSend { message = content } ->
            let game_id = SubscriptionManager.subscription_of client_id in
            let message = Models.Message.{ sender = user; timestamp = External.now (); content } in
            Lwt.join [
                Chat.add_message request game_id message;
                broadcast game_id (ChatMessage { message });
            ]

        | Create { game_name; _ } when game_exists game_name = false ->
            raise (Errors.BadInput "gameName does not correspond to an existing game")
        | Create { game_name } ->
            (** Someone is creating a new game [game_name] *)
            (* Retrieve elo of the creator *)
            let* creator_elo_info : Models.User.EloInfo.t = Elo.get ~request ~user_id:user.id ~game_name in
            let creator_elo : float = creator_elo_info.current_elo in
            (* Create the config room *)
            let config_room : Models.ConfigRoom.t = Models.ConfigRoom.initial user creator_elo game_name in
            let* game_id : int = ConfigRoom.create ~request config_room in
            (* Send the info to the creator and the observers of the lobby *)
            let update : WebSocketOutgoingMessage.t = GameCreated { game_id = Id.to_string game_id } in
            Lwt.join [
                send_to client_id update;
                broadcast Id.lobby update;
            ]
        | GetGameName { game_id = game_id_str } ->
            (** Someone loading a game, they want to make sure that the game name is right *)
            let game_id : int = Id.of_string game_id_str in
            (* Retrieve the game name from the config room *)
            let* game_name : string option = ConfigRoom.get_game_name ~request ~game_id in
            send_to client_id (GameName { game_name })

        (* TODO: a candidate should be able to see the part from the lobby and join *)
        | m ->
            failwith (Printf.sprintf "TODO: %s" (m |> WebSocketIncomingMessage.to_yojson |> JSON.to_string))

    (** The main handler *)
    let handle : Dream.handler = fun (request : Dream.request) ->
        Dream.websocket (fun (ws : Dream.websocket) ->
            let client_id = track ws in
            let rec loop = fun () ->
                match%lwt Dream.receive ws with
                | Some message ->
                    let user = Auth.get_minimal_user request in
                    let%lwt () = match message |> Utils.JSON.from_string |> WebSocketIncomingMessage.of_yojson with
                    | Ok message -> handle_message request client_id user message
                    | Error e ->
                        Dream.log "ERROR: %s\n" e;
                        send_to client_id (Error { reason = Printf.sprintf "Malformed message: %s" e }) in
                    loop ()
                | None ->
                    (* Client left, forget about it *)
                    (* TODO: also notify if game is is config (user left), or in play (user offline *)
                    forget client_id;
                    Dream.close_websocket ws
            in
            loop ())
end
