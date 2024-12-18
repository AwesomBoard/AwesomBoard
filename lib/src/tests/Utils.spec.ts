/* eslint-disable max-lines-per-function */
import { Utils } from '../Utils';

describe('Utils', () => {

    describe('expectToBe', () => {

        it('should not fail if the value is as expected', () => {
            expect(() => Utils.expectToBe(1, 1)).not.toThrowError();
        });

        it('should fail when the default case has a different value than expected', () => {
            const value: number = 2;
            expect(() => {
                switch (value) {
                    case 0:
                        break;
                    default:
                        // we expect that value can only be 0 or 1
                        Utils.expectToBe(value, 1);
                        break;
                }
            }).toThrowError(`A default switch case did not observe the correct value, expected 1, but got 2 instead.`);
        });

        it('should use the message if it is passed', () => {
            expect(() => Utils.expectToBe(1, 2, 'message')).toThrowError('message');
        });
    });

    describe('expectToBeMultiple', () => {

        it('should not fail if the value is as expected', () => {
            expect(() => Utils.expectToBeMultiple(1, [0, 1])).not.toThrowError();
        });

        it('should fail when the default case has a different value than one of the expected values', () => {
            const value: number = 2;
            expect(() => {
                switch (value) {
                    default:
                        // we expect that value can only be 0 or 1
                        Utils.expectToBeMultiple(value, [0, 1]);
                        break;
                }
            }).toThrowError(`A default switch case did not observe the correct value, expected a value among 0,1, but got 2 instead.`);
        });
    });

    describe('getNonNullable', () => {

        it('should fail if the value is null or undefined', () => {
            expect(() => Utils.getNonNullable(null)).toThrowError('Expected value not to be null or undefined, but it was.');
            expect(() => Utils.getNonNullable(undefined)).toThrowError('Expected value not to be null or undefined, but it was.');
        });

        it('should return the value if it is not null', () => {
            expect(Utils.getNonNullable(42)).toBe(42);
        });
    });

    describe('assert', () => {

        it('should log error and throw when condition is false', () => {
            spyOn(Utils, 'logError').and.callThrough();
            expect(() => Utils.assert(false, 'error')).toThrowError('Assertion failure: error');
            expect(Utils.logError).toHaveBeenCalledWith('Assertion failure', 'error', undefined);
        });

        it('should log error and throw when condition is false (with data)', () => {
            spyOn(Utils, 'logError').and.callThrough();
            expect(() => Utils.assert(false, 'error', 'jajette')).toThrowError('Assertion failure: error ("jajette")');
            expect(Utils.logError).toHaveBeenCalledWith('Assertion failure', 'error', 'jajette');
        });

    });

    describe('identity', () => {
        it('should return its argument', () => {
            expect(Utils.identity(5)).toBe(5);
        });
    });

});
