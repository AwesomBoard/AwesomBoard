import { Encoder } from '@everyboard/lib';

import { Coord } from 'src/app/jscaip/Coord';
import { CoordSet } from 'src/app/jscaip/CoordSet';
import { Move } from 'src/app/jscaip/Move';

export class HexodiaMove extends Move {

    public static of(coords: Coord[]): HexodiaMove {
        return new HexodiaMove(new CoordSet(coords));
    }

    public static encoder: Encoder<HexodiaMove> = Encoder.tuple(
        [Encoder.list(Coord.encoder)],
        (move: HexodiaMove) => [move.coords.toList()],
        (value: [Coord[]]) => HexodiaMove.of(value[0]),
    );

    private constructor(public readonly coords: CoordSet) {
        super();
    }

    public override toString(): string {
        return 'HexodiaMove(' + this.coords.toList().map((coord: Coord) => coord.toString()).join(', ') + ')';
    }

    public override equals(other: HexodiaMove): boolean {
        return this.coords.equals(other.coords);
    }

}

