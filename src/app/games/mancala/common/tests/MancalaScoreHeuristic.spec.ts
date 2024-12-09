/* eslint-disable max-lines-per-function */
import { HeuristicUtils } from 'src/app/jscaip/AI/tests/HeuristicUtils.spec';
import { MancalaScoreHeuristic } from '../MancalaScoreHeurisic';
import { MancalaState } from '../MancalaState';
import { MGPOptional } from '@everyboard/lib';
import { Player } from 'src/app/jscaip/Player';
import { MancalaConfig } from '../MancalaConfig';
import { KalahRules } from '../../kalah/KalahRules';
import { AwaleRules } from '../../awale/AwaleRules';
import { PlayerNumberMap } from 'src/app/jscaip/PlayerMap';
import { BaAwaRules } from '../../ba-awa/BaAwaRules';
import { HeuristicBounds } from 'src/app/jscaip/AI/Minimax';
import { BoardValue } from 'src/app/jscaip/AI/BoardValue';

describe('MancalaScoreHeuristic', () => {

    let heuristic: MancalaScoreHeuristic;

    beforeEach(() => {
        heuristic = new MancalaScoreHeuristic();
    });

    for (const mancalaRules of [AwaleRules, KalahRules, BaAwaRules]) {
        const defaultConfig: MGPOptional<MancalaConfig> = mancalaRules.get().getDefaultRulesConfig();

        it('should prefer board with better score', () => {
            // Given a board with a big score
            const board: number[][] = [
                [0, 0, 0, 3, 2, 1],
                [1, 2, 3, 0, 0, 0],
            ];
            const strongState: MancalaState = new MancalaState(board, 0, PlayerNumberMap.of(10, 0));
            // And a board with a little score
            const weakState: MancalaState = new MancalaState(board, 0, PlayerNumberMap.of(0, 0));

            // When comparing both
            // Then the bigger score should be better
            HeuristicUtils.expectSecondStateToBeBetterThanFirstFor(heuristic,
                                                                   weakState, MGPOptional.empty(),
                                                                   strongState, MGPOptional.empty(),
                                                                   Player.ZERO,
                                                                   defaultConfig);
        });

        it('should define heuristic bounds', () => {
            // Given the heuristic
            // When computing its bounds on the default config
            const bounds: MGPOptional<HeuristicBounds<BoardValue>> = heuristic.getBounds(defaultConfig);
            // Then it should be the maximal score (48) for each player
            expect(bounds.isPresent()).toBeTrue();
            expect(bounds.get().player0Max).toEqual(BoardValue.ofSingle(48, 0));
            expect(bounds.get().player1Max).toEqual(BoardValue.ofSingle(0, 48));
        });

    }


});
