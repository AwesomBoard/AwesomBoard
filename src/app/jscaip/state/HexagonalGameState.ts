import { Comparable, MGPValidation, Utils } from '@everyboard/lib';
import { Coord } from '../Coord';
import { GameStateWithTable } from '../state/GameStateWithTable';
import { HexaDirection } from '../HexaDirection';
import { HexaLine } from '../HexaLine';
import { Table } from '../TableUtils';

export abstract class HexagonalGameState<P extends NonNullable<Comparable>> extends GameStateWithTable<P> {

    public constructor(turn: number,
                       board: Table<P>,
                       public readonly width: number,
                       public readonly height: number,
                       public readonly excludedSpaces: ReadonlyArray<number>,
                       public readonly empty: P)
    {
        super(board, turn);
        Utils.assert(this.excludedSpaces.length < (this.height / 2) + 1, 'Invalid excluded spaces specification for HexagonalGameState.');
    }

    public abstract setAtUnsafe(coord: Coord, v: P): this;

    public setAt(coord: Coord, v: P): this {
        if (this.isOnBoard(coord)) {
            return this.setAtUnsafe(coord, v);
        } else {
            throw new Error('Setting coord not on board: ' + coord + '.');
        }
    }

    public equalsT(other: HexagonalGameState<P>, equal: (a: P, b: P) => boolean): boolean {
        if (this === other) {
            return true;
        }
        if (this.width !== other.width) {
            return false;
        }
        if (this.height !== other.height) {
            return false;
        }
        if (equal(this.empty, other.empty) === false) {
            return false;
        }
        if (this.excludedSpaces.length !== other.excludedSpaces.length) {
            return false;
        }
        for (let i: number = 0; i < this.excludedSpaces.length; i++) {
            if (this.excludedSpaces[i] !== other.excludedSpaces[i]) {
                return false;
            }
        }
        for (const coord of this.allCoords()) {
            if (equal(this.getPieceAt(coord), other.getPieceAt(coord)) === false) {
                return false;
            }
        }
        return true;
    }

    public allLines(): ReadonlyArray<HexaLine> {
        const lines: HexaLine[] = [];
        for (let i: number = 0; i < this.width; i++) {
            lines.push(HexaLine.constantQ(i));
        }
        for (let i: number = 0; i < this.height; i++) {
            lines.push(HexaLine.constantR(i));
        }
        for (let i: number = this.excludedSpaces.length; i < this.height+this.excludedSpaces.length; i++) {
            lines.push(HexaLine.constantS(i));
        }
        return lines;
    }

    public getEntranceOnLine(line: HexaLine): Coord {
        let x: number;
        let y: number;
        switch (line.constant) {
            case 'q':
                if (this.excludedSpaces[line.offset] != null) {
                    y = this.excludedSpaces[line.offset];
                } else {
                    y = 0;
                }
                return this.findEntranceFrom(line, new Coord(line.offset, y));
            case 'r':
                if (this.excludedSpaces[line.offset] != null) {
                    x = this.excludedSpaces[line.offset];
                } else {
                    x = 0;
                }
                return this.findEntranceFrom(line, new Coord(x, line.offset));
            case 's':
                if (line.offset < this.width) {
                    return this.findEntranceFrom(line, new Coord(line.offset, 0));
                } else {
                    return this.findEntranceFrom(line, new Coord(this.width - 1, line.offset - this.width + 1));
                }
        }
    }

    private findEntranceFrom(line: HexaLine, start: Coord): Coord {
        const dir: HexaDirection = line.getDirection();
        let coord: Coord = start;
        for (let i: number = 0; i < Math.max(this.width, this.height); i++) {
            if (this.isOnBoard(coord)) {
                return coord;
            }
            coord = coord.getNext(dir);
        }
        const failure: MGPValidation =
            Utils.logError('HexagonalGameState.findEntranceFrom',
                           'could not find a board entrance, board must be invalid',
                           { start: start.toString(), line: line.toString() });
        throw new Error(failure.getReason());
    }

}
