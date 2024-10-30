import { ArrayUtils, Comparable, MGPMap, MGPOptional, Utils } from '@everyboard/lib';
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

    public static equals<T extends Comparable>(t1: Table<T>, t2: Table<T>): boolean {
        if (t1.length !== t2.length) return false;
        for (let i: number = 0; i < t1.length; i++) {
            if (ArrayUtils.equals(t1[i], t2[i]) === false) return false;
        }
        return true;
    }

    public static sum(board: Table<number>): number {
        let sum: number = 0;
        for (const line of board) {
            for (const element of line) {
                sum += element;
            }
        }
        return sum;
    }

    public static add(left: Table<number>, right: Table<number>): number[][] {
        const width: number = left[0].length;
        const height: number = left.length;
        Utils.assert(height === right.length, 'Table should have same height');
        Utils.assert(width === right[0].length, 'Table should have same width (left.length: ' + width + ', right.length: ' + right[0].length +')');
        const sum: number[][] = TableUtils.create(width, height, 0);
        for (let y: number = 0; y < height; y++) {
            for (let x: number = 0; x < width; x++) {
                sum[y][x] = left[y][x] + right[y][x];
            }
        }
        return sum;
    }

    public static contains<T>(table: Table<T>, element: T): boolean {
        for (const array of table) {
            if (ArrayUtils.contains(array, element)) {
                return true;
            }
        }
        return false;
    }

    public static count<T>(table: Table<T>, element: T): number {
        let total: number = 0;
        for (const array of table) {
            total += ArrayUtils.count(array, element);
        }
        return total;
    }

    /**
     * Return the column of the leftmost match in each line of this table
     */
    public static getLeftmostMatchColumn<T>(table: Table<T>, predicate: (element: T) => boolean): MGPOptional<number> {
        const width: number = table[0].length;
        const height: number = table.length;
        for (let x: number = 0; x < width; x++) {
            for (let y: number = 0; y < height; y++) {
                if (predicate(table[y][x])) {
                    return MGPOptional.of(x);
                }
            }
        }
        return MGPOptional.empty();
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
