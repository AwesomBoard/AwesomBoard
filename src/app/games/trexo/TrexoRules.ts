import { BoardValue } from 'src/app/jscaip/BoardValue';
import { Coord } from 'src/app/jscaip/Coord';
import { GameStatus } from 'src/app/jscaip/GameStatus';
import { GameNode } from 'src/app/jscaip/GameNode';
import { NInARowHelper } from 'src/app/jscaip/NInARowHelper';
import { Player, PlayerOrNone } from 'src/app/jscaip/Player';
import { Rules } from 'src/app/jscaip/Rules';
import { MGPOptional } from 'src/app/utils/MGPOptional';
import { MGPValidation } from '../../utils/MGPValidation';
import { TrexoFailure } from './TrexoFailure';
import { TrexoMove } from './TrexoMove';
import { TrexoPieceStack, TrexoState } from './TrexoState';

export class TrexoNode extends GameNode<TrexoMove, TrexoState> {}

export class TrexoRules extends Rules<TrexoMove, TrexoState> {

    private static instance: MGPOptional<TrexoRules> = MGPOptional.empty();

    public static get(): TrexoRules {
        if (TrexoRules.instance.isAbsent()) {
            TrexoRules.instance = MGPOptional.of(new TrexoRules());
        }
        return TrexoRules.instance.get();
    }
    private static getOwner(piece: TrexoPieceStack): PlayerOrNone {
        return piece.getOwner();
    }
    public static readonly TREXO_HELPER: NInARowHelper<TrexoPieceStack> =
        new NInARowHelper(TrexoRules.getOwner, 5);

    private constructor() {
        super(TrexoState);
    }
    public applyLegalMove(move: TrexoMove, state: TrexoState, _info: void): TrexoState {
        return state
            .drop(move.getZero(), Player.ZERO)
            .drop(move.getOne(), Player.ONE)
            .incrementTurn();
    }
    public isLegal(move: TrexoMove, state: TrexoState): MGPValidation {
        if (this.isUnevenGround(move, state)) {
            return MGPValidation.failure(TrexoFailure.CANNOT_DROP_PIECE_ON_UNEVEN_GROUNDS());
        }
        if (this.landsOnOnlyOnePiece(move, state)) {
            return MGPValidation.failure(TrexoFailure.CANNOT_DROP_ON_ONLY_ONE_PIECE());
        }
        return MGPValidation.SUCCESS;
    }
    public isUnevenGround(move: TrexoMove, state: TrexoState): boolean {
        const zero: TrexoPieceStack = state.getPieceAt(move.getZero());
        const one: TrexoPieceStack = state.getPieceAt(move.getOne());
        return zero.getHeight() !== one.getHeight();
    }
    public landsOnOnlyOnePiece(move: TrexoMove, state: TrexoState): boolean {
        const zeroSpace: TrexoPieceStack = state.getPieceAt(move.getZero());
        const oneSpace: TrexoPieceStack = state.getPieceAt(move.getOne());
        if (zeroSpace.getUpperTileId() === -1 && oneSpace.getUpperTileId() === -1) {
            return false;
        }
        return zeroSpace.getUpperTileId() === oneSpace.getUpperTileId();
    }
    public static getSquareScore(state: TrexoState, coord: Coord): number {
        return TrexoRules.TREXO_HELPER.getSquareScore(state, coord);
    }
    public static getVictoriousCoords(state: TrexoState): Coord[] {
        const victoryOfLastPlayer: Coord[] = [];
        const victoryOfNextPlayer: Coord[] = [];
        const lastPlayer: Player = state.getCurrentOpponent();
        for (const keyValue of state.toMap()) {
            // for every column, starting from the bottom of each column
            // while we haven't reached the top or an empty space
            const coord: Coord = keyValue.key;
            const pieceOwner: PlayerOrNone = state.getPieceAt(coord).getOwner();
            if (pieceOwner.isPlayer()) {
                const squareScore: number = TrexoRules.getSquareScore(state, coord);
                if (BoardValue.isVictory(squareScore)) {
                    if (pieceOwner === lastPlayer) {
                        victoryOfLastPlayer.push(coord);
                    } else {
                        victoryOfNextPlayer.push(coord);
                    }
                }
            }
        }
        if (victoryOfNextPlayer.length > 0) {
            return victoryOfNextPlayer;
        } else {
            return victoryOfLastPlayer;
        }
    }
    public getGameStatus(node: TrexoNode): GameStatus {
        const state: TrexoState = node.gameState;
        const lastPlayer: Player = state.getCurrentOpponent();
        let lastPlayerAligned5: boolean = false;
        for (const keyValue of state.toMap()) {
            // for every column, starting from the bottom of each column
            // while we haven't reached the top or an empty space
            const coord: Coord = keyValue.key;
            const pieceOwner: PlayerOrNone = state.getPieceAt(coord).getOwner();
            if (pieceOwner.isPlayer()) {
                const squareScore: number = TrexoRules.getSquareScore(state, coord);
                if (BoardValue.isVictory(squareScore)) {
                    if (pieceOwner === lastPlayer) {
                        // Cannot return right away
                        // because the last player only wins if the other does not get an alignment
                        lastPlayerAligned5 = true;
                    } else {
                        return GameStatus.getDefeat(lastPlayer);
                    }
                }
            }
        }
        if (lastPlayerAligned5) {
            return GameStatus.getVictory(lastPlayer);
        }
        return GameStatus.ONGOING;
    }
    public getLegalMoves(state: TrexoState): TrexoMove[] {
        const moves: TrexoMove[] = [];
        for (const keyValue of state.toMap()) {
            const upOrleftCord: Coord = keyValue.key;
            if (upOrleftCord.x + 1 < TrexoState.SIZE) {
                const rightCoord: Coord = new Coord(upOrleftCord.x + 1, upOrleftCord.y);
                moves.push(...this.getPossiblesMoves(state, upOrleftCord, rightCoord));
            }
            if (upOrleftCord.y + 1 < TrexoState.SIZE) {
                const downCoord: Coord = new Coord(upOrleftCord.x, upOrleftCord.y + 1);
                moves.push(...this.getPossiblesMoves(state, upOrleftCord, downCoord));
            }
        }
        return moves;
    }
    public getPossiblesMoves(state: TrexoState, first: Coord, second: Coord): TrexoMove[] {
        const firstStack: TrexoPieceStack = state.getPieceAt(first);
        const secondStack: TrexoPieceStack = state.getPieceAt(second);
        let tileHidesEntirelyOneTile: boolean;
        if (firstStack.isGround()) {
            tileHidesEntirelyOneTile = false;
        } else {
            tileHidesEntirelyOneTile = (firstStack.getUpperTileId() === secondStack.getUpperTileId());
        }
        const stacksAreOnUnevenGround: boolean = firstStack.getHeight() !== secondStack.getHeight();
        if (tileHidesEntirelyOneTile || stacksAreOnUnevenGround) {
            return [];
        } else {
            return [
                TrexoMove.from(first, second).get(),
                TrexoMove.from(second, first).get(),
            ];
        }
    }
}
