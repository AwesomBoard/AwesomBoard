import { Coord } from 'src/app/jscaip/Coord';
import { MGPNode } from 'src/app/jscaip/MGPNode';
import { Rules } from 'src/app/jscaip/Rules';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { Utils, display } from 'src/app/utils/utils';
import { CoerceoMove } from './CoerceoMove';
import { CoerceoState } from './CoerceoState';
import { CoerceoFailure } from './CoerceoFailure';
import { FourStatePiece } from 'src/app/jscaip/FourStatePiece';
import { MGPValidation } from 'src/app/utils/MGPValidation';
import { GameStatus } from 'src/app/jscaip/GameStatus';
import { MGPOptional } from 'src/app/utils/MGPOptional';
import { assert } from 'src/app/utils/assert';

export class CoerceoNode extends MGPNode<CoerceoRules, CoerceoMove, CoerceoState> {}

export class CoerceoRules extends Rules<CoerceoMove, CoerceoState> {

    public static VERBOSE: boolean = false;

    private static singleton: MGPOptional<CoerceoRules> = MGPOptional.empty();

    public static get(): CoerceoRules {
        if (CoerceoRules.singleton.isAbsent()) {
            CoerceoRules.singleton = MGPOptional.of(new CoerceoRules());
        }
        return CoerceoRules.singleton.get();
    }
    private constructor() {
        super(CoerceoState);
    }
    public applyLegalMove(move: CoerceoMove, state: CoerceoState, _info: void): CoerceoState
    {
        if (move.isTileExchange()) {
            return this.applyLegalTileExchange(move, state);
        } else {
            return this.applyLegalMovement(move, state);
        }
    }
    public applyLegalTileExchange(move: CoerceoMove, state: CoerceoState): CoerceoState
    {
        const newBoard: FourStatePiece[][] = state.getCopiedBoard();
        const captured: Coord = move.capture.get();
        newBoard[captured.y][captured.x] = FourStatePiece.EMPTY;
        const newCaptures: [number, number] = [state.captures[0], state.captures[1]];
        newCaptures[state.getCurrentPlayer().value] += 1;
        const newTiles: [number, number] = [state.tiles[0], state.tiles[1]];
        newTiles[state.getCurrentPlayer().value] -= 2;
        const afterCapture: CoerceoState = new CoerceoState(newBoard,
                                                            state.turn,
                                                            newTiles,
                                                            newCaptures);
        const afterTileRemoval: CoerceoState = afterCapture.removeTilesIfNeeded(captured, false);
        const resultingState: CoerceoState = new CoerceoState(afterTileRemoval.getCopiedBoard(),
                                                              afterTileRemoval.turn + 1,
                                                              afterTileRemoval.tiles,
                                                              afterTileRemoval.captures);
        display(CoerceoRules.VERBOSE,
                { coerceoRules_applyLegalTileExchange:
                    { a_initialState: state, afterCapture, afterTileRemoval, resultingState } });
        return resultingState;
    }
    public applyLegalMovement(move: CoerceoMove, state: CoerceoState): CoerceoState
    {
        // Move the piece
        const afterMovement: CoerceoState = state.applyLegalMovement(move);
        // removes emptied tiles
        const afterTilesRemoved: CoerceoState = afterMovement.removeTilesIfNeeded(move.start.get(), true);
        // removes captured pieces
        const afterCaptures: CoerceoState = afterTilesRemoved.doMovementCaptures(move);
        const resultingState: CoerceoState = new CoerceoState(afterCaptures.board,
                                                              state.turn + 1,
                                                              afterCaptures.tiles,
                                                              afterCaptures.captures);
        display(CoerceoRules.VERBOSE, {
            ab_state: state,
            afterMovement,
            afterTilesRemoved,
            afterCaptures,
            resultingState });
        return resultingState;
    }
    public isLegal(move: CoerceoMove, state: CoerceoState): MGPValidation {
        if (move.isTileExchange()) {
            return this.isLegalTileExchange(move, state);
        } else {
            return this.isLegalMovement(move, state);
        }
    }
    public isLegalTileExchange(move: CoerceoMove, state: CoerceoState): MGPValidation {
        if (state.tiles[state.getCurrentPlayer().value] < 2) {
            return MGPValidation.failure(CoerceoFailure.NOT_ENOUGH_TILES_TO_EXCHANGE());
        }
        const captured: FourStatePiece = state.getPieceAt(move.capture.get());
        if (captured === FourStatePiece.UNREACHABLE ||
            captured === FourStatePiece.EMPTY)
        {
            return MGPValidation.failure(CoerceoFailure.CANNOT_CAPTURE_FROM_EMPTY());
        }
        if (captured.is(state.getCurrentPlayer())) {
            return MGPValidation.failure(RulesFailure.CANNOT_SELF_CAPTURE());
        }
        return MGPValidation.SUCCESS;
    }
    public isLegalMovement(move: CoerceoMove, state: CoerceoState): MGPValidation {
        Utils.assert(state.getPieceAt(move.start.get()) !== FourStatePiece.UNREACHABLE,
                     'Cannot start with a coord outside the board ' + move.start.get().toString() + '.');
        Utils.assert(state.getPieceAt(move.landingCoord.get()) !== FourStatePiece.UNREACHABLE,
                     'Cannot end with a coord outside the board ' + move.landingCoord.get().toString() + '.');
        const starter: FourStatePiece = state.getPieceAt(move.start.get());
        if (starter === FourStatePiece.EMPTY) {
            return MGPValidation.failure(RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_EMPTY());
        }
        if (starter.is(state.getCurrentOpponent())) {
            return MGPValidation.failure(RulesFailure.CANNOT_CHOOSE_OPPONENT_PIECE());
        }
        const lander: FourStatePiece = state.getPieceAt(move.landingCoord.get());
        if (lander.is(state.getCurrentPlayer())) {
            return MGPValidation.failure(RulesFailure.MUST_LAND_ON_EMPTY_SPACE());
        }
        return MGPValidation.SUCCESS;
    }
    public static getGameStatus(node: CoerceoNode): GameStatus {
        const state: CoerceoState = node.gameState;
        if (state.captures[0] >= 18) {
            return GameStatus.ZERO_WON;
        }
        if (state.captures[1] >= 18) {
            return GameStatus.ONE_WON;
        }
        return GameStatus.ONGOING;
    }
    public getGameStatus(node: CoerceoNode): GameStatus {
        return CoerceoRules.getGameStatus(node);
    }
}
