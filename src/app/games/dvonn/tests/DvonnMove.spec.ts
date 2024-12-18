/* eslint-disable max-lines-per-function */
import { EncoderTestUtils } from '@everyboard/lib';

import { DvonnMove } from '../DvonnMove';
import { Coord } from 'src/app/jscaip/Coord';

describe('DvonnMove', () => {

    it('should toString in a readable way', () => {
        expect((DvonnMove.from(new Coord(3, 2), new Coord(3, 3)).get()).toString()).toEqual('DvonnMove((3, 2)->(3, 3))');
        expect(DvonnMove.PASS.toString()).toEqual('DvonnMove.PASS');
    });

    it('should encode and decode coord to coord moves bijectively', () => {
        const move: DvonnMove = DvonnMove.from(new Coord(3, 2), new Coord(3, 3)).get();
        EncoderTestUtils.expectToBeBijective(DvonnMove.encoder, move);
    });

    it('should encode and decode PASS bijectively', () => {
        EncoderTestUtils.expectToBeBijective(DvonnMove.encoder, DvonnMove.PASS);
    });

    it('should force move to start and end inside the board', () => {
        expect(DvonnMove.from(new Coord(-1, 2), new Coord(0, 2)).isFailure()).toBeTrue();
        expect(DvonnMove.from(new Coord(0, 2), new Coord(-1, 2)).isFailure()).toBeTrue();
        expect(DvonnMove.from(new Coord(10, 2), new Coord(11, 2)).isFailure()).toBeTrue();
        expect(DvonnMove.from(new Coord(10, 5), new Coord(10, 3)).isFailure()).toBeTrue();
    });

    it('should force moves to be in a straight line', () => {
        expect(DvonnMove.from(new Coord(2, 0), new Coord(4, 0)).isSuccess()).toBeTrue();
        expect(DvonnMove.from(new Coord(2, 0), new Coord(2, 3)).isSuccess()).toBeTrue();
        expect(DvonnMove.from(new Coord(2, 0), new Coord(1, 1)).isSuccess()).toBeTrue();
        expect(DvonnMove.from(new Coord(5, 2), new Coord(4, 2)).isSuccess()).toBeTrue();
        expect(DvonnMove.from(new Coord(5, 2), new Coord(5, 1)).isSuccess()).toBeTrue();
        expect(DvonnMove.from(new Coord(5, 2), new Coord(6, 1)).isSuccess()).toBeTrue();
        expect(DvonnMove.from(new Coord(2, 0), new Coord(3, 2)).isFailure()).toBeTrue();
    });

    it('should correctly compute move lengths', () => {
        expect(DvonnMove.from(new Coord(2, 0), new Coord(4, 0)).get().length()).toEqual(2);
        expect(DvonnMove.from(new Coord(2, 0), new Coord(2, 3)).get().length()).toEqual(3);
        expect(DvonnMove.from(new Coord(2, 0), new Coord(1, 1)).get().length()).toEqual(1);
        expect(DvonnMove.from(new Coord(5, 2), new Coord(3, 2)).get().length()).toEqual(2);
        expect(DvonnMove.from(new Coord(5, 2), new Coord(5, 0)).get().length()).toEqual(2);
        expect(DvonnMove.from(new Coord(5, 2), new Coord(6, 1)).get().length()).toEqual(1);
    });

    it('should override equals correctly', () => {
        const move: DvonnMove = DvonnMove.from(new Coord(2, 2), new Coord(2, 3)).get();
        const sameMove: DvonnMove = DvonnMove.from(new Coord(2, 2), new Coord(2, 3)).get();
        const neighbor: DvonnMove = DvonnMove.from(new Coord(3, 3), new Coord(2, 3)).get();
        const stranger: DvonnMove = DvonnMove.from(new Coord(5, 2), new Coord(6, 2)).get();
        expect(move.equals(move)).toBeTrue();
        expect(move.equals(sameMove)).toBeTrue();
        expect(move.equals(neighbor)).toBeFalse();
        expect(move.equals(stranger)).toBeFalse();
    });

    it('should construct (-1, -1) -> (-2, -2) as PASS', () => {
        expect(DvonnMove.from(new Coord(-1, -1), new Coord(-2, -2)).get()).toBe(DvonnMove.PASS);
    });

});
