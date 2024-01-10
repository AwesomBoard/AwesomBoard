/* eslint-disable max-lines-per-function */
import { fakeAsync } from '@angular/core/testing';
import { Player } from 'src/app/jscaip/Player';
import { ComponentTestUtils } from 'src/app/utils/tests/TestUtils.spec';
import { ApagosComponent } from '../apagos.component';
import { ApagosCoord } from '../ApagosCoord';
import { ApagosFailure } from '../ApagosFailure';
import { ApagosMove } from '../ApagosMove';
import { ApagosState } from '../ApagosState';
import { ApagosRules } from '../ApagosRules';

describe('ApagosComponent', () => {

    let testUtils: ComponentTestUtils<ApagosComponent>;

    beforeEach(fakeAsync(async() => {
        testUtils = await ComponentTestUtils.forGame<ApagosComponent>('Apagos');
    }));

    describe('show last move', () => {

        it('should show only legal drop arrows', fakeAsync(async() => {
            // Given a board where some square are selectable and some not, some square can receive drop some don't
            const state: ApagosState = ApagosState.fromRepresentation(8, [
                [0, 0, 0, 1],
                [0, 0, 1, 0],
                [7, 5, 3, 1],
            ], 5, 5);

            // When rendering the board
            await testUtils.setupState(state);

            // Then only the valid drop should be shown
            testUtils.expectElementToExist('#dropArrow_zero_0');
            testUtils.expectElementToExist('#dropArrow_one_0');
            testUtils.expectElementToExist('#dropArrow_zero_1');
            testUtils.expectElementToExist('#dropArrow_one_1');
            testUtils.expectElementToExist('#dropArrow_zero_2');
            testUtils.expectElementToExist('#dropArrow_one_2');

            // and the invalid one should not be shown
            testUtils.expectElementNotToExist('#dropArrow_zero_3');
            testUtils.expectElementNotToExist('#dropArrow_one_3');
        }));

        it('should show switched squares', fakeAsync(async() => {
            // Given a board with a previous move being a drop
            const previousState: ApagosState = ApagosState.fromRepresentation(1, [
                [2, 1, 0, 0],
                [5, 0, 0, 0],
                [7, 3, 5, 1],
            ], 5, 5);
            const previousMove: ApagosMove = ApagosMove.drop(ApagosCoord.ONE, Player.ZERO);
            const state: ApagosState = ApagosState.fromRepresentation(2, [
                [2, 0, 2, 0],
                [5, 0, 0, 0],
                [7, 5, 3, 1],
            ], 6, 5);

            // When rendering the board
            await testUtils.setupState(state, { previousState, previousMove });

            // Then the switch square should be shown as last move
            testUtils.expectElementToHaveClass('#square_1', 'last-move-stroke');
            testUtils.expectElementToHaveClass('#square_2', 'last-move-stroke');
        }));

        it('should show from where the last transfer came from Player.ZERO', fakeAsync(async() => {
            // Given a board with a previous move being a transfer
            const previousState: ApagosState = ApagosState.fromRepresentation(2, [
                [0, 0, 0, 3],
                [1, 0, 0, 2],
                [7, 3, 1, 5],
            ], 6, 5);
            const previousMove: ApagosMove = ApagosMove.transfer(ApagosCoord.THREE, ApagosCoord.ZERO).get();
            const state: ApagosState = ApagosState.fromRepresentation(3, [
                [1, 0, 0, 2],
                [1, 0, 0, 2],
                [7, 3, 1, 5],
            ], 6, 5);

            // When rendering the board
            await testUtils.setupState(state, { previousState, previousMove });

            // Then piece 2 should be "captured" as a left piece, belonging to no one
            testUtils.expectElementNotToHaveClass('#square_3_piece_2_out_of_5', 'player0-fill');
            testUtils.expectElementNotToHaveClass('#square_3_piece_2_out_of_5', 'player1-fill');
            testUtils.expectElementToHaveClass('#square_3_piece_2_out_of_5', 'captured-stroke');
            // and piece 3 should be untouched
            testUtils.expectElementToHaveClass('#square_3_piece_3_out_of_5', 'player1-fill');
        }));

        it('should show from where the last transfer came from Player.ONE', fakeAsync(async() => {
            // Given a board with a previous move being a transfer
            const previousState: ApagosState = ApagosState.fromRepresentation(1, [
                [0, 0, 0, 1],
                [1, 0, 0, 2],
                [7, 3, 1, 5],
            ], 6, 5);
            const previousMove: ApagosMove = ApagosMove.transfer(ApagosCoord.THREE, ApagosCoord.ZERO).get();
            const state: ApagosState = ApagosState.fromRepresentation(2, [
                [1, 0, 0, 1],
                [2, 0, 0, 1],
                [7, 3, 1, 5],
            ], 6, 5);

            // When rendering the board
            await testUtils.setupState(state, { previousState, previousMove });

            // Then piece 1 should be "captured" as a left piece, belonging to no one
            testUtils.expectElementNotToHaveClass('#square_3_piece_3_out_of_5', 'player0-fill');
            testUtils.expectElementNotToHaveClass('#square_3_piece_3_out_of_5', 'player1-fill');
            testUtils.expectElementToHaveClass('#square_3_piece_3_out_of_5', 'captured-stroke');
        }));

        it('should show last dropped piece (from drop by Player.ZERO)', fakeAsync(async() => {
            // Given a board with a previous drop by Player.ZERO
            const previousState: ApagosState = ApagosRules.get().getInitialState();
            const previousMove: ApagosMove = ApagosMove.drop(ApagosCoord.ONE, Player.ONE);
            const state: ApagosState = ApagosState.fromRepresentation(1, [
                [0, 0, 0, 1],
                [0, 0, 0, 0],
                [7, 5, 3, 1],
            ], 9, 10);

            // When rendering the board
            await testUtils.setupState(state, { previousState, previousMove });

            // Then the third square should be filled on top by Player.ZERO
            testUtils.expectElementToHaveClass('#square_3_piece_0_out_of_1', 'player0-fill');
        }));

        it('should show last dropped piece (from drop on righmost coord)', fakeAsync(async() => {
            // Given a board with a previous drop by Player.ZERO
            const previousState: ApagosState = ApagosRules.get().getInitialState();
            const previousMove: ApagosMove = ApagosMove.drop(ApagosCoord.THREE, Player.ZERO);
            const state: ApagosState = ApagosState.fromRepresentation(1, [
                [0, 0, 0, 1],
                [0, 0, 0, 0],
                [7, 5, 3, 1],
            ], 9, 10);

            // When rendering the board
            await testUtils.setupState(state, { previousState, previousMove });

            // Then the third square should be filled on top by Player.ZERO
            testUtils.expectElementToHaveClass('#square_3_piece_0_out_of_1', 'player0-fill');
        }));

        it('should show last dropped piece (from transfer by Player.ONE)', fakeAsync(async() => {
            // Given a board with a previous drop by Player.ZERO
            const previousState: ApagosState = ApagosState.fromRepresentation(1, [
                [0, 0, 0, 0],
                [0, 0, 0, 1],
                [7, 5, 3, 1],
            ], 9, 10);
            const previousMove: ApagosMove = ApagosMove.transfer(ApagosCoord.THREE, ApagosCoord.ONE).get();
            const state: ApagosState = ApagosState.fromRepresentation(2, [
                [0, 0, 0, 0],
                [0, 1, 0, 0],
                [7, 5, 3, 1],
            ], 9, 10);

            // When rendering the board
            await testUtils.setupState(state, { previousState, previousMove });

            // Then the second square should be filled on last emplacement by Player.ONE
            testUtils.expectElementToHaveClass('#square_1_piece_4_out_of_5', 'player1-fill');
            testUtils.expectElementToHaveClass('#square_1_piece_4_out_of_5', 'last-move-stroke');
        }));
    });

    it('should cancel move when starting move attempt by clicking a square without pieces of player', fakeAsync(async() => {
        // Given a board with a square with piece of your opponent
        const state: ApagosState = ApagosState.fromRepresentation(1, [
            [0, 0, 1, 0],
            [0, 0, 0, 0],
            [7, 5, 3, 1],
        ], 5, 5);
        await testUtils.setupState(state);
        // When clicking on that square
        // Then click should fail
        const reason: string = ApagosFailure.NO_PIECE_OF_YOU_IN_CHOSEN_SQUARE();
        await testUtils.expectClickFailure('#square_2', reason);
    }));

    it('should drop when clicking on arrow above square', fakeAsync(async() => {
        // Given the initial board

        // When clicking on the light arrow above the second square
        // Then the move should have been a success
        const move: ApagosMove = ApagosMove.drop(ApagosCoord.ONE, Player.ONE);
        await testUtils.expectMoveSuccess('#dropArrow_one_1', move);
    }));

    it('should select piece when clicking on square and show only legal following slide', fakeAsync(async() => {
        // Given a board, turn for Player.ZERO, with one of his piece in square 2, and square 0 full
        const state: ApagosState = ApagosState.fromRepresentation(2, [
            [2, 0, 2, 0],
            [5, 0, 0, 0],
            [7, 5, 3, 1],
        ], 5, 5);
        await testUtils.setupState(state);

        // When clicking on square 2
        await testUtils.expectClickSuccess('#square_2');

        // Then only "Player.ZERO drop" on square 1 should be displayed
        testUtils.expectElementNotToExist('#dropArrow_zero_0');
        testUtils.expectElementNotToExist('#dropArrow_one_0');
        testUtils.expectElementToExist('#dropArrow_zero_1'); // all but this one
        testUtils.expectElementNotToExist('#dropArrow_one_1');
        testUtils.expectElementNotToExist('#dropArrow_zero_2');
        testUtils.expectElementNotToExist('#dropArrow_one_2');
        testUtils.expectElementNotToExist('#dropArrow_zero_3');
        testUtils.expectElementNotToExist('#dropArrow_one_3');
        // and square 2 should be selected
        testUtils.expectElementToHaveClass('#square_2', 'selected-stroke');
        testUtils.expectElementToHaveClass('#square_2_piece_1_out_of_3', 'selected-stroke');
    }));

    it('should confirm slide down by clicking on a dropping arrow', fakeAsync(async() => {
        // Given a board where a square has been selected
        const state: ApagosState = ApagosState.fromRepresentation(2, [
            [2, 0, 2, 0],
            [5, 0, 0, 0],
            [7, 5, 3, 1],
        ], 5, 5);
        await testUtils.setupState(state);
        await testUtils.expectClickSuccess('#square_2');

        // When clicking on a drop arrow (#dropArrow_zero_1)
        // Then the move should have been done
        const move: ApagosMove = ApagosMove.transfer(ApagosCoord.TWO, ApagosCoord.ONE).get();
        await testUtils.expectMoveSuccess('#dropArrow_zero_1', move);
    }));

    it('should cancel move when clicking on squares twice in a row', fakeAsync(async() => {
        // Given a board with a selected square
        const state: ApagosState = ApagosState.fromRepresentation(2, [
            [2, 0, 2, 1],
            [5, 0, 0, 0],
            [7, 5, 3, 1],
        ], 5, 5);
        await testUtils.setupState(state);
        await testUtils.expectClickSuccess('#square_2');
        testUtils.expectElementToHaveClass('#square_2', 'selected-stroke');

        // When clicking on the same square
        await testUtils.expectClickSuccess('#square_2');

        // Then the piece should have lost its selected style
        testUtils.expectElementNotToHaveClass('#square_2', 'selected-stroke');
    }));

    it('should change selected square when clicking on a square with one already selected', fakeAsync(async() => {
        // Given a board with a selected square
        const state: ApagosState = ApagosState.fromRepresentation(2, [
            [1, 1, 2, 1],
            [5, 1, 0, 0],
            [7, 5, 3, 1],
        ], 5, 5);
        await testUtils.setupState(state);
        await testUtils.expectClickSuccess('#square_2');

        // When clicking another VALID square
        // Then the move should not have been canceled
        await testUtils.expectClickSuccess('#square_1');
    }));

    it('should not allow to select leftmost space for transfer', fakeAsync(async() => {
        // Given a board with leftmost space not empty
        const state: ApagosState = ApagosState.fromRepresentation(2, [
            [2, 2, 2, 1],
            [5, 3, 0, 0],
            [7, 5, 3, 1],
        ], 5, 5);
        await testUtils.setupState(state);

        // When clicking on leftmost space
        // Then click should fail
        const reason: string = ApagosFailure.NO_POSSIBLE_TRANSFER_REMAINS();
        await testUtils.expectClickFailure('#square_1', reason);
    }));

    it('should not show arrow when player has no longer pieces', fakeAsync(async() => {
        // Given a board where all piece could receive a drop but no piece are remaining
        const state: ApagosState = ApagosState.fromRepresentation(2, [
            [3, 2, 1, 1],
            [3, 2, 1, 0],
            [7, 5, 3, 1],
        ], 0, 0);

        // When rendering the board
        await testUtils.setupState(state);

        // Then no arrow should be displayed
        testUtils.expectElementNotToExist('#dropArrow_zero_0');
        testUtils.expectElementNotToExist('#dropArrow_one_0');
        testUtils.expectElementNotToExist('#dropArrow_zero_1');
        testUtils.expectElementNotToExist('#dropArrow_one_1');
        testUtils.expectElementNotToExist('#dropArrow_zero_2');
        testUtils.expectElementNotToExist('#dropArrow_one_2');
        testUtils.expectElementNotToExist('#dropArrow_zero_3');
        testUtils.expectElementNotToExist('#dropArrow_one_3');
    }));
});
