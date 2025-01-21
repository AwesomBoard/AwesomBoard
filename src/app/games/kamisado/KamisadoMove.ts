import { Coord } from 'src/app/jscaip/Coord';
import { Encoder, Utils } from '@everyboard/lib';
import { MoveCoordToCoord } from 'src/app/jscaip/MoveCoordToCoord';
import { KamisadoState } from './KamisadoState';
import { Move } from 'src/app/jscaip/Move';
import { MoveWithTwoCoords } from 'src/app/jscaip/MoveWithTwoCoords';

export type KamisadoMove = KamisadoPieceMove | KamisadoPassMove;

class KamisadoPassMove extends Move {

    public static PASS: KamisadoMove = new KamisadoPassMove();

    public static readonly encoder: Encoder<KamisadoPassMove> = Encoder.constant('PASS', KamisadoPassMove.PASS);

    private constructor() {
        super();
    }

    public getDistance(): number {
        return 0;
    }

    public equals(that: KamisadoMove): boolean {
        return this === that;
    }

    public toString(): string {
        return 'KamisadoMove(PASS)';
    }

}

export class KamisadoPieceMove extends MoveCoordToCoord {

    public static readonly encoder: Encoder<KamisadoPieceMove> = MoveWithTwoCoords.getEncoder(KamisadoPieceMove.of);

    public static of(start: Coord, end: Coord): KamisadoPieceMove {
        Utils.assert(KamisadoState.isOnBoard(start),
                     'Starting coord of KamisadoMove must be on the board, not at ' + start.toString());
        Utils.assert(KamisadoState.isOnBoard(end),
                     'End coord of KamisadoMove must be on the board, not at ' + end.toString());
        return new KamisadoPieceMove(start, end);
    }

    private constructor(start: Coord, end: Coord) {
        super(start, end);
    }

    public override equals(other: KamisadoMove): boolean {
        if (other === this) return true;
        if (KamisadoMove.isPiece(other)) {
            if (other.getStart().equals(this.getStart()) === false) return false;
            return other.getEnd().equals(this.getEnd());
        } else {
            return false;
        }
    }

    public override toString(): string {
        return 'KamisadoMove(' + this.getStart() + '->' + this.getEnd() + ')';
    }

}

function isPass(move: KamisadoMove): move is KamisadoPassMove {
    return move instanceof KamisadoPassMove;
}

// eslint-disable-next-line @typescript-eslint/no-redeclare
export namespace KamisadoMove {

    export const PASS: KamisadoPassMove = KamisadoPassMove.PASS;

    export function of(start: Coord, end: Coord): KamisadoPieceMove {
        return KamisadoPieceMove.of(start, end);
    }

    export function isPiece(move: KamisadoMove): move is KamisadoPieceMove {
        return move instanceof KamisadoPieceMove;
    }

    export const encoder: Encoder<KamisadoMove> =
        Encoder.disjunction([KamisadoMove.isPiece, isPass],
                            [KamisadoPieceMove.encoder, KamisadoPassMove.encoder]);
}
