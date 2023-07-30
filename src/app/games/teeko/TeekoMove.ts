import { Coord, CoordFailure } from 'src/app/jscaip/Coord';
import { MoveCoord } from 'src/app/jscaip/MoveCoord';
import { MoveCoordToCoord } from 'src/app/jscaip/MoveCoordToCoord';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { Encoder } from 'src/app/utils/Encoder';
import { MGPFallible } from 'src/app/utils/MGPFallible';
import { TeekoState } from './TeekoState';

export type TeekoMove = TeekoDropMove | TeekoTranslationMove;

export class TeekoDropMove extends MoveCoord {

    public static encoder: Encoder<TeekoDropMove> = MoveCoord.getFallibleEncoder(TeekoDropMove.from);

    public static from(coord: Coord): MGPFallible<TeekoDropMove> {
        if (TeekoMove.isOnBoard(coord)) {
            return MGPFallible.success(new TeekoDropMove(coord.x, coord.y));
        } else {
            return MGPFallible.failure(CoordFailure.OUT_OF_RANGE(coord));
        }
    }
    public override toString(): string {
        return 'TeekoMove' + this.coord.toString();
    }
    public override equals(other: TeekoMove): boolean {
        if (other instanceof TeekoDropMove) {
            return super.equals(other as this);
        } else {
            return false;
        }
    }
}

export class TeekoTranslationMove extends MoveCoordToCoord {

    public static encoder: Encoder<TeekoTranslationMove> =
        MoveCoordToCoord.getFallibleEncoder(TeekoTranslationMove.from);

    public static from(start: Coord, end: Coord): MGPFallible<TeekoTranslationMove> {
        if (TeekoMove.isOnBoard(start) === false) {
            return MGPFallible.failure(CoordFailure.OUT_OF_RANGE(start));
        } else if (TeekoMove.isOnBoard(end) === false) {
            return MGPFallible.failure(CoordFailure.OUT_OF_RANGE(end));
        } else if (start.equals(end)) {
            return MGPFallible.failure(RulesFailure.MOVE_CANNOT_BE_STATIC());
        } else {
            return MGPFallible.success(new TeekoTranslationMove(start, end));
        }
    }
    public override toString(): string {
        return 'TeekoMove(' + this.getStart().toString() + ' -> ' + this.getEnd().toString() + ')';
    }
    public override equals(other: TeekoMove): boolean {
        if (other instanceof TeekoTranslationMove) {
            return super.equals(other as this);
        } else {
            return false;
        }
    }
}

// eslint-disable-next-line @typescript-eslint/no-redeclare
export namespace TeekoMove {

    export function isOnBoard(coord: Coord): boolean {
        return coord.isInRange(TeekoState.WIDTH, TeekoState.WIDTH);
    }
    export const encoder: Encoder<TeekoMove> =
        Encoder.disjunction(
            [(move: TeekoMove): move is TeekoDropMove => move instanceof TeekoDropMove],
            [TeekoDropMove.encoder, TeekoTranslationMove.encoder]);
}
