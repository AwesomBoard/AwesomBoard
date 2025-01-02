open Utils

module type WEBSOCKET_SERVER = sig

    val handle : Dream.handler
end

module type MESSAGE_TYPE = sig
    type t
    val to_yojson : t -> JSON.t
    val of_yojson : JSON.t -> (t, string) Result.t
end

module WebSocketMessage (MessageType : MESSAGE_TYPE) = struct
    open Utils

    type t = {
        message_type: MessageType.t [@key "type"];
        data: JSON.t;
    }
    [@@deriving yojson]
end

module WebSocketOutgoingMessageType = struct
    type t =
        | Error
        | ChatMessage

    let (to_yojson, of_yojson) = JSON.for_enum [
        (Error, `String "Error");
        (ChatMessage, `String "ChatMessage");
    ]
end

module WebSocketOutgoingMessage = WebSocketMessage(WebSocketOutgoingMessageType)

module WebSocketIncomingMessageType = struct
    type t =
        | Subscribe
        | Unsubscribe
        | ChatSend

    let (to_yojson, of_yojson) = JSON.for_enum [
        (Subscribe, `String "Subscribe");
        (Unsubscribe, `String "Unsubscribe");
        (ChatSend, `String "ChatSend");
    ]
end

module WebSocketIncomingMessage = WebSocketMessage(WebSocketIncomingMessageType)

module IntSet = Set.Make(Int)

(** This module contains the subscription-related code. The idea is that one
    client can subscribe to at most one game. When they are subscribed, they will
    receive all data related to the game immediately, then receive any further
    updates until they unsubscribe. *)
module SubscriptionManager = struct

    (** The subscriptions of the clients. Each client can be subscribed to only one game.
        Both maps are managed together, in order to provide fast lookup in both ways. *)
    let client_to_game : (int, int) Hashtbl.t = Hashtbl.create 16
    let game_to_clients : (int, IntSet.t) Hashtbl.t = Hashtbl.create 16

    (** [subsrcibe client_id game_id] subscribes client [client_id] to game [game_id] *)
    let subscribe = fun (client_id : int) (game_id : int) : unit ->
        (* Add it to the client_to_game map. It overwrites the previous subscription, if any. *)
        Hashtbl.replace client_to_game client_id game_id;
        (* Add it to the game_to_clients map, on top of other subscribers *)
        let new_clients = match Hashtbl.find_opt game_to_clients game_id with
            | Some clients -> IntSet.add client_id clients
            | None -> IntSet.singleton client_id in
        Hashtbl.replace game_to_clients game_id new_clients

    (** [unsubscribe client_id] unsubscribes client [client_id] from its current subscription *)
    let unsubscribe = fun (client_id : int) : unit ->
        begin match Hashtbl.find_opt client_to_game client_id with
            | Some game_id ->
                let old_clients = Hashtbl.find game_to_clients game_id in
                let new_clients = IntSet.remove client_id old_clients in
                if IntSet.is_empty new_clients then
                    Hashtbl.remove game_to_clients game_id
                else
                    Hashtbl.replace game_to_clients game_id new_clients
            | None ->
                (* Client was not subscribed to anything *)
                ()
        end;
        Hashtbl.remove client_to_game client_id

    (** [subscription_to game_id] returns all the subscribers to game [game_id] *)
    let subscriptions_to = fun (game_id : int) : IntSet.t ->
        match Hashtbl.find_opt game_to_clients game_id with
        | Some clients -> clients
        | None -> IntSet.empty

    (** [is_subscribed client_id] checks that client [client_id] is subscribed to something *)
    let is_subscribed = fun (client_id : int) : bool ->
        Hashtbl.mem client_to_game client_id

    (** [subsrciption_of client_id] gets the game to which a client is subscribed.
        Assumes that the client is subscribed to a game. If not, raises [Not_found] *)
    let subscription_of = fun (client_id : int) : int ->
        match Hashtbl.find_opt client_to_game client_id with
        | Some game -> game
        | None -> raise Not_found
end

module Make
        (Auth : Auth.AUTH)
        (External : External.EXTERNAL)
        (Chat : Chat.CHAT)
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
        let message_str = message |> WebSocketOutgoingMessage.to_yojson |> Utils.JSON.to_string in
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
        match message.message_type with
        | Subscribe ->
            let game_id : int = message.data |> JSON.Util.to_string |> Utils.Id.of_string in
            if SubscriptionManager.is_subscribed client_id then
                send_to client_id { message_type = Error; data = `String "Already subscribed" }
            else begin
                SubscriptionManager.subscribe client_id game_id;
                Chat.iter_messages request game_id (fun message ->
                    send_to client_id { message_type = ChatMessage; data = Domain.Message.to_yojson message })
            end
        | Unsubscribe ->
            SubscriptionManager.unsubscribe client_id;
            Lwt.return ()
        | ChatSend ->
            let game_id = SubscriptionManager.subscription_of client_id in
            let content = message.data |> JSON.Util.to_string in
            let message = Domain.Message.{ sender = user; timestamp = External.now (); content } in
            Lwt.join [
                Chat.add_message request game_id message;
                broadcast game_id { message_type = ChatMessage; data = Domain.Message.to_yojson message };
            ]

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
                            send_to client_id { message_type = Error; data = `String "Malformed message" } in
                    loop ()
                | None ->
                    (* Client left, forget about it *)
                    forget client_id;
                    Dream.close_websocket ws
            in
            loop ())
end
