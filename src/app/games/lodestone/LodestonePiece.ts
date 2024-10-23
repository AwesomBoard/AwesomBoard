import { Player, PlayerOrNone } from 'src/app/jscaip/Player';

export type LodestoneDirection = 'push' | 'pull';

export type LodestoneOrientation = 'orthogonal' | 'diagonal';

export class LodestonePieceNone {

    public static UNREACHABLE: LodestonePieceNone = new LodestonePieceNone(true);

    public static EMPTY: LodestonePieceNone = new LodestonePieceNone(false);

    public readonly owner: PlayerOrNone = PlayerOrNone.NONE;

    private constructor(private readonly unreachable: boolean) {
    }

    public isLodestone(): this is LodestonePieceLodestone {
        return false;
    }

    public isPlayerPiece(): this is LodestonePiecePlayer {
        return false;
    }

    public isEmpty(): this is LodestonePieceNone {
        return true;
    }

    public isUnreachable(): boolean {
        return this.unreachable;
    }

    public equals(other: LodestonePiece): boolean {
        return this === other;
    }

}

export class LodestonePiecePlayer {

    public static ZERO: LodestonePiecePlayer = new LodestonePiecePlayer(Player.ZERO);

    public static ONE: LodestonePiecePlayer = new LodestonePiecePlayer(Player.ONE);

    public static of(player: Player): LodestonePiecePlayer {
        if (player === Player.ZERO) {
            return LodestonePiecePlayer.ZERO;
        } else {
            return LodestonePiecePlayer.ONE;
        }
    }

    private constructor(public readonly owner: Player) {
    }

    public isLodestone(): this is LodestonePieceLodestone {
        return false;
    }

    public isPlayerPiece(): this is LodestonePiecePlayer {
        return true;
    }

    public isEmpty(): this is LodestonePieceNone {
        return false;
    }

    public isUnreachable(): boolean {
        return false;
    }

    public equals(other: LodestonePiece): boolean {
        return this === other;
    }

}

type LodestoneOrientationMap = Record<LodestoneOrientation, LodestonePieceLodestone>;

type LodestoneDirectionMap = Record<LodestoneDirection, LodestoneOrientationMap>;

type LodestoneMap = Record<0 | 1, LodestoneDirectionMap>;

export interface LodestoneDescription {

    direction: LodestoneDirection;

    orientation: LodestoneOrientation;
}

export class LodestonePieceLodestone {

    public static readonly ZERO_PUSH_DIAGONAL: LodestonePieceLodestone = new LodestonePieceLodestone(Player.ZERO, 'push', 'diagonal');
    public static readonly ZERO_PUSH_ORTHOGONAL: LodestonePieceLodestone = new LodestonePieceLodestone(Player.ZERO, 'push', 'orthogonal');
    public static readonly ZERO_PULL_DIAGONAL: LodestonePieceLodestone = new LodestonePieceLodestone(Player.ZERO, 'pull', 'diagonal');
    public static readonly ZERO_PULL_ORTHOGONAL: LodestonePieceLodestone = new LodestonePieceLodestone(Player.ZERO, 'pull', 'orthogonal');
    public static readonly ONE_PUSH_DIAGONAL: LodestonePieceLodestone = new LodestonePieceLodestone(Player.ONE, 'push', 'diagonal');
    public static readonly ONE_PUSH_ORTHOGONAL: LodestonePieceLodestone = new LodestonePieceLodestone(Player.ONE, 'push', 'orthogonal');
    public static readonly ONE_PULL_DIAGONAL: LodestonePieceLodestone = new LodestonePieceLodestone(Player.ONE, 'pull', 'diagonal');
    public static readonly ONE_PULL_ORTHOGONAL: LodestonePieceLodestone = new LodestonePieceLodestone(Player.ONE, 'pull', 'orthogonal');

    private static readonly LODESTONES: LodestoneMap = {
        0: {
            'push': {
                'diagonal': LodestonePieceLodestone.ZERO_PUSH_DIAGONAL,
                'orthogonal': LodestonePieceLodestone.ZERO_PUSH_ORTHOGONAL,
            },
            'pull': {
                'diagonal': LodestonePieceLodestone.ZERO_PULL_DIAGONAL,
                'orthogonal': LodestonePieceLodestone.ZERO_PULL_ORTHOGONAL,
            },
        },
        1: {
            'push': {
                'diagonal': LodestonePieceLodestone.ONE_PUSH_DIAGONAL,
                'orthogonal': LodestonePieceLodestone.ONE_PUSH_ORTHOGONAL,
            },
            'pull': {
                'diagonal': LodestonePieceLodestone.ONE_PULL_DIAGONAL,
                'orthogonal': LodestonePieceLodestone.ONE_PULL_ORTHOGONAL,
            },
        },
    };

    private constructor(public readonly owner: Player,
                        public readonly direction: LodestoneDirection,
                        public readonly orientation: LodestoneOrientation)
    {
    }

    public static of(player: Player, description: LodestoneDescription)
    : LodestonePieceLodestone
    {
        return LodestonePieceLodestone.LODESTONES[player.getValue()][description.direction][description.orientation];
    }

    public isLodestone(): this is LodestonePieceLodestone {
        return true;
    }

    public isPlayerPiece(): this is LodestonePiecePlayer {
        return false;
    }

    public isEmpty(): this is LodestonePieceNone {
        return false;
    }

    public isUnreachable(): boolean {
        return false;
    }

    public equals(other: LodestonePiece): boolean {
        return this === other;
    }

}

export type LodestonePiece = LodestonePiecePlayer | LodestonePieceLodestone | LodestonePieceNone;
