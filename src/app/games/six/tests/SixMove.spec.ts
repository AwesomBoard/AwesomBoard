/* eslint-disable max-lines-per-function */
import { Coord } from 'src/app/jscaip/Coord';
import { EncoderTestUtils, TestUtils } from '@everyboard/lib';
import { SixMove } from '../SixMove';

describe('SixMove', () => {

    it('should allow dropping', () => {
        const move: SixMove = SixMove.ofDrop(new Coord(0, 0));
        expect(move).toBeTruthy();
    });

    it('should allow move without mentionned "keep"', () => {
        const move: SixMove = SixMove.ofTranslation(new Coord(0, 0), new Coord(1, 1));
        expect(move).toBeTruthy();
    });

    it('should throw when creating static movement', () => {
        function creatingStaticMovement(): void {
            SixMove.ofTranslation(new Coord(0, 0), new Coord(0, 0));
        }
        TestUtils.expectToThrowAndLog(creatingStaticMovement, 'Translation cannot be static!');
    });

    it('should allow move with mentionned "keep"', () => {
        const move: SixMove = SixMove.ofCut(new Coord(0, 0), new Coord(2, 2), new Coord(1, 1));
        expect(move).toBeTruthy();
    });

    it('should throw when creating movement keeping starting coord', () => {
        function creatingMovementKeepingStartingCoord(): void {
            SixMove.ofCut(new Coord(0, 0), new Coord(1, 1), new Coord(0, 0));
        }
        TestUtils.expectToThrowAndLog(creatingMovementKeepingStartingCoord,
                                      'Cannot keep starting coord, since it will always be empty after move!');
    });

    describe('Overrides', () => {

        const cut: SixMove = SixMove.ofCut(new Coord(5, 5), new Coord(7, 5), new Coord(9, 9));

        it('should have functionnal equals', () => {
            const drop: SixMove = SixMove.ofDrop(new Coord(0, 0));
            const otherDrop: SixMove = SixMove.ofDrop(new Coord(1, 1));
            const movement: SixMove = SixMove.ofTranslation(new Coord(1, 1), new Coord(0, 0));
            const cuttingTranslation: SixMove = SixMove.ofCut(new Coord(1, 1), new Coord(0, 0), new Coord(2, 2));
            expect(drop.equals(otherDrop)).toBeFalse();
            expect(drop.equals(movement)).toBeFalse();
            expect(movement.equals(cuttingTranslation)).toBeFalse();
        });

        it('should stringify nicely', () => {
            const movement: SixMove = SixMove.ofTranslation(new Coord(5, 5), new Coord(7, 5));
            expect(movement.toString()).toEqual('SixMove((5, 5) > (7, 5))');

            const drop: SixMove = SixMove.ofDrop(new Coord(5, 5));
            expect(drop.toString()).toEqual('SixMove((5, 5))');
            expect(cut.toString()).toEqual('SixMove((5, 5) > (7, 5), keep: (9, 9))');
        });

        it('should have a bijective encoder', () => {
            const drop: SixMove = SixMove.ofDrop(new Coord(5, 5));
            const movement: SixMove = SixMove.ofTranslation(new Coord(5, 5), new Coord(7, 5));

            const moves: SixMove[] = [drop, movement, cut];
            for (const move of moves) {
                EncoderTestUtils.expectToBeBijective(SixMove.encoder, move);
            }
        });

    });

});
