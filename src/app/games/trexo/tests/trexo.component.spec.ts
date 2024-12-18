/* eslint-disable max-lines-per-function */
import { DebugElement } from '@angular/core';
import { fakeAsync } from '@angular/core/testing';
import { Coord } from 'src/app/jscaip/Coord';
import { Player } from 'src/app/jscaip/Player';
import { ComponentTestUtils } from 'src/app/utils/tests/TestUtils.spec';
import { TrexoComponent } from '../trexo.component';
import { TrexoFailure } from '../TrexoFailure';
import { TrexoMove } from '../TrexoMove';
import { TrexoPiece, TrexoPieceStack, TrexoState } from '../TrexoState';

const _____: TrexoPieceStack = TrexoPieceStack.EMPTY;
const O1_T0: TrexoPieceStack = TrexoPieceStack.of([new TrexoPiece(Player.ZERO, 0)]);
const O1_T1: TrexoPieceStack = TrexoPieceStack.of([new TrexoPiece(Player.ZERO, 1)]);
const O2_T2: TrexoPieceStack = TrexoPieceStack.of([
    new TrexoPiece(Player.ZERO, 0),
    new TrexoPiece(Player.ZERO, 2),
]);
const O1_T3: TrexoPieceStack = TrexoPieceStack.of([new TrexoPiece(Player.ZERO, 3)]);
const X1_T0: TrexoPieceStack = TrexoPieceStack.of([new TrexoPiece(Player.ONE, 0)]);
const X1_T1: TrexoPieceStack = TrexoPieceStack.of([new TrexoPiece(Player.ONE, 1)]);
const X2_T2: TrexoPieceStack = TrexoPieceStack.of([
    new TrexoPiece(Player.ONE, 0),
    new TrexoPiece(Player.ONE, 2),
]);
const X1_T3: TrexoPieceStack = TrexoPieceStack.of([new TrexoPiece(Player.ONE, 3)]);

describe('TrexoComponent', () => {

    let testUtils: ComponentTestUtils<TrexoComponent>;

    beforeEach(fakeAsync(async() => {
        testUtils = await ComponentTestUtils.forGame<TrexoComponent>('Trexo');
    }));

    describe('Commons tests', () => {
        for (const switchTo2D of [false, true]) {
            const name: string = switchTo2D ? '3D' : '2D';

            describe(name, () => {
                beforeEach(fakeAsync(async() => {
                    if (switchTo2D) {
                        await testUtils.clickElement('#switchTo2D');
                    }
                }));

                it('should create a third level', fakeAsync(async() => {
                    // Given a board with two level
                    const X0_X2: TrexoPieceStack = TrexoPieceStack.of([
                        new TrexoPiece(Player.ZERO, 0),
                        new TrexoPiece(Player.ZERO, 2),
                    ]);
                    const X0_O3: TrexoPieceStack = TrexoPieceStack.of([
                        new TrexoPiece(Player.ONE, 0),
                        new TrexoPiece(Player.ZERO, 3),
                    ]);
                    const O1_X2: TrexoPieceStack = TrexoPieceStack.of([
                        new TrexoPiece(Player.ZERO, 1),
                        new TrexoPiece(Player.ONE, 2),
                    ]);
                    const O1_X3: TrexoPieceStack = TrexoPieceStack.of([
                        new TrexoPiece(Player.ONE, 1),
                        new TrexoPiece(Player.ONE, 3),
                    ]);
                    const state: TrexoState = TrexoState.of([
                        [_____, _____, _____, _____, _____, _____, _____, _____, _____, _____],
                        [_____, _____, _____, _____, _____, _____, _____, _____, _____, _____],
                        [_____, _____, _____, _____, _____, _____, _____, _____, _____, _____],
                        [_____, _____, _____, _____, _____, _____, _____, _____, _____, _____],
                        [_____, _____, _____, _____, X0_X2, O1_X2, _____, _____, _____, _____],
                        [_____, _____, _____, _____, X0_O3, O1_X3, _____, _____, _____, _____],
                        [_____, _____, _____, _____, _____, _____, _____, _____, _____, _____],
                        [_____, _____, _____, _____, _____, _____, _____, _____, _____, _____],
                        [_____, _____, _____, _____, _____, _____, _____, _____, _____, _____],
                        [_____, _____, _____, _____, _____, _____, _____, _____, _____, _____],
                    ], 4);
                    await testUtils.setupState(state);

                    // When dropping a piece on the third level
                    await testUtils.expectClickSuccess('#space_4_4');
                    const move: TrexoMove = TrexoMove.from(new Coord(4, 5), new Coord(4, 4)).get();
                    await testUtils.expectMoveSuccess('#space_4_5', move);

                    // Then it should display a third level piece
                    testUtils.expectElementToExist('#half_tile_4_4_2');
                    testUtils.expectElementToExist('#half_tile_4_5_2');
                }));

                describe('first click', () => {
                    it(`should drop the opponent's piece first`, fakeAsync(async() => {
                        // Given any board
                        // When clicking on a possible first coord
                        // Then the click should be a success
                        await testUtils.expectClickSuccess('#space_5_5');
                        // and a dropped piece for the opponent should be displayed
                        testUtils.expectElementToExist('#dropped_piece_5_5_0');
                    }));

                    it(`should fail when clicking on an isolated piece`, fakeAsync(async() => {
                        // Given a board on which 1 space is higher than all its neighbooring space (except its "twin")
                        const state: TrexoState = TrexoState.of([
                            [_____, _____, _____, _____, _____, _____, _____, _____, _____, _____],
                            [_____, _____, _____, _____, _____, _____, _____, _____, _____, _____],
                            [_____, _____, _____, _____, _____, _____, _____, _____, _____, _____],
                            [_____, _____, _____, _____, _____, _____, _____, _____, _____, _____],
                            [_____, _____, _____, _____, O1_T0, _____, _____, _____, _____, _____],
                            [_____, _____, _____, _____, X1_T0, _____, _____, _____, _____, _____],
                            [_____, _____, _____, _____, _____, _____, _____, _____, _____, _____],
                            [_____, _____, _____, _____, _____, _____, _____, _____, _____, _____],
                            [_____, _____, _____, _____, _____, _____, _____, _____, _____, _____],
                            [_____, _____, _____, _____, _____, _____, _____, _____, _____, _____],
                        ], 1);
                        await testUtils.setupState(state);

                        // When trying to choose it as first coord
                        // Then it should fail
                        const reason: string = TrexoFailure.NO_WAY_TO_DROP_IT_HERE();
                        await testUtils.expectClickFailure('#space_4_4', reason);
                    }));

                    it('should show possible next click amongst the possible neigbhors', fakeAsync(async() => {
                        // Given any board
                        // When clicking on a possible first coord (whose neighbor are empty spaces)
                        await testUtils.expectClickSuccess('#space_5_5');
                        // Then the possible next click should be highlighted
                        testUtils.expectElementToHaveClass('#space_4_5', 'darker');
                        testUtils.expectElementToHaveClass('#space_6_5', 'darker');
                        testUtils.expectElementToHaveClass('#space_5_4', 'darker');
                        testUtils.expectElementToHaveClass('#space_5_6', 'darker');
                    }));

                    it('should allow clicking on second level', fakeAsync(async() => {
                        // Given any board where two neighboring tiles are on the same level
                        await testUtils.expectClickSuccess('#space_0_0');
                        let move: TrexoMove = TrexoMove.from(new Coord(0, 1), new Coord(0, 0)).get();
                        await testUtils.expectMoveSuccess('#space_0_1', move);
                        await testUtils.expectClickSuccess('#space_1_0');
                        move = TrexoMove.from(new Coord(1, 0), new Coord(1, 1)).get();
                        await testUtils.expectMoveSuccess('#space_1_1', move);

                        // When clicking on one of them
                        await testUtils.expectClickSuccess('#space_0_0');

                        // Then the dropped piece should appear on it
                        testUtils.expectElementToExist('#dropped_piece_0_0_1');
                    }));

                    it('should display darker landable pieces when possible landing are not the floor', fakeAsync(async() => {
                        // Given any board where two neighboring tiles are on the same level
                        await testUtils.expectClickSuccess('#space_0_0');
                        let move: TrexoMove = TrexoMove.from(new Coord(0, 1), new Coord(0, 0)).get();
                        await testUtils.expectMoveSuccess('#space_0_1', move);
                        await testUtils.expectClickSuccess('#space_1_0');
                        move = TrexoMove.from(new Coord(1, 0), new Coord(1, 1)).get();
                        await testUtils.expectMoveSuccess('#space_1_1', move);

                        // When selecting a piece on that level
                        await testUtils.expectClickSuccess('#space_0_0');

                        // Then the neighboring piece should be darker
                        testUtils.expectElementToHaveClass('#tile_1_0_0', 'darker');
                    }));
                });

                describe(`second click`, () => {
                    it(`should allow legal move`, fakeAsync(async() => {
                        // Given any board on which a first click has been made
                        await testUtils.expectClickSuccess('#space_5_5');

                        // When clicking on a valid neighbor coord
                        // Then the move should succeed, and the first click should be the piece of Player.ONE
                        // Because the opponent piece is dropped first
                        const move: TrexoMove = TrexoMove.from(new Coord(6, 5), new Coord(5, 5)).get();
                        await testUtils.expectMoveSuccess('#space_6_5', move);
                        testUtils.expectElementToExist('#half_tile_5_5_0');
                        testUtils.expectElementToExist('#half_tile_6_5_0');
                    }));

                    it('should allow dropping on second level', fakeAsync(async() => {
                        // Given any board where two neighboring tiles are on the same level
                        const state: TrexoState = TrexoState.of([
                            [_____, _____, _____, _____, _____, _____, _____, _____, _____, _____],
                            [_____, _____, _____, _____, _____, _____, _____, _____, _____, _____],
                            [_____, _____, _____, _____, _____, _____, _____, _____, _____, _____],
                            [_____, _____, _____, _____, X1_T0, _____, _____, _____, _____, _____],
                            [_____, _____, _____, _____, O1_T0, O1_T1, _____, _____, _____, _____],
                            [_____, _____, _____, _____, _____, X1_T1, _____, _____, _____, _____],
                            [_____, _____, _____, _____, _____, _____, _____, _____, _____, _____],
                            [_____, _____, _____, _____, _____, _____, _____, _____, _____, _____],
                            [_____, _____, _____, _____, _____, _____, _____, _____, _____, _____],
                            [_____, _____, _____, _____, _____, _____, _____, _____, _____, _____],
                        ], 2);
                        await testUtils.setupState(state);
                        // And a first click has been done on that level
                        await testUtils.expectClickSuccess('#space_4_4');

                        // When clicking a second time
                        const move: TrexoMove = TrexoMove.from(new Coord(5, 4), new Coord(4, 4)).get();

                        // Then the move should succeed
                        await testUtils.expectMoveSuccess('#space_5_4', move);
                    }));

                    it(`should change the first dropped coord when clicking too far`, fakeAsync(async() => {
                        // Given any board on which a first click has been made
                        await testUtils.expectClickSuccess('#space_5_5');

                        // When clicking on a far away coord (that is still valid)
                        await testUtils.expectClickSuccess('#space_7_7');

                        // Then the dropped piece changed
                        testUtils.expectElementNotToExist('#dropped_piece_5_5_0');
                        testUtils.expectElementToExist('#dropped_piece_7_7_0');
                        // And the four "dark zone" around (5, 5) should have been removed
                        testUtils.expectElementNotToHaveClass('#space_5_4', 'darker');
                        testUtils.expectElementNotToHaveClass('#space_5_6', 'darker');
                        testUtils.expectElementNotToHaveClass('#space_4_5', 'darker');
                        testUtils.expectElementNotToHaveClass('#space_6_5', 'darker');
                        // And the four new "dark zone" arround (7, 7) should be there
                        testUtils.expectElementToHaveClass('#space_7_6', 'darker');
                        testUtils.expectElementToHaveClass('#space_7_8', 'darker');
                        testUtils.expectElementToHaveClass('#space_6_7', 'darker');
                        testUtils.expectElementToHaveClass('#space_8_7', 'darker');
                    }));

                    it(`should show last move`, fakeAsync(async() => {
                        // Given any board on which a first click has been made
                        await testUtils.expectClickSuccess('#space_5_5');

                        // When finalizing the move
                        const move: TrexoMove = TrexoMove.from(new Coord(4, 5), new Coord(5, 5)).get();
                        await testUtils.expectMoveSuccess('#space_4_5', move);

                        // Then the dropped coords should be highlighted
                        testUtils.expectElementToHaveClass('#tile_4_5_0', 'last-move-stroke');
                        testUtils.expectElementToHaveClass('#tile_5_5_0', 'last-move-stroke');
                    }));

                    it(`should cancel move when clicking again on the same coord`, fakeAsync(async() => {
                        // Given any board on which a first click has been made
                        await testUtils.expectClickSuccess('#space_5_5');

                        // When clicking on the same coord again
                        // Then the move should be canceled without toast
                        await testUtils.expectClickFailure('#space_5_5');
                        // And the piece deselected
                        testUtils.expectElementNotToExist('#dropped_piece_5_5');
                    }));

                    it('should highlight victory', fakeAsync(async() => {
                        // Given any board on which a 4 moves have already been done, aligning piece of Player.ZERO
                        const state: TrexoState = TrexoState.of([
                            [_____, _____, _____, _____, _____, _____, _____, _____, _____, _____],
                            [_____, _____, _____, _____, _____, _____, _____, _____, _____, _____],
                            [_____, _____, _____, X1_T0, _____, X2_T2, _____, _____, _____, _____],
                            [_____, _____, _____, O1_T0, O1_T1, O2_T2, O1_T3, _____, _____, _____],
                            [_____, _____, _____, _____, X1_T1, _____, X1_T3, _____, _____, _____],
                            [_____, _____, _____, _____, _____, _____, _____, _____, _____, _____],
                            [_____, _____, _____, _____, _____, _____, _____, _____, _____, _____],
                            [_____, _____, _____, _____, _____, _____, _____, _____, _____, _____],
                            [_____, _____, _____, _____, _____, _____, _____, _____, _____, _____],
                            [_____, _____, _____, _____, _____, _____, _____, _____, _____, _____],
                        ], 4);
                        await testUtils.setupState(state);
                        await testUtils.expectClickSuccess('#space_7_2');

                        // When doing the victorious move
                        const move: TrexoMove = TrexoMove.from(new Coord(7, 3), new Coord(7, 2)).get();

                        // Then the 5 victory coords should be highlighted
                        await testUtils.expectMoveSuccess('#space_7_3', move);
                        testUtils.expectElementToHaveClass('#tile_3_3_0', 'victory-stroke');
                        testUtils.expectElementToHaveClass('#tile_4_3_0', 'victory-stroke');
                        testUtils.expectElementToHaveClass('#tile_5_3_0', 'victory-stroke');
                        testUtils.expectElementToHaveClass('#tile_6_3_0', 'victory-stroke');
                        testUtils.expectElementToHaveClass('#tile_7_3_0', 'victory-stroke');
                    }));
                });

            });
        }
    });

    describe(`view`, () => {

        it(`should provide a button to switch 2D`, fakeAsync(async() => {
            // Given a component just started
            // When clicking on the switchTo2D button
            await testUtils.clickElement('#switchTo2D');

            // Then switchTo3D should now be visible
            testUtils.expectElementToExist('#switchTo3D');
        }));

        it(`should provide a button to switch to 3D when in 2D`, fakeAsync(async() => {
            // Given a component on which we are in 2D mode
            await testUtils.clickElement('#switchTo2D');

            // When clicking on the switchTo3D button
            await testUtils.clickElement('#switchTo3D');

            // Then switchTo2D should now be visible again
            testUtils.expectElementToExist('#switchTo2D');
        }));

        it('should ask tile to display number when 2D mode', fakeAsync(async() => {
            // Given a board in 3D move with one move done already
            await testUtils.expectClickSuccess('#space_5_5');
            const move: TrexoMove = TrexoMove.from(new Coord(4, 5), new Coord(5, 5)).get();
            await testUtils.expectMoveSuccess('#space_4_5', move);

            // When choosing 2D move
            await testUtils.clickElement('#switchTo2D');

            // Then number indicating the height should be present on pieces
            const height: DebugElement = testUtils.findElement('#height_5_5_0');
            expect(height.nativeElement.innerHTML).toBe('0');
        }));

        it('should not transfer upper piece style to lower piece', fakeAsync(async() => {
            // Given one 3D display with one Stack in two color
            const O0_X2: TrexoPieceStack = TrexoPieceStack.of([
                new TrexoPiece(Player.ZERO, 0),
                new TrexoPiece(Player.ONE, 2),
            ]);
            const O1_X2: TrexoPieceStack = TrexoPieceStack.of([
                new TrexoPiece(Player.ZERO, 1),
                new TrexoPiece(Player.ONE, 2),
            ]);
            const state: TrexoState = TrexoState.of([
                [_____, _____, _____, _____, _____, _____, _____, _____, _____, _____],
                [_____, _____, _____, _____, _____, _____, _____, _____, _____, _____],
                [_____, _____, _____, _____, _____, _____, _____, _____, _____, _____],
                [_____, _____, _____, _____, X1_T0, _____, _____, _____, _____, _____],
                [_____, _____, _____, _____, O0_X2, O1_X2, _____, _____, _____, _____],
                [_____, _____, _____, _____, _____, X1_T1, _____, _____, _____, _____],
                [_____, _____, _____, _____, _____, _____, _____, _____, _____, _____],
                [_____, _____, _____, _____, _____, _____, _____, _____, _____, _____],
                [_____, _____, _____, _____, _____, _____, _____, _____, _____, _____],
                [_____, _____, _____, _____, _____, _____, _____, _____, _____, _____],
            ], 2);

            // When displaying it
            await testUtils.setupState(state);

            // Then lower piece should still be of Player.ZERO and higher be of Player.ONE
            testUtils.expectElementToHaveClass('#tile_4_4_0', 'player0-fill');
            testUtils.expectElementToHaveClass('#tile_4_4_1', 'player1-fill');
        }));

    });

});
