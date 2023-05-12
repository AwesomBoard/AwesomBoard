import { GameStatus, Rules } from 'src/app/jscaip/Rules';
import { ConnectSixState } from './ConnectSixState';
import { MGPNode } from 'src/app/jscaip/MGPNode';
import { MGPFallible } from 'src/app/utils/MGPFallible';
import { ConnectSixDrops, ConnectSixFirstMove, ConnectSixMove } from './ConnectSixMove';
import { MGPOptional } from 'src/app/utils/MGPOptional';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { Player, PlayerOrNone } from 'src/app/jscaip/Player';
import { Coord } from 'src/app/jscaip/Coord';
import { ConnectSixFailure } from './ConnectSixFailure';
import { SCORE } from 'src/app/jscaip/SCORE';
import { NInARowHelper } from 'src/app/jscaip/NInARowHelper';

export class ConnectSixNode extends MGPNode<ConnectSixRules, ConnectSixMove, ConnectSixState> {}

export class ConnectSixRules extends Rules<ConnectSixMove, ConnectSixState> {

    private static singleton: MGPOptional<ConnectSixRules> = MGPOptional.empty();

    private static isInRange(coord: Coord): boolean {
        return coord.isInRange(ConnectSixState.WIDTH, ConnectSixState.WIDTH); // TODO: TODOTODO centralise this
    }
    public static getOwner(piece: PlayerOrNone): PlayerOrNone {
        return piece;
    }
    private static readonly CONNECT_SIX_HELPER: NInARowHelper<PlayerOrNone> =
        new NInARowHelper(ConnectSixRules.isInRange, ConnectSixRules.getOwner, 6);

    public static get(): ConnectSixRules {
        if (ConnectSixRules.singleton.isAbsent()) {
            ConnectSixRules.singleton = MGPOptional.of(new ConnectSixRules());
        }
        return ConnectSixRules.singleton.get();
    }
    public static getSquareScore(state: ConnectSixState, coord: Coord): number {
        return ConnectSixRules.CONNECT_SIX_HELPER.getSquareScore(state, coord);
    }
    public static getVictoriousCoords(state: ConnectSixState): Coord[] {
        const coords: Coord[] = [];
        for (const coordAndContents of state.getCoordsAndContents()) {
            if (coordAndContents[1].isPlayer()) {
                const coord: Coord = coordAndContents[0];
                const squareScore: number = ConnectSixRules.getSquareScore(state, coord);
                if (MGPNode.getScoreStatus(squareScore) === SCORE.VICTORY) {
                    if (squareScore === Player.ZERO.getVictoryValue() ||
                        squareScore === Player.ONE.getVictoryValue())
                    {
                        coords.push(coord);
                    }
                }
            }
        }
        return coords;
    }
    private constructor() {
        super(ConnectSixState);
    }
    public applyLegalMove(move: ConnectSixMove, state: ConnectSixState): ConnectSixState {
        if (move instanceof ConnectSixDrops) {
            return this.applyLegalDrops(move, state);
        } else {
            return this.applyLegalFirstMove(move, state);
        }
    }
    private applyLegalDrops(move: ConnectSixDrops, state: ConnectSixState): ConnectSixState {
        const player: Player = state.getCurrentPlayer();
        const first: Coord = move.getFirst();
        const second: Coord = move.getSecond();
        const newBoard: PlayerOrNone[][] = state.getCopiedBoard();
        newBoard[first.y][first.x] = player;
        newBoard[second.y][second.x] = player;
        return new ConnectSixState(newBoard, state.turn + 1);
    }
    private applyLegalFirstMove(move: ConnectSixFirstMove, state: ConnectSixState): ConnectSixState {
        const player: Player = state.getCurrentPlayer();
        const newBoard: PlayerOrNone[][] = state.getCopiedBoard();
        newBoard[move.coord.y][move.coord.x] = player;
        return new ConnectSixState(newBoard, state.turn + 1);
    }
    public isLegal(move: ConnectSixMove, state: ConnectSixState): MGPFallible<void> {
        if (state.turn === 0) {
            return this.isLegalFirstMove(move, state);
        } else {
            return this.isLegalDrops(move, state);
        }
    }
    public isLegalFirstMove(move: ConnectSixMove, state: ConnectSixState): MGPFallible<void> {
        if (move instanceof ConnectSixFirstMove) {
            return MGPFallible.success(undefined);
        } else {
            return MGPFallible.failure(ConnectSixFailure.CANNOT_DROP_TWO_PIECES_AT_FIRST_TURN());
        }
    }
    public isLegalDrops(move: ConnectSixMove, state: ConnectSixState): MGPFallible<void> {
        if (move instanceof ConnectSixDrops) {
            if (state.getPieceAt(move.getFirst()).isPlayer()) {
                return MGPFallible.failure(RulesFailure.MUST_CLICK_ON_EMPTY_SQUARE());
            } else if (state.getPieceAt(move.getSecond()).isPlayer()) {
                return MGPFallible.failure(RulesFailure.MUST_CLICK_ON_EMPTY_SQUARE());
            } else {
                return MGPFallible.success(undefined);
            }
        } else {
            return MGPFallible.failure(`ta mère c'est un drops ça !`);
        }
    }
    public getGameStatus(node: ConnectSixNode): GameStatus {
        const state: ConnectSixState = node.gameState;
        for (const coordAndContents of state.getCoordsAndContents()) {
            if (coordAndContents[1].isPlayer()) {
                const squareScore: number = ConnectSixRules.getSquareScore(state, coordAndContents[0]);
                if (MGPNode.getScoreStatus(squareScore) === SCORE.VICTORY) {
                    return GameStatus.getVictory(state.getCurrentOpponent());
                }
            }
        }
        // TODOTODO: TODO: calculate the theoritic last turn
        return state.turn === 42 ? GameStatus.DRAW : GameStatus.ONGOING;
    }
}
