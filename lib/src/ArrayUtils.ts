import { Comparable, comparableEquals } from './Comparable';
import { Utils } from './Utils';

export class ArrayUtils {

    public static create<T>(width: number, initValue: T): T[] {
        const array: Array<T> = [];
        for (let x: number = 0; x < width; x++) {
            array.push(initValue);
        }
        return array;
    }

    public static copy<T>(array: ReadonlyArray<T>): T[] {
        return array.map((t: T): T => t);
    }

    public static sortByDescending<T>(array: T[], by: (t: T) => number): void {
        array.sort((t1: T, t2: T): number => {
            const v1: number = by(t1);
            const v2: number = by(t2);
            if (v1 < v2) {
                return 1; // sort from higher to lower
            } else if (v1 > v2) {
                return -1;
            } else {
                return 0;
            }
        });
    }

    public static equals<T extends Comparable>(t1: ReadonlyArray<T>, t2: ReadonlyArray<T>): boolean {
        if (t1.length !== t2.length) {
            return false;
        }
        for (let i: number = 0; i < t1.length; i++) {
            if (comparableEquals(t1[i], t2[i]) === false) return false;
        }
        return true;
    }


    public static isPrefix<T extends Comparable>(prefix: ReadonlyArray<T>, list: ReadonlyArray<T>): boolean {
        if (prefix.length > list.length) return false;
        return ArrayUtils.equals(prefix, list.slice(0, prefix.length));
    }

    /**
     * range(n) returns the list [0, 1, 2, ..., n-1]
     * Enables doing *ngFor="let x in ArrayUtils.range(5)" in an Angular template
     */
    public static range(n: number): number[] {
        const range: number[] = [];
        for (let i: number = 0; i < n; i++) {
            range.push(i);
        }
        return range;
    }

    /**
     * A method that can be used to sort an array with the smallest number first with xs.sort(ArrayUtils.smallerFirst);
     */
    public static smallerFirst(a: number, b: number): number {
        return a - b;
    }

    /**
     * Gets a random element from an array.
     * Throws if the array is empty.
     */
    public static getRandomElement<T>(array: T[]): T {
        Utils.assert(array.length > 0, 'ArrayUtils.getRandomElement must be called on an array containing elements');
        const randomIndex: number = Math.floor(Math.random() * array.length);
        return array[randomIndex];
    }

    /**
     * Gets the maximum elements of an array, according to a given metric.
     * Returns an array containing all the maximal values
     */
    public static maximumsBy<T>(array: T[], metric: (value: T) => number): T[] {
        let maximums: T[] = [];
        let maxMetricValue: number = -Infinity;
        for (const element of array) {
            const currentMetricValue: number = metric(element);
            if (currentMetricValue >= maxMetricValue) {
                if (currentMetricValue > maxMetricValue) {
                    maximums = [];
                }
                maxMetricValue = currentMetricValue;
                maximums.push(element);
            }
        }
        return maximums;
    }

    /**
     * Counts the number of element in an array that have the provided value
     */
    public static count<T>(array: ReadonlyArray<T>, value: T): number {
        let total: number = 0;
        for (const element of array) {
            if (comparableEquals(element, value)) {
                total++;
            }
        }
        return total;
    }

    public static contains<T>(array: ReadonlyArray<T>, value: T): boolean {
        for (const element of array) {
            if (comparableEquals(value, element)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check whether the first argument is strictly smaller than the second, element-wise
     */
    public static isLessThan(inferior: ReadonlyArray<number>, superior: ReadonlyArray<number>): boolean {
        Utils.assert(inferior.length > 0 && superior.length > 0, 'ArrayUtils.isLessThan/isGreaterThan should have two non-empty list as parameter');
        const maximumIndex: number = Math.min(inferior.length, superior.length);
        for (let i: number = 0; i < maximumIndex; i++) {
            if (superior[i] !== inferior[i]) { // We found an inequality
                return inferior[i] < superior[i];
            }
        }
        return false; // They are equal
    }

    /**
     * Check whether the first argument is strictly greater than the second, element-wise.
     */
    public static isGreaterThan(superior: ReadonlyArray<number>, inferior: ReadonlyArray<number>): boolean {
        return ArrayUtils.isLessThan(inferior, superior);
    }

    /**
     * Return the minimal array (comparing element-wise) between two arrays.
     */
    public static min(left: ReadonlyArray<number>, right: ReadonlyArray<number>): ReadonlyArray<number> {
        if (ArrayUtils.isLessThan(left, right)) {
            return left;
        } else {
            return right;
        }
    }

    /**
     * Return the maximal array (comparing element-wise) between two arrays.
     */
    public static max(left: ReadonlyArray<number>, right: ReadonlyArray<number>): ReadonlyArray<number> {
        if (ArrayUtils.isGreaterThan(left, right)) {
            return left;
        } else {
            return right;
        }
    }

    public static map<T, V>(list: ReadonlyArray<T>, mapper: (element: T) => V): V[] {
        const result: V[] = [];
        for (const element of list) {
            result.push(mapper(element));
        }
        return result;
    }

}
