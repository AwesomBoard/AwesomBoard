/* eslint-disable max-lines-per-function */
import { fakeAsync } from '@angular/core/testing';
import { QuartoComponent } from '../quarto.component';
import { QuartoMove } from 'src/app/games/quarto/QuartoMove';
import { QuartoPiece } from 'src/app/games/quarto/QuartoPiece';
import { QuartoState } from 'src/app/games/quarto/QuartoState';
import { Table } from 'src/app/jscaip/TableUtils';
import { ComponentTestUtils } from 'src/app/utils/tests/TestUtils.spec';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { QuartoConfig, QuartoRules } from '../QuartoRules';
import { MGPOptional } from '@everyboard/lib';

describe('QuartoComponent', () => {

    let testUtils: ComponentTestUtils<QuartoComponent>;

    const NULL: QuartoPiece = QuartoPiece.EMPTY;
    const AAAA: QuartoPiece = QuartoPiece.AAAA;
    const AAAB: QuartoPiece = QuartoPiece.AAAB;
    const AABA: QuartoPiece = QuartoPiece.AABA;
    const AABB: QuartoPiece = QuartoPiece.AABB;
    const defaultConfig: MGPOptional<QuartoConfig> = QuartoRules.get().getDefaultRulesConfig();

    beforeEach(fakeAsync(async() => {
        testUtils = await ComponentTestUtils.forGame<QuartoComponent>('Quarto');
    }));

    it('should create', () => {
        testUtils.expectToBeCreated();
    });

    describe('First click', () => {

        it('should forbid clicking on occupied square', fakeAsync(async() => {
            // Given a board with at least one piece
            const board: Table<QuartoPiece> = [
                [AAAA, NULL, NULL, NULL],
                [NULL, NULL, NULL, NULL],
                [NULL, NULL, NULL, NULL],
                [NULL, NULL, NULL, NULL],
            ];
            const state: QuartoState = new QuartoState(board, 1, QuartoPiece.AAAB);
            await testUtils.setupState(state);

            // When clicking on an occupied square
            // Then it should fail
            await testUtils.expectClickFailure('#click-coord-0-0', RulesFailure.MUST_CLICK_ON_EMPTY_SPACE());
        }));

        it('should select "piece to give" when clicking on it', fakeAsync(async() => {
            // Given any board with remaining piece
            // When clicking on a piece
            await testUtils.expectClickSuccess('#click-piece-1');

            // Then it should be selected
            testUtils.expectElementToExist('#chosen-piece-1');
            testUtils.expectElementToHaveClasses('#chosen-piece-1', ['base', 'no-fill', 'selected-stroke', 'mid-stroke']);
        }));

        it('should select landing coord when clicking on it', fakeAsync(async() => {
            // Given a board with remaining space
            // When clicking on one space of the board
            await testUtils.expectClickSuccess('#click-coord-0-0');

            // Then the space should contain the piece to put on the board
            testUtils.expectElementToExist('#dropped-piece-0-0');
            testUtils.expectElementToHaveClasses('#dropped-piece-highlight', ['base', 'no-fill', 'selected-stroke', 'mid-stroke']);
        }));
    });

    describe('Second click', () => {

        it('should accept move when choosing piece then choosing coord', fakeAsync(async() => {
            // Given any state where user has clicked a piece
            await testUtils.expectClickSuccess('#click-piece-1');

            // When clicking on a square
            // Then the move should succeed
            const move: QuartoMove = new QuartoMove(0, 0, QuartoPiece.AAAB);
            await testUtils.expectMoveSuccess('#click-coord-0-0', move);
        }));

        it('should accept move when choosing coord then choosing piece', fakeAsync(async() => {
            // Given any state where the user has selected a coord
            await testUtils.expectClickSuccess('#click-coord-0-0');

            // When clicking on a piece
            // Then the move should succeed
            const move: QuartoMove = new QuartoMove(0, 0, QuartoPiece.AAAB);
            await testUtils.expectMoveSuccess('#click-piece-1', move);
        }));

        it('should allow to make last move', fakeAsync(async() => {
            // Given a state at the last turn
            const board: QuartoPiece[][] = [
                [QuartoPiece.AABB, QuartoPiece.AAAB, QuartoPiece.ABBA, QuartoPiece.BBAA],
                [QuartoPiece.BBAB, QuartoPiece.BAAA, QuartoPiece.BBBA, QuartoPiece.ABBB],
                [QuartoPiece.BABA, QuartoPiece.BBBB, QuartoPiece.ABAA, QuartoPiece.AABA],
                [QuartoPiece.AAAA, QuartoPiece.ABAB, QuartoPiece.BABB, QuartoPiece.EMPTY],
            ];
            const pieceInHand: QuartoPiece = QuartoPiece.BAAB;
            const state: QuartoState = new QuartoState(board, 15, pieceInHand);
            await testUtils.setupState(state);

            // When clicking on the last empty square
            // Then the move should succeed
            const move: QuartoMove = new QuartoMove(3, 3, QuartoPiece.EMPTY);
            await testUtils.expectMoveSuccess('#click-coord-3-3', move);
        }));

        it('should deselect piece when clicking a second time on it', fakeAsync(async() => {
            // Given any board with remaining piece selected
            await testUtils.expectClickSuccess('#click-piece-1');

            // When clicking on that piece again
            await testUtils.expectClickFailure('#click-piece-1');

            // Then it should no longer be selected
            testUtils.expectElementNotToExist('#chosen-piece-1');
        }));

        it('should deselect landing coord when clicking on it again', fakeAsync(async() => {
            // Given a board with remaining space and one of them already contain the droppedPiece
            await testUtils.expectClickSuccess('#click-coord-0-0');

            // When clicking on the dropped piece's coord again (hence, on the dropped piece)
            await testUtils.expectClickFailure('#dropped-piece-0-0');

            // Then the space should contain the piece to put on the board
            testUtils.expectElementNotToExist('#dropped-piece-0-0');
        }));
    });

    describe('View', () => {

        it('should show the piece in hand', fakeAsync(async() => {
            // Given a state not at the last turn
            // When displaying it
            // Then it should show the piece in hand
            testUtils.expectElementToExist('#piece-in-hand');
        }));

        it('should not show a piece in hand at the very last turn when all pieces are on the board', fakeAsync(async() => {
            // Given a state of a part finished at the last turn
            const board: QuartoPiece[][] = [
                [QuartoPiece.AABB, QuartoPiece.AAAB, QuartoPiece.ABBA, QuartoPiece.BBAA],
                [QuartoPiece.BBAB, QuartoPiece.BAAA, QuartoPiece.BBBA, QuartoPiece.ABBB],
                [QuartoPiece.BABA, QuartoPiece.BBBB, QuartoPiece.ABAA, QuartoPiece.AABA],
                [QuartoPiece.AAAA, QuartoPiece.ABAB, QuartoPiece.BABB, QuartoPiece.BAAB],
            ];
            const pieceInHand: QuartoPiece = QuartoPiece.EMPTY;
            const state: QuartoState = new QuartoState(board, 16, pieceInHand);

            // When displaying it
            await testUtils.setupState(state);

            // Then it should not show any piece in hand
            testUtils.expectElementNotToExist('#piece-in-hand');
        }));

        it('should show last move', fakeAsync(async() => {
            // Given any state where user has made a move
            const board: Table<QuartoPiece> = [
                [AAAA, NULL, NULL, NULL],
                [NULL, NULL, NULL, NULL],
                [NULL, NULL, NULL, NULL],
                [NULL, NULL, NULL, NULL],
            ];
            const state: QuartoState = new QuartoState(board, 1, QuartoPiece.AAAB);
            const previousState: QuartoState = QuartoRules.get().getInitialState(defaultConfig);
            const previousMove: QuartoMove = new QuartoMove(0, 0, QuartoPiece.AAAA);

            // When displaying it
            await testUtils.setupState(state, { previousState, previousMove });

            // Then it should show last move
            testUtils.expectElementToHaveClasses('#last-move-0-0', ['base', 'no-fill', 'last-move-stroke', 'mid-stroke']);
        }));

        it('should display victory', fakeAsync(async() => {
            // Given any state where user has made a move
            const board: Table<QuartoPiece> = [
                [AAAA, AAAB, AABA, AABB],
                [NULL, NULL, NULL, NULL],
                [NULL, NULL, NULL, NULL],
                [NULL, NULL, NULL, NULL],
            ];
            const state: QuartoState = new QuartoState(board, 4, QuartoPiece.BBBB);
            const previousState: QuartoState = QuartoRules.get().getInitialState(defaultConfig);
            const previousMove: QuartoMove = new QuartoMove(0, 0, QuartoPiece.AAAA);

            // When displaying it
            await testUtils.setupState(state, { previousState, previousMove });

            // Then it should show last move
            testUtils.expectElementToHaveClasses('#victory-0-0', ['base', 'no-fill', 'victory-stroke']);
            testUtils.expectElementToHaveClasses('#victory-1-0', ['base', 'no-fill', 'victory-stroke']);
            testUtils.expectElementToHaveClasses('#victory-2-0', ['base', 'no-fill', 'victory-stroke']);
            testUtils.expectElementToHaveClasses('#victory-3-0', ['base', 'no-fill', 'victory-stroke']);
        }));

    });

});
