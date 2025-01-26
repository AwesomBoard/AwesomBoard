open Models

module type ELO = sig

    val get : request:Dream.request -> user_id:string -> game_name:string -> Elo.t Lwt.t

end

module EloSql : ELO = struct
    open Utils.Caqti

    let elo : Elo.t Caqti_type.t =
        let make = fun (current_elo : float) (games_played : int) : Elo.t ->
            Elo.{ current_elo; games_played } in
        product make
            @@ proj float (fun (elo : Elo.t) -> elo.current_elo)
            @@ proj int (fun (elo : Elo.t) -> elo.games_played)
            @@ proj_end

    (* Select the elo if present, or the default value (0.0 elo, 0 games played) otherwise. *)
    let get_query = t2 string string ->! elo @@ {|
        SELECT current_elo, games_played FROM elos WHERE user_id = ? AND game_name = ?
        UNION ALL
        SELECT 0.0, 0
        LIMIT 1
    |}

    let get = fun ~(request : Dream.request) ~(user_id : string) ~(game_name : string) : Elo.t Lwt.t ->
        Dream.sql request @@ fun (module Db : DB) -> check @@
        Db.find get_query (user_id, game_name)

end
