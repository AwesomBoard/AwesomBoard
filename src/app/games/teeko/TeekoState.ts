import { PlayerOrNoneGameStateWithTable } from 'src/app/jscaip/state/PlayerOrNoneGameStateWithTable';

export class TeekoState extends PlayerOrNoneGameStateWithTable {

    public static readonly WIDTH: number = 5;

    public isInDropPhase(): boolean {
        return this.turn < 8;
    }

}
