import { MancalaState } from '../common/MancalaState';
import { KalahMove } from '../kalah/KalahMove';
import { Coord } from 'src/app/jscaip/Coord';
import { MancalaFailure } from './../common/MancalaFailure';
import { MGPValidation } from 'src/app/utils/MGPValidation';
import { Player } from 'src/app/jscaip/Player';
import { MGPOptional } from 'src/app/utils/MGPOptional';
import { MancalaCaptureResult, MancalaDistributionResult, MancalaRules } from '../common/MancalaRules';
import { Utils } from 'src/app/utils/utils';
import { MancalaConfig } from '../common/MancalaConfig';
import { GameNode } from 'src/app/jscaip/GameNode';
import { MGPValidators } from 'src/app/utils/MGPValidator';
import { RulesConfigDescription } from 'src/app/components/wrapper-components/rules-configuration/RulesConfigDescription';

export class AwaleNode extends GameNode<KalahMove, MancalaState> {} // TODO: Unify

export class AwaleRules extends MancalaRules<KalahMove> {

    private static singleton: MGPOptional<AwaleRules> = MGPOptional.empty();

    public static readonly RULES_CONFIG_DESCRIPTION: RulesConfigDescription<MancalaConfig> =
        new RulesConfigDescription(
            {
                name: (): string => $localize`Awalé`,
                config: {
                    feedOriginalHouse: false,
                    mustFeed: true,
                    passByPlayerStore: false,
                    continueDistributionAfterStore: false,
                    seedsByHouse: 4,
                    width: 6,
                },
            }, {
                width: (): string => $localize`Width`,
                seedsByHouse: (): string => $localize`Seed by house`,
                feedOriginalHouse: (): string => $localize`Feed original house`,
                mustFeed: (): string => $localize`Must feed`,
                passByPlayerStore: (): string => $localize`Pass by player store`,
                continueDistributionAfterStore: (): string => $localize`Continue distribution after last seed ends in store`,
            }, [
            ], {
                width: MGPValidators.range(1, 99),
                seedsByHouse: MGPValidators.range(1, 99),
            });

    public static get(): AwaleRules {
        if (AwaleRules.singleton.isAbsent()) {
            AwaleRules.singleton = MGPOptional.of(new AwaleRules());
        }
        return AwaleRules.singleton.get();
    }

    private constructor() {
        super(AwaleRules.RULES_CONFIG_DESCRIPTION.getDefaultConfig().config);
    }

    public override getRulesConfigDescription(): RulesConfigDescription<MancalaConfig> {
        return AwaleRules.RULES_CONFIG_DESCRIPTION;
    }

    public distributeMove(move: KalahMove, state: MancalaState): MancalaDistributionResult {
        const playerValue: number = state.getCurrentPlayer().value;
        const playerY: number = state.getCurrentPlayerY();
        const filledCoords: Coord[] = [];
        let passedByStoreNTimes: number = 0;
        let endsUpInStore: boolean = false;
        let postDistributionState: MancalaState = state;
        for (const distributions of move) {
            const distributionResult: MancalaDistributionResult =
                this.distributeHouse(distributions.x, playerY, postDistributionState);
            const captures: [number, number] = postDistributionState.getScoresCopy();
            captures[playerValue] += distributionResult.passedByStoreNTimes;
            postDistributionState = distributionResult.resultingState;
            filledCoords.push(...distributionResult.filledCoords);
            passedByStoreNTimes += distributionResult.passedByStoreNTimes;
            endsUpInStore = distributionResult.endsUpInStore;
        }
        const captured: [number, number] = postDistributionState.getScoresCopy();
        const distributedState: MancalaState = new MancalaState(postDistributionState.getCopiedBoard(),
                                                                postDistributionState.turn,
                                                                captured,
                                                                postDistributionState.config);
        return {
            endsUpInStore,
            filledCoords,
            passedByStoreNTimes,
            resultingState: distributedState,
        };
    }

    public applyCapture(distributionResult: MancalaDistributionResult): MancalaCaptureResult {
        const filledCoords: Coord[] = distributionResult.filledCoords;
        const landingCoord: Coord = filledCoords[filledCoords.length - 1];
        const resultingState: MancalaState = distributionResult.resultingState;
        return this.captureIfLegal(landingCoord.x, landingCoord.y, resultingState);
    }

    public isLegal(move: KalahMove, state: MancalaState): MGPValidation {
        const opponent: Player = state.getCurrentOpponent();
        const playerY: number = state.getCurrentPlayerY();

        const x: number = move.distributions[0].x;
        if (state.getPieceAtXY(x, playerY) === 0) {
            return MGPValidation.failure(MancalaFailure.MUST_CHOOSE_NON_EMPTY_HOUSE());
        }
        const opponentIsStarving: boolean = MancalaRules.isStarving(opponent, state.board);
        const playerDoesNotDistribute: boolean = this.doesDistribute(x, playerY, state.board) === false;
        if (opponentIsStarving && playerDoesNotDistribute) {
            return MGPValidation.failure(MancalaFailure.SHOULD_DISTRIBUTE());
        }
        return MGPValidation.SUCCESS;
    }

    /**
     * Only called if y and player are not equal.
     * If the condition to make a capture into the opponent's side are met
     * Captures and return the number of captured
     * Captures even if this could mean doing an illegal starvation
     */
    private capture(x: number, y: number, state: MancalaState): MancalaCaptureResult {
        const playerY: number = state.getCurrentPlayerY();
        Utils.assert(y !== playerY, 'AwaleRules.capture cannot capture the players house');
        const resultingBoard: number[][] = state.getCopiedBoard();
        let target: number = resultingBoard[y][x];
        let capturedSum: number = 0;
        const captureMap: number[][] = [
            [0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0],
        ];
        if ((target < 2) || (target > 3)) {
            // first space not capturable, we apply no change
            return { capturedSum: 0, captureMap, resultingState: state };
        }

        let direction: number = -1; // by defaut, capture from right to left
        let limit: number = -1;
        if (state.getCurrentPlayer() === Player.ONE) {
            /** if Player.ONE capture, it is on the bottom line
             * means capture goes from left to right ( + 1)
             * so one ending condition of the loop is reaching index MancalaState.WIDTH
             */
            direction = +1;
            limit = state.getWidth();
        }

        do {
            captureMap[y][x] = target; // we addPart to the player score the captured seeds
            capturedSum += target;
            resultingBoard[y][x] = 0; // since now they're capture, we get them off the board
            x += direction;
            target = resultingBoard[y][x];
        } while ((x !== limit) && ((target === 2) || (target === 3)));
        const captured: [number, number] = state.getScoresCopy();
        captured[state.getCurrentPlayer().value] += capturedSum;
        return {
            capturedSum,
            captureMap,
            resultingState: new MancalaState(resultingBoard, state.turn, captured, state.config),
        };
    }

    public captureIfLegal(x: number, y: number, state: MancalaState): MancalaCaptureResult {
        const player: Player = state.getCurrentPlayer();
        const captureLessResult: MancalaCaptureResult = {
            capturedSum: 0,
            resultingState: state, // Apply no capture
            captureMap: [
                [0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0],
            ],
        };
        if (y === player.value) {
            const captureResult: MancalaCaptureResult = this.capture(x, y, state);
            const isStarving: boolean = MancalaRules.isStarving(player.getOpponent(),
                                                                captureResult.resultingState.board);
            if (captureResult.capturedSum > 0 && isStarving) {
                /* if the distribution would capture all seeds
                 * the capture is forbidden and cancelled
                 */
                return captureLessResult;
            } else {
                return captureResult;
            }
        } else {
            return captureLessResult;
        }
    }

}
