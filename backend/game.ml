
(* module type GAME = sig

    (* BEGIN; INSERT INTO (your insert here); SELECT last_insert_rowid(); COMMIT;  *)
    (* TODO: sqids to map string to int id, and reverse *)
    val create : Dream.request -> string -> unit Lwt.t

    val get : Dream.request -> string -> unit Lwt.t

    val delete : Dream.request -> string -> unit Lwt.t

    val start : Dream.request -> string -> starting_config -> unit Lwt.t

    val add_event : Dream.request -> string -> Domain.Game.GameEvent.t -> unit Lwt.t

    val finish : Dream.request -> string -> unit Lwt.t

    val finish_with_move : Dream.request -> string -> unit Lwt.t


    val take_back

    val end_turn

end *)
