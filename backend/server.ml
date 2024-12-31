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

(** The actual backend server, dispatching to various endpoints *)
let start = fun () : unit ->
    let ws_handler = fun (request : Dream.request) ->
        (* Some module gymnastics is needed to get the db module propagated at the right place... sorry! *)
        Dream.sql request (fun (module Db : Utils.DB) ->
            let module Chat = Chat.ChatSQLite(Db) in
            let module WebSocketServer = WebSocketServer.Make(Auth)(External)(Chat) in
            WebSocketServer.handle request) in
    let api = [
        Dream.scope "/" [TokenRefresher.middleware !Options.service_account_file; Auth.middleware]
        @@ List.concat [
            GameEndpoint.routes;
            ConfigRoomEndpoint.routes;
            [Dream.get "/time" ServerUtils.server_time];
            [Dream.get "/ws" ws_handler];
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
    @@ Cors.middleware
    @@ Dream.router (List.concat [
        (Dream.get "/stats" Stats.summary) ::
        (Dream.get "/version" version_handler) ::
        api])
