/* eslint-disable max-lines-per-function */
import { fakeAsync } from '@angular/core/testing';
import { SaharaComponent } from '../sahara.component';
import { Coord } from 'src/app/jscaip/Coord';
import { SaharaMove } from 'src/app/games/sahara/SaharaMove';
import { SaharaState } from 'src/app/games/sahara/SaharaState';
import { ComponentTestUtils } from 'src/app/utils/tests/TestUtils.spec';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { SaharaFailure } from '../SaharaFailure';
import { FourStatePiece } from 'src/app/jscaip/FourStatePiece';
import { Table } from 'src/app/jscaip/TableUtils';

describe('SaharaComponent', () => {

    let testUtils: ComponentTestUtils<SaharaComponent>;
    const N: FourStatePiece = FourStatePiece.UNREACHABLE;
    const O: FourStatePiece = FourStatePiece.ZERO;
    const X: FourStatePiece = FourStatePiece.ONE;
    const _: FourStatePiece = FourStatePiece.EMPTY;

    beforeEach(fakeAsync(async() => {
        testUtils = await ComponentTestUtils.forGame<SaharaComponent>('Sahara');
    }));

    it('should create', () => {
        testUtils.expectToBeCreated();
    });

    describe('First click', () => {

        it('should not allow to click on empty space when no pyramid selected', fakeAsync(async() => {
            // Given the initial board
            // When clicking on empty space
            // Then it should fail
            await testUtils.expectClickFailure('#click_2_2', SaharaFailure.MUST_CHOOSE_PYRAMID_FIRST());
        }));

        it('should not allow to select opponent pyramid', fakeAsync(async() => {
            // Given the initial board
            // When clicking on opponent's pyramid
            // Then it should fail
            await testUtils.expectClickFailure('#click_0_4', SaharaFailure.MUST_CHOOSE_OWN_PYRAMID());
        }));

        it('should show possible landings when selecting a piece', fakeAsync(async() => {
            // Given the initial board
            // When clicking on a piece of the current player
            await testUtils.expectClickSuccess('#click_7_0');

            // Then its differents landing coord should be highlighted
            testUtils.expectElementToExist('#possible_landing_6_0');
            testUtils.expectElementToExist('#possible_landing_5_0');
            testUtils.expectElementToExist('#possible_landing_6_1');
        }));

    });

    describe('Second click', () => {

        it('should not allow to land on opponent pyramid', fakeAsync(async() => {
            // Given the initial board on which a piece is selected
            await testUtils.expectClickSuccess('#click_2_0');

            // When clicking on an opponent piece
            // Then it should have been a failure
            const move: SaharaMove = SaharaMove.from(new Coord(2, 0), new Coord(3, 0)).get();
            await testUtils.expectMoveFailure('#click_3_0', RulesFailure.MUST_LAND_ON_EMPTY_SPACE(), move);
        }));

        it('should not allow to bounce on occupied dark space', fakeAsync(async() => {
            // Given the initial board
            await testUtils.expectClickSuccess('#click_7_0');
            const move: SaharaMove = SaharaMove.from(new Coord(7, 0), new Coord(8, 1)).get();
            await testUtils.expectMoveFailure('#click_8_1', SaharaFailure.CAN_ONLY_REBOUND_ON_EMPTY_SPACE(), move);
        }));

        it('should not allow invalid moves', fakeAsync(async() => {
            // Given the initial board
            await testUtils.expectClickSuccess('#click_0_3');
            const reason: string = 'You can move one or two spaces, not 3.';
            await testUtils.expectClickFailure('#click_2_2', reason);
        }));

        it('should change selected piece when clicking twice in a row on different player pieces', fakeAsync(async() => {
            // Given the initial board with one selected piece
            await testUtils.expectClickSuccess('#click_2_0');
            testUtils.expectElementToExist('#chosen_coord_2_0');
            testUtils.expectElementToExist('#possible_landing_2_1');

            // When clicking another piece of the same player
            await testUtils.expectClickSuccess('#click_7_0');

            // Then the selected piece should have changed and the possible landings too
            testUtils.expectElementToExist('#chosen_coord_7_0');
            testUtils.expectElementToExist('#possible_landing_6_0');
            testUtils.expectElementToExist('#possible_landing_5_0');
            testUtils.expectElementToExist('#possible_landing_6_1');
            // and obviously previous highlight removed
            testUtils.expectElementNotToExist('#chosen_coord_2_0');
            testUtils.expectElementNotToExist('#possible_landing_2_1');
        }));

        it('should deselect piece when clicking a second time on it', fakeAsync(async() => {
            // Given the initial board with one selected piece
            await testUtils.expectClickSuccess('#click_2_0');
            testUtils.expectElementToExist('#chosen_coord_2_0');
            testUtils.expectElementToExist('#possible_landing_2_1');

            // When clicking that piece again
            await testUtils.expectClickFailure('#click_2_0');

            // Then the piece should no longer be selected
            testUtils.expectElementNotToExist('#chosen_coord_2_0');
            testUtils.expectElementNotToExist('#possible_landing_2_1');
        }));

        it('should take "false neighbor" as 3-step move', fakeAsync(async() => {
            // Given the initial board with a first piece selected
            await testUtils.expectClickSuccess('#click_7_0');

            // When clicking on the false neighbor
            // Then the correct message should be shown
            const reason: string = SaharaFailure.THOSE_TWO_SPACES_ARE_NOT_NEIGHBORS();
            await testUtils.expectClickFailure('#click_7_1', reason);
        }));

    });

    it('should play correctly shortest victory', fakeAsync(async() => {
        const board: Table<FourStatePiece> = [
            [N, N, _, X, _, _, _, O, X, N, N],
            [N, _, O, _, _, _, _, _, _, _, N],
            [X, _, _, _, _, _, _, _, _, _, O],
            [O, _, _, _, _, _, _, _, _, _, X],
            [N, _, _, _, _, _, _, X, _, _, N],
            [N, N, X, O, _, _, _, _, O, N, N],
        ];
        const state: SaharaState = new SaharaState(board, 2);
        await testUtils.setupState(state);

        await testUtils.expectClickSuccess('#click_2_1'); // select first piece
        const move: SaharaMove = SaharaMove.from(new Coord(2, 1), new Coord(1, 2)).get();
        await testUtils.expectMoveSuccess('#click_1_2', move); // select landing

        expect(testUtils.getWrapper().endGame).withContext('game should be finished').toBeTrue();
    }));
});
