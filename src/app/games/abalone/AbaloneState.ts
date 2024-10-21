import { Coord } from 'src/app/jscaip/Coord';
import { FourStatePiece } from 'src/app/jscaip/FourStatePiece';
import { GameStateWithTable } from 'src/app/jscaip/state/GameStateWithTable';
import { AbaloneRules } from './AbaloneRules';
import { PlayerNumberMap } from 'src/app/jscaip/PlayerMap';
import { PlayerOrNone } from 'src/app/jscaip/Player';

export class AbaloneState extends GameStateWithTable<FourStatePiece> {

    public override isOnBoard(coord: Coord): boolean {
        return super.isOnBoard(coord) &&
               AbaloneRules.get().getInitialState().getPieceAt(coord) !== FourStatePiece.UNREACHABLE;
    }

    public isPiece(coord: Coord): boolean {
        const piece: FourStatePiece = this.getPieceAt(coord);
        return piece.isPlayer();
    }

    public getScores(): PlayerNumberMap {
        const scores: PlayerNumberMap = PlayerNumberMap.of(14, 14);
        for (const coordAndContent of this.getCoordsAndContents()) {
            const owner: PlayerOrNone = coordAndContent.content.getPlayer();
            if (owner.isPlayer()) {
                scores.add(owner.getOpponent(), -1);
            }
        }
        return scores;
    }
}
