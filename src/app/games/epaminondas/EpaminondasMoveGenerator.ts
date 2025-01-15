import { Coord } from 'src/app/jscaip/Coord';
import { Ordinal } from 'src/app/jscaip/Ordinal';
import { Player, PlayerOrNone } from 'src/app/jscaip/Player';
import { EpaminondasMove } from './EpaminondasMove';
import { EpaminondasState } from './EpaminondasState';
import { EpaminondasNode, EpaminondasLegalityInformation, EpaminondasRules, EpaminondasConfig } from './EpaminondasRules';
import { MGPFallible, MGPOptional } from '@everyboard/lib';
import { MoveGenerator } from 'src/app/jscaip/AI/AI';

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
                for (const direction of Ordinal.ORDINALS) {
                    let phalanxSize: number = 1;
                    let nextCoord: Coord = firstCoord.getNext(direction, 1);
                    while (state.hasPieceAt(nextCoord, player)) {
                        phalanxSize += 1;
                        nextCoord = nextCoord.getNext(direction, 1);
                    }
                    let stepSize: number = 1;
                    while (stepSize <= phalanxSize && state.hasPieceAt(nextCoord, empty)) {
                        const move: EpaminondasMove =
                            new EpaminondasMove(firstCoord.x, firstCoord.y, phalanxSize, stepSize, direction);
                        moves = this.addMove(moves, move, state);
                        stepSize++;
                        nextCoord = nextCoord.getNext(direction, 1);
                    }
                    if (stepSize <= phalanxSize && state.hasPieceAt(nextCoord, opponent)) {
                        const move: EpaminondasMove =
                            new EpaminondasMove(firstCoord.x, firstCoord.y, phalanxSize, stepSize, direction);
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
