open Utils
open Caqti
open Helpers
open Models

module type GAME = sig

    val create : request:Dream.request -> game_id:int -> Models.Game.t -> unit Lwt.t

    val get : request:Dream.request -> game_id:int -> Models.Game.t option Lwt.t

    val iter_events : request:Dream.request -> game_id:int -> (Models.GameEvent.t -> unit Lwt.t) -> unit Lwt.t

end

module GameSql : GAME = struct

    let result : Game.Result.t Caqti_type.t =
        json Game.Result.to_yojson Game.Result.of_yojson

    let game : Game.t Caqti_type.t =
        let make = fun (game_name : string)
                       (player_zero : MinimalUser.t)
                       (player_one : MinimalUser.t)
                       (result : Game.Result.t)
                       (beginning : int)
                       : Game.t ->
                       { game_name; player_zero; player_one; result; beginning} in
        product make
        @@ proj string (fun (g : Game.t) -> g.game_name)
        @@ proj MinimalUserSql.t (fun (g : Game.t) -> g.player_zero)
        @@ proj MinimalUserSql.t (fun (g : Game.t) -> g.player_one)
        @@ proj result (fun (g : Game.t) -> g.result)
        @@ proj int (fun (g : Game.t) -> g.beginning)
        @@ proj_end

    let event_data : GameEvent.EventData.t Caqti_type.t =
        json GameEvent.EventData.to_yojson GameEvent.EventData.of_yojson


    let event : GameEvent.t Caqti_type.t =
        let make = fun (time : int)
                       (user : MinimalUser.t)
                       (data : GameEvent.EventData.t)
                       : GameEvent.t ->
                       { time; user; data } in
        product make
        @@ proj int (fun (e : GameEvent.t) -> e.time)
        @@ proj MinimalUserSql.t (fun (e : GameEvent.t) -> e.user)
        @@ proj event_data (fun (e : GameEvent.t) -> e.data)
        @@ proj_end

    let create_query = t2 int game ->. unit @@ {|
        INSERT INTO games(id, game_name, player_zero_id, player_zero_name,
                          player_one_id, player_one_name, result, beginning)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    |}

    let create = fun ~(request : Dream.request) ~(game_id : int) (game : Game.t) : unit Lwt.t ->
        Dream.sql request @@ fun (module Db : DB) -> check @@
        Db.exec create_query (game_id, game)

    let get_query = int ->? game @@ {|
        SELECT (game_name, player_zero_id, player_zero_name, player_one_id, player_one_name, result, beginning)
        FROM games
        WHERE id = ?
    |}

    let get = fun ~(request : Dream.request) ~(game_id : int) : Game.t option Lwt.t ->
        Dream.sql request @@ fun (module Db : DB) -> check @@
        Db.find_opt get_query game_id

    let get_events_query = int ->* event @@ {|
        SELECT (time, user, data)
        FROM game_events
        WHERE game_id = ?
    |}

    let iter_events = fun ~(request : Dream.request) ~(game_id : int) (f : GameEvent.t -> unit Lwt.t) : unit Lwt.t ->
        Dream.sql request @@ fun (module Db : DB) -> check @@
        Db.iter_s get_events_query (fun event ->
            Lwt.map Result.ok (f event)) game_id

end
