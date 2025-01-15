import { KamisadoMove } from './KamisadoMove';
import { KamisadoState } from './KamisadoState';
import { KamisadoNode, KamisadoRules } from './KamisadoRules';
import { ArrayUtils, Utils } from '@everyboard/lib';
import { Coord } from 'src/app/jscaip/Coord';
import { Player } from 'src/app/jscaip/Player';
import { KamisadoBoard } from './KamisadoBoard';
import { MoveGenerator } from 'src/app/jscaip/AI/AI';
import { NoConfig } from 'src/app/jscaip/RulesConfigUtil';

export class KamisadoMoveGenerator extends MoveGenerator<KamisadoMove, KamisadoState> {

    public override getListMoves(node: KamisadoNode, _config: NoConfig): KamisadoMove[] {
        const state: KamisadoState = node.gameState;
        const movablePieces: Coord[] = KamisadoRules.getMovablePieces(state);
        if (movablePieces.length === 0) {
            // No move, player can only pass
            // Still these are not called after the game is ended
            Utils.assert(state.alreadyPassed === false, 'getListMovesFromState should not be called once game is ended.');
            return [KamisadoMove.PASS];
        } else {
            const moves: KamisadoMove[] = this.getListMovesFromNonBlockedState(state, movablePieces);
            ArrayUtils.sortByDescending(moves, (move: KamisadoMove): number => move.getDistance());
            return moves;
        }
    }

    private getListMovesFromNonBlockedState(state: KamisadoState, movablePieces: Coord[]): KamisadoMove[] {
        // There are moves, compute them
        const moves: KamisadoMove[] = [];
        const player: Player = state.getCurrentPlayer();
        // Get all the pieces that can play
        for (const startCoord of movablePieces) {
            // For each piece, look at all positions where it can go
            for (const dir of KamisadoRules.playerDirections(player)) {
                // For each direction, create a move of i in that direction
                for (let stepSize: number = 1; stepSize < KamisadoBoard.SIZE; stepSize++) {
                    const endCoord: Coord = startCoord.getNext(dir, stepSize);
                    if (state.isOnBoard(endCoord) && KamisadoBoard.isEmptyAt(state.board, endCoord)) {
                        // Check if the move can be done, and if so,
                        // add the resulting state to the map to be returned
                        const move: KamisadoMove = KamisadoMove.of(startCoord, endCoord);
                        moves.push(move);
                    } else {
                        break;
                    }
                }
            }
        }
        return moves;
    }
}
