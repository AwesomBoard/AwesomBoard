/* eslint-disable max-lines-per-function */
import { fakeAsync } from '@angular/core/testing';
import { PlayerOrNone } from 'src/app/jscaip/Player';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { Table } from 'src/app/jscaip/TableUtils';
import { ComponentTestUtils } from 'src/app/utils/tests/TestUtils.spec';
import { PentagoComponent } from '../pentago.component';
import { PentagoMove } from '../PentagoMove';
import { PentagoState } from '../PentagoState';
import { PentagoRules } from '../PentagoRules';

describe('PentagoComponent', () => {

    let testUtils: ComponentTestUtils<PentagoComponent>;

    const _: PlayerOrNone = PlayerOrNone.NONE;
    const O: PlayerOrNone = PlayerOrNone.ZERO;
    const X: PlayerOrNone = PlayerOrNone.ONE;

    beforeEach(fakeAsync(async() => {
        testUtils = await ComponentTestUtils.forGame<PentagoComponent>('Pentago');
    }));

    it('should create', () => {
        testUtils.expectToBeCreated();
    });

    describe('first click', () => {

        it('should do move in one click when click make all block are neutral', fakeAsync(async() => {
            const move: PentagoMove = PentagoMove.rotationless(1, 1);
            await testUtils.expectMoveSuccess('#click-1-1', move);
        }));

        it('should not display arrows on neutral blocks and display dropped piece meanwhile', fakeAsync(async() => {
            const board: Table<PlayerOrNone> = [
                [_, _, X, _, _, _],
                [_, O, _, _, _, _],
                [X, _, X, _, _, _],
                [_, _, _, _, O, _],
                [_, _, _, _, _, _],
                [_, _, _, _, _, _],
            ];
            const state: PentagoState = new PentagoState(board, 5);
            await testUtils.setupState(state);
            await testUtils.expectClickSuccess('#click-0-0');
            testUtils.expectElementNotToExist('#rotate-0-clockwise');
        }));

        it('should not accept click on pieces', fakeAsync(async() => {
            // Given a state with a piece on it
            const board: Table<PlayerOrNone> = [
                [O, _, _, _, _, _],
                [_, _, _, _, _, _],
                [_, _, _, _, _, _],
                [_, _, _, _, _, _],
                [_, _, _, _, _, _],
                [_, _, _, _, _, _],
            ];
            const state: PentagoState = new PentagoState(board, 5);
            await testUtils.setupState(state);

            // When clicking on that piece
            // Then it should fail
            await testUtils.expectClickFailure('#click-0-0', RulesFailure.MUST_LAND_ON_EMPTY_SPACE());
        }));

        it('should hide last rotation when starting the move', fakeAsync(async() => {
            // Given a board with a last move with rotation
            const board: Table<PlayerOrNone> = [
                [_, _, _, _, _, _],
                [_, _, _, _, _, _],
                [_, _, _, _, _, _],
                [_, _, _, _, _, O],
                [_, _, _, _, _, _],
                [_, _, _, _, _, _],
            ];
            const state: PentagoState = new PentagoState(board, 1);
            const previousMove: PentagoMove = PentagoMove.withRotation(5, 5, 3, false);
            const previousState: PentagoState = PentagoRules.get().getInitialState();
            await testUtils.setupState(state, { previousState, previousMove });
            testUtils.expectElementToHaveClass('#last-rotation-3-counterclockwise', 'last-move-stroke');

            // When clicking on a piece (and when having to click again to finish the move)
            await testUtils.expectClickSuccess('#click-0-0');

            // Then the last rotation should be hidden
            testUtils.expectElementNotToExist('#last-rotation-3-counterclockwise');
        }));
    });

    describe('second click', () => {

        it('should show a "skip rotation button" when there are both neutral and non-neutral blocks', fakeAsync(async() => {
            await testUtils.expectClickSuccess('#click-0-0');
            const move: PentagoMove = PentagoMove.rotationless(0, 0);
            await testUtils.expectMoveSuccess('#skip-rotation', move);
        }));

        it('should display arrows to allow rotating specific block', fakeAsync(async() => {
            await testUtils.expectClickSuccess('#click-0-0');
            testUtils.expectElementToExist('#current-drop-0-0');
            const move: PentagoMove = PentagoMove.withRotation(0, 0, 0, true);
            await testUtils.expectMoveSuccess('#rotate-0-clockwise', move);
        }));

        it('should show highlighted winning line', fakeAsync(async() => {
            const board: Table<PlayerOrNone> = [
                [_, _, _, _, _, _],
                [X, _, _, _, _, _],
                [X, _, _, _, _, _],
                [_, _, _, _, _, _],
                [_, _, _, _, _, _],
                [_, X, X, _, _, _],
            ];
            const state: PentagoState = new PentagoState(board, 5);
            await testUtils.setupState(state);
            await testUtils.expectClickSuccess('#click-0-5');
            const move: PentagoMove = PentagoMove.withRotation(0, 5, 2, true);
            await testUtils.expectMoveSuccess('#rotate-2-clockwise', move);
            testUtils.expectElementToExist('#victory-coord-0-1');
            testUtils.expectElementToExist('#victory-coord-0-5');
        }));

        it('should highlight last move (with rotation of last drop, clockwise)', fakeAsync(async() => {
            // GIven a board with a piece dropped already
            await testUtils.expectClickSuccess('#click-5-5');

            // When doing the rotation
            const move: PentagoMove = PentagoMove.withRotation(5, 5, 3, true);
            await testUtils.expectMoveSuccess('#rotate-3-clockwise', move);

            // Then block should be displayed as last move
            testUtils.expectElementToHaveClasses('#block-1-1', ['base', 'no-fill', 'last-move-stroke']);
            testUtils.expectElementToHaveClasses('#last-rotation-3-clockwise', ['no-fill', 'last-move-stroke']);
            testUtils.expectElementToHaveClasses('#click-3-5', ['base', 'player0-fill', 'last-move-stroke']);
        }));

        it('should highlight last move (with rotation of last drop, counterclockwise)', fakeAsync(async() => {
            await testUtils.expectClickSuccess('#click-0-5');
            const move: PentagoMove = PentagoMove.withRotation(0, 5, 2, false);
            await testUtils.expectMoveSuccess('#rotate-2-counterclockwise', move);
            testUtils.expectElementToHaveClasses('#block-0-1', ['base', 'no-fill', 'last-move-stroke']);
            testUtils.expectElementToHaveClasses('#click-2-5', ['base', 'player0-fill', 'last-move-stroke']);
        }));

        it('should highlight last move (with rotation, but not of last drop)', fakeAsync(async() => {
            // Given a board with a piece in block number 1
            const board: Table<PlayerOrNone> = [
                [_, _, _, _, _, _],
                [_, _, _, O, _, _],
                [_, _, _, _, _, _],
                [_, _, _, _, _, _],
                [_, _, _, _, _, _],
                [_, _, _, _, _, _],
            ];
            const state: PentagoState = new PentagoState(board, 5);
            await testUtils.setupState(state);

            // When dropping in block number 0 and rotating block number 1
            await testUtils.expectClickSuccess('#click-0-1');
            const move: PentagoMove = PentagoMove.withRotation(0, 1, 1, false);
            await testUtils.expectMoveSuccess('#rotate-1-counterclockwise', move);
            testUtils.expectElementToHaveClasses('#block-1-0', ['base', 'no-fill', 'last-move-stroke']);
            testUtils.expectElementToHaveClasses('#click-0-1', ['base', 'player1-fill', 'last-move-stroke']);
        }));
    });

    it('should hide first move when taking back', fakeAsync(async() => {
        // Given a state with a first move done
        const board: Table<PlayerOrNone> = [
            [_, _, _, _, _, _],
            [_, _, _, _, _, _],
            [_, _, _, _, _, _],
            [_, _, _, _, _, _],
            [_, _, _, _, _, _],
            [_, _, _, _, _, O],
        ];
        const state: PentagoState = new PentagoState(board, 1);
        const previousMove: PentagoMove = PentagoMove.rotationless(5, 5);
        const previousState: PentagoState = PentagoRules.get().getInitialState();
        await testUtils.setupState(state, { previousState, previousMove });

        // When taking it back
        await testUtils.expectInterfaceClickSuccess('#take-back');

        // Then no highlight should be found
        testUtils.expectElementNotToHaveClass('#click-5-5', 'last-move-stroke');
    }));
});
