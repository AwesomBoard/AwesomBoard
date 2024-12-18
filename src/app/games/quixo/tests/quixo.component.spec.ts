/* eslint-disable max-lines-per-function */
import { fakeAsync } from '@angular/core/testing';
import { QuixoComponent } from '../quixo.component';
import { QuixoMove } from 'src/app/games/quixo/QuixoMove';
import { Orthogonal } from 'src/app/jscaip/Orthogonal';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { ComponentTestUtils } from 'src/app/utils/tests/TestUtils.spec';
import { Table } from 'src/app/jscaip/TableUtils';
import { PlayerOrNone } from 'src/app/jscaip/Player';
import { QuixoState } from 'src/app/games/quixo/QuixoState';
import { QuixoFailure } from 'src/app/games/quixo/QuixoFailure';

describe('QuixoComponent', () => {

    let testUtils: ComponentTestUtils<QuixoComponent>;

    const _: PlayerOrNone = PlayerOrNone.NONE;
    const O: PlayerOrNone = PlayerOrNone.ZERO;
    const X: PlayerOrNone = PlayerOrNone.ONE;

    beforeEach(fakeAsync(async() => {
        testUtils = await ComponentTestUtils.forGame<QuixoComponent>('Quixo');
    }));

    it('should create', () => {
        testUtils.expectToBeCreated();
    });

    describe('first click', () => {

        it('should cancel move when trying to select opponent piece', fakeAsync(async() => {
            const board: Table<PlayerOrNone> = [
                [O, _, _, _, _],
                [_, _, _, _, _],
                [X, _, _, _, X],
                [_, _, _, _, _],
                [_, _, _, _, _],
            ];
            const state: QuixoState = new QuixoState(board, 3);
            await testUtils.setupState(state);

            await testUtils.expectClickFailure('#click_0_0', RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_OPPONENT());
        }));

        it('should cancel move when trying to select center coord', fakeAsync(async() => {
            const board: Table<PlayerOrNone> = [
                [O, _, _, _, _],
                [_, _, _, _, _],
                [X, _, _, _, X],
                [_, _, _, _, _],
                [_, _, _, _, _],
            ];
            const state: QuixoState = new QuixoState(board, 3);
            await testUtils.setupState(state);

            await testUtils.expectClickFailure('#click_1_1', QuixoFailure.NO_INSIDE_CLICK());
        }));

        it('should show insertion directions when clicking on a border space', fakeAsync(async() => {
            // Given a board
            // When selecting a coord
            await testUtils.expectClickSuccess('#click_0_0');

            // Then the direction in which this piece can go should be displayed
            testUtils.expectElementToExist('#chooseDirection_DOWN');
            testUtils.expectElementToExist('#chooseDirection_RIGHT');
            testUtils.expectElementNotToExist('#chooseDirection_LEFT');
            testUtils.expectElementNotToExist('#chooseDirection_UP');
        }));

        it('should select coord when clicking on it', fakeAsync(async() => {
            // Given a board
            // When clicking on one outside coord
            await testUtils.expectClickSuccess('#click_0_0');

            // Then it should be selected
            testUtils.expectElementToHaveClass('#click_0_0', 'selected-stroke');
        }));

    });

    describe('second click', () => {

        it('should allow a simple move', fakeAsync(async() => {
            // Given any board with a selected coord
            await testUtils.expectClickSuccess('#click_4_0');

            // When choosing a direction and finalising the move
            // Then the move should succeed
            await testUtils.expectMoveSuccess('#chooseDirection_LEFT', new QuixoMove(4, 0, Orthogonal.LEFT));
        }));

        it('should allow a simple move upwards', fakeAsync(async() => {
            await testUtils.expectClickSuccess('#click_4_4');
            await testUtils.expectMoveSuccess('#chooseDirection_UP', new QuixoMove(4, 4, Orthogonal.UP));
        }));

        it('should deselect coord when clicking on it again', fakeAsync(async() => {
            // Given a board with a selected coord
            await testUtils.expectClickSuccess('#click_0_0');

            // When clicking on it again
            await testUtils.expectClickFailure('#click_0_0');

            // Then it should no longer be selected
            testUtils.expectElementNotToHaveClass('#click_0_0', 'selected-stroke');
        }));

    });

    describe('visuals', () => {

        it('should highlight victory', fakeAsync(async() => {
            const board: Table<PlayerOrNone> = [
                [O, O, O, O, O],
                [_, _, _, _, _],
                [X, _, _, _, X],
                [_, _, _, _, _],
                [_, _, _, _, _],
            ];
            const state: QuixoState = new QuixoState(board, 3);
            await testUtils.setupState(state);

            expect(testUtils.getGameComponent().getPieceClasses(0, 0)).toContain('victory-stroke');
            expect(testUtils.getGameComponent().getPieceClasses(1, 0)).toContain('victory-stroke');
            expect(testUtils.getGameComponent().getPieceClasses(2, 0)).toContain('victory-stroke');
            expect(testUtils.getGameComponent().getPieceClasses(3, 0)).toContain('victory-stroke');
            expect(testUtils.getGameComponent().getPieceClasses(4, 0)).toContain('victory-stroke');
        }));

        it('should highlight all moved coords', fakeAsync(async() => {
            // Given any board
            await testUtils.expectClickSuccess('#click_2_0');

            // When choosing a direction and finalising the move
            await testUtils.expectMoveSuccess('#chooseDirection_LEFT', new QuixoMove(2, 0, Orthogonal.LEFT));

            // Then the move coord on the line that were move should be highlighted
            testUtils.expectElementToHaveClass('#click_0_0', 'last-move-stroke');
            testUtils.expectElementToHaveClass('#click_1_0', 'last-move-stroke');
            testUtils.expectElementToHaveClass('#click_2_0', 'last-move-stroke');
            // But the other should not be
            testUtils.expectElementNotToHaveClass('#click_3_0', 'last-move-stroke');
            testUtils.expectElementNotToHaveClass('#click_4_0', 'last-move-stroke');
        }));

    });

});
