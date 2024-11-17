/* eslint-disable max-lines-per-function */
import { FourStatePiece } from 'src/app/jscaip/FourStatePiece';
import { Table } from 'src/app/jscaip/TableUtils';
import { AbaloneState } from '../AbaloneState';
import { MGPOptional } from '@everyboard/lib';
import { Player } from 'src/app/jscaip/Player';
import { AbaloneScoreHeuristic } from '../AbaloneScoreHeuristic';
import { AbaloneConfig, AbaloneRules } from '../AbaloneRules';
import { HeuristicUtils } from 'src/app/jscaip/AI/tests/HeuristicUtils.spec';

const _: FourStatePiece = FourStatePiece.EMPTY;
const N: FourStatePiece = FourStatePiece.UNREACHABLE;
const O: FourStatePiece = FourStatePiece.ZERO;
const X: FourStatePiece = FourStatePiece.ONE;

describe('AbaloneScoreHeuristic', () => {

    let heuristic: AbaloneScoreHeuristic;
    const defaultConfig: MGPOptional<AbaloneConfig> = AbaloneRules.get().getDefaultRulesConfig();

    beforeEach(() => {
        heuristic = new AbaloneScoreHeuristic();
    });

    it('should assign a higher score when one has more pieces on board', () => {
        // Given two boards, one with more player pieces than the other
        const boardWithLessPieces: Table<FourStatePiece> = [
            [N, N, N, N, X, X, X, X, X],
            [N, N, N, X, X, X, X, X, X],
            [N, N, _, _, X, X, X, _, _],
            [N, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, N],
            [_, _, O, O, _, _, _, N, N],
            [O, O, O, O, _, O, N, N, N],
            [O, O, O, O, O, N, N, N, N],
        ];
        const boardWithMorePieces: Table<FourStatePiece> = [
            [N, N, N, N, X, X, X, X, X],
            [N, N, N, X, X, X, X, X, X],
            [N, N, _, _, X, X, X, _, _],
            [N, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, N],
            [_, _, O, O, O, _, _, N, N],
            [O, O, O, O, O, O, N, N, N],
            [O, O, O, O, O, N, N, N, N],
        ];
        // When computing the scores
        // Then the board with the most player pieces should have the highest score
        HeuristicUtils.expectSecondStateToBeBetterThanFirstFor(heuristic,
                                                               new AbaloneState(boardWithLessPieces, 0),
                                                               MGPOptional.empty(),
                                                               new AbaloneState(boardWithMorePieces, 0),
                                                               MGPOptional.empty(),
                                                               Player.ZERO,
                                                               defaultConfig);
    });

});
