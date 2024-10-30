open Alcotest
open TestUtils
open Backend
open Utils

let elo_info_pair_eq : Elo.EloInfoPair.t testable =
    let pp ppf (elo_info_pair : Elo.EloInfoPair.t) =
        Fmt.pf ppf "%s %s"
            (JSON.to_string (Domain.User.EloInfo.to_yojson elo_info_pair.zero))
            (JSON.to_string (Domain.User.EloInfo.to_yojson elo_info_pair.one)) in
  testable pp (=)

  let tests = [

    "EloCalculation", [
        test "first game should end in 30-1 when player zero wins" (fun () ->
            (* Given two first-playing users and a player zero who won *)
            let first_game_elo : Domain.User.EloInfo.t = {
                current_elo = 0.0;
                number_of_games_played = 0;
            } in
            let elo_pair : Elo.EloInfoPair.t = {
                zero = first_game_elo;
                one = first_game_elo;
            } in
            let winner : Elo.Winner.t = Player Zero in

            (* When computing the elo after the game *)
            let actual : Elo.EloInfoPair.t = Elo.Calculation.new_elos elo_pair winner in

            (* Then it should give 1 symbolic point to the loser for their first game and 30 to the winner *)
            let expected : Elo.EloInfoPair.t = {
                zero = {
                    current_elo = 30.0;
                    number_of_games_played = 1;
                };
                one = {
                    current_elo = 1.0;
                    number_of_games_played = 1;
                };
            } in
            check elo_info_pair_eq "success" expected actual
        );

        test "first game should end in 1-30 when player one wins" (fun () ->
            (* Given two first-playing users and a player one who won *)
            let first_game_elo : Domain.User.EloInfo.t = {
                current_elo = 0.0;
                number_of_games_played = 0;
            } in
            let elo_pair : Elo.EloInfoPair.t = {
                zero = first_game_elo;
                one = first_game_elo;
            } in
            let winner : Elo.Winner.t = Player One in

            (* When computing the elo after the game it *)
            let actual : Elo.EloInfoPair.t = Elo.Calculation.new_elos elo_pair winner in

            (* Then it should give 1 symbolic point to the loser for their first game and 30 to the winner *)
            let expected : Elo.EloInfoPair.t = {
                zero = {
                    current_elo = 1.0;
                    number_of_games_played = 1;
                };
                one = {
                    current_elo = 30.0;
                    number_of_games_played = 1;
                };
            } in
            check elo_info_pair_eq "success" expected actual
        );

        test "second game should end in in 1-57 when player zero wins again" (fun () ->
            (* Given two second-game players that just fought each other with a win from Zero *)
            let elo_pair : Elo.EloInfoPair.t = {
                zero = {
                    current_elo = 30.0;
                    number_of_games_played = 1;
                };
                one = {
                    current_elo = 1.0;
                    number_of_games_played = 1;
                }
            } in
            let winner : Elo.Winner.t = Player Zero in

            (* When computing the elo after the game it *)
            let actual : Elo.EloInfoPair.t = Elo.Calculation.new_elos elo_pair winner in

            (* Then it should give no point to loser and a bit less than 30 points to winner *)
            let expected : Elo.EloInfoPair.t = {
                zero = {
                    current_elo = 57.50173783711419;
                    number_of_games_played = 2;
                };
                one = {
                    current_elo = 1.0;
                    number_of_games_played = 2;
                };
            } in

            check elo_info_pair_eq "success" expected actual
        );

        test "victory should give only 20 points between 20th game and 39th included" (fun () ->
            (* Given two players of equal level having played between 20 and 39 games, and Zero winning a game *)
            let elo_pair : Elo.EloInfoPair.t = {
                zero = {
                    current_elo = 200.0;
                    number_of_games_played = 20;
                };
                one = {
                    current_elo = 200.0;
                    number_of_games_played = 39;
                };
            } in
            let winner : Elo.Winner.t = Player Zero in

            (* When computing the elo after the game it *)
            let actual : Elo.EloInfoPair.t = Elo.Calculation.new_elos elo_pair winner in

            (* Then it should add and remove 20 points to players *)
            let expected : Elo.EloInfoPair.t = {
                zero = {
                    current_elo = 220.0;
                    number_of_games_played = 21;
                };
                one = {
                    current_elo = 180.0;
                    number_of_games_played = 40;
                };
            } in

            check elo_info_pair_eq "success" expected actual
        );

        test "victory should give only 10 points 40th game" (fun () ->
            (* Given a player at their 40th game, winning the game *)
            let elo_pair : Elo.EloInfoPair.t = {
                zero = {
                    current_elo = 200.0;
                    number_of_games_played = 40;
                };
                one = {
                    current_elo = 200.0;
                    number_of_games_played = 39;
                }
            } in
            let winner : Elo.Winner.t = Player Zero in

            (* When computing the elo after the game it *)
            let actual : Elo.EloInfoPair.t = Elo.Calculation.new_elos elo_pair winner in

            (* Then it should only add 10 points to winner, and remove 20 from loser *)
            let expected : Elo.EloInfoPair.t = {
                zero = {
                    current_elo = 210.0;
                    number_of_games_played = 41;
                };
                one = {
                    current_elo = 180.0;
                    number_of_games_played = 40;
                };
            } in

            check elo_info_pair_eq "success" expected actual
        );

        test "should not decrease players elo below 100" (fun () ->
            (* Given an two player with 105 elo, and Zero winning the game *)
            let elo_pair : Elo.EloInfoPair.t = {
                zero = {
                    current_elo = 105.0;
                    number_of_games_played = 5;
                };
                one = {
                    current_elo = 105.0;
                    number_of_games_played = 15;
                };
            } in
            let winner : Elo.Winner.t = Player Zero in

            (* When computing the elo after the game it *)
            let actual : Elo.EloInfoPair.t = Elo.Calculation.new_elos elo_pair winner in

            (* Then it should remove only 5 points to loser so that its elo does not decrease below 105 *)
            let expected : Elo.EloInfoPair.t = {
                zero = {
                    current_elo = 135.0;
                    number_of_games_played = 6;
                };
                one = {
                    current_elo = 100.0;
                    number_of_games_played = 16;
                };
            } in

            check elo_info_pair_eq "success" expected actual
        );

        test "should give one symbolic first point to both drawing player as their first game" (fun () ->
            (* Given two players at their first game, and a draw *)
            let elo_pair : Elo.EloInfoPair.t = {
                zero = {
                    current_elo = 0.0;
                    number_of_games_played = 0;
                };
                one = {
                    current_elo = 0.0;
                    number_of_games_played = 0;
                };
            } in
            let winner : Elo.Winner.t = Draw in

            (* When computing the elo after the game it *)
            let actual : Elo.EloInfoPair.t = Elo.Calculation.new_elos elo_pair winner in

            (* Then it should give one symbolic elo to both players *)
            let expected : Elo.EloInfoPair.t = {
                zero = {
                    current_elo = 1.0;
                    number_of_games_played = 1;
                };
                one = {
                    current_elo = 1.0;
                    number_of_games_played = 1;
                };
            } in

            check elo_info_pair_eq "success" expected actual
        );

    ];

]
