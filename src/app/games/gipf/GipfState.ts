import { Player } from 'src/app/jscaip/Player';
import { Table, TableUtils } from 'src/app/jscaip/TableUtils';
import { HexagonalGameState } from 'src/app/jscaip/state/HexagonalGameState';
import { Coord } from 'src/app/jscaip/Coord';
import { FourStatePiece } from 'src/app/jscaip/FourStatePiece';
import { PlayerNumberMap } from 'src/app/jscaip/PlayerMap';

export class GipfState extends HexagonalGameState<FourStatePiece> {

    public constructor(board: Table<FourStatePiece>,
                       turn: number,
                       public readonly sidePieces: PlayerNumberMap,
                       public readonly capturedPieces: PlayerNumberMap)
    {
        super(turn, board, 7, 7, [3, 2, 1], FourStatePiece.EMPTY);
    }

    public getScores(): PlayerNumberMap {
        return this.capturedPieces;
    }

    public equals(other: GipfState): boolean {
        if (this.turn !== other.turn) return false;
        if (this.sidePieces.equals(other.sidePieces) === false) return false;
        if (this.capturedPieces.equals(other.capturedPieces) === false) return false;
        return TableUtils.equals(this.board, other.board);
    }

    public getNumberOfPiecesToPlace(player: Player): number {
        return this.sidePieces.get(player);
    }

    public getNumberOfPiecesCaptured(player: Player): number {
        return this.capturedPieces.get(player);
    }

    public override setAtUnsafe(coord: Coord, v: FourStatePiece): this {
        const newBoard: FourStatePiece[][] = TableUtils.copy(this.board);
        newBoard[coord.y][coord.x] = v;
        return new GipfState(newBoard, this.turn, this.sidePieces, this.capturedPieces) as this;
    }

    public override isOnBoard(coord: Coord): boolean {
        if (coord.isNotInRange(this.width, this.height)) {
            return false;
        }
        return this.board[coord.y][coord.x] !== FourStatePiece.UNREACHABLE;
    }
}
