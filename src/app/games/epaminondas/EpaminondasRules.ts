import { MGPFallible, MGPOptional, MGPValidation } from '@everyboard/lib';
import { Coord, CoordFailure } from 'src/app/jscaip/Coord';
import { Player, PlayerOrNone } from 'src/app/jscaip/Player';
import { ConfigurableRules } from 'src/app/jscaip/Rules';
import { EpaminondasMove } from './EpaminondasMove';
import { EpaminondasState } from './EpaminondasState';
import { EpaminondasFailure } from './EpaminondasFailure';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { Table, TableUtils } from 'src/app/jscaip/TableUtils';
import { GameStatus } from 'src/app/jscaip/GameStatus';
import { NumberConfig, RulesConfigDescription, RulesConfigDescriptionLocalizable } from 'src/app/components/wrapper-components/rules-configuration/RulesConfigDescription';
import { MGPValidators } from 'src/app/utils/MGPValidator';
import { GameNode } from 'src/app/jscaip/AI/GameNode';

export type EpaminondasConfig = {
    width: number;
    emptyRows: number;
    rowsOfSoldiers: number;
};

export type EpaminondasLegalityInformation = Table<PlayerOrNone>;

export class EpaminondasNode extends GameNode<EpaminondasMove, EpaminondasState> {}

export class EpaminondasRules extends ConfigurableRules<EpaminondasMove,
                                                        EpaminondasState,
                                                        EpaminondasConfig,
                                                        EpaminondasLegalityInformation>
{
    private static singleton: MGPOptional<EpaminondasRules> = MGPOptional.empty();

    public static readonly RULES_CONFIG_DESCRIPTION: RulesConfigDescription<EpaminondasConfig> =
        new RulesConfigDescription<EpaminondasConfig>({
            name: (): string => $localize`Epaminondas`,
            config: {
                width: new NumberConfig(14, RulesConfigDescriptionLocalizable.WIDTH, MGPValidators.range(1, 99)),
                emptyRows:
                    new NumberConfig(8,
                                     RulesConfigDescriptionLocalizable.NUMBER_OF_EMPTY_ROWS,
                                     MGPValidators.range(1, 99)),
                rowsOfSoldiers:
                    new NumberConfig(2,
                                     RulesConfigDescriptionLocalizable.NUMBER_OF_PIECES_ROWS,
                                     MGPValidators.range(1, 99)),
            },
        });

    public static get(): EpaminondasRules {
        if (EpaminondasRules.singleton.isAbsent()) {
            EpaminondasRules.singleton = MGPOptional.of(new EpaminondasRules());
        }
        return EpaminondasRules.singleton.get();
    }

    public static isLegal(move: EpaminondasMove, state: EpaminondasState): MGPFallible<EpaminondasLegalityInformation> {
        const phalanxValidity: MGPValidation = this.getPhalanxValidity(state, move);
        if (phalanxValidity.isFailure()) {
            return MGPFallible.failure(phalanxValidity.getReason());
        }
        const landingStatus: MGPFallible<EpaminondasLegalityInformation> = this.getLandingStatus(state, move);
        if (landingStatus.isFailure()) {
            return landingStatus;
        }
        const newBoard: PlayerOrNone[][] = TableUtils.copy(landingStatus.get());
        const opponent: Player = state.getCurrentOpponent();
        const captureValidity: MGPFallible<EpaminondasLegalityInformation> =
            EpaminondasRules.getCaptureValidity(state, newBoard, move, opponent);
        if (captureValidity.isFailure()) {
            return captureValidity;
        }
        return MGPFallible.success(captureValidity.get());
    }

    private static getPhalanxValidity(state: EpaminondasState, move: EpaminondasMove): MGPValidation {
        let coord: Coord = move.coord;
        if (state.isNotOnBoard(coord)) {
            return MGPValidation.failure(CoordFailure.OUT_OF_RANGE(coord));
        }
        const opponent: Player = state.getCurrentOpponent();
        for (let soldierIndex: number = 0; soldierIndex < move.phalanxSize; soldierIndex++) {
            if (state.isNotOnBoard(coord)) {
                return MGPValidation.failure(EpaminondasFailure.PHALANX_CANNOT_CONTAIN_PIECES_OUTSIDE_BOARD());
            }
            const spaceContent: PlayerOrNone = state.getPieceAt(coord);
            if (spaceContent.isNone()) {
                return MGPValidation.failure(EpaminondasFailure.PHALANX_CANNOT_CONTAIN_EMPTY_SQUARE());
            }
            if (spaceContent === opponent) {
                return MGPValidation.failure(EpaminondasFailure.PHALANX_CANNOT_CONTAIN_OPPONENT_PIECE());
            }
            coord = coord.getNext(move.direction, 1);
        }
        return MGPValidation.SUCCESS;
    }

    private static getLandingStatus(state: EpaminondasState, move: EpaminondasMove)
    : MGPFallible<EpaminondasLegalityInformation> {
        const newBoard: PlayerOrNone[][] = state.getCopiedBoard();
        const currentPlayer: Player = state.getCurrentPlayer();
        let emptied: Coord = move.coord;
        let landingCoord: Coord = move.coord.getNext(move.direction, move.phalanxSize);
        let landingIndex: number = 0;
        while (landingIndex + 1 < move.stepSize) {
            newBoard[emptied.y][emptied.x] = PlayerOrNone.NONE;
            newBoard[landingCoord.y][landingCoord.x] = currentPlayer;
            if (state.isNotOnBoard(landingCoord)) {
                return MGPFallible.failure(EpaminondasFailure.PHALANX_IS_LEAVING_BOARD());
            }
            if (state.getPieceAt(landingCoord).isPlayer()) {
                return MGPFallible.failure(EpaminondasFailure.SOMETHING_IN_PHALANX_WAY());
            }
            landingIndex++;
            landingCoord = landingCoord.getNext(move.direction, 1);
            emptied = emptied.getNext(move.direction, 1);
        }
        if (state.isNotOnBoard(landingCoord)) {
            return MGPFallible.failure(EpaminondasFailure.PHALANX_IS_LEAVING_BOARD());
        }
        if (state.getPieceAt(landingCoord) === currentPlayer) {
            return MGPFallible.failure(RulesFailure.SHOULD_LAND_ON_EMPTY_OR_OPPONENT_SPACE());
        }
        newBoard[emptied.y][emptied.x] = PlayerOrNone.NONE;
        newBoard[landingCoord.y][landingCoord.x] = currentPlayer;
        return MGPFallible.success(newBoard);
    }

    private static getCaptureValidity(oldState: EpaminondasState,
                                      board: PlayerOrNone[][],
                                      move: EpaminondasMove,
                                      opponent: Player)
    : MGPFallible<EpaminondasLegalityInformation>
    {
        let capturedSoldier: Coord = move.coord.getNext(move.direction, move.phalanxSize + move.stepSize - 1);
        let captured: number = 0;
        while (oldState.hasPieceAt(capturedSoldier, opponent)) {
            // Capture
            if (captured > 0) {
                board[capturedSoldier.y][capturedSoldier.x] = PlayerOrNone.NONE;
            }
            captured++;
            if (move.phalanxSize <= captured) {
                return MGPFallible.failure(EpaminondasFailure.PHALANX_SHOULD_BE_GREATER_TO_CAPTURE());
            }
            capturedSoldier = capturedSoldier.getNext(move.direction, 1);
        }
        return MGPFallible.success(board);
    }

    public override getInitialState(optionalConfig: MGPOptional<EpaminondasConfig>): EpaminondasState {
        const config: EpaminondasConfig = optionalConfig.get();
        const _: PlayerOrNone = PlayerOrNone.NONE;
        const O: PlayerOrNone = PlayerOrNone.ZERO;
        const X: PlayerOrNone = PlayerOrNone.ONE;
        const upperBoard: PlayerOrNone[][] = TableUtils.create(config.width, config.rowsOfSoldiers, X);
        const middleBoard: PlayerOrNone[][] = TableUtils.create(config.width, config.emptyRows, _);
        const lowerBoard: PlayerOrNone[][] = TableUtils.create(config.width, config.rowsOfSoldiers, O);
        const board: Table<PlayerOrNone> = upperBoard.concat(middleBoard).concat(lowerBoard);
        return new EpaminondasState(board, 0);
    }

    public override getRulesConfigDescription(): MGPOptional<RulesConfigDescription<EpaminondasConfig>> {
        return MGPOptional.of(EpaminondasRules.RULES_CONFIG_DESCRIPTION);
    }

    public override isLegal(move: EpaminondasMove, state: EpaminondasState)
    : MGPFallible<EpaminondasLegalityInformation>
    {
        return EpaminondasRules.isLegal(move, state);
    }

    public override applyLegalMove(_move: EpaminondasMove,
                                   state: EpaminondasState,
                                   _config: MGPOptional<EpaminondasConfig>,
                                   newBoard: EpaminondasLegalityInformation)
    : EpaminondasState
    {
        const resultingState: EpaminondasState = new EpaminondasState(newBoard, state.turn + 1);
        return resultingState;
    }

    public override getGameStatus(node: EpaminondasNode, _config: MGPOptional<EpaminondasConfig>): GameStatus {
        const state: EpaminondasState = node.gameState;
        const zerosInFirstLine: number = state.countRow(Player.ZERO, 0);
        const height: number = state.getHeight();
        const onesInLastLine: number = state.countRow(Player.ONE, height - 1);
        if (state.turn % 2 === 0) {
            if (zerosInFirstLine > onesInLastLine) {
                return GameStatus.ZERO_WON;
            }
        } else {
            if (onesInLastLine > zerosInFirstLine) {
                return GameStatus.ONE_WON;
            }
        }
        const doesZeroOwnPieces: boolean = state.doesOwnPiece(Player.ZERO);
        if (doesZeroOwnPieces === false) {
            return GameStatus.ONE_WON;
        }
        const doesOneOwnPieces: boolean = state.doesOwnPiece(Player.ONE);
        if (doesOneOwnPieces === false) {
            return GameStatus.ZERO_WON;
        }
        return GameStatus.ONGOING;
    }

}
