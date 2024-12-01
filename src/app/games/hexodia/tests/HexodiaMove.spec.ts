/* eslint-disable max-lines-per-function */
import { EncoderTestUtils } from '@everyboard/lib';

import { HexodiaMove } from '../HexodiaMove';
import { Coord } from 'src/app/jscaip/Coord';

describe('HexodiaMove', () => {

    describe('of', () => {

        it('should create move when inputs are valid', () => {
            expect(() => {
                HexodiaMove.of([new Coord(0, 0), new Coord(1, 1)]);
            }).not.toThrow();
        });

        it('should return duplicate-free instance', () => {
            const badInstance: HexodiaMove =
                HexodiaMove.of([new Coord(0, 0), new Coord(0, 0)]);
            const goodInstance: HexodiaMove =
                HexodiaMove.of([new Coord(0, 0)]);
            expect(badInstance.equals(goodInstance)).toBeTrue();
        });

    });

    describe('equals', () => {

        it('should be equal when coords are equal', () => {
            // Given two move with equal coord
            const first: HexodiaMove = HexodiaMove.of([new Coord(0, 0), new Coord(1, 1)]);
            const second: HexodiaMove = HexodiaMove.of([new Coord(0, 0), new Coord(1, 1)]);

            // When comparing them
            // Then they should be considered equal
            expect(first.equals(second)).toBeTrue();
        });

        it('should be different when one coord is different', () => {
            // Given two move with different coords
            const first: HexodiaMove = HexodiaMove.of([new Coord(0, 0), new Coord(1, 1)]);
            const second: HexodiaMove = HexodiaMove.of([new Coord(0, 0), new Coord(2, 2)]);

            // When comparing them
            // Then they should be considered different
            expect(first.equals(second)).toBeFalse();
        });

        it('should be equal when reversed, hence (a, b) == (b, a)', () => {
            // Given two move with equal coords but switched
            const first: HexodiaMove = HexodiaMove.of([new Coord(0, 0), new Coord(1, 1)]);
            const second: HexodiaMove = HexodiaMove.of([new Coord(1, 1), new Coord(0, 0)]);

            // When comparing them
            // Then they should be considered equal
            expect(first.equals(second)).toBeTrue();
        });

        it('should be equal when coord is equal', () => {
            // Given two move with equal coord
            const first: HexodiaMove = HexodiaMove.of([new Coord(0, 0)]);
            const second: HexodiaMove = HexodiaMove.of([new Coord(0, 0)]);

            // When comparing them
            // Then they should be considered equal
            expect(first.equals(second)).toBeTrue();
        });

        it('should be different when coords are different', () => {
            // Given two move with different coord
            const first: HexodiaMove = HexodiaMove.of([new Coord(0, 0)]);
            const second: HexodiaMove = HexodiaMove.of([new Coord(1, 1)]);

            // When comparing them
            // Then they should be considered different
            expect(first.equals(second)).toBeFalse();
        });

    });

    describe('encoder', () => {

        it('should be bijective', () => {
            const moves: HexodiaMove[] = [
                HexodiaMove.of([new Coord(0, 0)]),
                HexodiaMove.of([new Coord(0, 0), new Coord(1, 1)]),
            ];
            for (const move of moves) {
                EncoderTestUtils.expectToBeBijective(HexodiaMove.encoder, move);
            }

        });

    });

});
