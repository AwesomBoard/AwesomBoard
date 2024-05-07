import { ConnectSixState } from './ConnectSixState';
import { ConnectSixNode } from './ConnectSixRules';
import { ConnectSixMove } from './ConnectSixMove';
import { Coord } from 'src/app/jscaip/Coord';
import { ConnectSixFirstMove } from './ConnectSixMove';
import { ConnectSixDrops } from './ConnectSixMove';
import { TableUtils } from 'src/app/jscaip/TableUtils';
import { PlayerOrNone } from 'src/app/jscaip/Player';
import { MGPOptional, MGPSet } from '@everyboard/lib';
import { GobanConfig } from 'src/app/jscaip/GobanConfig';
import { MoveGenerator } from 'src/app/jscaip/AI/AI';

export class ConnectSixMoveGenerator extends MoveGenerator<ConnectSixMove, ConnectSixState, GobanConfig> {

    public override getListMoves(node: ConnectSixNode, _config: MGPOptional<GobanConfig>): ConnectSixMove[] {
        if (node.gameState.turn === 0) {
            return this.getFirstMove(node.gameState);
        } else {
            return this.getListDrops(node);
        }
    }

    private getFirstMove(state: ConnectSixState): ConnectSixFirstMove[] {
        const width: number = state.getWidth();
        const height: number = state.getHeight();
        const cx: number = Math.floor(width / 2);
        const cy: number = Math.floor(height / 2);
        const center: Coord = new Coord(cx, cy);
        return [
            ConnectSixFirstMove.of(center),
        ];
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
        const width: number = state.getWidth();
        const height: number = state.getHeight();
        const usefulCoord: boolean[][] = TableUtils.create(width, height, false);
        for (const coordAndContent of state.getPlayerCoordsAndContent()) {
            this.addNeighboringCoord(usefulCoord, coordAndContent.coord);
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
        const width: number = usefulCoord[0].length;
        const height: number = usefulCoord.length;
        const minX: number = Math.max(0, coord.x - usefulDistance);
        const minY: number = Math.max(0, coord.y - usefulDistance);
        const maxX: number = Math.min(width - 1, coord.x + usefulDistance);
        const maxY: number = Math.min(height - 1, coord.y + usefulDistance);
        for (let y: number = minY; y <= maxY; y++) {
            for (let x: number = minX; x <= maxX; x++) {
                usefulCoord[y][x] = true;
            }
        }
    }
}
