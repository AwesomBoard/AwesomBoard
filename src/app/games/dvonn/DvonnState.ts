import { MGPOptional } from '@everyboard/lib';

import { Coord } from 'src/app/jscaip/Coord';
import { HexagonalGameState } from 'src/app/jscaip/state/HexagonalGameState';
import { Table, TableUtils } from 'src/app/jscaip/TableUtils';
import { DvonnPieceStack } from './DvonnPieceStack';
import { HexagonalUtils } from 'src/app/jscaip/HexagonalUtils';

export class DvonnState extends HexagonalGameState<DvonnPieceStack> {

    public static WIDTH: number = 11;
    public static HEIGHT: number = 5;
    public static EXCLUDED_SPACES: ReadonlyArray<number> = [2, 1];

    /* Returns the following board:
     *     W B B B W W B D B
     *    B B W W W B B W B B
     *   B B B B W D B W W W W
     *    W W B W W B B B W W
     *     W D W B B W W W B
     */
    public static balancedBoard(): Table<DvonnPieceStack> {
        const _: DvonnPieceStack = DvonnPieceStack.UNREACHABLE;
        const W: DvonnPieceStack = DvonnPieceStack.PLAYER_ZERO;
        const B: DvonnPieceStack = DvonnPieceStack.PLAYER_ONE;
        const D: DvonnPieceStack = DvonnPieceStack.SOURCE;
        return [
            [_, _, W, B, B, B, W, W, B, D, B],
            [_, B, B, W, W, W, B, B, W, B, B],
            [B, B, B, B, W, D, B, W, W, W, W],
            [W, W, B, W, W, B, B, B, W, W, _],
            [W, D, W, B, B, W, W, W, B, _, _],
        ];
    }

    public static isOnBoard(coord: Coord): boolean {
        if (coord.isNotInRange(DvonnState.WIDTH, DvonnState.HEIGHT)) {
            return false;
        }
        return DvonnState.balancedBoard()[coord.y][coord.x] !== DvonnPieceStack.UNREACHABLE;
    }

    public static isNotOnBoard(coord: Coord): boolean {
        return DvonnState.isOnBoard(coord) === false;
    }

    public constructor(board: Table<DvonnPieceStack>,
                       turn: number,
                       // Did a PASS move have been performed on the last turn?
                       public readonly alreadyPassed: boolean)
    {
        super(turn, board, DvonnState.WIDTH, DvonnState.HEIGHT, DvonnState.EXCLUDED_SPACES, DvonnPieceStack.EMPTY);
    }

    public getAllPieces(): Coord[] {
        const pieces: Coord[] = [];
        for (let y: number = 0; y < DvonnState.HEIGHT; y++) {
            for (let x: number = 0; x < DvonnState.WIDTH; x++) {
                const coord: Coord = new Coord(x, y);
                if (this.coordHasPieces(coord)) {
                    pieces.push(coord);
                }
            }
        }
        return pieces;
    }

    public numberOfNeighbors(coord: Coord): number {
        const neighbors: Coord[] = HexagonalUtils.getNeighbors(coord, 1);
        const occupiedNeighbors: Coord[] = neighbors.filter((c: Coord): boolean =>
            this.coordHasPieces(c));
        return occupiedNeighbors.length;
    }

    public override setAtUnsafe(coord: Coord, value: DvonnPieceStack): this {
        const newBoard: DvonnPieceStack[][] = TableUtils.copy(this.board);
        newBoard[coord.y][coord.x] = value;
        return new DvonnState(newBoard, this.turn, this.alreadyPassed) as this;
    }

    public override isOnBoard(coord: Coord): boolean {
        if (coord.isNotInRange(this.width, this.height)) {
            return false;
        } else {
            return this.getUnsafe(coord) !== DvonnPieceStack.UNREACHABLE;
        }
    }

    public coordHasPieces(coord: Coord): boolean {
        const optional: MGPOptional<DvonnPieceStack> = this.getOptionalPieceAt(coord);
        if (optional.isPresent()) {
            return optional.get().hasPieces();
        } else {
            return false;
        }
    }

}
