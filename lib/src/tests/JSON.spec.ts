import { isJSONPrimitive } from '../JSON';

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
