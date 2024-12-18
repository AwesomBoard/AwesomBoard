/* eslint-disable max-lines-per-function */
import { Combinatorics } from '../Combinatorics';

describe('Combinatorics', () => {

    describe('getSubsetOfSize', () => {
        it('should return all subsets of a given size', () => {
            const elements: number[] = [0, 1, 2];
            const subsets: number[][] = Combinatorics.getSubsetsOfSize(elements, 2);

            expect(subsets.length).toBe(3);
            const seen: number[] = [0, 0, 0];
            for (const subset of subsets) {
                expect(subset.length).toBe(2);
                for (const elem of subset) {
                    seen[elem] += 1;
                }
            }
            expect(seen).toEqual([2, 2, 2]);
        });
    });
    describe('getPermutations', () => {
        it('should return all permutations of a list', () => {
            const elements: number[] = [1, 2, 3];
            const permutations: number[][] = Combinatorics.getPermutations(elements);

            expect(permutations.length).toBe(3 * 2 * 1);
            for (const permutation of permutations) {
                expect(permutation.length).toBe(3);
                let sum: number = 0;
                for (const element of permutation) {
                    sum += element;
                }
                expect(sum).toBe(6);
            }
        });
    });
    describe('getCombinations', () => {
        it('should return all k-combinations of a list', () => {
            const elements: number[] = [0, 1, 2];
            const combinations: number[][] = Combinatorics.getCombinations(elements, 2);

            expect(combinations.length).toEqual(6);
            const seen: number[] = [0, 0, 0];
            for (const combination of combinations) {
                expect(combination.length).toBe(2);
                for (const element of combination) {
                    seen[element] += 1;
                }
            }
            expect(seen).toEqual([4, 4, 4]);
        });
    });

});
