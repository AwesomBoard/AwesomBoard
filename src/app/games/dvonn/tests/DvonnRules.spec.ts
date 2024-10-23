/* eslint-disable max-lines-per-function */
import { fakeAsync } from '@angular/core/testing';
import { DvonnPieceStack } from '../DvonnPieceStack';
import { DvonnState } from '../DvonnState';
import { Coord } from 'src/app/jscaip/Coord';
import { DvonnMove } from '../DvonnMove';
import { Player } from 'src/app/jscaip/Player';
import { DvonnNode, DvonnRules } from '../DvonnRules';
import { DvonnFailure } from '../DvonnFailure';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { RulesUtils } from 'src/app/jscaip/tests/RulesUtils.spec';
import { Table } from 'src/app/jscaip/TableUtils';
import { Utils } from '@everyboard/lib';
import { ErrorLoggerServiceMock } from 'src/app/services/tests/ErrorLoggerServiceMock.spec';
import { NoConfig } from 'src/app/jscaip/RulesConfigUtil';

describe('DvonnRules', () => {

    let rules: DvonnRules;
    const defaultConfig: NoConfig = DvonnRules.get().getDefaultRulesConfig();

    const N: DvonnPieceStack = DvonnPieceStack.UNREACHABLE;
    const _: DvonnPieceStack = DvonnPieceStack.EMPTY;
    const S: DvonnPieceStack = DvonnPieceStack.SOURCE;
    const O: DvonnPieceStack = DvonnPieceStack.PLAYER_ZERO;
    const OX: DvonnPieceStack = new DvonnPieceStack(Player.ZERO, 2, false);
    const OO: DvonnPieceStack = new DvonnPieceStack(Player.ZERO, 2, false);
    const OD: DvonnPieceStack = new DvonnPieceStack(Player.ZERO, 2, true);
    const OOO: DvonnPieceStack = new DvonnPieceStack(Player.ZERO, 3, false);
    const X: DvonnPieceStack = DvonnPieceStack.PLAYER_ONE;
    const XS: DvonnPieceStack = new DvonnPieceStack(Player.ONE, 2, true);
    const XX: DvonnPieceStack = new DvonnPieceStack(Player.ONE, 2, false);
    const XSX: DvonnPieceStack = new DvonnPieceStack(Player.ONE, 3, true);

    beforeEach(() => {
        rules = DvonnRules.get();
    });

    it('initial stacks should be of size 1', () => {
        const state: DvonnState = DvonnRules.get().getInitialState();
        for (const coordAndContent of state.getCoordsAndContents()) {
            expect(coordAndContent.content.getSize()).toEqual(1);
            expect(coordAndContent.content.isEmpty()).toBeFalse();
        }
    });

    it('should allow 11 pieces to move in the first turn', () => {
        // 6. Important: a piece or stack that is surrounded on all 6 sides may
        // not be moved. So, at the beginning of the game only the pieces at
        // the edge of the board may move. The pieces that are not positioned at
        // the edge remain blocked for as long as they remain completely
        // surrounded (see diagram below).
        const state: DvonnState = DvonnRules.get().getInitialState();
        const firstTurnMovablePieces: Coord[] = DvonnRules.getMovablePieces(state);
        expect(firstTurnMovablePieces.length).toEqual(11);
    });

    it('should only allow moves from the current player color', () => {
        const state: DvonnState = DvonnRules.get().getInitialState();
        const movablePieces: Coord[] = DvonnRules.getMovablePieces(state);
        for (const coord of movablePieces) {
            expect(state.getPieceAt(coord).belongsTo(Player.ZERO)).toBeTrue();
        }
        const move: DvonnMove = DvonnMove.from(new Coord(2, 0), new Coord(3, 0)).get();
        const state2: DvonnState = rules.applyLegalMove(move, state, defaultConfig);
        const movablePieces2: Coord[] = DvonnRules.getMovablePieces(state2);
        for (const coord of movablePieces2) {
            expect(state2.getPieceAt(coord).belongsTo(Player.ONE)).toBeTrue();
        }
        const illegalMove: DvonnMove = DvonnMove.from(new Coord(1, 1), new Coord(1, 2)).get();
        const reason: string = DvonnFailure.NOT_PLAYER_PIECE();

        // Then the move should be illegal
        RulesUtils.expectMoveFailure(rules, state, illegalMove, reason, defaultConfig);
    });

    it('should forbid moves for pieces with more than 6 neighbors', () => {
        const state: DvonnState = DvonnRules.get().getInitialState();
        const move: DvonnMove = DvonnMove.from(new Coord(1, 3), new Coord(1, 2)).get();
        const reason: string = DvonnFailure.TOO_MANY_NEIGHBORS();

        // Then the move should be illegal
        RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
    });

    it('should forbid moves from an empty stack', () => {
        const board: Table<DvonnPieceStack> = [
            [N, N, _, X, X, X, O, O, X, S, X],
            [N, X, X, O, O, O, X, X, O, X, X],
            [OX, X, X, X, O, S, X, O, O, O, O],
            [_, O, X, O, O, X, X, X, O, O, N],
            [O, S, O, X, X, O, O, O, X, N, N],
        ];
        const state: DvonnState = new DvonnState(board, 0, false);
        const move: DvonnMove = DvonnMove.from(new Coord(2, 0), new Coord(2, 1)).get();
        const reason: string = DvonnFailure.EMPTY_STACK();

        // Then the move should be illegal
        RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
    });

    it('should forbid moves with pieces that cannot reach any target', () => {
        const board: Table<DvonnPieceStack> = [
            [N, N, OO, S, _, _, _, _, _, _, _],
            [N, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, O, X, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, N],
            [_, _, _, _, _, _, _, _, _, N, N],
        ];
        const state: DvonnState = new DvonnState(board, 0, false);
        const move: DvonnMove = DvonnMove.from(new Coord(2, 0), new Coord(4, 0)).get();
        const reason: string = DvonnFailure.CANT_REACH_TARGET();

        // Then the move should be illegal
        RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
    });

    it('should forbid moves with a different length than the stack size', () => {
        const board: Table<DvonnPieceStack> = [
            [N, N, OO, X, _, _, _, _, _, _, _],
            [N, OOO, XS, O, O, _, _, S, _, _, _],
            [XX, X, X, _, O, _, _, XX, _, _, _],
            [O, _, X, OOO, O, _, _, _, _, _, N],
            [O, S, O, X, X, O, _, _, _, N, N],
        ];
        const state: DvonnState = new DvonnState(board, 0, false);
        const move: DvonnMove = DvonnMove.from(new Coord(2, 0), new Coord(3, 0)).get();
        const reason: string = DvonnFailure.INVALID_MOVE_LENGTH();

        // Then the move should be illegal
        RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
    });

    it('should have the target stack owned by the owner of the source stack after the move', () => {
        const expectedBoard: Table<DvonnPieceStack> = [
            [N, N, O, X, X, X, O, O, X, S, X],
            [N, X, X, O, O, O, X, X, O, X, X],
            [OX, X, X, X, O, S, X, O, O, O, O],
            [_, O, X, O, O, X, X, X, O, O, N],
            [O, S, O, X, X, O, O, O, X, N, N],
        ];
        const state: DvonnState = DvonnRules.get().getInitialState();
        const move: DvonnMove = DvonnMove.from(new Coord(0, 3), new Coord(0, 2)).get();
        const expectedState: DvonnState = new DvonnState(expectedBoard, 1, false);
        RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
        const stack: DvonnPieceStack = expectedState.getPieceAtXY(0, 2);
        expect(stack.belongsTo(Player.ZERO)).toBeTrue();
    });

    it('should forbid moves to empty spaces', () => {
        const board: Table<DvonnPieceStack> = [
            [N, N, O, X, _, X, O, _, X, S, X],
            [N, X, X, O, O, O, X, X, O, X, X],
            [X, X, X, _, O, S, _, O, O, O, O],
            [O, _, X, O, O, _, X, X, O, O, N],
            [O, S, O, X, X, O, O, O, X, N, N],
        ];
        const state: DvonnState = new DvonnState(board, 0, false);
        const move: DvonnMove = DvonnMove.from(new Coord(3, 1), new Coord(3, 2)).get();
        const reason: string = DvonnFailure.EMPTY_TARGET_STACK();

        // Then the move should be illegal
        RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
    });

    it('should move stacks as a whole, by as many spaces as there are pieces in the stack', () => {
        const board: Table<DvonnPieceStack> = [
            [N, N, OO, X, _, _, _, _, _, _, _],
            [N, OOO, XS, O, O, _, _, S, _, _, _],
            [XX, X, X, _, O, _, _, XX, _, _, _],
            [O, _, X, OOO, O, _, _, _, _, _, N],
            [O, S, O, X, X, O, _, _, _, N, N],
        ];
        const state: DvonnState = new DvonnState(board, 0, false);
        const move: DvonnMove = DvonnMove.from(new Coord(2, 0), new Coord(3, 0)).get();
        const reason: string = DvonnFailure.INVALID_MOVE_LENGTH();

        // Then the move should be illegal
        RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
    });

    it('should not allow to move a single red piece, but allows stacks with red pieces within it to move', () => {
        const board: Table<DvonnPieceStack> = [
            [N, N, OO, X, _, _, _, _, _, _, _],
            [N, OOO, XS, O, O, _, _, S, _, _, _],
            [XX, X, X, _, O, _, _, XX, _, _, _],
            [O, _, XSX, OOO, O, _, _, _, _, _, N],
            [O, S, O, X, X, O, _, _, _, N, N],
        ];
        const state: DvonnState = new DvonnState(board, 0, false);
        const move: DvonnMove = DvonnMove.from(new Coord(2, 0), new Coord(2, 4)).get();
        const reason: string = DvonnFailure.INVALID_MOVE_LENGTH();

        // Then the move should be illegal
        RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
    });

    it('should not allow to pass turns if moves are possible', () => {
        const state: DvonnState = DvonnRules.get().getInitialState();
        const move: DvonnMove = DvonnMove.PASS;
        const reason: string = RulesFailure.CANNOT_PASS();

        // Then the move should be illegal
        RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
    });

    it('should allow to pass turn if no moves are possible', () => {
        const board: Table<DvonnPieceStack> = [
            [N, N, OO, _, _, _, _, _, _, _, _],
            [N, _, S, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, N],
            [_, _, _, _, _, _, _, _, _, N, N],
        ];
        const state: DvonnState = new DvonnState(board, 0, false);
        expect(rules.isLegal(DvonnMove.PASS, state, defaultConfig).isSuccess()).toBeTrue();
        const move: DvonnMove = DvonnMove.from(new Coord(2, 0), new Coord(2, 1)).get();
        const reason: string = RulesFailure.MUST_PASS();

        // Then the move should be illegal
        RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
    });

    it('should remove of the board any portion disconnected from a source', () => {
        const board: Table<DvonnPieceStack> = [
            [N, N, OO, _, _, X, _, _, _, _, _],
            [N, _, S, O, O, O, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, N],
            [_, _, _, _, _, _, _, _, _, N, N],
        ];
        const expectedBoard: Table<DvonnPieceStack> = [
            [N, N, OO, _, _, _, _, _, _, _, _],
            [N, _, OD, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, N],
            [_, _, _, _, _, _, _, _, _, N, N],
        ];
        const state: DvonnState = new DvonnState(board, 0, false);
        const move: DvonnMove = DvonnMove.from(new Coord(3, 1), new Coord(2, 1)).get();
        const expectedState: DvonnState = new DvonnState(expectedBoard, 1, false);
        RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
    });

    describe('endgames', () => {

        it('should recognize victory for player zero', () => {
            const board: Table<DvonnPieceStack> = [
                [N, N, OO, _, _, _, _, _, _, _, _],
                [N, _, S, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, N],
                [_, _, _, _, _, _, _, _, _, N, N],
            ];
            const state: DvonnState = new DvonnState(board, 0, false);
            const node: DvonnNode = new DvonnNode(state);
            RulesUtils.expectToBeVictoryFor(rules, node, Player.ZERO, defaultConfig);
        });

        it('should recognize victory for player one', () => {
            const board: Table<DvonnPieceStack> = [
                [N, N, _, _, _, _, _, _, _, _, _],
                [N, _, S, XX, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, N],
                [_, _, _, _, _, _, _, _, _, N, N],
            ];
            const state: DvonnState = new DvonnState(board, 0, false);
            const node: DvonnNode = new DvonnNode(state);
            RulesUtils.expectToBeVictoryFor(rules, node, Player.ONE, defaultConfig);
        });

        it('should recognize draw', () => {
            const board: Table<DvonnPieceStack> = [
                [N, N, _, OO, _, _, _, _, _, _, _],
                [N, _, S, XX, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, N],
                [_, _, _, _, _, _, _, _, _, N, N],
            ];
            const state: DvonnState = new DvonnState(board, 0, false);
            const node: DvonnNode = new DvonnNode(state);
            RulesUtils.expectToBeDraw(rules, node, defaultConfig);
        });

    });

    describe('isMovablePiece', () => {

        it('should fail if the coord is not on the board', fakeAsync(() => {
            spyOn(Utils, 'logError').and.callFake(ErrorLoggerServiceMock.logError);
            expect(() => rules.isMovablePiece(DvonnRules.get().getInitialState(), new Coord(-1, -1)))
                .toThrowError('Assertion failure: piece is not on the board');
            expect(Utils.logError).toHaveBeenCalledWith('Assertion failure', 'piece is not on the board', undefined);
        }));

    });

});
