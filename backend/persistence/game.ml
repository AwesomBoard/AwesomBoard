module type GAME = sig

    val get : request:Dream.request -> game_id:int -> Models.Game.t Lwt.t

    val iter_events : request:Dream.request -> game_id:int -> (Models.GameEvent.t -> unit Lwt.t) -> unit Lwt.t

end

module GameSql : GAME = struct

    let get = fun ~(request : Dream.request) ~(game_id : int) : Models.Game.t Lwt.t ->
        ignore request; ignore game_id;
        failwith "TODO"

    let iter_events = fun ~(request : Dream.request) ~(game_id : int) (f : Models.GameEvent.t -> unit Lwt.t) : unit Lwt.t ->
        ignore request; ignore game_id; ignore f;
        failwith "TODO"

end
