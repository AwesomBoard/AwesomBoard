import { Rules } from 'src/app/jscaip/Rules';
import { DiaballikMove, DiaballikBallPass, DiaballikSubMove, DiaballikTranslation } from './DiaballikMove';
import { DiaballikPiece, DiaballikState } from './DiaballikState';
import { GameStatus } from 'src/app/jscaip/GameStatus';
import { Player } from 'src/app/jscaip/Player';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { Coord } from 'src/app/jscaip/Coord';
import { Orthogonal } from 'src/app/jscaip/Orthogonal';
import { Ordinal } from 'src/app/jscaip/Ordinal';
import { MGPFallible, MGPOptional, Utils } from '@everyboard/lib';
import { GameNode } from 'src/app/jscaip/AI/GameNode';
import { DiaballikFailure } from './DiaballikFailure';
import { Table } from 'src/app/jscaip/TableUtils';
import { CoordFailure } from '../../jscaip/Coord';
import { NoConfig } from 'src/app/jscaip/RulesConfigUtil';
import { PlayerMap } from 'src/app/jscaip/PlayerMap';
import { CoordSet } from 'src/app/jscaip/CoordSet';

export class VictoryOrDefeatCoords {
    protected constructor(public readonly winner: Player) {}
}
export class VictoryCoord extends VictoryOrDefeatCoords {
    public constructor(winner: Player, public readonly coord: Coord) {
        super(winner);
    }
}
export class DefeatCoords extends VictoryOrDefeatCoords {
    public constructor(loser: Player,
                       public readonly allLoserPieces: Coord[],
                       public readonly opponentPiecesInContact: Coord[])
    {
        super(loser.getOpponent());
    }
}

export type DefeatCoordsIncomplete = {
    player: Player,
    allPieces: Coord[],
    piecesInContact: Coord[],
};

interface ConnectionInfos {

    coord: MGPOptional<Coord>;

    opponentsConnected: CoordSet;

}

export class DiaballikNode extends GameNode<DiaballikMove, DiaballikState> {}

export class DiaballikRules extends Rules<DiaballikMove, DiaballikState, DiaballikState> {

    private static singleton: MGPOptional<DiaballikRules> = MGPOptional.empty();

    public static get(): DiaballikRules {
        if (DiaballikRules.singleton.isAbsent()) {
            DiaballikRules.singleton = MGPOptional.of(new DiaballikRules());
        }
        return DiaballikRules.singleton.get();
    }

    public override getInitialState(): DiaballikState {
        const O: DiaballikPiece = DiaballikPiece.ZERO;
        const Ȯ: DiaballikPiece = DiaballikPiece.ZERO_WITH_BALL;
        const X: DiaballikPiece = DiaballikPiece.ONE;
        const Ẋ: DiaballikPiece = DiaballikPiece.ONE_WITH_BALL;
        const _: DiaballikPiece = DiaballikPiece.NONE;
        const board: Table<DiaballikPiece> = [
            [X, X, X, Ẋ, X, X, X],
            [_, _, _, _, _, _, _],
            [_, _, _, _, _, _, _],
            [_, _, _, _, _, _, _],
            [_, _, _, _, _, _, _],
            [_, _, _, _, _, _, _],
            [O, O, O, Ȯ, O, O, O],
        ];
        return new DiaballikState(board, 0);
    }

    public override isLegal(move: DiaballikMove, state: DiaballikState): MGPFallible<DiaballikState> {
        let currentState: DiaballikState = state;
        for (const subMove of move.getSubMoves()) {
            const start: Coord = subMove.getStart();
            if (state.isNotOnBoard(start)) {
                return MGPFallible.failure(CoordFailure.OUT_OF_RANGE(start));
            }
            const end: Coord = subMove.getEnd();
            if (state.isNotOnBoard(end)) {
                return MGPFallible.failure(CoordFailure.OUT_OF_RANGE(end));
            }
            const legality: MGPFallible<DiaballikState> = this.isLegalSubMove(currentState, subMove);
            if (legality.isFailure()) {
                return legality;
            }
            currentState = legality.get();
        }
        return MGPFallible.success(currentState);
    }

    public isLegalSubMove(state: DiaballikState, subMove: DiaballikSubMove): MGPFallible<DiaballikState> {
        if (subMove instanceof DiaballikTranslation) {
            return this.isLegalTranslation(state, subMove);
        } else {
            return this.isLegalPass(state, subMove);
        }
    }

    public isLegalTranslation(state: DiaballikState, translation: DiaballikTranslation): MGPFallible<DiaballikState> {
        // The origin must be a piece owned by the player
        const start: Coord = translation.getStart();
        const startPiece: DiaballikPiece = state.getPieceAt(start);
        if (startPiece.owner.isNone()) {
            return MGPFallible.failure(RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_EMPTY());
        }
        if (startPiece.owner === state.getCurrentOpponent()) {
            return MGPFallible.failure(RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_OPPONENT());
        }
        // The moved piece must not hold the ball
        if (startPiece.holdsBall === true) {
            return MGPFallible.failure(DiaballikFailure.CANNOT_MOVE_WITH_BALL());
        }

        // The destination must be empty
        const end: Coord = translation.getEnd();
        if (state.getPieceAt(end).owner.isPlayer()) {
            return MGPFallible.failure(RulesFailure.MUST_LAND_ON_EMPTY_SPACE());
        }

        const updatedBoard: DiaballikPiece[][] = state.getCopiedBoard();
        updatedBoard[start.y][start.x] = DiaballikPiece.NONE;
        updatedBoard[end.y][end.x] = startPiece;
        const stateAfterTranslation: DiaballikState = new DiaballikState(updatedBoard, state.turn);
        return MGPFallible.success(stateAfterTranslation);
    }

    public isLegalPass(state: DiaballikState, pass: DiaballikBallPass): MGPFallible<DiaballikState> {
        // The origin must be a piece of the player that holds the ball
        const start: Coord = pass.getStart();
        const startPiece: DiaballikPiece = state.getPieceAt(start);
        if (startPiece.owner.isNone()) {
            return MGPFallible.failure(RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_EMPTY());
        }
        if (startPiece.owner === state.getCurrentOpponent()) {
            return MGPFallible.failure(RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_OPPONENT());
        }
        Utils.assert(startPiece.holdsBall, 'DiaballikRules: cannot pass without the ball');

        // The destination must be a piece of the player
        const end: Coord = pass.getEnd();
        const endPiece: DiaballikPiece = state.getPieceAt(end);
        if (endPiece.owner.isNone()) {
            return MGPFallible.failure(RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_EMPTY());
        }
        if (endPiece.owner === state.getCurrentOpponent()) {
            return MGPFallible.failure(DiaballikFailure.CANNOT_PASS_TO_OPPONENT());
        }

        // The straight-line path between origin and destination contains no other piece
        const direction: Ordinal = Ordinal.factory.fromMove(start, end).get();
        const afterStart: Coord = start.getNext(direction);
        for (let coord: Coord = afterStart; coord.equals(end) === false; coord = coord.getNext(direction)) {
            if (state.getPieceAt(coord) !== DiaballikPiece.NONE) {
                return MGPFallible.failure(DiaballikFailure.PASS_PATH_OBSTRUCTED());
            }
        }

        // We must apply the pass to be able to validate the next submoves
        const updatedBoard: DiaballikPiece[][] = state.getCopiedBoard();
        const withBall: DiaballikPiece = updatedBoard[start.y][start.x];
        const withoutBall: DiaballikPiece = updatedBoard[end.y][end.x];
        updatedBoard[start.y][start.x] = withoutBall;
        updatedBoard[end.y][end.x] = withBall;
        return MGPFallible.success(new DiaballikState(updatedBoard, state.turn));
    }

    public override applyLegalMove(_move: DiaballikMove,
                                   state: DiaballikState,
                                   _config: NoConfig,
                                   stateAfterSubMoves: DiaballikState)
    : DiaballikState
    {
        // All submoves have already been applied and are stored in stateAfterSubMoves
        // We only have to update the turn
        return new DiaballikState(stateAfterSubMoves.board, state.turn + 1);
    }

    public override getGameStatus(node: DiaballikNode): GameStatus {
        const state: DiaballikState = node.gameState;
        const victoryOrDefeat: MGPOptional<VictoryOrDefeatCoords> = this.getVictoryOrDefeatCoords(state);
        if (victoryOrDefeat.isPresent()) {
            return GameStatus.getVictory(victoryOrDefeat.get().winner);
        } else {
            return GameStatus.ONGOING;
        }
    }

    public getVictoryOrDefeatCoords(state: DiaballikState): MGPOptional<VictoryOrDefeatCoords> {
        // A player wins when their ball is in the opponent's row
        const ballCoordZero: MGPOptional<Coord> = this.getBallCoordInRow(state, 0, Player.ZERO);
        if (ballCoordZero.isPresent()) {
            return MGPOptional.of(new VictoryCoord(Player.ZERO, ballCoordZero.get()));
        }
        const ballCoordOne: MGPOptional<Coord> = this.getBallCoordInRow(state, state.getHeight() - 1, Player.ONE);
        if (ballCoordOne.isPresent()) {
            return MGPOptional.of(new VictoryCoord(Player.ONE, ballCoordOne.get()));
        }
        // The anti-game rule states that if one player blocks the other and there are three pieces in contact,
        // the blocking player loses
        const defeatCoords: MGPOptional<DefeatCoords> = this.getBlockerAndCoords(state);
        return defeatCoords;
    }

    private getBallCoordInRow(state: DiaballikState, y: number, player: Player): MGPOptional<Coord> {
        for (let x: number = 0; x < state.getHeight(); x++) {
            const piece: DiaballikPiece = state.getPieceAtXY(x, y);
            if (piece.holdsBall === true && piece.owner === player) {
                return MGPOptional.of(new Coord(x, y));
            }
        }
        return MGPOptional.empty();
    }

    private getBlockerAndCoords(state: DiaballikState): MGPOptional<DefeatCoords> {
        // The anti-game rule states that if a player forms a line that blocks the opponent,
        // and that if three opponent's pieces are touching the line, then the blocker loses
        // We check this one player at a time.
        // In case both players form a line, the one that just moved wins.
        const blocking: PlayerMap<MGPOptional<DefeatCoords>> = PlayerMap.ofValues(
            this.getBlockerCoords(state, Player.ZERO),
            this.getBlockerCoords(state, Player.ONE),
        );
        if (blocking.get(Player.ZERO).isPresent() && blocking.get(Player.ONE).isPresent()) {
            // Both players form a line, so the current player loses
            return blocking.get(state.getCurrentPlayer());
        } else if (blocking.get(Player.ZERO).isPresent()) {
            return blocking.get(Player.ZERO);
        } else if (blocking.get(Player.ONE).isPresent()) {
            return blocking.get(Player.ONE);
        } else {
            return MGPOptional.empty();
        }
    }

    private getBlockerCoords(state: DiaballikState, player: Player): MGPOptional<DefeatCoords> {
        // We check if:
        //   - there is one player piece in each column
        //   - they are all connected
        //   - at least 3 opponent's pieces are connected
        let opponentsConnected: CoordSet = new CoordSet();
        const blockerCoords: Coord[] = [];
        for (let x: number = 0; x < state.getWidth(); x++) {
            const connectionInfos: ConnectionInfos = this.getConnectedPieceCoord(x, opponentsConnected, state, player);
            opponentsConnected = connectionInfos.opponentsConnected;
            const coord: MGPOptional<Coord> = connectionInfos.coord;
            if (coord.isPresent()) {
                blockerCoords.push(coord.get());
            } else {
                // No piece found in this column
                return MGPOptional.empty();
            }
        }
        if (opponentsConnected.size() >= 3) {
            return MGPOptional.of(new DefeatCoords(player, blockerCoords, opponentsConnected.toList()));
        } else {
            return MGPOptional.empty();
        }
    }

    private getConnectedPieceCoord(x: number,
                                   opponentsConnected: CoordSet,
                                   state: DiaballikState,
                                   player: Player)
    : ConnectionInfos
    {
        for (let y: number = 0; y < state.getHeight(); y++) {
            const coord: Coord = new Coord(x, y);
            if (state.getPieceAt(coord).owner === player) {
                // This is a player piece, it needs to be either in column 0
                // or connected on the left to another player piece for a line to be formed
                if (this.isConnectedOnTheLeft(coord, state, player)) {
                    // The piece is connected, we count the opponents that it touches
                    return {
                        coord: MGPOptional.of(coord),
                        opponentsConnected: this.addConnectedOpponents(coord, opponentsConnected, state, player),
                    };
                } else {
                    // This piece is not connected, it is therefore impossible to form a line
                    return { coord: MGPOptional.empty(), opponentsConnected };
                }
            }
        }
        return { coord: MGPOptional.empty(), opponentsConnected }; // No piece found in this column
    }

    private isConnectedOnTheLeft(coord: Coord, state: DiaballikState, player: Player): boolean {
        if (coord.x === 0) {
            // A piece in the first column is considered connected
            return true;
        }
        for (const direction of [Ordinal.LEFT, Ordinal.UP_LEFT, Ordinal.DOWN_LEFT]) {
            const neighbor: Coord = coord.getNext(direction);
            if (state.coordIsOwnedBy(neighbor, player)) {
                return true;
            }
        }
        return false;
    }

    private addConnectedOpponents(coord: Coord,
                                  opponentsConnected: CoordSet,
                                  state: DiaballikState,
                                  player: Player)
    : CoordSet
    {
        for (const direction of Orthogonal.factory.all) {
            const neighbor: Coord = coord.getNext(direction);
            if (state.coordIsOwnedBy(neighbor, player.getOpponent())) {
                opponentsConnected = opponentsConnected.addElement(neighbor);
            }
        }
        return opponentsConnected;
    }
}
