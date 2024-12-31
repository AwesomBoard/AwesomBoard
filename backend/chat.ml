open Utils

module type CHAT = sig
    (** [add_message author game_id message] adds [message] to the chat of game [game_id], at the current timestamp *)
    val add_message : Domain.MinimalUser.t -> string -> string -> unit Lwt.t

    (** [iter_messages game_id f] iterates over all messages of the chat [game_id] by applying [f] to each element. *)
    val iter_messages : string -> (Domain.Message.t -> unit Lwt.t) -> unit Lwt.t

    (** [init ()] creates the chat table in our database if needed *)
    val init : unit -> unit Lwt.t
end

module ChatInMemory(External : External.EXTERNAL) : CHAT = struct

    (* The in-memory DB *)
    let messages : (string, Domain.Message.t list) Hashtbl.t = Hashtbl.create 5

    let init = fun () : unit Lwt.t ->
        Lwt.return ()

    let add_message = fun (user : Domain.MinimalUser.t) (game_id : string) (message : string) : unit Lwt.t ->
        let old_messages = match Hashtbl.find_opt messages game_id with
            | Some messages -> messages
            | None -> [] in
        let new_messages = Domain.Message.{ author = user; timestamp = External.now (); content = message } :: old_messages in
        Hashtbl.replace messages game_id new_messages;
        Lwt.return ()

    let iter_messages = fun (game_id : string) (f : Domain.Message.t -> unit Lwt.t) : unit Lwt.t ->
        let messages = match Hashtbl.find_opt messages game_id with
            | Some messages -> messages
            | None -> [] in
        Lwt.join (List.map f messages)
end

let check = fun (result : ('a, Caqti_error.t) Result.t Lwt.t) : 'a Lwt.t ->
    match%lwt result with
    | Result.Ok r -> Lwt.return r
    | Result.Error e ->
        raise (UnexpectedError (Printf.sprintf "db failure: %s" (Caqti_error.show e)))

module DBManager = struct
  let db = ref None

  let init = fun () : unit Lwt.t ->
      match%lwt Caqti_lwt_unix.connect (Uri.of_string "sqlite3:everyboard.db") with
      | Result.Ok created_db ->
          db := Some created_db;
          Lwt.return ()
      | Result.Error e ->
          raise (UnexpectedError (Printf.sprintf "could not create db: %s" (Caqti_error.show e)))
end

module ChatSQLite(External : External.EXTERNAL)(Db : Caqti_lwt.CONNECTION) : CHAT = struct

    (* We will use Caqti's DSL to manage our DB. This explains some strange elements of the language used below.
       For the readers unfamiliar with Caqti, you can simply focus on the SQL code. The rest is just glue code. *)
    open Caqti_type.Std
    open Caqti_request.Infix

    (* We set an index on game_id, as our queries will only look at messages from one game at a time *)
    let create_db_query = unit ->. unit @@ {|
        CREATE TABLE IF NOT EXISTS messages (
            message_id INTEGER PRIMARY KEY AUTOINCREMENT,
            game_id TEXT NOT NULL,
            author_id TEXT NOT NULL,
            author_name TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            content TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_game_id ON messages (game_id);
    |}

    (* Initialization code to create the chat table in our database *)
    let init = fun () : unit Lwt.t ->
        check @@
        Db.exec create_db_query ()

    let add_message_query = t5 string string string int string ->. unit @@ {|
        INSERT INTO MESSAGES (game_id, author_id, author_name, timestamp, content)
        VALUES (?, ?, ?, ?, ?)
    |}

    let add_message = fun (user : Domain.MinimalUser.t) (game_id : string) (content : string) : unit Lwt.t ->
        check @@
        Db.exec add_message_query (game_id, user.id, user.name, External.now (), content)

    let message =
        let make = fun (author_id : string)
                       (author_name : string)
                       (timestamp : int)
                       (content : string)
                       : Domain.Message.t ->
            Domain.Message.{
                author = { id = author_id; name = author_name };
                timestamp;
                content;
            } in
        product make
            @@ proj string (fun (msg : Domain.Message.t) -> msg.author.id)
            @@ proj string (fun (msg : Domain.Message.t) -> msg.author.name)
            @@ proj int (fun (msg : Domain.Message.t) -> msg.timestamp)
            @@ proj string (fun (msg : Domain.Message.t) -> msg.content)
            @@ proj_end

    let get_messages_query = string ->* message @@ {|
        SELECT (game_id, author_id, author_name, timestamp, content) FROM MESSAGES
        WHERE game_id = ?
    |}

    let iter_messages = fun (game_id : string) (f : Domain.Message.t -> unit Lwt.t) : unit Lwt.t ->
        check @@
        Db.iter_s get_messages_query (fun m -> let%lwt () = f m in Lwt.return (Result.Ok ())) game_id

end
