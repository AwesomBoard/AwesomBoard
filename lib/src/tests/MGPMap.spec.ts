/* eslint-disable max-lines-per-function */
import { MGPMap, ReversibleMap } from '../MGPMap';
import { MGPOptional } from '../MGPOptional';
import { Set } from '../Set';

describe('MGPMap', () => {

    describe('from', () => {
        it('should construct a map from a record with string keys', () => {
            const map: MGPMap<string, number> = MGPMap.from({ a: 1, b: 2 });
            expect(map.size()).toBe(2);
            expect(map.get('a').get()).toBe(1);
            expect(map.get('b').get()).toBe(2);
        });
    });

    describe('getAnyPair', () => {
        it('should return an element from the map', () => {
            const map: MGPMap<string, number> = MGPMap.from({ salut: 5 });
            const element: number = map.getAnyPair().get().value;
            expect(element).toBe(5);
        });

        it('should not return anything if the map is empty', () => {
            const emptyMap: MGPMap<string, number> = new MGPMap();
            expect(emptyMap.getAnyPair().isAbsent()).toBeTrue();
        });
    });

    describe('forEach', () => {
        it('should iterate over all elements of the map', () => {
            // Given a map with elements
            const map: MGPMap<string, number> = MGPMap.from({ first: 1, second: 2 });

            // When calling forEach
            let sum: number = 0;
            map.forEach((item: {key: string, value: number}) => sum += item.value);

            // Then all elements should have been iterated over
            expect(sum).toBe(3);
        });
    });

    describe('iterator', () => {
        it('should iterate over all elements of the map', () => {
            // Given a map with elements
            const map: MGPMap<string, number> = MGPMap.from({ first: 1, second: 2 });

            // When iterating over it
            let sum: number = 0;
            const keysSeen: string[] = [];
            for (const [key, value] of map) {
                keysSeen.push(key);
                sum += value;
            }

            // Then all elements should have been iterated over
            expect(sum).toBe(3);
            expect(keysSeen).toEqual(['first', 'second']);
        });
    });

    describe('clear', () => {
        it('should clear the map', () => {
            // Given a map with elements
            const map: MGPMap<string, number> = MGPMap.from({ first: 1, second: 2 });

            // When clearing it
            map.clear();

            // Then it should have no elements
            expect(map).toEqual(new MGPMap());
        });
    });

    describe('putAll', () => {
        it('should concatenate two maps, erasing the overlapping content on the receiver', () => {
            const receiver: MGPMap<string, number> = MGPMap.from({ first: 0, second: 1 });

            const giver: MGPMap<string, number> = MGPMap.from({ first: 1, third: 3 });
            receiver.putAll(giver);

            const expectedSum: MGPMap<string, number> = MGPMap.from({ first: 1, second: 1, third: 3 });
            expect(receiver).toEqual(expectedSum);
        });
    });

    describe('put', () => {
        it('should replace value if key value was already present', () => {
            const map: MGPMap<string, string> = MGPMap.from({ oui: 'yes' });
            expect(() => map.put('oui', 'DA')).not.toThrow();
            expect(map.get('oui')).toEqual(MGPOptional.of('DA'));
        });
    });

    describe('containsKey', () => {
        it('should return true if there is a matching key', () => {
            const map: MGPMap<string, number> = MGPMap.from({ a: 1 });
            expect(map.containsKey('a')).toBeTrue();
        });

        it('should return false if there is no matching key', () => {
            const map: MGPMap<string, number> = new MGPMap();
            expect(map.containsKey('a')).toBeFalse();
        });
    });

    describe('size', () => {
        it('should return the size of the set', () => {
            const map: MGPMap<string, number> = MGPMap.from({ a: 1, b: 2 });
            expect(map.size()).toBe(2);
        });
    });

    describe('getKeyList', () => {
        it('should return all the keys', () => {
            const map: MGPMap<string, number> = MGPMap.from({ first: 1, second: 2 });
            expect(map.getKeyList()).toEqual(['first', 'second']);
        });
    });

    describe('getValueList', () => {
        it('should return all the values', () => {
            const map: MGPMap<string, number> = MGPMap.from({ first: 1, second: 2 });
            expect(map.getValueList()).toEqual([1, 2]);
        });
    });

    describe('getKeySet', () => {
        it('should return all the keys in a set', () => {
            const map: MGPMap<string, number> = MGPMap.from({ first: 1, second: 2 });
            expect(map.getKeySet()).toEqual(new Set(['first', 'second']));
        });
    });

    describe('filter', () => {
        it('should keep only elements for which the predicate returns true', () => {
            function pred(_key: string, value: number): boolean {
                return value >= 2;
            }
            const map: MGPMap<string, number> = MGPMap.from({ first: 1, second: 2 });
            const expectedMap: MGPMap<string, number> = MGPMap.from({ second: 2 });
            expect(map.filter(pred)).toEqual(expectedMap);
        });
    });

    describe('replace', () => {
        it('should replace existing value', () => {
            const map: MGPMap<string, number> = MGPMap.from({ first: 1 });
            map.replace('first', 0);

            expect(map.get('first')).toEqual(MGPOptional.of(0));
        });

        it('should throw when value not found', () => {
            const map: MGPMap<string, number> = MGPMap.from({ first: 1 });

            expect(() => map.replace('firstZUUU', 0)).toThrowError('No Value to replace for key firstZUUU!');
        });
    });

    describe('set', () => {
        let map: MGPMap<string, string>;
        beforeEach(() => map = MGPMap.from({ oui: 'yes' }));

        it('should add the value to the set', () => {
            expect(() => map.set('non', 'no')).not.toThrow();
            expect(map.get('non').get()).toBe('no');
        });

        it('should throw if key value was already present', () => {
            expect(() => map.set('oui', 'si')).toThrowError('Key oui already exists in map!');
        });

        it('should throw when called on immutable set', () => {
            map.makeImmutable();
            expect(() => map.set('non', 'no')).toThrowError('Assertion failure: Cannot call set on immutable map!');
        });
    });

    describe('delete', () => {
        let map: MGPMap<string, number>;
        beforeEach(() => map = MGPMap.from({ first: 0 }));

        it('should delete element with the corresponding key', () => {
            map.delete('first');
            expect(map.get('first')).toEqual(MGPOptional.empty());
        });

        it('should throw when unexisting key passed', () => {
            expect(() => map.delete('second')).toThrowError('No value to delete for key "second"!');
        });

        it('should throw when called on immutable set', () => {
            map.makeImmutable();
            expect(() => map.delete('first')).toThrowError('Assertion failure: Cannot call delete on immutable map!');
        });
    });

    describe('getCopy', () => {
        let map: MGPMap<string, number>;
        beforeEach(() => map = MGPMap.from({ first: 0, second: 0 }));

        it('should make equal copy when mutable', () => {
            const copy: MGPMap<string, number> = map.getCopy();
            expect(copy).toEqual(map);
        });

        it('should not be the same physical copy when mutable', () => {
            const copy: MGPMap<string, number> = map.getCopy();
            map.set('third', 2);
            expect(copy).not.toEqual(map);
        });

        it('should equal but mutable when original was immutable', () => {
            map.makeImmutable();
            const copy: MGPMap<string, number> = map.getCopy();

            expect(copy).not.toEqual(map); // due to immutability
            copy.makeImmutable();
            expect(copy).toEqual(map);
        });
    });

    describe('equals', () => {
        it('should detect maps with distinct keys as different', () => {
            const map1: MGPMap<string, number> = MGPMap.from({ first: 0 });
            const map2: MGPMap<string, number> = MGPMap.from({ second: 1 });
            expect(map1.equals(map2)).toBeFalse();
        });

        it('should detect map with same keys but distinct values as different', () => {
            const map1: MGPMap<string, number> = MGPMap.from({ first: 0 });
            const map2: MGPMap<string, number> = MGPMap.from({ first: 1 });
            expect(map1.equals(map2)).toBeFalse();
        });

        it('should detect the same map as equal', () => {
            const map: MGPMap<string, number> = MGPMap.from({ first: 0 });
            expect(map.equals(map)).toBeTrue();
        });
    });
});

describe('ReversibleMap', () => {
    describe('reverse', () => {
        it('should return the map with values as keys and keys as values', () => {
            const map: ReversibleMap<string, string> = new ReversibleMap();
            map.set('rater', 'miss');
            map.set('manquer', 'miss');
            map.set('non', 'no');
            const reversed: ReversibleMap<string, Set<string>> = map.reverse();

            const expectedReversed: ReversibleMap<string, Set<string>> = new ReversibleMap();
            expectedReversed.set('miss', new Set(['rater', 'manquer']));
            expectedReversed.set('no', new Set(['non']));
            expect(reversed).toEqual(expectedReversed);
        });
    });
});
