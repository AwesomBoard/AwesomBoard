import { ArrayUtils, MGPFallible, MGPMap, MGPOptional } from '@everyboard/lib';
import { ConfigurableRules } from '../../jscaip/Rules';
import { GameNode } from 'src/app/jscaip/AI/GameNode';
import { EncapsuleState, EncapsuleSpace, EncapsuleSizeToNumberMap, EncapsuleRemainingPieces } from './EncapsuleState';
import { Coord } from 'src/app/jscaip/Coord';
import { Player, PlayerOrNone } from 'src/app/jscaip/Player';
import { EncapsuleMove } from './EncapsuleMove';
import { EncapsulePiece } from './EncapsulePiece';
import { EncapsuleFailure } from './EncapsuleFailure';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { GameStatus } from 'src/app/jscaip/GameStatus';
import { TableUtils } from 'src/app/jscaip/TableUtils';
import { Debug } from 'src/app/utils/Debug';
import { NumberConfig, RulesConfigDescription, RulesConfigDescriptionLocalizable } from 'src/app/components/wrapper-components/rules-configuration/RulesConfigDescription';
import { MGPValidators } from 'src/app/utils/MGPValidator';
import { NInARowHelper } from 'src/app/jscaip/NInARowHelper';
import { PlayerMap } from 'src/app/jscaip/PlayerMap';

export type EncapsuleConfig = {

    nInARow: number,

    width: number,

    height: number,

    nbOfSizes: number,

    nbOfEachPiece: number,
}

export type EncapsuleLegalityInformation = EncapsuleSpace;

export class EncapsuleNode extends GameNode<EncapsuleMove, EncapsuleState> {}

@Debug.log
export class EncapsuleRules extends ConfigurableRules<EncapsuleMove,
                                                      EncapsuleState,
                                                      EncapsuleConfig,
                                                      EncapsuleLegalityInformation>
{
    private static singleton: MGPOptional<EncapsuleRules> = MGPOptional.empty();

    public static readonly RULES_CONFIG_DESCRIPTION: RulesConfigDescription<EncapsuleConfig> =
        new RulesConfigDescription<EncapsuleConfig>({
            name: (): string => $localize`Encapsule`,
            config: {
                nInARow:
                    new NumberConfig(3, RulesConfigDescriptionLocalizable.ALIGNMENT_SIZE, MGPValidators.range(1, 99)),
                width:
                    new NumberConfig(3, RulesConfigDescriptionLocalizable.WIDTH, MGPValidators.range(3, 99)),
                height:
                    new NumberConfig(3, RulesConfigDescriptionLocalizable.HEIGHT, MGPValidators.range(3, 99)),
                nbOfSizes:
                    new NumberConfig(8, () => $localize`Number of different piece sizes`, MGPValidators.range(1, 8)),
                nbOfEachPiece:
                    new NumberConfig(2, () => $localize`Number of pieces for each size`, MGPValidators.range(1, 9)),
            },
        });

    public static get(): EncapsuleRules {
        if (EncapsuleRules.singleton.isAbsent()) {
            EncapsuleRules.singleton = MGPOptional.of(new EncapsuleRules());
        }
        return EncapsuleRules.singleton.get();
    }

    public override getInitialState(optionalConfig: MGPOptional<EncapsuleConfig>): EncapsuleState {
        const config: EncapsuleConfig = optionalConfig.get();
        const _: EncapsuleSpace = new EncapsuleSpace(new MGPMap());
        const startingBoard: EncapsuleSpace[][] = TableUtils.create(config.width, config.height, _);
        const initialPieces: EncapsuleRemainingPieces = this.getInitialEncapsulePieceMap(config);
        return new EncapsuleState(startingBoard, 0, initialPieces, config.nbOfSizes);
    }

    public override getRulesConfigDescription(): MGPOptional<RulesConfigDescription<EncapsuleConfig>> {
        return MGPOptional.of(EncapsuleRules.RULES_CONFIG_DESCRIPTION);
    }

    private getInitialEncapsulePieceMap(config: EncapsuleConfig): EncapsuleRemainingPieces {
        const playerZeroPiecesNumber: number[] = ArrayUtils.create(config.nbOfSizes, config.nbOfEachPiece);
        const playerOnePiecesNumber: number[] = ArrayUtils.create(config.nbOfSizes, config.nbOfEachPiece);
        return this.getEncapsulePieceMapFrom(playerZeroPiecesNumber, playerOnePiecesNumber);
    }

    public getEncapsulePieceMapFrom(playerZeroPiecesNumber: number[], playerOnePiecesNumber: number[])
    : EncapsuleRemainingPieces
    {
        const playerZero: EncapsuleSizeToNumberMap = this.getSizeToNumberMap(playerZeroPiecesNumber);
        const playerOne: EncapsuleSizeToNumberMap = this.getSizeToNumberMap(playerOnePiecesNumber);
        return PlayerMap.ofValues(playerZero, playerOne);
    }

    private getSizeToNumberMap(nbOfEachPieces: number[]): EncapsuleSizeToNumberMap {
        const map: EncapsuleSizeToNumberMap = new EncapsuleSizeToNumberMap();
        for (let i: number = 0; i < nbOfEachPieces.length; i++) {
            const size: number = i + 1;
            const nbOfEachPiece: number = nbOfEachPieces[i];
            map.set(size, nbOfEachPiece);
        }
        return map;
    }

    public getVictoriousCoords(state: EncapsuleState, config: EncapsuleConfig): Coord[] {
        const helper: NInARowHelper<EncapsuleSpace> = new NInARowHelper(
            (piece: EncapsuleSpace) => piece.getBiggest().getPlayer(),
            config.nInARow,
        );
        return helper.getVictoriousCoord(state);
    }

    public isVictory(state: EncapsuleState, config: EncapsuleConfig): MGPOptional<Player> {
        const victoriousCoords: Coord[] = this.getVictoriousCoords(state, config);
        if (victoriousCoords.length > 0) {
            const coord: Coord = victoriousCoords[0];
            return MGPOptional.of(state.getPieceAt(coord).getBiggest().getPlayer() as Player);
        } else {
            return MGPOptional.empty();
        }
    }

    public override isLegal(move: EncapsuleMove, state: EncapsuleState): MGPFallible<EncapsuleLegalityInformation> {
        let movingPiece: EncapsulePiece;
        if (move.isDropping()) {
            movingPiece = move.piece.get();
            const owner: PlayerOrNone = movingPiece.getPlayer();
            if (owner.isNone()) {
                return MGPFallible.failure(RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_EMPTY());
            }
            if (owner === state.getCurrentOpponent()) {
                return MGPFallible.failure(RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_OPPONENT());
            }
            if (state.isInRemainingPieces(movingPiece) === false) {
                return MGPFallible.failure(EncapsuleFailure.PIECE_OUT_OF_STOCK());
            }
        } else {
            const startingCoord: Coord = move.startingCoord.get();
            const startingSpace: EncapsuleSpace = state.getPieceAt(startingCoord);
            movingPiece = startingSpace.getBiggest();
            const owner: PlayerOrNone = movingPiece.getPlayer();
            if (owner.isNone()) {
                return MGPFallible.failure(RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_EMPTY());
            }
            if (owner === state.getCurrentOpponent()) {
                return MGPFallible.failure(RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_OPPONENT());
            }
        }
        const landingSpace: EncapsuleSpace = state.getPieceAt(move.landingCoord);
        const superpositionResult: MGPOptional<EncapsuleSpace> = landingSpace.tryToSuperposePiece(movingPiece);
        if (superpositionResult.isPresent()) {
            return MGPFallible.success(superpositionResult.get());
        }
        return MGPFallible.failure(EncapsuleFailure.INVALID_PLACEMENT());
    }

    public override applyLegalMove(move: EncapsuleMove,
                                   state: EncapsuleState,
                                   _config: MGPOptional<EncapsuleConfig>,
                                   newLandingSpace: EncapsuleLegalityInformation)
    : EncapsuleState
    {
        const newBoard: EncapsuleSpace[][] = state.getCopiedBoard();
        const currentPlayer: Player = state.getCurrentPlayer();
        const newRemainingPiecesMap: EncapsuleRemainingPieces = state.getRemainingPiecesCopy();
        const newRemainingPiece: EncapsuleSizeToNumberMap = newRemainingPiecesMap.get(currentPlayer).getCopy();
        const newTurn: number = state.turn + 1;
        newBoard[move.landingCoord.y][move.landingCoord.x] = newLandingSpace;
        let movingPiece: EncapsulePiece;
        if (move.isDropping()) {
            movingPiece = move.piece.get();
            newRemainingPiece.add(movingPiece.size, -1);
            newRemainingPiecesMap.put(currentPlayer, newRemainingPiece);
        } else {
            const startingCoord: Coord = move.startingCoord.get();
            const oldStartingSpace: EncapsuleSpace = newBoard[startingCoord.y][startingCoord.x];
            const removalResult: {removedSpace: EncapsuleSpace, removedPiece: EncapsulePiece} =
                oldStartingSpace.removeBiggest();
            newBoard[startingCoord.y][startingCoord.x] = removalResult.removedSpace;
            movingPiece = removalResult.removedPiece;
        }
        return new EncapsuleState(newBoard, newTurn, newRemainingPiecesMap, state.nbOfPieceSize);
    }

    public override getGameStatus(node: EncapsuleNode, config: MGPOptional<EncapsuleConfig>): GameStatus {
        const state: EncapsuleState = node.gameState;
        const winner: MGPOptional<Player> = this.isVictory(state, config.get());
        if (winner.isPresent()) {
            return GameStatus.getVictory(winner.get());
        } else {
            return GameStatus.ONGOING;
        }
    }

}
