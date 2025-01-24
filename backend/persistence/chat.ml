open Utils

module type CHAT = sig
    (** [add_message request game_id message] adds [message] to the chat of game
        [game_id], in the context of [request] *)
    val add_message : Dream.request -> int -> Models.Message.t -> unit Lwt.t

    (** [iter_messages request game_id f] iterates over all messages of the chat
        [game_id] by applying [f] to each element, in the context of
        [request]. *)
    val iter_messages : Dream.request -> int -> (Models.Message.t -> unit Lwt.t) -> unit Lwt.t
end

module ChatInMemory : CHAT = struct

    (* The in-memory DB *)
    let messages : (int, Models.Message.t list) Hashtbl.t = Hashtbl.create 5

    let add_message = fun (_request : Dream.request) (game_id : int) (message : Models.Message.t) : unit Lwt.t ->
        let old_messages = match Hashtbl.find_opt messages game_id with
            | Some messages -> messages
            | None -> [] in
        let new_messages = message :: old_messages in
        Hashtbl.replace messages game_id new_messages;
        Lwt.return ()

    let iter_messages = fun (_request : Dream.request) (game_id : int) (f : Models.Message.t -> unit Lwt.t) : unit Lwt.t ->
        let messages = match Hashtbl.find_opt messages game_id with
            | Some messages -> messages
            | None -> [] in
        Lwt.join (List.map f messages)
end

module ChatSQL : CHAT = struct

    open Utils.Caqti

    let message : Models.Message.t Caqti_type.t =
        let make = fun (sender_id : string)
                       (sender_name : string)
                       (timestamp : int)
                       (content : string)
                       : Models.Message.t ->
            Models.Message.{
                sender = { id = sender_id; name = sender_name };
                timestamp;
                content;
            } in
        product make
            @@ proj string (fun (msg : Models.Message.t) -> msg.sender.id)
            @@ proj string (fun (msg : Models.Message.t) -> msg.sender.name)
            @@ proj int (fun (msg : Models.Message.t) -> msg.timestamp)
            @@ proj string (fun (msg : Models.Message.t) -> msg.content)
            @@ proj_end

    let add_message_query = t2 int message ->. unit @@ {|
        INSERT INTO messages (game_id, author_id, author_name, timestamp, content)
        VALUES (?, ?, ?, ?, ?)
    |}

    let add_message = fun (request : Dream.request) (game_id : int) (message : Models.Message.t) : unit Lwt.t ->
        Dream.sql request @@ fun (module Db : DB) -> check @@
        Db.exec add_message_query (game_id, message)

    let get_messages_query = int ->* message @@ {|
        SELECT author_id, author_name, timestamp, content FROM messages
        WHERE game_id = ?
    |}

    let iter_messages = fun (request : Dream.request) (game_id : int) (f : Models.Message.t -> unit Lwt.t) : unit Lwt.t ->
        Dream.sql request @@ fun (module Db : DB) -> check @@
        Db.iter_s get_messages_query (fun message ->
            let+ r = f message in Result.ok r)
            game_id

end
