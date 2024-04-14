/* eslint-disable max-lines-per-function */
import { EpaminondasMove } from 'src/app/games/epaminondas/EpaminondasMove';
import { EpaminondasState } from 'src/app/games/epaminondas/EpaminondasState';
import { Ordinal } from 'src/app/jscaip/Ordinal';
import { PlayerOrNone } from 'src/app/jscaip/Player';
import { EpaminondasComponent } from '../epaminondas.component';
import { ComponentTestUtils } from 'src/app/utils/tests/TestUtils.spec';
import { fakeAsync } from '@angular/core/testing';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { EpaminondasFailure } from '../EpaminondasFailure';
import { Table } from 'src/app/utils/ArrayUtils';

describe('EpaminondasComponent', () => {

    let testUtils: ComponentTestUtils<EpaminondasComponent>;

    const _: PlayerOrNone = PlayerOrNone.NONE;
    const O: PlayerOrNone = PlayerOrNone.ZERO;
    const X: PlayerOrNone = PlayerOrNone.ONE;

    function expectToBeClickable(x: number, y: number): void {
        testUtils.expectElementToHaveClasses(
            '#clickable-' + x + '-' + y,
            ['no-fill', 'mid-stroke', 'clickable-stroke'],
        );
    }

    function expectToBeCaptured(x: number, y: number): void {
        testUtils.expectElementToHaveClasses(
            '#space-' + x + '-' + y,
            ['base', 'captured-fill'],
        );
    }

    function expectToBeMoved(x: number, y: number): void {
        testUtils.expectElementToHaveClasses(
            '#space-' + x + '-' + y,
            ['base', 'moved-fill'],
        );
    }

    beforeEach(fakeAsync(async() => {
        testUtils = await ComponentTestUtils.forGame<EpaminondasComponent>('Epaminondas');
    }));

    it('should create', () => {
        testUtils.expectToBeCreated();
    });

    describe('first click', () => {

        it('should fail when clicking on empty space at first click', fakeAsync(async() => {
            // Given a board
            // When clicking on an empty space
            // Then it should fail
            await testUtils.expectClickFailure('#click-5-5', RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_EMPTY());
        }));

        it('should fail when clicking on an opponent piece at first click', fakeAsync(async() => {
            // Given a board
            // When clicking on a piece of the opponent
            // Then it should fail
            await testUtils.expectClickFailure('#click-0-0', RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_OPPONENT());
        }));

        it('should show possible next click', fakeAsync(async() => {
            // Given a board
            const board: Table<PlayerOrNone> = [
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [X, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [X, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [O, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [O, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [O, _, _, _, _, _, _, _, _, _, _, _, _, _],
            ];
            const state: EpaminondasState = new EpaminondasState(board, 0);
            await testUtils.setupState(state);

            // When the user clicks on one of its pieces
            await testUtils.expectClickSuccess('#click-0-11');

            // Then the possible move arrow should be displayed
            testUtils.expectElementToExist('#arrow-0-11-to-0-8');
            testUtils.expectElementToExist('#arrow-0-11-to-1-10');
            testUtils.expectElementToExist('#arrow-0-11-to-1-11');
        }));

    });

    describe('second click', () => {

        it('should change selected piece when clicking on non-aligned piece', fakeAsync(async() => {
            // Given a board where a first piece is selected
            await testUtils.expectClickSuccess('#click-0-11');

            // When clicking on another non-aligned piece of current player
            // Then it be selected
            await testUtils.expectClickSuccess('#click-2-10');
            testUtils.expectElementToHaveClasses('#piece-2-10', ['base', 'player0-fill', 'selected-stroke']);
        }));

        it('should cancel move when clicking on non-aligned space', fakeAsync(async() => {
            // Given a board where a first piece is selected
            await testUtils.expectClickSuccess('#click-0-11');
            // When clicking on a non-aligned space
            // Then it should fail
            await testUtils.expectClickFailure('#click-5-9', EpaminondasFailure.SQUARE_NOT_ALIGNED_WITH_PHALANX());
        }));

        it('should move piece one step when clicking on an empty square next to it', fakeAsync(async() => {
            // Given a board with a piece selected
            await testUtils.expectClickSuccess('#click-0-10');
            // When clicking next to the piece on an empty square
            // Then it should succeed as a move
            const move: EpaminondasMove = new EpaminondasMove(0, 10, 1, 1, Ordinal.UP);
            await testUtils.expectMoveSuccess('#click-0-9', move);
        }));

        it('should not move single piece two step', fakeAsync(async() => {
            // Given a board with a piece selected
            await testUtils.expectClickSuccess('#click-0-10');
            // When trying to move the piece by more than one step
            // Then it should fail
            await testUtils.expectClickFailure('#click-0-8', EpaminondasFailure.PHALANX_CANNOT_JUMP_FURTHER_THAN_ITS_SIZE(2, 1));
        }));

        it('should not allow single piece to capture', fakeAsync(async() => {
            // Given a board with groups of pieces head-to-head
            const board: Table<PlayerOrNone> = [
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [X, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [X, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [O, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [O, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [O, _, _, _, _, _, _, _, _, _, _, _, _, _],
            ];
            const state: EpaminondasState = new EpaminondasState(board, 0);
            await testUtils.setupState(state);

            // When trying to move a single piece onto the opponent's group
            const move: EpaminondasMove = new EpaminondasMove(0, 9, 1, 1, Ordinal.UP);
            await testUtils.expectClickSuccess('#click-0-9');

            // Then it should fail
            await testUtils.expectMoveFailure('#click-0-8', EpaminondasFailure.PHALANX_SHOULD_BE_GREATER_TO_CAPTURE(), move);
        }));

        it('should deselect first piece when clicked (and no last piece exist)', fakeAsync(async() => {
            // Given a board where a piece has been selected
            const board: Table<PlayerOrNone> = [
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [X, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [X, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [O, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [O, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [O, _, _, _, _, _, _, _, _, _, _, _, _, _],
            ];
            const state: EpaminondasState = new EpaminondasState(board, 0);
            await testUtils.setupState(state);
            await testUtils.expectClickSuccess('#click-0-11'); // select a piece

            // When clicking on the same piece again
            await testUtils.expectClickSuccess('#click-0-11');

            // Then it should not be selected anymore and any piece is clickable
            expectToBeClickable(0, 11);
            expectToBeClickable(0, 10);
            expectToBeClickable(0, 9);
        }));

    });

    it('should show last move when no move is ongoing (captures, left space, moved phalanx)', fakeAsync(async() => {
        // Given a board
        const board: Table<PlayerOrNone> = [
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [X, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [X, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [O, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [O, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [O, _, _, _, _, _, _, _, _, _, _, _, _, _],
        ];
        const state: EpaminondasState = new EpaminondasState(board, 0);
        await testUtils.setupState(state);

        // When performing a capturing move
        await testUtils.expectClickSuccess('#click-0-11');

        const move: EpaminondasMove = new EpaminondasMove(0, 11, 3, 1, Ordinal.UP);
        await testUtils.expectMoveSuccess('#click-0-8', move);

        // Then it should display what has been captured and moved
        expectToBeCaptured(0, 7);
        expectToBeCaptured(0, 8);
        expectToBeMoved(0, 9);
        expectToBeMoved(0, 10);
        expectToBeMoved(0, 11);
    }));

    it('should not highlight any piece when observing', fakeAsync(async() => {
        // Given a state with clickable pieces and an observer, i.e., when it is not interactive
        testUtils.expectElementToExist('.clickable-stroke');
        testUtils.getGameComponent().setInteractive(false);
        // When displaying the state
        // Then no coordinate should be clickable
        testUtils.expectElementNotToExist('.clickable-stroke');
    }));

});
