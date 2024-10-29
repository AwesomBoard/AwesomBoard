import { Player } from '../Player';

export abstract class GameState {

    public constructor(public readonly turn: number) {
    }

    public getCurrentPlayer(): Player {
        return Player.ofTurn(this.turn);
    }

    public getPreviousOpponent(): Player {
        return this.getCurrentPlayer();
    }

    public getCurrentOpponent(): Player {
        return this.turn % 2 === 1 ? Player.ZERO : Player.ONE;
    }

    public getPreviousPlayer(): Player {
        return this.getCurrentOpponent();
    }

}
