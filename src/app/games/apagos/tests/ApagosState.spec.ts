/* eslint-disable max-lines-per-function */
import { ApagosState } from '../ApagosState';

describe('ApagosState', () => {
    describe('toString', () => {
        it('should stringify nicely', () => {
            // Given an Apagos state
            const state: ApagosState = ApagosState.fromRepresentation(4, [
                [0, 0, 2, 0],
                [0, 0, 1, 1],
                [7, 5, 3, 1],
            ], 8, 8);

            // When converting it to string for debug purposes
            const stringified: string = state.toString();

            // Then it should look decent
            expect(stringified).toEqual('[(0, 0, 7), (0, 0, 5), (2, 1, 3), (0, 1, 1)]');
        });
    });

});
