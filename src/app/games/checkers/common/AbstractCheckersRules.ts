import { Coord, CoordFailure } from 'src/app/jscaip/Coord';
import { Ordinal } from 'src/app/jscaip/Ordinal';
import { GameNode } from 'src/app/jscaip/AI/GameNode';
import { Player } from 'src/app/jscaip/Player';
import { ConfigurableRules } from 'src/app/jscaip/Rules';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { ArrayUtils, MGPFallible, MGPOptional, MGPValidation } from '@everyboard/lib';
import { CheckersMove } from './CheckersMove';
import { CheckersFailure } from './CheckersFailure';
import { CheckersPiece, CheckersStack, CheckersState } from './CheckersState';
import { GameStatus } from 'src/app/jscaip/GameStatus';
import { TableUtils } from 'src/app/jscaip/TableUtils';
import { CoordSet } from 'src/app/jscaip/CoordSet';
import { Localized } from 'src/app/utils/LocaleUtils';
import { Vector } from 'src/app/jscaip/Vector';

export type CheckersConfig = {
    playerRows: number;
    emptyRows: number;
    width: number;
    canStackPiece: boolean;
    mustMakeMaximalCapture: boolean;
    simplePieceCanCaptureBackwards: boolean;
    promotedPiecesCanFly: boolean;
    occupyEvenSquare: boolean;
    frisianCaptureAllowed: boolean;
}

export class CheckersOptionLocalizable {

    public static readonly STACK_PIECES: Localized = () => $localize`Stack pieces instead of capturing them`;

    public static readonly MAXIMAL_CAPTURE: Localized = () => $localize`You must capture the highest number of piece`;

    public static readonly SIMPLE_PIECE_CAN_CAPTURE_BACKWARDS: Localized = () => $localize`Simple piece can capture backward`;

    public static readonly PROMOTED_PIECES_CAN_TRAVEL_LONG_DISTANCES: Localized = () => $localize`Promoted pieces can travel long distance`;

    public static readonly OCCUPY_EVEN_SQUARE: Localized = () => $localize`Occupy even square`;

    public static readonly FRISIAN_CAPTURE_ALLOWED: Localized = () => $localize`Can do frisian captures`;

}

export class CheckersNode extends GameNode<CheckersMove, CheckersState> {}

export abstract class AbstractCheckersRules extends ConfigurableRules<CheckersMove, CheckersState, CheckersConfig> {

    public override getInitialState(optionalConfig: MGPOptional<CheckersConfig>): CheckersState {
        const U: CheckersStack = new CheckersStack([CheckersPiece.ZERO]);
        const V: CheckersStack = new CheckersStack([CheckersPiece.ONE]);
        const _: CheckersStack = CheckersStack.EMPTY;
        const config: CheckersConfig = optionalConfig.get();
        const height: number = config.emptyRows + (2 * config.playerRows);
        const board: CheckersStack[][] = TableUtils.create(config.width, height, _);
        const occupiedSquare: number = config.occupyEvenSquare ? 0 : 1;
        for (let y: number = 0; y < height; y++) {
            for (let x: number = 0; x < config.width; x++) {
                if ((x + y) % 2 === occupiedSquare) {
                    if (y < config.playerRows) {
                        board[y][x] = V;
                    } else if (config.playerRows + config.emptyRows <= y) {
                        board[y][x] = U;
                    }
                }
            }
        }
        return new CheckersState(board, 0);
    }

    /**
     * @param state the state from which you want the current player's capture
     * @param config the config
     * @returns all the complete captures, whether or not they are legal
     */
    private getCompleteCaptures(state: CheckersState, config: CheckersConfig): CheckersMove[] {
        const player: Player = state.getCurrentPlayer();
        return this.getCapturesOf(state, player, config);
    }

    public getCapturesOf(state: CheckersState, player: Player, config: CheckersConfig): CheckersMove[] {
        const captures: CheckersMove[] = [];
        const playerPieces: Coord[] = state.getStacksOf(player);
        for (const playerPiece of playerPieces) {
            captures.push(...this.getPieceCaptures(state, playerPiece, config, [playerPiece]));
        }
        return captures;
    }

    private getPieceCaptures(state: CheckersState, coord: Coord, config: CheckersConfig, flyiedOvers: Coord[] = [])
    : CheckersMove[]
    {
        let pieceMoves: CheckersMove[] = [];
        const piece: CheckersStack = state.getPieceAt(coord);
        const pieceOwner: Player = piece.getCommander().player;
        const opponent: Player = pieceOwner.getOpponent();
        const directions: Vector[] = this.getPieceDirections(state, coord, true, config);
        const moved: CheckersStack = state.getPieceAt(coord);
        for (const direction of directions) {
            const captured: MGPOptional<Coord> =
                this.getFirstCapturableCoord(state, coord, direction, opponent, flyiedOvers, config);
            if (captured.isPresent()) {
                const landings: Coord[] =
                    this.getLandableCoords(state, coord, captured.get(), direction, flyiedOvers, config);
                for (const landing of landings) {
                    const fakePostCaptureState: CheckersState = state
                        .remove(coord)
                        .remove(captured.get())
                        .set(landing, moved);
                    // Not needed to do the real capture
                    const startOfMove: CheckersMove = CheckersMove.fromCapture([coord, landing]).get();
                    const newFlyiedOvers: Coord[] = flyiedOvers.concat(...coord.getCoordsToward(landing, false, true));
                    const endsOfMoves: CheckersMove[] = this.getPieceCaptures(fakePostCaptureState,
                                                                              landing,
                                                                              config,
                                                                              newFlyiedOvers);
                    if (endsOfMoves.length === 0) {
                        pieceMoves = pieceMoves.concat(startOfMove);
                    } else {
                        const mergedMoves: CheckersMove[] = [];
                        for (const endMove of endsOfMoves) {
                            const concatenatedMove: MGPFallible<CheckersMove> = startOfMove.concatenate(endMove);
                            if (concatenatedMove.isSuccess()) {
                                mergedMoves.push(concatenatedMove.get());
                            } else {
                                mergedMoves.push(startOfMove);
                            }
                        }
                        pieceMoves = pieceMoves.concat(mergedMoves);
                    }
                }
            }
        }
        return pieceMoves;
    }

    private getFirstCapturableCoord(state: CheckersState,
                                    coord: Coord,
                                    direction: Vector,
                                    opponent: Player,
                                    flyiedOvers: Coord[],
                                    config: CheckersConfig)
    : MGPOptional<Coord>
    {
        const isPromotedPiece: boolean = state.getPieceAt(coord).getCommander().isPromoted;
        if (config.promotedPiecesCanFly && isPromotedPiece) {
            return this.getFirstCapturableCoordForFlyingCapture(state, coord, direction, flyiedOvers);
        } else {
            const nextCoord: Coord = coord.getNext(direction, 1);
            if (state.coordIsCommandedBy(nextCoord, opponent) &&
                flyiedOvers.some((c: Coord) => c.equals(nextCoord)) === false)
            {
                return MGPOptional.of(nextCoord);
            } else {
                return MGPOptional.empty();
            }
        }
    }

    private getLandableCoords(state: CheckersState,
                              coord: Coord,
                              captured: Coord,
                              direction: Vector,
                              flyiedOvers: Coord[],
                              config: CheckersConfig)
    : Coord[]
    {
        // Because frisian capture do even move but fly over even coord as well
        let possibleLanding: MGPOptional<Coord> = this.getNextPossibleLanding(state, captured, direction, flyiedOvers);
        const possibleLandings: Coord[] = [];
        if (possibleLanding.isPresent()) {
            possibleLandings.push(possibleLanding.get());
            const isPromotedPiece: boolean = state.getPieceAt(coord).getCommander().isPromoted;
            if (config.promotedPiecesCanFly && isPromotedPiece) {
                possibleLanding = this.getNextPossibleLanding(state, possibleLanding.get(), direction, flyiedOvers);
                while (possibleLanding.isPresent()) {
                    possibleLandings.push(possibleLanding.get());
                    possibleLanding = this.getNextPossibleLanding(state, possibleLanding.get(), direction, flyiedOvers);
                }
            }
        }
        return possibleLandings;
    }

    private getNextPossibleLanding(state: CheckersState, coord: Coord, direction: Vector, flyiedOvers: Coord[])
    : MGPOptional<Coord>
    {
        const minimalisedDirection: Vector = direction.toMinimalVector();
        const nextPossibleLanding: Coord = coord.getNext(direction, 1);
        const distance: number = coord.getDistanceToward(nextPossibleLanding);
        let i: number = 0;
        while (i < distance) {
            coord = coord.getNext(minimalisedDirection, 1);
            if (state.isEmptyAt(coord) === false) {
                return MGPOptional.empty();
            } else if (this.isPresentIn(coord, flyiedOvers)) {
                return MGPOptional.empty();
            }
            i++;
        }
        return MGPOptional.of(nextPossibleLanding);
    }

    private isPresentIn(coord: Coord, coordList: Coord[]): boolean {
        return coordList.some((c: Coord) => c.equals(coord));
    }

    private getFirstCapturableCoordForFlyingCapture(state: CheckersState,
                                                    coord: Coord,
                                                    direction: Vector,
                                                    flyiedOvers: Coord[])
    : MGPOptional<Coord>
    {
        // Because frisian capture do even move but fly over even coord as well
        const minimalisedDirection: Vector = direction.toMinimalVector();
        const player: Player = state.getCurrentPlayer();
        const nextCoord: Coord = coord.getNext(minimalisedDirection, 1);
        if (state.isNotOnBoard(nextCoord) ||
            state.getPieceAt(nextCoord).isCommandedBy(player) ||
            flyiedOvers.some((c: Coord) => c.equals(nextCoord)))
        {
            return MGPOptional.empty();
        } else {
            if (state.getPieceAt(nextCoord).isEmpty()) {
                return this.getFirstCapturableCoordForFlyingCapture(state,
                                                                    nextCoord,
                                                                    minimalisedDirection,
                                                                    flyiedOvers);
            } else {
                return MGPOptional.of(nextCoord);
            }
        }
    }

    private getPieceDirections(state: CheckersState, coord: Coord, isCapture: boolean, config: CheckersConfig)
    : Vector[]
    {
        const piece: CheckersStack = state.getPieceAt(coord);
        const pieceOwner: Player = piece.getCommander().player;
        // Since player zero must go up (-1) and player one go down (+1)
        // Then we can use the score modifier that happens to match to the "vertical direction" of each player
        const verticalDirection: number = pieceOwner.getScoreModifier();
        const directions: Vector[] = [
            Ordinal.factory.fromDelta(-1, verticalDirection).get(), // left diagonal
            Ordinal.factory.fromDelta(1, verticalDirection).get(), // right diagonal
        ];
        if (isCapture && config.frisianCaptureAllowed) {
            directions.push(
                new Vector(-2, 0), // left frisian
                new Vector(2, 0), // right frisian
                new Vector(0, 2 * verticalDirection), // up frisian capture
            );
            if ( config.simplePieceCanCaptureBackwards) {
                directions.push(
                    new Vector(0, -2 * verticalDirection), // back frisian
                );
            }
        }
        const isLegalCaptureBackward: boolean = isCapture && config.simplePieceCanCaptureBackwards;
        if (state.getPieceAt(coord).getCommander().isPromoted || isLegalCaptureBackward) {
            directions.push(
                Ordinal.factory.fromDelta(-1, - verticalDirection).get(), // down left diagonal
                Ordinal.factory.fromDelta(1, - verticalDirection).get(), // down right diagonal
            );
        }
        return directions;
    }

    public getSteps(state: CheckersState, config: CheckersConfig): CheckersMove[] {
        const player: Player = state.getCurrentPlayer();
        return this.getStepsOf(state, player, config);
    }

    public getStepsOf(state: CheckersState, player: Player, config: CheckersConfig): CheckersMove[] {
        const steps: CheckersMove[] = [];
        const playerStacks: Coord[] = state.getStacksOf(player);
        for (const playerPiece of playerStacks) {
            steps.push(...this.getPieceSteps(state, playerPiece, config));
        }
        return steps;
    }

    private getPieceSteps(state: CheckersState, coord: Coord, config: CheckersConfig): CheckersMove[] {
        const pieceMoves: CheckersMove[] = [];
        const directions: Vector[] = this.getPieceDirections(state, coord, false, config);
        for (const direction of directions) {
            const isPromotedPiece: boolean = state.getPieceAt(coord).getCommander().isPromoted;
            if (config.promotedPiecesCanFly && isPromotedPiece) {
                let landing: Coord = coord;
                let previousJumpWasPossible: boolean = true;
                while (previousJumpWasPossible) {
                    landing = landing.getNext(direction, 1);
                    previousJumpWasPossible = state.isEmptyAt(landing);
                    if (previousJumpWasPossible) {
                        const newStep: CheckersMove = CheckersMove.fromStep(coord, landing);
                        pieceMoves.push(newStep);
                    }
                }
            } else {
                const landing: Coord = coord.getNext(direction, 1);
                if (state.isEmptyAt(landing)) {
                    const newStep: CheckersMove = CheckersMove.fromStep(coord, landing);
                    pieceMoves.push(newStep);
                }
            }
        }
        return pieceMoves;
    }

    public override applyLegalMove(move: CheckersMove, state: CheckersState, config: MGPOptional<CheckersConfig>)
    : CheckersState
    {
        const moveStart: Coord = move.getStartingCoord();
        const moveEnd: Coord = move.getEndingCoord();
        let movingStack: CheckersStack = state.getPieceAt(moveStart);
        let resultingState: CheckersState = state.remove(moveStart);
        if (this.isMoveStep(move) === false) {
            for (const capturedCoord of this.getCapturedCoords(move, state)) {
                if (config.get().canStackPiece) {
                    const capturedSpace: CheckersStack = state.getPieceAt(capturedCoord);
                    const capturedCommander: CheckersPiece = capturedSpace.getCommander();
                    movingStack = movingStack.capturePiece(capturedCommander);

                    const remainingStack: CheckersStack = capturedSpace.getPiecesUnderCommander();
                    resultingState = resultingState.set(capturedCoord, remainingStack);
                } else {
                    resultingState = resultingState.set(capturedCoord, CheckersStack.EMPTY);
                }
            }
        }
        resultingState = resultingState.set(moveEnd, movingStack);
        if (moveEnd.y === state.getFinishLineOf(state.getCurrentPlayer())) {
            const promotedCommander: CheckersStack = movingStack.promoteCommander();
            resultingState = resultingState.set(moveEnd, promotedCommander);
        }
        return resultingState.incrementTurn();
    }

    private getCapturedCoords(move: CheckersMove, state: CheckersState): CoordSet {
        const steppedOverCoords: CoordSet = move.getSteppedOverCoords().get();
        return steppedOverCoords.filter((coord: Coord) =>
            state.getPieceAt(coord).isOccupied() &&
            coord.equals(move.getStartingCoord()) === false);
    }

    public override isLegal(move: CheckersMove, state: CheckersState, config: MGPOptional<CheckersConfig>)
    : MGPValidation
    {
        const moveOwnerShipValidity: MGPValidation = this.getMoveOwnerShipValidity(move, state, config.get());
        if (moveOwnerShipValidity.isFailure()) { // out of range, opponent, empty spaces
            return moveOwnerShipValidity;
        }
        const moveValidity: MGPValidation = this.isLegalSubMoveList(move, state, config.get());
        if (moveValidity.isFailure()) {
            return moveValidity;
        }
        const possibleCaptures: CheckersMove[] = this.getCompleteCaptures(state, config.get());
        if (possibleCaptures.length === 0) {
            return MGPValidation.SUCCESS;
        } else {
            return this.isLegalCaptureChoice(move, possibleCaptures, config.get());
        }
    }

    private getMoveOwnerShipValidity(move: CheckersMove, state: CheckersState, config: CheckersConfig): MGPValidation {
        const outOfRangeCoord: MGPOptional<Coord> = this.getMoveOutOfRangeCoord(move, config);
        if (outOfRangeCoord.isPresent()) {
            return MGPValidation.failure(CoordFailure.OUT_OF_RANGE(outOfRangeCoord.get()));
        }
        const moveStart: Coord = move.getStartingCoord();
        if (state.getPieceAt(moveStart).isEmpty()) {
            return MGPValidation.failure(RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_EMPTY());
        }
        const movedStack: CheckersStack = state.getPieceAt(moveStart);
        const opponent: Player = state.getCurrentOpponent();
        if (movedStack.isCommandedBy(opponent)) {
            return MGPValidation.failure(RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_OPPONENT());
        }
        return MGPValidation.SUCCESS;
    }

    private getMoveOutOfRangeCoord(move: CheckersMove, config: CheckersConfig): MGPOptional<Coord> {
        const configHeight: number = config.emptyRows + (2 * config.playerRows);
        for (const coord of move.coords) {
            if (coord.isNotInRange(config.width, configHeight)) {
                return MGPOptional.of(coord);
            }
        }
        return MGPOptional.empty();
    }

    private isLegalSubMoveList(move: CheckersMove, state: CheckersState, config: CheckersConfig): MGPValidation {
        for (let i: number = 1; i < move.coords.size(); i++) {
            const previousCoord: Coord = move.coords.get(i - 1);
            const landingCoord: Coord = move.coords.get(i);
            const subMoveValidity: MGPValidation =
                this.getSubMoveValidity(move, previousCoord, landingCoord, state, config);
            if (subMoveValidity.isFailure()) {
                return subMoveValidity;
            }
        }
        return MGPValidation.SUCCESS;
    }

    public getSubMoveValidity(move: CheckersMove,
                              start: Coord,
                              end: Coord,
                              state: CheckersState,
                              config: CheckersConfig)
    : MGPValidation
    {
        const landingPiece: CheckersStack = state.getPieceAt(end);
        if (landingPiece.getStackSize() > 0) {
            return MGPValidation.failure(RulesFailure.MUST_LAND_ON_EMPTY_SPACE());
        }
        const directionValidity: MGPValidation = this.getDirectionValidity(start, end, config);
        if (directionValidity.isFailure()) {
            return directionValidity;
        }
        const flyiedOverPlayer: Player[] = this.getFlyiedOverPlayers(start, end, state);
        let isCapture: boolean;
        if (flyiedOverPlayer.length === 0) { // No Capture
            const nonCaptureValidity: MGPValidation = this.getNonCaptureValidity(move, state, start, config);
            if (nonCaptureValidity.isFailure()) {
                return nonCaptureValidity;
            }
            isCapture = false;
        } else if (flyiedOverPlayer.length > 1) { // Capturing 2+ pieces
            return MGPValidation.failure(CheckersFailure.CANNOT_JUMP_OVER_SEVERAL_PIECES());
        } else { // Single Capture
            if (flyiedOverPlayer.some((player: Player) => player.equals(state.getCurrentPlayer()))) {
                return MGPValidation.failure(RulesFailure.CANNOT_SELF_CAPTURE());
            }
            isCapture = true;
        }
        if (this.isNormalPieceGoingBackwardIllegaly(move, start, end, state, config)) {
            return MGPValidation.failure(CheckersFailure.CANNOT_GO_BACKWARD());
        }
        const flyLegality: MGPValidation = this.getFlyLegality(move, start, end, state, isCapture, config);
        if (flyLegality.isFailure()) {
            return flyLegality;
        }
        return MGPValidation.SUCCESS;
    }

    private getNonCaptureValidity(move: CheckersMove, state: CheckersState, start: Coord, config: CheckersConfig)
    : MGPValidation
    {
        if (this.isMisplacedStep(move)) { // The moves continue illegally
            const moveStart: Coord = move.getStartingCoord();
            if (moveStart.equals(start)) {
                if (state.getPieceAt(moveStart).getCommander().isPromoted) {
                    if (config.promotedPiecesCanFly === false) {
                        return MGPValidation.failure(CheckersFailure.NO_PIECE_CAN_DO_LONG_JUMP());
                    }
                } else {
                    return MGPValidation.failure(CheckersFailure.NORMAL_PIECES_CANNOT_MOVE_LIKE_THIS());
                }
            }
            return MGPValidation.failure('Move cannot continue after non-capture move');
        }
        return MGPValidation.SUCCESS;
    }

    private getDirectionValidity(start: Coord, end: Coord, config: CheckersConfig): MGPValidation {
        const direction: MGPFallible<Ordinal> = start.getDirectionToward(end);
        if (direction.isFailure()) {
            return MGPValidation.failure(direction.getReason());
        }
        if (direction.get().isOrthogonal()) {
            if (config.frisianCaptureAllowed) {
                const frisianSize: number = start.getDistanceToward(end);
                if (frisianSize % 2 === 1) {
                    return MGPValidation.failure(CheckersFailure.FRISIAN_CAPTURE_MUST_BE_EVEN());
                } else if (frisianSize === 2) {
                    return MGPValidation.failure(CheckersFailure.INVALID_FRISIAN_MOVE());
                }
            } else {
                return MGPValidation.failure(CheckersFailure.CANNOT_DO_ORTHOGONAL_MOVE());
            }
        }
        return MGPValidation.SUCCESS;
    }

    private isMisplacedStep(move: CheckersMove): boolean {
        if (move.coords.size() === 2) {
            // This is a simple jump without capture, must be a promoted piece (this part is checked later)
            return false;
        } else {
            // We've been this far with capture but this step has no capture, this is misplaced !
            return true;
        }
    }

    private getFlyiedOverPlayers(start: Coord, end: Coord, state: CheckersState): Player[] {
        const flyiedOverCoords: Coord[] = start.getCoordsToward(end);
        const flyiedOverPieces: CheckersStack[] = flyiedOverCoords.map((coord: Coord) => state.getPieceAt(coord));
        const flyiedOverOccupiedStacks: CheckersStack[] =
            flyiedOverPieces.filter((stack: CheckersStack) => stack.isOccupied());
        return flyiedOverOccupiedStacks.map((stack: CheckersStack) => stack.getCommander().player);
    }

    /**
     * @param move a simple move, (start/end, nothing more)
     */
    private isNormalPieceGoingBackwardIllegaly(move: CheckersMove,
                                               stepStart: Coord,
                                               stepEnd: Coord,
                                               state: CheckersState,
                                               config: CheckersConfig)
    : boolean
    {
        const movingPiece: CheckersPiece = state.getPieceAt(move.getStartingCoord()).getCommander();
        if (movingPiece.isPromoted) {
            return false;
        } // Here: we check a normal piece
        const opponent: Player = state.getCurrentOpponent();
        const moveDirection: number = stepStart.getDirectionToward(stepEnd).get().y;
        const distance: number = stepStart.getDistanceToward(stepEnd);
        const isBackward: boolean = moveDirection === opponent.getScoreModifier();
        if (isBackward) {
            if (distance === 1) {
                return true; // Piece is stepping backward illegally
            } else if (config.simplePieceCanCaptureBackwards === false) {
                return true; // Piece is backcapturing illegally
            } else {
                return false; // Legal backward
            }
        } else {
            return false; // Legal forward
        }
    }

    private getFlyLegality(move: CheckersMove,
                           stepStart: Coord,
                           stepEnd: Coord,
                           state: CheckersState,
                           isCapture: boolean,
                           config: CheckersConfig)
    : MGPValidation
    {
        const distance: number = stepStart.getDistanceToward(stepEnd);
        if (isCapture) {
            if (distance === 2) {
                return MGPValidation.SUCCESS;
            }
            if (distance === 4 && config.frisianCaptureAllowed) {
                return MGPValidation.SUCCESS;
            }
        } else {
            if (distance === 1) {
                return MGPValidation.SUCCESS;
            }
        }
        if (config.promotedPiecesCanFly) {
            if (state.getPieceAt(move.getStartingCoord()).getCommander().isPromoted) {
                return MGPValidation.SUCCESS; // Legal promoted fly
            } else { // Normal piece cannot fly
                if (isCapture) {
                    return MGPValidation.failure(CheckersFailure.FLYING_CAPTURE_IS_FORBIDDEN_FOR_NORMAL_PIECES());
                } else {
                    return MGPValidation.failure(CheckersFailure.NORMAL_PIECES_CANNOT_MOVE_LIKE_THIS());
                }
            }
        } else { // No piece are allow flying
            return MGPValidation.failure(CheckersFailure.NO_PIECE_CAN_DO_LONG_JUMP());
        }
    }

    public isMoveStep(move: CheckersMove): boolean {
        if (move.coords.size() === 2) {
            const start: Coord = move.getStartingCoord();
            const end: Coord = move.getEndingCoord();
            const distance: number = start.getDistanceToward(end);
            return distance === 1;
        } else {
            return false;
        }
    }

    /**
     * @param move the chosen capture
     * @param possibleCaptures all possible captures
     * @param config the config
     * @returns whether or not this move is amongst the possible capture, based on global-capture group
     * The check aspect are only based on the rules mustMakeMaximalCapture and partialCapture rules
     */
    private isLegalCaptureChoice(move: CheckersMove,
                                 possibleCaptures: CheckersMove[],
                                 config: CheckersConfig)
    : MGPValidation
    {
        if (config.mustMakeMaximalCapture) {
            const legalCaptures: CheckersMove[] =
                ArrayUtils.maximumsBy(possibleCaptures, (m: CheckersMove) => m.coords.size());
            const awaitedCaptureSize: number = legalCaptures[0].coords.size();
            if (this.isMoveStep(move)) {
                return MGPValidation.failure(CheckersFailure.CANNOT_SKIP_CAPTURE());
            } else if (move.coords.size() === awaitedCaptureSize) {
                return MGPValidation.SUCCESS;
            } else if (legalCaptures.some((m: CheckersMove) => move.isPrefix(m))) {
                return MGPValidation.failure(CheckersFailure.MUST_FINISH_CAPTURING());
            } else {
                return MGPValidation.failure(CheckersFailure.MUST_DO_LONGEST_CAPTURE());
            }
        } else {
            if (this.isMoveStep(move)) {
                return MGPValidation.failure(CheckersFailure.CANNOT_SKIP_CAPTURE());
            } else if (possibleCaptures.some((m: CheckersMove) => m.equals(move))) {
                return MGPValidation.SUCCESS;
            } else {
                return MGPValidation.failure(CheckersFailure.MUST_FINISH_CAPTURING());
            }
        }
    }

    public getLegalCaptures(state: CheckersState, config: CheckersConfig): CheckersMove[] {
        const possibleCaptures: CheckersMove[] = this.getCompleteCaptures(state, config);
        if (config.mustMakeMaximalCapture) {
            return ArrayUtils.maximumsBy(possibleCaptures, (m: CheckersMove) => m.coords.size());
        } else {
            return possibleCaptures;
        }
    }

    public override getGameStatus(node: CheckersNode, config: MGPOptional<CheckersConfig>): GameStatus {
        const state: CheckersState = node.gameState;
        const captures: CheckersMove[] = this.getCompleteCaptures(state, config.get());
        if (captures.length > 0 || this.getSteps(state, config.get()).length > 0) {
            return GameStatus.ONGOING;
        } else {
            return GameStatus.getVictory(state.getCurrentOpponent());
        }
    }

}
