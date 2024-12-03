/* eslint-disable max-lines-per-function */
import { Encoder, EncoderTestUtils } from '../Encoder';
import { MGPOptional } from '../MGPOptional';

describe('MGPOptional', () => {

    describe('of', () => {
        it('should construct a non empty optional', () => {
            expect(MGPOptional.of(42).isPresent()).toBeTrue();
        });
    });

    describe('ofNullable', () => {
        it('should construct a non empty optional if the value is not null', () => {
            expect(MGPOptional.ofNullable(42).isPresent()).toBeTrue();
        });

        it('should construct an empty optional if the value is null', () => {
            expect(MGPOptional.ofNullable(null).isPresent()).toBeFalse();
        });
    });

    describe('empty', () => {
        it('should construct the empty optional', () => {
            expect(MGPOptional.empty().isPresent()).toBeFalse();
        });
    });

    describe('getEncoder', () => {
        it('should provide a bijective encoder', () => {
            const encoder: Encoder<MGPOptional<number>> = MGPOptional.getEncoder(Encoder.identity());
            EncoderTestUtils.expectToBeBijective(encoder, MGPOptional.empty());
            EncoderTestUtils.expectToBeBijective(encoder, MGPOptional.of(5));
        });
    });

    describe('get', () => {
        it('should return the value if there is one', () => {
            expect(MGPOptional.of(42).get()).toBe(42);
        });

        it('should throw if empty', () => {
            const optional: MGPOptional<string> = MGPOptional.empty();
            expect(() => optional.get()).toThrowError('Value is absent');
        });
    });

    describe('getOrElse', () => {
        it('should return the value if there is one', () => {
            expect(MGPOptional.of(42).getOrElse(0)).toBe(42);
        });

        it('should return the other value if there is no value inside', () => {
            expect(MGPOptional.empty().getOrElse(0)).toBe(0);
        });
    });

    describe('orElse', () => {
        it('should preserve the value if there is one', () => {
            expect(MGPOptional.of(42).orElse(MGPOptional(0)).get()).toBe(42);
        });

        it('should return the other value if there is no value inside', () => {
            expect(MGPOptional.empty().getOrElse(MGPOptional(0)).get()).toBe(0);
        });
    });

    describe('equals', () => {
        it('should consider the same optional equal', () => {
            const optional: MGPOptional<number> = MGPOptional.of(42);
            expect(optional.equals(optional)).toBeTrue();
        });

        it('should consider different optionals with values not equal', () => {
            const optional: MGPOptional<number> = MGPOptional.of(42);
            const otherOptional: MGPOptional<number> = MGPOptional.of(41);
            const empty: MGPOptional<number> = MGPOptional.empty();
            expect(optional.equals(otherOptional)).toBeFalse();
            expect(optional.equals(empty)).toBeFalse();
        });

        it('should consider empty different from a value', () => {
            const optional: MGPOptional<number> = MGPOptional.empty();
            const otherOptional: MGPOptional<number> = MGPOptional.of(42);
            expect(optional.equals(otherOptional)).toBeFalse();
        });
    });

    describe('equalsValue', () => {
        it('should compare an optional with a direct value', () => {
            const optional: MGPOptional<number> = MGPOptional.of(42);
            expect(optional.equalsValue(42)).toBeTrue();
        });
    });

    describe('toString', () => {
        it('should succeed for empty values', () => {
            expect(MGPOptional.empty<string>().toString()).toBe('MGPOptional.empty()');
        });

        it('should include value for non-empty values', () => {
            expect(MGPOptional.of('foo').toString()).toBe('MGPOptional.of(foo)');
        });
    });

    describe('map', () => {
        function addOne(x: number): number {
            return x + 1;
        }

        it('should not do anything on empty', () => {
            const optional: MGPOptional<number> = MGPOptional.empty();
            expect(optional.map(addOne)).toEqual(MGPOptional.empty());
        });

        it('should apply the function inside the optional', () => {
            const optional: MGPOptional<number> = MGPOptional.of(41);
            expect(optional.map(addOne)).toEqual(MGPOptional.of(42));
        });
    });
});
