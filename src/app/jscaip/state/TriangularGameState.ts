import { MGPOptional } from '@everyboard/lib';

import { Coord } from '../Coord';
import { GameStateWithTable } from './GameStateWithTable';
import { Table } from '../TableUtils';
import { TriangularCheckerBoard } from './TriangularCheckerBoard';
import { FourStatePiece } from '../FourStatePiece';
import { Player } from '../Player';

export abstract class TriangularGameState<T extends NonNullable<unknown>> extends GameStateWithTable<T> {

    public static getEmptyNeighbors<U>(board: Table<U>, coord: Coord, empty: U): Coord[] {
        const neighbors: Coord[] = [];
        for (const neighbor of TriangularCheckerBoard.getNeighbors(coord)) {
            if (neighbor.isInRange(board[0].length, board.length) &&
                (board[neighbor.y][neighbor.x] === empty)) {
                neighbors.push(neighbor);
            }
        }
        return neighbors;
    }

    public getEmptyNeighbors(coord: Coord, empty: T): Coord[] {
        return TriangularGameState.getEmptyNeighbors(this.board, coord, empty);
    }

}

export abstract class FourStatePieceTriangularGameState extends TriangularGameState<FourStatePiece> {

    public hasPieceBelongingTo(coord: Coord, player: Player): boolean {
        const optional: MGPOptional<FourStatePiece> = this.getOptionalPieceAt(coord);
        if (optional.isPresent()) {
            return optional.get().is(player);
        } else {
            return false;
        }
    }

}
