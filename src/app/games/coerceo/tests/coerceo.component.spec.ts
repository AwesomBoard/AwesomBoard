/* eslint-disable max-lines-per-function */
import { MGPOptional } from '@everyboard/lib';
import { CoerceoComponent } from '../coerceo.component';
import { CoerceoMove, CoerceoRegularMove, CoerceoTileExchangeMove } from 'src/app/games/coerceo/CoerceoMove';
import { Coord } from 'src/app/jscaip/Coord';
import { CoerceoFailure } from 'src/app/games/coerceo/CoerceoFailure';
import { CoerceoState } from 'src/app/games/coerceo/CoerceoState';
import { Table } from 'src/app/jscaip/TableUtils';
import { ComponentTestUtils } from 'src/app/utils/tests/TestUtils.spec';
import { fakeAsync } from '@angular/core/testing';
import { FourStatePiece } from 'src/app/jscaip/FourStatePiece';
import { CoerceoConfig, CoerceoRules } from '../CoerceoRules';
import { PlayerNumberMap } from 'src/app/jscaip/PlayerMap';

describe('CoerceoComponent', () => {

    let testUtils: ComponentTestUtils<CoerceoComponent>;

    const _: FourStatePiece = FourStatePiece.EMPTY;
    const N: FourStatePiece = FourStatePiece.UNREACHABLE;
    const O: FourStatePiece = FourStatePiece.ZERO;
    const X: FourStatePiece = FourStatePiece.ONE;
    const defaultConfig: MGPOptional<CoerceoConfig> = CoerceoRules.get().getDefaultRulesConfig();

    function expectCoordToBeOfRemovedFill(x: number, y: number): void {
        testUtils.expectElementToHaveClass('#space-' + x + '-' + y, 'captured-alternate-fill');
    }

    function expectCoordToBeOfCapturedFill(x: number, y: number): void {
        testUtils.expectElementToHaveClass('#pyramid-' + x + '-' + y, 'captured-fill');
    }

    beforeEach(fakeAsync(async() => {
        testUtils = await ComponentTestUtils.forGame<CoerceoComponent>('Coerceo');
    }));

    it('should create', () => {
        testUtils.expectToBeCreated();
    });

    describe('visual features', () => {

        it('should not show tile when there is none', fakeAsync(async() => {
            // Given a board with zero tiles
            // When rendering it
            // Then it should not have a tile count
            testUtils.expectElementNotToExist('#tiles-count-PLAYER_ZERO');
        }));

        it('should show tile when there is more than zero', fakeAsync(async() => {
            // Given a board with more than zero tiles
            const board: Table<FourStatePiece> = CoerceoRules.get().getInitialState(defaultConfig).getCopiedBoard();
            const state: CoerceoState = new CoerceoState(board, 0, PlayerNumberMap.of(1, 0), PlayerNumberMap.of(0, 0));

            // When rendering it
            await testUtils.setupState(state);

            // Then it should not have a tile count
            testUtils.expectElementToExist('#tiles-count-PLAYER_ZERO');
        }));

        it('should show removed tiles, and captured piece (after tiles exchange)', fakeAsync(async() => {
            // Given a board with just removed pieces
            const previousBoard: Table<FourStatePiece> = [
                [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
                [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
                [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
                [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
                [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
                [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
                [N, N, N, N, N, N, _, _, X, N, N, N, N, N, N],
                [N, N, N, N, N, N, _, _, _, _, O, _, N, N, N],
                [N, N, N, N, N, N, X, O, X, _, _, _, N, N, N],
                [N, N, N, N, N, N, _, _, _, N, N, N, N, N, N],
            ];
            const board: Table<FourStatePiece> = [
                [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
                [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
                [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
                [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
                [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
                [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
                [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
                [N, N, N, N, N, N, N, N, N, X, O, _, N, N, N],
                [N, N, N, N, N, N, X, _, X, _, _, _, N, N, N],
                [N, N, N, N, N, N, _, _, _, N, N, N, N, N, N],
            ];
            const previousState: CoerceoState =
                new CoerceoState(previousBoard, 2, PlayerNumberMap.of(2, 0), PlayerNumberMap.of(0, 0));
            const state: CoerceoState =
                new CoerceoState(board, 3, PlayerNumberMap.of(0, 0), PlayerNumberMap.of(1, 0));
            const previousMove: CoerceoMove = CoerceoTileExchangeMove.of(new Coord(8, 6));

            // When rendering the board
            await testUtils.setupState(state, { previousState, previousMove });

            // Then we should see removed tiles
            expectCoordToBeOfCapturedFill(8, 6);
            expectCoordToBeOfRemovedFill(7, 6);
            expectCoordToBeOfRemovedFill(6, 6);
            expectCoordToBeOfRemovedFill(8, 7);
            expectCoordToBeOfRemovedFill(7, 7);
            expectCoordToBeOfRemovedFill(6, 7);
            testUtils.expectElementToExist('#tiles-count-PLAYER_ZERO');
            testUtils.expectElementNotToExist('#tilesCount1');
        }));

        it('should show removed tiles, and captured piece (after movement)', fakeAsync(async() => {
            // Given a board with just removed pieces
            const previousBoard: Table<FourStatePiece> = [
                [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
                [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
                [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
                [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
                [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
                [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
                [N, N, N, N, N, N, _, O, X, N, N, N, N, N, N],
                [N, N, N, N, N, N, _, _, _, _, O, _, N, N, N],
                [N, N, N, N, N, N, X, _, _, _, _, _, N, N, N],
                [N, N, N, N, N, N, _, _, O, N, N, N, N, N, N],
            ];
            const board: Table<FourStatePiece> = [
                [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
                [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
                [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
                [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
                [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
                [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
                [N, N, N, N, N, N, _, O, _, N, N, N, N, N, N],
                [N, N, N, N, N, N, _, _, _, N, N, N, N, N, N],
                [N, N, N, N, N, N, X, _, _, N, N, N, N, N, N],
                [N, N, N, N, N, N, _, _, O, N, N, N, N, N, N],
            ];
            const previousState: CoerceoState =
                new CoerceoState(previousBoard, 2, PlayerNumberMap.of(0, 0), PlayerNumberMap.of(0, 0));
            const state: CoerceoState =
                new CoerceoState(board, 3, PlayerNumberMap.of(0, 0), PlayerNumberMap.of(1, 0));
            const previousMove: CoerceoMove = CoerceoTileExchangeMove.of(new Coord(8, 6));

            // When rendering the board
            await testUtils.setupState(state, { previousState, previousMove });

            // Then we should see removed tiles
            expectCoordToBeOfCapturedFill(8, 6);
            expectCoordToBeOfRemovedFill(10, 7);
        }));

    });

    describe('First click', () => {

        it('should refuse tiles exchange when player have no tiles', fakeAsync(async() => {
            // Given a board without tiles (the initial one here)
            // When clicking on an opponent piece
            const move: CoerceoMove = CoerceoTileExchangeMove.of(new Coord(6, 9));

            // Then it should fail
            await testUtils.expectMoveFailure('#pyramid-6-9',
                                              CoerceoFailure.NOT_ENOUGH_TILES_TO_EXCHANGE(),
                                              move);
        }));

        it('should show captured piece and used tiles when doing tiles exchange', fakeAsync(async() => {
            // Given a board with tiles
            const board: Table<FourStatePiece> = CoerceoRules.get().getInitialState(defaultConfig).board;
            const state: CoerceoState = new CoerceoState(board, 0, PlayerNumberMap.of(2, 0), PlayerNumberMap.of(0, 0));
            await testUtils.setupState(state);

            // When clicking on an opponent piece
            const move: CoerceoMove = CoerceoTileExchangeMove.of(new Coord(6, 9));
            await testUtils.expectMoveSuccess('#pyramid-6-9', move);

            // Then the highlight should be visible
            testUtils.expectElementToHaveClasses('#pyramid-6-9', ['base', 'mid-stroke', 'captured-fill']);
            testUtils.expectElementToHaveClasses('#tiles-count-PLAYER_ZERO > polygon', ['base', 'captured-fill']);
        }));

        it('should show possibles destination after choosing your own piece', fakeAsync(async() => {
            // Given any board
            // When clicking on any piece
            await testUtils.expectClickSuccess('#pyramid-6-2');

            // Then its destinations should be displayed
            testUtils.expectElementToHaveClass('#selected-6-2', 'selected-stroke');
            testUtils.expectElementToExist('#possible-landing-7-1');
            testUtils.expectElementToExist('#possible-landing-7-3');
            testUtils.expectElementToExist('#possible-landing-5-3');
            testUtils.expectElementToExist('#possible-landing-4-2');
        }));

        it('should cancel the move when first click is on empty space', fakeAsync(async() => {
            // Given any board
            // When clicking on empty space
            // Then it should fail
            await testUtils.expectClickFailure('#space-5-5', CoerceoFailure.FIRST_CLICK_SHOULD_NOT_BE_NULL());
        }));

        it('should hide last move when selecting first piece', fakeAsync(async() => {
            // Given a state with a last move
            await testUtils.expectClickSuccess('#pyramid-6-2');
            const move: CoerceoMove = CoerceoRegularMove.of(new Coord(6, 2), new Coord(7, 3));
            await testUtils.expectMoveSuccess('#space-7-3', move);

            // When clicking on the piece to move
            await testUtils.expectClickSuccess('#pyramid-4-3');

            // Then the last move should no longer be displayed
            testUtils.expectElementNotToExist('#last-start-6-2');
            testUtils.expectElementNotToExist('#last-end-7-3');
        }));

    });

    describe('second click', () => {

        it('should allow simple move', fakeAsync(async() => {
            // Given any board with one selected piece
            await testUtils.expectClickSuccess('#pyramid-6-2');

            // When clicking on the landing space
            const move: CoerceoMove = CoerceoRegularMove.of(new Coord(6, 2), new Coord(7, 3));

            // Then the move should succeed
            await testUtils.expectMoveSuccess('#space-7-3', move);
        }));

        it('should switch of selected piece when clicking another player piece', fakeAsync(async() => {
            // Given a board where a first piece has been selected
            await testUtils.expectClickSuccess('#pyramid-6-2');

            // When clicking on another piece
            await testUtils.expectClickSuccess('#pyramid-8-2');

            // Then second piece should be selected
            testUtils.expectElementNotToExist('#selected-6-2');
            testUtils.expectElementToHaveClass('#selected-8-2', 'selected-stroke');
            testUtils.expectElementToExist('#possible-landing-7-1');
            testUtils.expectElementToExist('#possible-landing-7-3');
            testUtils.expectElementToExist('#possible-landing-10-2');
            testUtils.expectElementToExist('#possible-landing-9-3');
            testUtils.expectElementNotToExist('#possible-landing-5-3');
            testUtils.expectElementNotToExist('#possible-landing-4-2');
        }));

        it('should deselect piece when clicking a second time on it', fakeAsync(async() => {
            // Given a board on which a piece is selected
            await testUtils.expectClickSuccess('#pyramid-6-2');
            testUtils.expectElementToExist('#possible-landing-7-3');

            // When clicking on it again
            await testUtils.expectClickFailure('#pyramid-6-2');

            // Then the different highlights should be gone since the piece is deselected
            testUtils.expectElementNotToExist('#selected-6-2');
            testUtils.expectElementNotToExist('#possible-landing-7-3');
        }));

        it('should deselect piece when clicking on its selected highlight', fakeAsync(async() => {
            // Given a board on which a piece is selected
            await testUtils.expectClickSuccess('#pyramid-6-2');
            testUtils.expectElementToExist('#possible-landing-7-3');

            // When clicking on it again
            await testUtils.expectClickFailureWithAsymmetricNaming('#selected-6-2', '#pyramid-6-2');

            // Then the different highlights should be gone since the piece is deselected
            testUtils.expectElementNotToExist('#selected-6-2');
            testUtils.expectElementNotToExist('#possible-landing-7-3');
        }));

        it('should refuse invalid move', fakeAsync(async() => {
            // Given any board with one selected piece
            await testUtils.expectClickSuccess('#pyramid-6-2');

            // When clicking too far from the selected piece
            // Then it should fail
            await testUtils.expectClickFailure('#space-8-4', CoerceoFailure.INVALID_DISTANCE());
        }));

        it('should show last move after finishing it', fakeAsync(async() => {
            // Given a state with a move ongoing
            await testUtils.expectClickSuccess('#pyramid-6-2');

            // When finishing the move
            const move: CoerceoMove = CoerceoRegularMove.of(new Coord(6, 2), new Coord(7, 3));
            await testUtils.expectMoveSuccess('#space-7-3', move);

            // Then the highlight of the last move should be present
            testUtils.expectElementToHaveClass('#last-start-6-2', 'last-move-stroke');
            testUtils.expectElementToHaveClass('#last-end-7-3', 'last-move-stroke');
        }));

    });

    describe('showLastMove', () => {

        it('should work for tile exchange', fakeAsync(async() => {
            // Given a board where last move was a piece move
            const board: FourStatePiece[][] = [
                [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
                [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
                [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
                [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
                [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
                [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
                [N, N, N, N, N, N, _, _, X, N, N, N, N, N, N],
                [N, N, N, N, N, N, O, _, _, N, N, N, N, N, N],
                [N, N, N, N, N, N, _, _, _, N, N, N, N, N, N],
                [N, N, N, N, N, N, O, _, _, N, N, N, N, N, N],
            ];
            const state: CoerceoState = new CoerceoState(board, 1, PlayerNumberMap.of(0, 2), PlayerNumberMap.of(0, 0));
            const previousMove: CoerceoMove = CoerceoRegularMove.of(new Coord(8, 9), new Coord(6, 9));
            await testUtils.setupState(state, { previousMove });
            testUtils.expectElementToHaveClass('#last-end-6-9', 'last-move-stroke');
            testUtils.expectElementToHaveClass('#last-start-8-9', 'last-move-stroke');

            // When applying a tile exchange
            await testUtils.expectMoveSuccess('#pyramid-6-9',
                                              CoerceoTileExchangeMove.of(new Coord(6, 9)));

            // Then the start and end of penultimate move should be gone
            testUtils.expectElementNotToExist('#last-end-6-9');
            testUtils.expectElementNotToExist('#last-start-8-9');
            testUtils.expectElementToHaveClass('#pyramid-6-9', 'captured-fill');
        }));

    });

});
