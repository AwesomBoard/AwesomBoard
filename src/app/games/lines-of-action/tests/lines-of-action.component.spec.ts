/* eslint-disable max-lines-per-function */
import { fakeAsync } from '@angular/core/testing';
import { Coord } from 'src/app/jscaip/Coord';
import { PlayerOrNone } from 'src/app/jscaip/Player';
import { ComponentTestUtils } from 'src/app/utils/tests/TestUtils.spec';
import { LinesOfActionComponent } from '../lines-of-action.component';
import { LinesOfActionMove } from '../LinesOfActionMove';
import { LinesOfActionFailure } from '../LinesOfActionFailure';
import { LinesOfActionState } from '../LinesOfActionState';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { Table } from 'src/app/jscaip/TableUtils';
import { DirectionFailure } from 'src/app/jscaip/Direction';
import { LinesOfActionRules } from '../LinesOfActionRules';

describe('LinesOfActionComponent', () => {

    let testUtils: ComponentTestUtils<LinesOfActionComponent>;
    const _: PlayerOrNone = PlayerOrNone.NONE;
    const O: PlayerOrNone = PlayerOrNone.ZERO;
    const X: PlayerOrNone = PlayerOrNone.ONE;

    beforeEach(fakeAsync(async() => {
        testUtils = await ComponentTestUtils.forGame<LinesOfActionComponent>('LinesOfAction');
    }));

    it('should create', () => {
        testUtils.expectToBeCreated();
    });

    describe('First click', () => {

        it('should forbid selecting a piece that has no valid targets', fakeAsync(async() => {
            const board: Table<PlayerOrNone> = [
                [X, O, O, O, O, O, O, _],
                [O, O, _, _, _, _, _, X],
                [X, _, _, _, _, _, _, _],
                [X, _, _, _, _, _, _, X],
                [X, _, _, _, _, _, _, X],
                [X, _, _, _, _, _, _, X],
                [X, _, _, _, _, _, _, X],
                [_, O, _, O, O, O, O, _],
            ];
            const state: LinesOfActionState = new LinesOfActionState(board, 1);
            await testUtils.setupState(state);

            await testUtils.expectClickFailure('#click_0_0', LinesOfActionFailure.PIECE_CANNOT_MOVE());
        }));

        it('should forbid selecting an empty piece', fakeAsync(async() => {
            await testUtils.expectClickFailure('#click_2_2', RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_EMPTY());
        }));

        it('should forbid selecting a piece of the opponent', fakeAsync(async() => {
            await testUtils.expectClickFailure('#click_0_2', RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_OPPONENT());
        }));

        it('should show selected piece', fakeAsync(async() => {
            // Given any board
            // When clicking on a piece of the user
            await testUtils.expectClickSuccess('#click_2_0');

            // Then the piece should be shown as selected
            testUtils.expectElementToHaveClass('#piece_2_0', 'selected-stroke');
        }));
    });

    describe('Second click', () => {

        it('should allow a simple move', fakeAsync(async() => {
            await testUtils.expectClickSuccess('#click_2_0');
            const move: LinesOfActionMove = LinesOfActionMove.from(new Coord(2, 0), new Coord(2, 2)).get();
            await testUtils.expectMoveSuccess('#click_2_2', move);
        }));

        it('should forbid moving in an invalid direction', fakeAsync(async() => {
            await testUtils.expectClickSuccess('#click_2_0');
            await testUtils.expectClickFailure('#click_4_5', DirectionFailure.DIRECTION_MUST_BE_LINEAR());
        }));

        it('should show last move spaces', fakeAsync(async() => {
            await testUtils.expectClickSuccess('#click_2_0');
            const move: LinesOfActionMove = LinesOfActionMove.from(new Coord(2, 0), new Coord(2, 2)).get();
            await testUtils.expectMoveSuccess('#click_2_2', move);

            const component: LinesOfActionComponent = testUtils.getGameComponent();
            expect(component.getSquareClasses(2, 2)).toEqual(['moved-fill']);
            expect(component.getSquareClasses(2, 0)).toEqual(['moved-fill']);
        }));

        it('should show captures', fakeAsync(async() => {
            const board: Table<PlayerOrNone> = [
                [X, O, O, O, O, O, O, O],
                [_, _, _, _, _, _, _, X],
                [_, _, X, _, _, _, _, _],
                [X, _, _, _, _, _, _, X],
                [X, _, _, _, _, _, _, X],
                [X, _, _, _, _, _, _, X],
                [X, _, _, _, _, _, _, X],
                [_, O, _, O, O, O, O, _],
            ];
            const state: LinesOfActionState = new LinesOfActionState(board, 0);
            await testUtils.setupState(state);

            await testUtils.expectClickSuccess('#click_2_0');
            const move: LinesOfActionMove = LinesOfActionMove.from(new Coord(2, 0), new Coord(2, 2)).get();
            await testUtils.expectMoveSuccess('#click_2_2', move);

            const component: LinesOfActionComponent = testUtils.getGameComponent();
            expect(component.getSquareClasses(2, 2)).toEqual(['captured-fill']);
        }));

        it('should change selected piece when clicking another piece', fakeAsync(async() => {
            // Given a board on which you have a selected piece
            await testUtils.expectClickSuccess('#click_2_0');

            // When clicking on another one
            await testUtils.expectClickSuccess('#click_3_0');

            // Then the secondly clicked coord should be selected
            testUtils.expectElementToHaveClass('#piece_3_0', 'selected-stroke');
            // And the previous one no longer
            testUtils.expectElementNotToHaveClass('#piece_2_0', 'selected-stroke');
        }));

        it('should deselect piece when clicking a second time on it', fakeAsync(async() => {
            // Given any board with a piece selected
            await testUtils.expectClickSuccess('#click_2_0');

            // When clicking on that piece again
            await testUtils.expectClickFailure('#click_2_0');

            // Then it should no longer be selected
            testUtils.expectElementNotToHaveClass('#piece_2_0', 'selected-stroke');
        }));
    });

    it('should hide first move when taking back', fakeAsync(async() => {
        // Given a state with a first move done
        const board: Table<PlayerOrNone> = [
            [_, O, _, O, O, O, O, _],
            [X, _, _, _, _, _, _, X],
            [X, _, O, _, _, _, _, X],
            [X, _, _, _, _, _, _, X],
            [X, _, _, _, _, _, _, X],
            [X, _, _, _, _, _, _, X],
            [X, _, _, _, _, _, _, X],
            [_, O, O, O, O, O, O, _],
        ];
        const state: LinesOfActionState = new LinesOfActionState(board, 1);
        const previousMove: LinesOfActionMove = LinesOfActionMove.from(new Coord(2, 0), new Coord(2, 2)).get();
        const previousState: LinesOfActionState = LinesOfActionRules.get().getInitialState();
        await testUtils.setupState(state, { previousState, previousMove });

        // When taking it back
        await testUtils.expectInterfaceClickSuccess('#take-back');

        // Then no highlight should be found
        testUtils.expectElementNotToHaveClass('#space_2_0', 'moved-fill');
        testUtils.expectElementNotToHaveClass('#space_2_2', 'moved-fill');
    }));
});
