/* eslint-disable max-lines-per-function */
import { fakeAsync } from '@angular/core/testing';
import { Coord } from 'src/app/jscaip/Coord';
import { FourStatePiece } from 'src/app/jscaip/FourStatePiece';
import { HexaDirection } from 'src/app/jscaip/HexaDirection';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { Table } from 'src/app/jscaip/TableUtils';
import { ComponentTestUtils } from 'src/app/utils/tests/TestUtils.spec';
import { AbaloneComponent } from '../abalone.component';
import { AbaloneFailure } from '../AbaloneFailure';
import { AbaloneState } from '../AbaloneState';
import { AbaloneMove } from '../AbaloneMove';

describe('AbaloneComponent', () => {

    const _: FourStatePiece = FourStatePiece.EMPTY;
    const N: FourStatePiece = FourStatePiece.UNREACHABLE;
    const O: FourStatePiece = FourStatePiece.ZERO;
    const X: FourStatePiece = FourStatePiece.ONE;
    let testUtils: ComponentTestUtils<AbaloneComponent>;

    beforeEach(fakeAsync(async() => {
        testUtils = await ComponentTestUtils.forGame<AbaloneComponent>('Abalone');
    }));

    describe('first click', () => {

        it('should show legal directions choice when clicking piece', fakeAsync(async() => {
            // Given the initial board

            // When clicking on a piece
            await testUtils.expectClickSuccess('#piece-1-7');

            // Then highlight and 5 arrows should be shown
            testUtils.expectElementToExist('#direction-LEFT');
            testUtils.expectElementToExist('#direction-UP');
            testUtils.expectElementToExist('#direction-UP-RIGHT');
            testUtils.expectElementToExist('#direction-DOWN');
            testUtils.expectElementToExist('#direction-DOWN-LEFT');
            // And also their more precisely describe part
            testUtils.expectElementToExist('#arrow-1-7-to-1-6');
            testUtils.expectElementToExist('#arrow-1-7-to--1-7');
            testUtils.expectElementToExist('#arrow-1-7-to-3-5');
            testUtils.expectElementToExist('#arrow-1-7-to-1-9');
            testUtils.expectElementToExist('#arrow-1-7-to--1-9');

            // As pushing 5 pieces is not allowed, direction right should not be possible
            testUtils.expectElementNotToExist('#direction-RIGHT');
        }));

        it('should cancel move when clicking on opponent piece', fakeAsync(async() => {
            // Given the initial board
            // When clicking on an opponent piece
            // Then it should fail
            await testUtils.expectClickFailure('#piece-8-0');
        }));

        it('should select piece when clicking it', fakeAsync(async() => {
            // Given the initial board
            // When clicking a piece
            await testUtils.expectClickSuccess('#piece-2-7');

            // Then it should be selected
            testUtils.expectElementToHaveClass('#piece-2-7', 'selected-stroke');
        }));

        it('should hide last move when clicking on a piece', fakeAsync(async() => {
            // Given a board with last move
            const previousBoard: FourStatePiece[][] = [
                [N, N, N, N, _, _, _, _, _],
                [N, N, N, _, _, _, _, _, _],
                [N, N, _, _, _, _, _, _, _],
                [N, _, _, _, _, _, _, _, _],
                [X, X, O, O, O, _, _, _, _],
                [_, _, _, _, _, _, _, _, N],
                [_, _, _, _, _, _, _, N, N],
                [O, O, O, O, O, O, N, N, N],
                [_, O, O, O, O, N, N, N, N],
            ];
            const previousState: AbaloneState = new AbaloneState(previousBoard, 0);
            const previousMove: AbaloneMove = AbaloneMove.ofSingleCoord(new Coord(4, 4), HexaDirection.LEFT);
            const board: FourStatePiece[][] = [
                [N, N, N, N, _, _, _, _, _],
                [N, N, N, _, _, _, _, _, _],
                [N, N, _, _, _, _, _, _, _],
                [N, _, _, _, _, _, _, _, _],
                [X, O, O, O, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, N],
                [_, _, _, _, _, _, _, N, N],
                [O, O, O, O, O, O, N, N, N],
                [_, O, O, O, O, N, N, N, N],
            ];
            const state: AbaloneState = new AbaloneState(board, 1);
            await testUtils.setupState(state, { previousState, previousMove });

            // When doing a click
            await testUtils.expectClickSuccess('#space-0-4');

            // Then the previous move should be hidden
            testUtils.expectElementNotToHaveClass('#space-1-4', 'moved-fill');
            testUtils.expectElementNotToHaveClass('#space-2-4', 'moved-fill');
            testUtils.expectElementNotToHaveClass('#space-3-4', 'moved-fill');
            testUtils.expectElementNotToExist('#space--1-4');
            testUtils.expectElementNotToExist('#piece--1-4');
        }));

        it('should cancel move when clicking on empty space', fakeAsync(async() => {
            // Given the initial board
            // When clicking on an empty space
            // Then it should fail
            await testUtils.expectClickFailure('#space-3-3', RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_EMPTY());
        }));

    });

    describe('second click', () => {

        it('should show translation and pushings directions when second piece is clicked', fakeAsync(async() => {
            // Given the initial board with one selected piece
            await testUtils.expectClickSuccess('#piece-2-6');

            // When clicking on the second
            await testUtils.expectClickSuccess('#piece-4-6');

            // Then legal direction should be shown and others not
            testUtils.expectElementToExist('#direction-LEFT');
            testUtils.expectElementToExist('#direction-UP');
            testUtils.expectElementToExist('#direction-UP-RIGHT');
            testUtils.expectElementToExist('#direction-RIGHT');

            testUtils.expectElementNotToExist('#direction-DOWN-LEFT');
            testUtils.expectElementNotToExist('#direction-DOWN');
        }));

        it('should unselect single piece when reclicking it', fakeAsync(async() => {
            // Given the initial board with a selected piece
            await testUtils.expectClickSuccess('#piece-2-7');

            // When reclicking it
            await testUtils.expectClickFailure('#piece-2-7');

            // Then it should no longer be selected
            testUtils.expectElementNotToHaveClass('#piece-2-7', 'selected-stroke');
        }));

        it('should select clicked piece when second clicked piece is not aligned with first (non dir)', fakeAsync(async() => {
            // Given the initial board with a selected piece
            await testUtils.expectClickSuccess('#piece-2-6');

            // When clicking second unaligned piece
            await testUtils.expectClickSuccess('#piece-4-7');

            // Then the first piece should be unselected and the second one should be selected
            testUtils.expectElementNotToHaveClass('#piece-2-6', 'selected-stroke');
            testUtils.expectElementToHaveClass('#piece-4-7', 'selected-stroke');
        }));

        it('should select clicked piece when not aligned with first (non hexa dir)', fakeAsync(async() => {
            // Given the initial board with first click
            await testUtils.expectClickSuccess('#piece-2-6');

            // When clicking second unaligned coord
            await testUtils.expectClickSuccess('#piece-3-7');

            // Then the first piece should be unselected and the second one should be selected
            testUtils.expectElementNotToHaveClass('#piece-2-6', 'selected-stroke');
            testUtils.expectElementToHaveClass('#piece-3-7', 'selected-stroke');
        }));

        it('should change first coord to clicked coord if valid extension side but hole in the extension', fakeAsync(async() => {
            // Given a board with a possible "holed line" selection and a first piece selected that could lead to it
            const board: Table<FourStatePiece> = [
                [N, N, N, N, X, X, X, X, X],
                [N, N, N, X, X, X, X, X, X],
                [N, N, _, _, X, X, X, _, _],
                [N, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _],
                [_, O, _, _, _, _, _, _, N],
                [_, _, _, O, O, _, _, N, N],
                [O, O, O, O, O, O, N, N, N],
                [O, O, O, O, O, N, N, N, N],
            ];
            const state: AbaloneState = new AbaloneState(board, 0);
            await testUtils.setupState(state);
            await testUtils.expectClickSuccess('#piece-1-5');

            // When choosing the piece that is aligned and at good distance but not making a line
            await testUtils.expectClickSuccess('#piece-1-7');

            // Then the old piece should be unselected and the new one selected
            testUtils.expectElementNotToHaveClass('#piece-1-5', 'selected-stroke');
            testUtils.expectElementToHaveClass('#piece-1-7', 'selected-stroke');
        }));

        it('should cancel move when trying to select more than three pieces', fakeAsync(async() => {
            // Given the initial board with one piece selected
            await testUtils.expectClickSuccess('#piece-0-7');

            // When clicking 3 space on the right
            await testUtils.expectClickFailure('#piece-3-7', AbaloneFailure.CANNOT_MOVE_MORE_THAN_N_PIECES(3));

            // Then piece should no longer be selected
            testUtils.expectElementNotToHaveClass('#piece-0-7', 'selected-stroke');
            testUtils.expectElementNotToHaveClass('#piece-1-7', 'selected-stroke');
            testUtils.expectElementNotToHaveClass('#piece-2-7', 'selected-stroke');
            testUtils.expectElementNotToHaveClass('#piece-3-7', 'selected-stroke');
        }));

        it('should select piece in the middle when clicking on two distant pieces', fakeAsync(async() => {
            // Given the initial board with one selected coord
            await testUtils.expectClickSuccess('#piece-2-7');

            // When clicking first coord then third coord
            await testUtils.expectClickSuccess('#piece-4-7');

            // Then three pieces should be selected
            testUtils.expectElementToHaveClass('#piece-2-7', 'selected-stroke');
            testUtils.expectElementToHaveClass('#piece-3-7', 'selected-stroke');
            testUtils.expectElementToHaveClass('#piece-4-7', 'selected-stroke');
        }));

        it('should allow clicking on arrow landing coord as if it was the arrow (space)', fakeAsync(async() => {
            // Given the initial board with first space clicked
            await testUtils.expectClickSuccess('#piece-2-6');

            // When clicking on the space marked by the direction instead of its arrow
            // Then the move should succeed
            const move: AbaloneMove = AbaloneMove.ofSingleCoord(new Coord(2, 6), HexaDirection.LEFT);
            await testUtils.expectMoveSuccess('#space-1-6', move);
        }));

        it('should do move when clicking direction', fakeAsync(async() => {
            // Given the initial board with piece selected
            await testUtils.expectClickSuccess('#piece-0-7');

            // When clicking on coord then direction
            // Then the move should succeed
            const move: AbaloneMove = AbaloneMove.ofSingleCoord(new Coord(0, 7), HexaDirection.UP);
            await testUtils.expectMoveSuccessWithAsymmetricNaming('#arrow-0-7-to-0-6', '#direction-UP', move);
        }));

        it('should choose the more inclusive arrow-drawing (A > B)', fakeAsync(async() => {
            // Given any board with two neighbor pieces, able to move in one direction but not its opposite
            // When selecting the one "first" in that direction, then the "second"
            await testUtils.expectClickSuccess('#piece-1-7');
            await testUtils.expectClickSuccess('#piece-2-6');

            // Then the arrow path should includes both spaces
            testUtils.expectElementToExist('#arrow-1-7-to-3-5');
            // And there should be a healthy line starting from first selected coord
            testUtils.expectElementToExist('#arrow-1-7-to-1-6');
        }));

        it('should choose the more inclusive arrow-drawing (B > A)', fakeAsync(async() => {
            // Given any board with two neighbor pieces, able to move in one direction but not its opposite
            // When selecting the one "second" in that direction, then the "first"
            await testUtils.expectClickSuccess('#piece-2-6');
            await testUtils.expectClickSuccess('#piece-1-7');

            // Then the arrow path should includes both spaces
            testUtils.expectElementToExist('#arrow-1-7-to-3-5');
            // And there should be a healthy line starting from first selected coord
            testUtils.expectElementToExist('#arrow-2-6-to-2-5');
        }));

        it('should allow throwing your own piece off', fakeAsync(async() => {
            // Given the initial board with first space clicked
            await testUtils.expectClickSuccess('#piece-2-7');

            // When clicking on the invisible space outside the board, to commit suicide
            // Then the move should succeed
            const move: AbaloneMove = AbaloneMove.ofSingleCoord(new Coord(2, 7), HexaDirection.DOWN);
            await testUtils.expectMoveSuccess('#invisible-space-2-9', move);
        }));

    });

    describe('third click', () => {

        it('should deselect first piece only when reclicked, and change it', fakeAsync(async() => {
            // Given the initial board with 2 pieces selected
            await testUtils.expectClickSuccess('#piece-2-6');
            await testUtils.expectClickSuccess('#piece-3-6');

            // When clicking first piece
            await testUtils.expectClickSuccess('#piece-2-6');

            // Then only one piece should be selected
            testUtils.expectElementNotToHaveClass('#piece-2-6', 'selected-stroke');
            testUtils.expectElementToHaveClass('#piece-3-6', 'selected-stroke');
        }));

        it('should deselect last piece selected when reclicked', fakeAsync(async() => {
            // Given the initial board with 2 pieces selected
            await testUtils.expectClickSuccess('#piece-2-6');
            await testUtils.expectClickSuccess('#piece-3-6');

            // When clicking first piece
            await testUtils.expectClickSuccess('#piece-3-6');

            // Then only one piece should be selected
            testUtils.expectElementToHaveClass('#piece-2-6', 'selected-stroke');
            testUtils.expectElementNotToHaveClass('#piece-3-6', 'selected-stroke');
        }));

        it('should cancel move when clicking middle piece of a 3-piece column and selecting middle', fakeAsync(async() => {
            // Given the initial board with three piece selected
            await testUtils.expectClickSuccess('#piece-2-7');
            await testUtils.expectClickSuccess('#piece-4-7');

            // When reclicking middle one
            await testUtils.expectClickFailure('#piece-3-7');

            // Then all three pieces should be unselected
            testUtils.expectElementNotToHaveClass('#piece-2-7', 'selected-stroke');
            testUtils.expectElementNotToHaveClass('#piece-3-7', 'selected-stroke');
            testUtils.expectElementNotToHaveClass('#piece-4-7', 'selected-stroke');
        }));

        it('should cancel move then select clicked piece as first piece when it is not aligned with first piece', fakeAsync(async() => {
            // Given the initial board with a line selected
            await testUtils.expectClickSuccess('#piece-2-6');
            await testUtils.expectClickSuccess('#piece-4-6');

            // When clicking on not aligned piece
            // Then it should fail
            await testUtils.expectClickFailure('#piece-4-7', AbaloneFailure.LINE_AND_COORD_NOT_ALIGNED());
        }));

        it('should cancel move then select clicked piece as first piece when it is not aligned with second piece', fakeAsync(async() => {
            // Given the initial board with a line selected
            await testUtils.expectClickSuccess('#piece-2-6');
            await testUtils.expectClickSuccess('#piece-4-6');

            // When clicking on not aligned piece
            // Then it should fail
            await testUtils.expectClickFailure('#piece-2-7', AbaloneFailure.LINE_AND_COORD_NOT_ALIGNED());
        }));

        it('should recognize line extension and show new directions (1-2-3)', fakeAsync(async() => {
            // Given the initial board with an extendable two pieces line selected
            await testUtils.expectClickSuccess('#piece-2-6');
            await testUtils.expectClickSuccess('#piece-3-6');

            // When clicking third one
            await testUtils.expectClickSuccess('#piece-4-6');

            // Then three pieces should be selected
            testUtils.expectElementToHaveClass('#piece-2-6', 'selected-stroke');
            testUtils.expectElementToHaveClass('#piece-3-6', 'selected-stroke');
            testUtils.expectElementToHaveClass('#piece-4-6', 'selected-stroke');
        }));

        it('should refuse too long extension', fakeAsync(async() => {
            // Given the initial board with two space selected
            await testUtils.expectClickSuccess('#piece-0-7');
            await testUtils.expectClickSuccess('#piece-1-7');

            // When selecting an aligned piece too far
            // Then move should be cancel for "too-long-line" reason
            await testUtils.expectClickFailure('#piece-3-7', AbaloneFailure.CANNOT_MOVE_MORE_THAN_N_PIECES(3));
        }));

        it('should allow clicking on arrow landing coord as if it was below an arrow (opponent)', fakeAsync(async() => {
            // Given a board with a possible push
            const board: Table<FourStatePiece> = [
                [N, N, N, N, X, X, X, X, X],
                [N, N, N, X, X, X, X, X, X],
                [N, N, _, _, _, X, X, _, _],
                [N, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _],
                [_, _, X, _, _, _, _, _, N],
                [_, _, O, O, O, _, _, N, N],
                [O, O, O, O, O, O, N, N, N],
                [O, O, O, O, O, N, N, N, N],
            ];
            const state: AbaloneState = new AbaloneState(board, 0);
            await testUtils.setupState(state);
            await testUtils.expectClickSuccess('#piece-2-6');
            await testUtils.expectClickSuccess('#piece-2-7');

            // When clicking on the space marked by the direction instead of its arrow
            // Then the move should succeed
            const move: AbaloneMove = AbaloneMove.ofSingleCoord(new Coord(2, 7), HexaDirection.UP);
            await testUtils.expectMoveSuccess('#piece-2-5', move);
        }));

    });

    describe('showLastMove', () => {

        it('should show last move moved pieces (translation)', fakeAsync(async() => {
            // Given an initial board with two aligned pieces selected
            await testUtils.expectClickSuccess('#piece-2-6');
            await testUtils.expectClickSuccess('#piece-3-6');

            // When clicking the direction
            // Then the translation move should be done
            const move: AbaloneMove =
                AbaloneMove.ofDoubleCoord(new Coord(2, 6), new Coord(3, 6), HexaDirection.UP);
            await testUtils.expectMoveSuccessWithAsymmetricNaming('#arrow-2-6-to-2-5', '#direction-UP', move);
        }));

        it('should show last move moved pieces (push)', fakeAsync(async() => {
            // Given a board with a previous move
            await testUtils.expectClickSuccess('#piece-0-7');
            await testUtils.expectClickSuccess('#piece-0-8');
            const move: AbaloneMove = AbaloneMove.ofSingleCoord(new Coord(0, 7), HexaDirection.DOWN);
            await testUtils.expectMoveSuccessWithAsymmetricNaming('#arrow-0-7-to-0-9', '#direction-DOWN', move);

            // When rendering it
            // Then the starting square of the moved piece should be shown as moved
            testUtils.expectElementToHaveClass('#space-0-7', 'moved-fill');
            testUtils.expectElementToHaveClass('#space-0-8', 'moved-fill');
        }));

        it('should recognize line extension and show new directions (M-2-1-3) and move it as one', fakeAsync(async() => {
            // Given the initial board with an extendable two pieces line selected
            await testUtils.expectClickSuccess('#piece-3-6');
            await testUtils.expectClickSuccess('#piece-2-6');

            // When clicking third one then moving them
            await testUtils.expectClickSuccess('#piece-4-6');
            const move: AbaloneMove = AbaloneMove.ofSingleCoord(new Coord(4, 6), HexaDirection.LEFT);
            await testUtils.expectMoveSuccessWithAsymmetricNaming('#arrow-4-6-to-1-6', '#direction-LEFT', move);

            // Then four spaces should be moved
            testUtils.expectElementToHaveClass('#space-1-6', 'moved-fill');
            testUtils.expectElementToHaveClass('#space-2-6', 'moved-fill');
            testUtils.expectElementToHaveClass('#space-3-6', 'moved-fill');
            testUtils.expectElementToHaveClass('#space-4-6', 'moved-fill');
        }));

        it('should show pushed out pieces', fakeAsync(async() => {
            // Given any board where a piece has been thrown out of the board last turn
            const previousBoard: FourStatePiece[][] = [
                [N, N, N, N, _, _, _, _, _],
                [N, N, N, _, _, _, _, _, _],
                [N, N, _, _, _, _, _, _, _],
                [N, _, _, _, _, _, _, _, _],
                [X, X, O, O, O, _, _, _, _],
                [_, _, _, _, _, _, _, _, N],
                [_, _, _, _, _, _, _, N, N],
                [O, O, O, O, O, O, N, N, N],
                [_, O, O, O, O, N, N, N, N],
            ];
            const previousState: AbaloneState = new AbaloneState(previousBoard, 0);
            const previousMove: AbaloneMove = AbaloneMove.ofSingleCoord(new Coord(4, 4), HexaDirection.LEFT);
            const board: FourStatePiece[][] = [
                [N, N, N, N, _, _, _, _, _],
                [N, N, N, _, _, _, _, _, _],
                [N, N, _, _, _, _, _, _, _],
                [N, _, _, _, _, _, _, _, _],
                [X, O, O, O, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, N],
                [_, _, _, _, _, _, _, N, N],
                [O, O, O, O, O, O, N, N, N],
                [_, O, O, O, O, N, N, N, N],
            ];
            const state: AbaloneState = new AbaloneState(board, 1);

            // When displaying it
            await testUtils.setupState(state, { previousState, previousMove });

            // Then a "captured" square with the pushed-out piece should be shown
            testUtils.expectElementToHaveClass('#space--1-4', 'captured-fill');
            testUtils.expectElementToHaveClass('#piece--1-4', 'player1-fill');
        }));

        it('should show suicidal-translation fallen pieces', fakeAsync(async() => {
            // Given any board where one or several pieces has been thrown out of the board last turn by their owner
            const previousBoard: FourStatePiece[][] = [
                [N, N, N, N, _, _, _, _, _],
                [N, N, N, _, _, _, _, _, _],
                [N, N, _, _, _, _, _, _, _],
                [N, _, _, _, _, _, _, _, _],
                [X, X, O, O, O, _, _, _, _],
                [_, _, _, _, _, _, _, _, N],
                [_, _, _, _, _, _, _, N, N],
                [O, O, O, O, O, O, N, N, N],
                [_, O, O, O, O, N, N, N, N],
            ];
            const previousState: AbaloneState = new AbaloneState(previousBoard, 1);
            const previousMove: AbaloneMove =
                AbaloneMove.ofDoubleCoord(new Coord(1, 8), new Coord(3, 8), HexaDirection.DOWN);
            const board: FourStatePiece[][] = [
                [N, N, N, N, _, _, _, _, _],
                [N, N, N, _, _, _, _, _, _],
                [N, N, _, _, _, _, _, _, _],
                [N, _, _, _, _, _, _, _, _],
                [X, X, O, O, O, _, _, _, _],
                [_, _, _, _, _, _, _, _, N],
                [_, _, _, _, _, _, _, N, N],
                [O, O, O, O, O, O, N, N, N],
                [_, _, _, _, O, N, N, N, N],
            ];
            const state: AbaloneState = new AbaloneState(board, 2);

            // When displaying it
            await testUtils.setupState(state, { previousState, previousMove });

            // Then a "captured" square with the pushed-out piece should be shown
            testUtils.expectElementToHaveClass('#space-1-9', 'captured-fill');
            testUtils.expectElementToHaveClass('#piece-1-9', 'player1-fill');
            testUtils.expectElementToHaveClass('#space-2-9', 'captured-fill');
            testUtils.expectElementToHaveClass('#piece-2-9', 'player1-fill');
            testUtils.expectElementToHaveClass('#space-3-9', 'captured-fill');
            testUtils.expectElementToHaveClass('#piece-3-9', 'player1-fill');
        }));

    });

});
