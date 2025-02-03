import { MoveCoordToCoord } from 'src/app/jscaip/MoveCoordToCoord';
import { Coord } from 'src/app/jscaip/Coord';
import { TriangularCheckerBoard } from 'src/app/jscaip/state/TriangularCheckerBoard';
import { Encoder, MGPFallible, MGPValidation } from '@everyboard/lib';
import { SaharaFailure } from './SaharaFailure';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { MoveWithTwoCoords } from 'src/app/jscaip/MoveWithTwoCoords';

export class SaharaMove extends MoveCoordToCoord {

    public static encoder: Encoder<SaharaMove> = MoveWithTwoCoords.getFallibleEncoder(SaharaMove.from);

    public static checkDistanceAndLocation(start: Coord, end: Coord): MGPValidation {
        const distance: number = start.getOrthogonalDistance(end);
        if (distance === 0) {
            return MGPValidation.failure(RulesFailure.MOVE_CANNOT_BE_STATIC());
        } else if (distance === 1) {
            const fakeNeighbors: Coord = TriangularCheckerBoard.getFakeNeighbors(start);
            if (end.equals(fakeNeighbors)) {
                return MGPValidation.failure(SaharaFailure.THOSE_TWO_SPACES_ARE_NOT_NEIGHBORS());
            }
        } else if (distance === 2) {
            if (TriangularCheckerBoard.isSpaceDark(start)) {
                return MGPValidation.failure(SaharaFailure.CAN_ONLY_REBOUND_ON_BLACK());
            }
            if (start.x === end.x) {
                return MGPValidation.failure(SaharaFailure.THOSE_TWO_SPACES_HAVE_NO_COMMON_NEIGHBOR());
            }
        } else {
            return MGPValidation.failure($localize`You can move one or two spaces, not ${distance}.`);
        }
        return MGPValidation.SUCCESS;
    }

    public static from(start: Coord, end: Coord): MGPFallible<SaharaMove> {
        const validity: MGPValidation = SaharaMove.checkDistanceAndLocation(start, end);
        if (validity.isFailure()) {
            return validity.toOtherFallible();
        } else {
            return MGPFallible.success(new SaharaMove(start, end));
        }
    }

    private constructor(start: Coord, end: Coord) {
        super(start, end);
    }

    public isSimpleStep(): boolean {
        const dx: number = Math.abs(this.getStart().x - this.getEnd().x);
        const dy: number = Math.abs(this.getStart().y - this.getEnd().y);
        return dx + dy === 1;
    }

    public override toString(): string {
        return 'SaharaMove(' + this.getStart() + '->' + this.getEnd() + ')';
    }

}
