import { Player, PlayerOrNone } from 'src/app/jscaip/Player';
import { ComparableObject, Encoder } from '@everyboard/lib';


export class EncapsulePiece implements ComparableObject {

    public static encoder: Encoder<EncapsulePiece> = Encoder.tuple(
        [Encoder.identity<number>(), Player.encoder],
        (piece: EncapsulePiece) => [piece.size, piece.owner],
        (value: [number, PlayerOrNone]) => EncapsulePiece.ofSizeAndPlayer(value[0], value[1]),
    );

    public static readonly NONE: EncapsulePiece = new EncapsulePiece(0, PlayerOrNone.NONE);

    public static ofSizeAndPlayer(size: number, player: PlayerOrNone): EncapsulePiece {
        if (player.isNone() || size === 0) {
            return EncapsulePiece.NONE;
        } else {
            return new EncapsulePiece(size, player);
        }
    }

    private constructor(public readonly size: number, public readonly owner: PlayerOrNone) {
    }

    public getPlayer(): PlayerOrNone {
        return this.owner;
    }

    public getSize(): number {
        return this.size;
    }

    public belongsTo(player: Player): boolean {
        return this.getPlayer() === player;
    }

    public equals(other: EncapsulePiece): boolean {
        return this.size === other.size &&
               this.owner.equals(other.owner);
    }

    public toString(): string {
        return 'size-' + this.size + '-' + this.getPlayer().toString();
    }

}
