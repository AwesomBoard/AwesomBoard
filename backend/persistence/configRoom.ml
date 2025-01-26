open Utils
open Caqti
open Helpers
open Models

module type CONFIG_ROOM = sig

    (** [create ~request config_room] creates a new config room and returns its
        id, in the context of [request] *)
    val create : request:Dream.request -> ConfigRoom.t -> int Lwt.t

    (** [get ~request ~game_id] retrieves the config room for game [game_id]. If
        it does not exist, returns [None]. *)
    val get : request:Dream.request -> game_id:int -> ConfigRoom.t option Lwt.t

    val delete : request:Dream.request -> game_id:int -> unit Lwt.t

    (** [iter_active_rooms ~request f] retrieve the currently active games,
        applying [f] to each of them (with the game id), in the context of
        [request] *)
    val iter_active_rooms : request:Dream.request -> (int -> ConfigRoom.t -> unit Lwt.t) -> unit Lwt.t

    (** [iter_candidates ~request ~game_id f] retrieves all candidates to game
        [game_id], applying [f] to each of them, in the context of [request] *)
    val iter_candidates : request:Dream.request -> game_id:int -> (MinimalUser.t -> unit Lwt.t) -> unit Lwt.t

    (** [add_candidate ~request ~game_id candidate] makes [candidate] join the
        game [game_id] by adding them to the candidates, in the context of
        [request]. *)
    val add_candidate : request:Dream.request -> game_id:int -> MinimalUser.t -> unit Lwt.t

    (** [remove_candidate ~request ~game_id candidate] removes candidate
        [candidate] from the game [game_id], in the context of [request]. *)
    val remove_candidate : request:Dream.request -> game_id:int -> MinimalUser.t -> unit Lwt.t

    (** [select_opponent ~request ~game_id opponent] selects candidate
        [opponent] as the chosen opponent for game [game_id], in the context of
        [request]. *)
    val select_opponent : request:Dream.request -> game_id:int -> MinimalUser.t -> unit Lwt.t

    (** [propose_config ~request ~game_id config] proposes the config [config] of
        [game_id] to the selected opponent, in the context of [request]. *)
    val propose_config : request:Dream.request -> game_id:int -> ConfigRoom.Proposal.t -> unit Lwt.t

    (** [accept ~request ~game_id] accepts the config of [game_id], in the context
        of [request]. *)
    val accept : request:Dream.request -> game_id:int -> unit Lwt.t

    (** [review ~request ~game_id] changes the config of [game_id] from proposed
        to in progress, in the context of [request]. *)
    val review : request:Dream.request -> game_id:int -> unit Lwt.t

    (** [finish ~request ~game_id] changes the config of [game_id] to
        "finished", in the context of [request]. *)
    val finish : request:Dream.request -> game_id:int -> unit Lwt.t
end

module ConfigRoomSQL : CONFIG_ROOM = struct

    let status : ConfigRoom.Status.t Caqti_type.t =
        json ConfigRoom.Status.to_yojson ConfigRoom.Status.of_yojson

    let first_player : ConfigRoom.FirstPlayer.t Caqti_type.t =
        json ConfigRoom.FirstPlayer.to_yojson ConfigRoom.FirstPlayer.of_yojson

    let game_type : ConfigRoom.GameType.t Caqti_type.t =
        json ConfigRoom.GameType.to_yojson ConfigRoom.GameType.of_yojson

    let config_room : ConfigRoom.t Caqti_type.t =
        let make = fun (creator_id : string)
                       (creator_name : string)
                       (creator_elo : float)
                       (chosen_opponent_id : string option)
                       (chosen_opponent_name : string option)
                       (status : ConfigRoom.Status.t)
                       (first_player : ConfigRoom.FirstPlayer.t)
                       (game_type : ConfigRoom.GameType.t)
                       (maximal_move_duration : int)
                       (total_part_duration : int)
                       (rules_config : string)
                       (game_name : string)
                       : ConfigRoom.t ->
            let chosen_opponent: MinimalUser.t option =
                match (chosen_opponent_id, chosen_opponent_name) with
                | Some id, Some name -> Some { id; name }
                | _, _ -> None in
            ConfigRoom.{
                creator = { id = creator_id; name = creator_name };
                creator_elo;
                chosen_opponent;
                status;
                first_player;
                game_type;
                maximal_move_duration;
                total_part_duration;
                rules_config = Utils.JSON.from_string rules_config;
                game_name;
            } in
        product make
            @@ proj string (fun (c : ConfigRoom.t) -> c.creator.id)
            @@ proj string (fun (c : ConfigRoom.t) -> c.creator.name)
            @@ proj float (fun (c : ConfigRoom.t) -> c.creator_elo)
            @@ proj (option string) (fun (c : ConfigRoom.t) -> Option.map (fun (u : MinimalUser.t) -> u.id) c.chosen_opponent)
            @@ proj (option string) (fun (c : ConfigRoom.t) -> Option.map (fun (u : MinimalUser.t) -> u.name) c.chosen_opponent)
            @@ proj status (fun (c : ConfigRoom.t) -> c.status)
            @@ proj first_player (fun (c : ConfigRoom.t) -> c.first_player)
            @@ proj game_type (fun (c : ConfigRoom.t) -> c.game_type)
            @@ proj int (fun (c : ConfigRoom.t) -> c.maximal_move_duration)
            @@ proj int (fun (c : ConfigRoom.t) -> c.total_part_duration)
            @@ proj string (fun (c : ConfigRoom.t) -> c.rules_config |> Utils.JSON.to_string)
            @@ proj string (fun (c : ConfigRoom.t) -> c.game_name)
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

    let create = fun ~(request : Dream.request) (config_room : ConfigRoom.t) : int Lwt.t ->
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

    let get = fun ~(request : Dream.request) ~(game_id : int) : ConfigRoom.t option Lwt.t ->
        Dream.sql request @@ fun (module Db : DB) -> check @@
        Db.find_opt get_query game_id

    let delete_config_room_query = int ->. unit @@ {|
        DELETE FROM config_rooms
        WHERE id = ?
    |}

    let delete_candidates_query = int ->. unit @@ {|
        DELETE FROM candidates
        WHERE game_id = ?
    |}

    let delete = fun ~(request : Dream.request) ~(game_id : int) : unit Lwt.t ->
        Dream.sql request @@ fun (module Db : DB) -> check @@
        Db.with_transaction (fun () ->
            (* Need to delete candidates first to ensure foreign key constraints (candidates refer to config room's id) *)
            match%lwt Db.exec delete_candidates_query game_id with
            | Result.Ok () -> Db.exec delete_config_room_query game_id
            | Result.Error e -> Lwt.return (Result.Error e))

    let get_active_rooms_query = unit ->* t2 int config_room @@ {|
        SELECT id, creator_id, creator_name, creator_elo,
               chosen_opponent_id, chosen_opponent_name,
               status, first_player, game_type,
               move_duration, game_duration,
               config, game_name
        FROM config_rooms
        WHERE status != 'Finished'

    |}

    let iter_active_rooms = fun ~(request : Dream.request) (f : int -> ConfigRoom.t -> unit Lwt.t) : unit Lwt.t ->
        Dream.sql request @@ fun (module Db : DB) -> check @@
        Db.iter_s get_active_rooms_query (fun (game_id, config_room) ->
            Lwt.map Result.ok (f game_id config_room)) ()

    let get_candidates_query = int ->* MinimalUserSql.t @@ {|
        SELECT candidate_id, candidate_name
        FROM candidates
        WHERE id = ?
    |}

    let iter_candidates = fun ~(request : Dream.request) ~(game_id : int) (f : MinimalUser.t -> unit Lwt.t) : unit Lwt.t ->
        Dream.sql request @@ fun (module Db : DB) -> check @@
        Db.iter_s get_candidates_query (fun candidate ->
            let+ result = f candidate in Result.Ok result) game_id

    let add_candidate_query = t3 int string string ->. unit @@ {|
        INSERT OR IGNORE INTO candidates (game_id, candidate_id, candidate_name)
        VALUES (?, ?, ?)
    |}

    let add_candidate = fun ~(request : Dream.request) ~(game_id : int) (candidate : MinimalUser.t) : unit Lwt.t ->
        Dream.sql request @@ fun (module Db : DB) -> check @@
        begin
            Dream.log "adding candidate %d:%s:%s" game_id candidate.id candidate.name;
            Db.exec add_candidate_query (game_id, candidate.id, candidate.name)
        end

    let remove_candidate_query = t2 int string ->. unit @@ {|
        DELETE FROM candidates
        WHERE id = ? AND candidate_id = ?
    |}

    let remove_candidate = fun ~(request : Dream.request) ~(game_id : int) (candidate : MinimalUser.t) : unit Lwt.t ->
        Dream.sql request @@ fun (module Db : DB) -> check @@
        Db.exec remove_candidate_query (game_id, candidate.id)

    let select_opponent_query = t3 string string int ->. unit @@ {|
        UPDATE config_rooms
        SET chosen_opponent_id = ?, chosen_opponent_name = ?
        WHERE id = ?
    |}

    let select_opponent = fun ~(request : Dream.request) ~(game_id : int) (opponent : MinimalUser.t) : unit Lwt.t ->
        Dream.sql request @@ fun (module Db : DB) -> check @@
        Db.exec select_opponent_query (opponent.id, opponent.name, game_id)

    let propose_config_query = t7 status game_type int int first_player string int ->. unit @@ {|
        UPDATE config_rooms
        SET status = ?, game_type = ?, move_duration = ?, game_duration = ?, first_player = ?, config = ?
        WHERE id = ?
    |}

    let propose_config = fun ~(request : Dream.request) ~(game_id : int) (proposal : ConfigRoom.Proposal.t) : unit Lwt.t ->
        Dream.sql request @@ fun (module Db : DB) -> check @@
        Db.exec propose_config_query (ConfigRoom.Status.ConfigProposed,
                                      proposal.game_type,
                                      proposal.maximal_move_duration,
                                      proposal.total_part_duration,
                                      proposal.first_player,
                                      JSON.to_string proposal.rules_config,
                                      game_id)

    let change_status_query = t2 status int ->. unit @@ {|
        UPDATE config_rooms
        SET status = ?
        WHERE id = ?
    |}

    let change_status_to = fun (status : ConfigRoom.Status.t) ->
        fun ~(request : Dream.request) ~(game_id : int) : unit Lwt.t ->
            Dream.sql request @@ fun (module Db : DB) -> check @@
            begin
                Dream.log "changing status to %s" (JSON.to_string (ConfigRoom.Status.to_yojson status));
                Db.exec change_status_query (status, game_id)
            end

    let accept = change_status_to ConfigRoom.Status.Started

    let review = change_status_to ConfigRoom.Status.Created

    let finish = change_status_to ConfigRoom.Status.Finished
end
