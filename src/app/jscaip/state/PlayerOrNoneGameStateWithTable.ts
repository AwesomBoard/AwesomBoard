import { GameStateWithTable } from './GameStateWithTable';
import { Player, PlayerOrNone } from '../Player';
import { Coord } from '../Coord';

export class PlayerOrNoneGameStateWithTable extends GameStateWithTable<PlayerOrNone> {

    public getPlayerCoordsAndContent(): { coord: Coord, content: Player }[] {
        return this
            .getCoordsAndContents()
            .filter((value: { coord: Coord, content: PlayerOrNone}) => {
                return value.content.isPlayer();
            })
            .map((value: { coord: Coord, content: PlayerOrNone}) => {
                return {
                    coord: value.coord,
                    content: value.content as Player,
                };
            });
    }

    // public isCurrentPlayer(coord: Coord): boolean {
    //     const currentPlayer: Player = this.getCurrentPlayer();
    //     const piece: PlayerOrNone = this.getPieceAt(coord);
    //     return piece.isPlayer() && piece.equals(currentPlayer);
    // }

}
