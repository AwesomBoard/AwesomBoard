import { Coord } from 'src/app/jscaip/Coord';
import { Encoder, MGPOptional, Utils } from '@everyboard/lib';
import { Move } from 'src/app/jscaip/Move';

type SixMoveFields = [MGPOptional<Coord>, Coord, MGPOptional<Coord>];

export class SixMove extends Move {

    public static encoder: Encoder<SixMove> = Encoder.tuple(
        [MGPOptional.getEncoder(Coord.encoder), Coord.encoder, MGPOptional.getEncoder(Coord.encoder)],
        (move: SixMove): SixMoveFields => [move.start, move.landing, move.keep],
        (fields: SixMoveFields): SixMove => SixMove.of(fields[0], fields[1], fields[2]),
    );

    private static of(start: MGPOptional<Coord>, landing: Coord, keep: MGPOptional<Coord>): SixMove {
        return new SixMove(start, landing, keep);
    }

    public static ofDrop(landing: Coord): SixMove {
        return new SixMove(MGPOptional.empty(), landing, MGPOptional.empty());
    }

    public static ofTranslation(start: Coord, landing: Coord): SixMove {
        return new SixMove(MGPOptional.of(start), landing, MGPOptional.empty());
    }

    public static ofCut(start: Coord, landing: Coord, keep: Coord): SixMove {
        return new SixMove(MGPOptional.of(start), landing, MGPOptional.of(keep));
    }

    private constructor(public readonly start: MGPOptional<Coord>,
                        public readonly landing: Coord,
                        public readonly keep: MGPOptional<Coord>)
    {
        super();
        Utils.assert(start.equalsValue(landing) === false, 'Translation cannot be static!');
        Utils.assert(start.isAbsent() || start.equals(keep) === false,
                     'Cannot keep starting coord, since it will always be empty after move!');
    }

    public isDrop(): boolean {
        return this.start.isAbsent();
    }

    public isCut(): boolean {
        return this.keep.isPresent();
    }

    public override toString(): string {
        if (this.isDrop()) {
            return 'SixMove(' + this.landing.toString() + ')';
        } else if (this.isCut()) {
            return 'SixMove(' + this.start.get().toString() + ' > ' +
                                this.landing + ', keep: ' +
                                this.keep.get().toString() + ')';
        } else {
            return 'SixMove(' + this.start.get().toString() + ' > ' +
                                this.landing + ')';
        }
    }

    public equals(other: SixMove): boolean {
        if (this.landing.equals(other.landing) === false) {
            return false;
        }
        if (this.start.equals(other.start) === false) {
            return false;
        }
        return this.keep.equals(other.keep);
    }

}
