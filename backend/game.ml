module type GAME = sig

    val create : Dream.request -> int -> unit Lwt.t

    val get : Dream.request -> string -> unit Lwt.t

    (* let update : Domain.Game.Updates.End.t = Game.Updates.End.get ~winner ~loser Game.GameResult.Resign in
    AND add action:
            let game_end = GameEvent.Action (GameEvent.Action.end_game resigner now) in
    AND uapdate elos
            let* _ = end_game_elo_update_win ~request ~game ~winner in

    *)
    val finish : Dream.request -> string -> ?winner:Domain.MinimalUser.t -> ?loser:Domain.MinimalUser.t -> Domain.Game.GameResult.t -> unit Lwt.t


    (*
    val delete : Dream.request -> string -> unit Lwt.t

    val start : Dream.request -> string -> starting_config -> unit Lwt.t

    val add_event : Dream.request -> string -> Domain.Game.GameEvent.t -> unit Lwt.t


    val finish_with_move : Dream.request -> string -> unit Lwt.t


    val take_back

    val end_turn *)

end
