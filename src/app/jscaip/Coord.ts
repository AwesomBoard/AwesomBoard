import { Ordinal } from './Ordinal';
import { Encoder, MGPFallible, Utils } from '@everyboard/lib';
import { Vector } from './Vector';

export class CoordFailure {
    public static OUT_OF_RANGE(coord: Coord): string {
        return `The coordinate ${ coord.toString() } is not on the board`;
    }
}

export class Coord extends Vector {

    public static getEncoder<T extends Coord>(generator: (x: number, y: number) => T): Encoder<T> {
        return Encoder.tuple(
            [Encoder.identity<number>(), Encoder.identity<number>()],
            (coord: T): [number, number] => [coord.x, coord.y],
            (fields: [number, number]): T => generator(fields[0], fields[1]),
        );
    }

    public static encoder: Encoder<Coord> = Coord.getEncoder((x: number, y: number): Coord => new Coord(x, y));

    public constructor(x: number, y: number) {
        super(x, y);
    }

    public getNext(dir: Vector, distance?: number): Coord {
        const combinedVector: Vector = this.combine(dir, distance);
        return new Coord(combinedVector.x, combinedVector.y);
    }

    public getPrevious(dir: Vector, distance: number = 1): Coord {
        return this.getNext(dir, -distance);
    }

    public getLeft(dir: Vector): Coord {
        // looking in the direction "dir", we just go one step left
        // since the directions in DIRECTIONS are sorted in horlogic order,
        // we just need to take the one before the previous (-2/8 = -90°)
        // also, math logic seem's to suggest that (x, y) become (y, -x)
        // the second solution seem's better
        // (--) -> (-+)
        // (0-) -> (-0)
        // (+-) -> (--)
        // (+0) -> (0-)
        // (++) -> (+-)
        // (0+) -> (0+)
        // (-+) -> (++)
        // (-0) -> (0+)
        // ...
        const newX: number = this.x + dir.y;
        const newY: number = this.y + -dir.x; // (this.x, thix.y) + (dir.y, -dir.x)
        return new Coord(newX, newY);
    }

    public getRight(dir: Vector): Coord {
        // looking in the direction "dir", we just go one step right
        // see getLeft's logic, it's the opposite
        const newX: number = this.x + -dir.y;
        const newY: number = this.y + dir.x; // (this.x, thix.y) + (-dir.y, dir.x)
        return new Coord(newX, newY);
    }

    public isInRange(sizeX: number, sizeY: number): boolean {
        if (this.x < 0) {
            return false;
        }
        if (this.y < 0) {
            return false;
        }
        if (sizeX <= this.x) {
            return false;
        }
        if (sizeY <= this.y) {
            return false;
        }
        return true;
    }

    public isNotInRange(sizeX: number, sizeY: number): boolean {
        if (this.x < 0) {
            return true;
        }
        if (this.y < 0) {
            return true;
        }
        if (sizeX <= this.x) {
            return true;
        }
        if (sizeY <= this.y) {
            return true;
        }
        return false;
    }

    public getDirectionToward(c: Coord): MGPFallible<Ordinal> {
        return Ordinal.factory.fromMove(this, c);
    }

    public getOrthogonalDistance(c: Coord): number {
        return Math.abs(this.x - c.x) + Math.abs(this.y - c.y);
    }

    public getLinearDistanceToward(c: Coord): number {
        return this.getDistanceToward(c, true);
    }

    // If asked not to check alignment, a knight move would count as 2
    public getDistanceToward(c: Coord, checkAlignment: boolean = false): number {
        Utils.assert(checkAlignment === false || c.isAlignedWith(this),
                     'Cannot calculate distance with non aligned coords.');
        const dx: number = Math.abs(c.x - this.x);
        const dy: number = Math.abs(c.y - this.y);
        return Math.max(dx, dy);
    }

    public isHexagonallyAlignedWith(coord: Coord): boolean {
        const sdx: number = this.x - coord.x;
        const sdy: number = this.y - coord.y;
        if (sdx === sdy) return false;
        if (sdx === -sdy) return true;
        if (sdx * sdy === 0) return true;
        return false;
    }

    public isAlignedWith(coord: Coord): boolean {
        const dx: number = Math.abs(this.x - coord.x);
        const dy: number = Math.abs(this.y - coord.y);
        if (dx === dy) return true;
        if (dx * dy === 0) return true;
        return false;
    }

    public isNeighborWith(coord: Coord): boolean {
        if (this.isAlignedWith(coord)) {
            return this.getLinearDistanceToward(coord) === 1;
        } else {
            return false;
        }
    }

    public getVectorToward(c: Coord): Vector {
        const dx: number = c.x - this.x;
        const dy: number = c.y - this.y;
        return new Vector(dx, dy);
    }

    public toVector(): Vector {
        return new Vector(this.x, this.y);
    }

    public getCoordsToward(c: Coord, includeStart: boolean = false, includeEnd: boolean = false): Coord[] {
        Utils.assert(c.isAlignedWith(this), 'Should only call getCoordsTowards on aligned coords');
        if (this.equals(c)) {
            if (includeStart) {
                return [c];
            } else {
                return [];
            }
        }
        const dir: Ordinal = this.getDirectionToward(c).get();
        let coord: Coord = this.getNext(dir, 1);
        const coords: Coord[] = [];
        while (coord.equals(c) === false) {
            coords.push(coord);
            coord = coord.getNext(dir, 1);
        }
        if (includeEnd) {
            coords.push(coord);
        }
        return coords;
    }

    // [this, end]
    public getAllCoordsToward(end: Coord): Coord[] {
        return this.getCoordsToward(end, true, true);
    }

    public override equals(obj: Coord): boolean {
        if (this === obj) return true;
        if (obj.x !== this.x) return false;
        return obj.y === this.y;
    }

    public compareTo(c: Coord): number {
        if (c.y === this.y) {
            if (c.x === this.x) {
                return 0;
            }
            return this.x < c.x ? -1 : 1;
        }
        return this.y < c.y ? -1 : 1;
    }

    public toSVGPoint(): string {
        return this.x + ',' + this.y;
    }

    public scale(x: number, y: number): Coord {
        return new Coord(this.x * x, this.y * y);
    }

    /**
     * Ordinal as in both orthogonal and diagonal
     * @returns the list of coord that are considered as neighbor coords, here, the 8 ones
     */
    public getOrdinalNeighbors(): Coord[] {
        return Ordinal.ORDINALS.map((direction: Ordinal) => this.getNext(direction));
    }

}
