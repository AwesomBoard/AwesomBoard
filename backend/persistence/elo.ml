module type ELO = sig

    (** [get ~user_id ~game_name ~config] retrieves the Elo score of user with id
        [user_id] for the game named [game_name] *)
    val get : user_id:string -> game_name:string -> Models.User.EloInfo.t Lwt.t

end

module EloSql : ELO = struct
    let get = fun ~(user_id : string) ~(game_name : string) : Models.User.EloInfo.t Lwt.t ->
        ignore user_id; ignore game_name;
        failwith "TODO: Elo.get"
end
