/* eslint-disable max-lines-per-function */
import { Coord } from 'src/app/jscaip/Coord';
import { FourStatePiece } from 'src/app/jscaip/FourStatePiece';
import { HexaDirection } from 'src/app/jscaip/HexaDirection';
import { Player } from 'src/app/jscaip/Player';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { RulesUtils } from 'src/app/jscaip/tests/RulesUtils.spec';
import { AbaloneFailure } from '../AbaloneFailure';
import { AbaloneState } from '../AbaloneState';
import { AbaloneMove } from '../AbaloneMove';
import { AbaloneNode, AbaloneRules } from '../AbaloneRules';
import { GameStatus } from 'src/app/jscaip/GameStatus';

describe('AbaloneRules', () => {

    const _: FourStatePiece = FourStatePiece.EMPTY;
    const N: FourStatePiece = FourStatePiece.UNREACHABLE;
    const O: FourStatePiece = FourStatePiece.ZERO;
    const X: FourStatePiece = FourStatePiece.ONE;
    let rules: AbaloneRules;

    beforeEach(() => {
        rules = AbaloneRules.get();
    });
    it('should start with an ongoing board status', () => {
        const state: AbaloneState = AbaloneState.getInitialState();
        const node: AbaloneNode = new AbaloneNode(state);
        expect(rules.getGameStatus(node)).toBe(GameStatus.ONGOING);
    });
    it('should move simple piece in provided direction', () => {
        // Given an initial board (for simplicity)
        const state: AbaloneState = AbaloneState.getInitialState();

        // When moving one piece
        const move: AbaloneMove = AbaloneMove.fromSingleCoord(new Coord(0, 7), HexaDirection.UP).get();

        // Then the piece should be moved
        const expectedBoard: FourStatePiece[][] = [
            [N, N, N, N, X, X, X, X, X],
            [N, N, N, X, X, X, X, X, X],
            [N, N, _, _, X, X, X, _, _],
            [N, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, N],
            [O, _, O, O, O, _, _, N, N],
            [_, O, O, O, O, O, N, N, N],
            [O, O, O, O, O, N, N, N, N],
        ];
        const expectedState: AbaloneState = new AbaloneState(expectedBoard, 1);
        RulesUtils.expectMoveSuccess(rules, state, move, expectedState);
    });
    it('should refuse move starting by opponent piece', () => {
        // Given an initial board (for simplicity)
        const state: AbaloneState = AbaloneState.getInitialState();

        // When moving one opponent piece
        const move: AbaloneMove = AbaloneMove.fromSingleCoord(new Coord(8, 1), HexaDirection.DOWN).get();

        // Then the movement should be refused
        const reason: string = RulesFailure.CANNOT_CHOOSE_OPPONENT_PIECE();
        RulesUtils.expectMoveFailure(rules, state, move, reason);
    });
    it('should refuse move starting by empty space', () => {
        // Given an initial board (for simplicity)
        const state: AbaloneState = AbaloneState.getInitialState();

        // When moving one empty space
        const move: AbaloneMove = AbaloneMove.fromSingleCoord(new Coord(4, 4), HexaDirection.DOWN).get();

        // Then the movement should be refused
        const reason: string = RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_EMPTY();
        RulesUtils.expectMoveFailure(rules, state, move, reason);
    });
    it('should move group of piece in provided direction', () => {
        // Given an initial board (for simplicity)
        const state: AbaloneState = AbaloneState.getInitialState();

        // When moving one piece
        const move: AbaloneMove = AbaloneMove.fromSingleCoord(new Coord(0, 8), HexaDirection.UP).get();

        // Then the piece should be moved
        const expectedBoard: FourStatePiece[][] = [
            [N, N, N, N, X, X, X, X, X],
            [N, N, N, X, X, X, X, X, X],
            [N, N, _, _, X, X, X, _, _],
            [N, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, N],
            [O, _, O, O, O, _, _, N, N],
            [O, O, O, O, O, O, N, N, N],
            [_, O, O, O, O, N, N, N, N],
        ];
        const expectedState: AbaloneState = new AbaloneState(expectedBoard, 1);
        RulesUtils.expectMoveSuccess(rules, state, move, expectedState);
    });
    it('should refuse moving group of piece greater than 3', () => {
        // Given a board with 4 piece aligned
        const board: FourStatePiece[][] = [
            [N, N, N, N, _, _, _, _, _],
            [N, N, N, _, _, _, _, _, _],
            [N, N, _, _, _, _, _, _, _],
            [N, _, _, _, _, _, _, _, _],
            [_, O, O, O, O, _, _, _, _],
            [_, _, _, _, _, _, _, _, N],
            [_, _, _, _, _, _, _, N, N],
            [O, O, O, O, O, O, N, N, N],
            [_, O, O, O, O, N, N, N, N],
        ];
        const state: AbaloneState = new AbaloneState(board, 0);

        // When moving four piece
        const move: AbaloneMove = AbaloneMove.fromSingleCoord(new Coord(1, 4), HexaDirection.RIGHT).get();

        // Then the move should be forbidden
        const reason: string = AbaloneFailure.CANNOT_MOVE_MORE_THAN_THREE_PIECES();
        RulesUtils.expectMoveFailure(rules, state, move, reason);
    });
    it(`should refuse moving group of piece smaller than the opponent's group`, () => {
        // Given a board with 4 piece aligned
        const board: FourStatePiece[][] = [
            [N, N, N, N, _, _, _, _, _],
            [N, N, N, _, _, _, _, _, _],
            [N, N, _, _, _, _, _, _, _],
            [N, _, _, _, _, _, _, _, _],
            [_, O, X, X, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, N],
            [_, _, _, _, _, _, _, N, N],
            [O, O, O, O, O, O, N, N, N],
            [_, O, O, O, O, N, N, N, N],
        ];
        const state: AbaloneState = new AbaloneState(board, 0);

        // When moving one piece against two
        const move: AbaloneMove = AbaloneMove.fromSingleCoord(new Coord(1, 4), HexaDirection.RIGHT).get();

        // Then the move should be forbidden
        const reason: string = AbaloneFailure.NOT_ENOUGH_PIECE_TO_PUSH();
        RulesUtils.expectMoveFailure(rules, state, move, reason);
    });
    it('should refuse moving a group of piece of equal size to the opponent', () => {
        // Given a board with 4 piece aligned
        const board: FourStatePiece[][] = [
            [N, N, N, N, _, _, _, _, _],
            [N, N, N, _, _, _, _, _, _],
            [N, N, _, _, _, _, _, _, _],
            [N, _, _, _, _, _, _, _, _],
            [_, O, O, X, X, _, _, _, _],
            [_, _, _, _, _, _, _, _, N],
            [_, _, _, _, _, _, _, N, N],
            [O, O, O, O, O, O, N, N, N],
            [_, O, O, O, O, N, N, N, N],
        ];
        const state: AbaloneState = new AbaloneState(board, 0);

        // When moving two pieces against two
        const move: AbaloneMove = AbaloneMove.fromSingleCoord(new Coord(1, 4), HexaDirection.RIGHT).get();

        // Then the move should be forbidden
        const reason: string = AbaloneFailure.NOT_ENOUGH_PIECE_TO_PUSH();
        RulesUtils.expectMoveFailure(rules, state, move, reason);
    });
    it('should refuse moving a group of piece when first piece after the opponent group is not empty', () => {
        // Given a board with possible push that is self-blocked
        const board: FourStatePiece[][] = [
            [N, N, N, N, _, _, _, _, _],
            [N, N, N, _, _, _, _, _, _],
            [N, N, _, _, _, _, _, _, _],
            [N, _, _, _, _, _, _, _, _],
            [_, O, O, O, X, O, _, _, _],
            [_, _, _, _, _, _, _, _, N],
            [_, _, _, _, _, _, _, N, N],
            [O, O, O, O, O, O, N, N, N],
            [_, O, O, O, O, N, N, N, N],
        ];
        const state: AbaloneState = new AbaloneState(board, 0);

        // When moving 3 pieces against 1 but then you're own piece block
        const move: AbaloneMove = AbaloneMove.fromSingleCoord(new Coord(1, 4), HexaDirection.RIGHT).get();

        // Then the move should be forbidden
        const reason: string = AbaloneFailure.CANNOT_PUSH_YOUR_OWN_PIECES();
        RulesUtils.expectMoveFailure(rules, state, move, reason);
    });
    it('should make pushed piece get of the board', () => {
        // Given an board where 3 can push 1 out of 2 aligned pieces out of the board
        const board: FourStatePiece[][] = [
            [N, N, N, N, _, _, _, _, _],
            [N, N, N, _, _, _, _, _, _],
            [N, N, _, _, _, _, _, _, _],
            [N, _, _, _, _, _, _, _, _],
            [X, X, O, O, O, _, _, _, _],
            [_, _, _, _, _, _, _, _, N],
            [_, _, _, _, _, _, _, N, N],
            [O, O, O, O, O, O, N, N, N],
            [_, O, O, O, O, N, N, N, N],
        ];
        const state: AbaloneState = new AbaloneState(board, 0);

        // When pushing
        const move: AbaloneMove = AbaloneMove.fromSingleCoord(new Coord(4, 4), HexaDirection.LEFT).get();

        // Then the piece should be thrown out of the board
        const expectedBoard: FourStatePiece[][] = [
            [N, N, N, N, _, _, _, _, _],
            [N, N, N, _, _, _, _, _, _],
            [N, N, _, _, _, _, _, _, _],
            [N, _, _, _, _, _, _, _, _],
            [X, O, O, O, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, N],
            [_, _, _, _, _, _, _, N, N],
            [O, O, O, O, O, O, N, N, N],
            [_, O, O, O, O, N, N, N, N],
        ];
        const expectedState: AbaloneState = new AbaloneState(expectedBoard, 1);
        RulesUtils.expectMoveSuccess(rules, state, move, expectedState);
    });
    it('should declare player zero winner when he push a 6th opponent piece out of the board', () => {
        const winningBoard: FourStatePiece[][] = [
            [N, N, N, N, X, X, X, X, X],
            [N, N, N, _, _, _, _, _, _],
            [N, N, _, _, X, X, X, _, _],
            [N, _, _, _, _, _, _, _, _],
            [O, O, O, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, N],
            [_, _, _, _, _, _, _, N, N],
            [O, O, O, O, O, O, N, N, N],
            [O, O, O, O, O, N, N, N, N],
        ];
        const winningState: AbaloneState = new AbaloneState(winningBoard, 1);
        const node: AbaloneNode = new AbaloneNode(winningState);
        RulesUtils.expectToBeVictoryFor(rules, node, Player.ZERO);
    });
    it('should declare player one winner when he push a 6th opponent piece out of the board', () => {
        const winningBoard: FourStatePiece[][] = [
            [N, N, N, N, X, X, X, X, X],
            [N, N, N, X, X, X, X, X, X],
            [N, N, _, _, _, _, _, _, _],
            [N, _, _, _, _, _, _, _, _],
            [X, X, X, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, N],
            [_, _, O, O, O, _, _, N, N],
            [_, _, _, _, _, _, N, N, N],
            [O, O, O, O, O, N, N, N, N],
        ];
        const winningState: AbaloneState = new AbaloneState(winningBoard, 1);
        const node: AbaloneNode = new AbaloneNode(winningState);
        RulesUtils.expectToBeVictoryFor(rules, node, Player.ONE);
    });
    it('should allow unblocked translation', () => {
        // Given an initial board (for simplicity)
        const state: AbaloneState = AbaloneState.getInitialState();

        // When moving a 3 pieces column sideways
        const move: AbaloneMove = AbaloneMove.fromDoubleCoord(new Coord(2, 6), new Coord(4, 6), HexaDirection.UP).get();

        // Then the piece should be moved
        const expectedBoard: FourStatePiece[][] = [
            [N, N, N, N, X, X, X, X, X],
            [N, N, N, X, X, X, X, X, X],
            [N, N, _, _, X, X, X, _, _],
            [N, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, O, O, O, _, _, _, N],
            [_, _, _, _, _, _, _, N, N],
            [O, O, O, O, O, O, N, N, N],
            [O, O, O, O, O, N, N, N, N],
        ];
        const expectedState: AbaloneState = new AbaloneState(expectedBoard, 1);
        RulesUtils.expectMoveSuccess(rules, state, move, expectedState);
    });
    it('should refuse blocked translation', () => {
        // Given a board with possible blocked translation
        const board: FourStatePiece[][] = [
            [N, N, N, N, _, _, _, _, _],
            [N, N, N, _, _, _, _, _, _],
            [N, N, _, _, _, _, _, _, _],
            [N, _, _, _, _, _, _, _, _],
            [_, O, O, O, _, _, _, _, _],
            [_, _, O, _, _, _, _, _, N],
            [_, _, _, _, _, _, _, N, N],
            [O, O, O, O, O, O, N, N, N],
            [_, O, O, O, O, N, N, N, N],
        ];
        const state: AbaloneState = new AbaloneState(board, 0);

        // When trying to move 3 pieces down whilst there is a blocking piece in the middle
        const move: AbaloneMove = AbaloneMove.fromDoubleCoord(new Coord(1, 4),
                                                              new Coord(3, 4),
                                                              HexaDirection.DOWN).get();

        // Then the move should be forbidden
        const reason: string = AbaloneFailure.TRANSLATION_IMPOSSIBLE();
        RulesUtils.expectMoveFailure(rules, state, move, reason);
    });
    it('should refuse to translate a group containing non player piece', () => {
        // Given a board with 2 aligned piece separated by a hole
        const board: FourStatePiece[][] = [
            [N, N, N, N, _, _, _, _, _],
            [N, N, N, _, _, _, _, _, _],
            [N, N, _, _, _, _, _, _, _],
            [N, _, _, _, _, _, _, _, _],
            [_, O, _, O, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, N],
            [_, _, _, _, _, _, _, N, N],
            [O, O, O, O, O, O, N, N, N],
            [_, O, O, O, O, N, N, N, N],
        ];
        const state: AbaloneState = new AbaloneState(board, 0);

        // When trying to move 3 pieces down whilst there is a blocking piece in the middle
        const move: AbaloneMove = AbaloneMove.fromDoubleCoord(new Coord(1, 4),
                                                              new Coord(3, 4),
                                                              HexaDirection.DOWN).get();

        // Then the move should be forbidden
        const reason: string = AbaloneFailure.MUST_ONLY_TRANSLATE_YOUR_PIECES();
        RulesUtils.expectMoveFailure(rules, state, move, reason);
    });
    it('should push on UNREACHABLE the same way as outside the array board', () => {
        // Given the initial state
        const state: AbaloneState = AbaloneState.getInitialState();

        // When moving a piece in one of the coord in the array but out of the board
        const move: AbaloneMove = AbaloneMove.fromSingleCoord(new Coord(4, 8), HexaDirection.RIGHT).get();

        // Then the piece should be moved
        const expectedBoard: FourStatePiece[][] = [
            [N, N, N, N, X, X, X, X, X],
            [N, N, N, X, X, X, X, X, X],
            [N, N, _, _, X, X, X, _, _],
            [N, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, N],
            [_, _, O, O, O, _, _, N, N],
            [O, O, O, O, O, O, N, N, N],
            [O, O, O, O, _, N, N, N, N],
        ];
        const expectedState: AbaloneState = new AbaloneState(expectedBoard, 1);
        RulesUtils.expectMoveSuccess(rules, state, move, expectedState);
    });
    it('should do sidestep landing on UNREACHABLE the same way as outside the array board', () => {
        // Given a state allowing to translate two piece, one of them going to UNREACHABLE
        const board: FourStatePiece[][] = [
            [N, N, N, N, X, X, X, X, X],
            [N, N, N, X, X, X, X, X, X],
            [N, N, _, _, X, X, X, _, _],
            [N, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, N],
            [_, _, O, O, O, _, _, N, N],
            [O, O, O, O, O, O, N, N, N],
            [O, O, O, O, _, N, N, N, N],
        ];
        const state: AbaloneState = new AbaloneState(board, 0);

        // When moving a piece in one of the coord in the array but out of the board
        const move: AbaloneMove = AbaloneMove.fromDoubleCoord(new Coord(4, 7),
                                                              new Coord(5, 7),
                                                              HexaDirection.DOWN).get();

        // Then the piece should be moved
        const expectedBoard: FourStatePiece[][] = [
            [N, N, N, N, X, X, X, X, X],
            [N, N, N, X, X, X, X, X, X],
            [N, N, _, _, X, X, X, _, _],
            [N, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, N],
            [_, _, O, O, O, _, _, N, N],
            [O, O, O, O, _, _, N, N, N],
            [O, O, O, O, O, N, N, N, N],
        ];
        const expectedState: AbaloneState = new AbaloneState(expectedBoard, 1);
        RulesUtils.expectMoveSuccess(rules, state, move, expectedState);
    });
    it('should do sidestep landing outside the board correctly', () => {
        // Given a state allowing to translate three pieces, one of them going outside the board
        const board: FourStatePiece[][] = [
            [N, N, N, N, X, X, X, X, X],
            [N, N, N, X, X, X, X, X, X],
            [N, N, _, _, X, X, X, _, _],
            [N, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, N],
            [_, _, O, O, O, _, _, N, N],
            [_, O, O, O, O, O, N, N, N],
            [O, O, O, O, O, N, N, N, N],
        ];
        const state: AbaloneState = new AbaloneState(board, 0);

        // When moving a piece in one of the coord in the array but out of the board
        const move: AbaloneMove = AbaloneMove.fromDoubleCoord(new Coord(2, 6),
                                                              new Coord(0, 8),
                                                              HexaDirection.LEFT).get();

        // Then the piece should be moved
        const expectedBoard: FourStatePiece[][] = [
            [N, N, N, N, X, X, X, X, X],
            [N, N, N, X, X, X, X, X, X],
            [N, N, _, _, X, X, X, _, _],
            [N, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, N],
            [_, O, _, O, O, _, _, N, N],
            [O, _, O, O, O, O, N, N, N],
            [_, O, O, O, O, N, N, N, N],
        ];
        const expectedState: AbaloneState = new AbaloneState(expectedBoard, 1);
        RulesUtils.expectMoveSuccess(rules, state, move, expectedState);
    });
});
