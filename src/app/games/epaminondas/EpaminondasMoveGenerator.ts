import { Coord } from 'src/app/jscaip/Coord';
import { Direction } from 'src/app/jscaip/Direction';
import { Player, PlayerOrNone } from 'src/app/jscaip/Player';
import { EpaminondasMove } from './EpaminondasMove';
import { EpaminondasState } from './EpaminondasState';
import { EpaminondasNode, EpaminondasLegalityInformation, EpaminondasRules, EpaminondasConfig } from './EpaminondasRules';
import { MGPFallible } from 'src/app/utils/MGPFallible';
import { MoveGenerator } from 'src/app/jscaip/AI/AI';
import { MGPOptional } from 'src/app/utils/MGPOptional';

export class EpaminondasMoveGenerator extends MoveGenerator<EpaminondasMove, EpaminondasState, EpaminondasConfig> {

    public override getListMoves(node: EpaminondasNode, _config: MGPOptional<EpaminondasConfig>): EpaminondasMove[] {
        const player: Player = node.gameState.getCurrentPlayer();
        const opponent: Player = node.gameState.getCurrentOpponent();
        const empty: PlayerOrNone = PlayerOrNone.NONE;

        let moves: EpaminondasMove[] = [];
        const state: EpaminondasState = node.gameState;
        for (const coordAndContent of state.getCoordsAndContents()) {
            const firstCoord: Coord = coordAndContent.coord;
            if (coordAndContent.content === player) {
                let move: EpaminondasMove;
                for (const direction of Direction.DIRECTIONS) {
                    let phalanxSize: number = 1;
                    let nextCoord: Coord = firstCoord.getNext(direction, 1);
                    while (state.isOnBoard(nextCoord) &&
                           state.getPieceAt(nextCoord) === player)
                    {
                        phalanxSize += 1;
                        nextCoord = nextCoord.getNext(direction, 1);
                    }
                    let stepSize: number = 1;
                    while (state.isOnBoard(nextCoord) &&
                           stepSize <= phalanxSize &&
                           state.getPieceAt(nextCoord) === empty)
                    {
                        move = new EpaminondasMove(firstCoord.x, firstCoord.y, phalanxSize, stepSize, direction);
                        moves = this.addMove(moves, move, state);
                        stepSize++;
                        nextCoord = nextCoord.getNext(direction, 1);
                    }
                    if (state.isOnBoard(nextCoord) &&
                        stepSize <= phalanxSize &&
                        state.getPieceAt(nextCoord) === opponent)
                    {
                        move = new EpaminondasMove(firstCoord.x, firstCoord.y, phalanxSize, stepSize, direction);
                        moves = this.addMove(moves, move, state);
                    }
                }
            }
        }
        return moves;
    }
    public addMove(moves: EpaminondasMove[],
                   move: EpaminondasMove,
                   state: EpaminondasState)
    : EpaminondasMove[]
    {
        const legality: MGPFallible<EpaminondasLegalityInformation> = EpaminondasRules.isLegal(move, state);
        if (legality.isSuccess()) {
            moves.push(move);
        }
        return moves;
    }
}
