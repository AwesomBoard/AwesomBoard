import { Coord } from 'src/app/jscaip/Coord';
import { HexaDirection } from 'src/app/jscaip/HexaDirection';
import { HexaLine } from 'src/app/jscaip/HexaLine';
import { FlatHexaOrientation } from 'src/app/jscaip/HexaOrientation';
import { GameNode } from 'src/app/jscaip/AI/GameNode';
import { Player } from 'src/app/jscaip/Player';
import { Rules } from 'src/app/jscaip/Rules';
import { MGPFallible, MGPOptional, MGPValidation, Utils } from '@everyboard/lib';
import { GipfMove, GipfPlacement } from './GipfMove';
import { GipfState } from './GipfState';
import { FourStatePiece } from 'src/app/jscaip/FourStatePiece';
import { GipfFailure } from './GipfFailure';
import { GameStatus } from 'src/app/jscaip/GameStatus';
import { GipfCapture } from 'src/app/jscaip/GipfProjectHelper';
import { Table } from 'src/app/jscaip/TableUtils';
import { NoConfig } from 'src/app/jscaip/RulesConfigUtil';
import { PlayerNumberMap } from 'src/app/jscaip/PlayerMap';

export type GipfLegalityInformation = GipfState

export class GipfNode extends GameNode<GipfMove, GipfState> {}

export class GipfRules extends Rules<GipfMove, GipfState, GipfLegalityInformation> {

    private static singleton: MGPOptional<GipfRules> = MGPOptional.empty();

    public static get(): GipfRules {
        if (GipfRules.singleton.isAbsent()) {
            GipfRules.singleton = MGPOptional.of(new GipfRules());
        }
        return GipfRules.singleton.get();
    }

    public override getInitialState(): GipfState {
        const _: FourStatePiece = FourStatePiece.EMPTY;
        const N: FourStatePiece = FourStatePiece.UNREACHABLE;
        const O: FourStatePiece = FourStatePiece.ZERO;
        const X: FourStatePiece = FourStatePiece.ONE;
        const board: Table<FourStatePiece> = [
            [N, N, N, X, _, _, O],
            [N, N, _, _, _, _, _],
            [N, _, _, _, _, _, _],
            [O, _, _, _, _, _, X],
            [_, _, _, _, _, _, N],
            [_, _, _, _, _, N, N],
            [X, _, _, O, N, N, N],
        ];
        return new GipfState(board, 0, PlayerNumberMap.of(12, 12), PlayerNumberMap.of(0, 0));
    }

    public override applyLegalMove(_move: GipfMove,
                                   _state: GipfState,
                                   _config: NoConfig,
                                   computedState: GipfLegalityInformation)
    : GipfState
    {
        return new GipfState(computedState.board,
                             computedState.turn + 1,
                             computedState.sidePieces,
                             computedState.capturedPieces);
    }

    public static applyCaptures(captures: ReadonlyArray<GipfCapture>, state: GipfState)
    : GipfState
    {
        let computedState: GipfState = state;
        captures.forEach((capture: GipfCapture) => {
            computedState = GipfRules.applyCapture(capture, computedState);
        });
        return computedState;
    }

    public static applyCapture(capture: GipfCapture, state: GipfState): GipfState {
        const player: Player = state.getCurrentPlayer();
        let newState: GipfState = state;
        const sidePieces: PlayerNumberMap = state.sidePieces.getCopy();
        const capturedPieces: PlayerNumberMap = state.capturedPieces.getCopy();
        capture.forEach((coord: Coord) => {
            const piece: FourStatePiece = state.getPieceAt(coord);
            newState = newState.setAt(coord, FourStatePiece.EMPTY);
            if (piece.is(player)) {
                sidePieces.add(player, 1);
            } else {
                capturedPieces.add(player, 1);
            }
        });
        return new GipfState(newState.board, state.turn, sidePieces, capturedPieces);
    }

    public static getPlacements(state: GipfState): GipfPlacement[] {
        const placements: GipfPlacement[] = [];
        FlatHexaOrientation.INSTANCE.getAllBorders(state).forEach((entrance: Coord) => {
            if (state.getPieceAt(entrance) === FourStatePiece.EMPTY) {
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
        for (let cur: Coord = start; state.isOnBoard(cur); cur = cur.getNext(dir)) {
            if (state.getPieceAt(cur) === FourStatePiece.EMPTY) {
                return MGPOptional.of(cur);
            }
        }
        return MGPOptional.empty();
    }

    public static applyPlacement(placement: GipfPlacement, state: GipfState): GipfState {
        const player: Player = state.getCurrentPlayer();
        let newState: GipfState = state;
        let previousPiece: FourStatePiece = FourStatePiece.ofPlayer(state.getPreviousOpponent());
        if (placement.direction.isAbsent()) {
            // Only valid if there is an empty spot
            const coord: Coord = placement.coord;
            if (state.getPieceAt(coord) !== FourStatePiece.EMPTY) {
                throw new Error('Apply placement called without direction while the coord is occupied');
            }
            newState = newState.setAt(coord, previousPiece);
        } else {
            for (
                let cur: Coord = placement.coord;
                newState.isOnBoard(cur) && previousPiece !== FourStatePiece.EMPTY;
                cur = cur.getNext(placement.direction.get()))
            {
                const curPiece: FourStatePiece = state.getPieceAt(cur);
                newState = newState.setAt(cur, previousPiece);
                previousPiece = curPiece;
            }
        }
        const sidePieces: PlayerNumberMap = state.sidePieces.getCopy();
        sidePieces.add(player, -1);
        return new GipfState(newState.board, state.turn, sidePieces, state.capturedPieces);
    }

    public getPiecesMoved(state: GipfState,
                          initialCaptures: ReadonlyArray<GipfCapture>,
                          placement: GipfPlacement): Coord[] {
        const stateAfterCapture: GipfState = GipfRules.applyCaptures(initialCaptures, state);
        if (placement.direction.isAbsent()) {
            return [placement.coord];
        } else {
            const dir: HexaDirection = placement.direction.get();
            const moved: Coord[] = [];
            moved.push(placement.coord);
            let cur: Coord = placement.coord.getNext(dir);
            while (stateAfterCapture.isOnBoard(cur) &&
                stateAfterCapture.getPieceAt(cur) !== FourStatePiece.EMPTY) {
                moved.push(cur);
                cur = cur.getNext(dir);
            }
            Utils.assert(stateAfterCapture.isOnBoard(cur) &&
                         stateAfterCapture.getPieceAt(cur) === FourStatePiece.EMPTY,
                         'getPiecesMoved called with an invalid placement performed on a full line');
            // This is the space filled by the last pushed piece
            moved.push(cur);
            return moved;
        }
    }

    public static getAllDirectionsForEntrance(state: GipfState, entrance: Coord): HexaDirection[] {
        if (FlatHexaOrientation.INSTANCE.isTopLeftCorner(state, entrance)) {
            return [HexaDirection.RIGHT, HexaDirection.DOWN, HexaDirection.UP_RIGHT];
        } else if (FlatHexaOrientation.INSTANCE.isTopCorner(state, entrance)) {
            return [HexaDirection.DOWN, HexaDirection.DOWN_LEFT, HexaDirection.RIGHT];
        } else if (FlatHexaOrientation.INSTANCE.isTopRightCorner(state, entrance)) {
            return [HexaDirection.DOWN_LEFT, HexaDirection.DOWN, HexaDirection.LEFT];
        } else if (FlatHexaOrientation.INSTANCE.isBottomLeftCorner(state, entrance)) {
            return [HexaDirection.UP_RIGHT, HexaDirection.UP, HexaDirection.RIGHT];
        } else if (FlatHexaOrientation.INSTANCE.isBottomCorner(state, entrance)) {
            return [HexaDirection.UP, HexaDirection.LEFT, HexaDirection.UP_RIGHT];
        } else if (FlatHexaOrientation.INSTANCE.isBottomRightCorner(state, entrance)) {
            return [HexaDirection.LEFT, HexaDirection.UP, HexaDirection.DOWN_LEFT];
        } else if (FlatHexaOrientation.INSTANCE.isOnTopLeftBorder(state, entrance)) {
            return [HexaDirection.RIGHT, HexaDirection.DOWN];
        } else if (FlatHexaOrientation.INSTANCE.isOnLeftBorder(state, entrance)) {
            return [HexaDirection.UP_RIGHT, HexaDirection.RIGHT];
        } else if (FlatHexaOrientation.INSTANCE.isOnBottomLeftBorder(state, entrance)) {
            return [HexaDirection.UP, HexaDirection.UP_RIGHT];
        } else if (FlatHexaOrientation.INSTANCE.isOnBottomRightBorder(state, entrance)) {
            return [HexaDirection.LEFT, HexaDirection.UP];
        } else if (FlatHexaOrientation.INSTANCE.isOnRightBorder(state, entrance)) {
            return [HexaDirection.LEFT, HexaDirection.DOWN_LEFT];
        } else if (FlatHexaOrientation.INSTANCE.isOnTopRightBorder(state, entrance)) {
            return [HexaDirection.DOWN_LEFT, HexaDirection.DOWN];
        } else {
            throw new Error('not a border');
        }
    }

    public override isLegal(move: GipfMove, state: GipfState): MGPFallible<GipfLegalityInformation> {
        const initialCapturesValidity: MGPValidation = this.capturesValidity(state, move.initialCaptures);
        if (initialCapturesValidity.isFailure()) {
            return initialCapturesValidity.toOtherFallible();
        }
        const stateAfterInitialCaptures: GipfState = GipfRules.applyCaptures(move.initialCaptures, state);

        const noMoreCaptureAfterInitialValidity: MGPValidation = this.noMoreCapturesValidity(stateAfterInitialCaptures);
        if (noMoreCaptureAfterInitialValidity.isFailure()) {
            return noMoreCaptureAfterInitialValidity.toOtherFallible();
        }

        const placementValidity: MGPValidation =
            this.placementValidity(stateAfterInitialCaptures, move.placement);
        if (placementValidity.isFailure()) {
            return placementValidity.toOtherFallible();
        }
        const stateAfterPlacement: GipfState =
            GipfRules.applyPlacement(move.placement, stateAfterInitialCaptures);

        const finalCapturesValidity: MGPValidation =
            this.capturesValidity(stateAfterPlacement, move.finalCaptures);
        if (finalCapturesValidity.isFailure()) {
            return finalCapturesValidity.toOtherFallible();
        }

        const stateAfterFinalCaptures: GipfState =
            GipfRules.applyCaptures(move.finalCaptures, stateAfterPlacement);
        const noMoreCaptureAfterFinalValidity: MGPValidation =
            this.noMoreCapturesValidity(stateAfterFinalCaptures);
        if (noMoreCaptureAfterFinalValidity.isFailure()) {
            return noMoreCaptureAfterFinalValidity.toOtherFallible();
        }

        return MGPFallible.success(stateAfterFinalCaptures);
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
            updatedState = GipfRules.applyCapture(capture, updatedState);
        }
        return MGPValidation.SUCCESS;
    }

    public captureValidity(state: GipfState, capture: GipfCapture): MGPValidation {
        const player: Player = state.getCurrentPlayer();
        const linePortionOpt: MGPOptional<{ 0: Coord, 1: Coord, 2: HexaDirection}> =
            GipfRules.getLinePortionWithFourPiecesOfPlayer(state, player, capture.getLine());
        if (linePortionOpt.isAbsent()) {
            return MGPValidation.failure(GipfFailure.CAPTURE_MUST_BE_ALIGNED());
        }

        const linePortion: { 0: Coord, 1: Coord, 2: HexaDirection} = linePortionOpt.get();

        const capturable: GipfCapture = GipfRules.getCapturable(state, linePortion);
        if (capturable.equals(capture)) {
            return MGPValidation.SUCCESS;
        } else {
            return MGPValidation.failure(GipfFailure.INVALID_CAPTURED_PIECES());
        }
    }

    public static getLinePortionsWithFourPiecesOfPlayer(state: GipfState, player: Player):
    ReadonlyArray<{ 0: Coord, 1: Coord, 2: HexaDirection}> {
        const linePortions: { 0: Coord, 1: Coord, 2: HexaDirection}[] = [];
        state.allLines().forEach((line: HexaLine) => {
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
        const coord: Coord = state.getEntranceOnLine(line);
        const dir: HexaDirection = line.getDirection();
        let start: Coord = coord;
        for (let cur: Coord = coord; state.isOnBoard(cur); cur = cur.getNext(dir)) {
            if (state.getPieceAt(cur).is(player)) {
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
            return MGPValidation.failure(GipfFailure.MISSING_CAPTURES());
        }
    }

    public placementValidity(state: GipfState, placement: GipfPlacement): MGPValidation {
        const coordValidity: MGPValidation = this.placementCoordValidity(state, placement.coord);
        if (coordValidity.isFailure()) {
            return coordValidity;
        }
        if (state.getPieceAt(placement.coord) !== FourStatePiece.EMPTY) {
            if (placement.direction.isAbsent()) {
                return MGPValidation.failure(GipfFailure.PLACEMENT_WITHOUT_DIRECTION());
            }
            if (GipfRules.isLineComplete(state, placement.coord, placement.direction.get())) {
                return MGPValidation.failure(GipfFailure.PLACEMENT_ON_COMPLETE_LINE());
            }
            for (const dir of GipfRules.getAllDirectionsForEntrance(state, placement.coord)) {
                if (dir === placement.direction.get()) {
                    return MGPValidation.SUCCESS;
                }
            }
            return MGPValidation.failure(GipfFailure.INVALID_PLACEMENT_DIRECTION());
        }
        return MGPValidation.SUCCESS;
    }

    public placementCoordValidity(state: GipfState, coord: Coord): MGPValidation {
        if (FlatHexaOrientation.INSTANCE.isOnBorder(state, coord)) {
            return MGPValidation.SUCCESS;
        } else {
            return MGPValidation.failure(GipfFailure.PLACEMENT_NOT_ON_BORDER());
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
        let cur: Coord = start.getNext(oppositeDir);
        while (state.isOnBoard(cur) && state.getPieceAt(cur) !== FourStatePiece.EMPTY) {
            // Go backwards to identify capturable pieces before the 4 aligned pieces
            capturable.push(cur);
            cur = cur.getNext(oppositeDir);
        }
        for (let coord: Coord = start; coord.equals(end) === false; coord = coord.getNext(dir)) {
            // The 4 pieces are capturable
            capturable.push(coord);
        }
        for (let coord: Coord = end;
            state.isOnBoard(coord) && state.getPieceAt(coord) !== FourStatePiece.EMPTY;
            coord = coord.getNext(dir))
        {
            // Go forward to identify capturable pieces after the 4 aligned pieces
            capturable.push(coord);
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

    public override getGameStatus(node: GipfNode): GameStatus {
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
