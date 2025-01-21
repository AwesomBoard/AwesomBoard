/* eslint-disable max-lines-per-function */
import { Coord } from 'src/app/jscaip/Coord';
import { KamisadoRules } from '../KamisadoRules';
import { KamisadoMove } from '../KamisadoMove';
import { EncoderTestUtils } from '@everyboard/lib';
import { MoveTestUtils } from 'src/app/jscaip/tests/Move.spec';
import { KamisadoMoveGenerator } from '../KamisadoMoveGenerator';

describe('KamisadoMove', () => {

    it('should toString in a readable way', () => {
        expect(KamisadoMove.of(new Coord(0, 0), new Coord(1, 5)).toString()).toEqual('KamisadoMove((0, 0)->(1, 5))');
        expect(KamisadoMove.PASS.toString()).toEqual('KamisadoMove(PASS)');
    });

    it('should have a bijective encoder', () => {
        const rules: KamisadoRules = KamisadoRules.get();
        const moveGenerator: KamisadoMoveGenerator = new KamisadoMoveGenerator();
        MoveTestUtils.testFirstTurnMovesBijectivity(rules, moveGenerator, KamisadoMove.encoder);
        EncoderTestUtils.expectToBeBijective(KamisadoMove.encoder, KamisadoMove.PASS);
    });

    it('should force move to start and end inside the board', () => {
        expect(() => KamisadoMove.of(new Coord(-1, 2), new Coord(2, 2))).toThrowError();
        expect(() => KamisadoMove.of(new Coord(0, 0), new Coord(-1, -1))).toThrowError();
        expect(() => KamisadoMove.of(new Coord(0, 0), new Coord(9, 9))).toThrowError();
        expect(() => KamisadoMove.of(new Coord(8, 5), new Coord(5, 5))).toThrowError();
    });

    it('should override equals correctly', () => {
        const move: KamisadoMove = KamisadoMove.of(new Coord(2, 2), new Coord(3, 3));
        const sameMove: KamisadoMove = KamisadoMove.of(new Coord(2, 2), new Coord(3, 3));
        const neighbor: KamisadoMove = KamisadoMove.of(new Coord(3, 3), new Coord(2, 2));
        const stranger: KamisadoMove = KamisadoMove.of(new Coord(5, 5), new Coord(6, 5));
        const pass: KamisadoMove = KamisadoMove.PASS;
        expect(move.equals(move)).toBeTrue();
        expect(move.equals(sameMove)).toBeTrue();
        expect(move.equals(neighbor)).toBeFalse();
        expect(move.equals(stranger)).toBeFalse();
        expect(move.equals(pass)).toBeFalse();
        expect(pass.equals(move)).toBeFalse();
    });

    it('should assign a length of 0 to PASS moves', () => {
        expect(KamisadoMove.PASS.getDistance()).toBe(0);
    });

});
