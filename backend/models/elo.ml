(** The user contains a sub-collection containing its elo score for each game.
    Each game therefore has an EloInfo.t *)
module Elo = struct
    type t = {
        current_elo : float [@key "currentElo"];
        games_played : int [@key "gamesPlayed"];
    }
    [@@deriving yojson]

    let empty : t = {
        current_elo = 0.0;
        games_played = 0;
    }
end
include Elo

(*
module GameResult = struct
    type t =
        | Win of { winner: Elo.t; loser: Elo.t };
    }
end

module Winner = struct
    type t = Player of Player.t | Draw
end

module type CALCULATION = sig
    val new_elos_win : WinnerLoser.t -> WinnerLoser.t
    val new_elos_draw :
end

module Calculation : CALCULATION = struct

    let w_from = fun (winner : Winner.t) (player : Player.t) : float ->
        match winner with
        | Draw -> 0.5
        | Player p when player = p -> 1.0
        | _ -> 0.0

    let k_from = fun (games_played : int) : float ->
        if games_played < 20 then 60.0
        else if games_played < 40 then 40.0
        else 20.0

    let winning_probability = fun (elo_winner : float) (elo_loser : float) : float ->
        let difference_in_elo : float = elo_winner -. elo_loser in
        1.0 /. (1.0 +. (10.0 ** (-. difference_in_elo /. 400.0)))

    (* This is the standard Elo difference, according to the standard rules *)
    let elo_difference = fun (k : float) (w : float) (p : float) : float ->
        k *. (w -. p)

    let elo_difference_for_player = fun (elos : t Player.Map.t) (winner : Winner.t) (player : Player.t) : float ->
        let player_info : t = Player.Map.get elos player in
        let k : float = k_from player_info.games_played in
        let w : float = w_from winner player in
        let elo_player : float = player_info.current_elo in
        let opponent_info : t = Player.Map.get elos (Player.opponent_of player) in
        let elo_opponent : float = opponent_info.current_elo in
        let p : float = winning_probability elo_player elo_opponent in
        elo_difference k w p

    (* We use a special rule so that weakest users do not get stuck below a score of 100 *)
    let new_player_elo = fun (old_elo : float) (elo_difference : float) : float ->
        if elo_difference <= 0.0 then
            (* when player loses *)
            if old_elo = 0.0 then
                1.0 (* when losing their first match, they still win 1 elo *)
            else if old_elo < 100.0 then
                old_elo (* not losing elo when they are below 100 *)
            else if old_elo +. elo_difference < 100.0 then
                100.0 (* losers can't drop below 100 elos *)
            else
                old_elo +. elo_difference (* normal defeat *)
        else
            old_elo +. elo_difference (* any victory *)

    let new_elos = fun (elos : t Player.Map.t) (winner : Winner.t) : t Player.Map.t ->
        let new_elo = fun (player : Player.t) : t ->
            let old_elo = Player.Map.get elos player in
            let elo_difference = elo_difference_for_player elos winner player in
            { current_elo = new_player_elo old_elo.current_elo elo_difference;
              games_played = old_elo.games_played + 1 }
        in
        { zero = new_elo Player.Zero;
          one = new_elo Player.One }

end
 *)
