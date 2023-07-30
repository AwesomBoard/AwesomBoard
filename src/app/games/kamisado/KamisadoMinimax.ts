import { KamisadoMove } from './KamisadoMove';
import { KamisadoState } from './KamisadoState';
import { Minimax, PlayerMetricHeuristic } from 'src/app/jscaip/Minimax';
import { KamisadoNode, KamisadoRules } from './KamisadoRules';
import { ArrayUtils } from 'src/app/utils/ArrayUtils';
import { MoveGenerator } from 'src/app/jscaip/MGPNode';
import { Coord } from 'src/app/jscaip/Coord';
import { Player } from 'src/app/jscaip/Player';
import { KamisadoBoard } from './KamisadoBoard';
import { Utils } from 'src/app/utils/utils';

export class KamisadoMoveGenerator extends MoveGenerator<KamisadoMove, KamisadoState> {

    public getListMoves(node: KamisadoNode): KamisadoMove[] {
        const state: KamisadoState = node.gameState;
        const movablePieces: Coord[] = KamisadoRules.getMovablePieces(state);
        if (movablePieces.length === 0) {
            // No move, player can only pass
            // Still these are not called after the game is ended
            Utils.assert(state.alreadyPassed === false, 'getListMovesFromState should not be called once game is ended.');
            return [KamisadoMove.PASS];
        } else {
            const moves: KamisadoMove[] = this.getListMovesFromNonBlockedState(state, movablePieces);
            ArrayUtils.sortByDescending(moves, (move: KamisadoMove): number => move.length());
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

export class KamisadoHeuristic extends PlayerMetricHeuristic<KamisadoMove, KamisadoState> {

    public getMetrics(node: KamisadoNode): [number, number] {
        const state: KamisadoState = node.gameState;
        // Metric is how far a player's piece is from the end line
        const [furthest0, furthest1]: [number, number] = KamisadoRules.getFurthestPiecePositions(state);
        return [7 - furthest0, furthest1];
    }
}

export class KamisadoMinimax extends Minimax<KamisadoMove, KamisadoState> {

    public constructor() {
        super('KamisadoMinimax', KamisadoRules.get(), new KamisadoHeuristic(), new KamisadoMoveGenerator());
    }
}
