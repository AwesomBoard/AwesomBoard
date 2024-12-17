module External = External.Impl
module ServerUtils = ServerUtils.Make(External)
module Stats = Stats.Impl
module GoogleCertificates = GoogleCertificates.Make(External)
module Jwt = Jwt.Make(External)
module TokenRefresher = TokenRefresher.Make(External)(Jwt)
module Firestore = Firestore.Make(FirestorePrimitives.Make(External)(TokenRefresher)(Stats))
module Auth = Auth.Make(Firestore)(GoogleCertificates)(Stats)(Jwt)
module GameEndpoint = GameEndpoint.Make(External)(Auth)(Firestore)(Stats)
module ConfigRoomEndpoint = ConfigRoomEndpoint.Make(External)(Auth)(Firestore)(Stats)

(** The version number of this server. Used to avoid redeploying when there are no changes.
    If a redeployment is needed, just change the version number. Any difference will trigger redeployment.
    When finalizing a change, make sure to increase the number using semantic versioning:
    - increase the last number if it is a minor change that doesn't break compatibility
    - increase the second number if it is a minor change that does break compatibility
    - increase the first number only for major changes *)
let version_number : string = "1.0.0"

let version_handler : Dream.handler = fun _ ->
    Dream.respond ~status:`OK version_number

module WebSocketMessage = struct
    open Utils

    type message_type = ChatSend
        [@@deriving yojson]

    type t = {
        message_type: message_type [@key "type"];
        id: string; (** The id of the game *)
        data: JSON.t;
    }
    [@@deriving yojson]

end

module WebSocketServer = struct

    (* TODO:
       - have a map of chats (which will eventually be stored in a db)
       - when a client connects to chat, they send an get-recent message and get all recent messages (currently, all)
       - when a client sends a message, it is added to the db and forwarded to all connected clients
    *)
    let clients : (int, Dream.websocket) Hashtbl.t = Hashtbl.create 5

    let track : Dream.websocket -> int =
        let last_client_id = ref 0 in
        fun websocket ->
            last_client_id := !last_client_id + 1;
            Hashtbl.replace clients !last_client_id websocket;
            !last_client_id

    let forget = fun (client_id : int) : unit ->
        Hashtbl.remove clients client_id

    let handle_message = fun (message : WebSocketMessage.t) : unit ->
        match message.message_type with
        | ChatSend ->
            Chat.store_message


    let handle : Dream.handler = fun request ->
        Dream.log "%s" (Dream.all_headers request |> List.map (fun (x, y) -> x ^ y) |> String.concat ", ");
        Dream.websocket (fun ws ->
            let rec loop = fun () ->
                let client_id = track ws in
                match%lwt Dream.receive ws with
                | Some message ->
                    let message = message |> Utils.JSON.from_string |> WebSocketMessage.of_yojson in
                    let%lwt () = handle_message message ws in
                    loop ()
                | None ->
                    (* Client left, forget about it *)
                    (* TODO: check that clients disconnect after a timeout, if not implement one *)
                    forget client_id;
                    Dream.close_websocket ws
            in
            loop ())
end

(** The actual backend server, dispatching to various endpoints *)
let start = fun () : unit ->
    let api = [
        Dream.scope "/" [TokenRefresher.middleware !Options.service_account_file; Auth.middleware]
        @@ List.concat [
            GameEndpoint.routes;
            ConfigRoomEndpoint.routes;
            [Dream.get "/time" ServerUtils.server_time];
            [Dream.get "/ws" WebSocketServer.handle];
        ];
    ] in
    Mirage_crypto_rng_lwt.initialize (module Mirage_crypto_rng.Fortuna); (* Required for token refresher and JWT *)
    Dream.initialize_log ~level:`Info ();
    Dream.run ~interface:!Options.address ~error_handler:ServerUtils.error_handler ~port:!Options.port
    @@ Dream.logger
    @@ Cors.middleware
    @@ Dream.router (List.concat [
        (Dream.get "/stats" Stats.summary) ::
        (Dream.get "/version" version_handler) ::
        api])
