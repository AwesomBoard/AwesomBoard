open Utils

module type CONFIG_ROOM = sig

    (** [create ~request config_room] creates a new config room and returns its
        id, in the context of [request] *)
    val create : request:Dream.request -> Models.ConfigRoom.t -> int Lwt.t

    (** [get ~request ~game_id] retrieves the config room for game [game_id]. If
        it does not exist, returns [None]. *)
    val get : request:Dream.request -> game_id:int -> Models.ConfigRoom.t option Lwt.t

    (** [get_game_name ~request ~game_id] retrieves the name of game [game_id],
        in the context of [request]. Returns [None] if the game does not exist. *)
    val get_game_name : request:Dream.request -> game_id:int -> string option Lwt.t

    (** [add_candidate ~request ~game_id candidate] makes [candidate] join the
        game [game_id] by adding them to the candidates, in the context of
        [request]. *)
    val add_candidate : request:Dream.request -> game_id:int -> Models.MinimalUser.t -> unit Lwt.t

    (** [remove_candidate ~request ~game_id candidate] removes candidate
        [candidate] from the game [game_id], in the context of [request]. *)
    val remove_candidate : request:Dream.request -> game_id:int -> Models.MinimalUser.t -> unit Lwt.t

    (** [select_opponent ~request ~game_id opponent] selects candidate
        [opponent] as the chosen opponent for game [game_id], in the context of
        [request]. *)
    val select_opponent : request:Dream.request -> game_id:int -> Models.MinimalUser.t -> unit Lwt.t

    (** [propose_config ~request ~game_id config] proposes the config [config] of
        [game_id] to the selected opponent, in the context of [request]. *)
    val propose_config : request:Dream.request -> game_id:int -> Models.ConfigRoom.Proposal.t -> unit Lwt.t

    (** [accept ~request ~game_id] accepts the config of [game_id], in the context
        of [request]. *)
    val accept : request:Dream.request -> game_id:int -> unit Lwt.t

    (** [review ~request ~game_id] changes the config of [game_id] from proposed
        to in progress, in the context of [request]. *)
    val review : request:Dream.request -> game_id:int -> unit Lwt.t (* is change_status to config, simply? *)

    (** [review_and_remove_opponent ~request ~game_id] is like [review ~request
        ~game_id], but also clears the chosen opponent, in the context of
        [request]. *)
    val review_and_remove_opponent : request:Dream.request -> game_id:int -> unit Lwt.t

end

module ConfigRoomSQL : CONFIG_ROOM = struct

    open Caqti

    let game_status : Models.ConfigRoom.GameStatus.t Caqti_type.t =
        json Models.ConfigRoom.GameStatus.to_yojson Models.ConfigRoom.GameStatus.of_yojson

    let first_player : Models.ConfigRoom.FirstPlayer.t Caqti_type.t =
        json Models.ConfigRoom.FirstPlayer.to_yojson Models.ConfigRoom.FirstPlayer.of_yojson

    let game_type : Models.ConfigRoom.GameType.t Caqti_type.t =
        json Models.ConfigRoom.GameType.to_yojson Models.ConfigRoom.GameType.of_yojson

    let config_room : Models.ConfigRoom.t Caqti_type.t =
        let make = fun (creator_id : string)
                       (creator_name : string)
                       (creator_elo : float)
                       (chosen_opponent_id : string option)
                       (chosen_opponent_name : string option)
                       (game_status : Models.ConfigRoom.GameStatus.t)
                       (first_player : Models.ConfigRoom.FirstPlayer.t)
                       (game_type : Models.ConfigRoom.GameType.t)
                       (maximal_move_duration : int)
                       (total_part_duration : int)
                       (rules_config : string)
                       (game_name : string)
                       : Models.ConfigRoom.t ->
            let chosen_opponent: Models.MinimalUser.t option =
                match (chosen_opponent_id, chosen_opponent_name) with
                | Some id, Some name -> Some { id; name }
                | _, _ -> None in
            Models.ConfigRoom.{
                creator = { id = creator_id; name = creator_name };
                creator_elo;
                chosen_opponent;
                game_status;
                first_player;
                game_type;
                maximal_move_duration;
                total_part_duration;
                rules_config = Utils.JSON.from_string rules_config;
                game_name;
            } in
        product make
            @@ proj string (fun (c : Models.ConfigRoom.t) -> c.creator.id)
            @@ proj string (fun (c : Models.ConfigRoom.t) -> c.creator.name)
            @@ proj float (fun (c : Models.ConfigRoom.t) -> c.creator_elo)
            @@ proj (option string) (fun (c : Models.ConfigRoom.t) -> Option.map (fun (u : Models.MinimalUser.t) -> u.id) c.chosen_opponent)
            @@ proj (option string) (fun (c : Models.ConfigRoom.t) -> Option.map (fun (u : Models.MinimalUser.t) -> u.name) c.chosen_opponent)
            @@ proj game_status (fun (c : Models.ConfigRoom.t) -> c.game_status)
            @@ proj first_player (fun (c : Models.ConfigRoom.t) -> c.first_player)
            @@ proj game_type (fun (c : Models.ConfigRoom.t) -> c.game_type)
            @@ proj int (fun (c : Models.ConfigRoom.t) -> c.maximal_move_duration)
            @@ proj int (fun (c : Models.ConfigRoom.t) -> c.total_part_duration)
            @@ proj string (fun (c : Models.ConfigRoom.t) -> c.rules_config |> Utils.JSON.to_string)
            @@ proj string (fun (c : Models.ConfigRoom.t) -> c.game_name)
            @@ proj_end

    let create_query = config_room ->. unit @@ {|
        INSERT INTO config_rooms(creator_id, creator_name, creator_elo,
                                 chosen_opponent_id, chosen_opponent_name,
                                 status, first_player, game_type,
                                 move_duration, game_duration,
                                 config, game_name)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    |}

    let get_last_inserted_id = unit ->! int @@ {|
        SELECT last_insert_rowid()
    |}

    let create = fun ~(request : Dream.request) (config_room : Models.ConfigRoom.t) : int Lwt.t ->
        Dream.sql request @@ fun (module Db : DB) -> check @@
        Db.with_transaction (fun () ->
            match%lwt  Db.exec create_query config_room with
            | Result.Ok () -> Db.find get_last_inserted_id ()
            | Result.Error e -> Lwt.return (Result.Error e))

    let get_query = int ->? config_room @@ {|
        SELECT creator_id, creator_name, creator_elo,
               chosen_opponent_id, chosen_opponent_name,
               status, first_player, game_type,
               move_duration, game_duration,
               config, game_name
        FROM config_rooms
        WHERE id = ?
    |}

    let get = fun ~(request : Dream.request) ~(game_id : int) : Models.ConfigRoom.t option Lwt.t ->
        Dream.sql request @@ fun (module Db : DB) -> check @@
        Db.find_opt get_query game_id

    let get_game_name_query = int ->? string @@ {|
        SELECT game_name
        FROM config_rooms
        WHERE id = ?
    |}

    let get_game_name = fun ~(request : Dream.request) ~(game_id : int) : string option Lwt.t ->
        Dream.sql request @@ fun (module Db : DB) -> check @@
        Db.find_opt get_game_name_query game_id

    let join_query = t3 int string string ->. unit @@ {|
        INSERT INTO candidates (game_id, candidate_id, candidate_name)
        VALUES (?, ?, ?)
    |}

    let add_candidate = fun ~(request : Dream.request) ~(game_id : int) (candidate : Models.MinimalUser.t) : unit Lwt.t ->
        Dream.sql request @@ fun (module Db : DB) -> check @@
        Db.exec join_query (game_id, candidate.id, candidate.name)

    let remove_candidate_query = t2 int string ->. unit @@ {|
        DELETE FROM candidates
        WHERE game_id = ? AND candidate_id = ?
    |}

    let remove_candidate = fun ~(request : Dream.request) ~(game_id : int) (candidate : Models.MinimalUser.t) : unit Lwt.t ->
        Dream.sql request @@ fun (module Db : DB) -> check @@
        Db.exec remove_candidate_query (game_id, candidate.id)

    let select_opponent_query = t3 string string int ->. unit @@ {|
        UPDATE games
        SET chosen_opponent_id = ?, chosen_opponent_name = ?
        WHERE game_id = ?
    |}

    let select_opponent = fun ~(request : Dream.request) ~(game_id : int) (opponent : Models.MinimalUser.t) : unit Lwt.t ->
        Dream.sql request @@ fun (module Db : DB) -> check @@
        Db.exec select_opponent_query (opponent.id, opponent.name, game_id)

    let propose_config_query = t7 game_status game_type int int first_player string int ->. unit @@ {|
        UPDATE games
        SET status = ?, game_type = ?, move_duration = ?, game_duration = ?, first_player = ?, config = ?
        WHERE id = ?;
    |}

    let propose_config = fun ~(request : Dream.request) ~(game_id : int) (proposal : Models.ConfigRoom.Proposal.t) : unit Lwt.t ->
        Dream.sql request @@ fun (module Db : DB) -> check @@
        Db.exec propose_config_query (Models.ConfigRoom.GameStatus.ConfigProposed,
                                      proposal.game_type,
                                      proposal.maximal_move_duration,
                                      proposal.total_part_duration,
                                      proposal.first_player,
                                      JSON.to_string proposal.rules_config,
                                      game_id)

    let change_status_query = t2 int game_status ->. unit @@ {|
        UPDATE games
        SET status = ?
        WHERE id = ?
    |}

    let change_status_to = fun (status : Models.ConfigRoom.GameStatus.t) ->
        fun ~(request : Dream.request) ~(game_id : int) : unit Lwt.t ->
            Dream.sql request @@ fun (module Db : DB) -> check @@
            Db.exec change_status_query (game_id, status)

    let accept = change_status_to Models.ConfigRoom.GameStatus.Started

    let review = change_status_to Models.ConfigRoom.GameStatus.Created

    let review_and_remove_opponent_query = t2 int game_status ->. unit @@ {|
        UPDATE games
        SET status = ?, chosen_opponent_id = '', chosen_opponent_name = ''
        WHERE id = ?
    |}

    let review_and_remove_opponent = fun ~(request : Dream.request) ~(game_id : int) : unit Lwt.t ->
        Dream.sql request @@ fun (module Db : DB) -> check @@
        Db.exec review_and_remove_opponent_query (game_id, Models.ConfigRoom.GameStatus.Created)
end
