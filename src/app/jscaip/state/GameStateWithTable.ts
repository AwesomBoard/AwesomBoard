import { MGPMap, MGPOptional, Utils, comparableEquals } from '@everyboard/lib';
import { Coord } from '../Coord';
import { GameState } from './GameState';
import { Table, TableUtils } from '../TableUtils';
import { CoordSet } from '../CoordSet';

export abstract class GameStateWithTable<P extends NonNullable<unknown>> extends GameState {

    public static setPieceAt<Q extends NonNullable<unknown>, T extends GameStateWithTable<Q>>(
        oldState: T,
        coord: Coord,
        value: Q,
        stateAdapter: (oldState: T, newBoard: Table<Q>) => T)
    : T
    {
        const newBoard: Q[][] = oldState.getCopiedBoard();
        newBoard[coord.y][coord.x] = value;
        return stateAdapter(oldState, newBoard);
    }

    public constructor(public readonly board: Table<P>, turn: number) {
        super(turn);
    }

    public getPieceAt(coord: Coord): P {
        Utils.assert(this.isOnBoard(coord),
                     'Accessing coord not on board ' + coord + '.');
        return this.getUnsafe(coord);
    }

    protected getUnsafe(coord: Coord): P {
        return this.board[coord.y][coord.x];
    }

    public hasPieceAt(coord: Coord, value: P): boolean {
        return this.isOnBoard(coord) &&
               comparableEquals(this.getUnsafe(coord), value);
    }

    public hasInequalPieceAt(coord: Coord, value: P): boolean {
        return this.isOnBoard(coord) &&
               comparableEquals(this.getUnsafe(coord), value) === false;
    }

    public getOptionalPieceAt(coord: Coord): MGPOptional<P> {
        if (this.isOnBoard(coord)) {
            const value: P = this.getUnsafe(coord);
            return MGPOptional.of(value);
        } else {
            return MGPOptional.empty();
        }
    }

    public getOptionalPieceAtXY(x: number, y: number): MGPOptional<P> {
        const coord: Coord = new Coord(x, y);
        return this.getOptionalPieceAt(coord);
    }

    public isOnBoard(coord: Coord): boolean {
        const width: number = this.getWidth();
        const height: number = this.getHeight();
        return coord.isInRange(width, height);
    }

    public isNotOnBoard(coord: Coord): boolean {
        return this.isOnBoard(coord) === false;
    }

    public getPieceAtXY(x: number, y: number): P {
        return this.getPieceAt(new Coord(x, y));
    }

    public forEachCoord(callback: (coord: Coord, content: P) => void): void {
        for (const { coord, content } of this.getCoordsAndContents()) {
            callback(coord, content);
        }
    }

    public findMatchingCoord(premise: (coord: Coord, content: P) => boolean): MGPOptional<Coord> {
        for (const { coord, content } of this.getCoordsAndContents()) {
            const result: boolean = premise(coord, content);
            if (result) {
                return MGPOptional.of(coord);
            }
        }
        return MGPOptional.empty();
    }

    public getCoordsAndContents(): {coord: Coord, content: P}[] {
        const coordsAndContents: {coord: Coord, content: P}[] = [];
        for (let y: number = 0; y < this.getHeight(); y++) {
            for (let x: number = 0; x < this.getWidth(); x++) {
                const coord: Coord = new Coord(x, y);
                if (this.isOnBoard(coord)) { // Could be overriden for unreachable coords
                    coordsAndContents.push({
                        coord,
                        content: this.getPieceAt(coord),
                    });
                }
            }
        }
        return coordsAndContents;
    }

    public allCoords(): Coord[] {
        const coords: Coord[] = [];
        this.forEachCoord((coord: Coord) => {
            coords.push(coord);
        });
        return coords;
    }

    public getCopiedBoard(): P[][] {
        return TableUtils.copy(this.board);
    }

    public toPieceMap(): MGPMap<P, CoordSet> {
        const map: MGPMap<P, CoordSet> = new MGPMap();
        for (const coordAndContent of this.getCoordsAndContents()) {
            const key: P = coordAndContent.content;
            const value: Coord = coordAndContent.coord;
            if (map.containsKey(key)) {
                const oldValue: CoordSet = map.get(key).get();
                map.put(key, oldValue.addElement(value));
            } else {
                map.set(key, new CoordSet([value]));
            }
        }
        return map;
    }

    public getWidth(): number {
        return this.board[0].length;
    }

    public getHeight(): number {
        return this.board.length;
    }

    public isHorizontalEdge(coord: Coord): boolean {
        const maxY: number = this.getHeight() - 1;
        return coord.y === 0 || coord.y === maxY;
    }

    public isVerticalEdge(coord: Coord): boolean {
        const maxX: number = this.getWidth() - 1;
        return coord.x === 0 || coord.x === maxX;
    }

    public isEdge(coord: Coord): boolean {
        return this.isHorizontalEdge(coord) ||
               this.isVerticalEdge(coord);
    }

    public isCorner(coord: Coord): boolean {
        return this.isHorizontalEdge(coord) &&
               this.isVerticalEdge(coord);
    }

    [Symbol.iterator](): IterableIterator<P> {
        const linedUpElements: P[] = [];
        for (const lines of this.board) {
            linedUpElements.push(...lines);
        }
        return linedUpElements.values();
    }

}
