import { Comparable, comparableEquals, ComparableObject } from './Comparable';

export class Sets {

    public static toComparableObjectSet<T extends ComparableObject>(list: readonly T[]): T[] {
        const result: T[] = [];
        list.forEach((other: T) => {
            if (result.some((el: T) => el.equals(other)) === false) {
                result.push(other);
            }
        });
        return result;
    }

    public static toComparableSet<T extends Comparable>(list: readonly T[]): T[] {
        const result: T[] = [];
        list.forEach((other: T) => {
            if (result.some((el: T) => comparableEquals(el, other)) === false) {
                result.push(other);
            }
        });
        return result;
    }

}
