/* eslint-disable max-lines-per-function */
import { Coord } from '../Coord';
import { ImmutableCoordSet } from '../CoordSet';

describe('CoordSet', () => {

    it('should build the empty set if no value is provided', () => {
        const set: ImmutableCoordSet = new ImmutableCoordSet();
        expect(set.size()).toBe(0);
    });

    it('should build a set containing all provided values', () => {
        const set: ImmutableCoordSet = new ImmutableCoordSet([new Coord(1, 2), new Coord(2, 3)]);
        expect(set.contains(new Coord(1, 2))).toBeTrue();
        expect(set.contains(new Coord(2, 3))).toBeTrue();
        expect(set.size()).toBe(2);
    });

    it('should support iteration', () => {
        const set: ImmutableCoordSet = new ImmutableCoordSet([new Coord(2, 0), new Coord(1, 0)]);
        let elementsSeen: number = 0;
        let sumOfX: number = 0;
        for (const coord of set) {
            elementsSeen++;
            sumOfX += coord.x;
        }
        expect(elementsSeen).toBe(2);
        expect(sumOfX).toBe(3);
    });

    describe('unionElement', () => {

        it('should add new elements to the set when no matching field has been seen', () => {
            let set: ImmutableCoordSet = new ImmutableCoordSet();
            set = set.unionElement(new Coord(1, 2));
            expect(set.size()).toBe(1);
        });

        it('should add new elements to the set even if a matching field has been seen', () => {
            let set: ImmutableCoordSet = new ImmutableCoordSet([new Coord(1, 2)]);
            // Coords fields are y first, then x
            set = set.unionElement(new Coord(2, 2));
            expect(set.size()).toBe(2);
        });

        it('should not add duplicate elements', () => {
            let set: ImmutableCoordSet = new ImmutableCoordSet([new Coord(1, 2)]);
            set = set.unionElement(new Coord(1, 2));
            expect(set.size()).toBe(1);
        });

    });

    describe('contains', () => {

        it('should detect when an element is in the set', () => {
            const set: ImmutableCoordSet = new ImmutableCoordSet([new Coord(1, 2)]);
            expect(set.contains(new Coord(1, 2))).toBeTrue();
        });

        it('should detect when an element is not in the set', () => {
            const set: ImmutableCoordSet = new ImmutableCoordSet([new Coord(1, 2)]);
            expect(set.contains(new Coord(2, 2))).toBeFalse();
            expect(set.contains(new Coord(1, 1))).toBeFalse();
        });

    });

});
