import { isJSONPrimitive, JSONPrimitive } from './JSON';

export interface ComparableObject {

    equals(other: this): boolean;
}
export type ComparableValue = JSONPrimitive | ComparableObject | ComparableJSON;

export type ComparableJSON = {
    [key: string]: ComparableValue,
    [key: number]: ComparableValue,
};

export type Comparable = JSONPrimitive | ComparableObject | ComparableJSON;

function comparableEqualsStrict<T extends Comparable>(a: T, b: T): boolean {
    if (a != null && b != null && typeof a === 'object') {
        if (a.equals != null) {
            const comparableValue: ComparableObject = a as ComparableObject;
            const otherComparable: ComparableObject = b as ComparableObject;
            return comparableValue.equals(otherComparable);
        } else {
            const aJSON: ComparableJSON = a as ComparableJSON;
            const bJSON: ComparableJSON = b as ComparableJSON;
            for (const key of Object.keys(aJSON)) {
                if (key in bJSON) {
                    if (comparableEqualsStrict(aJSON[key], bJSON[key]) === false) {
                        return false;
                    }
                } else {
                    return false;
                }
            }
            return true;
        }
    } else {
        return a === b;
    }
}

export function isComparableObject(value: unknown): value is ComparableObject {
    // eslint-disable-next-line dot-notation
    return typeof value === 'object' && value != null && value['equals'] != null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
export function isComparableJSON(value: any): value is ComparableJSON {
    if (typeof value === 'object') {
        for (const key in value) {
            if (value[key] != null && isComparableValue(value[key]) === false) {
                return false;
            }
        }
        // A JSON value should directly inherit from Object
        return value != null && value.constructor.prototype === Object.prototype;
    } else {
        return false;
    }
}

export function isComparableValue(value: unknown): value is ComparableValue {
    return value == null || isComparableObject(value) || isJSONPrimitive(value) || isComparableJSON(value);
}

export function comparableEquals<T>(a: T, b: T): boolean {
    if (isComparableValue(a) && isComparableValue(b)) {
        return comparableEqualsStrict(a, b);
    } else {
        throw new Error(`Comparing non comparable objects: ${(a as object).constructor.name} and ${(b as object).constructor.name}`);
    }
}
