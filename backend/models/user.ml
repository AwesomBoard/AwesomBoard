(** The user document in Firestore *)
type t = {
    username: string option;
    last_update_time: string option [@default None] [@key "lastUpdateTime"];
    verified: bool;
    (* TODO: we want to get rid of this. The backend is the sole master. *)
    current_game: CurrentGame.t option [@default None] [@key "currentGame"];
}
[@@deriving yojson]

let to_minimal_user = fun (uid : string) (user : t) : MinimalUser.t ->
    { id = uid; name = Option.get user.username }

(** The user contains a sub-collection containing its elo score for each game.
    Each game therefore has an EloInfo.t *)
(* TODO: get rid of elo stored in user *)
(* TODO: simply rename to "Elo"? *)
module EloInfo = struct
    type t = {
        current_elo : float [@key "currentElo"];
        number_of_games_played : int [@key "numberOfGamesPlayed"];
    }
    [@@deriving yojson]

    let empty : t = {
        current_elo = 0.0;
        number_of_games_played = 0;
    }
end
