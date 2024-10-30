import { ComparableObject, Encoder, JSONValueWithoutArray, Utils } from '@everyboard/lib';

class PlayerNone implements ComparableObject {

    public static NONE: PlayerNone = new PlayerNone();

    private readonly value: number = 2;

    private constructor() {
    }

    public isPlayer(): this is Player {
        return false;
    }

    public isNone(): this is PlayerNone {
        return true;
    }

    public toString(): string {
        return 'PLAYER_NONE';
    }

    public equals(other: PlayerOrNone): boolean {
        return this === other;
    }

    public getValue() : number {
        return this.value;
    }

}

export class Player implements ComparableObject {

    public static encoder: Encoder<Player> = Encoder.tuple(
        [Encoder.identity<0 | 1>()],
        (player: Player) => [player.getValue()],
        (fields: [0 | 1]) => Player.of(fields[0]),
    );
    public static readonly ZERO: Player = new Player(0);
    public static readonly ONE: Player = new Player(1);
    public static readonly PLAYERS: Player[] = [Player.ZERO, Player.ONE];

    public static of(value: number): Player {
        switch (value) {
            case 0:
                return Player.ZERO;
            default:
                Utils.expectToBe(value, 1);
                return Player.ONE;
        }
    }

    public static ofTurn(turn: number): Player {
        return turn % 2 === 0 ? Player.ZERO : Player.ONE;
    }

    protected constructor(private readonly value: 0 | 1) {}

    public isPlayer(): this is Player {
        return true;
    }

    public isNone(): this is PlayerNone {
        return false;
    }

    public toString(): string {
        switch (this) {
            case Player.ZERO: return 'PLAYER_ZERO';
            default:
                Utils.expectToBe(this, Player.ONE, 'Player should not be something else than Player.ZERO and Player.ONE');
                return 'PLAYER_ONE';
        }
    }

    public equals(other: PlayerOrNone): boolean {
        return this === other;
    }

    public getScoreModifier(): number {
        if (this.value === 0) {
            return -1;
        } else {
            return 1;
        }
    }

    public getPreVictory(): number {
        return this.getVictoryValue() - this.getScoreModifier();
    }

    public getVictoryValue(): number {
        if (this === Player.ZERO) {
            return Number.MIN_SAFE_INTEGER;
        } else {
            return Number.MAX_SAFE_INTEGER;
        }
    }

    public getOpponent(): Player {
        switch (this) {
            case Player.ZERO: return Player.ONE;
            default:
                Utils.expectToBe(this, Player.ONE);
                return Player.ZERO;
        }
    }

    public getValue(): number {
        return this.value;
    }

    public getHTMLClass(postfix: string): string {
        return 'player' + this.getValue() + postfix;
    }

}

export type PlayerOrNone = Player | PlayerNone;

// eslint-disable-next-line no-redeclare, @typescript-eslint/no-redeclare
export namespace PlayerOrNone {
    export const ZERO: Player = Player.ZERO;
    export const ONE: Player = Player.ONE;
    export const NONE: PlayerNone = PlayerNone.NONE;

    export const encoder: Encoder<PlayerOrNone> = new class extends Encoder<PlayerOrNone> {
        public encode(player: PlayerOrNone): JSONValueWithoutArray {
            return player.getValue();
        }
        public decode(encoded: JSONValueWithoutArray): PlayerOrNone {
            if (encoded === 2) return PlayerOrNone.NONE;
            Utils.assert(encoded === 0 || encoded === 1, 'Invalid encoded player: ' + encoded);
            return Player.of(encoded as 0|1);
        }
    };
}
