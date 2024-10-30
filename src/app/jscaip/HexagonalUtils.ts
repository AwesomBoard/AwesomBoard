import { Coord } from './Coord';
import { HexaDirection } from './HexaDirection';
import { TableUtils } from './TableUtils';

export class HexagonalUtils {

    public static getNeighbors(coord: Coord, distance: number = 1): Coord[] {
        const result: Coord[] = [];
        for (const direction of HexaDirection.factory.all) {
            result.push(coord.getNext(direction, distance));
        }
        return result;
    }

    public static areNeighbors(first: Coord, second: Coord): boolean {
        for (const direction of HexaDirection.factory.all) {
            if (first.getNext(direction).equals(second)) {
                return true;
            }
        }
        return false;
    }

    public static createBoard<T>(size: number, empty: T, full: T): T[][] {
        const height: number = 2 * size;
        const width: number = 2 * height;
        const board: T[][] = TableUtils.create(width, height, empty);
        // ADI: ascending diagonal index
        // DDI: descending diagonal index
        const minimalAdi: number = size - (size % 2);
        const maximalAdi: number = minimalAdi + width - 1;
        const minimalDdi: number = size - height + ((size + 1) % 2);
        const maximalDdi: number = width - size - (size % 2);
        for (let x: number = 0; x < width; x++) {
            for (let y: number = 0; y < height; y++) {
                const adi: number = x + y;
                const ddi: number = x - y;
                if (minimalAdi <= adi && adi <= maximalAdi &&
                    minimalDdi <= ddi && ddi <= maximalDdi)
                {
                    board[y][x] = full;
                }
            }
        }
        return board;
    }

}
