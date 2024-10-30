import { Player, PlayerOrNone } from 'src/app/jscaip/Player';
import { ComparableObject, Utils } from '@everyboard/lib';

type PieceType = 'alive' | 'dead' | 'territory' | 'empty' | 'unreachable';

export class GoPiece implements ComparableObject {

    public static DARK: GoPiece = new GoPiece(Player.ZERO, 'alive');

    public static LIGHT: GoPiece = new GoPiece(Player.ONE, 'alive');

    public static EMPTY: GoPiece = new GoPiece(PlayerOrNone.NONE, 'empty');

    public static DEAD_DARK: GoPiece = new GoPiece(Player.ZERO, 'dead');

    public static DEAD_LIGHT: GoPiece = new GoPiece(Player.ONE, 'dead');

    public static DARK_TERRITORY: GoPiece = new GoPiece(Player.ZERO, 'territory');

    public static LIGHT_TERRITORY: GoPiece = new GoPiece(Player.ONE, 'territory');

    public static UNREACHABLE: GoPiece = new GoPiece(PlayerOrNone.NONE, 'unreachable'); // For Trigo

    public static isReachable(piece: GoPiece): boolean {
        return piece.isReachable();
    }

    private constructor(readonly player: PlayerOrNone, public readonly type: PieceType) { }

    public equals(other: GoPiece): boolean {
        return other === this;
    }

    public toString(): string {
        switch (this) {
            case GoPiece.DARK:
                return 'GoPiece.DARK';
            case GoPiece.LIGHT:
                return 'GoPiece.LIGHT';
            case GoPiece.EMPTY:
                return 'GoPiece.EMPTY';
            case GoPiece.DEAD_DARK:
                return 'GoPiece.DEAD_DARK';
            case GoPiece.DEAD_LIGHT:
                return 'GoPiece.DEAD_LIGHT';
            case GoPiece.DARK_TERRITORY:
                return 'GoPiece.DARK_TERRITORY';
            case GoPiece.UNREACHABLE:
                return 'GoPiece.UNREACHABLE';
            default:
                Utils.assert(this === GoPiece.LIGHT_TERRITORY, 'Unexisting GoPiece');
                return 'GoPiece.LIGHT_TERRITORY';
        }
    }

    public static pieceBelongTo(piece: GoPiece, owner: Player): boolean {
        return owner === piece.player && piece.type !== 'territory';
    }

    public static ofPlayer(player: Player): GoPiece {
        if (player === Player.ZERO) {
            return GoPiece.DARK;
        } else {
            return GoPiece.LIGHT;
        }
    }

    public isOccupied(): boolean {
        return this.type === 'alive' ||
            this.type === 'dead';
    }

    public isEmpty(): boolean {
        return this.type === 'territory' ||
            this.type === 'empty';
    }

    public isDead(): boolean {
        return this.type === 'dead';
    }

    public isTerritory(): boolean {
        return this.type === 'territory';
    }

    public getOwner(): PlayerOrNone {
        return this.player;
    }

    public nonTerritory(): GoPiece {
        Utils.assert(this.isEmpty(), 'Usually not false, if false, cover by test and return "this"');
        return GoPiece.EMPTY;
    }

    public isReachable(): boolean {
        return this.type !== 'unreachable';
    }

}
