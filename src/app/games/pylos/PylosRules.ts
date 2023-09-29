import { MGPOptional } from 'src/app/utils/MGPOptional';
import { Orthogonal } from 'src/app/jscaip/Direction';
import { GameNode } from 'src/app/jscaip/GameNode';
import { Player, PlayerOrNone } from 'src/app/jscaip/Player';
import { Rules } from 'src/app/jscaip/Rules';
import { PylosCoord } from './PylosCoord';
import { PylosMove } from './PylosMove';
import { PylosState } from './PylosState';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { PylosFailure } from './PylosFailure';
import { MGPValidation } from 'src/app/utils/MGPValidation';
import { MGPSet } from 'src/app/utils/MGPSet';
import { MGPFallible } from '../../utils/MGPFallible';
import { GameStatus } from 'src/app/jscaip/GameStatus';

export class PylosNode extends GameNode<PylosMove, PylosState> {}

export class PylosRules extends Rules<PylosMove, PylosState> {

    private static singleton: MGPOptional<PylosRules> = MGPOptional.empty();

    public static get(): PylosRules {
        if (PylosRules.singleton.isAbsent()) {
            PylosRules.singleton = MGPOptional.of(new PylosRules());
        }
        return PylosRules.singleton.get();
    }
    private constructor() {
        super(PylosState, {});
    }
    public static getStateInfo(state: PylosState): { freeToMove: PylosCoord[], landable: PylosCoord[] } {
        const freeToMove: PylosCoord[] = [];
        const landable: PylosCoord[] = [];
        for (let z: number = 0; z < 3; z++) {
            for (let y: number = 0; y < (4 - z); y++) {
                for (let x: number = 0; x < (4 - z); x++) {
                    const c: PylosCoord = new PylosCoord(x, y, z);
                    if (state.getPieceAt(c) === state.getCurrentPlayer() &&
                        state.isSupporting(c) === false)
                    {
                        freeToMove.push(c);
                    }
                    if (state.isLandable(c)) {
                        landable.push(c);
                    }
                }
            }
        }
        return { freeToMove, landable };
    }
    public static getClimbingMoves(stateInfo: { freeToMove: PylosCoord[], landable: PylosCoord[] }): PylosMove[] {
        const moves: PylosMove[] = [];
        for (const startingCoord of stateInfo.freeToMove) {
            for (const landingCoord of stateInfo.landable) {
                if (landingCoord.isHigherThan(startingCoord) &&
                    landingCoord.getLowerPieces().some((c: PylosCoord) => startingCoord.equals(c)) === false) {
                    const newMove: PylosMove = PylosMove.ofClimb(startingCoord, landingCoord, []);
                    moves.push(newMove);
                }
            }
        }
        return moves;
    }
    public static getDropMoves(stateInfo: { freeToMove: PylosCoord[], landable: PylosCoord[] }): PylosMove[] {
        const drops: PylosMove[] = [];
        for (const landableCoord of stateInfo.landable) {
            const newMove: PylosMove = PylosMove.ofDrop(landableCoord, []);
            drops.push(newMove);
        }
        return drops;
    }
    public static canCapture(state: PylosState, landingCoord: PylosCoord): boolean {
        const currentPlayer: Player = state.getCurrentPlayer();
        for (const vertical of [Orthogonal.UP, Orthogonal.DOWN]) {
            const firstNeighbors: MGPOptional<PylosCoord> = landingCoord.getNextValid(vertical);
            if (firstNeighbors.isPresent() && state.getPieceAt(firstNeighbors.get()) === currentPlayer) {
                for (const horizontal of [Orthogonal.LEFT, Orthogonal.RIGHT]) {
                    const secondNeighbors: MGPOptional<PylosCoord> = firstNeighbors.get().getNextValid(horizontal);
                    if (secondNeighbors.isPresent() &&
                        state.getPieceAt(secondNeighbors.get()) === currentPlayer)
                    {
                        const thirdDirection: Orthogonal = vertical.getOpposite();
                        const thirdNeighbors: PylosCoord = secondNeighbors.get().getNextValid(thirdDirection).get();
                        if (state.getPieceAt(thirdNeighbors) === currentPlayer) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }
    public static getPossibleCaptures(state: PylosState): MGPSet<MGPSet<PylosCoord>> {
        const possiblesCapturesSet: MGPSet<MGPSet<PylosCoord>> = new MGPSet();

        const freeToMoveFirsts: PylosCoord[] = state.getFreeToMoves();
        for (const freeToMoveFirst of freeToMoveFirsts) {
            possiblesCapturesSet.add(new MGPSet([freeToMoveFirst]));

            const secondState: PylosState = state.removePieceAt(freeToMoveFirst);
            const freeToMoveThens: PylosCoord[] = secondState.getFreeToMoves();
            for (const freeToMoveThen of freeToMoveThens) {
                const captures: MGPSet<PylosCoord> = new MGPSet([freeToMoveFirst, freeToMoveThen]);
                possiblesCapturesSet.add(captures);
            }
        }
        return possiblesCapturesSet;
    }
    public static applyLegalMove(move: PylosMove, state: PylosState, _info: void): PylosState {
        return state.applyLegalMove(move);
    }
    public static isValidCapture(state: PylosState, move: PylosMove, capture: PylosCoord): boolean {
        const currentPlayer: Player = state.getCurrentPlayer();
        if (capture.equals(move.landingCoord) === false &&
            state.getPieceAt(capture) !== currentPlayer)
        {
            return false;
        }
        const supportedPieces: PylosCoord[] = capture.getHigherCoords()
            .filter((coord: PylosCoord) => state.getPieceAt(coord).isPlayer() &&
                                           coord.equals(move.firstCapture.get()) === false);
        return supportedPieces.length === 0;
    }
    public static getGameStatus(node: PylosNode): GameStatus {
        const state: PylosState = node.gameState;
        const ownershipMap: { [owner: number]: number } = state.getPiecesRepartition();
        if (ownershipMap[Player.ZERO.value] === 15) {
            return GameStatus.ONE_WON;
        } else if (ownershipMap[Player.ONE.value] === 15) {
            return GameStatus.ZERO_WON;
        } else {
            return GameStatus.ONGOING;
        }
    }
    public applyLegalMove(move: PylosMove, state: PylosState, status: void): PylosState {
        return PylosRules.applyLegalMove(move, state, status);
    }
    public isLegal(move: PylosMove, state: PylosState): MGPValidation {
        const startingCoordLegality: MGPFallible<PylosState> = this.isLegalStartingCoord(move, state);
        if (startingCoordLegality.isFailure()) {
            return startingCoordLegality.toOtherFallible();
        }
        const stateWithLeftStartingCoord: PylosState = startingCoordLegality.get();
        const landingCoordLegality: MGPFallible<PylosState> =
            this.isLegalLandingCoord(move, stateWithLeftStartingCoord);
        if (landingCoordLegality.isFailure()) {
            return landingCoordLegality.toOtherFallible();
        }
        const stateAfterPieceLanding: PylosState = landingCoordLegality.get();
        const capturesLegality: MGPValidation = this.isLegalCaptures(move, stateAfterPieceLanding);
        if (capturesLegality.isFailure()) {
            return capturesLegality;
        }
        return MGPValidation.SUCCESS;
    }
    private isLegalStartingCoord(move: PylosMove, initialState: PylosState): MGPFallible<PylosState> {
        const opponent: Player = initialState.getCurrentOpponent();
        if (move.startingCoord.isPresent()) {
            const startingCoord: PylosCoord = move.startingCoord.get();
            const startingPiece: PlayerOrNone = initialState.getPieceAt(startingCoord);
            if (startingPiece === opponent) {
                return MGPFallible.failure(RulesFailure.CANNOT_CHOOSE_OPPONENT_PIECE());
            } else if (startingPiece === PlayerOrNone.NONE) {
                return MGPFallible.failure(RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_EMPTY());
            }
            const supportedPieces: PylosCoord[] = startingCoord.getHigherCoords()
                .filter((coord: PylosCoord) => initialState.getPieceAt(coord).isPlayer());
            if (supportedPieces.length === 0) {
                const stateWithLeftStartingCoord: PylosState = initialState.removePieceAt(move.startingCoord.get());
                return MGPFallible.success(stateWithLeftStartingCoord);
            } else {
                return MGPFallible.failure(PylosFailure.CANNOT_MOVE_SUPPORTING_PIECE());
            }
        }
        return MGPFallible.success(initialState);
    }
    private isLegalLandingCoord(move: PylosMove, stateAfterClimbStart: PylosState): MGPFallible<PylosState> {
        if (stateAfterClimbStart.getPieceAt(move.landingCoord).isPlayer()) {
            return MGPFallible.failure(RulesFailure.MUST_LAND_ON_EMPTY_SPACE());
        }
        if (stateAfterClimbStart.isLandable(move.landingCoord)) {
            return MGPFallible.success(stateAfterClimbStart.dropCurrentPlayersPieceAt(move.landingCoord));
        } else {
            return MGPFallible.failure(PylosFailure.SHOULD_HAVE_SUPPORTING_PIECES());
        }
    }
    private isLegalCaptures(move: PylosMove, postMoveState: PylosState): MGPValidation {
        if (move.firstCapture.isAbsent()) {
            return MGPValidation.SUCCESS;
        }
        if (PylosRules.canCapture(postMoveState, move.landingCoord) === false) {
            return MGPValidation.failure(PylosFailure.CANNOT_CAPTURE());
        }
        if (PylosRules.isValidCapture(postMoveState, move, move.firstCapture.get())) {
            const afterFirstCapture: PylosState = postMoveState.removePieceAt(move.firstCapture.get());
            if (move.secondCapture.isAbsent()) {
                return MGPValidation.SUCCESS;
            }
            if (PylosRules.isValidCapture(afterFirstCapture, move, move.secondCapture.get())) {
                return MGPValidation.SUCCESS;
            } else {
                return MGPValidation.failure(PylosFailure.INVALID_SECOND_CAPTURE());
            }
        } else {
            return MGPValidation.failure(PylosFailure.INVALID_FIRST_CAPTURE());
        }
    }
    public getGameStatus(node: PylosNode): GameStatus {
        return PylosRules.getGameStatus(node);
    }
}
