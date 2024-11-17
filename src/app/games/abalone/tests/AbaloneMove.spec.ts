/* eslint-disable max-lines-per-function */
import { Coord, CoordFailure } from 'src/app/jscaip/Coord';
import { HexaDirection } from 'src/app/jscaip/HexaDirection';
import { AbaloneMove } from '../AbaloneMove';
import { AbaloneRules } from '../AbaloneRules';
import { MoveTestUtils } from 'src/app/jscaip/tests/Move.spec';
import { AbaloneMoveGenerator } from '../AbaloneMoveGenerator';
import { TestUtils } from '@everyboard/lib';

describe('AbaloneMove', () => {

    it('should not construct when created with an out of range coord', () => {
        const coord: Coord = new Coord(9, 9);
        TestUtils.expectToThrowAndLog(
            () => AbaloneMove.ofSingleCoord(coord, HexaDirection.DOWN),
            CoordFailure.OUT_OF_RANGE(coord));
    });

    it('should map false double coord to single coord', () => {
        const up: Coord = new Coord(0, 0);
        const down: Coord = new Coord(0, 2);
        const distortedMove: AbaloneMove = AbaloneMove.ofDoubleCoord(up, down, HexaDirection.DOWN);
        const secondDistortedMove: AbaloneMove = AbaloneMove.ofDoubleCoord(down, up, HexaDirection.DOWN);
        const simpleMove: AbaloneMove = AbaloneMove.ofSingleCoord(up, HexaDirection.DOWN);
        expect(simpleMove.equals(distortedMove)).toBeTrue();
        expect(simpleMove.equals(secondDistortedMove)).toBeTrue();

        const distortedMove2: AbaloneMove = AbaloneMove.ofDoubleCoord(up, down, HexaDirection.UP);
        const simpleMove2: AbaloneMove = AbaloneMove.ofSingleCoord(down, HexaDirection.UP);
        expect(simpleMove2.equals(distortedMove2)).toBeTrue();
    });

    it('should spot identical translations and map them', () => {
        const up: Coord = new Coord(0, 0);
        const down: Coord = new Coord(0, 2);
        const normalMove: AbaloneMove = AbaloneMove.ofDoubleCoord(up, down, HexaDirection.LEFT);
        const distoredMove: AbaloneMove = AbaloneMove.ofDoubleCoord(down, up, HexaDirection.LEFT);
        expect(distoredMove.equals(normalMove)).toBeTrue();
    });

    it('should stringify nicely', () => {
        const singleCoord: AbaloneMove = AbaloneMove.ofSingleCoord(new Coord(0, 0), HexaDirection.DOWN_LEFT);
        const doubleCoord: AbaloneMove =
            AbaloneMove.ofDoubleCoord(new Coord(0, 0), new Coord(2, 0), HexaDirection.DOWN);
        expect(singleCoord.toString()).toEqual('AbaloneMove(0, 0, DOWN_LEFT)');
        expect(doubleCoord.toString()).toEqual('AbaloneMove((0, 0) > (2, 0), DOWN)');
    });

    it('should equal correctly', () => {
        const move: AbaloneMove = AbaloneMove.ofSingleCoord(new Coord(0, 0), HexaDirection.DOWN);
        const otherMove: AbaloneMove = AbaloneMove.ofSingleCoord(new Coord(0, 0), HexaDirection.DOWN_LEFT);
        expect(move.equals(move)).toBeTrue();
        expect(move.equals(otherMove)).toBeFalse();
    });

    it('should not construct when creating move with no HexaDirectionnal alignment', () => {
        TestUtils.expectToThrowAndLog(
            () => AbaloneMove.ofDoubleCoord(new Coord(0, 0), new Coord(1, 1), HexaDirection.UP),
            'Invalid direction');
    });

    it('should have a bijective encoder', () => {
        const rules: AbaloneRules = AbaloneRules.get();
        const moveGenerator: AbaloneMoveGenerator = new AbaloneMoveGenerator();
        MoveTestUtils.testFirstTurnMovesBijectivity(rules, moveGenerator, AbaloneMove.encoder);
    });

    describe('isTranslation', () => {

        it('should return false for single piece move', () => {
            const move: AbaloneMove = AbaloneMove.ofSingleCoord(new Coord(0, 0), HexaDirection.UP);
            expect(move.isTranslation()).toBeFalse();
        });

        it('should return false for linear push', () => {
            const firstCoord: Coord = new Coord(0, 0);
            const direction: HexaDirection = HexaDirection.UP;
            const move: AbaloneMove = AbaloneMove.ofDoubleCoord(
                firstCoord,
                firstCoord.getNext(direction, 2),
                direction);
            expect(move.isTranslation()).toBeFalse();
        });

        it('should return true for big group moving sideways', () => {
            const firstCoord: Coord = new Coord(0, 0);
            const direction: HexaDirection = HexaDirection.UP;
            const otherDirection: HexaDirection = HexaDirection.LEFT;
            const move: AbaloneMove = AbaloneMove.ofDoubleCoord(
                firstCoord,
                firstCoord.getNext(direction, 2),
                otherDirection);
            expect(move.isTranslation()).toBeTrue();
        });

    });

});
