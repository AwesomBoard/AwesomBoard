import { ArrayUtils, Encoder, MGPOptional, Utils } from '@everyboard/lib';
import { Coord } from './Coord';
import { HexaLine } from './HexaLine';
import { Table } from './TableUtils';

/**
 * This represents a capture in Gipf-like games.
 */
export class GipfCapture {

    public static encoder: Encoder<GipfCapture> = Encoder.tuple(
        [Encoder.list<Coord>(Coord.encoder)],
        (move: GipfCapture): [ReadonlyArray<Coord>] => [move.capturedSpaces],
        (fields: [Coord[]]): GipfCapture => new GipfCapture(fields[0]),
    );

    public static listEncoder: Encoder<ReadonlyArray<GipfCapture>> = Encoder.list(GipfCapture.encoder);

    public readonly capturedSpaces: ReadonlyArray<Coord>;

    public constructor(captured: ReadonlyArray<Coord>) {
        Utils.assert(4 <= captured.length, 'Cannot create a GipfCapture with less than 4 captured pieces');
        Utils.assert(HexaLine.areOnSameLine(captured), 'Cannot create a GipfCapture with pieces that are not on the same line');
        this.capturedSpaces = ArrayUtils.copy(captured).sort((coord1: Coord, coord2: Coord) => {
            if (coord1.x === coord2.x) {
                Utils.assert(coord1.y !== coord2.y, 'Cannot create a GipfCapture with duplicate coords');
                return coord1.y > coord2.y ? 1 : -1;
            } else {
                return coord1.x > coord2.x ? 1 : -1;
            }
        });
        let previous: MGPOptional<Coord> = MGPOptional.empty();
        // Captured coords must be consecutive
        for (const coord of this.capturedSpaces) {
            Utils.assert(previous.isAbsent() || previous.get().getLinearDistanceToward(coord) === 1,
                         'Cannot create a GipfCapture with non-consecutive coords');
            previous = MGPOptional.of(coord);
        }
    }

    public toString(): string {
        let str: string = '';
        for (const coord of this.capturedSpaces) {
            if (str !== '') {
                str += ',';
            }
            str += coord.toString();
        }
        return str;
    }

    public size(): number {
        return this.capturedSpaces.length;
    }

    public forEach(callback: (coord: Coord) => void): void {
        this.capturedSpaces.forEach(callback);
    }

    public contains(coord: Coord): boolean {
        for (const capturedSpace of this.capturedSpaces) {
            if (capturedSpace.equals(coord)) {
                return true;
            }
        }
        return false;
    }

    public intersectsWith(capture: GipfCapture): boolean {
        return this.capturedSpaces.some((coord: Coord) => {
            return capture.contains(coord);
        });
    }

    public getLine(): HexaLine {
        const line: MGPOptional<HexaLine> = HexaLine.fromTwoCoords(this.capturedSpaces[0], this.capturedSpaces[1]);
        // Invariant: all captured pieces are on the same line, hence we can safely call .get()
        return line.get();
    }

    public equals(other: GipfCapture): boolean {
        if (this === other) return true;
        if (this.capturedSpaces.length !== other.capturedSpaces.length) {
            return false;
        }
        for (let i: number = 0; i < this.capturedSpaces.length; i++) {
            if (this.capturedSpaces[i].equals(other.capturedSpaces[i]) === false) {
                return false;
            }
        }
        return true;
    }
}

export class GipfProjectHelper {

    public static getPossibleCaptureCombinationsFromPossibleCaptures(possibleCaptures: GipfCapture[])
    : Table<GipfCapture>
    {
        const intersections: number[][] = GipfProjectHelper.computeIntersections(possibleCaptures);
        let captureCombinations: number[][] = [[]];
        possibleCaptures.forEach((_capture: GipfCapture, index: number) => {
            if (intersections[index].length === 0) {
                // Capture is part of no intersection, we can safely add it to all combinations
                captureCombinations.forEach((combination: number[]) => {
                    combination.push(index);
                });
            } else {
                // Capture is part of intersections. Add it everywhere we can
                // But if it is conflicting with some future index, duplicate when we add it
                const newCombinations: number[][] = [];
                const intersectsWithFutureIndex: boolean = intersections[index].some((c: number) => c > index);
                for (const combination of captureCombinations) {

                    const combinationIntersectsWithIndex: boolean = combination.some((c: number) => {
                        return intersections[index].some((c2: number) => c === c2);
                    });
                    if (combinationIntersectsWithIndex) {
                        // Don't add it if there is an intersection
                        newCombinations.push(ArrayUtils.copy(combination));
                    } else if (intersectsWithFutureIndex) {
                        // duplicate before adding index to a combination where there is no intersection
                        newCombinations.push(ArrayUtils.copy(combination));
                        combination.push(index);
                        newCombinations.push(ArrayUtils.copy(combination));
                    } else {
                        // No intersection whatsoever, add the capture
                        combination.push(index);
                        newCombinations.push(ArrayUtils.copy(combination));
                    }
                }
                captureCombinations = newCombinations;
            }
        });
        return captureCombinations.map((combination: number[]) => {
            return combination.map((index: number) => {
                return possibleCaptures[index];
            });
        });
    }

    private static computeIntersections(captures: GipfCapture[]): number[][] {
        const intersections: number[][] = [];
        captures.forEach((capture1: GipfCapture, index1: number) => {
            intersections.push([]);
            captures.forEach((capture2: GipfCapture, index2: number) => {
                if (index1 !== index2) {
                    if (capture1.intersectsWith(capture2)) {
                        intersections[index1].push(index2);
                    }
                }
            });
        });
        return intersections;
    }
}
