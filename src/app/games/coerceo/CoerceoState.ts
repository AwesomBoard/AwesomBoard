import { Coord } from 'src/app/jscaip/Coord';
import { Vector } from 'src/app/jscaip/Vector';
import { TriangularGameState } from 'src/app/jscaip/TriangularGameState';
import { TriangularCheckerBoard } from 'src/app/jscaip/TriangularCheckerBoard';
import { Table } from 'src/app/utils/ArrayUtils';
import { Utils } from 'src/app/utils/utils';
import { Debug } from 'src/app/utils/utils';
import { CoerceoRegularMove, CoerceoStep } from './CoerceoMove';
import { FourStatePiece } from 'src/app/jscaip/FourStatePiece';
import { Player } from 'src/app/jscaip/Player';
import { MGPOptional } from 'src/app/utils/MGPOptional';

@Debug.log
export class CoerceoState extends TriangularGameState<FourStatePiece> {

    public static readonly NEIGHBORS_TILES_DIRECTIONS: ReadonlyArray<Vector> = [
        new Vector(+0, -2), // UP
        new Vector(+3, -1), // UP_RIGHT
        new Vector(+3, +1), // DOWN_RIGHT
        new Vector(+0, +2), // DOWN
        new Vector(-3, +1), // DOWN_LEFT
        new Vector(-3, -1), // UP_LEFT
    ];

    public static getTilesUpperLeftCoord(tile: Coord): Coord {
        const x: number = tile.x - (tile.x % 3);
        let y: number = tile.y;
        if (x % 2 === 0) {
            y -= (tile.y) % 2;
        } else {
            y -= (tile.y + 1) % 2;
        }
        return new Coord(x, y);
    }

    public static isOnBoard(coord: Coord): boolean {
        return coord.isInRange(15, 10);
    }

    public static getPresentNeighborEntrances(tileUpperLeft: Coord): Coord[] {
        return [
            new Coord(tileUpperLeft.x + 1, tileUpperLeft.y - 1), // UP
            new Coord(tileUpperLeft.x + 3, tileUpperLeft.y + 0), // UP-RIGHT
            new Coord(tileUpperLeft.x + 3, tileUpperLeft.y + 1), // DOWN-RIGHT
            new Coord(tileUpperLeft.x + 1, tileUpperLeft.y + 2), // DOWN
            new Coord(tileUpperLeft.x - 1, tileUpperLeft.y + 1), // DOWN-LEFT
            new Coord(tileUpperLeft.x - 1, tileUpperLeft.y + 0), // UP-LEFT
        ].filter(CoerceoState.isOnBoard);
    }

    public constructor(board: Table<FourStatePiece>,
                       turn: number,
                       public readonly tiles: readonly [number, number],
                       public readonly captures: readonly [number, number])
    {
        super(board, turn);
    }

    public applyLegalMovement(move: CoerceoRegularMove): CoerceoState {
        const start: Coord = move.getStart();
        const landing: Coord = move.getEnd();
        const newBoard: FourStatePiece[][] = this.getCopiedBoard();
        newBoard[landing.y][landing.x] = FourStatePiece.ofPlayer(this.getCurrentPlayer());
        newBoard[start.y][start.x] = FourStatePiece.EMPTY;

        return new CoerceoState(newBoard, this.turn, this.tiles, this.captures);
    }

    public doMovementCaptures(move: CoerceoRegularMove): CoerceoState {
        const capturedCoords: Coord[] = this.getCapturedNeighbors(move.getEnd());
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        let resultingState: CoerceoState = this;
        for (const captured of capturedCoords) {
            resultingState = resultingState.capture(captured);
        }
        return resultingState;
    }

    public getCapturedNeighbors(coord: Coord): Coord[] {
        const opponent: Player = this.getCurrentOpponent();
        const neighbors: Coord[] = TriangularCheckerBoard.getNeighbors(coord);
        return neighbors.filter((neighbor: Coord) => {
            if (neighbor.isNotInRange(15, 10)) {
                return false;
            }
            if (this.getPieceAt(neighbor).is(opponent)) {
                return this.isSurrounded(neighbor);
            }
            return false;
        });
    }

    public isSurrounded(coord: Coord): boolean {
        const remainingFreedom: Coord[] = this.getEmptyNeighbors(coord, FourStatePiece.EMPTY);
        return remainingFreedom.length === 0;
    }

    public capture(coord: Coord): CoerceoState {
        const newBoard: FourStatePiece[][] = this.getCopiedBoard();
        const newCaptures: [number, number] = [this.captures[0], this.captures[1]];
        newBoard[coord.y][coord.x] = FourStatePiece.EMPTY;
        newCaptures[this.getCurrentPlayer().getValue()] += 1;
        return new CoerceoState(newBoard, this.turn, this.tiles, newCaptures);
    }

    public removeTilesIfNeeded(piece: Coord, countTiles: boolean): CoerceoState {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        let resultingState: CoerceoState = this;
        const currentTile: Coord = CoerceoState.getTilesUpperLeftCoord(piece);
        if (this.isTileEmpty(currentTile) &&
            this.isDeconnectable(currentTile))
        {
            resultingState = this.deconnectTile(currentTile, countTiles);
            const neighbors: Coord[] = CoerceoState.getPresentNeighborEntrances(currentTile);
            for (const neighbor of neighbors) {
                const spaceContent: FourStatePiece = resultingState.getPieceAt(neighbor);
                if (spaceContent === FourStatePiece.EMPTY) {
                    resultingState = resultingState.removeTilesIfNeeded(neighbor, countTiles);
                } else if (spaceContent.is(this.getCurrentOpponent()) &&
                           resultingState.isSurrounded(neighbor))
                {
                    resultingState = resultingState.capture(neighbor);
                }
            }
        }
        return resultingState;
    }

    public isTileEmpty(tileUpperLeft: Coord): boolean {
        Utils.assert(this.getPieceAt(tileUpperLeft) !== FourStatePiece.UNREACHABLE,
                     'Should not call isTileEmpty on removed tile');
        for (let y: number = 0; y < 2; y++) {
            for (let x: number = 0; x < 3; x++) {
                const coord: Coord = tileUpperLeft.getNext(new Vector(x, y), 1);
                if (this.getPieceAt(coord) !== FourStatePiece.EMPTY) {
                    return false;
                }
            }
        }
        return true;
    }

    public isDeconnectable(tile: Coord): boolean {
        const neighborsIndex: number[] = this.getPresentNeighborTilesRelativeIndexes(tile);
        if (neighborsIndex.length > 3) {
            return false;
        }
        let holeCount: number = 0;
        for (let i: number = 1; i < neighborsIndex.length; i++) {
            if (this.areNeighbor(neighborsIndex[i - 1], neighborsIndex[i]) === false) {
                holeCount += 1;
            }
        }
        if (this.areNeighbor(neighborsIndex[0], neighborsIndex[neighborsIndex.length - 1]) === false) {
            holeCount += 1;
        }
        return holeCount <= 1;
    }

    private areNeighbor(smallTileIndex: number, bigTileIndex: number): boolean {
        return smallTileIndex + 1 === bigTileIndex ||
               (smallTileIndex === 0 && bigTileIndex === 5);
    }

    public getPresentNeighborTilesRelativeIndexes(tile: Coord): number[] {
        const neighborsIndexes: number[] = [];
        let firstIndex: MGPOptional<number> = MGPOptional.empty();
        for (let i: number = 0; i < 6; i++) {
            const vector: Vector = CoerceoState.NEIGHBORS_TILES_DIRECTIONS[i];
            const neighborTile: Coord = tile.getNext(vector, 1);
            if (CoerceoState.isOnBoard(neighborTile) &&
                this.getPieceAt(neighborTile) !== FourStatePiece.UNREACHABLE)
            {
                if (firstIndex.isAbsent()) {
                    firstIndex = MGPOptional.of(i);
                }
                neighborsIndexes.push(i - firstIndex.get());
            }
        }
        return neighborsIndexes;
    }

    public deconnectTile(tileUpperLeft: Coord, countTiles: boolean): CoerceoState {
        const newBoard: FourStatePiece[][] = this.getCopiedBoard();
        const x0: number = tileUpperLeft.x;
        const y0: number = tileUpperLeft.y;
        for (let y: number = 0; y < 2; y++) {
            for (let x: number = 0; x < 3; x++) {
                newBoard[y0 + y][x0 + x] = FourStatePiece.UNREACHABLE;
            }
        }
        const newTiles: [number, number] = [this.tiles[0], this.tiles[1]];
        if (countTiles) {
            newTiles[this.getCurrentPlayer().getValue()] += 1;
        }
        return new CoerceoState(newBoard, this.turn, newTiles, this.captures);
    }

    public getLegalLandings(coord: Coord): Coord[] {
        const legalLandings: Coord[] = [];
        for (const step of CoerceoStep.STEPS) {
            const landing: Coord = coord.getNext(step.direction, 1);
            if (this.isOnBoard(landing) && this.getPieceAt(landing) === FourStatePiece.EMPTY) {
                legalLandings.push(landing);
            }
        }
        return legalLandings;
    }

    public getPiecesByFreedom(): number[][] {
        const playersScores: number[][] = [
            [0, 0, 0, 0],
            [0, 0, 0, 0],
        ];
        for (let y: number = 0; y < 10; y++) {
            for (let x: number = 0; x < 15; x++) {
                const piece: FourStatePiece = this.board[y][x];
                if (piece.isPlayer()) {
                    const nbFreedom: number =
                        this.getEmptyNeighbors(new Coord(x, y), FourStatePiece.EMPTY).length;
                    const oldValue: number = playersScores[piece.getValue()][nbFreedom];
                    playersScores[piece.getValue()][nbFreedom] = oldValue + 1;
                }
            }
        }
        return playersScores;
    }
}
