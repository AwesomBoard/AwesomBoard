/* eslint-disable max-lines-per-function */
import { GipfComponent } from '../gipf.component';
import { MGPOptional } from 'src/app/utils/MGPOptional';
import { GipfFailure } from 'src/app/games/gipf/GipfFailure';
import { HexaDirection } from 'src/app/jscaip/HexaDirection';
import { ComponentTestUtils } from 'src/app/utils/tests/TestUtils.spec';
import { fakeAsync } from '@angular/core/testing';
import { Coord } from 'src/app/jscaip/Coord';
import { GipfMove, GipfPlacement } from 'src/app/games/gipf/GipfMove';
import { GipfState } from 'src/app/games/gipf/GipfState';
import { Arrow } from 'src/app/jscaip/Arrow';
import { Table } from 'src/app/utils/ArrayUtils';
import { FourStatePiece } from 'src/app/jscaip/FourStatePiece';
import { Player } from 'src/app/jscaip/Player';
import { GipfCapture } from 'src/app/jscaip/GipfProjectHelper';

describe('GipfComponent', () => {

    let testUtils: ComponentTestUtils<GipfComponent>;

    const _: FourStatePiece = FourStatePiece.EMPTY;
    const N: FourStatePiece = FourStatePiece.UNREACHABLE;
    const A: FourStatePiece = FourStatePiece.ZERO;
    const B: FourStatePiece = FourStatePiece.ONE;
    const P0Turn: number = 6;
    const P1Turn: number = P0Turn + 1;

    function expectToHaveArrow(start: Coord, end: Coord): void {
        expect(testUtils.getGameComponent().arrows.some((arrow: Arrow) => {
            return arrow.source.equals(start) && arrow.destination.equals(end);
        })).withContext('expected to have an arrow pointing from ' + start.toString() + ' to ' + end.toString())
            .toBeTrue();
    }

    beforeEach(fakeAsync(async() => {
        testUtils = await ComponentTestUtils.forGame<GipfComponent>('Gipf');
    }));

    it('should create', () => {
        testUtils.expectToBeCreated();
    });

    describe('First click', () => {

        it('should allow placement directly resulting in a move if there is no initial capture', fakeAsync(async() => {
            // Given a board on which some external space is empty
            // When clicking on that piece
            const move: GipfMove = new GipfMove(new GipfPlacement(new Coord(0, 4), MGPOptional.empty()), [], []);
            // Then the move should be legal and insert immediately the piece on that space
            await testUtils.expectMoveSuccess('#click_0_4', move);
        }));

        it('should not accept selecting a non-border coord for placement', fakeAsync(async() => {
            // Given any board with empty space
            // When clicking on those spaces as first click
            // Then it should be a failure
            await testUtils.expectClickFailure('#click_3_3', GipfFailure.PLACEMENT_NOT_ON_BORDER());
        }));

        it('should show possible directions after selecting an occupied placement coord', fakeAsync(async() => {
            // Given any board

            // When clicking on an occupied border space
            await testUtils.expectClickSuccess('#click_6_3');

            // Then the possible pushing direction should be shown
            expect(testUtils.getGameComponent().arrows.length).toBe(3);
            expectToHaveArrow(new Coord(6, 3), new Coord(5, 3));
            expectToHaveArrow(new Coord(6, 3), new Coord(6, 2));
            expectToHaveArrow(new Coord(6, 3), new Coord(5, 4));
        }));

        it('should not allow clicking on anything else than a capture if there is one in the initial captures', fakeAsync(async() => {
            // Given a board on which a capture is possible
            const board: Table<FourStatePiece> = [
                [N, N, N, _, _, _, _],
                [N, N, _, _, A, _, _],
                [N, _, _, A, _, A, _],
                [_, _, _, A, A, _, _],
                [_, _, _, A, B, B, N],
                [_, _, B, A, _, N, N],
                [_, _, _, _, N, N, N],
            ];
            const state: GipfState = new GipfState(board, P0Turn, [5, 5], [0, 0]);
            await testUtils.setupState(state);

            // When clicking on a space/piece not part of a capture
            // Then it should be a failure
            await testUtils.expectClickFailure('#click_6_3', GipfFailure.MISSING_CAPTURES());
        }));

        it('should highlight initial captures directly', fakeAsync(async() => {
            // Given a board on which a capture is possible
            const board: Table<FourStatePiece> = [
                [N, N, N, _, _, _, _],
                [N, N, _, _, _, _, _],
                [N, _, _, A, _, _, _],
                [_, _, _, A, _, _, _],
                [_, _, _, A, _, _, N],
                [_, _, _, A, _, N, N],
                [_, _, _, _, N, N, N],
            ];
            const state: GipfState = new GipfState(board, P0Turn, [5, 5], [0, 0]);
            await testUtils.setupState(state);

            // When clicking a piece amongst the capturable one
            await testUtils.expectClickSuccess('#click_3_3');

            // Then the capture should already be shown (the piece "captured")
            testUtils.expectElementToHaveClasses('#space_3_2', ['base', 'captured-fill']);
            testUtils.expectElementToHaveClasses('#space_3_3', ['base', 'captured-fill']);
            testUtils.expectElementToHaveClasses('#space_3_4', ['base', 'captured-fill']);
            testUtils.expectElementToHaveClasses('#space_3_5', ['base', 'captured-fill']);
        }));

        it('should make pieces disappear upon selection of a capture', fakeAsync(async() => {
            // Given a board where a capture must be done immediately
            const board: Table<FourStatePiece> = [
                [N, N, N, _, _, _, _],
                [N, N, _, _, A, _, _],
                [N, _, _, A, _, A, _],
                [_, _, _, A, A, _, _],
                [_, _, _, A, B, B, N],
                [_, _, B, A, _, N, N],
                [_, _, _, _, N, N, N],
            ];
            const state: GipfState = new GipfState(board, P0Turn, [5, 5], [0, 0]);
            await testUtils.setupState(state);

            // When clicking on a piece part of the capture
            await testUtils.expectClickSuccess('#click_3_3');

            // Then the piece should be disappeared
            expect(testUtils.getGameComponent().isPiece(new Coord(3, 2))).toBeFalse();
            expect(testUtils.getGameComponent().isPiece(new Coord(3, 3))).toBeFalse();
            expect(testUtils.getGameComponent().isPiece(new Coord(3, 4))).toBeFalse();
            expect(testUtils.getGameComponent().isPiece(new Coord(3, 5))).toBeFalse();
        }));

        it('should not allow capturing from a coord that is part of intersecting captures', fakeAsync(async() => {
            // Given a board on which two capture touch each other on one common space
            const board: Table<FourStatePiece> = [
                [N, N, N, _, _, _, _],
                [N, N, _, _, _, _, _],
                [N, _, _, A, _, A, _],
                [B, B, B, B, B, _, _],
                [_, A, B, _, _, _, N],
                [A, _, B, _, _, N, N],
                [_, _, B, _, N, N, N],
            ];
            const state: GipfState = new GipfState(board, P1Turn, [5, 5], [0, 0]);
            await testUtils.setupState(state);

            // When clicking on that space
            // Then it should be a failure due to ambiguity
            await testUtils.expectClickFailure('#click_2_3', GipfFailure.AMBIGUOUS_CAPTURE_COORD());
        }));

        it('should not allow selecting placement when no direction is valid', fakeAsync(async() => {
            // Given a board with a entry space without any possible pushing direction
            const board: Table<FourStatePiece> = [
                [N, N, N, _, _, _, B],
                [N, N, _, _, _, A, _],
                [N, _, _, _, B, _, _],
                [A, _, _, A, _, _, _],
                [B, _, B, _, _, _, N],
                [A, A, _, _, _, N, N],
                [B, A, B, A, N, N, N],
            ];
            const state: GipfState = new GipfState(board, P0Turn, [5, 5], [0, 0]);
            await testUtils.setupState(state);

            // When clicking on that space
            // Then it should be a failure
            await testUtils.expectClickFailure('#click_0_6', GipfFailure.NO_DIRECTIONS_AVAILABLE());
        }));

    });

    it('should accept placing after performing initial captures', fakeAsync(async() => {
        const board: Table<FourStatePiece> = [
            [N, N, N, _, _, _, _],
            [N, N, _, _, A, _, _],
            [N, _, _, A, _, A, _],
            [_, _, _, A, A, _, _],
            [_, _, _, A, B, B, N],
            [_, _, B, A, _, N, N],
            [_, _, _, _, N, N, N],
        ];
        const state: GipfState = new GipfState(board, P0Turn, [5, 5], [0, 0]);
        await testUtils.setupState(state);

        await testUtils.expectClickSuccess('#click_3_3');
        const move: GipfMove = new GipfMove(new GipfPlacement(new Coord(0, 4), MGPOptional.empty()),
                                            [new GipfCapture([
                                                new Coord(3, 2), new Coord(3, 3), new Coord(3, 4), new Coord(3, 5),
                                            ])], []);
        await testUtils.expectMoveSuccess('#click_0_4', move);
    }));

    it('should not allow clicking on anything else than a capture if there is one in the final captures', fakeAsync(async() => {
        const board: Table<FourStatePiece> = [
            [N, N, N, _, _, _, _],
            [N, N, _, _, _, _, _],
            [N, _, _, A, _, A, _],
            [B, B, A, _, _, _, _],
            [_, A, B, _, _, _, N],
            [A, _, B, _, _, N, N],
            [_, _, B, _, N, N, N],
        ];
        const state: GipfState = new GipfState(board, P1Turn, [5, 5], [0, 0]);
        await testUtils.setupState(state);

        // Perform the placement to prepare for final capture
        await testUtils.expectClickSuccess('#click_0_3');
        await testUtils.expectClickSuccess('#click_1_3');
        await testUtils.expectClickFailure('#click_3_3', GipfFailure.MISSING_CAPTURES());
    }));

    it('should perform move after final captures has been done', fakeAsync(async() => {
        const board: Table<FourStatePiece> = [
            [N, N, N, _, _, _, _],
            [N, N, _, _, _, _, _],
            [N, _, _, A, _, A, _],
            [B, B, A, _, _, _, _],
            [_, A, B, _, _, _, N],
            [A, _, B, _, _, N, N],
            [_, _, B, _, N, N, N],
        ];
        const state: GipfState = new GipfState(board, P1Turn, [5, 5], [0, 0]);
        await testUtils.setupState(state);

        await testUtils.expectClickSuccess('#click_0_3');
        await testUtils.expectClickSuccess('#click_1_3');

        const move: GipfMove = new GipfMove(new GipfPlacement(new Coord(0, 3), MGPOptional.of(HexaDirection.RIGHT)),
                                            [],
                                            [new GipfCapture([
                                                new Coord(2, 3), new Coord(2, 4), new Coord(2, 5), new Coord(2, 6),
                                            ])]);

        await testUtils.expectMoveSuccess('#click_2_3', move);
    }));

    it('should highlight moved pieces only', fakeAsync(async() => {
        const board: Table<FourStatePiece> = [
            [N, N, N, _, _, _, _],
            [N, N, _, _, A, _, _],
            [N, _, _, _, _, A, _],
            [_, _, _, _, B, _, _],
            [_, _, _, A, _, _, N],
            [_, _, _, _, _, N, N],
            [_, B, _, _, N, N, N],
        ];
        const state: GipfState = new GipfState(board, P0Turn, [5, 5], [0, 0]);
        await testUtils.setupState(state);

        const placement: GipfPlacement = new GipfPlacement(new Coord(1, 6), MGPOptional.of(HexaDirection.UP_RIGHT));
        const move: GipfMove = new GipfMove(placement, [], []);
        await testUtils.expectClickSuccess('#click_1_6');
        await testUtils.expectMoveSuccess('#click_2_5', move);

        expect(testUtils.getGameComponent().getSpaceClass(new Coord(1, 6))).toEqual('moved-fill');
        expect(testUtils.getGameComponent().getSpaceClass(new Coord(2, 5))).toEqual('moved-fill');
        expect(testUtils.getGameComponent().getSpaceClass(new Coord(3, 4))).not.toEqual('moved-fill');
    }));

    it('should highlight capturable pieces', fakeAsync(async() => {
        const board: Table<FourStatePiece> = [
            [N, N, N, _, _, _, _],
            [N, N, _, _, A, _, _],
            [N, _, _, A, _, A, _],
            [_, _, _, A, A, _, _],
            [_, _, _, A, B, B, N],
            [_, _, B, A, _, N, N],
            [_, _, _, _, N, N, N],
        ];
        const state: GipfState = new GipfState(board, P0Turn, [5, 5], [0, 0]);
        await testUtils.setupState(state);

        expect(testUtils.getGameComponent().possibleCaptures).toContain(new GipfCapture([
            new Coord(3, 2),
            new Coord(3, 3),
            new Coord(3, 4),
            new Coord(3, 5),
        ]));
    }));

    it('should highlight captured pieces positions', fakeAsync(async() => {
        const board: Table<FourStatePiece> = [
            [N, N, N, _, _, _, _],
            [N, N, _, _, A, _, _],
            [N, _, _, A, _, A, _],
            [_, _, _, A, A, _, _],
            [_, _, _, A, B, B, N],
            [_, _, B, A, _, N, N],
            [_, _, _, _, N, N, N],
        ];
        const state: GipfState = new GipfState(board, P0Turn, [5, 5], [0, 0]);
        await testUtils.setupState(state);

        await testUtils.expectClickSuccess('#click_3_3');
        const move: GipfMove = new GipfMove(new GipfPlacement(new Coord(0, 4), MGPOptional.empty()),
                                            [new GipfCapture([
                                                new Coord(3, 2), new Coord(3, 3), new Coord(3, 4), new Coord(3, 5),
                                            ])], []);

        await testUtils.expectMoveSuccess('#click_0_4', move);

        testUtils.expectElementToHaveClasses('#space_3_2', ['base', 'captured-fill']);
        testUtils.expectElementToHaveClasses('#space_3_3', ['base', 'captured-fill']);
        testUtils.expectElementToHaveClasses('#space_3_4', ['base', 'captured-fill']);
        testUtils.expectElementToHaveClasses('#space_3_5', ['base', 'captured-fill']);
    }));

    it('should update the number of pieces available', fakeAsync(async() => {
        const board: Table<FourStatePiece> = [
            [N, N, N, _, _, _, _],
            [N, N, _, _, A, _, _],
            [N, _, _, A, _, A, _],
            [_, _, _, A, A, _, _],
            [_, _, _, A, B, B, N],
            [_, _, B, A, _, N, N],
            [_, _, _, _, N, N, N],
        ];
        const state: GipfState = new GipfState(board, P0Turn, [5, 5], [0, 0]);
        await testUtils.setupState(state);

        await testUtils.expectClickSuccess('#click_3_3');
        const move: GipfMove = new GipfMove(new GipfPlacement(new Coord(0, 4), MGPOptional.empty()),
                                            [new GipfCapture([
                                                new Coord(3, 2), new Coord(3, 3), new Coord(3, 4), new Coord(3, 5),
                                            ])], []);

        await testUtils.expectMoveSuccess('#click_0_4', move);

        expect(testUtils.getGameComponent().getPlayerSidePieces(Player.ZERO).length).toBe(8);
        expect(testUtils.getGameComponent().getPlayerSidePieces(Player.ONE).length).toBe(5);
    }));

    it('should not accept placement on a complete line', fakeAsync(async() => {
        const board: Table<FourStatePiece> = [
            [N, N, N, _, _, _, _],
            [N, N, _, _, A, _, B],
            [N, _, _, _, _, A, _],
            [_, _, _, _, B, _, _],
            [_, _, _, A, _, _, N],
            [_, _, B, _, _, N, N],
            [_, B, _, _, N, N, N],
        ];
        const state: GipfState = new GipfState(board, P0Turn, [5, 5], [0, 0]);
        await testUtils.setupState(state);

        await testUtils.expectClickSuccess('#click_1_6');
        expect(testUtils.getGameComponent().arrows.length).toBe(1);
        await testUtils.expectClickFailure('#click_2_5', GipfFailure.PLACEMENT_ON_COMPLETE_LINE());
    }));

    it('should accept moves with two initial captures', fakeAsync(async() => {
        const board: Table<FourStatePiece> = [
            [N, N, N, _, _, _, _],
            [N, N, A, _, A, _, _],
            [N, _, A, _, A, _, _],
            [_, _, A, _, A, _, _],
            [_, _, A, _, A, _, N],
            [_, _, _, _, _, N, N],
            [_, _, _, _, N, N, N],
        ];
        const state: GipfState = new GipfState(board, P0Turn, [5, 5], [0, 0]);
        await testUtils.setupState(state);

        const move: GipfMove = new GipfMove(new GipfPlacement(new Coord(6, 3),
                                                              MGPOptional.empty()),
                                            [
                                                new GipfCapture([
                                                    new Coord(4, 4), new Coord(4, 3),
                                                    new Coord(4, 2), new Coord(4, 1),
                                                ]),
                                                new GipfCapture([
                                                    new Coord(2, 4), new Coord(2, 3),
                                                    new Coord(2, 2), new Coord(2, 1),
                                                ]),
                                            ], []);

        await testUtils.expectClickSuccess('#click_4_4');
        await testUtils.expectClickSuccess('#click_2_4');
        await testUtils.expectMoveSuccess('#click_6_3', move);
    }));

    it('should accept moves with two final captures', fakeAsync(async() => {
        const board: Table<FourStatePiece> = [
            [N, N, N, _, _, _, _],
            [N, N, A, _, A, _, _],
            [N, _, A, _, A, _, _],
            [_, _, A, _, A, _, _],
            [_, _, _, A, B, A, N],
            [_, _, _, _, _, N, N],
            [_, _, _, _, N, N, N],
        ];
        const state: GipfState = new GipfState(board, P0Turn, [5, 5], [0, 0]);
        await testUtils.setupState(state);

        const move: GipfMove = new GipfMove(new GipfPlacement(new Coord(5, 4),
                                                              MGPOptional.of(HexaDirection.LEFT)),
                                            [],
                                            [
                                                new GipfCapture([
                                                    new Coord(4, 4), new Coord(4, 3),
                                                    new Coord(4, 2), new Coord(4, 1),
                                                ]),
                                                new GipfCapture([
                                                    new Coord(2, 4), new Coord(2, 3),
                                                    new Coord(2, 2), new Coord(2, 1),
                                                ]),
                                            ]);

        await testUtils.expectClickSuccess('#click_5_4'); // select placement coord
        await testUtils.expectClickSuccess('#click_4_4'); // select direction
        await testUtils.expectClickSuccess('#click_4_4'); // select first capture
        await testUtils.expectMoveSuccess('#click_2_4', move); // select second capture
    }));

    it('should remove highlights and arrows upon move cancelation', fakeAsync(async() => {
        const board: Table<FourStatePiece> = [
            [N, N, N, _, _, _, _],
            [N, N, _, _, _, _, _],
            [N, _, _, A, _, _, _],
            [_, _, _, A, A, _, _],
            [_, _, _, A, A, _, N],
            [_, _, _, A, A, N, N],
            [_, _, _, _, N, N, N],
        ];
        const state: GipfState = new GipfState(board, P0Turn, [5, 5], [0, 0]);
        await testUtils.setupState(state);

        await testUtils.expectClickSuccess('#click_3_3');
        await testUtils.expectClickSuccess('#click_4_5');
        await testUtils.expectClickSuccess('#click_4_4');
        await testUtils.expectClickFailure('#click_3_3', GipfFailure.MISSING_CAPTURES());

        testUtils.expectElementToHaveClasses('#space_4_5', ['base']);
        testUtils.expectElementToHaveClasses('#space_3_3', ['base']);
        expect(testUtils.getGameComponent().arrows.length).toBe(0);
    }));

    it('should recompute captures upon intersecting captures', fakeAsync(async() => {
        const board: Table<FourStatePiece> = [
            [N, N, N, A, _, _, A],
            [N, N, _, A, _, _, A],
            [N, A, A, _, A, B, A],
            [_, _, _, A, _, _, A],
            [_, _, _, A, _, _, N],
            [A, A, A, B, B, N, N],
            [_, _, _, A, N, N, N],
        ];
        const state: GipfState = new GipfState(board, P0Turn, [8, 4], [2, 3]);
        await testUtils.setupState(state);

        const move: GipfMove = new GipfMove(
            new GipfPlacement(new Coord(3, 6), MGPOptional.of(HexaDirection.UP)),
            [new GipfCapture([
                new Coord(6, 0),
                new Coord(6, 1),
                new Coord(6, 2),
                new Coord(6, 3),
            ])],
            [
                new GipfCapture([
                    new Coord(0, 5),
                    new Coord(1, 5),
                    new Coord(2, 5),
                    new Coord(3, 5),
                    new Coord(4, 5),
                ]),
                new GipfCapture([
                    new Coord(3, 0),
                    new Coord(3, 1),
                    new Coord(3, 2),
                    new Coord(3, 3),
                    new Coord(3, 4),
                ]),
            ],
        );
        await testUtils.expectClickSuccess('#click_6_0'); // Initial capture
        await testUtils.expectClickSuccess('#click_3_6'); // Placement coord
        await testUtils.expectClickSuccess('#click_3_5'); // Placement direction
        await testUtils.expectClickSuccess('#click_0_5'); // Final capture 1
        await testUtils.expectMoveSuccess('#click_3_0', move); // Final capture 2
    }));

    it('should select clicked coord when clicking on another piece to push', fakeAsync(async() => {
        // Given any board where a insertion coord has been chosen
        await testUtils.expectClickSuccess('#click_6_3');

        // When clicking on an occupied border space
        await testUtils.expectClickSuccess('#click_3_6');

        // Then the possible pushing direction should be shown
        expect(testUtils.getGameComponent().arrows.length).toBe(3);
        expectToHaveArrow(new Coord(3, 6), new Coord(2, 6));
        expectToHaveArrow(new Coord(3, 6), new Coord(3, 5));
        expectToHaveArrow(new Coord(3, 6), new Coord(4, 5));
    }));

    it('should deselect selected coord when clicking on it again', fakeAsync(async() => {
        // Given any board on which one piece is selected for push
        await testUtils.expectClickSuccess('#click_6_3');

        // When clicking on it again
        await testUtils.expectClickSuccess('#click_6_3');

        // Then it should no longer be selected
        expect(testUtils.getGameComponent().arrows.length).toBe(0);
    }));

});
