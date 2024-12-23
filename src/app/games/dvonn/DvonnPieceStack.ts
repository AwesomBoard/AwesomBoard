import { Encoder } from '@everyboard/lib';

import { Player, PlayerOrNone } from 'src/app/jscaip/Player';

export class DvonnPieceStack {

    public static encoder: Encoder<DvonnPieceStack> = Encoder.tuple(
        [Encoder.identity<boolean>(), Player.encoder, Encoder.identity<number>()],
        (stack: DvonnPieceStack): [boolean, PlayerOrNone, number] => [stack.source, stack.owner, stack.size],
        (fields: [boolean, Player, number]): DvonnPieceStack => {
            return new DvonnPieceStack(fields[1], fields[2], fields[0]);
        });
    public static MAX_SIZE: number = 49; // The maximal possible size for a stack
    public static EMPTY: DvonnPieceStack = new DvonnPieceStack(PlayerOrNone.NONE, 0, false);
    public static UNREACHABLE: DvonnPieceStack = new DvonnPieceStack(PlayerOrNone.NONE, -1, false);
    public static PLAYER_ZERO: DvonnPieceStack = new DvonnPieceStack(Player.ZERO, 1, false);
    public static PLAYER_ONE: DvonnPieceStack = new DvonnPieceStack(Player.ONE, 1, false);
    public static SOURCE: DvonnPieceStack = new DvonnPieceStack(PlayerOrNone.NONE, 1, true);

    public static append(stack1: DvonnPieceStack, stack2: DvonnPieceStack): DvonnPieceStack {
        return new DvonnPieceStack(stack1.owner, stack1.size + stack2.size, stack1.source || stack2.source);
    }

    public constructor(public readonly owner: PlayerOrNone,
                       public readonly size: number,
                       public readonly source: boolean)
    {
    }
    public getOwner(): PlayerOrNone {
        return this.owner;
    }
    public belongsTo(player: Player): boolean {
        return this.owner === player;
    }
    public containsSource(): boolean {
        return this.source;
    }
    public isEmpty(): boolean {
        return this.size === 0;
    }
    public hasPieces(): boolean {
        return this.isEmpty() === false;
    }
    public getSize(): number {
        return this.size;
    }
    public toString(): string {
        return 'DvonnPieceStack(' + this.owner.toString() + ', ' + this.size + ', ' + this.source + ')';
    }
    public equals(other: DvonnPieceStack): boolean {
        return this.owner === other.owner &&
               this.size === other.size &&
               this.source === other.source;
    }
}
