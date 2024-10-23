import { Coord } from 'src/app/jscaip/Coord';
import { FourStatePieceTriangularGameState } from 'src/app/jscaip/state/TriangularGameState';

export class SaharaState extends FourStatePieceTriangularGameState {

    public static HEIGHT: number = 6;

    public static WIDTH: number = 11;

    public static isOnBoard(coord: Coord): boolean {
        return coord.isInRange(SaharaState.WIDTH, SaharaState.HEIGHT);
    }

}
