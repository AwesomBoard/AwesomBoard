import { Coord } from 'src/app/jscaip/Coord';
import { HexaDirection } from 'src/app/jscaip/HexaDirection';
import { HexaLine } from 'src/app/jscaip/HexaLine';
import { FlatHexaOrientation } from 'src/app/jscaip/HexaOrientation';
import { MGPNode } from 'src/app/jscaip/MGPNode';
import { Player } from 'src/app/jscaip/Player';
import { GameStatus, Rules } from 'src/app/jscaip/Rules';
import { assert } from 'src/app/utils/utils';
import { MGPOptional } from 'src/app/utils/MGPOptional';
import { MGPValidation } from 'src/app/utils/MGPValidation';
import { GipfCapture, GipfMove, GipfPlacement } from './GipfMove';
import { GipfState } from './GipfState';
import { GipfLegalityStatus } from './GipfLegalityStatus';
import { GipfPiece } from './GipfPiece';
import { GipfBoard } from './GipfBoard';
import { GipfFailure } from './GipfFailure';

export class GipfNode extends MGPNode<GipfRules, GipfMove, GipfState> {}

export class GipfRules extends Rules<GipfMove, GipfState, GipfLegalityStatus> {

    public applyLegalMove(move: GipfMove, state: GipfState, status: GipfLegalityStatus): GipfState {
        let stateWithoutTurn: GipfState;
        if (status.computedState == null) {
            const stateAfterInitialCapture: GipfState =
                GipfRules.applyCaptures(state, move.initialCaptures);
            const stateAfterPlacement: GipfState =
                GipfRules.applyPlacement(stateAfterInitialCapture, move.placement);
            const stateAfterFinalCapture: GipfState =
                GipfRules.applyCaptures(stateAfterPlacement, move.finalCaptures);
            stateWithoutTurn = stateAfterFinalCapture;
        } else {
            stateWithoutTurn = status.computedState;
        }
        return new GipfState(stateWithoutTurn.board,
                             stateWithoutTurn.turn + 1,
                             stateWithoutTurn.sidePieces,
                             stateWithoutTurn.capturedPieces);
    }
    public static applyCaptures(state: GipfState, captures: ReadonlyArray<GipfCapture>)
    : GipfState
    {
        let computedState: GipfState = state;
        captures.forEach((capture: GipfCapture) => {
            computedState = GipfRules.applyCapture(computedState, capture);
        });
        return computedState;
    }
    public static applyCapture(state: GipfState, capture: GipfCapture): GipfState {
        const player: Player = state.getCurrentPlayer();
        let board: GipfBoard = state.board;
        const sidePieces: [number, number] = [state.sidePieces[0], state.sidePieces[1]];
        const capturedPieces: [number, number] = [state.capturedPieces[0], state.capturedPieces[1]];
        capture.forEach((coord: Coord) => {
            const piece: GipfPiece = board.getAt(coord);
            board = board.setAt(coord, GipfPiece.EMPTY);
            if (piece.player === player) {
                sidePieces[player.value] += 1;
            } else {
                capturedPieces[player.value] += 1;
            }
        });
        return new GipfState(board, state.turn, sidePieces, capturedPieces);
    }
    public static getPlacements(state: GipfState): GipfPlacement[] {
        const placements: GipfPlacement[] = [];
        FlatHexaOrientation.INSTANCE.getAllBorders(state.board).forEach((entrance: Coord) => {
            if (state.board.getAt(entrance) === GipfPiece.EMPTY) {
                placements.push(new GipfPlacement(entrance, MGPOptional.empty()));
            } else {
                GipfRules.getAllDirectionsForEntrance(state, entrance).forEach((dir: HexaDirection) => {
                    if (GipfRules.isLineComplete(state, entrance, dir) === false) {
                        placements.push(new GipfPlacement(entrance, MGPOptional.of(dir)));
                    }
                });
            }
        });
        return placements;
    }
    public static isLineComplete(state: GipfState, start: Coord, dir: HexaDirection): boolean {
        return GipfRules.nextGapInLine(state, start, dir).isAbsent();
    }
    private static nextGapInLine(state: GipfState, start: Coord, dir: HexaDirection): MGPOptional<Coord> {
        for (let cur: Coord = start; state.board.isOnBoard(cur); cur = cur.getNext(dir)) {
            if (state.board.getAt(cur) === GipfPiece.EMPTY) {
                return MGPOptional.of(cur);
            }
        }
        return MGPOptional.empty();
    }
    public static applyPlacement(state: GipfState, placement: GipfPlacement): GipfState {
        const player: Player = state.getCurrentPlayer();
        let board: GipfBoard = state.board;
        let prevPiece: GipfPiece = GipfPiece.ofPlayer(state.getCurrentPlayer());
        if (placement.direction.isAbsent()) {
            // Only valid if there is an empty spot
            const coord: Coord = placement.coord;
            if (board.getAt(coord) !== GipfPiece.EMPTY) {
                throw new Error('Apply placement called without direction while the coord is occupied');
            }
            board = board.setAt(coord, prevPiece);
        } else {
            for (let cur: Coord = placement.coord;
                board.isOnBoard(cur) && prevPiece !== GipfPiece.EMPTY;
                cur = cur.getNext(placement.direction.get())) {
                const curPiece: GipfPiece = board.getAt(cur);
                board = board.setAt(cur, prevPiece);
                prevPiece = curPiece;
            }
        }
        const sidePieces: [number, number] = [state.sidePieces[0], state.sidePieces[1]];
        sidePieces[player.value] -= 1;
        return new GipfState(board, state.turn, sidePieces, state.capturedPieces);
    }
    public getPiecesMoved(state: GipfState,
                          initialCaptures: ReadonlyArray<GipfCapture>,
                          placement: GipfPlacement): Coord[] {
        const stateAfterCapture: GipfState = GipfRules.applyCaptures(state, initialCaptures);
        if (placement.direction.isAbsent()) {
            return [placement.coord];
        } else {
            const dir: HexaDirection = placement.direction.get();
            const moved: Coord[] = [];
            moved.push(placement.coord);
            let cur: Coord = placement.coord.getNext(dir);
            while (stateAfterCapture.board.isOnBoard(cur) &&
                stateAfterCapture.board.getAt(cur) !== GipfPiece.EMPTY) {
                moved.push(cur);
                cur = cur.getNext(dir);
            }
            assert(stateAfterCapture.board.isOnBoard(cur) &&
                   stateAfterCapture.board.getAt(cur) === GipfPiece.EMPTY,
                   'getPiecesMoved called with an invalid placement performed on a full line');
            // This is the case filled by the last pushed piece
            moved.push(cur);
            return moved;
        }
    }
    public static getAllDirectionsForEntrance(state: GipfState, entrance: Coord): HexaDirection[] {
        if (FlatHexaOrientation.INSTANCE.isTopLeftCorner(state.board, entrance)) {
            return [HexaDirection.RIGHT, HexaDirection.DOWN, HexaDirection.UP_RIGHT];
        } else if (FlatHexaOrientation.INSTANCE.isTopCorner(state.board, entrance)) {
            return [HexaDirection.DOWN, HexaDirection.DOWN_LEFT, HexaDirection.RIGHT];
        } else if (FlatHexaOrientation.INSTANCE.isTopRightCorner(state.board, entrance)) {
            return [HexaDirection.DOWN_LEFT, HexaDirection.DOWN, HexaDirection.LEFT];
        } else if (FlatHexaOrientation.INSTANCE.isBottomLeftCorner(state.board, entrance)) {
            return [HexaDirection.UP_RIGHT, HexaDirection.UP, HexaDirection.RIGHT];
        } else if (FlatHexaOrientation.INSTANCE.isBottomCorner(state.board, entrance)) {
            return [HexaDirection.UP, HexaDirection.LEFT, HexaDirection.UP_RIGHT];
        } else if (FlatHexaOrientation.INSTANCE.isBottomRightCorner(state.board, entrance)) {
            return [HexaDirection.LEFT, HexaDirection.UP, HexaDirection.DOWN_LEFT];
        } else if (FlatHexaOrientation.INSTANCE.isOnTopLeftBorder(state.board, entrance)) {
            return [HexaDirection.RIGHT, HexaDirection.DOWN];
        } else if (FlatHexaOrientation.INSTANCE.isOnLeftBorder(state.board, entrance)) {
            return [HexaDirection.UP_RIGHT, HexaDirection.RIGHT];
        } else if (FlatHexaOrientation.INSTANCE.isOnBottomLeftBorder(state.board, entrance)) {
            return [HexaDirection.UP, HexaDirection.UP_RIGHT];
        } else if (FlatHexaOrientation.INSTANCE.isOnBottomRightBorder(state.board, entrance)) {
            return [HexaDirection.LEFT, HexaDirection.UP];
        } else if (FlatHexaOrientation.INSTANCE.isOnRightBorder(state.board, entrance)) {
            return [HexaDirection.LEFT, HexaDirection.DOWN_LEFT];
        } else if (FlatHexaOrientation.INSTANCE.isOnTopRightBorder(state.board, entrance)) {
            return [HexaDirection.DOWN_LEFT, HexaDirection.DOWN];
        } else {
            throw new Error('not a border');
        }
    }
    public isLegal(move: GipfMove, state: GipfState): GipfLegalityStatus {
        const initialCapturesValidity: MGPValidation = this.capturesValidity(state, move.initialCaptures);
        if (initialCapturesValidity.isFailure()) {
            return { legal: initialCapturesValidity };
        }
        const stateAfterInitialCaptures: GipfState = GipfRules.applyCaptures(state, move.initialCaptures);

        const noMoreCaptureAfterInitialValidity: MGPValidation = this.noMoreCapturesValidity(stateAfterInitialCaptures);
        if (noMoreCaptureAfterInitialValidity.isFailure()) {
            return { legal: noMoreCaptureAfterInitialValidity };
        }

        const placementValidity: MGPValidation =
            this.placementValidity(stateAfterInitialCaptures, move.placement);
        if (placementValidity.isFailure()) {
            return { legal: placementValidity };
        }
        const stateAfterPlacement: GipfState =
            GipfRules.applyPlacement(stateAfterInitialCaptures, move.placement);

        const finalCapturesValidity: MGPValidation =
            this.capturesValidity(stateAfterPlacement, move.finalCaptures);
        if (finalCapturesValidity.isFailure()) {
            return { legal: finalCapturesValidity };
        }

        const stateAfterFinalCaptures: GipfState =
            GipfRules.applyCaptures(stateAfterPlacement, move.finalCaptures);
        const noMoreCaptureAfterFinalValidity: MGPValidation =
            this.noMoreCapturesValidity(stateAfterFinalCaptures);
        if (noMoreCaptureAfterFinalValidity.isFailure()) {
            return { legal: noMoreCaptureAfterFinalValidity };
        }

        return { legal: MGPValidation.SUCCESS, computedState: stateAfterFinalCaptures };
    }
    private capturesValidity(state: GipfState, captures: ReadonlyArray<GipfCapture>)
    : MGPValidation
    {
        let updatedState: GipfState = state;
        for (const capture of captures) {
            const validity: MGPValidation = this.captureValidity(updatedState, capture);
            if (validity.isFailure()) {
                return validity;
            }
            updatedState = GipfRules.applyCapture(updatedState, capture);
        }
        return MGPValidation.SUCCESS;
    }
    public captureValidity(state: GipfState, capture: GipfCapture): MGPValidation {
        const player: Player = state.getCurrentPlayer();
        const linePortionOpt: MGPOptional<{ 0: Coord, 1: Coord, 2: HexaDirection}> =
            GipfRules.getLinePortionWithFourPiecesOfPlayer(state, player, capture.getLine());
        if (linePortionOpt.isAbsent()) {
            return MGPValidation.failure(GipfFailure.CAPTURE_MUST_BE_ALIGNED);
        }

        const linePortion: { 0: Coord, 1: Coord, 2: HexaDirection} = linePortionOpt.get();

        const capturable: GipfCapture = GipfRules.getCapturable(state, linePortion);
        if (capturable.equals(capture)) {
            return MGPValidation.SUCCESS;
        } else {
            return MGPValidation.failure(GipfFailure.INVALID_CAPTURED_PIECES);
        }
    }
    public static getLinePortionsWithFourPiecesOfPlayer(state: GipfState, player: Player):
    ReadonlyArray<{ 0: Coord, 1: Coord, 2: HexaDirection}> {
        const linePortions: { 0: Coord, 1: Coord, 2: HexaDirection}[] = [];
        state.board.allLines().forEach((line: HexaLine) => {
            const linePortion: MGPOptional<{ 0: Coord, 1: Coord, 2: HexaDirection}> =
                GipfRules.getLinePortionWithFourPiecesOfPlayer(state, player, line);
            if (linePortion.isPresent()) {
                linePortions.push(linePortion.get());
            }
        });
        return linePortions;
    }
    public static getLinePortionWithFourPiecesOfPlayer(state: GipfState, player: Player, line: HexaLine)
    : MGPOptional<{ 0: Coord, 1: Coord, 2: HexaDirection}>
    {
        let consecutives: number = 0;
        const coord: Coord = state.board.getEntranceOnLine(line);
        const dir: HexaDirection = line.getDirection();
        let start: Coord = coord;
        for (let cur: Coord = coord; state.board.isOnBoard(cur); cur = cur.getNext(dir)) {
            if (state.board.getAt(cur).player === player) {
                if (consecutives === 0) {
                    start = cur;
                }
                consecutives += 1;
            } else {
                consecutives = 0;
            }
            if (consecutives === 4) {
                return MGPOptional.of({ 0: start, 1: cur, 2: dir });
            }
        }
        return MGPOptional.empty();
    }
    private noMoreCapturesValidity(state: GipfState): MGPValidation {
        const player: Player = state.getCurrentPlayer();
        const linePortions: ReadonlyArray<{ 0: Coord, 1: Coord, 2: HexaDirection}> =
            GipfRules.getLinePortionsWithFourPiecesOfPlayer(state, player);
        if (linePortions.length === 0) {
            return MGPValidation.SUCCESS;
        } else {
            return MGPValidation.failure(GipfFailure.MISSING_CAPTURES);
        }
    }
    public placementValidity(state: GipfState, placement: GipfPlacement): MGPValidation {
        const coordValidity: MGPValidation = this.placementCoordValidity(state, placement.coord);
        if (coordValidity.isFailure()) {
            return coordValidity;
        }
        if (state.board.getAt(placement.coord) !== GipfPiece.EMPTY) {
            if (placement.direction.isAbsent()) {
                return MGPValidation.failure(GipfFailure.PLACEMENT_WITHOUT_DIRECTION);
            }
            if (GipfRules.isLineComplete(state, placement.coord, placement.direction.get())) {
                return MGPValidation.failure(GipfFailure.PLACEMENT_ON_COMPLETE_LINE);
            }
            for (const dir of GipfRules.getAllDirectionsForEntrance(state, placement.coord)) {
                if (dir === placement.direction.get()) {
                    return MGPValidation.SUCCESS;
                }
            }
            return MGPValidation.failure(GipfFailure.INVALID_PLACEMENT_DIRECTION);
        }
        return MGPValidation.SUCCESS;
    }
    public placementCoordValidity(state: GipfState, coord: Coord): MGPValidation {
        if (FlatHexaOrientation.INSTANCE.isOnBorder(state.board, coord)) {
            return MGPValidation.SUCCESS;
        } else {
            return MGPValidation.failure(GipfFailure.PLACEMENT_NOT_ON_BORDER);
        }
    }
    public static getCapturable(state: GipfState,
                                linePortion: { 0: Coord, 1: Coord, 2: HexaDirection})
    : GipfCapture
    {
        // Go into each direction and continue until there are pieces
        const capturable: Coord[] = [];
        const start: Coord = linePortion[0];
        const end: Coord = linePortion[1];
        const dir: HexaDirection = linePortion[2];
        const oppositeDir: HexaDirection = dir.getOpposite();
        for (let cur: Coord = start.getNext(oppositeDir);
            state.board.isOnBoard(cur) && state.board.getAt(cur) !== GipfPiece.EMPTY;
            cur = cur.getNext(oppositeDir))
        {
            // Go backwards to identify capturable pieces before the 4 aligned pieces
            capturable.push(cur);
        }
        for (let cur: Coord = start; !cur.equals(end); cur = cur.getNext(dir)) {
            // The 4 pieces are capturable
            capturable.push(cur);
        }
        for (let cur: Coord = end;
            state.board.isOnBoard(cur) && state.board.getAt(cur) !== GipfPiece.EMPTY;
            cur = cur.getNext(dir))
        {
            // Go forward to identify capturable pieces after the 4 aligned pieces
            capturable.push(cur);
        }
        return new GipfCapture(capturable);
    }
    public static getPossibleCaptures(state: GipfState): GipfCapture[] {
        const player: Player = state.getCurrentPlayer();
        const captures: GipfCapture[] = [];
        GipfRules.getLinePortionsWithFourPiecesOfPlayer(state, player)
            .forEach((linePortion: { 0: Coord, 1: Coord, 2: HexaDirection}) => {
                captures.push(GipfRules.getCapturable(state, linePortion));
            });
        return captures;
    }
    public static getPlayerScore(state: GipfState, player: Player): MGPOptional<number> {
        const piecesToPlay: number = state.getNumberOfPiecesToPlace(player);
        if (piecesToPlay === 0) {
            const captures: GipfCapture[] = GipfRules.getPossibleCaptures(state);
            if (captures.length === 0) {
                // No more pieces to play and no possible capture, player loses
                return MGPOptional.empty();
            }
        }
        const captured: number = state.getNumberOfPiecesCaptured(player);
        return MGPOptional.of(piecesToPlay + captured * 3);
    }
    public static isGameOver(state: GipfState): boolean {
        const score0: MGPOptional<number> = GipfRules.getPlayerScore(state, Player.ZERO);
        const score1: MGPOptional<number> = GipfRules.getPlayerScore(state, Player.ONE);
        return score0.isAbsent() ||
               score1.isAbsent();
    }
    public getGameStatus(node: GipfNode): GameStatus {
        const state: GipfState = node.gameState;
        const score0: MGPOptional<number> = GipfRules.getPlayerScore(state, Player.ZERO);
        const score1: MGPOptional<number> = GipfRules.getPlayerScore(state, Player.ONE);
        if (score0.isAbsent()) {
            return GameStatus.ONE_WON;
        } else if (score1.isAbsent()) {
            return GameStatus.ZERO_WON;
        } else {
            return GameStatus.ONGOING;
        }
    }
}
