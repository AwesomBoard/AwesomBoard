import { Coord, CoordFailure } from 'src/app/jscaip/Coord';
import { Ordinal } from 'src/app/jscaip/Ordinal';
import { ArrayUtils, Encoder, MGPFallible, MGPOptional, Utils } from '@everyboard/lib';
import { HexaDirection } from 'src/app/jscaip/HexaDirection';
import { MoveCoord } from 'src/app/jscaip/MoveCoord';

type AbaloneMoveFields = [Coord, HexaDirection, MGPOptional<Coord>];

export class AbaloneMove extends MoveCoord {

    public static encoder: Encoder<AbaloneMove> = Encoder.tuple(
        [Coord.encoder, HexaDirection.encoder, MGPOptional.getEncoder(Coord.encoder)],
        (m: AbaloneMove): AbaloneMoveFields => [m.coord, m.dir, m.lastPiece],
        (fields: AbaloneMoveFields): AbaloneMove => new AbaloneMove(fields[0], fields[1], fields[2]));

    public static ofSingleCoord(coord: Coord, dir: HexaDirection): AbaloneMove {
        Utils.assert(coord.isInRange(9, 9), CoordFailure.OUT_OF_RANGE(coord));
        return new AbaloneMove(coord, dir, MGPOptional.empty());
    }

    public static ofDoubleCoord(first: Coord, second: Coord, dir: HexaDirection): AbaloneMove {
        const coords: Coord[] = [first, second];
        ArrayUtils.sortByDescending(coords, AbaloneMove.sortCoord);
        const direction: Ordinal = coords[1].getDirectionToward(coords[0]).get();
        const hexaDirectionOptional: MGPFallible<HexaDirection> =
            HexaDirection.factory.fromDelta(direction.x, direction.y);
        Utils.assert(hexaDirectionOptional.isSuccess(), 'Invalid direction'); // Should be ensured by component
        const hexaDirection: HexaDirection = hexaDirectionOptional.get();
        if (hexaDirection.equals(dir)) {
            return AbaloneMove.ofSingleCoord(coords[1], dir);
        } else if (hexaDirection.getOpposite().equals(dir)) {
            return AbaloneMove.ofSingleCoord(coords[0], dir);
        }
        return new AbaloneMove(coords[1], dir, MGPOptional.of(coords[0]));
    }

    public static sortCoord(coord: Coord): number {
        return coord.y * 9 + coord.x;
    }

    private constructor(coord: Coord,
                        public dir: HexaDirection,
                        public lastPiece: MGPOptional<Coord>)
    {
        super(coord.x, coord.y);
    }

    public override toString(): string {
        if (this.isSingleCoord()) {
            return 'AbaloneMove(' + this.coord.x + ', ' + this.coord.y + ', ' + this.dir.toString() + ')';
        } else {
            return 'AbaloneMove(' + this.coord.toString() + ' > ' + this.lastPiece.get().toString() + ', ' + this.dir.toString() + ')';
        }
    }

    public isSingleCoord(): boolean {
        return this.lastPiece.isAbsent();
    }

    public override equals(other: AbaloneMove): boolean {
        return other.coord.equals(this.coord) &&
               other.dir.equals(this.dir) &&
               other.lastPiece.equals(this.lastPiece);
    }

    public isTranslation(): boolean {
        return this.lastPiece.isPresent() &&
               this.coord.getDirectionToward(this.lastPiece.get()).get().equals(this.dir) === false;
    }

}
