import { GameStatus } from '../GameStatus';
import { Player } from '../Player';

describe('GameStatus', () => {

    it('should be convertible to BoardValue', () => {
        expect(GameStatus.ZERO_WON.toBoardValue().metrics).toEqual([Player.ZERO.getVictoryValue()]);
        expect(GameStatus.ONE_WON.toBoardValue().metrics).toEqual([Player.ONE.getVictoryValue()]);
        expect(GameStatus.DRAW.toBoardValue().metrics).toEqual([0]);
        expect(GameStatus.ONGOING.toBoardValue().metrics).toEqual([0]);
    });

    it('should map victory correctly', () => {
        expect(GameStatus.getVictory(Player.ZERO)).toBe(GameStatus.ZERO_WON);
        expect(GameStatus.getVictory(Player.ONE)).toBe(GameStatus.ONE_WON);
        expect(GameStatus.getDefeat(Player.ZERO)).toBe(GameStatus.ONE_WON);
        expect(GameStatus.getDefeat(Player.ONE)).toBe(GameStatus.ZERO_WON);
    });

});
