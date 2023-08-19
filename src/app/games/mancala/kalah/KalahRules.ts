import { MGPNode } from 'src/app/jscaip/MGPNode';
import { KalahMove } from './KalahMove';
import { MancalaState } from './../commons/MancalaState';
import { MGPOptional } from 'src/app/utils/MGPOptional';
import { MGPValidation } from 'src/app/utils/MGPValidation';
import { MGPFallible } from 'src/app/utils/MGPFallible';
import { MancalaDistribution } from '../commons/MancalaMove';
import { MancalaCaptureResult, MancalaDistributionResult, MancalaRules } from '../commons/MancalaRules';
import { Coord } from 'src/app/jscaip/Coord';
import { ArrayUtils } from 'src/app/utils/ArrayUtils';
import { MancalaFailure } from '../commons/MancalaFailure';
import { Utils } from 'src/app/utils/utils';

export class KalahNode extends MGPNode<KalahRules, KalahMove, MancalaState> {}

export class KalahRules extends MancalaRules<KalahMove> {

    private static singleton: MGPOptional<KalahRules> = MGPOptional.empty();

    public static get(): KalahRules {
        if (KalahRules.singleton.isAbsent()) {
            KalahRules.singleton = MGPOptional.of(new KalahRules());
        }
        return KalahRules.singleton.get();
    }
    private constructor() {
        super({
            passByPlayerStore: true,
            mustFeed: false,
            feedOriginalHouse: true,
        });
    }
    public isLegal(move: KalahMove, state: MancalaState): MGPValidation {
        const playerY: number = state.getCurrentPlayerY();
        let canStillPlay: boolean = true;
        for (const subMove of move) {
            Utils.assert(canStillPlay === true, 'CANNOT_PLAY_AFTER_NON_KALAH_MOVE');
            const subMoveResult: MGPFallible<boolean> = this.isLegalSubMove(subMove, state);
            if (subMoveResult.isFailure()) {
                return MGPValidation.ofFallible(subMoveResult);
            } else {
                state = this.distributeHouse(subMove.x, playerY, state).resultingState;
                canStillPlay = subMoveResult.get();
            }
        }
        Utils.assert(canStillPlay === false, 'MUST_CONTINUE_PLAYING_AFTER_KALAH_MOVE');
        return MGPValidation.SUCCESS;
    }
    /**
      * @param subMove the sub move to try
      * @return: MGPFallible.failure(reason) if it is illegal, MGPFallible.success(userCanStillPlay)
      */
    private isLegalSubMove(subMove: MancalaDistribution, state: MancalaState): MGPFallible<boolean> {
        const playerY: number = state.getCurrentPlayerY();
        if (state.getPieceAtXY(subMove.x, playerY) === 0) {
            return MGPFallible.failure(MancalaFailure.MUST_CHOOSE_NON_EMPTY_HOUSE());
        }
        const distributionResult: MancalaDistributionResult = this.distributeHouse(subMove.x, playerY, state);
        const isStarving: boolean = MancalaRules.isStarving(distributionResult.resultingState.getCurrentPlayer(),
                                                            distributionResult.resultingState.board);
        return MGPFallible.success(distributionResult.endsUpInKalah && isStarving === false);
    }
    public distributeMove(move: KalahMove, state: MancalaState): MancalaDistributionResult {
        const playerValue: number = state.getCurrentPlayer().value;
        const playerY: number = state.getCurrentPlayerY();
        const filledCoords: Coord[] = [];
        let passedByKalahNTimes: number = 0;
        let endUpInKalah: boolean = false;
        for (const subMove of move) {
            const distributionResult: MancalaDistributionResult = this.distributeHouse(subMove.x, playerY, state);
            const captures: [number, number] = state.getScoresCopy();
            captures[playerValue] += distributionResult.passedByKalahNTimes;
            state = distributionResult.resultingState;
            filledCoords.push(...distributionResult.filledCoords);
            passedByKalahNTimes += distributionResult.passedByKalahNTimes;
            endUpInKalah = distributionResult.endsUpInKalah;
        }
        const captured: [number, number] = state.getScoresCopy();
        captured[playerValue] += passedByKalahNTimes;
        const distributedState: MancalaState = new MancalaState(state.getCopiedBoard(), state.turn, captured);
        return {
            endsUpInKalah: endUpInKalah,
            filledCoords: filledCoords,
            passedByKalahNTimes,
            resultingState: distributedState,
        };
    }
    public applyCapture(distributionResult: MancalaDistributionResult): MancalaCaptureResult {
        const distributedState: MancalaState = distributionResult.resultingState;
        const capturelessResult: MancalaCaptureResult = {
            capturedSum: 0,
            captureMap: [[0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0]],
            resultingState: distributedState,
        };
        if (distributionResult.endsUpInKalah) {
            return capturelessResult;
        } else {
            const landingSpace: Coord = distributionResult.filledCoords[distributionResult.filledCoords.length - 1];
            const playerY: number = distributionResult.resultingState.getCurrentPlayerY();
            const opponentY: number = distributionResult.resultingState.getOpponentY();
            const landingSeeds: number = distributionResult.resultingState.getPieceAt(landingSpace);
            const parallelSeeds: number = distributionResult.resultingState.getPieceAtXY(landingSpace.x, opponentY);
            if (landingSpace.y === playerY && landingSeeds === 1 && parallelSeeds > 0) {
                // We can capture
                const board: number[][] = distributedState.getCopiedBoard();
                const capturedSum: number = board[0][landingSpace.x] + board[1][landingSpace.x];
                const captureMap: number[][] = ArrayUtils.createTable(MancalaState.WIDTH, 2, 0);
                captureMap[0][landingSpace.x] = board[0][landingSpace.x];
                captureMap[1][landingSpace.x] = board[1][landingSpace.x];
                board[0][landingSpace.x] = 0;
                board[1][landingSpace.x] = 0;
                const captured: [number, number] = distributedState.getScoresCopy();
                captured[distributedState.getCurrentPlayer().value] += capturedSum;
                const postCaptureState: MancalaState = new MancalaState(board,
                                                                        distributedState.turn,
                                                                        captured);
                return {
                    capturedSum, captureMap, resultingState: postCaptureState,
                };
            } else {
                return capturelessResult;
            }
        }
    }
}
