/* eslint-disable max-lines-per-function */
import { fakeAsync } from '@angular/core/testing';
import { ComponentTestUtils } from 'src/app/utils/tests/TestUtils.spec';
import { TeekoComponent } from '../teeko.component';
import { PlayerOrNone } from 'src/app/jscaip/Player';
import { Table } from 'src/app/jscaip/TableUtils';
import { TeekoState } from '../TeekoState';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { TeekoDropMove, TeekoMove, TeekoTranslationMove } from '../TeekoMove';
import { Coord } from 'src/app/jscaip/Coord';

describe('TeekoComponent', () => {

    const _: PlayerOrNone = PlayerOrNone.NONE;
    const O: PlayerOrNone = PlayerOrNone.ZERO;
    const X: PlayerOrNone = PlayerOrNone.ONE;

    let testUtils: ComponentTestUtils<TeekoComponent>;

    beforeEach(fakeAsync(async() => {
        testUtils = await ComponentTestUtils.forGame<TeekoComponent>('Teeko');
    }));

    it('should create', () => {
        testUtils.expectToBeCreated();
    });

    describe('drop phase', () => {

        it('should fail when clicking on occupied space', fakeAsync(async() => {
            // Given any component in drop phase with present pieces
            const board: Table<PlayerOrNone> = [
                [_, _, _, _, _],
                [_, _, _, _, _],
                [_, _, O, _, _],
                [_, _, _, _, _],
                [_, _, _, _, _],
            ];
            const state: TeekoState = new TeekoState(board, 1);
            await testUtils.setupState(state);

            // When clicking on the occupied space
            const move: TeekoDropMove = TeekoDropMove.from(new Coord(2, 2)).get();

            // Then the move should be illegal
            const reason: string = RulesFailure.MUST_LAND_ON_EMPTY_SPACE();
            await testUtils.expectMoveFailure('#click_2_2', reason, move);
        }));

        it('should drop when clicking on empty space', fakeAsync(async() => {
            // Given any board of drop phase
            // When clicking on empty space
            const move: TeekoMove = TeekoDropMove.from(new Coord(2, 2)).get();

            // Then it should succeed
            await testUtils.expectMoveSuccess('#click_2_2', move);
        }));

        it('should highlight the last piece dropped', fakeAsync(async() => {
            // Given a board with a last move that is a drop
            const move: TeekoMove = TeekoDropMove.from(new Coord(2, 2)).get();
            await testUtils.expectMoveSuccess('#click_2_2', move);
            // When rendering the board
            // Then the last move should be highlighted
            testUtils.expectElementToHaveClasses('#piece_2_2', ['base', 'player0-fill', 'last-move-stroke']);
        }));

    });

    describe('translation phase', () => {

        describe('first click', () => {

            it('should fail when clicking on empty space', fakeAsync(async() => {
                // Given any board in translation phase
                const board: Table<PlayerOrNone> = [
                    [O, X, _, _, _],
                    [O, O, _, _, _],
                    [X, X, _, _, _],
                    [X, O, _, _, _],
                    [_, _, _, _, _],
                ];
                const state: TeekoState = new TeekoState(board, 8);
                await testUtils.setupState(state);

                // When clicking on empty space
                // Then it should fail
                const reason: string = RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_EMPTY();
                await testUtils.expectClickFailure('#click_2_2', reason);
            }));

            it('should fail when clicking on opponent piece', fakeAsync(async() => {
                // Given any board in translation phase
                const board: Table<PlayerOrNone> = [
                    [O, X, _, _, _],
                    [O, O, _, _, _],
                    [X, X, _, _, _],
                    [X, O, _, _, _],
                    [_, _, _, _, _],
                ];
                const state: TeekoState = new TeekoState(board, 8);
                await testUtils.setupState(state);

                // When clicking on opponent piece
                // Then it should fail
                const reason: string = RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_OPPONENT();
                await testUtils.expectClickFailure('#click_0_3', reason);
            }));

            it('should mark as selected the player clicked piece', fakeAsync(async() => {
                // Given any board in translation phase
                const board: Table<PlayerOrNone> = [
                    [O, X, _, _, _],
                    [O, O, _, _, _],
                    [X, X, _, _, _],
                    [X, O, _, _, _],
                    [_, _, _, _, _],
                ];
                const state: TeekoState = new TeekoState(board, 8);
                await testUtils.setupState(state);

                // When selecting a valid piece
                await testUtils.expectClickSuccess('#click_0_0');

                // Then it should be shown as selected
                testUtils.expectElementToHaveClasses('#piece_0_0', ['base', 'player0-fill', 'selected-stroke']);
            }));

        });

        describe('second click', () => {

            it('should deselect piece when clicking a second time on it', fakeAsync(async() => {
                // Given any board in translation phase with a selected piece
                const board: Table<PlayerOrNone> = [
                    [O, X, _, _, _],
                    [O, O, _, _, _],
                    [X, X, _, _, _],
                    [X, O, _, _, _],
                    [_, _, _, _, _],
                ];
                const state: TeekoState = new TeekoState(board, 8);
                await testUtils.setupState(state);
                await testUtils.expectClickSuccess('#click_0_0');
                testUtils.expectElementToHaveClass('#piece_0_0', 'selected-stroke');

                // When clicking on it again
                await testUtils.expectClickFailure('#click_0_0');

                // Then it should no longer be selected
                testUtils.expectElementNotToHaveClass('#piece_0_0', 'selected-stroke');
            }));

            it('should do the move when clicking on empty space', fakeAsync(async() => {
                // Given any board in translation phase with a selected piece
                const board: Table<PlayerOrNone> = [
                    [O, X, _, _, _],
                    [O, O, _, _, _],
                    [X, X, _, _, _],
                    [X, O, _, _, _],
                    [_, _, _, _, _],
                ];
                const state: TeekoState = new TeekoState(board, 8);
                await testUtils.setupState(state);
                await testUtils.expectClickSuccess('#click_1_1');

                // When clicking on legal landing space
                const move: TeekoMove = TeekoTranslationMove.from(new Coord(1, 1), new Coord(2, 1)).get();

                // Then it should succeed
                await testUtils.expectMoveSuccess('#click_2_1', move);
            }));

            it('should fail when doing illegal move', fakeAsync(async() => {
                // Given any board in translation phase with a selected piece
                const board: Table<PlayerOrNone> = [
                    [O, X, _, _, _],
                    [O, O, _, _, _],
                    [X, X, _, _, _],
                    [X, O, _, _, _],
                    [_, _, _, _, _],
                ];
                const state: TeekoState = new TeekoState(board, 8);
                await testUtils.setupState(state);
                await testUtils.expectClickSuccess('#click_0_0');

                // When clicking on an invalid landing space
                // Then the move should be illegal
                const reason: string = RulesFailure.MUST_LAND_ON_EMPTY_SPACE();
                const move: TeekoTranslationMove = TeekoTranslationMove.from(new Coord(0, 0), new Coord(1, 1)).get();
                await testUtils.expectMoveFailure('#click_1_1', reason, move);
            }));

            it('should show starting coord and landing coord after move', fakeAsync(async() => {
                // Given any board in translation phase with a selected piece
                const board: Table<PlayerOrNone> = [
                    [O, X, _, _, _],
                    [O, O, _, _, _],
                    [X, X, _, _, _],
                    [X, O, _, _, _],
                    [_, _, _, _, _],
                ];
                const state: TeekoState = new TeekoState(board, 8);
                await testUtils.setupState(state);
                await testUtils.expectClickSuccess('#click_1_1');

                // When finishing the move legally
                const move: TeekoMove = TeekoTranslationMove.from(new Coord(1, 1), new Coord(2, 1)).get();
                await testUtils.expectMoveSuccess('#click_2_1', move);

                // Then it should display starting coord and landing coord as moved
                testUtils.expectElementToHaveClasses('#space_1_1', ['base', 'moved-fill']);
                testUtils.expectElementToHaveClasses('#space_2_1', ['base', 'moved-fill']);
                // And display the piece as last-move
                testUtils.expectElementToHaveClasses('#piece_2_1', ['base', 'player0-fill', 'last-move-stroke']);
            }));

            it('should show victory coords when alignment', fakeAsync(async() => {
                // Given any board in translation phase
                const board: Table<PlayerOrNone> = [
                    [O, X, _, _, _],
                    [_, O, _, _, _],
                    [X, X, O, _, _],
                    [X, _, O, _, _],
                    [_, _, _, _, _],
                ];
                const state: TeekoState = new TeekoState(board, 8);
                await testUtils.setupState(state);

                // When translating piece into victory
                const move: TeekoMove = TeekoTranslationMove.from(new Coord(2, 3), new Coord(3, 3)).get();
                await testUtils.expectClickSuccess('#click_2_3');
                await testUtils.expectMoveSuccess('#click_3_3', move);

                // Then the four victory pieces should be highlighted
                testUtils.expectElementToHaveClasses('#piece_0_0', ['base', 'player0-fill', 'victory-stroke']);
                testUtils.expectElementToHaveClasses('#piece_1_1', ['base', 'player0-fill', 'victory-stroke']);
                testUtils.expectElementToHaveClasses('#piece_2_2', ['base', 'player0-fill', 'victory-stroke']);
                testUtils.expectElementToHaveClasses('#piece_3_3', ['base', 'player0-fill', 'victory-stroke']);
            }));

            it('should show victory coords when squaring coord', fakeAsync(async() => {
                // Given any board in translation phase
                const board: Table<PlayerOrNone> = [
                    [O, O, _, _, _],
                    [O, _, _, _, _],
                    [X, X, O, _, _],
                    [X, _, _, _, _],
                    [X, _, _, _, _],
                ];
                const state: TeekoState = new TeekoState(board, 8);
                await testUtils.setupState(state);

                // When translating piece into victory
                const move: TeekoMove = TeekoTranslationMove.from(new Coord(2, 2), new Coord(1, 1)).get();
                await testUtils.expectClickSuccess('#click_2_2');
                await testUtils.expectMoveSuccess('#click_1_1', move);

                // Then the four victory pieces should be highlighted
                testUtils.expectElementToHaveClasses('#piece_0_0', ['base', 'player0-fill', 'victory-stroke']);
                testUtils.expectElementToHaveClasses('#piece_0_1', ['base', 'player0-fill', 'victory-stroke']);
                testUtils.expectElementToHaveClasses('#piece_1_0', ['base', 'player0-fill', 'victory-stroke']);
                testUtils.expectElementToHaveClasses('#piece_1_1', ['base', 'player0-fill', 'victory-stroke']);
            }));

        });

    });

});
