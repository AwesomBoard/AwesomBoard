import { Coord } from 'src/app/jscaip/Coord';
import { PlayerOrNoneGameStateWithTable } from 'src/app/jscaip/state/PlayerOrNoneGameStateWithTable';

export class TeekoState extends PlayerOrNoneGameStateWithTable {

    public static readonly WIDTH: number = 5;

    public static isOnBoard(coord: Coord): boolean {
        return coord.isInRange(TeekoState.WIDTH, TeekoState.WIDTH);
    }

    public static isNotOnBoard(coord: Coord): boolean {
        return TeekoState.isOnBoard(coord) === false;
    }

    public isInDropPhase(): boolean {
        return this.turn < 8;
    }
}
