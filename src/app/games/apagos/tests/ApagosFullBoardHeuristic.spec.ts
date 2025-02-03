/* eslint-disable max-lines-per-function */
import { MGPOptional } from '@everyboard/lib';

import { Player } from 'src/app/jscaip/Player';
import { HeuristicUtils } from 'src/app/jscaip/AI/tests/HeuristicUtils.spec';
import { ApagosFullBoardHeuristic } from '../ApagosFullBoardHeuristic';
import { ApagosState } from '../ApagosState';
import { ApagosConfig, ApagosRules } from '../ApagosRules';

describe('ApagosFullBoardHeuristic', () => {

    let heuristic: ApagosFullBoardHeuristic;
    const defaultConfig: MGPOptional<ApagosConfig> = ApagosRules.get().getDefaultRulesConfig();

    beforeEach(() => {
        heuristic = new ApagosFullBoardHeuristic();
    });

    it('should consider having more rightmost pieces as an advantage', () => {
        // Given two states with the second having more pieces of the current player in the rightmost space
        const weakerState: ApagosState = ApagosState.fromRepresentation(0, [
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [7, 5, 3, 1],
        ], 10, 9);
        const strongerState: ApagosState = ApagosState.fromRepresentation(0, [
            [0, 0, 0, 1],
            [0, 0, 0, 0],
            [7, 5, 3, 1],
        ], 10, 10);

        // When computing the value of the boards
        // Then the second state should be deemed advantageous for the current player
        HeuristicUtils.expectSecondStateToBeBetterThanFirstFor(heuristic,
                                                               weakerState, MGPOptional.empty(),
                                                               strongerState, MGPOptional.empty(),
                                                               Player.ZERO,
                                                               defaultConfig);

    });

    it('should prefer domination on other square too', () => {
        // Given two states with the second having more pieces of the current player in the last space
        const weakerState: ApagosState = ApagosState.fromRepresentation(0, [
            [0, 0, 0, 1],
            [0, 0, 0, 0],
            [7, 5, 3, 1],
        ], 10, 9);
        const strongerState: ApagosState = ApagosState.fromRepresentation(0, [
            [1, 0, 0, 1],
            [0, 0, 0, 0],
            [7, 5, 3, 1],
        ], 10, 8);

        // When computing the value of the boards
        // Then the second state should be deemed advantageous for the current player
        HeuristicUtils.expectSecondStateToBeBetterThanFirstFor(heuristic,
                                                               weakerState, MGPOptional.empty(),
                                                               strongerState, MGPOptional.empty(),
                                                               Player.ZERO,
                                                               defaultConfig);

    });

});
