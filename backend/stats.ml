open Utils
open Domain

(** This module is used for telemetry: we record the number of reads/writes per endpoint.
    It will make it easier with this information to know which endpoints should be optimized *)
module type STATS = sig
    (** [set_action request action] remembers which action we are doing in this request in order to track reads and writes *)
    val set_action : Dream.request -> string -> unit

    (** [set_user request user] remembers which user is doing something in in this request order to track reads and writes *)
    val set_user : Dream.request -> MinimalUser.t -> unit

    (** [set_game_id request game_id] remembers on which game we are doing the request *)
    val set_game_id : Dream.request -> string -> unit

    (** [read request] records a read operation *)
    val read : Dream.request -> unit

    (** [write request] records a write operation *)
    val write : Dream.request -> unit

    (** [new_game] records the creation of a new game *)
    val new_game : unit -> unit

    (** [end_game] records the end of a game *)
    val end_game : unit -> unit

    (** [new_move] records a move *)
    val new_move : unit -> unit

    (** Endpoint to access the statistics *)
    val summary : Dream.handler
end

module Impl : STATS = struct
    let action_field : string Dream.field =
        Dream.new_field ~name:"action" ()

    let set_action = fun (request : Dream.request) (action : string) : unit ->
        Dream.set_field request action_field action

    let user_field : MinimalUser.t Dream.field =
        Dream.new_field ~name:"user" ()

    let set_user  = fun (request : Dream.request) (user : MinimalUser.t) : unit ->
        Dream.set_field request user_field user

    let game_id_field : string Dream.field =
        Dream.new_field ~name:"game_id" ()

    let set_game_id = fun (request : Dream.request) (game_id : string) : unit ->
        Dream.set_field request game_id_field game_id

    type rw_info = {
        reads : int;
        writes : int;
    }
    [@@deriving to_yojson]

    let add_read = fun (rw : rw_info) : rw_info ->
        { rw with reads = rw.reads + 1 }

    let add_write = fun (rw : rw_info) : rw_info ->
        { rw with writes = rw.writes + 1 }

    type t = {
        total : rw_info ref;
        per_action : (string, rw_info) Hashtbl.t;
        per_user : (string, rw_info) Hashtbl.t;
        per_game : (string, rw_info) Hashtbl.t;
        games_started : int ref;
        games_ended : int ref;
        moves : int ref;
    }

    let to_yojson = fun (stats : t) : JSON.t ->
        let hashtbl_to_yojson = fun (h : ('a, rw_info) Hashtbl.t) : JSON.t ->
            `Assoc (List.map (fun (k, v) -> (k, rw_info_to_yojson v)) (List.of_seq (Hashtbl.to_seq h))) in
        `Assoc [
            "total", rw_info_to_yojson !(stats.total);
            "per_action", hashtbl_to_yojson stats.per_action;
            "per_user", hashtbl_to_yojson stats.per_user;
            "per_game", hashtbl_to_yojson stats.per_game;
            "games", `Assoc [
                "started", `Int !(stats.games_started);
                "ended", `Int !(stats.games_ended);
                "moves", `Int !(stats.moves);
            ]
        ]

    let update_hashtbl = fun (h : (string, rw_info) Hashtbl.t) (key : string) (update : rw_info -> rw_info) : unit ->
        let new_value = match Hashtbl.find_opt h key with
            | None -> update { reads = 0; writes = 0 }
            | Some rw -> update rw in
        Hashtbl.replace h key new_value

    let state : t = {
        total = ref { reads = 0; writes = 0 };
        per_action = Hashtbl.create 100;
        per_user = Hashtbl.create 100;
        per_game = Hashtbl.create 100;
        games_started = ref 0;
        games_ended = ref 0;
        moves = ref 0;
    }

    let get_field = fun (request : Dream.request) (field : 'a Dream.field) (default : 'a) : 'a ->
        Dream.field request field
        |> Option.value ~default

    let no_user : MinimalUser.t = {
        id = "none";
        name = "none";
    }

    let update = fun (update : rw_info -> rw_info) (request : Dream.request) : unit ->
        let action = get_field request action_field "none" in
        let user = get_field request user_field no_user in
        let game_id : string = get_field request game_id_field "none" in
        state.total := update !(state.total);
        update_hashtbl state.per_action action update;
        update_hashtbl state.per_user user.id update;
        update_hashtbl state.per_game game_id update

    let read = update add_read

    let write = update add_write

    let new_game = fun (_ : unit) : unit ->
        state.games_started := !(state.games_started) + 1

    let end_game = fun (_ : unit) : unit ->
        state.games_ended := !(state.games_ended) + 1

    let new_move = fun (_ : unit) : unit ->
        state.moves := !(state.moves) + 1

    let summary : Dream.handler = fun _ ->
        Dream.json ~status:`OK (JSON.to_string (to_yojson state))

end
