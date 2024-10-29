/* eslint-disable max-lines-per-function */
import { MGPOptional } from '@everyboard/lib';
import { QuartoPiece } from '../QuartoPiece';
import { QuartoState } from '../QuartoState';
import { Table } from 'src/app/jscaip/TableUtils';
import { QuartoMove } from '../QuartoMove';
import { HeuristicUtils } from 'src/app/jscaip/AI/tests/HeuristicUtils.spec';
import { Player } from 'src/app/jscaip/Player';
import { QuartoHeuristic } from '../QuartoHeuristic';
import { QuartoConfig, QuartoNode, QuartoRules } from '../QuartoRules';
import { BoardValue } from 'src/app/jscaip/AI/BoardValue';

describe('QuartoHeuristic', () => {

    let heuristic: QuartoHeuristic;
    const defaultConfig: MGPOptional<QuartoConfig> = QuartoRules.get().getDefaultRulesConfig();

    const ____: QuartoPiece = QuartoPiece.EMPTY;
    const AAAA: QuartoPiece = QuartoPiece.AAAA;
    const AAAB: QuartoPiece = QuartoPiece.AAAB;
    const AABB: QuartoPiece = QuartoPiece.AABB;
    const ABBB: QuartoPiece = QuartoPiece.ABBB;
    const BAAA: QuartoPiece = QuartoPiece.BAAA;
    const BBBA: QuartoPiece = QuartoPiece.BBBA;
    const BBBB: QuartoPiece = QuartoPiece.BBBB;

    beforeEach(() => {
        heuristic = new QuartoHeuristic();
    });

    it('should assign 0 to boards that have no pre-victory', () => {
        // Given a state without a pre-victory
        const board: Table<QuartoPiece> = [
            [____, ABBB, AABB, ____],
            [____, ____, ____, ____],
            [____, ____, ____, ____],
            [____, ____, ____, ____],
        ];
        const pieceInHand: QuartoPiece = AAAA;
        const state: QuartoState = new QuartoState(board, 3, pieceInHand);
        // Then the heuristic should assign 0 as board value
        const boardValue: BoardValue = heuristic.getBoardValue(new QuartoNode(state), defaultConfig);
        expect(boardValue.metrics).toEqual([0]);
    });

    it('should know that the board value is PRE_VICTORY when pieceInHand match board criterion', () => {
        // Given a state with a pre-victory
        const board: Table<QuartoPiece> = [
            [____, ABBB, AABB, AAAB],
            [____, ____, ____, ____],
            [____, ____, ____, ____],
            [____, ____, ____, ____],
        ];
        const pieceInHand: QuartoPiece = AAAA;
        const state: QuartoState = new QuartoState(board, 3, pieceInHand);
        // Then the heuristic should detect the previctory
        HeuristicUtils.expectStateToBePreVictory(state,
                                                 new QuartoMove(1, 0, AAAA),
                                                 Player.ONE,
                                                 [heuristic],
                                                 defaultConfig);
    });

    it('should recognize "3 3" as pre-victory', () => {
        // Given a board where 3 pieces are aligned with a common criterion
        // and another line of 3 matching another criterion
        const board: Table<QuartoPiece> = [
            [AAAA, ABBB, AAAB, ____],
            [BBBB, BAAA, BBBA, ____],
            [____, ____, ____, ____],
            [____, ____, ____, ____],
        ];
        const state: QuartoState = new QuartoState(board, 10, QuartoPiece.BBBB);

        // When evaluating the board status
        // Then it should be evaluated as Ongoing
        const move: QuartoMove = new QuartoMove(0, 0, QuartoPiece.BBBB);
        HeuristicUtils.expectStateToBePreVictory(state, move, Player.ZERO, [heuristic], defaultConfig);
    });

});
