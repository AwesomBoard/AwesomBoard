import { Comparable } from 'lib/dist';
import { Coord } from './Coord';
import { GameStateWithTable } from './GameStateWithTable';
import { Table } from './TableUtils';
import { TriangularCheckerBoard } from './TriangularCheckerBoard';

export abstract class TriangularGameState<T extends NonNullable<Comparable>> extends GameStateWithTable<T> {

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
