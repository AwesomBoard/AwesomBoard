/* eslint-disable max-lines-per-function */
import { Coord } from '../Coord';
import { HexagonalGameState } from '../state/HexagonalGameState';
import { FlatHexaOrientation } from '../HexaOrientation';
import { TestingHexagonalState } from '../state/tests/HexagonalGameState.spec';

describe('FlatHexaOrientation', () => {

    describe('on a 7x5 board', () => {

        const state: HexagonalGameState<number> = TestingHexagonalState.empty(7, 5, [2, 1], 0);

        it('should consider (2, 0) to be the on the top left, top right border, and the top corner', () => {
            const coord: Coord = new Coord(2, 0);
            expect(FlatHexaOrientation.INSTANCE.isOnTopLeftBorder(state, coord)).toBeTrue();
            expect(FlatHexaOrientation.INSTANCE.isOnTopRightBorder(state, coord)).toBeTrue();
            expect(FlatHexaOrientation.INSTANCE.isTopCorner(state, coord)).toBeTrue();
        });
        it('should consider (1, 1) to be on the top left border', () => {
            const coord: Coord = new Coord(1, 1);
            expect(FlatHexaOrientation.INSTANCE.isOnTopLeftBorder(state, coord)).toBeTrue();
        });
        it('should consider (3, 0) to be on the top right border', () => {
            const coord: Coord = new Coord(3, 0);
            expect(FlatHexaOrientation.INSTANCE.isOnTopRightBorder(state, coord)).toBeTrue();
        });
        it('should consider (0, 2) to be on the top left and left borders, and the top left corner', () => {
            const coord: Coord = new Coord(0, 2);
            expect(FlatHexaOrientation.INSTANCE.isOnTopLeftBorder(state, coord)).toBeTrue();
            expect(FlatHexaOrientation.INSTANCE.isOnLeftBorder(state, coord)).toBeTrue();
            expect(FlatHexaOrientation.INSTANCE.isTopLeftCorner(state, coord)).toBeTrue();
        });
        it('should consider (0, 3) to be on the left border', () => {
            const coord: Coord = new Coord(0, 3);
            expect(FlatHexaOrientation.INSTANCE.isOnLeftBorder(state, coord)).toBeTrue();
        });
        it('should consider (0, 4) to be on the left and bottom left border, and the bottom left corner', () => {
            const coord: Coord = new Coord(0, 4);
            expect(FlatHexaOrientation.INSTANCE.isOnLeftBorder(state, coord)).toBeTrue();
            expect(FlatHexaOrientation.INSTANCE.isOnBottomLeftBorder(state, coord)).toBeTrue();
            expect(FlatHexaOrientation.INSTANCE.isBottomLeftCorner(state, coord)).toBeTrue();
        });
        it('should consider (2, 4) to be on the bottom left border', () => {
            const coord: Coord = new Coord(2, 4);
            expect(FlatHexaOrientation.INSTANCE.isOnBottomLeftBorder(state, coord)).toBeTrue();
        });
        it('should consider (4, 4) to be on the bottom left and bottom right borders, and the bottom corner', () => {
            const coord: Coord = new Coord(4, 4);
            expect(FlatHexaOrientation.INSTANCE.isOnBottomRightBorder(state, coord)).toBeTrue();
            expect(FlatHexaOrientation.INSTANCE.isOnBottomLeftBorder(state, coord)).toBeTrue();
            expect(FlatHexaOrientation.INSTANCE.isBottomCorner(state, coord)).toBeTrue();
        });
        it('should consider (5, 3) to be on the bottom right border', () => {
            const coord: Coord = new Coord(5, 3);
            expect(FlatHexaOrientation.INSTANCE.isOnBottomRightBorder(state, coord)).toBeTrue();
        });
        it('should consider (6, 2) to be on the bottom right and right border, and the bottom right corner', () => {
            const coord: Coord = new Coord(6, 2);
            expect(FlatHexaOrientation.INSTANCE.isOnBottomRightBorder(state, coord)).toBeTrue();
            expect(FlatHexaOrientation.INSTANCE.isOnRightBorder(state, coord)).toBeTrue();
            expect(FlatHexaOrientation.INSTANCE.isBottomRightCorner(state, coord)).toBeTrue();
        });
        it('should consider (6, 1) to be on the right border', () => {
            const coord: Coord = new Coord(6, 1);
            expect(FlatHexaOrientation.INSTANCE.isOnRightBorder(state, coord)).toBeTrue();
        });
        it('should consider (6, 0) to be on the right and top right border, and the top right corner', () => {
            const coord: Coord = new Coord(6, 0);
            expect(FlatHexaOrientation.INSTANCE.isOnRightBorder(state, coord)).toBeTrue();
            expect(FlatHexaOrientation.INSTANCE.isOnTopRightBorder(state, coord)).toBeTrue();
            expect(FlatHexaOrientation.INSTANCE.isTopRightCorner(state, coord)).toBeTrue();
        });
        describe('isOnBorder', () => {
            it('should detect when a coord is on the border', () => {
                expect(FlatHexaOrientation.INSTANCE.isOnBorder(state, new Coord(6, 0))).toBeTrue();
                expect(FlatHexaOrientation.INSTANCE.isOnBorder(state, new Coord(4, 4))).toBeTrue();
                expect(FlatHexaOrientation.INSTANCE.isOnBorder(state, new Coord(2, 4))).toBeTrue();
            });
            it('should detect when a coord is not on the border', () => {
                expect(FlatHexaOrientation.INSTANCE.isOnBorder(state, new Coord(1, 3))).toBeFalse();
                expect(FlatHexaOrientation.INSTANCE.isOnBorder(state, new Coord(5, 2))).toBeFalse();
                expect(FlatHexaOrientation.INSTANCE.isOnBorder(state, new Coord(3, 3))).toBeFalse();
            });
        });
        describe('getAllBorders', () => {
            it('should return 16 borders', () => {
                expect(FlatHexaOrientation.INSTANCE.getAllBorders(state).length).toEqual(16);
            });
        });
    });

});
