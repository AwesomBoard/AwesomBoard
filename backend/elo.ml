
module Winner = struct
    type t = Player of Domain.Player.t | Draw
end

module EloInfoPair = struct
    type t = Domain.User.EloInfo.t Domain.PlayerMap.t
end

module EloDifferences = struct
    type t = float Domain.PlayerMap.t
end

module type CALCULATION = sig
    val new_elos : EloInfoPair.t -> Winner.t -> EloInfoPair.t
end

module Calculation : CALCULATION = struct

    let w_from = fun (winner : Winner.t) (player : Domain.Player.t) : float ->
        match winner with
            | Draw -> 0.5
            | Player p when player = p -> 1.0
            | _ -> 0.0

    let k_from = fun (number_of_games_played : int) : float ->
        if number_of_games_played < 20 then 60.0
        else if number_of_games_played < 40 then 40.0
        else 20.0

    let winning_probability = fun (elo_winner : float) (elo_loser : float) : float ->
        let difference_in_elo : float = elo_winner -. elo_loser in
        1.0 /. (1.0 +. (10.0 ** (-. difference_in_elo /. 400.0)))

    (* This is the standard Elo difference, according to the standard rules *)
    let elo_difference = fun (k : float) (w : float) (p : float) : float ->
        k *. (w -. p)

    let elo_difference_for_player = fun (elos : EloInfoPair.t) (winner : Winner.t) (player : Domain.Player.t) : float ->
        let player_info : Domain.User.EloInfo.t = Domain.PlayerMap.get elos player in
        let k : float = k_from player_info.number_of_games_played in
        let w : float = w_from winner player in
        let elo_player : float = player_info.current_elo in
        let opponent_info : Domain.User.EloInfo.t = Domain.PlayerMap.get elos (Domain.Player.opponent_of player) in
        let elo_opponent : float = opponent_info.current_elo in
        let p : float = winning_probability elo_player elo_opponent in
        elo_difference k w p

    (** We use special rules so that weakest users do not get stuck below a score of 100 *)
    let new_player_elo = fun (old_elo : float) (elo_difference : float) : float ->
        if elo_difference <= 0.0 then
            (* when you lose *)
            if old_elo = 0.0 then
                1.0 (* when losing your first match you still win 1 elo *)
            else if old_elo < 100.0 then
                old_elo (* not losing elo when you are below 100 *)
            else if old_elo +. elo_difference < 100.0 then
                100.0 (* not dropping below 100 elo *)
            else
                old_elo +. elo_difference (* normal defeat *)
        else
            old_elo +. elo_difference (* any victory *)

    let new_elos = fun (elos : EloInfoPair.t) (winner : Winner.t) : EloInfoPair.t ->
        let new_elo = fun (player : Domain.Player.t) : Domain.User.EloInfo.t ->
            let old_elo_info = Domain.PlayerMap.get elos player in
            let elo_difference = elo_difference_for_player elos winner player in
            { current_elo = new_player_elo old_elo_info.current_elo elo_difference;
              number_of_games_played = old_elo_info.number_of_games_played + 1 }
        in
        { zero = new_elo Domain.Player.Zero;
          one = new_elo Domain.Player.One }

end
