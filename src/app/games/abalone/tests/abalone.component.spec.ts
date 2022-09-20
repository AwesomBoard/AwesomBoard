/* eslint-disable max-lines-per-function */
import { fakeAsync } from '@angular/core/testing';
import { Coord } from 'src/app/jscaip/Coord';
import { FourStatePiece } from 'src/app/jscaip/FourStatePiece';
import { HexaDirection } from 'src/app/jscaip/HexaDirection';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { Table } from 'src/app/utils/ArrayUtils';
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
        it('should highlight selected piece and show legal directions choice when clicking piece', fakeAsync(async() => {
            // Given the initial board

            // When clicking on a piece
            await testUtils.expectClickSuccess('#piece_2_6');

            // Then highlight and 5 arrows should be shown
            testUtils.expectElementToExist('#direction_LEFT');
            testUtils.expectElementToExist('#direction_UP');
            testUtils.expectElementToExist('#direction_UP_RIGHT');

            testUtils.expectElementNotToExist('#direction_RIGHT');
            testUtils.expectElementNotToExist('#direction_DOWN');
            testUtils.expectElementNotToExist('#direction_DOWN_LEFT');
        }));
        it('should cancel move when clicking on opponent piece', fakeAsync(async() => {
            // Given the initial board

            // When clicking on an opponent piece
            // Then expect click to be a failure
            await testUtils.expectClickFailure('#piece_8_0', RulesFailure.CANNOT_CHOOSE_OPPONENT_PIECE());
        }));
    });
    describe('second piece click', () => {
        it('should show translation and pushings directions when second piece is clicked', fakeAsync(async() => {
            // Given the initial board

            // When clicking on a piece then a second
            await testUtils.expectClickSuccess('#piece_2_6');
            await testUtils.expectClickSuccess('#piece_4_6');

            // Then legal direction should be shown and others not
            testUtils.expectElementToExist('#direction_LEFT');
            testUtils.expectElementToExist('#direction_UP');
            testUtils.expectElementToExist('#direction_UP_RIGHT');
            testUtils.expectElementToExist('#direction_RIGHT');

            testUtils.expectElementNotToExist('#direction_DOWN_LEFT');
            testUtils.expectElementNotToExist('#direction_DOWN');
        }));
        it('should unselect single piece when reclicking it', fakeAsync(async() => {
            // Given the initial board
            // When clicking a piece
            await testUtils.expectClickSuccess('#piece_2_7');

            // Then it should be highlighted
            const compo: AbaloneComponent = testUtils.getComponent();
            expect(compo.getPieceClasses(2, 7)).toEqual(['player0', 'highlighted']);

            // When reclicking it
            await testUtils.expectClickSuccess('#piece_2_7');

            // Then it should no longer be highlighted
            expect(compo.getPieceClasses(2, 7)).toEqual(['player0']);
        }));
        it('should select clicked piece when not aligned with first (non dir)', fakeAsync(async() => {
            // Given the initial board with first click
            await testUtils.expectClickSuccess('#piece_2_6');

            // When clicking second unaligned coord
            await testUtils.expectClickSuccess('#piece_4_7');

            // expect first to be unselected and new to be selected
            const compo: AbaloneComponent = testUtils.getComponent();
            expect(compo.getPieceClasses(2, 6)).toEqual(['player0']);
            expect(compo.getPieceClasses(4, 7)).toEqual(['player0', 'highlighted']);
        }));
        it('should select clicked piece when not aligned with first (non hexa dir)', fakeAsync(async() => {
            // Given the initial board with first click
            await testUtils.expectClickSuccess('#piece_2_6');

            // When clicking second unaligned coord
            await testUtils.expectClickSuccess('#piece_3_7');

            // expect first to be unselected and new to be selected
            const compo: AbaloneComponent = testUtils.getComponent();
            expect(compo.getPieceClasses(2, 6)).toEqual(['player0']);
            expect(compo.getPieceClasses(3, 7)).toEqual(['player0', 'highlighted']);
        }));
        it('should change first coord to clicked coord if valid extension side but hole in the extension', fakeAsync(async() => {
            // Given a board with a possible "holed line" selection
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
            testUtils.setupState(state);
            await testUtils.expectClickSuccess('#piece_1_5');

            // When choosing the piece that is aligned and at good distance but not making a line
            await testUtils.expectClickSuccess('#piece_1_7');

            // Then the old piece should be unselected and the new one selected
            const compo: AbaloneComponent = testUtils.getComponent();
            expect(compo.getPieceClasses(1, 5)).toEqual(['player0']);
            expect(compo.getPieceClasses(1, 7)).toEqual(['player0', 'highlighted']);
        }));
        it('should cancel move when trying to select more than three pieces', fakeAsync(async() => {
            // Given the initial board with one piece selected
            await testUtils.expectClickSuccess('#piece_0_7');

            // When clicking 3 space on the right
            await testUtils.expectClickFailure('#piece_3_7', AbaloneFailure.CANNOT_MOVE_MORE_THAN_THREE_PIECES());

            // Then piece should no longer be selected
            const compo: AbaloneComponent = testUtils.getComponent();
            expect(compo.getSquareClasses(0, 7)).toEqual([]);
        }));
    });
    describe('third click', () => {
        it('should deselect first piece only when reclicked, and change it', fakeAsync(async() => {
            // Given the initial board with 2 pieces selected
            await testUtils.expectClickSuccess('#piece_2_6');
            await testUtils.expectClickSuccess('#piece_3_6');

            // When clicking first piece
            await testUtils.expectClickSuccess('#piece_2_6');

            // Then only one piece should be selected
            const compo: AbaloneComponent = testUtils.getComponent();
            expect(compo.getPieceClasses(2, 6)).toEqual(['player0']);
            expect(compo.getPieceClasses(3, 6)).toEqual(['player0', 'highlighted']);
        }));
        it('should deselect last piece selected when reclicked', fakeAsync(async() => {
            // Given the initial board with 2 pieces selected
            await testUtils.expectClickSuccess('#piece_2_6');
            await testUtils.expectClickSuccess('#piece_3_6');

            // When clicking first piece
            await testUtils.expectClickSuccess('#piece_3_6');

            // Then only one piece should be selected
            const compo: AbaloneComponent = testUtils.getComponent();
            expect(compo.getPieceClasses(2, 6)).toEqual(['player0', 'highlighted']);
            expect(compo.getPieceClasses(3, 6)).toEqual(['player0']);
        }));
        it('should cancel move when clicking middle piece of a 3 piece column and selecting middle', fakeAsync(async() => {
            // Given the initial board
            // When clicking first coord then third coord
            await testUtils.expectClickSuccess('#piece_2_7');
            await testUtils.expectClickSuccess('#piece_4_7');

            // Then three pieces should be highlighted
            const compo: AbaloneComponent = testUtils.getComponent();
            expect(compo.getPieceClasses(2, 7)).toEqual(['player0', 'highlighted']);
            expect(compo.getPieceClasses(3, 7)).toEqual(['player0', 'highlighted']);
            expect(compo.getPieceClasses(4, 7)).toEqual(['player0', 'highlighted']);

            // When reclicking middle one
            await testUtils.expectClickSuccess('#piece_3_7');

            // Then all three pieces should be unselected
            expect(compo.getPieceClasses(2, 7)).toEqual(['player0']);
            expect(compo.getPieceClasses(3, 7)).toEqual(['player0']);
            expect(compo.getPieceClasses(4, 7)).toEqual(['player0']);
        }));
        it('should cancel move then select clicked piece as first piece when it is not aligned with first piece', fakeAsync(async() => {
            // Given the initial board with a line selected
            await testUtils.expectClickSuccess('#piece_2_6');
            await testUtils.expectClickSuccess('#piece_4_6');

            // When clicking on not aligned piece, then expect failure
            await testUtils.expectClickFailure('#piece_4_7', AbaloneFailure.LINE_AND_COORD_NOT_ALIGNED());
        }));
        it('should cancel move then select clicked piece as first piece when it is not aligned with second piece', fakeAsync(async() => {
            // Given the initial board with a line selected
            await testUtils.expectClickSuccess('#piece_2_6');
            await testUtils.expectClickSuccess('#piece_4_6');

            // When clicking on not aligned piece, then expect failure
            await testUtils.expectClickFailure('#piece_2_7', AbaloneFailure.LINE_AND_COORD_NOT_ALIGNED());
        }));
        it('should recognize line extension and show new directions (1-2-3)', fakeAsync(async() => {
            // Given the initial board with an extendable two piece line selected
            await testUtils.expectClickSuccess('#piece_2_6');
            await testUtils.expectClickSuccess('#piece_3_6');

            // When clicking third one
            await testUtils.expectClickSuccess('#piece_4_6');

            // Then three pieces should be selected
            const compo: AbaloneComponent = testUtils.getComponent();
            expect(compo.getPieceClasses(2, 6)).toEqual(['player0', 'highlighted']);
            expect(compo.getPieceClasses(3, 6)).toEqual(['player0', 'highlighted']);
            expect(compo.getPieceClasses(4, 6)).toEqual(['player0', 'highlighted']);
        }));
        it('should recognize line extension and show new directions (M-2-1-3) and move it as one', fakeAsync(async() => {
            // Given the initial board with an extendable two piece line selected
            await testUtils.expectClickSuccess('#piece_3_6');
            await testUtils.expectClickSuccess('#piece_2_6');

            // When clicking third one then moving them
            await testUtils.expectClickSuccess('#piece_4_6');
            const move: AbaloneMove = AbaloneMove.fromSingleCoord(new Coord(4, 6), HexaDirection.LEFT).get();
            const state: AbaloneState = AbaloneState.getInitialState();
            await testUtils.expectMoveSuccess('#direction_LEFT', move, state, [0, 0]);

            // Then three pieces should be selected
            const compo: AbaloneComponent = testUtils.getComponent();
            expect(compo.getSquareClasses(1, 6)).toEqual(['moved']);
            expect(compo.getSquareClasses(2, 6)).toEqual(['moved']);
            expect(compo.getSquareClasses(3, 6)).toEqual(['moved']);
            expect(compo.getSquareClasses(4, 6)).toEqual(['moved']);
        }));
        it('should refuse too long extension', fakeAsync(async() => {
            // Given the initial board with two space selected
            await testUtils.expectClickSuccess('#piece_0_7');
            await testUtils.expectClickSuccess('#piece_1_7');

            // When selecting an aligned piece too far
            // Then move should be cancel for "too-long-line" reason
            await testUtils.expectClickFailure('#piece_3_7', AbaloneFailure.CANNOT_MOVE_MORE_THAN_THREE_PIECES());
        }));
    });
    describe('direction click', () => {
        it('should do move when clicking direction', fakeAsync(async() => {
            // Given the initial board with piece selected
            await testUtils.expectClickSuccess('#piece_0_7');

            // When clicking on coord then direction
            // Then the move should be done
            const move: AbaloneMove = AbaloneMove.fromSingleCoord(new Coord(0, 7), HexaDirection.UP).get();
            const state: AbaloneState = AbaloneState.getInitialState();
            await testUtils.expectMoveSuccess('#direction_UP', move, state, [0, 0]);
        }));
    });
    it('should allow clicking on arrow landing coord as if it was the arrow (space)', fakeAsync(async() => {
        // Given the initial board with first space clicked
        await testUtils.expectClickSuccess('#piece_2_6');

        // When clicking on the space marked by the direction instead of it's arrow
        // Then the move should have been done
        const move: AbaloneMove = AbaloneMove.fromSingleCoord(new Coord(2, 6), HexaDirection.LEFT).get();
        const state: AbaloneState = AbaloneState.getInitialState();
        await testUtils.expectMoveSuccess('#case_1_6', move, state, [0, 0]);
    }));
    it('should allow clicking on arrow landing coord as if it was bellow an arrow (opponent)', fakeAsync(async() => {
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
        testUtils.setupState(state);
        await testUtils.expectClickSuccess('#piece_2_6');
        await testUtils.expectClickSuccess('#piece_2_7');

        // When clicking on the space marked by the direction instead of it's arrow
        // Then the move should have been done
        const move: AbaloneMove = AbaloneMove.fromSingleCoord(new Coord(2, 7), HexaDirection.UP).get();
        await testUtils.expectMoveSuccess('#piece_2_5', move, state, [0, 0]);
    }));
    it('should not do anything when clicking space that is not below a direction arrow', fakeAsync(async() => {
        // Given the initial board with first space clicked
        await testUtils.expectClickSuccess('#case_1_6');

        // When clicking on the space marked by the direction instead of it's arrow
        // Then expect nothing, just want this line covered!
    }));
    describe('showLastMove', () => {
        it('should show last move moved pieces (translation)', fakeAsync(async() => {
            // Given an initial board with two aligned pieces selected
            await testUtils.expectClickSuccess('#piece_2_6');
            await testUtils.expectClickSuccess('#piece_3_6');

            // When clicking the direction
            // Then the translation move should be done
            const move: AbaloneMove =
                AbaloneMove.fromDoubleCoord(new Coord(2, 6), new Coord(3, 6), HexaDirection.UP).get();
            const state: AbaloneState = AbaloneState.getInitialState();
            await testUtils.expectMoveSuccess('#direction_UP', move, state, [0, 0]);
        }));
        it('should show last move moved pieces (push)', fakeAsync(async() => {
            // Given a board with a previous move
            await testUtils.expectClickSuccess('#piece_0_7');
            await testUtils.expectClickSuccess('#piece_0_8');
            const move: AbaloneMove = AbaloneMove.fromSingleCoord(new Coord(0, 7), HexaDirection.DOWN).get();
            const state: AbaloneState = AbaloneState.getInitialState();
            await testUtils.expectMoveSuccess('#direction_DOWN', move, state, [0, 0]);

            // When ? then expect to see left and moved space
            const compo: AbaloneComponent = testUtils.getComponent();
            expect(compo.getSquareClasses(0, 7)).toEqual(['moved']);
            expect(compo.getSquareClasses(0, 8)).toEqual(['moved']);
        }));
    });
});
