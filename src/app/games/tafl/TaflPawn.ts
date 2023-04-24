import { PlayerOrNone } from 'src/app/jscaip/Player';

export class TaflPawn {

    public static readonly UNOCCUPIED: TaflPawn = new TaflPawn(PlayerOrNone.NONE, false);

    public static readonly PLAYER_ONE_KING: TaflPawn = new TaflPawn(PlayerOrNone.ONE, true);

    public static readonly INVADERS: TaflPawn = new TaflPawn(PlayerOrNone.ZERO, false);

    public static readonly DEFENDERS: TaflPawn = new TaflPawn(PlayerOrNone.ONE, false);

    private constructor(private readonly owner: PlayerOrNone,
                        private readonly king: boolean)
    {
    }
    public isKing(): boolean {
        return this.king;
    }
    public getOwner(): PlayerOrNone {
        return this.owner;
    }
}
