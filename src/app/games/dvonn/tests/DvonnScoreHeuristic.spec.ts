/* eslint-disable max-lines-per-function */
import { MGPOptional } from '@everyboard/lib';

import { Player } from 'src/app/jscaip/Player';
import { Table } from 'src/app/jscaip/TableUtils';
import { DvonnPieceStack } from '../DvonnPieceStack';
import { DvonnNode, DvonnRules } from '../DvonnRules';
import { DvonnScoreHeuristic } from '../DvonnScoreHeuristic';
import { DvonnState } from '../DvonnState';
import { NoConfig } from 'src/app/jscaip/RulesConfigUtil';
import { HeuristicBounds } from 'src/app/jscaip/AI/Minimax';
import { BoardValue } from 'src/app/jscaip/AI/BoardValue';

const _N: DvonnPieceStack = DvonnPieceStack.UNREACHABLE;
const __: DvonnPieceStack = DvonnPieceStack.EMPTY;
const D1: DvonnPieceStack = DvonnPieceStack.SOURCE;
const O1: DvonnPieceStack = DvonnPieceStack.PLAYER_ZERO;
const X2: DvonnPieceStack = new DvonnPieceStack(Player.ONE, 2, false);

describe('DvonnScoreHeuristic', () => {

    let heuristic: DvonnScoreHeuristic;
    const defaultConfig: NoConfig = DvonnRules.get().getDefaultRulesConfig();

    beforeEach(() => {
        heuristic = new DvonnScoreHeuristic();
    });

    it('should compute board value as the score difference', () => {
        // Given a board
        const board: Table<DvonnPieceStack> = [
            [_N, _N, __, __, __, __, __, __, __, __, __],
            [_N, __, __, __, __, __, __, __, __, __, __],
            [__, __, __, X2, D1, O1, __, __, __, __, __],
            [__, __, __, __, __, __, __, __, __, __, _N],
            [__, __, __, __, __, __, __, __, __, _N, _N],
        ];
        const state: DvonnState = new DvonnState(board, 0, false);
        const node: DvonnNode = new DvonnNode(state);

        // When computing the board value
        const value: readonly number[] = heuristic.getBoardValue(node, defaultConfig).metrics;

        // Then it should be 2 - 1 = 1
        expect(value).toEqual([1]);
    });

    it('should define heuristic bounds', () => {
        // Given the heuristic
        // When computing its bounds on the default config
        const bounds: MGPOptional<HeuristicBounds<BoardValue>> = heuristic.getBounds(defaultConfig);
        // Then it should be the maximal score (49) for each player
        expect(bounds.isPresent()).toBeTrue();
        expect(bounds.get().player0Max).toEqual(BoardValue.ofSingle(49, 0));
        expect(bounds.get().player1Max).toEqual(BoardValue.ofSingle(0, 49));
    });

});
