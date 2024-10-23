import { Player, PlayerOrNone } from 'src/app/jscaip/Player';
import { Orthogonal } from 'src/app/jscaip/Orthogonal';
import { MGPOptional, Utils } from '@everyboard/lib';

export type SiamPieceValue = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export class SiamPiece {

    public static readonly EMPTY: SiamPiece =
        new SiamPiece(0, PlayerOrNone.NONE, MGPOptional.empty());

    public static readonly LIGHT_UP: SiamPiece =
        new SiamPiece(1, PlayerOrNone.ONE, MGPOptional.of(Orthogonal.UP));

    public static readonly LIGHT_RIGHT: SiamPiece =
        new SiamPiece(2, PlayerOrNone.ONE, MGPOptional.of(Orthogonal.RIGHT));

    public static readonly LIGHT_DOWN: SiamPiece =
        new SiamPiece(3, PlayerOrNone.ONE, MGPOptional.of(Orthogonal.DOWN));

    public static readonly LIGHT_LEFT: SiamPiece =
        new SiamPiece(4, PlayerOrNone.ONE, MGPOptional.of(Orthogonal.LEFT));

    public static readonly DARK_UP: SiamPiece =
        new SiamPiece(5, PlayerOrNone.ZERO, MGPOptional.of(Orthogonal.UP));

    public static readonly DARK_RIGHT: SiamPiece =
        new SiamPiece(6, PlayerOrNone.ZERO, MGPOptional.of(Orthogonal.RIGHT));

    public static readonly DARK_DOWN: SiamPiece =
        new SiamPiece(7, PlayerOrNone.ZERO, MGPOptional.of(Orthogonal.DOWN));

    public static readonly DARK_LEFT: SiamPiece =
        new SiamPiece(8, PlayerOrNone.ZERO, MGPOptional.of(Orthogonal.LEFT));

    public static readonly MOUNTAIN: SiamPiece =
        new SiamPiece(9, PlayerOrNone.NONE, MGPOptional.empty());

    public static decode(value: SiamPieceValue): SiamPiece {
        switch (value) {
            case 0: return SiamPiece.EMPTY;
            case 1: return SiamPiece.LIGHT_UP;
            case 2: return SiamPiece.LIGHT_RIGHT;
            case 3: return SiamPiece.LIGHT_DOWN;
            case 4: return SiamPiece.LIGHT_LEFT;
            case 5: return SiamPiece.DARK_UP;
            case 6: return SiamPiece.DARK_RIGHT;
            case 7: return SiamPiece.DARK_DOWN;
            case 8: return SiamPiece.DARK_LEFT;
            case 9: return SiamPiece.MOUNTAIN;
        }
    }

    public static of(orientation: Orthogonal, player: Player): SiamPiece {
        if (player === Player.ZERO) {
            if (orientation === Orthogonal.UP) return SiamPiece.DARK_UP;
            if (orientation === Orthogonal.RIGHT) return SiamPiece.DARK_RIGHT;
            if (orientation === Orthogonal.DOWN) return SiamPiece.DARK_DOWN;
            return SiamPiece.DARK_LEFT;
        } else {
            if (orientation === Orthogonal.UP) return SiamPiece.LIGHT_UP;
            if (orientation === Orthogonal.RIGHT) return SiamPiece.LIGHT_RIGHT;
            if (orientation === Orthogonal.DOWN) return SiamPiece.LIGHT_DOWN;
            return SiamPiece.LIGHT_LEFT;
        }
    }

    private constructor(private readonly value: number,
                        private readonly owner: PlayerOrNone,
                        private readonly direction: MGPOptional<Orthogonal>)
    {
    }

    public belongsTo(player: Player): boolean {
        return this.owner.equals(player);
    }

    public isEmptyOrMountain(): boolean {
        return this.owner.isNone();
    }

    public isPiece(): boolean {
        return this.isEmptyOrMountain() === false;
    }

    public getOwner(): PlayerOrNone {
        return this.owner;
    }

    public getOptionalDirection(): MGPOptional<Orthogonal> {
        return this.direction;
    }

    public getDirection(): Orthogonal {
        return this.getOptionalDirection().get();
    }

    public equals(other: SiamPiece): boolean {
        return this === other;
    }

    public toString(): string {
        switch (this) {
            case SiamPiece.EMPTY: return 'EMPTY';
            case SiamPiece.LIGHT_UP: return 'LIGHT_UP';
            case SiamPiece.LIGHT_RIGHT: return 'LIGHT_RIGHT';
            case SiamPiece.LIGHT_DOWN: return 'LIGHT_DOWN';
            case SiamPiece.LIGHT_LEFT: return 'LIGHT_LEFT';
            case SiamPiece.DARK_UP: return 'DARK_UP';
            case SiamPiece.DARK_RIGHT: return 'DARK_RIGHT';
            case SiamPiece.DARK_DOWN: return 'DARK_DOWN';
            case SiamPiece.DARK_LEFT: return 'DARK_LEFT';
            default:
                // must be 9, according to this.value's type
                Utils.expectToBe(this, SiamPiece.MOUNTAIN);
                return 'MOUNTAIN';
        }
    }
}
