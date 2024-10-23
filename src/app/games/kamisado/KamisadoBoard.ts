import { KamisadoColor } from './KamisadoColor';
import { KamisadoPiece } from './KamisadoPiece';
import { TableUtils, Table } from 'src/app/jscaip/TableUtils';
import { Coord } from 'src/app/jscaip/Coord';
import { Player } from 'src/app/jscaip/Player';

export class KamisadoBoard {

    public static INITIAL: Table<KamisadoPiece> = KamisadoBoard.getInitialBoard();

    public static SIZE: number = 8;

    private static readonly COLORS: Table<KamisadoColor> = TableUtils.map([
        [1, 2, 3, 4, 5, 6, 7, 8],
        [6, 1, 4, 7, 2, 5, 8, 3],
        [7, 4, 1, 6, 3, 8, 5, 2],
        [4, 3, 2, 1, 8, 7, 6, 5],
        [5, 6, 7, 8, 1, 2, 3, 4],
        [2, 5, 8, 3, 6, 1, 4, 7],
        [3, 8, 5, 2, 7, 4, 1, 6],
        [8, 7, 6, 5, 4, 3, 2, 1],
    ], KamisadoColor.of);

    public static getColorAt(x: number, y: number): KamisadoColor {
        return KamisadoBoard.COLORS[y][x];
    }

    public static getInitialBoard(): Table<KamisadoPiece> {
        const _: KamisadoPiece = KamisadoPiece.EMPTY;
        return [
            [1, 2, 3, 4, 5, 6, 7, 8].map((value: number) => KamisadoPiece.of(Player.ONE, value)),
            [_, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _],
            [8, 7, 6, 5, 4, 3, 2, 1].map((value: number) => KamisadoPiece.of(Player.ZERO, value)),
        ];
    }

    public static isEmptyAt(board: Table<KamisadoPiece>, coord: Coord): boolean { // TODO: un-static-this ?
        return board[coord.y][coord.x].equals(KamisadoPiece.EMPTY);
    }

    public static allPieceCoords(board: Table<KamisadoPiece>): Coord[] {
        const l: Coord[] = [];
        for (let y: number = 0; y < board.length; y++) {
            for (let x: number = 0; x < board[y].length; x++) {
                const coord: Coord = new Coord(x, y);
                if (KamisadoBoard.isEmptyAt(board, coord) === false) {
                    l.push(coord);
                }
            }
        }
        return l;
    }

}
