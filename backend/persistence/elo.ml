module type ELO = sig

    (** [get ~request ~user_id ~game_name] retrieves the Elo score of user with id
        [user_id] for the game named [game_name], in the context of [request] *)
    val get : request:Dream.request -> user_id:string -> game_name:string -> Models.User.EloInfo.t Lwt.t

end

module EloSql : ELO = struct
    open Utils.Caqti

    let elo : Models.User.EloInfo.t Caqti_type.t =
        let make = fun (current_elo : float) (number_of_games_played : int) : Models.User.EloInfo.t ->
            Models.User.EloInfo.{ current_elo; number_of_games_played } in
        product make
            @@ proj float (fun (elo : Models.User.EloInfo.t) -> elo.current_elo)
            @@ proj int (fun (elo : Models.User.EloInfo.t) -> elo.number_of_games_played)
            @@ proj_end

    (* Select the elo if present, or the default value (0.0 elo, 0 games played) otherwise. *)
    let get_query = t2 string string ->! elo @@ {|
        SELECT current_elo, number_of_games_played FROM elos WHERE user_id = ? AND game_name = ?
        UNION ALL
        SELECT 0.0, 0
        LIMIT 1
    |}

    let get = fun ~(request : Dream.request) ~(user_id : string) ~(game_name : string) : Models.User.EloInfo.t Lwt.t ->
        Dream.sql request @@ fun (module Db : DB) -> check @@
        Db.find get_query (user_id, game_name)

end
