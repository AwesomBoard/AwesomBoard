import { Move } from './Move';
import { Coord } from './Coord';
import { MGPFallible, Encoder } from '@everyboard/lib';

export abstract class MoveCoord extends Move {

    public static getFallibleEncoder<T extends MoveCoord>(generate: (coord: Coord) => MGPFallible<T>): Encoder<T> {
        return Encoder.tuple(
            [Coord.encoder],
            (m: T): [Coord] => [m.coord],
            (fields: [Coord]): T => generate(fields[0]).get());
    }
    public static getEncoder<T extends MoveCoord>(generate: (coord: Coord) => T): Encoder<T> {
        return Encoder.tuple(
            [Coord.encoder],
            (m: T): [Coord] => [m.coord],
            (fields: [Coord]): T => generate(fields[0]));
    }
    public readonly coord: Coord;

    public constructor(x: number, y: number) {
        super();
        this.coord = new Coord(x, y);
    }
    public equals(other: this): boolean {
        return this === other || this.coord.equals(other.coord);
    }
}

export class TMPMoveCoord extends MoveCoord {

    public static of(coord: Coord): TMPMoveCoord {
        return new TMPMoveCoord(coord.x, coord.y);
    }

    public override toString(): string {
        return 'TMPMoveCoord(' + this.coord.x + ', ' + this.coord.y + ')';
    }

}
