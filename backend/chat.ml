open Utils

module type CHAT = sig
    (** [add_message game_id message] adds [message] to the chat of game [game_id] *)
    val add_message : string -> Domain.Message.t -> unit Lwt.t

    (** [iter_messages game_id f] iterates over all messages of the chat [game_id] by applying [f] to each element. *)
    val iter_messages : string -> (Domain.Message.t -> unit Lwt.t) -> unit Lwt.t
end

module ChatInMemory : CHAT = struct

    (* The in-memory DB *)
    let messages : (string, Domain.Message.t list) Hashtbl.t = Hashtbl.create 5

    let add_message = fun (game_id : string) (message : Domain.Message.t) : unit Lwt.t ->
        let old_messages = match Hashtbl.find_opt messages game_id with
            | Some messages -> messages
            | None -> [] in
        let new_messages = message :: old_messages in
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

module ChatSQLite(Db : Utils.DB) : CHAT = struct

    (* We will use Caqti's DSL to manage our DB. This explains some strange elements of the language used below.
       For the readers unfamiliar with Caqti, you can simply focus on the SQL code. The rest is just glue code. *)
    open Caqti_type.Std
    open Caqti_request.Infix

    let message =
        let make = fun (sender_id : string)
                       (sender_name : string)
                       (timestamp : int)
                       (content : string)
                       : Domain.Message.t ->
            Domain.Message.{
                sender = { id = sender_id; name = sender_name };
                timestamp;
                content;
            } in
        product make
            @@ proj string (fun (msg : Domain.Message.t) -> msg.sender.id)
            @@ proj string (fun (msg : Domain.Message.t) -> msg.sender.name)
            @@ proj int (fun (msg : Domain.Message.t) -> msg.timestamp)
            @@ proj string (fun (msg : Domain.Message.t) -> msg.content)
            @@ proj_end


    let add_message_query = t2 string message ->. unit @@ {|
        INSERT INTO messages (game_id, author_id, author_name, timestamp, content)
        VALUES (?, ?, ?, ?, ?)
    |}

    let add_message = fun (game_id : string)
                          (message : Domain.Message.t)
                          : unit Lwt.t ->
        check @@
        Db.exec add_message_query (game_id, message)

    let get_messages_query = string ->* message @@ {|
        SELECT author_id, author_name, timestamp, content FROM messages
        WHERE game_id = ?|}

    let iter_messages = fun (game_id : string)
                            (f : Domain.Message.t -> unit Lwt.t)
                            : unit Lwt.t ->
        check @@
        Db.iter_s get_messages_query (fun m -> let%lwt () = f m in Lwt.return (Result.Ok ())) game_id

end
