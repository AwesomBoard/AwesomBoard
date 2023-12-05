/* eslint-disable max-lines-per-function */
import { Table } from 'src/app/utils/ArrayUtils';
import { MGPOptional } from 'src/app/utils/MGPOptional';
import { GoMove } from '../GoMove';
import { GoState, GoPiece, Phase } from '../GoState';
import { GoConfig, GoNode, GoRules } from '../GoRules';
import { GoMoveGenerator } from '../GoMoveGenerator';

const X: GoPiece = GoPiece.LIGHT;
const O: GoPiece = GoPiece.DARK;
const u: GoPiece = GoPiece.DEAD_DARK;
const k: GoPiece = GoPiece.DEAD_LIGHT;
const w: GoPiece = GoPiece.LIGHT_TERRITORY;
const b: GoPiece = GoPiece.DARK_TERRITORY;
const _: GoPiece = GoPiece.EMPTY;

describe('GoMoveGenerator', () => {

    let moveGenerator: GoMoveGenerator;

    const config: MGPOptional<GoConfig> = MGPOptional.of({ width: 5, height: 5, handicap: 0 });

    beforeEach(() => {
        moveGenerator = new GoMoveGenerator();
    });

    describe('getListMove', () => {

        it('should count as many move as empty space in Phase.PLAYING turn, + PASS', () => {
            const board: Table<GoPiece> = [
                [_, X, _, _, _],
                [X, _, _, _, _],
                [_, _, _, _, _],
                [_, _, _, _, _],
                [_, _, _, _, _],
            ];
            const state: GoState = new GoState(board, [0, 0], 0, MGPOptional.empty(), Phase.PLAYING);
            const initialNode: GoNode = new GoNode(state);
            const moves: GoMove[] = moveGenerator.getListMoves(initialNode, config);
            expect(moves.length).toBe(23);
            expect(moves.some((m: GoMove) => m.equals(GoMove.PASS))).toBeTrue();
        });

        it('should only have GoMove.ACCEPT in ACCEPT Phase when agreeing on the result', () => {
            const initialBoard: GoPiece[][] = GoRules.get().getInitialState(config).getCopiedBoard();
            const state: GoState = new GoState(initialBoard, [0, 0], 0, MGPOptional.empty(), Phase.ACCEPT);
            const initialNode: GoNode = new GoNode(state);
            const moves: GoMove[] = moveGenerator.getListMoves(initialNode, config);
            expect(moves).toEqual([GoMove.ACCEPT]);
        });

        it('should only have GoMove.ACCEPT in COUNTNG Phase when agreeing on the result', () => {
            const initialBoard: GoPiece[][] = GoRules.get().getInitialState(config).getCopiedBoard();
            const state: GoState = new GoState(initialBoard, [0, 0], 0, MGPOptional.empty(), Phase.COUNTING);
            const initialNode: GoNode = new GoNode(state);
            spyOn(moveGenerator, 'getCountingMovesList').and.returnValue([]);
            const moves: GoMove[] = moveGenerator.getListMoves(initialNode, config);
            expect(moves).toEqual([GoMove.ACCEPT]);
        });

        it('should only have counting moves in COUNTING Phase when not agreeing on the result', () => {
            const initialBoard: GoPiece[][] = GoRules.get().getInitialState(config).getCopiedBoard();
            const state: GoState = new GoState(initialBoard, [0, 0], 0, MGPOptional.empty(), Phase.ACCEPT);
            const initialNode: GoNode = new GoNode(state);
            spyOn(moveGenerator, 'getCountingMovesList').and.returnValue([new GoMove(1, 1)]);
            const moves: GoMove[] = moveGenerator.getListMoves(initialNode, config);
            expect(moves).toEqual([new GoMove(1, 1)]);
        });

        it('should switch dead piece when it consider those pieces alive (Player.ZERO)', () => {
            const board: Table<GoPiece> = [
                [u, w, w, X, w],
                [X, X, X, X, X],
                [_, _, _, _, _],
                [_, _, _, O, _],
                [_, _, _, _, _],
            ];
            const state: GoState = new GoState(board, [0, 0], 0, MGPOptional.empty(), Phase.COUNTING);
            const initialNode: GoNode = new GoNode(state);
            const moves: GoMove[] = moveGenerator.getListMoves(initialNode, config);
            expect(moves.length).toBe(1);
            expect(moves.some((m: GoMove) => m.equals(new GoMove(3, 3)))).toBeTrue();
        });

        it('should switch dead piece when it consider those pieces alive (Player.ONE)', () => {
            const board: Table<GoPiece> = [
                [k, b, b, O, b],
                [O, O, O, O, O],
                [_, _, _, _, _],
                [_, _, _, X, _],
                [_, _, _, _, _],
            ];
            const state: GoState = new GoState(board, [0, 0], 1, MGPOptional.empty(), Phase.COUNTING);
            const initialNode: GoNode = new GoNode(state);
            const moves: GoMove[] = moveGenerator.getListMoves(initialNode, config);
            expect(moves.length).toBe(1);
            expect(moves.some((m: GoMove) => m.equals(new GoMove(3, 3)))).toBeTrue();
        });

    });

});
