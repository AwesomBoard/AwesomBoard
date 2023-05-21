/* eslint-disable max-lines-per-function */
import { DvonnComponent } from '../dvonn.component';
import { Coord } from 'src/app/jscaip/Coord';
import { DvonnMove } from 'src/app/games/dvonn/DvonnMove';
import { DvonnPieceStack } from 'src/app/games/dvonn/DvonnPieceStack';
import { DvonnState } from 'src/app/games/dvonn/DvonnState';
import { Player } from 'src/app/jscaip/Player';
import { fakeAsync } from '@angular/core/testing';
import { DvonnFailure } from 'src/app/games/dvonn/DvonnFailure';
import { ComponentTestUtils } from 'src/app/utils/tests/TestUtils.spec';
import { Table } from 'src/app/utils/ArrayUtils';

describe('DvonnComponent', () => {

    let testUtils: ComponentTestUtils<DvonnComponent>;

    const __: DvonnPieceStack = DvonnPieceStack.EMPTY;
    const D_: DvonnPieceStack = DvonnPieceStack.SOURCE;
    const W_: DvonnPieceStack = DvonnPieceStack.PLAYER_ZERO;
    const WW: DvonnPieceStack = new DvonnPieceStack(Player.ZERO, 2, false);

    beforeEach(fakeAsync(async() => {
        testUtils = await ComponentTestUtils.forGame<DvonnComponent>('Dvonn');
    }));
    it('should create', () => {
        testUtils.expectToBeCreated();
    });
    it('should not allow to pass initially', fakeAsync(async() => {
        // Given the initial state
        // Then the player cannot pass
        testUtils.expectPassToBeForbidden();
    }));
    it('should allow valid moves', fakeAsync(async() => {
        // Given that the user has selected a valid piece
        await testUtils.expectClickSuccess('#click_2_0');
        // When the user selects a valid destination
        // Then the move should be made
        const move: DvonnMove = DvonnMove.from(new Coord(2, 0), new Coord(2, 1)).get();
        await testUtils.expectMoveSuccess('#click_2_1', move);
    }));
    it('should allow to pass if stuck position', fakeAsync(async() => {
        // Given a state where the player can't make a move
        const board: Table<DvonnPieceStack> = [
            [__, __, WW, __, __, __, __, __, __, __, __],
            [__, __, D_, __, __, __, __, __, __, __, __],
            [__, __, __, __, __, __, __, __, __, __, __],
            [__, __, __, __, __, __, __, __, __, __, __],
            [__, __, __, __, __, __, __, __, __, __, __],
        ];
        const state: DvonnState = new DvonnState(board, 0, false);
        // When it is displayed
        testUtils.setupState(state);
        // Then the player can pass
        const move: DvonnMove = DvonnMove.PASS;
        await testUtils.expectPassSuccess(move);
    }));
    it('should forbid choosing an incorrect piece', fakeAsync(async() => {
        // select dark piece (but light plays first)
        await testUtils.expectClickFailure('#click_1_1', DvonnFailure.NOT_PLAYER_PIECE());
    }));
    it('should show disconnection precisely', fakeAsync(async() => {
        // Given board with pieces in danger of being disconnected
        const board: Table<DvonnPieceStack> = [
            [__, __, WW, __, __, __, __, __, __, __, __],
            [__, __, D_, W_, W_, __, __, __, __, __, __],
            [__, __, __, __, __, __, __, __, __, __, __],
            [__, __, __, __, __, __, __, __, __, __, __],
            [__, __, __, __, __, __, __, __, __, __, __],
        ];
        testUtils.setupState(new DvonnState(board, 0, false));

        // When doing that disconnection
        await testUtils.expectClickSuccess('#click_3_1');
        const move: DvonnMove = DvonnMove.from(new Coord(3, 1), new Coord(2, 1)).get();
        await testUtils.expectMoveSuccess('#click_2_1', move);

        // Then it should be shown
        testUtils.expectElementToExist('#disconnected_4_1');
    }));
    it('should show disconnection with the right font size', fakeAsync(async() => {
        // Given a board with with pieces in danger of being disconnected
        const board: Table<DvonnPieceStack> = [
            [__, __, WW, __, __, __, __, __, __, __, __],
            [__, __, D_, W_, WW, __, __, __, __, __, __],
            [__, __, __, __, __, __, __, __, __, __, __],
            [__, __, __, __, __, __, __, __, __, __, __],
            [__, __, __, __, __, __, __, __, __, __, __],
        ];
        testUtils.setupState(new DvonnState(board, 0, false));

        // When doing that disconnection
        await testUtils.expectClickSuccess('#click_3_1');
        const move: DvonnMove = DvonnMove.from(new Coord(3, 1), new Coord(2, 1)).get();
        await testUtils.expectMoveSuccess('#click_2_1', move);

        // Then the text size should match with the other pieces
        testUtils.expectElementToHaveClass('#click_2_1 > text', 'text-medium');
        testUtils.expectElementToHaveClass('#disconnected_4_1 > text', 'text-medium');
    }));
    it('should allow clicking twice on a piece to deselect it', fakeAsync(async() => {
        // Given a piece selected by the user
        await testUtils.expectClickSuccess('#click_2_0');
        // When the user clicks a second time on the piece
        testUtils.expectElementToExist('#chosen_2_0');
        await testUtils.expectClickSuccess('#click_2_0');
        // Then it should be deselected
        testUtils.expectElementNotToExist('#chosen_2_0');
    }));
    it('should forbid making non-straight-line move', fakeAsync(async() => {
        // Given that the user has selected a piece
        await testUtils.expectClickSuccess('#click_2_0');
        // When the user selects a invalid destination that is not in a straight line
        // Then it should fail
        await testUtils.expectClickFailure('#click_3_3', DvonnFailure.MUST_MOVE_IN_STRAIGHT_LINE());
    }));
    it('should allow selecting another piece when one is already selected (invalid move)', fakeAsync(async() => {
        // Given a board where the user has selected a piece
        const board: Table<DvonnPieceStack> = [
            [__, __, W_, __, __, __, __, __, __, __, __],
            [__, __, D_, W_, W_, __, __, __, __, __, __],
            [__, __, W_, __, __, __, __, __, __, __, __],
            [__, __, __, __, __, __, __, __, __, __, __],
            [__, __, __, __, __, __, __, __, __, __, __],
        ];
        testUtils.setupState(new DvonnState(board, 0, false));
        await testUtils.expectClickSuccess('#click_2_0');
        // When the user clicks on an invalid destination for this move, that is a valid piece for another move
        await testUtils.expectClickSuccess('#click_4_1');
        // Then it should have change the selection
        testUtils.expectElementNotToExist('#chosen_2_0');
        testUtils.expectElementToExist('#chosen_4_1');
    }));
    it('should allow selecting another piece when one is already selected (illegal move)', fakeAsync(async() => {
        // Given a board where the user has selected a piece
        const board: Table<DvonnPieceStack> = [
            [__, __, W_, __, __, __, __, __, __, __, __],
            [__, __, D_, W_, W_, __, __, __, __, __, __],
            [__, __, W_, __, __, __, __, __, __, __, __],
            [__, __, __, __, __, __, __, __, __, __, __],
            [__, __, __, __, __, __, __, __, __, __, __],
        ];
        testUtils.setupState(new DvonnState(board, 0, false));
        await testUtils.expectClickSuccess('#click_2_0');
        // When the user click on a valid yet illegal destination, that is a valid for another move
        await testUtils.expectClickSuccess('#click_2_2');
        // Then it should have change the selection
        testUtils.expectElementNotToExist('#chosen_2_0');
        testUtils.expectElementToExist('#chosen_2_2');
    }));
});
