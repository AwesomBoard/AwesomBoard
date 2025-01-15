import { Coord } from 'src/app/jscaip/Coord';
import { Ordinal } from 'src/app/jscaip/Ordinal';
import { GameStatus } from 'src/app/jscaip/GameStatus';
import { GameNode } from 'src/app/jscaip/AI/GameNode';
import { Player } from 'src/app/jscaip/Player';
import { Rules } from 'src/app/jscaip/Rules';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { Table, TableUtils } from 'src/app/jscaip/TableUtils';
import { MGPFallible, MGPMap, MGPOptional, MGPValidation } from '@everyboard/lib';
import { LodestoneFailure } from './LodestoneFailure';
import { LodestoneCaptures, LodestoneMove } from './LodestoneMove';
import { LodestoneOrientation, LodestoneDirection, LodestonePiece } from './LodestonePiece';
import { LodestonePieceLodestone, LodestonePieceNone, LodestoneDescription, LodestonePiecePlayer } from './LodestonePiece';
import { LodestoneState, LodestonePositions, LodestonePressurePlates } from './LodestoneState';
import { LodestonePressurePlate, LodestonePressurePlatePosition, LodestonePressurePlateGroup } from './LodestoneState';
import { NoConfig } from 'src/app/jscaip/RulesConfigUtil';
import { PlayerNumberMap } from 'src/app/jscaip/PlayerMap';

export class LodestoneNode extends GameNode<LodestoneMove, LodestoneState> {}

export type LodestoneInfos = {
    board: LodestonePiece[][]
    captures: Coord[]
    moved: Coord[]
}

export interface PressurePlateViewPosition {
    start: (plateIndex: number, plateWidth: number) => Coord,
    direction: Ordinal,
}

export type PressurePlatePositionInformation = MGPMap<LodestonePressurePlatePosition,
                                                      PressurePlateViewPosition>;

export class LodestoneRules extends Rules<LodestoneMove, LodestoneState, LodestoneInfos> {

    public static readonly THREATENED_COORD_RANGE: PressurePlatePositionInformation = MGPMap.from({
        top: {
            start: (indexPlate: number) => new Coord(
                0,
                indexPlate,
            ),
            direction: Ordinal.RIGHT,
        },
        bottom: {
            start: (indexPlate: number) => new Coord(
                0,
                LodestoneState.SIZE - (indexPlate + 1),
            ),
            direction: Ordinal.RIGHT,
        },
        left: {
            start: (indexPlate: number) => new Coord(
                indexPlate,
                0,
            ),
            direction: Ordinal.DOWN,
        },
        right: {
            start: (indexPlate: number) => new Coord(
                LodestoneState.SIZE - (indexPlate + 1),
                0,
            ),
            direction: Ordinal.DOWN,
        },
    });

    private static singleton: MGPOptional<LodestoneRules> = MGPOptional.empty();

    public static get(): LodestoneRules {
        if (LodestoneRules.singleton.isAbsent()) {
            LodestoneRules.singleton = MGPOptional.of(new LodestoneRules());
        }
        return LodestoneRules.singleton.get();
    }

    public override getInitialState(): LodestoneState {
        const _: LodestonePiece = LodestonePieceNone.EMPTY;
        const O: LodestonePiece = LodestonePiecePlayer.ZERO;
        const X: LodestonePiece = LodestonePiecePlayer.ONE;
        const board: Table<LodestonePiece> = [
            [_, _, O, X, O, X, _, _],
            [_, O, X, O, X, O, X, _],
            [O, X, O, X, O, X, O, X],
            [X, O, X, _, _, O, X, O],
            [O, X, O, _, _, X, O, X],
            [X, O, X, O, X, O, X, O],
            [_, X, O, X, O, X, O, _],
            [_, _, X, O, X, O, _, _],
        ];
        const plates: LodestonePressurePlates = LodestonePressurePlates.getInitialLodestonePressurePlates([5, 3]);
        return new LodestoneState(board, 0, new MGPMap(), plates);
    }

    public override applyLegalMove(move: LodestoneMove, state: LodestoneState, _config: NoConfig, infos: LodestoneInfos)
    : LodestoneState
    {
        const currentPlayer: Player = state.getCurrentPlayer();
        const opponent: Player = currentPlayer.getOpponent();
        const board: LodestonePiece[][] = TableUtils.copy(infos.board);
        const lodestones: LodestonePositions = state.lodestones.getCopy();
        lodestones.put(currentPlayer, move.coord);
        const pressurePlates: LodestonePressurePlates = { ...state.pressurePlates };
        this.updatePressurePlates(board, pressurePlates, lodestones, opponent, move.captures);
        return new LodestoneState(board, state.turn + 1, lodestones, pressurePlates);
    }

    public updatePressurePlates(board: LodestonePiece[][],
                                pressurePlates: LodestonePressurePlates,
                                lodestones: LodestonePositions,
                                opponent: Player,
                                captures: LodestoneCaptures)
    : void
    {
        for (const position of LodestonePressurePlate.POSITIONS) {
            pressurePlates[position] = this.updatePressurePlate(board,
                                                                position,
                                                                pressurePlates[position],
                                                                lodestones,
                                                                opponent,
                                                                captures[position]);
        }
    }

    private updatePressurePlate(board: LodestonePiece[][],
                                position: LodestonePressurePlatePosition,
                                pressurePlate: LodestonePressurePlateGroup,
                                lodestones: LodestonePositions,
                                opponent: Player,
                                captured: number)
    : LodestonePressurePlateGroup
    {
        if (pressurePlate.getCurrentPlate().isPresent()) {
            const newPressurePlate: LodestonePressurePlateGroup =
                pressurePlate.addCaptured(opponent, captured);
            const plateInfo: PressurePlateViewPosition =
                LodestoneRules.THREATENED_COORD_RANGE.get(position).get();
            const length: number = newPressurePlate.getCrumbledPlates().length;
            for (let plateIndex: number = 0; plateIndex < length; plateIndex++) {
                const plateWidth: number = newPressurePlate.plates[plateIndex].width;
                this.removePressurePlate(board,
                                         plateInfo.start(plateIndex, plateWidth),
                                         plateInfo.direction,
                                         lodestones);
            }
            return newPressurePlate;
        } else {
            return pressurePlate;
        }
    }

    private removePressurePlate(board: LodestonePiece[][],
                                start: Coord,
                                direction: Ordinal,
                                lodestones: LodestonePositions)
    : void
    {
        for (let coord: Coord = start; // eslint-disable-next-line indent
             coord.isInRange(LodestoneState.SIZE, LodestoneState.SIZE); // eslint-disable-next-line indent
             coord = coord.getNext(direction))
        {
            for (const player of Player.PLAYERS) {
                if (lodestones.get(player).equalsValue(coord)) {
                    lodestones.delete(player);
                }
            }
            board[coord.y][coord.x] = LodestonePieceNone.UNREACHABLE;
        }
    }

    public override isLegal(move: LodestoneMove, state: LodestoneState): MGPFallible<LodestoneInfos> {
        const validityBeforeCaptures: MGPValidation = this.isLegalWithoutCaptures(state, move.coord, move.direction);
        if (validityBeforeCaptures.isFailure()) {
            return MGPFallible.failure(validityBeforeCaptures.getReason());
        }
        const infos: LodestoneInfos =
            this.applyMoveWithoutPlacingCaptures(state, move.coord, move);
        const numberOfCapturesInMove: number =
            move.captures.top + move.captures.bottom + move.captures.left + move.captures.right;
        const actualCaptures: number = Math.min(infos.captures.length, state.remainingSpaces());
        if (numberOfCapturesInMove !== actualCaptures) {
            return MGPFallible.failure(LodestoneFailure.MUST_PLACE_CAPTURES_ON_PRESSURE_PLATES());
        }
        for (const position of LodestonePressurePlate.POSITIONS) {
            const pressurePlate: LodestonePressurePlateGroup = state.pressurePlates[position];
            if (pressurePlate.getGroupRemainingSpaces() < move.captures[position]) {
                return MGPFallible.failure(LodestoneFailure.TOO_MANY_CAPTURES_ON_SAME_PRESSURE_PLATE());
            }
        }
        return MGPFallible.success(infos);
    }

    public applyMoveWithoutPlacingCaptures(state: LodestoneState,
                                           coord: Coord,
                                           lodestone: LodestoneDescription)
    : LodestoneInfos
    {
        let result: LodestoneInfos;
        const board: LodestonePiece[][] = TableUtils.copy(state.board);
        const previousLodestonePosition: MGPOptional<Coord> = state.lodestones.get(state.getCurrentPlayer());
        if (previousLodestonePosition.isPresent()) {
            const previousCoord: Coord = previousLodestonePosition.get();
            board[previousCoord.y][previousCoord.x] = LodestonePieceNone.EMPTY;
        }
        if (lodestone.direction === 'pull') {
            result = this.applyPull(state, board, coord, lodestone.orientation);
        } else {
            result = this.applyPush(state, board, coord, lodestone.orientation);
        }
        result.board[coord.y][coord.x] =
            LodestonePieceLodestone.of(state.getCurrentPlayer(), lodestone);
        result.moved.push(coord);
        return result;
    }

    private applyPull(state: LodestoneState,
                      board: LodestonePiece[][],
                      lodestone: Coord,
                      orientation: LodestoneOrientation)
    : LodestoneInfos
    {
        const currentPlayer: Player = state.getCurrentPlayer();
        const opponent: Player = currentPlayer.getOpponent();
        const captures: Coord[] = [];
        const moved: Coord[] = [];
        const directions: readonly Ordinal[] = orientation === 'diagonal' ? Ordinal.DIAGONALS : Ordinal.ORTHOGONALS;
        for (const direction of directions) {
            let coord: Coord = lodestone.getNext(direction);
            while (state.isOnBoard(coord)) {
                const pieceOnTarget: LodestonePiece = board[coord.y][coord.x];
                const next: Coord = coord.getNext(direction);
                if (state.coordIsOwnedBy(next, currentPlayer)) {
                    const pieceToMove: LodestonePiece = board[next.y][next.x];
                    if (pieceToMove.isPlayerPiece()) {
                        // We move player piece of the next coord to the current coord
                        // hence in the opposite of direction
                        if (pieceOnTarget.isEmpty()) {
                            // Moving to an empty square
                            moved.push(coord);
                            board[coord.y][coord.x] = pieceToMove;
                            moved.push(next);
                            board[next.y][next.x] = LodestonePieceNone.EMPTY;
                        } else if (pieceOnTarget.isPlayerPiece() && pieceOnTarget.owner === opponent) {
                            // Capturing a player piece
                            captures.push(coord);
                            board[coord.y][coord.x] = pieceToMove;
                            moved.push(next);
                            board[next.y][next.x] = LodestonePieceNone.EMPTY;
                        }
                    }
                }
                coord = coord.getNext(direction);
            }
        }
        return { board, captures, moved };
    }

    private applyPush(state: LodestoneState,
                      board: LodestonePiece[][],
                      lodestone: Coord,
                      orientation: LodestoneOrientation)
    : LodestoneInfos
    {
        const currentPlayer: Player = state.getCurrentPlayer();
        const opponent: Player = currentPlayer.getOpponent();
        const captures: Coord[] = [];
        const moved: Coord[] = [];
        const directions: readonly Ordinal[] = orientation === 'diagonal' ? Ordinal.DIAGONALS : Ordinal.ORTHOGONALS;
        for (const direction of directions) {
            const start: Coord = lodestone.getNext(direction, LodestoneState.SIZE);
            for (let coord: Coord = start; // eslint-disable-next-line indent
                 coord.equals(lodestone) === false; // eslint-disable-next-line indent
                 coord = coord.getPrevious(direction))
            {
                if (state.coordIsOwnedBy(coord, opponent)) {
                    const pieceToMove: LodestonePiece = board[coord.y][coord.x];
                    if (pieceToMove.isPlayerPiece()) {
                        const next: Coord = coord.getNext(direction);
                        if (state.isOnBoard(next)) {
                            const pieceOnTarget: LodestonePiece = board[next.y][next.x];
                            if (pieceOnTarget.isUnreachable()) {
                                // Floor here has crumbled, the piece falls
                                captures.push(coord);
                                board[coord.y][coord.x] = LodestonePieceNone.EMPTY;
                            } else if (pieceOnTarget.isEmpty()) {
                                // Moving to an empty square
                                moved.push(next);
                                board[next.y][next.x] = pieceToMove;
                                moved.push(coord);
                                board[coord.y][coord.x] = LodestonePieceNone.EMPTY;
                            }
                        } else {
                            // Piece falls off the board
                            captures.push(coord);
                            board[coord.y][coord.x] = LodestonePieceNone.EMPTY;
                        }
                    }
                }
            }
        }
        return { board, captures, moved };
    }

    public isLegalWithoutCaptures(state: LodestoneState, coord: Coord, direction: LodestoneDirection): MGPValidation {
        const targetValidity: MGPValidation = this.isTargetLegal(state, coord);
        if (targetValidity.isFailure()) {
            return targetValidity;
        }
        const nextLodestoneDirection: MGPOptional<LodestoneDirection> = state.nextLodestoneDirection();
        const validLodestoneDirection: boolean =
            nextLodestoneDirection.isAbsent() || nextLodestoneDirection.equalsValue(direction);
        if (validLodestoneDirection === false) {
            return MGPValidation.failure(LodestoneFailure.MUST_FLIP_LODESTONE());
        }
        return MGPValidation.SUCCESS;
    }

    public isTargetLegal(state: LodestoneState, coord: Coord): MGPValidation {
        const targetContent: LodestonePiece = state.getPieceAt(coord);
        if (targetContent.isUnreachable()) {
            return MGPValidation.failure(LodestoneFailure.TARGET_IS_CRUMBLED());
        }
        if (targetContent.isPlayerPiece()) {
            return MGPValidation.failure(RulesFailure.MUST_CLICK_ON_EMPTY_SQUARE());
        }
        const player: Player = state.getCurrentPlayer();
        if (targetContent.isLodestone() && targetContent.owner !== player) {
            return MGPValidation.failure(RulesFailure.MUST_CLICK_ON_EMPTY_SQUARE());
        }
        return MGPValidation.SUCCESS;
    }

    public override getGameStatus(node: LodestoneNode): GameStatus {
        const state: LodestoneState = node.gameState;
        const pieces: PlayerNumberMap = state.numberOfPieces();
        const piecesZero: number = pieces.get(Player.ZERO);
        const piecesOne: number = pieces.get(Player.ONE);
        if (piecesZero === 0 && piecesOne === 0) {
            return GameStatus.DRAW;
        } else if (piecesZero === 0) {
            return GameStatus.ONE_WON;
        } else if (piecesOne === 0) {
            return GameStatus.ZERO_WON;
        } else {
            return GameStatus.ONGOING;
        }
    }

}
