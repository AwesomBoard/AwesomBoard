import { Encoder, Set } from '@everyboard/lib';

import { Coord } from 'src/app/jscaip/Coord';
import { Move } from 'src/app/jscaip/Move';

import { MoveCoord, TMPMoveCoord } from 'src/app/jscaip/MoveCoord';
import { MoveCoordToCoord, TMPMoveCoordToCoord } from 'src/app/jscaip/MoveCoordToCoord';

export type QuebecCastlesMove = TMPMoveCoordToCoord | QuebecCastlesDrop;

export class QuebecCastlesDrop extends Move {

    public readonly coords: Set<Coord>;

    constructor(coords: Coord[]) {
        super();
        this.coords = new Set(coords);
    }

    public override toString(): string {
        return 'QuebecCastlesDrop(' + this.coords.toString() + ')';
    }

    public override equals(other: QuebecCastlesDrop): boolean {
        return this.coords.equals(other.coords);
    }

}

// eslint-disable-next-line @typescript-eslint/no-redeclare
export namespace QuebecCastlesMove {

    export function isNormalMove(move: QuebecCastlesMove): move is TMPMoveCoordToCoord {
        return move instanceof TMPMoveCoordToCoord;
    }

    export function isDrop(move: QuebecCastlesMove): move is QuebecCastlesDrop {
        return move instanceof QuebecCastlesDrop;
    }

    export const encoder: Encoder<QuebecCastlesMove> =
        Encoder.disjunction(
            [
                QuebecCastlesMove.isNormalMove,
                QuebecCastlesMove.isDrop,
            ],
            [
                MoveCoordToCoord.getEncoder(TMPMoveCoordToCoord.of),
                MoveCoord.getEncoder(TMPMoveCoord.of),
            ],
        );
}
