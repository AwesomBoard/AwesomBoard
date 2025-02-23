import { Coord } from './Coord';
import { Ordinal } from './Ordinal';
import { MGPFallible } from '@everyboard/lib';
import { RulesFailure } from './RulesFailure';
import { MoveWithTwoCoords } from './MoveWithTwoCoords';

export abstract class MoveCoordToCoord extends MoveWithTwoCoords {

    public constructor(start: Coord, end: Coord) {
        super(start, end);
        if (start.equals(end)) throw new Error(RulesFailure.MOVE_CANNOT_BE_STATIC());
    }

    public getDistance(): number {
        return this.getStart().getLinearDistanceToward(this.getEnd());
    }

    public getDirection(): MGPFallible<Ordinal> {
        return Ordinal.factory.fromMove(this.getStart(), this.getEnd());
    }

    public getStart(): Coord {
        return this.getFirst();
    }

    public getEnd(): Coord {
        return this.getSecond();
    }

    public getMovedOverCoords(): Coord[] {
        return this.getStart().getAllCoordsToward(this.getEnd());
    }

    public getJumpedOverCoords(): Coord[] {
        return this.getStart().getCoordsToward(this.getEnd());
        // TODO, reuse that method with [], wherever it is in branch
    }

    public equals(other: this): boolean {
        if (this === other) return true;
        if (this.getStart().equals(other.getStart()) === false) return false;
        return this.getEnd().equals(other.getEnd());
    }

    public toString(): string {
        const start: string = this.getStart().toString();
        const end: string = this.getEnd().toString();
        return `${start} -> ${end}`;
    }

}
