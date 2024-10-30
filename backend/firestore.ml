open Utils

(** A getter takes a contextual request and an id. It returns the document if found, and raises an error otherwise *)
type 'a getter = request:Dream.request -> id:string -> 'a Lwt.t
(** An updater takes a contextual request, an id, and a document update. It updates the corresponding document *)
type updater = request:Dream.request -> id:string -> update:JSON.t -> unit Lwt.t
(** A deleter takes a contextual request and an id. It deletes the corresponding document *)
type deleter = request:Dream.request -> id:string -> unit Lwt.t

(** This is the high-level firestore operations for the various data types *)
module type FIRESTORE = sig

    module User : sig
        (** Retrieve an user from its id *)
        val get : Domain.User.t getter
        (** Retrieve the elo (if present) of an user and a certain game, return [Domain.User.EloInfo.empty] if absent *)
        val get_elo : request:Dream.request -> user_id:string -> type_game:string -> Domain.User.EloInfo.t Lwt.t
        (** Update the elo of the document for an user and a certain game *)
        val update_elo : request:Dream.request -> user_id:string -> type_game:string -> new_elo:Domain.User.EloInfo.t -> unit Lwt.t
    end

    module Game : sig
        (** Retrieve a full game, from its id *)
        val get : Domain.Game.t getter

        (** Get the name of a game if the game exists.
            @raise [DocumentNotFound _] if it does not exist.
            @raise [DocumentInvalid _] if it exist but is invalid *)
        val get_name : string getter

        (** Create a game *)
        val create : request:Dream.request -> game:Domain.Game.t -> string Lwt.t

        (** Delete a game *)
        val delete : deleter

        (** Update the game with partial modifications *)
        val update : updater

        (** Add a game event to a game*)
        val add_event : request:Dream.request -> id:string -> event:Domain.GameEvent.t -> unit Lwt.t

    end

    module ConfigRoom : sig
        (** Retrieve a config room as a JSON document, from its id *)
        val get : Domain.ConfigRoom.t getter

        (** Create a config room, with a given id *)
        val create : request:Dream.request -> id:string -> config_room:Domain.ConfigRoom.t -> unit Lwt.t

        (** Delete a config room *)
        val delete : deleter

        (** Add a candidate to the config room *)
        val add_candidate : request:Dream.request -> id:string -> candidate:Domain.MinimalUser.t -> unit Lwt.t

        (** [remove_candidate request game_id candidate_id] removes candidate [candidate_id] from the config room [game_id] *)
        val remove_candidate : request:Dream.request -> id:string -> candidate_id:string -> unit Lwt.t

        (** Accept a proposed game configuration *)
        val accept : request:Dream.request -> id:string -> unit Lwt.t

        (** Update a config room *)
        val update : updater

    end

    module Chat : sig
        (** Create an initial chat root *)
        val create : request:Dream.request -> id:string -> unit Lwt.t

        (** Delete a chat *)
        val delete : deleter
    end

end

module Make (FirestorePrimitives : FirestorePrimitives.FIRESTORE_PRIMITIVES) : FIRESTORE = struct

    (* Generic version of get that retrieves a document at a given path *)
    let get = fun (request : Dream.request) (path : string) (of_yojson : JSON.t -> ('a, 'b) result) : 'a Lwt.t ->
        let get_or_fail doc (maybe_value : ('a, 'b) result)  : 'a =
            match maybe_value with
            | Ok value -> value
            | Error e -> raise (DocumentInvalid (Printf.sprintf "%s: %s - %s" path e (JSON.to_string doc))) in
        let* doc = FirestorePrimitives.get_doc ~request ~path in
        doc
        |> of_yojson
        |> get_or_fail doc
        |> Lwt.return

    module User = struct

        let get = fun ~(request : Dream.request) ~(id : string) : Domain.User.t Lwt.t ->
            get request ("users/" ^ id) Domain.User.of_yojson

        let update_elo = fun ~(request : Dream.request) ~(user_id : string) ~(type_game : string) ~(new_elo : Domain.User.EloInfo.t) : unit Lwt.t ->
            let update: JSON.t = Domain.User.EloInfo.to_yojson new_elo in
            FirestorePrimitives.update_doc ~request ~path:("users/" ^ user_id ^ "/elos/" ^ type_game) ~update

        let get_elo = fun ~(request : Dream.request) ~(user_id : string) ~(type_game : string) : Domain.User.EloInfo.t Lwt.t ->
            let* doc : JSON.t Option.t = FirestorePrimitives.try_get_doc ~request ~path:("users/" ^ user_id ^ "/elos/" ^ type_game) in
            match doc with
            | None -> Lwt.return Domain.User.EloInfo.empty
            | Some json ->
                begin match Domain.User.EloInfo.of_yojson json with
                    | Error _ -> raise (UnexpectedError (Printf.sprintf "Invalid EloInfo for %s/%s: %s" user_id type_game (JSON.to_string json)))
                    | Ok elo -> Lwt.return elo
                end

    end

    module Game = struct

        let get = fun ~(request : Dream.request) ~(id : string) : Domain.Game.t Lwt.t ->
            get request ("parts/" ^ id) Domain.Game.of_yojson

        let get_name = fun ~(request : Dream.request) ~(id : string) : string Lwt.t ->
            try
                let* doc = FirestorePrimitives.get_doc ~request ~path:("parts/" ^ id ^ "?mask.fieldPaths=typeGame") in
                let open JSON.Util in
                doc
                |> member "typeGame"
                |> to_string
                |> Lwt.return
            with JSON.Util.Type_error (_, _) ->
                raise (DocumentInvalid (Printf.sprintf "parts/%s" id))

        let create = fun ~(request : Dream.request) ~(game : Domain.Game.t) : string Lwt.t ->
            let json : JSON.t = Domain.Game.to_yojson game in
            FirestorePrimitives.create_doc ~request ~collection:"parts" ~doc:json

        let delete = fun ~(request : Dream.request) ~(id : string) : unit Lwt.t ->
            FirestorePrimitives.delete_doc ~request ~path:("parts/" ^ id)

        let update = fun ~(request : Dream.request) ~(id : string) ~(update : JSON.t) : unit Lwt.t ->
            FirestorePrimitives.update_doc ~request ~path:("parts/" ^ id) ~update

        let add_event = fun ~(request : Dream.request) ~(id : string) ~(event : Domain.GameEvent.t) : unit Lwt.t ->
            let json = Domain.GameEvent.to_yojson event in
            let* _ = FirestorePrimitives.create_doc ~request ~collection:("parts/" ^ id ^ "/events") ~doc:json in
            Lwt.return ()
    end

    module ConfigRoom = struct

        let get = fun ~(request : Dream.request) ~(id : string) : Domain.ConfigRoom.t Lwt.t ->
            get request ("config-room/" ^ id) Domain.ConfigRoom.of_yojson

        let create = fun ~(request : Dream.request) ~(id : string) ~(config_room : Domain.ConfigRoom.t) : unit Lwt.t ->
            let json = Domain.ConfigRoom.to_yojson config_room in
            let* _ = FirestorePrimitives.set_doc ~request ~collection:"config-room" ~id ~doc:json in
            Lwt.return ()

        let delete = fun ~(request : Dream.request) ~(id : string) : unit Lwt.t ->
            FirestorePrimitives.delete_doc ~request ~path:("config-room/" ^ id)

        let add_candidate = fun ~(request : Dream.request) ~(id : string) ~(candidate : Domain.MinimalUser.t) : unit Lwt.t ->
            let candidate_json = Domain.MinimalUser.to_yojson candidate in
            let* _ = FirestorePrimitives.set_doc ~request ~collection:("config-room/" ^ id ^ "/candidates") ~id:candidate.id ~doc:candidate_json in
            Lwt.return ()

        let remove_candidate = fun ~(request : Dream.request) ~(id : string) ~(candidate_id : string) : unit Lwt.t ->
            FirestorePrimitives.delete_doc ~request ~path:("config-room/" ^ id ^ "/candidates/" ^ candidate_id)

        let update = fun ~(request : Dream.request) ~(id : string) ~(update : JSON.t) : unit Lwt.t ->
            FirestorePrimitives.update_doc ~request ~path:("config-room/" ^ id) ~update

        let accept = fun ~(request : Dream.request) ~(id : string) : unit Lwt.t ->
            update ~request ~id ~update:(`Assoc [("partStatus", Domain.ConfigRoom.GameStatus.(to_yojson Started))])
    end

    module Chat = struct

        let create = fun ~(request : Dream.request) ~(id : string) : unit Lwt.t ->
            let chat = `Assoc [] in (* chats are empty, messages are in a sub collection *)
            let* _ = FirestorePrimitives.set_doc ~request ~collection:"chats" ~id ~doc:chat in
            Lwt.return ()

        let delete = fun ~(request : Dream.request) ~(id : string) : unit Lwt.t ->
            FirestorePrimitives.delete_doc ~request ~path:("chats/" ^ id)
    end

end
