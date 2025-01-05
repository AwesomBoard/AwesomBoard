module External = Utils.External.Impl
module ServerUtils = ServerUtils.Make(External)
module Stats = Firestore.Stats.Impl
module GoogleCertificates = Firestore.GoogleCertificates.Make(External)
module Jwt = Firestore.Jwt.Make(External)
module TokenRefresher = Firestore.TokenRefresher.Make(External)(Jwt)
module FirestoreOps = Firestore.FirestoreOps.Make(Firestore.FirestorePrimitives.Make(External)(TokenRefresher)(Stats))
module Auth = Firestore.Auth.Make(FirestoreOps)(GoogleCertificates)(Stats)(Jwt)
module Chat = Persistence.Chat.ChatSQL
module ConfigRoom = Persistence.ConfigRoom.ConfigRoomSQL
module WebSocketServer = WebSocket.WebSocketServer.Make(Auth)(External)(Chat)(ConfigRoom)(Stats)

(** The version number of this server. Used to avoid redeploying when there are no changes.
    If a redeployment is needed, just change the version number. Any difference will trigger redeployment.
    When finalizing a change, make sure to increase the number using semantic versioning:
    - increase the last number if it is a minor change that doesn't break compatibility
    - increase the second number if it is a minor change that does break compatibility
    - increase the first number only for major changes *)
let version_number : string = "1.0.0"

let version_handler : Dream.handler = fun _ ->
    Dream.respond ~status:`OK version_number

(** The actual backend server, dispatching to various endpoints *)
let start = fun () : unit ->
    let api = [
        Dream.scope "/" [TokenRefresher.middleware !Options.service_account_file !Options.emulator; Auth.middleware !Options.project_id]
        @@ List.concat [
            [Dream.get "/time" ServerUtils.server_time];
            [Dream.get "/ws" WebSocketServer.handle];
        ];
    ] in
    Mirage_crypto_rng_lwt.initialize (module Mirage_crypto_rng.Fortuna); (* Required for token refresher and JWT *)
    Dream.initialize_log ~level:`Info ();
    Dream.run
        ~interface:!Options.address
        ~error_handler:ServerUtils.error_handler
        ~port:!Options.port
    (* ~tls:true ~certificate_file:"localhost.crt" ~key_file:"localhost.key" *)
    @@ Dream.sql_pool "sqlite3:everyboard.db"
    @@ Dream.logger
    @@ Cors.middleware !Options.frontend_origin
    @@ Dream.router (List.concat [
        (Dream.get "/stats" Stats.summary) ::
        (Dream.get "/version" version_handler) ::
        api])
