import { Coord } from 'src/app/jscaip/Coord';
import { Ordinal } from 'src/app/jscaip/Ordinal';
import { Encoder, MGPFallible, MGPOptional } from '@everyboard/lib';
import { MoveCoordToCoord } from 'src/app/jscaip/MoveCoordToCoord';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { Localized } from 'src/app/utils/LocaleUtils';
import { Vector } from 'src/app/jscaip/Vector';
import { MartianChessState } from './MartianChessState';

export class MartianChessMoveFailure {

    public static readonly START_COORD_OUT_OF_RANGE: Localized = () => $localize`Start coord cannot be out of range`;

    public static readonly END_COORD_OUT_OF_RANGE: Localized = () => $localize`End coord cannot be out of range`;

    public static readonly PAWN_MUST_MOVE_ONE_DIAGONAL_STEP: Localized = () => $localize`Pawns must move one step diagonally.`;

    public static readonly DRONE_MUST_DO_TWO_ORTHOGONAL_STEPS: Localized = () => $localize`Drones must move one or two steps in any direction.`;
}

export class MartianChessMove extends MoveCoordToCoord {

    public static encoder: Encoder<MartianChessMove> = Encoder.tuple(
        [Coord.encoder, Coord.encoder, Encoder.identity<boolean>()],
        (move: MartianChessMove): [Coord, Coord, boolean] => [move.getStart(), move.getEnd(), move.calledTheClock],
        (f: [Coord, Coord, boolean]): MartianChessMove => MartianChessMove.from(f[0], f[1], f[2]).get(),
    );
    public static from(start: Coord, end: Coord, calledTheClock: boolean = false): MGPFallible<MartianChessMove> {
        if (MartianChessState.isNotOnBoard(start)) {
            return MGPFallible.failure(MartianChessMoveFailure.START_COORD_OUT_OF_RANGE());
        }
        if (MartianChessState.isNotOnBoard(end)) {
            return MGPFallible.failure(MartianChessMoveFailure.END_COORD_OUT_OF_RANGE());
        }
        if (end.equals(start)) {
            return MGPFallible.failure(RulesFailure.MOVE_CANNOT_BE_STATIC());
        }
        const dir: MGPFallible<Ordinal> = Ordinal.factory.fromDelta(end.x - start.x, end.y - start.y);
        if (dir.isFailure()) {
            return MGPFallible.failure(dir.getReason());
        }
        return MGPFallible.success(new MartianChessMove(start, end, calledTheClock));
    }
    private constructor(start: Coord, end: Coord, public readonly calledTheClock: boolean) {
        super(start, end);
    }
    public override toString(): string {
        const ending: string = this.calledTheClock ? ', CALL_THE_CLOCK' : '';
        return 'MartianChessMove((' + this.getStart().x + ', ' + this.getStart().y + ') -> (' +
                                      this.getEnd().x + ', ' + this.getEnd().y + ')' +
                                      ending + ')';
    }
    public override equals(other: MartianChessMove): boolean {
        if (super.equals(other as this) === false) {
            return false;
        } else {
            return this.calledTheClock === other.calledTheClock;
        }
    }
    public isValidForPawn(): boolean {
        const vector: Vector = this.getStart().getVectorToward(this.getEnd());
        return vector.isDiagonalOfLength(1);
    }
    public isValidForDrone(): boolean {
        const distance: number = this.getStart().getLinearDistanceToward(this.getEnd());
        return distance <= 2;
    }
    public isUndoneBy(moveOpt: MGPOptional<MartianChessMove>): boolean {
        if (moveOpt.isAbsent()) {
            return false;
        }
        const move: MartianChessMove = moveOpt.get();
        return move.getEnd().equals(this.getStart()) && move.getStart().equals(this.getEnd());
    }
}
