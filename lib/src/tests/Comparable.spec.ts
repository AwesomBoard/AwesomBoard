/* eslint-disable max-lines-per-function */
import { comparableEquals, ComparableJSON, ComparableObject, isComparableJSON, isComparableObject, isComparableValue } from '../Comparable';

class DummyComparableObject implements ComparableObject {

    public constructor(readonly value: number) {}

    public equals(other: DummyComparableObject): boolean {
        return this.value === other.value;
    }
    public toString(): string {
        return 'dummy';
    }
}

class DummyNonComparableObject {
    public constructor(readonly value: number) {}
    public someMethod(): void {}
}

describe('Comparable', () => {

    describe('comparableEquals', () => {
        it('should support primitive values', () => {
            expect(comparableEquals(5, 5)).toBeTrue();
            expect(comparableEquals(5, 6)).toBeFalse();
            expect(comparableEquals('foo', 'foo')).toBeTrue();
            expect(comparableEquals('foo', 'bar')).toBeFalse();
            expect(comparableEquals(true, true)).toBeTrue();
            expect(comparableEquals(true, false)).toBeFalse();
            expect(comparableEquals(true, null)).toBeFalse();
        });
        it('should support objects that have an equal method', () => {
            expect(comparableEquals(new DummyComparableObject(5), new DummyComparableObject(5))).toBeTrue();
            expect(comparableEquals(new DummyComparableObject(5), new DummyComparableObject(6))).toBeFalse();
        });
        it('should support primitive JSON values', () => {
            const object1: ComparableJSON = { 'foo': 1 };
            object1[2] = 3;
            const object2: ComparableJSON = { 'foo': 1 };
            object2[2] = 4;
            const object3: ComparableJSON = { 'foo': 1 };
            expect(comparableEquals(object1, object1)).toBeTrue();
            expect(comparableEquals(object1, object2)).toBeFalse();
            expect(comparableEquals(object1, object3)).toBeFalse();
        });
        it('should fail if objects are not comparable', () => {
            const expectedError: string = 'Comparing non comparable objects: DummyNonComparableObject and DummyNonComparableObject';
            // Given two non-comparable objects
            const nonComparable: DummyNonComparableObject = new DummyNonComparableObject(5);
            const otherNonComparable: DummyNonComparableObject = new DummyNonComparableObject(5);
            // When comparing them
            // Then it should fail
            expect(() => comparableEquals(nonComparable, otherNonComparable)).toThrowError(expectedError);
        });
    });
    describe('isComparableObject', () => {
        it('should return true only for objects that implement the Comparable interface ', () => {
            expect(isComparableObject(new DummyComparableObject(5))).toBeTrue();
            expect(isComparableObject(new DummyNonComparableObject(5))).toBeFalse();
        });
    });
    describe('isComparableJSON', () => {
        it('should return true for comparable JSON only', () => {
            expect(isComparableJSON(undefined)).toBeFalse();
            expect(isComparableJSON(null)).toBeFalse();
            expect(isComparableJSON({ 'foo': 5 })).toBeTrue();
            expect(isComparableJSON(new DummyNonComparableObject(5))).toBeFalse();
            expect(isComparableJSON({ 'foo': new DummyNonComparableObject(5) })).toBeFalse();
            expect(isComparableJSON({ 1: 'foo' })).toBeTrue();
        });
    });
    describe('isComparableValue', () => {
        it('should return true for all comparable values', () => {
            expect(isComparableValue(new DummyComparableObject(5))).toBeTrue();
            expect(isComparableValue(new DummyNonComparableObject(5))).toBeFalse();
            expect(isComparableValue(5)).toBeTrue();
            expect(isComparableValue(null)).toBeTrue();
            expect(isComparableValue({ 'foo': { 'bar': { 'baz': 5 } } })).toBeTrue();
            expect(isComparableValue({ 'foo': { 'bar': { 'baz': new DummyNonComparableObject(5) } } })).toBeFalse();
        });
    });

});
