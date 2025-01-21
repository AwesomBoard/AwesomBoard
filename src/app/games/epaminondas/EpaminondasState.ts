import { Player } from 'src/app/jscaip/Player';
import { PlayerOrNoneGameStateWithTable } from 'src/app/jscaip/state/PlayerOrNoneGameStateWithTable';

export class EpaminondasState extends PlayerOrNoneGameStateWithTable {

    public doesOwnPiece(player: Player): boolean {
        for (const coordAndContent of this.getCoordsAndContents()) {
            if (coordAndContent.content === player) {
                return true;
            }
        }
        return false;
    }

}
