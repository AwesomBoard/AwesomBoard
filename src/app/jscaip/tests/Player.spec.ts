/* eslint-disable max-lines-per-function */
import { Player } from '../Player';

describe('Player', () => {

    it('should override toString correctly', () => {
        const player: Player = Player.ONE;
        expect(player.toString()).toBe('PLAYER_ONE');
    });
    it('should define opponent of each player', () => {
        expect(Player.ONE.getOpponent()).toBe(Player.ZERO);
        expect(Player.ZERO.getOpponent()).toBe(Player.ONE);
    });

});
