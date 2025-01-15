/* eslint-disable max-lines-per-function */
import { EncoderTestUtils, MGPFallible } from '@everyboard/lib';
import { Coord } from '../Coord';
import { Ordinal } from '../Ordinal';
import { MoveCoordToCoord } from '../MoveCoordToCoord';
import { MoveWithTwoCoords } from '../MoveWithTwoCoords';

class ConcreteMoveCoordToCoord extends MoveCoordToCoord {}

describe('MoveCoordToCoord', () => {
    function myMoveConstructor(start: Coord, end: Coord): MGPFallible<ConcreteMoveCoordToCoord> {
        return MGPFallible.success(new ConcreteMoveCoordToCoord(start, end));
    }

    describe('getDirection', () => {
        it('should return the direction of the move', () => {
            const source: Coord = new Coord(0, 0);
            const allDestsAndDirs: [Coord, Ordinal][] = [
                [new Coord(0, 1), Ordinal.DOWN],
                [new Coord(0, -1), Ordinal.UP],
                [new Coord(1, 0), Ordinal.RIGHT],
                [new Coord(-1, 0), Ordinal.LEFT],
                [new Coord(-1, -1), Ordinal.UP_LEFT],
                [new Coord(-1, 1), Ordinal.DOWN_LEFT],
                [new Coord(1, -1), Ordinal.UP_RIGHT],
                [new Coord(1, 1), Ordinal.DOWN_RIGHT],
            ];
            for (const [destination, direction] of allDestsAndDirs) {
                expect(new ConcreteMoveCoordToCoord(source, destination).getDirection())
                    .toEqual(MGPFallible.success(direction));
            }
        });
    });
    describe('length', () => {
        it('should return the length of the move', () => {
            expect(new ConcreteMoveCoordToCoord(new Coord(0, 0), new Coord(0, 5)).getDistance()).toBe(5);
            expect(new ConcreteMoveCoordToCoord(new Coord(0, 0), new Coord(2, 2)).getDistance()).toBe(2);
        });
    });
    describe('encoder', () => {
        it('should have a bijective encoder', () => {
            EncoderTestUtils.expectToBeBijective(
                MoveWithTwoCoords.getFallibleEncoder(myMoveConstructor),
                new ConcreteMoveCoordToCoord(new Coord(2, 3), new Coord(5, 9)));
        });
    });

});
