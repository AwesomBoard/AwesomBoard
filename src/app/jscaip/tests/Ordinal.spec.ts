/* eslint-disable max-lines-per-function */
import { MGPFallible, MGPValidation } from '@everyboard/lib';
import { Coord } from '../Coord';
import { DirectionFactory, DirectionFailure } from '../Direction';
import { Ordinal } from '../Ordinal';

describe('Ordinal', () => {

    it('should have 8 directions', () => {
        expect(Ordinal.ORDINALS.length).toBe(8);
    });
    describe('factory', () => {
        describe('of', () => {
            it('should construct a direction', () => {
                expect(Ordinal.factory.from(1, 0).get()).toBe(Ordinal.RIGHT);
                expect(Ordinal.factory.from(-1, 0).get()).toBe(Ordinal.LEFT);
                expect(Ordinal.factory.from(0, 1).get()).toBe(Ordinal.DOWN);
                expect(Ordinal.factory.from(0, -1).get()).toBe(Ordinal.UP);
                expect(Ordinal.factory.from(1, -1).get()).toBe(Ordinal.UP_RIGHT);
                expect(Ordinal.factory.from(-1, -1).get()).toBe(Ordinal.UP_LEFT);
                expect(Ordinal.factory.from(-1, 1).get()).toBe(Ordinal.DOWN_LEFT);
                expect(Ordinal.factory.from(1, 1).get()).toBe(Ordinal.DOWN_RIGHT);
            });
            it('should not construct an invalid direction', () => {
                expect(Ordinal.factory.from(2, 1))
                    .toEqual(MGPFallible.failure('Invalid x or y in direction construction'));
            });
        });
        describe('fromDelta', () => {
            it('should construct the directions', () => {
                expect(Ordinal.factory.fromDelta(3, 0).get()).toBe(Ordinal.RIGHT);
                expect(Ordinal.factory.fromDelta(-5, 0).get()).toBe(Ordinal.LEFT);
                expect(Ordinal.factory.fromDelta(1, 1).get()).toBe(Ordinal.DOWN_RIGHT);
            });
            it('should not construct from static move', () => {
                expect(Ordinal.factory.fromDelta(0, 0)).toEqual(MGPFallible.failure('Empty delta for direction'));
            });
        });
        describe('fromMove', () => {
            it('should construct a direction corresponding to a move', () => {
                const ordinal: Ordinal =
                    Ordinal.factory.fromMove(new Coord(0, 0), new Coord(5, 0)).get();
                expect(ordinal).toBe(Ordinal.RIGHT);
            });
            it('should not construct when the move does not correspond to a valid direction', () => {
                const failure: MGPValidation = MGPValidation.failure(DirectionFailure.DIRECTION_MUST_BE_LINEAR());
                expect(Ordinal.factory.fromMove(new Coord(0, 0), new Coord(5, 3))).toEqual(failure);
            });
        });
        describe('fromString', () => {
            it('should construct the direction corresponding to the string', () => {
                expect(Ordinal.factory.fromString('RIGHT').get()).toBe(Ordinal.RIGHT);
                expect(Ordinal.factory.fromString('LEFT').get()).toBe(Ordinal.LEFT);
                expect(Ordinal.factory.fromString('DOWN').get()).toBe(Ordinal.DOWN);
                expect(Ordinal.factory.fromString('UP').get()).toBe(Ordinal.UP);
                expect(Ordinal.factory.fromString('UP_RIGHT').get()).toBe(Ordinal.UP_RIGHT);
                expect(Ordinal.factory.fromString('UP_LEFT').get()).toBe(Ordinal.UP_LEFT);
                expect(Ordinal.factory.fromString('DOWN_LEFT').get()).toBe(Ordinal.DOWN_LEFT);
                expect(Ordinal.factory.fromString('DOWN_RIGHT').get()).toBe(Ordinal.DOWN_RIGHT);
            });
            it('should not construct from a string that does not correspond to a direction', () => {
                expect(Ordinal.factory.fromString('foo')).toEqual(MGPFallible.failure('Invalid direction string foo'));
            });
        });
        describe('fromInt', () => {

            it('should construct the direction corresponding to the int', () => {
                const factory: DirectionFactory<Ordinal> = Ordinal.factory;
                expect(factory.fromInt(Ordinal.RIGHT.toInt()).get()).toBe(Ordinal.RIGHT);
                expect(factory.fromInt(Ordinal.LEFT.toInt()).get()).toBe(Ordinal.LEFT);
                expect(factory.fromInt(Ordinal.DOWN.toInt()).get()).toBe(Ordinal.DOWN);
                expect(factory.fromInt(Ordinal.UP.toInt()).get()).toBe(Ordinal.UP);
                expect(factory.fromInt(Ordinal.UP_RIGHT.toInt()).get()).toBe(Ordinal.UP_RIGHT);
                expect(factory.fromInt(Ordinal.UP_LEFT.toInt()).get()).toBe(Ordinal.UP_LEFT);
                expect(factory.fromInt(Ordinal.DOWN_LEFT.toInt()).get()).toBe(Ordinal.DOWN_LEFT);
                expect(factory.fromInt(Ordinal.DOWN_RIGHT.toInt()).get()).toBe(Ordinal.DOWN_RIGHT);
            });

            it('should not construct when called with a string that does not correspond to a direction', () => {
                expect(Ordinal.factory.fromInt(42)).toEqual(MGPFallible.failure('Invalid int direction: 42'));
            });
        });
    });
    describe('getOpposite', () => {
        it('should return the opposite direction', () => {
            expect(Ordinal.RIGHT.getOpposite()).toBe(Ordinal.LEFT);
            expect(Ordinal.LEFT.getOpposite()).toBe(Ordinal.RIGHT);
            expect(Ordinal.DOWN.getOpposite()).toBe(Ordinal.UP);
            expect(Ordinal.UP.getOpposite()).toBe(Ordinal.DOWN);
            expect(Ordinal.UP_RIGHT.getOpposite()).toBe(Ordinal.DOWN_LEFT);
            expect(Ordinal.UP_LEFT.getOpposite()).toBe(Ordinal.DOWN_RIGHT);
            expect(Ordinal.DOWN_LEFT.getOpposite()).toBe(Ordinal.UP_RIGHT);
            expect(Ordinal.DOWN_RIGHT.getOpposite()).toBe(Ordinal.UP_LEFT);
        });
    });
    describe('isDown', () => {
        it('should consider the DOWN direction to be down', () => {
            expect(Ordinal.DOWN.isDown()).toBeTrue();
        });
        it('should consider non-DOWN directions not to be down', () => {
            expect(Ordinal.LEFT.isDown()).toBeFalse();
            expect(Ordinal.UP.isDown()).toBeFalse();
        });
    });
    describe('isUp', () => {
        it('should consider the UP direction to be up', () => {
            expect(Ordinal.UP.isUp()).toBeTrue();
        });
        it('should consider non-UP directions not to be up', () => {
            expect(Ordinal.LEFT.isUp()).toBeFalse();
            expect(Ordinal.DOWN.isUp()).toBeFalse();
        });
    });
    describe('isLeft', () => {
        it('should consider the LEFT direction to be left', () => {
            expect(Ordinal.LEFT.isLeft()).toBeTrue();
        });
        it('should consider non-LEFT directions not to be left', () => {
            expect(Ordinal.DOWN.isLeft()).toBeFalse();
            expect(Ordinal.RIGHT.isLeft()).toBeFalse();
        });
    });
    describe('isRight', () => {
        it('should consider the RIGHT direction to be right', () => {
            expect(Ordinal.RIGHT.isRight()).toBeTrue();
        });
        it('should consider non-RIGHT directions not to be right', () => {
            expect(Ordinal.DOWN.isRight()).toBeFalse();
            expect(Ordinal.LEFT.isRight()).toBeFalse();
        });
    });
    describe('equals', () => {
        it('should consider a direction equal to itself', () => {
            expect(Ordinal.UP.equals(Ordinal.UP)).toBeTrue();
        });
        it('should distinguish different directions', () => {
            expect(Ordinal.UP.equals(Ordinal.DOWN)).toBeFalse();
        });
    });
    describe('Encoder', () => {
        it('should encode by calling Direction.toString', () => {
            const dir: Ordinal = Ordinal.DOWN;
            expect(Ordinal.encoder.encode(dir)).toEqual(dir.toString());
        });
        it('should decode by calling Direction.factory.fromString', () => {
            const dir: string = Ordinal.DOWN.toString();
            expect(Ordinal.encoder.decode(dir)).toEqual(Ordinal.factory.fromString(dir).get());
        });
    });
    it('should map to angle by multiple of 45', () => {
        for (let i: number = 0; i < 8; i++) {
            const dir: Ordinal = Ordinal.factory.all[i];
            expect(dir.getAngle()).toBe(i * 45);
        }
    });

});

