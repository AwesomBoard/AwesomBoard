/* eslint-disable max-lines-per-function */
import { Encoder, EncoderTestUtils, MGPOptional } from '@everyboard/lib';
import { Coord3D } from '../Coord3D';

describe('Coord3D', () => {

    it('should have a bijective optional encoder', () => {
        const values: MGPOptional<Coord3D>[] = [
            MGPOptional.of(new Coord3D(2, 1, 0)),
            MGPOptional.empty(),
            MGPOptional.of(new Coord3D(0, 0, 0)),
        ];
        const encoder: Encoder<MGPOptional<Coord3D>> =
            MGPOptional.getEncoder(Coord3D.getCoord3DEncoder(Coord3D.of));
        for (const value of values) {
            EncoderTestUtils.expectToBeBijective(encoder, value);
        }
    });

    it('should override equals correctly', () => {
        const coord: Coord3D = new Coord3D(0, 0, 0);
        const closeX: Coord3D = new Coord3D(1, 0, 0);
        const closeY: Coord3D = new Coord3D(0, 1, 0);
        const closeZ: Coord3D = new Coord3D(0, 0, 1);
        const twin: Coord3D = new Coord3D(0, 0, 0);
        expect(coord.equals(coord)).toBeTrue();
        expect(coord.equals(closeX)).toBeFalse();
        expect(coord.equals(closeY)).toBeFalse();
        expect(coord.equals(closeZ)).toBeFalse();
        expect(coord.equals(twin)).toBeTrue();
    });

    it('should implement toString and toShortString', () => {
        expect(Coord3D.of(0, 0, 0).toString()).toBe('Coord3D(0, 0, 0)');
        expect(Coord3D.of(0, 0, 0).toShortString()).toBe('(0, 0, 0)');
    });

    it('should compare Z correctly', () => {
        const coord: Coord3D = new Coord3D(0, 0, 0);
        const upperCoord: Coord3D = new Coord3D(0, 0, 1);
        expect(coord.isHigherThan(upperCoord)).toBeFalse();
    });

});
