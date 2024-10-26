/* eslint-disable max-lines-per-function */
import { EncoderTestUtils, MGPFallible } from '@everyboard/lib';
import { TeekoDropMove, TeekoMove, TeekoTranslationMove } from '../TeekoMove';
import { Coord } from 'src/app/jscaip/Coord';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';

describe('TeekoMove', () => {

    describe('TeekoDropMove', () => {

        describe('toString', () => {

            it('should be defined', () => {
                const move: TeekoDropMove = TeekoDropMove.from(new Coord(3, 4));
                expect(move.toString()).toEqual('TeekoMove(3, 4)');
            });

        });

        describe('equals', () => {

            it('should return true for the same move', () => {
                const move: TeekoDropMove = TeekoDropMove.from(new Coord(3, 4));
                expect(move.equals(move)).toBeTrue();
            });

            it('should return false for another move', () => {
                const move: TeekoDropMove = TeekoDropMove.from(new Coord(3, 4));
                const otherMove: TeekoDropMove = TeekoDropMove.from(new Coord(2, 2));
                expect(move.equals(otherMove)).toBeFalse();
            });

            it('should return false for a translation move', () => {
                const coord: Coord = new Coord(3, 4);
                const move: TeekoDropMove = TeekoDropMove.from(coord);
                const otherMove: TeekoTranslationMove = TeekoTranslationMove.from(coord, new Coord(4, 4)).get();
                expect(move.equals(otherMove)).toBeFalse();
            });

        });

    });

    describe('TeekoTranslationMove', () => {

        it('should fail for static move', () => {
            // Given a static move created with the same start and end coord
            const coord: Coord = new Coord(3, 4);

            // When calling from
            const move: MGPFallible<TeekoTranslationMove> = TeekoTranslationMove.from(coord, coord);

            // Then it should be invalid because it's a static move
            expect(move).toEqual(MGPFallible.failure(RulesFailure.MOVE_CANNOT_BE_STATIC()));
        });

        describe('toString', () => {

            it('should be defined', () => {
                const move: TeekoTranslationMove = TeekoTranslationMove.from(new Coord(1, 2), new Coord(3, 4)).get();
                expect(move.toString()).toEqual('TeekoMove((1, 2) -> (3, 4))');
            });

        });

        describe('equals', () => {

            it('should return true for the same move', () => {
                const move: TeekoTranslationMove = TeekoTranslationMove.from(new Coord(1, 2), new Coord(3, 4)).get();
                expect(move.equals(move)).toBeTrue();
            });

            it('should return false for another move', () => {
                const move: TeekoTranslationMove =
                    TeekoTranslationMove.from(new Coord(1, 2), new Coord(3, 4)).get();
                const otherMove: TeekoTranslationMove =
                    TeekoTranslationMove.from(new Coord(2, 2), new Coord(3, 4)).get();
                expect(move.equals(otherMove)).toBeFalse();
            });

            it('should return false for a drop move', () => {
                const coord: Coord = new Coord(3, 4);
                const move: TeekoTranslationMove = TeekoTranslationMove.from(coord, new Coord(4, 4)).get();
                const otherMove: TeekoDropMove = TeekoDropMove.from(coord);
                expect(move.equals(otherMove)).toBeFalse();
            });

        });

    });

    describe('encoder', () => {

        it('should be bijective', () => {
            const moves: TeekoMove[] = [
                TeekoDropMove.from(new Coord(3, 4)),
                TeekoTranslationMove.from(new Coord(1, 2), new Coord(3, 4)).get(),
            ];
            for (const move of moves) {
                EncoderTestUtils.expectToBeBijective(TeekoMove.encoder, move);
            }
        });

    });

});
