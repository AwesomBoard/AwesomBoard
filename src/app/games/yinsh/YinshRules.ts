import { Coord } from 'src/app/jscaip/Coord';
import { HexaDirection } from 'src/app/jscaip/HexaDirection';
import { HexaLine } from 'src/app/jscaip/HexaLine';
import { MGPNode } from 'src/app/jscaip/MGPNode';
import { Player } from 'src/app/jscaip/Player';
import { GameStatus, Rules } from 'src/app/jscaip/Rules';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { MGPOptional } from 'src/app/utils/MGPOptional';
import { MGPValidation } from 'src/app/utils/MGPValidation';
import { assert } from 'src/app/utils/utils';
import { YinshBoard } from './YinshBoard';
import { YinshFailure } from './YinshFailure';
import { YinshGameState } from './YinshGameState';
import { YinshLegalityStatus } from './YinshLegalityStatus';
import { YinshCapture, YinshMove } from './YinshMove';
import { YinshPiece } from './YinshPiece';

export class YinshNode extends MGPNode<YinshRules, YinshMove, YinshGameState> { }

export class YinshRules extends Rules<YinshMove, YinshGameState, YinshLegalityStatus> {
    public applyLegalMove(move: YinshMove, state: YinshGameState, status: YinshLegalityStatus): YinshGameState {
        let stateWithoutTurn: YinshGameState;
        if (status.computedState !== null) {
            stateWithoutTurn = status.computedState;
        } else if (move.isInitialPlacement()) {
            stateWithoutTurn = this.applyInitialPlacement(state, move.start);
        } else {
            const stateAfterInitialCaptures: YinshGameState =
                this.applyCaptures(state, move.initialCaptures);
            const stateAfterMoveAndFlip: YinshGameState =
                this.applyMoveAndFlip(stateAfterInitialCaptures, move.start, move.end.get());
            const stateAfterFinalCaptures: YinshGameState =
                this.applyCaptures(stateAfterMoveAndFlip, move.finalCaptures);
            stateWithoutTurn = stateAfterFinalCaptures;
        }
        return new YinshGameState(stateWithoutTurn.hexaBoard, stateWithoutTurn.sideRings, stateWithoutTurn.turn+1);
    }
    private applyInitialPlacement(state: YinshGameState, coord: Coord): YinshGameState {
        const player: number = state.getCurrentPlayer().value;
        assert(player < 2, 'YinshRules: state.getCurrentPlayer() can only return player 0 or 1');
        const piece: YinshPiece = YinshPiece.RINGS[player];
        const board: YinshBoard = state.hexaBoard.setAt(coord, piece);
        const sideRings: [number, number] = [state.sideRings[0], state.sideRings[1]];
        sideRings[player] -= 1;
        return new YinshGameState(board, sideRings, state.turn);
    }
    public applyCaptures(state: YinshGameState, captures: ReadonlyArray<YinshCapture>): YinshGameState {
        let computedState: YinshGameState = state;
        captures.forEach((capture: YinshCapture) => {
            computedState = this.applyCapture(computedState, capture);
        });
        return computedState;
    }
    public applyCapture(state: YinshGameState, capture: YinshCapture): YinshGameState {
        const player: number = state.getCurrentPlayer().value;
        let board: YinshBoard = state.hexaBoard;
        const sideRings: [number, number] = [state.sideRings[0], state.sideRings[1]];
        capture.forEach((coord: Coord) => {
            board = board.setAt(coord, YinshPiece.EMPTY);
        });
        sideRings[player] += 1;
        return new YinshGameState(board, sideRings, state.turn);
    }
    public applyMoveAndFlip(state: YinshGameState, start: Coord, end: Coord): YinshGameState {
        const player: number = state.getCurrentPlayer().value;
        let board: YinshBoard = state.hexaBoard;
        // Move ring from start (only the marker remains) to
        // end (only the ring can be there, as it must land on an empty space)
        board = board.setAt(start, YinshPiece.MARKERS[player]).setAt(end, YinshPiece.RINGS[player]);
        // Flip all pieces between start and end (both not included)
        const lineOpt: MGPOptional<HexaLine> = HexaLine.fromTwoCoords(start, end);
        assert(lineOpt.isPresent(), 'line should be valid by construction');
        const line: HexaLine = lineOpt.get();
        for (let coord: Coord = line.getEntrance(board).getNext(line.getDirection());
            coord.equals(end) === false;
            coord = coord.getNext(line.getDirection())) {
            const piece: YinshPiece = board.getAt(coord);
            board = board.setAt(coord, piece.flip());
        }
        return new YinshGameState(board, state.sideRings, state.turn);
    }
    public isLegal(move: YinshMove, state: YinshGameState): YinshLegalityStatus {
        if (move.isInitialPlacement()) {
            return { legal: this.initialPlacementValidity(state, move.start) };
        }
        const initialCapturesValidity: MGPValidation = this.capturesValidity(state, move.initialCaptures);
        if (initialCapturesValidity.isFailure()) {
            return { legal: initialCapturesValidity };
        }
        const stateAfterInitialCaptures: YinshGameState = this.applyCaptures(state, move.initialCaptures);

        const moveValidity: MGPValidation =
            this.moveValidity(stateAfterInitialCaptures, move.start, move.end.get());
        if (moveValidity.isFailure()) {
            return { legal: moveValidity };
        }
        const stateAfterMove: YinshGameState =
            this.applyMove(stateAfterInitialCaptures, move.start, move.end.get());

        const finalCapturesValidity: MGPValidation = this.capturesValidity(stateAfterMove, move.finalCaptures);
        if (finalCapturesValidity.isFailure()) {
            return { legal: finalCapturesValidity };
        }
        const stateAfterFinalCaptures: YinshGameState = this.applyCaptures(stateAfterMove, move.finalCaptures);

        const noMoreCapturesValidity: MGPValidation = this.noMoreCapturesValidity(stateAfterFinalCaptures);
        if (noMoreCapturesValidity.isFailure()) {
            return { legal: noMoreCapturesValidity };
        }

        return { legal: MGPValidation.SUCCESS, computedState: stateAfterFinalCaptures };
    }
    public initialPlacementValidity(state: YinshGameState, coord: Coord): MGPValidation {
        if (state.turn >= 10) {
            return MGPValidation.failure(YinshFailure.PLACEMENT_AFTER_INITIAL_PHASE);
        }
        if (state.hexaBoard.getAt(coord) !== YinshPiece.EMPTY) {
            return MGPValidation.failure(RulesFailure.MUST_CLICK_ON_EMPTY_CASE);
        }
        return MGPValidation.SUCCESS;
    }
    public moveStartValidity(state: YinshGameState, start: Coord): MGPValidation {
        const player: number = state.getCurrentPlayer().value;
        // Start coord has to contain a ring of the current player
        if (state.hexaBoard.getAt(start) !== YinshPiece.MARKERS[player]) {
            return MGPValidation.failure(YinshFailure.SHOULD_SELECT_PLAYER_RING);
        }
        return MGPValidation.SUCCESS;
    }
    public moveValidity(state: YinshGameState, start: Coord, end: Coord): MGPValidation {
        const moveStartValidity: MGPValidation = this.moveStartValidity(state, start);
        if (moveStartValidity.isFailure()) {
            return moveStartValidity;
        }
        // End coord has to be empty
        if (state.hexaBoard.getAt(end) !== YinshPiece.EMPTY) {
            return MGPValidation.failure(YinshFailure.SHOULD_END_MOVE_ON_EMPTY_CASE);
        }
        // There should only be markers between start and end
        // There cannot be rings between start and end
        const dir: HexaDirection = HexaDirection.factory.fromMove(start, end);
        for (let cur: Coord = start.getNext(dir);
            cur.equals(end) === false;
            cur = cur.getNext(dir)) {
            if (state.hexaBoard.getAt(cur).hasMarker === false || state.hexaBoard.getAt(cur).hasRing === true) {
                return MGPValidation.failure(YinshFailure.MOVE_SHOULD_PASS_ABOVE_MARKERS_ONLY);
            }
        }
    }
    public applyMove(state: YinshGameState, start: Coord, end: Coord): YinshGameState {
        let board: YinshBoard = state.hexaBoard
            .setAt(start, YinshPiece.EMPTY)
            .setAt(end, state.hexaBoard.getAt(start));
        const dir: HexaDirection = HexaDirection.factory.fromMove(start, end);
        for (let cur: Coord = start.getNext(dir);
            cur.equals(end) === false;
            cur = cur.getNext(dir)) {
            board = board.setAt(cur, board.getAt(cur).flip());
        }
        return new YinshGameState(board, state.sideRings, state.turn);
    }
    private capturesValidity(state: YinshGameState, captures: ReadonlyArray<YinshCapture>):
    MGPValidation {
        let updatedState: YinshGameState = state;
        for (const capture of captures) {
            const validity: MGPValidation = this.captureValidity(updatedState, capture);
            if (validity.isFailure()) {
                return validity;
            }
            updatedState = this.applyCapture(updatedState, capture);
        }
        return MGPValidation.SUCCESS;
    }
    public captureValidity(state: YinshGameState, capture: YinshCapture): MGPValidation {
        const player: number = state.getCurrentPlayer().value;
        // There should be exactly 5 cases, on the same line (invariant of YinshCapture)
        let prev: Coord = null;
        for (const coord of capture.capturedCases) {
            if (prev !== null) {
                // The 5 captured cases must contain markers of the current player
                if (state.hexaBoard.getAt(coord) !== YinshPiece.MARKERS[player]) {
                    return MGPValidation.failure(YinshFailure.CAN_ONLY_CAPTURE_YOUR_MARKERS);
                }
                // Captured cased must be consecutive
                if (prev.getDistance(coord) !== 1) {
                    return MGPValidation.failure(YinshFailure.HOLES_IN_CAPTURE);
                }
                prev = coord;
            }
        }
        return MGPValidation.SUCCESS;
    }
    private noMoreCapturesValidity(state: YinshGameState): MGPValidation {
        const player: Player = state.getCurrentPlayer();
        const linePortions: ReadonlyArray<{ start: Coord, end: Coord, dir: HexaDirection}> =
            this.getLinePortionsWithAtLeastFivePiecesOfPlayer(state, player);
        if (linePortions.length === 0) {
            return MGPValidation.SUCCESS;
        } else {
            return MGPValidation.failure(YinshFailure.MISSING_CAPTURES);
        }
    }
    public getLinePortionsWithAtLeastFivePiecesOfPlayer(state: YinshGameState, player: Player):
    ReadonlyArray<{ start: Coord, end: Coord, dir: HexaDirection}> {
        const linePortions: { start: Coord, end: Coord, dir: HexaDirection}[] = [];
        state.hexaBoard.allLines().forEach((line: HexaLine) => {
            const linePortion: MGPOptional<{ start: Coord, end: Coord, dir: HexaDirection}> =
                this.getLinePortionWithAtLeastFivePiecesOfPlayer(state, player, line);
            if (linePortion.isPresent()) {
                linePortions.push(linePortion.get());
            }
        });
        return linePortions;
    }
    public getLinePortionWithAtLeastFivePiecesOfPlayer(state: YinshGameState, player: Player, line: HexaLine)
    : MGPOptional<{ start: Coord, end: Coord, dir: HexaDirection}>
    {
        let consecutives: number = 0;
        const coord: Coord = line.getEntrance(state.hexaBoard);
        const dir: HexaDirection = line.getDirection();
        let start: Coord = coord;
        let cur: Coord;
        for (cur = coord; state.hexaBoard.isOnBoard(cur); cur = cur.getNext(dir)) {
            if (state.hexaBoard.getAt(cur).player === player) {
                if (consecutives === 0) {
                    start = cur;
                }
                consecutives += 1;
            } else {
                if (consecutives >= 5) {
                    // There can only be one portion with at least 5 pieces
                    return MGPOptional.of({ start, end: cur, dir });
                }
                consecutives = 0;
            }
        }
        if (consecutives >= 5) {
            return MGPOptional.of({ start, end: cur, dir });
        }
        return MGPOptional.empty();
    }
    public getPossibleCaptures(state: YinshGameState): YinshCapture[] {
        const player: Player = state.getCurrentPlayer();
        const captures: YinshCapture[] = [];
        this.getLinePortionsWithAtLeastFivePiecesOfPlayer(state, player)
            .forEach((linePortion: { start: Coord, end: Coord, dir: HexaDirection}) => {
                for (let cur: Coord = linePortion.start;
                    cur.getDistance(linePortion.end) >= 5;
                    cur = cur.getNext(linePortion.dir)) {
                    captures.push(YinshCapture.from(cur, cur.getNext(linePortion.dir, 5)));
                }
            });
        return captures;
    }
    public getGameStatus(node: YinshNode): GameStatus {
        if (node.gamePartSlice.turn < 10) {
            // Still in initial placing phase
            return GameStatus.ONGOING;
        }
        if (node.gamePartSlice.sideRings[0] >= 3) {
            return GameStatus.ZERO_WON;
        }
        if (node.gamePartSlice.sideRings[1] >= 3) {
            return GameStatus.ONE_WON;
        }
        return GameStatus.ONGOING;
    }
}
