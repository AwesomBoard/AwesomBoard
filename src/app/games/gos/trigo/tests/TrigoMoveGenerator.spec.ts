/* eslint-disable max-lines-per-function */
import { MGPOptional } from '@everyboard/lib';
import { Table } from 'src/app/jscaip/TableUtils';
import { GoMove } from '../../GoMove';
import { GoState } from '../../GoState';
import { GoPiece } from '../../GoPiece';
import { GoNode } from '../../AbstractGoRules';
import { TrigoMoveGenerator } from '../TrigoMoveGenerator';
import { PlayerNumberMap } from 'src/app/jscaip/PlayerMap';
import { TrigoConfig, TrigoRules } from '../TrigoRules';

const X: GoPiece = GoPiece.LIGHT;
const O: GoPiece = GoPiece.DARK;
const u: GoPiece = GoPiece.DEAD_DARK;
const k: GoPiece = GoPiece.DEAD_LIGHT;
const w: GoPiece = GoPiece.LIGHT_TERRITORY;
const b: GoPiece = GoPiece.DARK_TERRITORY;
const _: GoPiece = GoPiece.EMPTY;
const N: GoPiece = GoPiece.UNREACHABLE;

describe('TrigoMoveGenerator', () => {

    let moveGenerator: TrigoMoveGenerator;

    const config: MGPOptional<TrigoConfig> = MGPOptional.of({ size: 2, hexagonal: false });

    beforeEach(() => {
        moveGenerator = new TrigoMoveGenerator();
    });

    describe('getListMove', () => {

        it('should count as many moves as empty spaces in GoPhase.PLAYING turn, + PASS', () => {
            // Given a board in playing phase
            const board: Table<GoPiece> = [
                [_, _, _, _, _],
                [_, _, _, _, _],
                [_, _, _, _, _],
                [_, _, _, _, _],
                [_, _, _, _, _],
            ];
            const state: GoState =
                new GoState(board, PlayerNumberMap.of(0, 0), 0, MGPOptional.empty(), 'PLAYING');
            const initialNode: GoNode = new GoNode(state);

            // When listing the moves
            const moves: GoMove[] = moveGenerator.getListMoves(initialNode);

            // Then it should include one move per empty space (25) + the move PASS
            expect(moves.length).toBe(25 + 1);
            expect(moves.some((m: GoMove) => m.equals(GoMove.PASS))).toBeTrue();
        });

        it('should only have GoMove.ACCEPT in ACCEPT GoPhase when agreeing on the result', () => {
            // Given a board in 'accept' phase when minimax agrees with the state
            const initialBoard: GoPiece[][] = [
                [N, N, b, N],
                [N, b, O, b],
            ];
            const state: GoState =
                new GoState(initialBoard, PlayerNumberMap.of(3, 0), 0, MGPOptional.empty(), 'ACCEPT');
            const initialNode: GoNode = new GoNode(state);

            // When listing the moves
            const moves: GoMove[] = moveGenerator.getListMoves(initialNode);

            // Then there should only be 'ACCEPT'
            expect(moves).toEqual([GoMove.ACCEPT]);
        });

        it('should only have GoMove.ACCEPT in COUNTNG GoPhase when agreeing on the result', () => {
            // Given a board in counting phase when minimax agrees with the result
            const initialBoard: GoPiece[][] = TrigoRules.get().getInitialState(config).getCopiedBoard();
            const state: GoState = new GoState(initialBoard,
                                               PlayerNumberMap.of(0, 0),
                                               0,
                                               MGPOptional.empty(),
                                               'COUNTING');
            const initialNode: GoNode = new GoNode(state);
            spyOn(moveGenerator, 'getCountingMovesList').and.returnValue([]);

            // When listing the moves
            const moves: GoMove[] = moveGenerator.getListMoves(initialNode);

            // Then there should only be 'ACCEPT'
            expect(moves).toEqual([GoMove.ACCEPT]);
        });

        it('should only have counting moves in GoPhase.COUNTING when not agreeing on the result', () => {
            // Given a board in ACCEPT phase but having a disagreement on the final state
            const initialBoard: GoPiece[][] = TrigoRules.get().getInitialState(config).getCopiedBoard();
            const state: GoState =
                new GoState(initialBoard, PlayerNumberMap.of(0, 0), 0, MGPOptional.empty(), 'ACCEPT');
            const initialNode: GoNode = new GoNode(state);
            spyOn(moveGenerator, 'getCountingMovesList').and.returnValue([new GoMove(1, 1)]);

            // When generating the list of move
            const moves: GoMove[] = moveGenerator.getListMoves(initialNode);

            // Then the list of move should be the disagreements
            expect(moves).toEqual([new GoMove(1, 1)]);
        });

        it('should switch dead pieces when it considers those pieces alive (Player.ZERO)', () => {
            // Given a board in counting phase with dead piece that minimax considers alive
            const board: Table<GoPiece> = [
                [u, w, w, X, w],
                [X, X, X, X, X],
                [_, _, _, _, _],
                [_, _, _, O, _],
                [_, _, _, _, _],
            ];
            const state: GoState =
                new GoState(board, PlayerNumberMap.of(0, 0), 0, MGPOptional.empty(), 'COUNTING');
            const initialNode: GoNode = new GoNode(state);

            // When listing the moves
            const moves: GoMove[] = moveGenerator.getListMoves(initialNode);

            // Then it should include the moves that puts them back alive
            expect(moves.length).toBe(1);
            expect(moves.some((m: GoMove) => m.equals(new GoMove(3, 3)))).toBeTrue();
        });

        it('should switch dead pieces when it considers those pieces alive (Player.ONE)', () => {
            // Given a board in counting phase with dead piece that minimax considers alive
            const board: Table<GoPiece> = [
                [k, b, b, O, b],
                [O, O, O, O, O],
                [_, _, _, _, _],
                [_, _, _, X, _],
                [_, _, _, _, _],
            ];
            const state: GoState =
                new GoState(board, PlayerNumberMap.of(0, 0), 1, MGPOptional.empty(), 'COUNTING');
            const initialNode: GoNode = new GoNode(state);

            // When listing the moves
            const moves: GoMove[] = moveGenerator.getListMoves(initialNode);

            // Then it should include the moves that puts them back alive
            expect(moves.length).toBe(1);
            expect(moves.some((m: GoMove) => m.equals(new GoMove(3, 3)))).toBeTrue();
        });

    });

});
