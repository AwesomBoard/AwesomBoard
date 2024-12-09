import { MancalaState } from './MancalaState';
import { RectangularGameComponent } from 'src/app/components/game-components/rectangular-game-component/RectangularGameComponent';
import { MGPOptional, Set, MGPValidation, TimeUtils, Utils } from '@everyboard/lib';
import { Coord } from 'src/app/jscaip/Coord';
import { Table, TableUtils } from 'src/app/jscaip/TableUtils';
import { MessageDisplayer } from 'src/app/services/MessageDisplayer';
import { MancalaDistribution, MancalaMove } from './MancalaMove';
import { Player } from 'src/app/jscaip/Player';
import { MancalaCaptureResult, MancalaDistributionResult, MancalaDropResult, MancalaRules } from './MancalaRules';
import { ChangeDetectorRef } from '@angular/core';
import { MancalaFailure } from './MancalaFailure';
import { MancalaScoreMinimax } from './MancalaScoreMinimax';
import { PlayerNumberMap } from 'src/app/jscaip/PlayerMap';
import { MCTS } from 'src/app/jscaip/AI/MCTS';
import { MancalaConfig } from './MancalaConfig';
import { AI, AIOptions, MoveGenerator } from 'src/app/jscaip/AI/AI';
import { MCTSWithHeuristic } from 'src/app/jscaip/AI/MCTSWithHeuristic';
import { MancalaScoreHeuristic } from './MancalaScoreHeurisic';

export type SeedDropResult = {
    houseToDistribute: Coord,
    currentDropIsStore: boolean,
    seedsInHand: number,
    resultingState: MancalaState,
};

export abstract class MancalaComponent<R extends MancalaRules>
    extends RectangularGameComponent<R, MancalaMove, MancalaState, number, MancalaConfig>
{
    public static readonly TIMEOUT_BETWEEN_SEEDS: number = 100;

    // The awaited time between two laps or distributions
    public static readonly TIMEOUT_BETWEEN_LAPS: number = 1000;

    public MGPOptional: typeof MGPOptional = MGPOptional;

    public lastDistributedHouses: Coord[] = [];

    public currentMove: MGPOptional<MancalaMove> = MGPOptional.empty();

    public captured: Table<number> = TableUtils.create(6, 2, 0);

    private droppedInStore: PlayerNumberMap = PlayerNumberMap.of(0, 0);

    protected filledCoords: Coord[] = [];

    public constructedState: MancalaState;

    private opponentMoveIsBeingAnimated: boolean = false;

    public constructor(messageDisplayer: MessageDisplayer,
                       cdr: ChangeDetectorRef)
    {
        super(messageDisplayer, cdr);
        this.hasAsymmetricBoard = true;
        this.scores = MGPOptional.of(PlayerNumberMap.of(0, 0));
    }

    public getMancalaViewBox(): string {
        const left: number = - this.STROKE_WIDTH / 2;
        const up: number = - this.STROKE_WIDTH / 2;
        const width: number = this.getViewBoxWidth() + this.STROKE_WIDTH;
        const height: number = (2 * this.SPACE_SIZE) + 50;
        return left + ' ' + up + ' ' + width + ' ' + height;
    }

    public getViewBoxWidth(): number {
        return 60 + ((2 + this.getState().getWidth()) * this.SPACE_SIZE);
    }

    public override async showLastMove(move: MancalaMove): Promise<void> {
        this.droppedInStore = PlayerNumberMap.of(0, 0);
        const previousState: MancalaState = this.getPreviousState();
        const config: MancalaConfig = this.getConfig().get();
        const distributionResult: MancalaDistributionResult =
            this.rules.distributeMove(move, previousState, config);
        this.filledCoords = distributionResult.filledCoords;
        let captureResult: MancalaCaptureResult = this.rules.applyCapture(distributionResult, config);
        this.captured = captureResult.captureMap;
        const playerY: number = previousState.getCurrentPlayerY();
        this.lastDistributedHouses = move.distributions.map((d: MancalaDistribution) => new Coord(d.x, playerY));
        const monsoonedPlayer: Player[] = this.rules.mustMonsoon(captureResult.resultingState, config);
        if (monsoonedPlayer.length > 0) {
            captureResult = this.rules.monsoon(Player.ZERO, captureResult); // Who captures here is not important
            this.captured = captureResult.captureMap;
        }
        this.changeVisibleState(this.getState());
    }

    public async updateBoard(triggerAnimation: boolean): Promise<void> {
        const state: MancalaState = this.getState();
        if (triggerAnimation) {
            this.opponentMoveIsBeingAnimated = true;
            this.animationOngoing = true;
            Utils.assert(this.node.parent.isPresent(), 'triggerAnimation in store should be false at first turn');
            this.changeVisibleState(this.node.parent.get().gameState);
            let indexDistribution: number = 0;
            const move: MancalaMove = this.node.previousMove.get();
            for (const distributions of move) {
                await this.showSeedBySeedDistribution(distributions);
                if (indexDistribution + 1 < move.distributions.length) {
                    // This prevent to wait 1sec at the end of the animation for nothing
                    await TimeUtils.sleep(MancalaComponent.TIMEOUT_BETWEEN_LAPS);
                }
                indexDistribution++;
            }
            this.opponentMoveIsBeingAnimated = false;
            this.animationOngoing = false;
        }
        this.scores = MGPOptional.of(state.getScoresCopy());
        this.changeVisibleState(state);
    }

    public async onClick(x: number, y: number): Promise<MGPValidation> {
        const clickValidity: MGPValidation = await this.canUserPlay('#click-' + x + '-' + y);
        if (clickValidity.isFailure()) {
            return this.cancelMove(clickValidity.getReason());
        }
        if (this.animationOngoing) {
            return MGPValidation.SUCCESS;
        } else {
            this.animationOngoing = true;
            const result: MGPValidation = await this.onLegalClick(x, y);
            this.animationOngoing = false;
            return result;
        }
    }

    public async onLegalClick(x: number, y: number): Promise<MGPValidation> {
        if (Player.of(y) === this.getState().getCurrentPlayer()) {
            return this.cancelMove(MancalaFailure.MUST_DISTRIBUTE_YOUR_OWN_HOUSES());
        }
        this.updateOrCreateCurrentMove(x);
        if (this.constructedState.getPieceAtXY(x, y) === 0) {
            return this.cancelMove(MancalaFailure.MUST_CHOOSE_NON_EMPTY_HOUSE());
        } else {
            return this.continueMoveConstruction(x);
        }
    }

    protected async continueMoveConstruction(x: number): Promise<MGPValidation> {
        const moveValidity: MGPValidation = await this.isDistributionLegal(x);
        if (moveValidity.isFailure()) {
            return this.cancelMove(moveValidity.getReason());
        }
        const distributionResult: MancalaDistributionResult =
            await this.showSeedBySeedDistribution(MancalaDistribution.of(x));
        if (distributionResult.endsUpInStore &&
            this.getConfig().get().mustContinueDistributionAfterStore)
        {
            const player: Player = this.constructedState.getCurrentPlayer();
            if (MancalaRules.isStarving(player, distributionResult.resultingState.board)) {
                // Player has no more seed to distribute
                return this.chooseMove(this.currentMove.get());
            } else {
                // Player can still distribute
                return MGPValidation.SUCCESS;
            }
        } else {
            return this.chooseMove(this.currentMove.get());
        }
    }

    private async isDistributionLegal(x: number): Promise<MGPValidation> {
        const config: MGPOptional<MancalaConfig> = this.getConfig();
        const distributionResult: MancalaDistributionResult =
            await this.getDistributionResult(MancalaDistribution.of(x));
        if (distributionResult.endsUpInStore &&
            config.get().mustContinueDistributionAfterStore)
        {
            const player: Player = this.constructedState.getCurrentPlayer();
            if (MancalaRules.isStarving(player, distributionResult.resultingState.board)) {
                // Player has no more seed to distribute
                return this.rules.isLegal(this.currentMove.get(), this.getState(), config);
            } else {
                // Player can still distribute
                return MGPValidation.SUCCESS;
            }
        } else {
            return this.rules.isLegal(this.currentMove.get(), this.getState(), config);
        }
    }

    private async getDistributionResult(distribution: MancalaDistribution): Promise<MancalaDistributionResult> {
        return this.getSimpleDistributionResult(distribution, false);
    }

    private async showSeedBySeedDistribution(distribution: MancalaDistribution): Promise<MancalaDistributionResult> {
        return this.getSimpleDistributionResult(distribution, true);
    }

    private async getSimpleDistributionResult(distribution: MancalaDistribution, showSeedBySeed: boolean)
    : Promise<MancalaDistributionResult>
    {
        const state: MancalaState = this.constructedState;
        const playerY: number = state.getCurrentPlayerY();
        const coord: Coord = new Coord(distribution.x, playerY);
        this.lastDistributedHouses.push(coord);
        const config: MancalaConfig = this.getConfig().get();
        if (showSeedBySeed) {
            await this.showSeedBySeed(coord, state);
        }
        const previousDistributionResult: MancalaDistributionResult = MancalaRules.getEmptyDistributionResult(state);
        const distributionResult: MancalaDistributionResult =
            this.rules.distributeHouse(distribution.x, playerY, previousDistributionResult, config);
        return distributionResult;
    }

    private async showSeedBySeed(coord: Coord, state: MancalaState): Promise<void> {
        const config: MancalaConfig = this.getConfig().get();
        const initial: Coord = coord; // to remember in order not to sow in the starting space if we make a full turn
        let mustDoOneMoreLap: boolean = true;
        let seedDropResult: SeedDropResult = {
            currentDropIsStore: false,
            houseToDistribute: coord,
            resultingState: state,
            seedsInHand: 0,
        };
        while (mustDoOneMoreLap) {
            seedDropResult.seedsInHand =
                seedDropResult.resultingState.getPieceAt(seedDropResult.houseToDistribute);
            seedDropResult.resultingState =
                seedDropResult.resultingState.setPieceAt(seedDropResult.houseToDistribute, 0);
            // Changing immediately the chosen house
            this.changeVisibleState(seedDropResult.resultingState);
            await TimeUtils.sleep(MancalaComponent.TIMEOUT_BETWEEN_SEEDS);
            while (seedDropResult.seedsInHand > 0) {
                seedDropResult = await this.showSeedDrop(seedDropResult,
                                                         config,
                                                         initial);
            }
            if (seedDropResult.currentDropIsStore || config.continueLapUntilCaptureOrEmptyHouse === false) {
                mustDoOneMoreLap = false;
            } else {
                const lastHouseContent: number =
                    seedDropResult.resultingState.getPieceAt(seedDropResult.houseToDistribute);
                mustDoOneMoreLap = lastHouseContent !== 1 && lastHouseContent !== 4;
                if (mustDoOneMoreLap) {
                    await TimeUtils.sleep(MancalaComponent.TIMEOUT_BETWEEN_LAPS);
                }
            }
        }
    }

    private async showSeedDrop(seedDropResult: SeedDropResult,
                               config: MancalaConfig,
                               initial: Coord)
    : Promise<SeedDropResult>
    {
        const player: Player = seedDropResult.resultingState.getCurrentPlayer();
        const nextCoord: MGPOptional<Coord> = this.rules.getNextCoord(seedDropResult.houseToDistribute,
                                                                      seedDropResult.currentDropIsStore,
                                                                      seedDropResult.resultingState,
                                                                      config);
        const currentDropIsStore: boolean = nextCoord.isAbsent();
        let seedsInHand: number = seedDropResult.seedsInHand;
        let resultingState: MancalaState = seedDropResult.resultingState;
        let houseToDistribute: Coord = seedDropResult.houseToDistribute;
        if (currentDropIsStore) {
            seedsInHand--;
            this.filledCoords.push(MancalaRules.FAKE_STORE_COORD.get(player).get());
            this.droppedInStore.add(player, 1);
            resultingState = resultingState.feedStore(player);
        } else {
            houseToDistribute = nextCoord.get();
            if (initial.equals(houseToDistribute) === false || config.feedOriginalHouse) {
                // not to distribute on our starting space
                const feedResult: MancalaDropResult =
                    this.rules.getDropResult(seedsInHand, resultingState, houseToDistribute);
                resultingState = feedResult.resultingState;
                this.captured = TableUtils.add(this.captured, feedResult.captureMap);
                this.filledCoords.push(houseToDistribute);
                seedsInHand--; // drop in this space a piece we have in hand
            }
        }
        this.changeVisibleState(resultingState);
        if (seedsInHand > 0) {
            await TimeUtils.sleep(MancalaComponent.TIMEOUT_BETWEEN_SEEDS);
        }
        return { houseToDistribute, currentDropIsStore, seedsInHand, resultingState };
    }

    public override hideLastMove(): void {
        const width: number = this.config.get().width;
        this.captured = TableUtils.create(width, 2, 0);
        this.filledCoords = [];
        this.lastDistributedHouses = [];
        this.changeVisibleState(this.getState());
    }

    public override cancelMoveAttempt(): void {
        this.currentMove = MGPOptional.empty();
        this.droppedInStore = PlayerNumberMap.of(0, 0);
        this.filledCoords = [];
        this.lastDistributedHouses = [];
        this.changeVisibleState(this.getState());
    }

    public getSpaceClasses(x: number, y: number): string[] {
        const coord: Coord = new Coord(x, y);
        const homeOwner: Player = this.getSpaceOwner(coord);
        const homeColor: string = this.getPlayerClass(homeOwner);
        if (this.getStoreOwner(coord).isAbsent() && this.captured[y][x] > 0) {
            return ['captured-fill', 'moved-stroke'];
        } else if (this.lastDistributedHouses.some((c: Coord) => c.equals(coord))) {
            return ['last-move-stroke', homeColor];
        } else if (this.filledCoords.some((c: Coord) => c.equals(coord))) {
            return ['moved-stroke', homeColor];
        } else {
            return [homeColor];
        }
    }

    private getStoreOwner(coord: Coord): MGPOptional<Set<Player>> {
        return MancalaRules.FAKE_STORE_COORD.reverse().get(coord);
    }

    private getSpaceOwner(coord: Coord): Player {
        const owner: MGPOptional<Set<Player>> = this.getStoreOwner(coord);
        if (owner.isPresent()) {
            return owner.get().getAnyElement().get(); // Only one player can be in there
        } else {
            return Player.of((coord.y + 1) % 2);
        }
    }

    public getPieceCx(x: number): number {
        return 80 + 100 * (x + 1);
    }

    public getPieceCy(y: number): number {
        return 60 + 120 * y;
    }

    public getPieceTransform(x: number, y: number): string {
        const cx: number = this.getPieceCx(x);
        const cy: number = this.getPieceCy(y);
        return this.getSVGTranslation(cx, cy);
    }

    public getPieceRotation(): string {
        return 'rotate(' + this.getPointOfView().getValue() * 180 + ')';
    }

    public getHouseSecondaryContent(x: number, y: number): MGPOptional<string> {
        const previousContent: number = this.getPreviousStableState().getPieceAtXY(x, y);
        const currentContent: number = this.constructedState.getPieceAtXY(x, y);
        const difference: number = currentContent - previousContent;
        if (this.captured[y][x] > 0) {
            return MGPOptional.of('-' + this.captured[y][x]);
        } else if (difference > 0) {
            return MGPOptional.of('+' + difference);
        } else if (difference < 0) {
            return MGPOptional.of('' + difference);
        } else {
            return MGPOptional.empty();
        }
    }

    public getStoreContent(owner: Player): number {
        return this.scores.get().get(owner) + this.droppedInStore.get(owner);
    }

    public getStoreSecondaryContent(owner: Player): MGPOptional<string> {
        const previousScore: number = this.getPreviousStableState().scores.get(owner);
        const currentScore: number = this.constructedState.scores.get(owner);
        const difference: number = currentScore - previousScore;
        if (difference > 0) {
            return MGPOptional.of('+' + difference);
        } else {
            return MGPOptional.empty();
        }
    }

    private getPreviousStableState(): MancalaState {
        if (this.opponentMoveIsBeingAnimated) {
            Utils.assert(this.getTurn() > 0, 'Kalah: Should not animate move at turn 0');
            return this.node.parent.get().gameState;
        } else {
            if (this.constructedState.equals(this.getState())) {
                if (this.node.parent.isPresent()) {
                    return this.node.parent.get().gameState;
                } else {
                    return this.getState();
                }
            } else {
                return this.getState();
            }
        }
    }

    public async onStoreClick(owner: Player): Promise<MGPValidation> {
        const clickValidity: MGPValidation = await this.canUserPlay('#store-' + owner.toString());
        if (clickValidity.isFailure()) {
            return this.cancelMove(clickValidity.getReason());
        }
        return this.cancelMove(MancalaFailure.MUST_DISTRIBUTE_YOUR_OWN_HOUSES());
    }

    private changeVisibleState(state: MancalaState): void {
        this.constructedState = state;
        this.board = this.constructedState.board;
        this.cdr.detectChanges();
    }

    protected createAIs(moveGenerator: MoveGenerator<MancalaMove, MancalaState, MancalaConfig>)
    : AI<MancalaMove, MancalaState, AIOptions, MancalaConfig>[]
    {
        return [
            new MancalaScoreMinimax(this.rules, moveGenerator),
            new MCTS($localize`MCTS`, moveGenerator, this.rules),
            new MCTSWithHeuristic($localize`MCTS with heuristic`, moveGenerator, this.rules, new MancalaScoreHeuristic()),
        ];
    }

    /**
     * Used to create or update this.currentMove
     * for single sow it will always be creating it
     * for multiple sow it will sometime be the second sub-distribution of the move
     * @param x the X value of the distribution that has been done
     */
    protected updateOrCreateCurrentMove(x: number): void {
        if (this.currentMove.isPresent()) {
            const newMove: MancalaMove = this.addToMove(x);
            this.currentMove = MGPOptional.of(newMove);
        } else {
            this.currentMove = MGPOptional.of(this.generateMove(x));
        }
    }

    public generateMove(x: number): MancalaMove {
        return MancalaMove.of(MancalaDistribution.of(x));
    }

    protected addToMove(x: number): MancalaMove {
        return this.currentMove.get().add(MancalaDistribution.of(x));
    }

}
