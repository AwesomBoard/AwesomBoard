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
        (Auth : Auth.AUTH)
        (External : External.EXTERNAL)
        (Chat : Chat.CHAT)
        (ConfigRoom : ConfigRoom.CONFIG_ROOM)
        (Stats : Stats.STATS)
    : WEBSOCKET_SERVER = struct

    (** The clients currently connected. They each are associated an id and a websocket connection *)
    let clients : (int, Dream.websocket) Hashtbl.t = Hashtbl.create 16

    let lobby : int = 0 (* Lobby has a special game_id *)

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
                             (user : Domain.MinimalUser.t)
                             (message : WebSocketIncomingMessage.t)
                             : unit Lwt.t ->
        match message with
        | Subscribe { game_id = game_id_str} ->
            let game_id = Id.of_string game_id_str in
            if SubscriptionManager.is_subscribed client_id then
                send_to client_id (Error { reason = "Already subscribed" })
            else begin
                SubscriptionManager.subscribe client_id game_id;
                Chat.iter_messages request game_id (fun message ->
                    send_to client_id (ChatMessage { message }))
                (* TODO: for lobby, send game list. For game, send game info/updates *)
            end
        | Unsubscribe ->
            SubscriptionManager.unsubscribe client_id;
            Lwt.return ()

        | ChatSend { message = content } ->
            let game_id = SubscriptionManager.subscription_of client_id in
            let message = Domain.Message.{ sender = user; timestamp = External.now (); content } in
            Lwt.join [
                Chat.add_message request game_id message;
                broadcast game_id (ChatMessage { message });
            ]

        | Create { game_name } when game_exists game_name = false ->
            raise (BadInput "gameName does not correspond to an existing game")

        | Create { game_name } ->
            (* Retrieve elo *)
            let* creator_elo_info : Domain.User.EloInfo.t = failwith "TODO" (* Firestore.User.get_elo ~request ~user_id:user.id ~type_game:game_name *) in
            let creator_elo : float = creator_elo_info.current_elo in
            (* Create the config room only *)
            let config_room : Domain.ConfigRoom.t = Domain.ConfigRoom.initial user creator_elo game_name in
            let* game_id : int = ConfigRoom.create request config_room in
            Stats.set_game_id request (Id.to_string game_id);
            (* Send the info to the creator and the observers of the lobby *)
            let update : WebSocketOutgoingMessage.t = GameCreated { game_id = Id.to_string game_id; config_room } in
            let* () = send_to client_id update in
            broadcast lobby update
        | ProposeConfig { config } ->
            let game_id = SubscriptionManager.subscription_of client_id in
            let* () = ConfigRoom.propose request game_id config in
            broadcast game_id (ConfigProposed { config  })
        | AcceptConfig ->
            let game_id = SubscriptionManager.subscription_of client_id in
            let* () = ConfigRoom.accept request game_id in
            failwith "TODO: start game"
        | SelectOpponent { opponent } ->
            let game_id = SubscriptionManager.subscription_of client_id in
            let* () = ConfigRoom.select_opponent request game_id opponent in
            broadcast game_id (OpponentSelected { opponent })
        | ReviewConfig ->
            let game_id = SubscriptionManager.subscription_of client_id in
            let* () = ConfigRoom.review request game_id in
            broadcast game_id ConfigInReview
        | ReviewConfigAndRemoveOpponent ->
            let game_id = SubscriptionManager.subscription_of client_id in
            let* () = ConfigRoom.review_and_remove_opponent request game_id in
            broadcast game_id ConfigInReviewAndOpponentRemoved

        | Resign ->
            failwith "TODO"
            (*
            let game_id = SubscriptionManager.subscription_of client_id in
            let resigner = user in
            let* game = Game.get request game_id in
            let player_zero : MinimalUser.t = game.player_zero in
            let player_one : MinimalUser.t = game.player_one in
            Stats.end_game ();
            let winner : MinimalUser.t = if resigner = game.player_zero then player_one else player_zero in
            let loser : MinimalUser.t = resigner in
            let* () = Game.finish request ~winner ~loser Domain.Game.GameResult.Resign in
            broadcast game_id (PlayerResigned { resigner }) *)
        | NotifyTimeout _
        | Propose _
        | Reject _
        | AcceptTakeBack
        | AcceptDraw
        | AcceptRematch
        | AddTime _ ->
            failwith "TODO"

    (** The main handler *)
    let handle : Dream.handler = fun (request : Dream.request) ->
        Dream.websocket (fun (ws : Dream.websocket) ->
            let client_id = track ws in
            let rec loop = fun () ->
                match%lwt Dream.receive ws with
                | Some message ->
                    let user = Auth.get_minimal_user request in
                    let%lwt () = try
                            let message = message
                                          |> Utils.JSON.from_string
                                          |> WebSocketIncomingMessage.of_yojson
                                          |> Result.get_ok in
                            handle_message request client_id user message
                        with
                        | e ->
                            Dream.log "ERROR: %s\n" (Printexc.to_string e);
                            send_to client_id (Error { reason = "Malformed message" }) in
                    loop ()
                | None ->
                    (* Client left, forget about it *)
                    forget client_id;
                    Dream.close_websocket ws
            in
            loop ())
end
