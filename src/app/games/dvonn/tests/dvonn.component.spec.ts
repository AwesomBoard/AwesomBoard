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
import { Table } from 'src/app/jscaip/TableUtils';

describe('DvonnComponent', () => {

    let testUtils: ComponentTestUtils<DvonnComponent>;

    const __: DvonnPieceStack = DvonnPieceStack.EMPTY;
    const S_: DvonnPieceStack = DvonnPieceStack.SOURCE;
    const O_: DvonnPieceStack = DvonnPieceStack.PLAYER_ZERO;
    const OO: DvonnPieceStack = new DvonnPieceStack(Player.ZERO, 2, false);
    const OK: DvonnPieceStack = new DvonnPieceStack(Player.ZERO, 10, false);
    const OS: DvonnPieceStack = DvonnPieceStack.append(OK, S_);

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
        await testUtils.expectClickSuccess('#click-2-0');
        // When the user selects a valid destination
        // Then the move should be made
        const move: DvonnMove = DvonnMove.from(new Coord(2, 0), new Coord(2, 1)).get();
        await testUtils.expectMoveSuccess('#click-2-1', move);
    }));

    it('should allow to pass if stuck position', fakeAsync(async() => {
        // Given a state where the player can't make a move
        const board: Table<DvonnPieceStack> = [
            [__, __, OO, __, __, __, __, __, __, __, __],
            [__, __, S_, __, __, __, __, __, __, __, __],
            [__, __, __, __, __, __, __, __, __, __, __],
            [__, __, __, __, __, __, __, __, __, __, __],
            [__, __, __, __, __, __, __, OS, OK, __, __],
        ];
        const state: DvonnState = new DvonnState(board, 0, false);
        // When it is displayed
        await testUtils.setupState(state);
        // Then the player can pass
        const move: DvonnMove = DvonnMove.PASS;
        await testUtils.expectPassSuccess(move);
    }));

    it('should forbid choosing an incorrect piece', fakeAsync(async() => {
        // select dark piece (but light plays first)
        await testUtils.expectClickFailure('#click-1-1', DvonnFailure.NOT_PLAYER_PIECE());
    }));

    it('should show disconnection precisely', fakeAsync(async() => {
        // Given board with pieces in danger of being disconnected
        const board: Table<DvonnPieceStack> = [
            [__, __, OO, __, __, __, __, __, __, __, __],
            [__, __, S_, O_, O_, __, __, __, __, __, __],
            [__, __, __, __, __, __, __, __, __, __, __],
            [__, __, __, __, __, __, __, __, __, __, __],
            [__, __, __, __, __, __, __, __, __, __, __],
        ];
        const state: DvonnState = new DvonnState(board, 0, false);
        await testUtils.setupState(state);

        // When doing that disconnection
        await testUtils.expectClickSuccess('#click-3-1');
        const move: DvonnMove = DvonnMove.from(new Coord(3, 1), new Coord(2, 1)).get();
        await testUtils.expectMoveSuccess('#click-2-1', move);

        // Then it should be shown
        testUtils.expectElementToExist('#disconnected-4-1');
    }));

    it('should show disconnection with the right font size', fakeAsync(async() => {
        // Given a board with with pieces in danger of being disconnected
        const board: Table<DvonnPieceStack> = [
            [__, __, OO, __, __, __, __, __, __, __, __],
            [__, __, S_, O_, OO, __, __, __, __, __, __],
            [__, __, __, __, __, __, __, __, __, __, __],
            [__, __, __, __, __, __, __, __, __, __, __],
            [__, __, __, __, __, __, __, __, __, __, __],
        ];
        const state: DvonnState = new DvonnState(board, 0, false);
        await testUtils.setupState(state);

        // When doing that disconnection
        await testUtils.expectClickSuccess('#click-3-1');
        const move: DvonnMove = DvonnMove.from(new Coord(3, 1), new Coord(2, 1)).get();
        await testUtils.expectMoveSuccess('#click-2-1', move);

        // Then the text size should match with the other pieces
        testUtils.expectElementToHaveClass('#click-2-1 > text', 'text-medium');
        testUtils.expectElementToHaveClass('#disconnected-4-1 > text', 'text-medium');
    }));

    it('should allow clicking twice on a piece to deselect it', fakeAsync(async() => {
        // Given a piece selected by the user
        await testUtils.expectClickSuccess('#click-2-0');

        // When the user clicks a second time on the piece
        testUtils.expectElementToExist('#chosen-2-0');
        await testUtils.expectClickFailure('#click-2-0');

        // Then it should be deselected
        testUtils.expectElementNotToExist('#chosen-2-0');
    }));

    it('should forbid making non-straight-line move', fakeAsync(async() => {
        // Given that the user has selected a piece
        await testUtils.expectClickSuccess('#click-2-0');

        // When the user selects an invalid destination that is not in a straight line
        // Then it should fail
        await testUtils.expectClickFailure('#click-3-3', DvonnFailure.MUST_MOVE_IN_STRAIGHT_LINE());
    }));

    it('should allow selecting another piece when one is already selected (invalid move)', fakeAsync(async() => {
        // Given a board where the user has selected a piece
        const board: Table<DvonnPieceStack> = [
            [__, __, O_, __, __, __, __, __, __, __, __],
            [__, __, S_, O_, O_, __, __, __, __, __, __],
            [__, __, O_, __, __, __, __, __, __, __, __],
            [__, __, __, __, __, __, __, __, __, __, __],
            [__, __, __, __, __, __, __, __, __, __, __],
        ];
        const state: DvonnState = new DvonnState(board, 0, false);
        await testUtils.setupState(state);
        await testUtils.expectClickSuccess('#click-2-0');
        // When the user clicks on an invalid destination for this move, that is a valid piece for another move
        await testUtils.expectClickSuccess('#click-4-1');
        // Then it should have change the selection
        testUtils.expectElementNotToExist('#chosen-2-0');
        testUtils.expectElementToExist('#chosen-4-1');
    }));

    it('should allow selecting another piece when one is already selected (illegal move)', fakeAsync(async() => {
        // Given a board where the user has selected a piece
        const board: Table<DvonnPieceStack> = [
            [__, __, O_, __, __, __, __, __, __, __, __],
            [__, __, S_, O_, O_, __, __, __, __, __, __],
            [__, __, O_, __, __, __, __, __, __, __, __],
            [__, __, __, __, __, __, __, __, __, __, __],
            [__, __, __, __, __, __, __, __, __, __, __],
        ];
        const state: DvonnState = new DvonnState(board, 0, false);
        await testUtils.setupState(state);
        await testUtils.expectClickSuccess('#click-2-0');
        // When the user click on a valid yet illegal destination, that is a valid for another move
        await testUtils.expectClickSuccess('#click-2-2');
        // Then it should have change the selection
        testUtils.expectElementNotToExist('#chosen-2-0');
        testUtils.expectElementToExist('#chosen-2-2');
    }));
});
