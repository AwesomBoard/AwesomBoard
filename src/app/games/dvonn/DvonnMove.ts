import { Encoder, MGPFallible } from '@everyboard/lib';

import { Coord } from 'src/app/jscaip/Coord';
import { MoveCoordToCoord } from 'src/app/jscaip/MoveCoordToCoord';
import { DvonnState } from './DvonnState';
import { MoveWithTwoCoords } from 'src/app/jscaip/MoveWithTwoCoords';
import { DvonnFailure } from './DvonnFailure';

export class DvonnMove extends MoveCoordToCoord {

    public static PASS: DvonnMove = new DvonnMove(new Coord(-1, -1), new Coord(-2, -2));

    public static encoder: Encoder<DvonnMove> = MoveWithTwoCoords.getFallibleEncoder(DvonnMove.from);

    private constructor(start: Coord, end: Coord) {
        super(start, end);
    }
    public static from(start: Coord, end: Coord): MGPFallible<DvonnMove> {
        if (start.x === -1 && start.y === -1 && end.x === -2 && end.y === -2) {
            // PASS move
            return MGPFallible.success(DvonnMove.PASS);
        }
        // Move should be on board
        if (DvonnState.isNotOnBoard(start)) {
            return MGPFallible.failure('Starting coord of DvonnMove must be on the board, not at ' + start.toString());
        }
        if (DvonnState.isNotOnBoard(end)) {
            return MGPFallible.failure('End coord of DvonnMove must be on the board, not at ' + start.toString());
        }
        // Move should be a straight line
        if (start.y === end.y) {
            // vertical move, allowed
            return MGPFallible.success(new DvonnMove(start, end));
        } else if (start.x === end.x) {
            // horizontal move, allowed
            return MGPFallible.success(new DvonnMove(start, end));
        } else if (start.x + start.y === end.x + end.y) {
            // diagonal move, allowed
            return MGPFallible.success(new DvonnMove(start, end));
        } else {
            return MGPFallible.failure(DvonnFailure.MUST_MOVE_IN_STRAIGHT_LINE());
        }
    }
    public override toString(): string {
        if (this === DvonnMove.PASS) {
            return 'DvonnMove.PASS';
        }
        return 'DvonnMove(' + this.getStart() + '->' + this.getEnd() + ')';
    }
    public override getDistance(): number {
        if (this.getStart().y === this.getEnd().y) {
            return Math.abs(this.getStart().x - this.getEnd().x);
        } else if (this.getStart().x === this.getEnd().x) {
            return Math.abs(this.getStart().y - this.getEnd().y);
        } else {
            return Math.abs(this.getStart().y - this.getEnd().y);
        }
    }
}
