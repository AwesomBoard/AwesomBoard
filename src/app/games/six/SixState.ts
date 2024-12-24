import { Coord } from 'src/app/jscaip/Coord';
import { Vector } from 'src/app/jscaip/Vector';
import { Player, PlayerOrNone } from 'src/app/jscaip/Player';
import { TableUtils, Table } from 'src/app/jscaip/TableUtils';
import { SixFailure } from './SixFailure';
import { SixMove } from './SixMove';
import { Set, MGPOptional, MGPValidation, ReversibleMap, Utils } from '@everyboard/lib';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { OpenHexagonalGameState } from 'src/app/jscaip/state/OpenHexagonalGameState';
import { HexagonalUtils } from 'src/app/jscaip/HexagonalUtils';
import { CoordSet } from 'src/app/jscaip/CoordSet';
import { PlayerNumberMap } from 'src/app/jscaip/PlayerMap';
import { SixConfig } from './SixRules';

export class SixState extends OpenHexagonalGameState<Player> {

    /**
      * @param board the representation of the board
      * @param turn the turn of the board
      * @param origin the coord of the board[0][0] space
      * (useful if the upper left coord is in (-5, -9) or (512, 129))
      * @returns the state created from that board
     */
    public static ofRepresentation(board: Table<PlayerOrNone>, turn: number, origin: Vector = new Vector(0, 0))
    : SixState
    {
        const pieces: ReversibleMap<Coord, Player> = new ReversibleMap<Coord, Player>();
        for (let y: number = 0; y < board.length; y++) {
            for (let x: number = 0; x < board[0].length; x++) {
                if (board[y][x] !== PlayerOrNone.NONE) {
                    const adapted: Coord = new Coord(x, y).getNext(origin);
                    pieces.set(adapted, board[y][x] as Player);
                }
            }
        }
        return new SixState(pieces, turn);
    }

    public movePiece(move: SixMove): SixState {
        const pieces: ReversibleMap<Coord, Player> = this.pieces.getCopy();
        pieces.delete(move.start.get());
        pieces.set(move.landing, this.getCurrentPlayer());
        return new SixState(pieces, this.turn);
    }

    public toRepresentation(): Table<PlayerOrNone> {
        const board: PlayerOrNone[][] = TableUtils.create(this.width, this.height, PlayerOrNone.NONE);
        for (const piece of this.pieces.getKeyList()) {
            const pieceValue: PlayerOrNone = this.getPieceAt(piece);
            board[piece.y][piece.x] = pieceValue;
        }
        return board;
    }

    public isIllegalLandingZone(landing: Coord, start: MGPOptional<Coord>): MGPValidation {
        if (this.pieces.containsKey(landing)) {
            return MGPValidation.failure(RulesFailure.MUST_LAND_ON_EMPTY_SPACE());
        }
        if (this.isCoordConnected(landing, start)) {
            return MGPValidation.SUCCESS;
        } else {
            return MGPValidation.failure(SixFailure.MUST_DROP_NEXT_TO_OTHER_PIECE());
        }
    }

    public isCoordConnected(coord: Coord, except: MGPOptional<Coord>): boolean {
        for (const neighbor of HexagonalUtils.getNeighbors(coord)) {
            if (this.pieces.containsKey(neighbor) &&
                (except.equalsValue(neighbor) === false))
            {
                return true;
            }
        }
        return false;
    }

    public getPieceAt(coord: Coord): PlayerOrNone {
        if (this.isOnBoard(coord)) {
            return this.pieces.get(coord).get();
        } else {
            return PlayerOrNone.NONE;
        }
    }

    public applyLegalDrop(coord: Coord): SixState {
        const pieces: ReversibleMap<Coord, Player> = this.pieces.getCopy();
        pieces.put(coord, this.getCurrentPlayer());
        return new SixState(pieces, this.turn + 1);
    }

    public applyLegalTranslation(move: SixMove, kept: CoordSet): SixState {
        const stateAfterMove: SixState = this.movePiece(move);

        if (kept.size() > 0) {
            const newPieces: ReversibleMap<Coord, Player> = new ReversibleMap<Coord, Player>();
            for (const coord of kept) {
                newPieces.set(coord, stateAfterMove.getPieceAt(coord) as Player);
            }
            return new SixState(newPieces, this.turn + 1);
        } else {
            return new SixState(stateAfterMove.pieces, this.turn + 1);
        }

    }

    public countPieces(): PlayerNumberMap {
        const pieces: ReversibleMap<Player, Set<Coord>> = this.pieces.reverse();
        const zeroPieces: Set<Coord> = pieces.get(Player.ZERO).getOrElse(new CoordSet());
        const onePieces: Set<Coord> = pieces.get(Player.ONE).getOrElse(new CoordSet());
        return PlayerNumberMap.of(zeroPieces.size(), onePieces.size());
    }

    public countRemainingPieces(config: SixConfig): PlayerNumberMap {
        const total: number = config.piecePerPlayer + 1;
        const pieces: ReversibleMap<Player, Set<Coord>> = this.pieces.reverse();
        const zeroPieces: Set<Coord> = pieces.get(Player.ZERO).getOrElse(new CoordSet());
        const onePieces: Set<Coord> = pieces.get(Player.ONE).getOrElse(new CoordSet());
        return PlayerNumberMap.of(total - zeroPieces.size(), total - onePieces.size());
    }

    public switchPiece(coord: Coord): SixState {
        const newPieces: ReversibleMap<Coord, Player> = this.pieces.getCopy();
        const oldPiece: PlayerOrNone = this.getPieceAt(coord);
        Utils.assert(oldPiece.isPlayer(), 'Cannot switch piece if there is no piece!', { coord: coord.toString() });
        newPieces.replace(coord, (oldPiece as Player).getOpponent());
        return new SixState(newPieces, this.turn);
    }

    public equals(other: SixState): boolean {
        return this.turn === other.turn && this.pieces.equals(other.pieces);
    }
}
