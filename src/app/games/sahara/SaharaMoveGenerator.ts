import { Player } from 'src/app/jscaip/Player';
import { Coord } from 'src/app/jscaip/Coord';
import { SaharaMove } from './SaharaMove';
import { SaharaState } from './SaharaState';
import { TriangularGameState } from 'src/app/jscaip/state/TriangularGameState';
import { SaharaNode, SaharaRules } from './SaharaRules';
import { FourStatePiece } from 'src/app/jscaip/FourStatePiece';
import { MoveGenerator } from 'src/app/jscaip/AI/AI';
import { NoConfig } from 'src/app/jscaip/RulesConfigUtil';

export class SaharaMoveGenerator extends MoveGenerator<SaharaMove, SaharaState> {

    public override getListMoves(node: SaharaNode, _config: NoConfig): SaharaMove[] {
        const moves: SaharaMove[] = [];
        const board: FourStatePiece[][] = node.gameState.getCopiedBoard();
        const player: Player = node.gameState.getCurrentPlayer();
        const startingCoords: Coord[] = SaharaRules.getStartingCoords(node.gameState, player);
        for (const start of startingCoords) {
            const neighbors: Coord[] =
                TriangularGameState.getEmptyNeighbors(board, start, FourStatePiece.EMPTY);
            for (const neighbor of neighbors) {
                const newMove: SaharaMove = SaharaMove.from(start, neighbor).get();
                board[neighbor.y][neighbor.x] = board[start.y][start.x];
                board[start.y][start.x] = FourStatePiece.EMPTY;
                moves.push(newMove);

                const upwardTriangle: boolean = (neighbor.y + neighbor.x) % 2 === 0;
                if (upwardTriangle) {
                    const farNeighbors: Coord[] =
                        TriangularGameState.getEmptyNeighbors(board, neighbor, FourStatePiece.EMPTY);
                    for (const farNeighbor of farNeighbors) {
                        if (farNeighbor.equals(start) === false) {
                            const farMove: SaharaMove = SaharaMove.from(start, farNeighbor).get();
                            board[farNeighbor.y][farNeighbor.x] = board[neighbor.y][neighbor.x];
                            board[neighbor.y][neighbor.x] = FourStatePiece.EMPTY;
                            moves.push(farMove);

                            board[neighbor.y][neighbor.x] = board[farNeighbor.y][farNeighbor.x];
                            board[farNeighbor.y][farNeighbor.x] = FourStatePiece.EMPTY;
                        }
                    }
                }
                board[start.y][start.x] = board[neighbor.y][neighbor.x];
                board[neighbor.y][neighbor.x] = FourStatePiece.EMPTY;
            }
        }
        return moves;
    }
}
