import { Coord } from 'src/app/jscaip/Coord';
import { Move } from 'src/app/jscaip/Move';
import { DiamPiece } from './DiamPiece';
import { Encoder } from '../../utils/Encoder';

export class DiamMoveDrop extends Move {

    public static encoder: Encoder<DiamMoveDrop> = Encoder.tuple(
        [Encoder.identity<number>(), DiamPiece.encoder],
        (drop: DiamMoveDrop): [number, DiamPiece] => [drop.target, drop.piece],
        (fields: [number, DiamPiece]): DiamMoveDrop => new DiamMoveDrop(fields[0], fields[1]),
    );
    public constructor(public readonly target: number,
                       public readonly piece: DiamPiece)
    {
        super();
        if (piece === DiamPiece.EMPTY) {
            throw new Error('Cannot drop an empty piece');
        }
    }
    public getTarget(): number {
        return this.target;
    }
    public equals(other: DiamMove): boolean {
        if (other instanceof DiamMoveDrop) {
            if (this.target !== other.target) return false;
            if (this.piece !== other.piece) return false;
            return true;
        }
        return false;
    }
    public toString(): string {
        return `DiamMoveDrop(${this.target}, ${this.piece})`;
    }
}

type DiamShiftDirection = 'clockwise' | 'counterclockwise';

export class DiamMoveShift extends Move {

    public static encoder: Encoder<DiamMoveShift> = Encoder.tuple(
        [Coord.encoder, Encoder.identity<boolean>()],
        (shift: DiamMoveShift): [Coord, boolean] => [shift.start, shift.moveDirection === 'clockwise'],
        (fields: [Coord, boolean]): DiamMoveShift => new DiamMoveShift(fields[0], fields[1] ? 'clockwise' : 'counterclockwise'),
    );
    public static ofRepresentation(representationStart: Coord, moveDirection: DiamShiftDirection): DiamMoveShift {
        // In the representation, the y axis is reverted, so 3 - y gives the real y on board
        return new DiamMoveShift(new Coord(representationStart.x, 3 - representationStart.y), moveDirection);
    }
    public constructor(public readonly start: Coord,
                       public readonly moveDirection: DiamShiftDirection) {
        super();
    }
    public getTarget(): number {
        if (this.moveDirection === 'clockwise') {
            return (this.start.x + 1) % 8;
        } else {
            return (this.start.x + 7) % 8;
        }
    }
    public equals(other: DiamMove): boolean {
        if (other instanceof DiamMoveShift) {
            if (this.start.equals(other.start) === false) return false;
            if (this.moveDirection !== other.moveDirection) return false;
            return true;
        } else {
            return false;
        }
    }
    public toString(): string {
        return `DiamMoveShift(${this.start}, ${this.moveDirection})`;
    }
}

export type DiamMove = DiamMoveDrop | DiamMoveShift;

function isShift(move: DiamMove): move is DiamMoveShift {
    return move instanceof DiamMoveShift;
}

// eslint-disable-next-line @typescript-eslint/no-redeclare
export namespace DiamMove {

    export function isDrop(move: DiamMove): move is DiamMoveDrop {
        return move instanceof DiamMoveDrop;
    }
    export const encoder: Encoder<DiamMove> =
        Encoder.disjunction([DiamMove.isDrop, isShift],
                            [DiamMoveDrop.encoder, DiamMoveShift.encoder]);
}
