/* eslint-disable max-lines-per-function */
import { SaharaRules } from '../SaharaRules';
import { SaharaMove } from '../SaharaMove';
import { Coord } from 'src/app/jscaip/Coord';
import { SaharaFailure } from '../SaharaFailure';
import { MGPFallible } from '@everyboard/lib';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { MoveTestUtils } from 'src/app/jscaip/tests/Move.spec';
import { SaharaMoveGenerator } from '../SaharaMoveGenerator';

describe('SaharaMoves', () => {

    it('should have a bijective encoder', () => {
        const rules: SaharaRules = SaharaRules.get();
        const moveGenerator: SaharaMoveGenerator = new SaharaMoveGenerator();
        MoveTestUtils.testFirstTurnMovesBijectivity(rules, moveGenerator, SaharaMove.encoder);
    });

    it('should throw error when start and end are too far away', () => {
        const start: Coord = new Coord(0, 0);
        const end: Coord = new Coord(0, 3);
        const error: string = 'You can move one or two spaces, not 3.';
        const failure: MGPFallible<SaharaMove> = MGPFallible.failure(error);
        expect(SaharaMove.from(start, end)).toEqual(failure);
    });

    it('should throw error when distance is 1 but start and end arent neighbors', () => {
        const start: Coord = new Coord(0, 1);
        const end: Coord = new Coord(0, 2);
        const expectedError: string = SaharaFailure.THOSE_TWO_SPACES_ARE_NOT_NEIGHBORS();
        const failure: MGPFallible<SaharaMove> = MGPFallible.failure(expectedError);
        expect(SaharaMove.from(start, end)).toEqual(failure);
    });

    it('should fail when trying to bounce on white triangle', () => {
        const start: Coord = new Coord(0, 0);
        const end: Coord = new Coord(2, 0);
        const error: string = SaharaFailure.CAN_ONLY_REBOUND_ON_BLACK();
        const failure: MGPFallible<SaharaMove> = MGPFallible.failure(error);
        expect(SaharaMove.from(start, end)).toEqual(failure);
    });

    it('should fail when distance is 2 but common neighbors is the fake neighbors', () => {
        const start: Coord = new Coord(1, 0);
        const end: Coord = new Coord(1, 2);
        const expectedError: string = SaharaFailure.THOSE_TWO_SPACES_HAVE_NO_COMMON_NEIGHBOR();
        const failure: MGPFallible<SaharaMove> = MGPFallible.failure(expectedError);
        expect(SaharaMove.from(start, end)).toEqual(failure);
    });

    it('should throw when called with static move', () => {
        const error: string = RulesFailure.MOVE_CANNOT_BE_STATIC();
        const failure: MGPFallible<SaharaMove> = MGPFallible.failure(error);
        expect(SaharaMove.from(new Coord(0, 0), new Coord(0, 0))).toEqual(failure);
    });

    describe('equals', () => {

        it('should be equal to itself', () => {
            const move: SaharaMove = SaharaMove.from(new Coord(0, 0), new Coord(1, 0)).get();
            expect(move.equals(move)).toBeTrue();
        });

        it('should be different if start is different', () => {
            const move: SaharaMove = SaharaMove.from(new Coord(0, 0), new Coord(1, 0)).get();
            const otherStart: SaharaMove = SaharaMove.from(new Coord(2, 0), new Coord(1, 0)).get();
            expect(move.equals(otherStart)).toBeFalse();
        });

    });

});
