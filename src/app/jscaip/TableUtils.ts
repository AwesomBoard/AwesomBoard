import { ArrayUtils, Comparable, MGPMap, MGPOptional } from '@everyboard/lib';
import { Coord } from './Coord';

export type Table<T> = ReadonlyArray<ReadonlyArray<T>>;

export type NumberTable = Table<number>;

export class TableUtils {

    public static create<T>(width: number, height: number, initValue: T): T[][] {
        const table: Array<Array<T>> = [];
        for (let y: number = 0; y < height; y++) {
            table.push(ArrayUtils.create(width, initValue));
        }
        return table;
    }

    public static map<T, U>(table: Table<T>, fun: (t: T) => U): U[][] {
        return table.map((row: T[]): U[] => row.map(fun));
    }

    public static copy<T>(table: Table<T>): T[][] {
        return TableUtils.map(table, (t: T): T => t);
    }

    public static compare<T extends Comparable>(t1: Table<T>, t2: Table<T>): boolean {
        if (t1.length !== t2.length) return false;
        for (let i: number = 0; i < t1.length; i++) {
            if (ArrayUtils.compare(t1[i], t2[i]) === false) return false;
        }
        return true;
    }

}

export type Cell<T> = {
    x: number,
    y: number,
    content: T,
};

export class TableWithPossibleNegativeIndices<T extends NonNullable<unknown>> {
    // This cannot be represented by an array as it may have negative indices
    // which cannot be iterated over
    protected content: MGPMap<number, MGPMap<number, T>> = new MGPMap();

    public get(coord: Coord): MGPOptional<T> {
        const line: MGPOptional<MGPMap<number, T>> = this.content.get(coord.y);
        if (line.isAbsent()) return MGPOptional.empty();
        return line.get().get(coord.x);
    }

    public set(coord: Coord, value: T): void {
        const lineOpt: MGPOptional<MGPMap<number, T>> = this.content.get(coord.y);
        let line: MGPMap<number, T>;
        if (lineOpt.isPresent()) {
            line = lineOpt.get();
        } else {
            line = new MGPMap<number, T>();
            this.content.set(coord.y, line);
        }
        line.set(coord.x, value);
    }
    [Symbol.iterator](): IterableIterator<Cell<T>> {
        const elements: Cell<T>[] = [];
        const ys: number[] = this.content.getKeySet().toList();
        ys.sort(ArrayUtils.smallerFirst);
        for (const y of ys) {
            const line: MGPMap<number, T> = this.content.get(y).get();
            const xs: number[] = line.getKeySet().toList();
            xs.sort(ArrayUtils.smallerFirst);
            for (const x of xs) {
                const content: T = line.get(x).get();
                elements.push({ x, y, content });
            }
        }
        return elements.values();
    }
}

export class Table3DUtils {

    public static create<T>(depth: number, width: number, height: number, initValue: T): T[][][] {
        const triTable: Array<Array<Array<T>>> = [];
        for (let z: number = 0; z < depth; z++) {
            triTable.push(TableUtils.create(width, height, initValue));
        }
        return triTable;
    }
}
