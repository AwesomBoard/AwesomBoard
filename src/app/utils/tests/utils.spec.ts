/* eslint-disable max-lines-per-function */
import { ErrorLoggerService } from 'src/app/services/ErrorLoggerService';
import { ErrorLoggerServiceMock } from 'src/app/services/tests/ErrorLoggerServiceMock.spec';
import { display, isJSONPrimitive, Utils } from '../utils';
import { RulesUtils } from 'src/app/jscaip/tests/RulesUtils.spec';

describe('utils', () => {

    describe('isJSONPrimitive', () => {
        it('should return true for all types of JSON primitives', () => {
            expect(isJSONPrimitive('foo')).toBeTrue();
            expect(isJSONPrimitive(42)).toBeTrue();
            expect(isJSONPrimitive(true)).toBeTrue();
            expect(isJSONPrimitive(null)).toBeTrue();
        });
        it('should return false for non-JSON primitives', () => {
            expect(isJSONPrimitive([1, 2, 3])).toBeFalse();
            expect(isJSONPrimitive({})).toBeFalse();
            expect(isJSONPrimitive(undefined)).toBeFalse(); // undefined is not valid in JSON!
        });
    });
    describe('expectToBe', () => {
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
        fit('should fail if the value is null', () => {
            function getNonNullableNullValue(): void {
                Utils.getNonNullable(null);
            }
            const error: string = 'Expected value not to be null or undefined, but it was.';
            RulesUtils.expectToThrowAndLog(getNonNullableNullValue, error);
        });
        fit('should fail if the value is undefined', () => {
            function getNonNullableUndefinedValue(): void {
                Utils.getNonNullable(undefined);
            }
            const error: string = 'Expected value not to be null or undefined, but it was.';
            RulesUtils.expectToThrowAndLog(getNonNullableUndefinedValue, error);
        });
        it('should return the value if it is not null', () => {
            expect(Utils.getNonNullable(42)).toBe(42);
        });
    });
    describe('display', () => {
        it('should log if verbose is true', () => {
            spyOn(console, 'log').and.callFake((_: string) => {});
            display(true, 'foo');
            expect(console.log).toHaveBeenCalledTimes(1);
        });
        it('should not log if verbose is false', () => {
            spyOn(console, 'log').and.callFake((_: string) => {});
            display(false, 'foo');
            expect(console.log).not.toHaveBeenCalled();
        });
    });
    describe('assert', () => {
        it('should log error and throw when condition is false', () => {
            spyOn(ErrorLoggerService, 'logError').and.callFake(ErrorLoggerServiceMock.logError);
            expect(() => Utils.assert(false, 'error')).toThrowError('Assertion failure: error');
            expect(ErrorLoggerService.logError).toHaveBeenCalledWith('Assertion failure', 'error');
        });
    });
});
