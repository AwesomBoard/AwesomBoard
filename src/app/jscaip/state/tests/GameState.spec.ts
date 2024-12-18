/* eslint-disable max-lines-per-function */
import { GameState } from '../GameState';

class MyGameState extends GameState {
}

describe('GameState', () => {
    it('should successfuly be constructed', () => {
        expect(new MyGameState(3)).toBeTruthy();
    });

});
