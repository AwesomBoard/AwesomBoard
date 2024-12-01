import { MGPOptional, Set } from '@everyboard/lib';

import { HexodiaState } from './HexodiaState';
import { HexodiaConfig, HexodiaNode } from './HexodiaRules';
import { HexodiaMove } from './HexodiaMove';
import { Coord } from 'src/app/jscaip/Coord';
import { TableUtils } from 'src/app/jscaip/TableUtils';
import { MoveGenerator } from 'src/app/jscaip/AI/AI';
import { FourStatePiece } from 'src/app/jscaip/FourStatePiece';

export class HexodiaMoveGenerator extends MoveGenerator<HexodiaMove, HexodiaState, HexodiaConfig> {

    public override getListMoves(node: HexodiaNode, _config: MGPOptional<HexodiaConfig>): HexodiaMove[] {
        if (node.gameState.turn === 0) {
            return this.getFirstMove(node.gameState);
        } else {
            return this.getListDrops(node);
        }
    }

    private getFirstMove(state: HexodiaState): HexodiaMove[] {
        const width: number = state.getWidth();
        const height: number = state.getHeight();
        const cx: number = Math.floor(width / 2);
        const cy: number = Math.floor(height / 2);
        const center: Coord = new Coord(cx, cy);
        return [
            HexodiaMove.of([center]),
        ];
    }

    private getListDrops(node: HexodiaNode): HexodiaMove[] {
        const availableFirstCoords: Coord[] = this.getAvailableCoords(node.gameState);
        const moves: HexodiaMove[] = [];
        for (const firstCoord of availableFirstCoords) {
            const board: FourStatePiece[][] = node.gameState.getCopiedBoard();
            board[firstCoord.y][firstCoord.x] = FourStatePiece.ofPlayer(node.gameState.getCurrentPlayer());
            const stateAfterFirstDrops: HexodiaState =
                new HexodiaState(board, node.gameState.turn);
            const availableSecondCoords: Coord[] = this.getAvailableCoords(stateAfterFirstDrops);
            for (const secondCoord of availableSecondCoords) {
                const newMove: HexodiaMove = HexodiaMove.of([firstCoord, secondCoord]);
                moves.push(newMove);
            }
        }
        return new Set(moves).toList(); // Removes duplicates
    }

    private getAvailableCoords(state: HexodiaState): Coord[] {
        const usefulCoordTable: boolean[][] = this.getUsefulCoordsTable(state);
        const availableCoords: Coord[] = [];
        for (const coordAndContent of state.getCoordsAndContents()) {
            const coord: Coord = coordAndContent.coord;
            if (usefulCoordTable[coord.y][coord.x] === true && coordAndContent.content === FourStatePiece.EMPTY) {
                availableCoords.push(coord);
            }
        }
        return availableCoords;
    }

    /**
     * This function returns a table on which table[y][x] === true only if:
     *     (x, y) is empty but has occupied neighbors
     */
    private getUsefulCoordsTable(state: HexodiaState): boolean[][] {
        const width: number = state.getWidth();
        const height: number = state.getHeight();
        const usefulCoordTable: boolean[][] = TableUtils.create(width, height, false);
        for (const coordAndContent of state.getPlayerCoordsAndContent()) {
            this.addNeighboringCoord(usefulCoordTable, coordAndContent.coord);
        }
        return usefulCoordTable;
    }

    /**
     * mark the space neighboring coord as "space that have an occupied neighbor"
     * @param usefulCoordTable a map of the board which each space mapped to true if it has an occupied neighbor
     * @param coord the coord to add to this map
     */
    private addNeighboringCoord(usefulCoordTable: boolean[][], coord: Coord): void {
        const maxPossibleX: number = usefulCoordTable[0].length - 1;
        const maxPossibleY: number = usefulCoordTable.length - 1;
        //  The magical value  "1" after this line is used to make the generator only include neighboring coord
        // Modifying it to 2 could make it include furter moves
        const minX: number = Math.max(0, coord.x - 1);
        const minY: number = Math.max(0, coord.y - 1);
        const maxX: number = Math.min(maxPossibleX, coord.x + 1);
        const maxY: number = Math.min(maxPossibleY, coord.y + 1);
        for (let y: number = minY; y <= maxY; y++) {
            for (let x: number = minX; x <= maxX; x++) {
                usefulCoordTable[y][x] = true;
            }
        }
    }

}
