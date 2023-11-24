import { BoardValue } from './AI/BoardValue';
import { Player, PlayerOrNone } from './Player';

export class GameStatus {

    public static readonly ZERO_WON: GameStatus = new GameStatus(true, Player.ZERO);

    public static readonly ONE_WON: GameStatus = new GameStatus(true, Player.ONE);

    public static readonly DRAW: GameStatus = new GameStatus(true, PlayerOrNone.NONE);

    public static readonly ONGOING: GameStatus = new GameStatus(false, PlayerOrNone.NONE);

    public static getVictory(nonNonePlayer: Player): GameStatus {
        if (nonNonePlayer === Player.ZERO) {
            return GameStatus.ZERO_WON;
        } else {
            return GameStatus.ONE_WON;
        }
    }
    public static getDefeat(nonNonePlayer: Player): GameStatus {
        if (nonNonePlayer === Player.ZERO) {
            return GameStatus.ONE_WON;
        } else {
            return GameStatus.ZERO_WON;
        }
    }
    private constructor(public readonly isEndGame: boolean, public readonly winner: PlayerOrNone) {
    }
    public toBoardValue(): BoardValue {
        if (this.winner.isPlayer()) {
            return new BoardValue(this.winner.getVictoryValue());
        } else {
            return new BoardValue(0);
        }
    }
}
