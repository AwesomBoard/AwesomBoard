/* eslint-disable max-lines-per-function */
import { Comparable, ComparableObject } from '../Comparable';
import { Sets } from '../Sets';
import { Pair } from './Pair.spec';

describe('Sets', () => {

    it('should remove duplicate (with ComparableObject)', () => {
        const withDuplicate: ComparableObject[] = [new Pair(0, 0), new Pair(0, 0), new Pair(1, 1)];

        const asSet: ComparableObject[] = Sets.toComparableObjectSet(withDuplicate);

        expect(asSet).toEqual([new Pair(0, 0), new Pair(1, 1)]);
    });

    it('should remove duplicate (with Comparable)', () => {
        const withDuplicate: Comparable[] = [1, 2, 1];

        const asSet: Comparable[] = Sets.toComparableSet(withDuplicate);

        expect(asSet).toEqual([1, 2]);
    });

});
