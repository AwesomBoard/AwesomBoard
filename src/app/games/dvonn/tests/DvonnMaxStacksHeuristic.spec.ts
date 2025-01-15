/* eslint-disable max-lines-per-function */
import { MGPOptional } from '@everyboard/lib';

import { Player } from 'src/app/jscaip/Player';
import { HeuristicUtils } from 'src/app/jscaip/AI/tests/HeuristicUtils.spec';
import { DvonnMaxStacksHeuristic } from '../DvonnMaxStacksHeuristic';
import { DvonnPieceStack } from '../DvonnPieceStack';
import { DvonnState } from '../DvonnState';
import { NoConfig } from 'src/app/jscaip/RulesConfigUtil';
import { DvonnRules } from '../DvonnRules';

describe('DvonnMaxStacksHeuristic', () => {

    let heuristic: DvonnMaxStacksHeuristic;
    const defaultConfig: NoConfig = DvonnRules.get().getDefaultRulesConfig();

    const N: DvonnPieceStack = DvonnPieceStack.UNREACHABLE;
    const _: DvonnPieceStack = DvonnPieceStack.EMPTY;
    const S: DvonnPieceStack = DvonnPieceStack.SOURCE;
    const O: DvonnPieceStack = DvonnPieceStack.PLAYER_ZERO;
    const X: DvonnPieceStack = DvonnPieceStack.PLAYER_ONE;
    const XX: DvonnPieceStack = new DvonnPieceStack(Player.ONE, 2, false);

    beforeEach(() => {
        heuristic = new DvonnMaxStacksHeuristic();
    });

    it('should prefer more stacks over bigger stacks', () => {
        // Given a state with more stacks, for the same number of controlled pieces
        const strongState: DvonnState = new DvonnState([
            [N, N, _, _, _, _, _, _, _, _, _],
            [N, _, S, X, _, _, _, _, _, _, _],
            [_, X, O, X, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, N],
            [_, _, _, _, _, _, _, _, _, N, N],
        ], 0, false);
        const weakState: DvonnState = new DvonnState([
            [N, N, _, _, _, _, _, _, _, _, _],
            [N, _, S, XX, _, _, _, _, _, _, _],
            [_, X, O, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, N],
            [_, _, _, _, _, _, _, _, _, N, N],
        ], 0, false);
        // When computing their values
        // Then it should prefer having more stacks
        HeuristicUtils.expectSecondStateToBeBetterThanFirstFor(heuristic,
                                                               weakState, MGPOptional.empty(),
                                                               strongState, MGPOptional.empty(),
                                                               Player.ONE,
                                                               defaultConfig);
    });

});
