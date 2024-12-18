/* eslint-disable max-lines-per-function */
import { FirstPlayer, PartType } from './ConfigRoom';

describe('FirstPlayer', () => {

    it('should create the values corresponding to their string representation', () => {
        for (const firstPlayer of ['CREATOR', 'RANDOM', 'CHOSEN_PLAYER']) {
            expect(FirstPlayer.of(firstPlayer).value).toBe(firstPlayer);
        }
    });

    it('should throw when creating an invalid first player', () => {
        expect(() => FirstPlayer.of('BLI')).toThrow();
    });

});

describe('PartType', () => {

    it('should map correctly with PartType.of', () => {
        expect(PartType.of('STANDARD').value).toBe('STANDARD');
        expect(PartType.of('BLITZ').value).toBe('BLITZ');
        expect(PartType.of('CUSTOM').value).toBe('CUSTOM');
        expect(() => PartType.of('unknown')).toThrowError('Invalid part type: unknown.');
    });

});
