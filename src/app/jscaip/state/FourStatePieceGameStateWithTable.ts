import { MGPOptional } from '@everyboard/lib';
import { GameStateWithTable } from './GameStateWithTable';
import { Player } from '../Player';
import { Coord } from '../Coord';
import { FourStatePiece } from '../FourStatePiece';


export class FourStatePieceGameStateWithTable extends GameStateWithTable<FourStatePiece> {

    public getPlayerCoordsAndContent(): { coord: Coord; content: Player; }[] {
        return this
            .getCoordsAndContents()
            .filter((value: { coord: Coord; content: FourStatePiece; }) => {
                return value.content.isPlayer();
            })
            .map((value: { coord: Coord; content: FourStatePiece; }) => {
                return {
                    coord: value.coord,
                    content: value.content.getPlayer() as Player,
                };
            });
    }

    public isPiece(coord: Coord): boolean {
        const piece: FourStatePiece = this.getPieceAt(coord);
        return piece.isPlayer();
    }

    public optionalIs(coord: Coord, player: Player): boolean {
        const optional: MGPOptional<FourStatePiece> = this.getOptionalPieceAt(coord);
        if (optional.isPresent()) {
            return optional.get().is(player);
        } else {
            return false;
        }
    }

    public optionalIsPiece(coord: Coord): boolean {
        const optional: MGPOptional<FourStatePiece> = this.getOptionalPieceAt(coord);
        if (optional.isPresent()) {
            return optional.get().isPlayer();
        } else {
            return false;
        }
    }

    public override isOnBoard(coord: Coord): boolean {
        const width: number = this.board[0].length;
        const height: number = this.board.length;
        if (coord.isNotInRange(width, height)) {
            return false;
        } else {
            return this.getUnsafe(coord) !== FourStatePiece.UNREACHABLE;
        }
    }

}
