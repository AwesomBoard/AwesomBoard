import { ConnectSixState } from './ConnectSixState';
import { ConnectSixNode } from './ConnectSixRules';
import { ConnectSixMove } from './ConnectSixMove';
import { Coord } from 'src/app/jscaip/Coord';
import { ConnectSixFirstMove } from './ConnectSixMove';
import { ConnectSixDrops } from './ConnectSixMove';
import { MoveGenerator } from 'src/app/jscaip/MGPNode';
import { ArrayUtils } from 'src/app/utils/ArrayUtils';
import { PlayerOrNone } from 'src/app/jscaip/Player';
import { MGPSet } from 'src/app/utils/MGPSet';

export class ConnectSixMoveGenerator extends MoveGenerator<ConnectSixMove, ConnectSixState> {

    public getListMoves(node: ConnectSixNode): ConnectSixMove[] {
        if (node.gameState.turn === 0) {
            return this.getFirstMove();
        } else {
            return this.getListDrops(node);
        }
    }
    private getFirstMove(): ConnectSixFirstMove[] {
        const width: number = ConnectSixState.WIDTH;
        const height: number = ConnectSixState.HEIGHT;
        const cx: number = Math.floor(width/2);
        const cy: number = Math.floor(height/2);
        return [ConnectSixFirstMove.of(new Coord(cx, cy))];
    }
    private getListDrops(node: ConnectSixNode): ConnectSixMove[] {
        const availableFirstCoords: Coord[] = this.getAvailableCoords(node.gameState);
        const moves: ConnectSixDrops[] = [];
        for (const firstCoord of availableFirstCoords) {
            const board: PlayerOrNone[][] = node.gameState.getCopiedBoard();
            board[firstCoord.y][firstCoord.x] = node.gameState.getCurrentPlayer();
            const stateAfterFirstDrops: ConnectSixState = new ConnectSixState(board, node.gameState.turn);
            const availableSecondCoords: Coord[] = this.getAvailableCoords(stateAfterFirstDrops);
            for (const secondCoord of availableSecondCoords) {
                const newMove: ConnectSixDrops = ConnectSixDrops.of(firstCoord, secondCoord);
                moves.push(newMove);
            }
        }
        return new MGPSet(moves).toList(); // Removes duplicates
    }
    private getAvailableCoords(state: ConnectSixState): Coord[] {
        const usefulCoord: boolean[][] = this.getUsefulCoordsMap(state);
        const availableCoords: Coord[] = [];
        for (const coordAndContent of state.getCoordsAndContents()) {
            const coord: Coord = coordAndContent.coord;
            if (usefulCoord[coord.y][coord.x] === true && coordAndContent.content.isPlayer() === false) {
                availableCoords.push(coord);
            }
        }
        return availableCoords;
    }
    /**
     * This function returns a table on which table[y][x] === true only if:
     *     (x, y) is empty but has occupied neighbors
     */
    private getUsefulCoordsMap(state: ConnectSixState): boolean[][] {
        const usefulCoord: boolean[][] = ArrayUtils.createTable(ConnectSixState.WIDTH, ConnectSixState.HEIGHT, false);
        for (const coordAndContent of state.getCoordsAndContents()) {
            if (coordAndContent.content.isPlayer()) {
                this.addNeighboringCoord(usefulCoord, coordAndContent.coord);
            }
        }
        return usefulCoord;
    }
    /**
     * mark the space neighboring coord as "space that have an occupied neighbor"
     * @param usefulCoord a map of the board which each space mapped to true if it has an occupied neighbor
     * @param coord the coord to add to this map
     */
    private addNeighboringCoord(usefulCoord: boolean[][], coord: Coord): void {
        const usefulDistance: number = 1; // At two, it's already too much calculation for the minimax sadly
        const minX: number = Math.max(0, coord.x - usefulDistance);
        const minY: number = Math.max(0, coord.y - usefulDistance);
        const maxX: number = Math.min(ConnectSixState.WIDTH - 1, coord.x + usefulDistance);
        const maxY: number = Math.min(ConnectSixState.HEIGHT - 1, coord.y + usefulDistance);
        for (let y: number = minY; y <= maxY; y++) {
            for (let x: number = minX; x <= maxX; x++) {
                usefulCoord[y][x] = true;
            }
        }
    }
}
