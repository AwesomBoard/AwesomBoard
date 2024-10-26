import { Table, TableUtils } from 'src/app/jscaip/TableUtils';
import { Coord } from 'src/app/jscaip/Coord';
import { GameStateWithTable } from 'src/app/jscaip/state/GameStateWithTable';
import { KamisadoBoard } from './KamisadoBoard';
import { KamisadoColor } from './KamisadoColor';
import { MGPOptional } from '@everyboard/lib';
import { KamisadoPiece } from './KamisadoPiece';

export class KamisadoState extends GameStateWithTable<KamisadoPiece> {

    public static isOnBoard(coord: Coord): boolean {
        return coord.isInRange(KamisadoBoard.SIZE, KamisadoBoard.SIZE);
    }

    public constructor(turn: number,
                       // The color that needs to be played next
                       public readonly colorToPlay: KamisadoColor,
                       // The next coord that has to be played
                       public readonly coordToPlay: MGPOptional<Coord>,
                       // Did a PASS move have been performed on the last turn?
                       public readonly alreadyPassed: boolean,
                       board: Table<KamisadoPiece>)
    {
        super(TableUtils.copy(board), turn);
    }

    public isEmptyAt(coord: Coord): boolean {
        return this.hasPieceAt(coord, KamisadoPiece.EMPTY);
    }

    public allPieceCoords(): Coord[] {
        const l: Coord[] = [];
        for (let y: number = 0; y < this.getHeight(); y++) {
            for (let x: number = 0; x < this.getWidth(); x++) {
                const coord: Coord = new Coord(x, y);
                if (this.isEmptyAt(coord) === false) {
                    l.push(coord);
                }
            }
        }
        return l;
    }

}
