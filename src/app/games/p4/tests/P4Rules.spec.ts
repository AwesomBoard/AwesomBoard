/* eslint-disable max-lines-per-function */
import { P4Node, P4Rules } from '../P4Rules';
import { Player, PlayerOrNone } from 'src/app/jscaip/Player';
import { P4State, p4Config } from '../P4State';
import { P4Move } from '../P4Move';
import { P4Minimax } from '../P4Minimax';
import { P4Failure } from '../P4Failure';
import { RulesUtils } from 'src/app/jscaip/tests/RulesUtils.spec';
import { Minimax } from 'src/app/jscaip/Minimax';
import { ArrayUtils, Table } from 'src/app/utils/ArrayUtils';

describe('P4Rules', () => {

    let rules: P4Rules;
    let minimaxes: Minimax<P4Move, P4State>[];
    const _: PlayerOrNone = PlayerOrNone.NONE;
    const O: PlayerOrNone = PlayerOrNone.ZERO;
    const X: PlayerOrNone = PlayerOrNone.ONE;

    beforeEach(() => {
        rules = P4Rules.get();
        minimaxes = [
            // TODO: check that isDraw don't care about score for Rules Tests ?
        ];
    });
    it('should be created', () => {
        expect(rules).toBeTruthy();
    });
    it('should drop piece on the lowest space of the column', () => {
        // Given the initial board
        const state: P4State = P4State.getInitialState(p4Config);

        // When playing in column 3
        const move: P4Move = P4Move.of(3);

        // Then the move should be a success
        const expectedBoard: Table<PlayerOrNone> = [
            [_, _, _, _, _, _, _],
            [_, _, _, _, _, _, _],
            [_, _, _, _, _, _, _],
            [_, _, _, _, _, _, _],
            [_, _, _, _, _, _, _],
            [_, _, _, O, _, _, _],
        ];
        const expectedState: P4State = new P4State(expectedBoard, 1);
        RulesUtils.expectMoveSuccess(rules, state, move, expectedState);
    });

    describe('end game', () => {

        it('First player should win vertically', () => {
            // Given a board with 3 aligned pieces
            const board: Table<PlayerOrNone> = [
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, O, _, _, _],
                [_, _, _, O, _, _, _],
                [_, _, X, O, X, _, X],
            ];
            const state: P4State = new P4State(board, 6);

            // When aligning a fourth piece
            const move: P4Move = P4Move.of(3);

            // Then the move should be legal and player zero winner
            const expectedBoard: Table<PlayerOrNone> = [
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, O, _, _, _],
                [_, _, _, O, _, _, _],
                [_, _, _, O, _, _, _],
                [_, _, X, O, X, _, X],
            ];
            const expectedState: P4State = new P4State(expectedBoard, 7);
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState);
            const node: P4Node = new P4Node(expectedState);
            RulesUtils.expectToBeVictoryFor(rules, node, Player.ZERO, minimaxes);
        });

        it('Second player should win vertically', () => {
            // Given a board with 3 aligned pieces
            const board: Table<PlayerOrNone> = [
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, X, _, _, _],
                [_, _, _, X, _, _, _],
                [_, O, O, X, O, O, _],
            ];
            const state: P4State = new P4State(board, 7);

            // When aligning a fourth piece
            const move: P4Move = P4Move.of(3);

            // Then the move should be legal and player zero winner
            const expectedBoard: Table<PlayerOrNone> = [
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, X, _, _, _],
                [_, _, _, X, _, _, _],
                [_, _, _, X, _, _, _],
                [_, O, O, X, O, O, _],
            ];
            const expectedState: P4State = new P4State(expectedBoard, 8);
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState);
            const node: P4Node = new P4Node(expectedState);
            RulesUtils.expectToBeVictoryFor(rules, node, Player.ONE, minimaxes);
        });

        it('should be a draw once the board is full (smaller boards config)', () => {
            // Given a board without victory, whose turn is equal to width * height - 1
            const width: number = 75;
            const height: number = 33;
            const board: Table<PlayerOrNone> = ArrayUtils.createTable(width, height, PlayerOrNone.NONE);
            const turn: number = width * height - 1; // The logic is based on the turn, it does not check the board
            const state: P4State = new P4State(board, turn);

            // When doing the last move
            const move: P4Move = P4Move.of(3);

            // Then the game should be a hard draw
            const expectedBoard: PlayerOrNone[][] = ArrayUtils.createTable(width, height, PlayerOrNone.NONE);
            expectedBoard[height - 1][move.x] = Player.ofTurn(turn);
            const finalTurn: number = width * height;
            const expectedState: P4State = new P4State(expectedBoard, finalTurn);
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState);
            const node: P4Node = new P4Node(expectedState);
            RulesUtils.expectToBeDraw(rules, node, minimaxes);
        });
    });
    it('should forbid placing a piece on a full column', () => {
        // Given a board with a full column
        const board: Table<PlayerOrNone> = [
            [X, _, _, _, _, _, _],
            [O, _, _, _, _, _, _],
            [X, _, _, _, _, _, _],
            [O, _, _, _, _, _, _],
            [X, _, _, _, _, _, _],
            [O, O, X, O, X, O, X],
        ];
        const state: P4State = new P4State(board, 12);

        // When playing on the full column
        const move: P4Move = P4Move.of(0);

        // Then the move should be deemed illegal
        const reason: string = P4Failure.COLUMN_IS_FULL();
        RulesUtils.expectMoveFailure(rules, state, move, reason);
    });
    it('should know where the lowest space is', () => {
        const board: Table<PlayerOrNone> = [
            [_, _, _, X, _, _, _],
            [_, _, O, O, _, _, _],
            [_, _, X, X, _, _, _],
            [_, _, O, O, _, _, _],
            [_, _, X, X, _, _, _],
            [_, _, O, O, _, _, _],
        ];
        expect(P4Rules.get().getLowestUnoccupiedSpace(board, 0)).toBe(5);
        expect(P4Rules.get().getLowestUnoccupiedSpace(board, 2)).toBe(0);
        expect(P4Rules.get().getLowestUnoccupiedSpace(board, 3)).toBe(-1);
    });
});
