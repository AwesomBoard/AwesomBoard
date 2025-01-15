/* eslint-disable max-lines-per-function */
import { Table, TableUtils } from 'src/app/jscaip/TableUtils';
import { Coord } from '../../Coord';
import { HexagonalGameState } from '../HexagonalGameState';
import { HexaLine } from '../../HexaLine';
import { ErrorLoggerServiceMock } from 'src/app/services/tests/ErrorLoggerServiceMock.spec';
import { JSONValue, Utils } from '@everyboard/lib';

export class TestingHexagonalState extends HexagonalGameState<number> {

    public static readonly UNREACHABLE: number = -1;

    public static empty(width: number,
                        height: number,
                        excludedSpaces: ReadonlyArray<number>,
                        empty: number)
    : TestingHexagonalState
    {
        const newBoard: number[][] = TableUtils.create(width, height, empty);
        let y: number = 0;
        for (const excluded of excludedSpaces) {
            for (let i: number = 0; i < excluded; i++) {
                newBoard[y][i] = TestingHexagonalState.UNREACHABLE;
                newBoard[height - (y + 1)][width - (i + 1)] = TestingHexagonalState.UNREACHABLE;
            }
            y++;
        }
        return new TestingHexagonalState(0, newBoard, width, height, excludedSpaces, empty);
    }

    public static fromTable(turn: number,
                            table: Table<number>,
                            excludedSpaces: ReadonlyArray<number>,
                            empty: number)
    : TestingHexagonalState
    {
        const height: number = table.length;
        if (height === 0) {
            throw new Error('Cannot create a HexaBoard from an empty table.');
        }
        const width: number = table[0].length;
        return new TestingHexagonalState(turn, table, width, height, excludedSpaces, empty);
    }

    public constructor(turn: number,
                       board: Table<number>,
                       width: number,
                       height: number,
                       excludedSpaces: ReadonlyArray<number>,
                       empty: number)
    {
        super(turn, board, width, height, excludedSpaces, empty);
        if ((this.height / 2) + 1 <= this.excludedSpaces.length) {
            throw new Error('Invalid excluded spaces specification for HexaBoard.');
        }
    }

    public override setAtUnsafe(coord: Coord, value: number): this {
        const newBoard: number[][] = TableUtils.copy(this.board);
        newBoard[coord.y][coord.x] = value;
        return new TestingHexagonalState(this.turn,
                                         newBoard,
                                         this.width,
                                         this.height,
                                         this.excludedSpaces,
                                         this.empty) as this;
    }

    public override isOnBoard(coord: Coord): boolean {
        if (coord.isNotInRange(this.width, this.height)) {
            return false;
        } else {
            return this.getUnsafe(coord) !== TestingHexagonalState.UNREACHABLE;
        }
    }

    public numCompare(x: number, y: number): boolean {
        return x === y;
    }

    public equals(other: TestingHexagonalState): boolean {
        return this.equalsT(other, this.numCompare);
    }

}

describe('HexagonalGameState', () => {

    describe('equals', () => {

        it('should consider a board equal to itself', () => {
            const state: TestingHexagonalState = TestingHexagonalState.empty(7, 7, [3, 2, 1], 0);
            expect(state.equals(state)).toBeTrue();
        });

        it('should consider two boards equal when everything matches', () => {
            const board: TestingHexagonalState = TestingHexagonalState.empty(3, 3, [1], 0);
            const sameBoard: TestingHexagonalState = TestingHexagonalState.empty(3, 3, [1], 0);
            expect(board.equals(sameBoard)).toBeTrue();
        });

        it('should distinguish different boards due to different contents', () => {
            const state: TestingHexagonalState = TestingHexagonalState.empty(7, 7, [3, 2, 1], 0);
            const otherState: TestingHexagonalState = state.setAt(new Coord(4, 4), 73);
            expect(state.equals(otherState)).toBeFalse();
        });

        it('should distinguish different boards due to different width', () => {
            const board: TestingHexagonalState = TestingHexagonalState.empty(3, 3, [1], 0);
            const otherBoard: TestingHexagonalState = TestingHexagonalState.empty(5, 3, [1], 0);
            expect(board.equals(otherBoard)).toBeFalse();
        });

        it('should distinguish different boards due to different height', () => {
            const board: TestingHexagonalState = TestingHexagonalState.empty(3, 3, [1], 0);
            const otherBoard: TestingHexagonalState = TestingHexagonalState.empty(3, 5, [1], 0);
            expect(board.equals(otherBoard)).toBeFalse();
        });

        it('should distinguish different boards due to different empty coords', () => {
            const board: TestingHexagonalState = TestingHexagonalState.empty(3, 3, [1], 0);
            const otherBoard: TestingHexagonalState = TestingHexagonalState.empty(3, 3, [1], 1);
            expect(board.equals(otherBoard)).toBeFalse();
        });

        it('should distinguish different boards due to different excluded spaces', () => {
            const board: TestingHexagonalState = TestingHexagonalState.empty(3, 3, [1], 0);
            const otherBoard: TestingHexagonalState = TestingHexagonalState.empty(3, 3, [2], 0);
            const yetAnotherBoard: TestingHexagonalState = TestingHexagonalState.empty(3, 3, [1, 2], 0);
            expect(board.equals(otherBoard)).toBeFalse();
            expect(board.equals(yetAnotherBoard)).toBeFalse();
        });

    });

    describe('getPieceAt', () => {

        it('should fail when accessing coords not on board', () => {
            const state: TestingHexagonalState = TestingHexagonalState.empty(7, 7, [3, 2, 1], 0);
            spyOn(state, 'isOnBoard').and.returnValue(false);
            expect(() => state.getPieceAtXY(0, 0)).toThrow();
        });

        it('should return the right content', () => {
            const state: TestingHexagonalState = TestingHexagonalState.fromTable(1, [[0, 1, 0]], [], 0);
            expect(state.getPieceAtXY(1, 0)).toBe(1);
        });

    });

    describe('setAt', () => {

        it('should fail when setting a coord not on board', () => {
            const state: TestingHexagonalState = TestingHexagonalState.empty(7, 7, [3, 2, 1], 0);
            expect(() => state.setAt(new Coord(10, 5), 5)).toThrow();
        });

        it('should return updated board upon update', () => {
            const state: TestingHexagonalState = TestingHexagonalState.empty(7, 7, [3, 2, 1], 0);
            const coord: Coord = new Coord(4, 3);
            const updatedState: TestingHexagonalState = state.setAt(coord, 42);
            expect(updatedState.getPieceAt(coord)).toEqual(42);
        });

    });

    describe('forEachCoord', () => {

        it('should iterate over coords with forEachCoord', () => {
            const state: TestingHexagonalState = TestingHexagonalState.empty(7, 7, [3, 2, 1], 0);
            let count: number = 0;
            state.forEachCoord((_coord: Coord, _content: number) => {
                count += 1;
            });
            expect(count).toEqual(37);
        });

    });

    describe('allLines', () => {

        it('should contain 21 different lines', () => {
            const state: TestingHexagonalState = TestingHexagonalState.empty(7, 7, [3, 2, 1], 0);
            const lines: ReadonlyArray<HexaLine> = state.allLines();
            expect(lines.length).toEqual(21);
            for (const line1 of lines) {
                let eq: number = 0;
                for (const line2 of lines) {
                    if (line1.equals(line2)) {
                        eq += 1;
                    }
                }
                // Line should be unique
                expect(eq).toEqual(1);
            }
        });

    });

    describe('getEntrance', () => {

        it('should return the correct entrance for lines with a constant q', () => {
            const state: TestingHexagonalState = TestingHexagonalState.empty(7, 7, [3, 2, 1], 0);
            const line: HexaLine = HexaLine.constantQ(0);
            expect(state.getEntranceOnLine(line).equals(new Coord(0, 3))).toBeTrue();

            const otherLine: HexaLine = HexaLine.constantQ(4);
            expect(state.getEntranceOnLine(otherLine).equals(new Coord(4, 0))).toBeTrue();
        });

        it('should return the correct entrance for lines with a constant r', () => {
            const state: TestingHexagonalState = TestingHexagonalState.empty(7, 7, [3, 2, 1], 0);
            const line: HexaLine = HexaLine.constantR(2);
            expect(state.getEntranceOnLine(line).equals(new Coord(1, 2))).toBeTrue();

            const otherLine: HexaLine = HexaLine.constantR(4);
            expect(state.getEntranceOnLine(otherLine).equals(new Coord(0, 4))).toBeTrue();
        });

        it('should return the correct entrance for lines with a constant s', () => {
            const state: TestingHexagonalState = TestingHexagonalState.empty(7, 7, [3, 2, 1], 0);
            // Given a line
            const line: HexaLine = HexaLine.constantS(4);
            // When computing the entrance
            const entrance: Coord = state.getEntranceOnLine(line);
            // Then it should provide the expected entrance
            expect(entrance.equals(new Coord(4, 0))).toBeTrue();

            // Given another line
            const otherLine: HexaLine = HexaLine.constantS(8);
            // When computing the entrance
            const otherEntrance: Coord = state.getEntranceOnLine(otherLine);
            // Then it should provide the expected entrance
            expect(otherEntrance.equals(new Coord(6, 2))).toBeTrue();
        });

        it('should call logError and throw when unable to find an entrance', () => {
            spyOn(Utils, 'logError').and.callFake(ErrorLoggerServiceMock.logError);
            // Given an invalid hexagonal state, where no entrance can be found
            const invalidState: TestingHexagonalState = TestingHexagonalState.empty(0, 0, [], 0);

            // When looking for an entrance
            // Then it calls logError and throws
            const line: HexaLine = HexaLine.constantS(0);
            const component: string = 'HexagonalGameState.findEntranceFrom';
            const error: string = 'could not find a board entrance, board must be invalid';
            const data: JSONValue = { start: '(-1, 1)', line: line.toString() };
            expect(() => invalidState.getEntranceOnLine(line)).toThrowError(component + ': ' + error);
            expect(Utils.logError).toHaveBeenCalledWith(component, error, data);
        });

    });

});
