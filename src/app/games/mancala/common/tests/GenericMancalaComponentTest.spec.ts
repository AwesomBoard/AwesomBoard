/* eslint-disable max-lines-per-function */
import { DebugElement, Type } from '@angular/core';
import { fakeAsync, tick } from '@angular/core/testing';
import { ComponentTestUtils } from 'src/app/utils/tests/TestUtils.spec';
import { Encoder, MGPOptional, Utils } from '@everyboard/lib';
import { MoveGenerator } from 'src/app/jscaip/AI/AI';
import { MancalaConfig } from '../MancalaConfig';
import { RulesConfigUtils } from 'src/app/jscaip/RulesConfigUtil';
import { PlayerNumberMap } from 'src/app/jscaip/PlayerMap';
import { MoveTestUtils } from 'src/app/jscaip/tests/Move.spec';
import { Cell, Table } from 'src/app/jscaip/TableUtils';
import { MancalaComponent, SeedDropResult } from '../MancalaComponent';
import { MancalaDropResult, MancalaRules } from '../MancalaRules';
import { MancalaDistribution, MancalaMove } from '../MancalaMove';
import { MancalaState } from '../MancalaState';
import { Coord } from 'src/app/jscaip/Coord';
import { MancalaFailure } from '../MancalaFailure';
import { Player } from 'src/app/jscaip/Player';

type MancalaHouseContents = Cell<{ mainContent: string, secondaryContent?: string }>;

export class MancalaComponentTestUtils<C extends MancalaComponent<R>,
                                       R extends MancalaRules>
{

    public constructor(public readonly testUtils: ComponentTestUtils<C>,
                       public readonly moveGenerator: MoveGenerator<MancalaMove, MancalaState, MancalaConfig>) {
    }

    public async expectMoveSuccess(click: string, move: MancalaMove, config: MancalaConfig): Promise<void> {
        const component: C = this.testUtils.getGameComponent();
        const state: MancalaState = component.constructedState;
        const playerY: number = state.getCurrentPlayerY();
        const lastDistribution: MancalaDistribution = move.distributions[move.distributions.length - 1];
        const coord: Coord = new Coord(lastDistribution.x, playerY);
        const moveDuration: number = this.showSeedBySeed(coord, state, config);
        await this.testUtils.expectMoveSuccess(click, move, moveDuration);
    }

    private showSeedBySeed(coord: Coord, state: MancalaState, config: MancalaConfig): number {
        const initial: Coord = coord; // to remember in order not to sow in the starting space if we make a full turn
        let seedDropResult: SeedDropResult = {
            currentDropIsStore: false,
            houseToDistribute: coord,
            seedsInHand: 0,
            resultingState: state,
        };
        let mustDoOneMoreLap: boolean = true;
        let awaitedTime: number = 0;
        while (mustDoOneMoreLap) {
            seedDropResult.seedsInHand =
                seedDropResult.resultingState.getPieceAt(seedDropResult.houseToDistribute);
            seedDropResult.resultingState =
                seedDropResult.resultingState.setPieceAt(seedDropResult.houseToDistribute, 0);
            // Changing immediately the chosen house
            awaitedTime += MancalaComponent.TIMEOUT_BETWEEN_SEEDS;
            while (seedDropResult.seedsInHand > 0) {
                ({ seedDropResult, awaitedTime } =
                    this.showSeedDrop(seedDropResult,
                                      config,
                                      initial,
                                      awaitedTime)
                );
            }
            if (seedDropResult.currentDropIsStore || config.continueLapUntilCaptureOrEmptyHouse === false) {
                mustDoOneMoreLap = false;
            } else {
                const lastHouseContent: number =
                    seedDropResult.resultingState.getPieceAt(seedDropResult.houseToDistribute);
                mustDoOneMoreLap = lastHouseContent !== 1 && lastHouseContent !== 4;
                if (mustDoOneMoreLap) {
                    awaitedTime += MancalaComponent.TIMEOUT_BETWEEN_LAPS;
                }
            }
        }
        return awaitedTime;
    }

    private showSeedDrop(seedDropResult: SeedDropResult,
                         config: MancalaConfig,
                         initial: Coord,
                         awaitedTime: number)
    : { seedDropResult: SeedDropResult, awaitedTime: number }
    {
        const component: C = this.testUtils.getGameComponent();
        const player: Player = seedDropResult.resultingState.getCurrentPlayer();
        const nextCoord: MGPOptional<Coord> = component.rules.getNextCoord(seedDropResult.houseToDistribute,
                                                                           seedDropResult.currentDropIsStore,
                                                                           seedDropResult.resultingState,
                                                                           config);
        const nextSeedDropResult: SeedDropResult = {
            ...seedDropResult,
            currentDropIsStore: nextCoord.isAbsent(),
        };
        if (nextSeedDropResult.currentDropIsStore) {
            nextSeedDropResult.seedsInHand--;
            nextSeedDropResult.resultingState = nextSeedDropResult.resultingState.feedStore(player);
        } else {
            nextSeedDropResult.houseToDistribute = nextCoord.get();
            if (initial.equals(nextSeedDropResult.houseToDistribute) === false || config.feedOriginalHouse) {
                // not to distribute on our starting space
                const feedResult: MancalaDropResult =
                    component.rules.getDropResult(nextSeedDropResult.seedsInHand,
                                                  nextSeedDropResult.resultingState,
                                                  nextSeedDropResult.houseToDistribute);
                nextSeedDropResult.resultingState = feedResult.resultingState;
                nextSeedDropResult.seedsInHand--; // drop in this space a piece we have in hand
            }
        }
        if (nextSeedDropResult.seedsInHand > 0) {
            awaitedTime += MancalaComponent.TIMEOUT_BETWEEN_SEEDS;
        }
        return { seedDropResult: nextSeedDropResult, awaitedTime };
    }

    public async expectClickSuccess(click: string): Promise<void> {
        // This function requires a string and has the same name as the one in TestUtils, to optimize greppability
        const matches: RegExpMatchArray | null = click.match(/#click-([0-9]+)-([0-9]+)/);
        Utils.assert(matches !== null, 'MancalaTestUtils.expectClickSuccess should be called with a coord string, but was called with' + click);
        const coord: Coord = new Coord(Number(Utils.getNonNullable(matches)[1]),
                                       Number(Utils.getNonNullable(matches)[2]));
        const pieceInHouse: number = this.testUtils.getGameComponent().constructedState.getPieceAt(coord);
        const timeToWait: number = (pieceInHouse + 1) * MancalaComponent.TIMEOUT_BETWEEN_SEEDS;
        await this.testUtils.expectClickSuccess(click);
        tick(timeToWait);
    }

    public expectToBeCaptured(cells: MancalaHouseContents[]): void {
        for (const cell of cells) {
            expect(cell.content.secondaryContent).withContext('captured cell should have secondary content').toBeDefined();
            this.expectHouseToMatch(cell);
            const coordSuffix: string = cell.x + '-' + cell.y;
            this.testUtils.expectElementToHaveClasses('#circle-' + coordSuffix, ['base', 'moved-stroke', 'captured-fill']);
        }
    }

    private getCellAt(coord: Coord, actionAndResult: MancalaActionAndResult): MGPOptional<MancalaHouseContents> {
        for (const cell of actionAndResult.result) {
            if (coord.equals(new Coord(cell.x, cell.y))) {
                return MGPOptional.of(cell);
            }
        }
        return MGPOptional.empty();
    }

    public expectToBeFed(actionAndResult: MancalaActionAndResult, config: MancalaConfig): void {
        for (let y: number = 0; y < 2; y++) {
            for (let x: number = 0; x < config.width; x++) {
                const coord: Coord = new Coord(x, y);
                const suffix: string = x + '-' + y;
                const optionalCell: MGPOptional<MancalaHouseContents> =
                    this.getCellAt(coord, actionAndResult);
                const playerFill: string = 'player' + ((coord.y + 1) % 2) + '-fill';
                if (optionalCell.isPresent()) { // Filled house
                    const cell: MancalaHouseContents = optionalCell.get();
                    this.expectHouseToMatch(cell);
                    const classes: string[] = ['base', 'moved-stroke', playerFill];
                    this.testUtils.expectElementToHaveClasses('#circle-' + suffix, classes);
                } else {
                    const playerY: number = actionAndResult.state.getCurrentPlayerY();
                    const startingCoord: Coord = new Coord(actionAndResult.move.getFirstDistribution().x, playerY);
                    if (startingCoord.equals(coord)) { // Initial house
                        const classes: string[] = ['base', 'last-move-stroke', playerFill];
                        this.testUtils.expectElementToHaveClasses('#circle-' + suffix, classes);
                    } else { // Neutral house
                        const classes: string[] = [playerFill, 'base'];
                        this.testUtils.expectElementToHaveClasses('#circle-' + suffix, classes);
                    }
                }
            }
        }
    }

    public expectHouseToMatch(cell: MancalaHouseContents): void {
        this.expectHouseToContain(new Coord(cell.x, cell.y),
                                  cell.content.mainContent,
                                  cell.content.secondaryContent);
    }

    public expectHouseToContain(coord: Coord, value: string, secondaryMessage?: string): void {
        const suffix: string = '-' + coord.x + '-' + coord.y;
        const numberContent: DebugElement = this.testUtils.findElement('#number' + suffix);
        expect(numberContent.nativeElement.innerHTML).withContext('For ' + coord.toString()).toBe(value);
        if (secondaryMessage === undefined) {
            this.testUtils.expectElementNotToExist('#secondary-message' + suffix);
        } else {
            const secondaryContent: DebugElement = this.testUtils.findElement('#secondary-message' + suffix);
            expect(secondaryContent).withContext('For ' + coord.toString()).not.toBeNull();
            expect(secondaryContent.nativeElement.innerHTML).withContext('For ' + coord.toString()).toBe(secondaryMessage);
        }
    }

    public expectStoreContentToBe(player: Player, value: string, secondaryMessage?: string): void {
        if (player === Player.ZERO) {
            const coord: Coord = new Coord(-1, -1);
            return this.expectHouseToContain(coord, value, secondaryMessage);
        } else {
            const coord: Coord = new Coord(2, 2);
            return this.expectHouseToContain(coord, value, secondaryMessage);
        }
    }

    public getSuffix(mancalaActionAndResult: MancalaActionAndResult): string {
        const lastMoveX: number = mancalaActionAndResult.move.getFirstDistribution().x;
        const suffix: string = lastMoveX + '-' + (mancalaActionAndResult.state.turn + 1) % 2;
        return suffix;
    }

}

export type MancalaActionAndResult = {

    state: MancalaState;

    move: MancalaMove;

    result: MancalaHouseContents[];
};

export class MancalaTestEntries<C extends MancalaComponent<R>,
                                R extends MancalaRules>
{
    component: Type<C>; // KalahComponent, AwaleComponent, etc
    gameName: string; // 'Kalah', 'Awale', etc
    moveGenerator: MoveGenerator<MancalaMove, MancalaState, MancalaConfig>;

    distribution: MancalaActionAndResult;
    secondDistribution: MancalaActionAndResult;
    monsoon: MancalaActionAndResult;
    capture: MancalaActionAndResult;
    fillThenCapture: MancalaActionAndResult;
}
export function doMancalaComponentTests<C extends MancalaComponent<R>,
                                        R extends MancalaRules>(entries: MancalaTestEntries<C, R>)
: void
{
    let mancalaTestUtils: MancalaComponentTestUtils<C, R>;

    const defaultConfig: MGPOptional<MancalaConfig> = RulesConfigUtils.getGameDefaultConfig(entries.gameName);

    describe(entries.gameName + ' component generic tests', () => {

        function awaitEndOfMove(): void {
            // Wait for the longest possible game (Ba-Awa: 4 laps with 26 drops)
            // eslint-disable-next-line dot-notation
            const seedDropsTime: number = entries.component['TIMEOUT_BETWEEN_SEEDS'] * 26;
            // eslint-disable-next-line dot-notation
            const lapsTime: number = entries.component['TIMEOUT_BETWEEN_LAPS'] * 4;
            tick(seedDropsTime + lapsTime);
        }

        beforeEach(fakeAsync(async() => {
            const testUtils: ComponentTestUtils<C> = await ComponentTestUtils.forGame<C>(entries.gameName);
            mancalaTestUtils = new MancalaComponentTestUtils(testUtils, entries.moveGenerator);
        }));

        it('should create', () => {
            mancalaTestUtils.testUtils.expectToBeCreated();
        });

        it('should allow basic move', fakeAsync(async() => {
            // Given any board where distribution are possible (so, any)
            await mancalaTestUtils.testUtils.setupState(entries.distribution.state);

            // When doing single distribution move
            const move: MancalaMove = entries.distribution.move;
            const suffix: string = mancalaTestUtils.getSuffix(entries.distribution);
            await mancalaTestUtils.expectMoveSuccess('#click-' + suffix, move, defaultConfig.get());

            // Then it should be a success
            mancalaTestUtils.expectToBeFed(entries.distribution, defaultConfig.get());
        }));

        it('should display score of players on the board (after point are won)', fakeAsync(async() => {
            const initialState: MancalaState = entries.capture.state;
            await mancalaTestUtils.testUtils.setupState(initialState);
            const currentPlayer: Player = initialState.getCurrentPlayer();
            const initialScore: number = initialState.scores.get(currentPlayer);
            const move: MancalaMove = entries.capture.move;
            const suffix: string = mancalaTestUtils.getSuffix(entries.capture);

            // When doing single distribution capture move
            await mancalaTestUtils.expectMoveSuccess('#click-' + suffix, move, defaultConfig.get());

            // Then the store should contain newScore +difference
            const newState: MancalaState = mancalaTestUtils.testUtils.getGameComponent().getState();
            const newScore: number = newState.scores.get(currentPlayer);
            const difference: number = newScore - initialScore;
            mancalaTestUtils.expectStoreContentToBe(currentPlayer, ' ' + newScore + ' ', ' +' + difference + ' ');
        }));

        it('should allow two move in a row', fakeAsync(async() => {
            // Given a board where a first move has been done
            await mancalaTestUtils.testUtils.setupState(entries.distribution.state);
            let move: MancalaMove = entries.distribution.move;
            let suffix: string = mancalaTestUtils.getSuffix(entries.distribution);
            await mancalaTestUtils.expectMoveSuccess('#click-' + suffix, move, defaultConfig.get());

            // When doing second single distribution move
            move = entries.secondDistribution.move;

            // Then it should be a success too
            suffix = mancalaTestUtils.getSuffix(entries.secondDistribution);
            await mancalaTestUtils.expectMoveSuccess('#click-' + suffix, move, defaultConfig.get());

            // Then it should be a success
            mancalaTestUtils.expectToBeFed(entries.secondDistribution, defaultConfig.get());
        }));

        it('should display last move after basic move', fakeAsync(async() => {
            // Given any state (initial here by default)

            // When player performs a move
            const move: MancalaMove = mancalaTestUtils.testUtils.getGameComponent().generateMove(5);
            await mancalaTestUtils.expectMoveSuccess('#click-5-1', move, defaultConfig.get());

            // Then the moved spaces should be shown
            // Initial element
            mancalaTestUtils.testUtils.expectElementToHaveClasses('#circle-5-1', ['base', 'last-move-stroke', 'player0-fill']);
            // The filled spaces
            mancalaTestUtils.testUtils.expectElementToHaveClasses('#circle-4-1', ['base', 'moved-stroke', 'player0-fill']);
            mancalaTestUtils.testUtils.expectElementToHaveClasses('#circle-3-1', ['base', 'moved-stroke', 'player0-fill']);
            mancalaTestUtils.testUtils.expectElementToHaveClasses('#circle-2-1', ['base', 'moved-stroke', 'player0-fill']);
            mancalaTestUtils.testUtils.expectElementToHaveClasses('#circle-1-1', ['base', 'moved-stroke', 'player0-fill']);
        }));

        it('should forbid moving empty house', fakeAsync(async() => {
            // Given a state with an empty house
            const board: Table<number> = [
                [0, 4, 4, 4, 4, 4],
                [4, 4, 4, 4, 4, 4],
            ];
            const state: MancalaState = new MancalaState(board, 1, PlayerNumberMap.of(0, 0));
            await mancalaTestUtils.testUtils.setupState(state);

            // When clicking on the empty house
            // Then the move should be illegal
            const reason: string = MancalaFailure.MUST_CHOOSE_NON_EMPTY_HOUSE();
            await mancalaTestUtils.testUtils.expectClickFailure('#click-0-0', reason);
        }));

        it(`should forbid moving opponent's house`, fakeAsync(async() => {
            // Given a state
            const board: Table<number> = [
                [4, 4, 4, 4, 4, 4],
                [4, 4, 4, 4, 4, 4],
            ];
            const state: MancalaState = new MancalaState(board, 0, PlayerNumberMap.of(0, 0));
            await mancalaTestUtils.testUtils.setupState(state);

            // When clicking on a house of the opponent
            // Then it should fail
            const reason: string = MancalaFailure.MUST_DISTRIBUTE_YOUR_OWN_HOUSES();
            await mancalaTestUtils.testUtils.expectClickFailure('#click-0-0', reason);
        }));

        it('should hide last move when taking move back', fakeAsync(async() => {
            // Given a board with a last move
            const move: MancalaMove = mancalaTestUtils.testUtils.getGameComponent().generateMove(5);
            await mancalaTestUtils.expectMoveSuccess('#click-5-1', move, defaultConfig.get());

            // When taking back
            await mancalaTestUtils.testUtils.expectInterfaceClickSuccess('#take-back');

            // Then the last-move highlight should be removed
            mancalaTestUtils.testUtils.expectElementToHaveClasses('#circle-5-1', ['base', 'player0-fill']);
            // And the moved highlight should be removed
            mancalaTestUtils.testUtils.expectElementToHaveClasses('#circle-4-1', ['base', 'player0-fill']);
            mancalaTestUtils.testUtils.expectElementToHaveClasses('#circle-3-1', ['base', 'player0-fill']);
            mancalaTestUtils.testUtils.expectElementToHaveClasses('#circle-2-1', ['base', 'player0-fill']);
            mancalaTestUtils.testUtils.expectElementToHaveClasses('#circle-1-1', ['base', 'player0-fill']);
        }));

        it('should display score of players on the board (first turn)', fakeAsync(async() => {
            // Given a starting board
            // When rendering it
            // Then player zero's captures should be displayed
            mancalaTestUtils.expectStoreContentToBe(Player.ZERO, ' 0 ');
            // And player one's captures should be displayed too
            mancalaTestUtils.expectStoreContentToBe(Player.ONE, ' 0 ');
        }));

        it('should display monsoon capture', fakeAsync(async() => {
            // Given a board where the player is about to give their last seed to the opponent
            await mancalaTestUtils.testUtils.setupState(entries.monsoon.state);

            // When doing the capturing move
            const suffix: string = mancalaTestUtils.getSuffix(entries.monsoon);
            await mancalaTestUtils.expectMoveSuccess('#click-' + suffix, entries.monsoon.move, defaultConfig.get());

            // Then the space in question should be marked as "captured"
            mancalaTestUtils.expectToBeCaptured(entries.monsoon.result);
        }));

        it('should display capture', fakeAsync(async() => {
            // Given a state where player zero can capture
            await mancalaTestUtils.testUtils.setupState(entries.capture.state);

            // When player zero clicks on a house to distribute
            const suffix: string = mancalaTestUtils.getSuffix(entries.capture);
            await mancalaTestUtils.expectMoveSuccess('#click-' + suffix, entries.capture.move, defaultConfig.get());

            // Then the moved spaces should be shown
            // Initial element
            mancalaTestUtils.testUtils.expectElementToHaveClasses('#circle-' + suffix, ['base', 'last-move-stroke', 'player0-fill']);
            // as well as the captured spaces
            mancalaTestUtils.expectToBeCaptured(entries.capture.result);
        }));

        it('should display filled-then-captured capture', fakeAsync(async() => {
            // Given a board where some empty space could filled then captured
            await mancalaTestUtils.testUtils.setupState(entries.fillThenCapture.state);
            // When doing the capturing move
            const suffix: string = mancalaTestUtils.getSuffix(entries.fillThenCapture);
            await mancalaTestUtils.expectMoveSuccess('#click-' + suffix, entries.fillThenCapture.move, defaultConfig.get());

            // Then the space in question should be marked as "captured"
            mancalaTestUtils.expectToBeCaptured(entries.fillThenCapture.result);
        }));

        it('should explain why clicking on store is stupid', fakeAsync(async() => {
            // Given any board
            // When clicking on any store
            // Then it should fail cause it's dumb
            const reason: string = MancalaFailure.MUST_DISTRIBUTE_YOUR_OWN_HOUSES();
            await mancalaTestUtils.testUtils.expectClickFailure('#store-PLAYER_ZERO', reason);
        }));

        describe('Move Animation', () => {

            for (const actor of ['user', 'not_the_user']) {
                let receiveMoveOrDoClick: (coord: Coord) => Promise<void>;
                if (actor === 'user') {
                    receiveMoveOrDoClick = async(coord: Coord): Promise<void> => {
                        const elementName: string = '#click-' + coord.x + '-' + coord.y;
                        const element: DebugElement = mancalaTestUtils.testUtils.findElement(elementName);
                        element.triggerEventHandler('click', null);
                    };
                } else {
                    receiveMoveOrDoClick = async(coord: Coord): Promise<void> => {
                        const gameComponent: C = mancalaTestUtils.testUtils.getGameComponent();
                        const move: MancalaMove = gameComponent.generateMove(coord.x);
                        await gameComponent.chooseMove(move);
                        void gameComponent.updateBoard(true); // void, so it starts but doesn't wait the animation's end
                    };
                }

                it('should show right after the first seed being drop (' + actor + ')', fakeAsync(async() => {
                    // Given any board on which several seeds have been chosen to be distributed
                    await receiveMoveOrDoClick(new Coord(5, 1));

                    // When waiting MancalaComponent.TIMEOUT_BETWEEN_SEED ms
                    tick(MancalaComponent.TIMEOUT_BETWEEN_SEEDS);

                    // Then only the first seed should be distributed
                    mancalaTestUtils.expectHouseToContain(new Coord(4, 1), ' 5 ', ' +1 ');
                    mancalaTestUtils.testUtils.expectElementToHaveClasses('#circle-4-1', ['base', 'moved-stroke', 'player0-fill']);
                    // But not the second seed
                    mancalaTestUtils.expectHouseToContain(new Coord(3, 1), ' 4 ');

                    // Finish the distribution
                    awaitEndOfMove();
                }));

                it('should take N ms by seed to distribute + N ms (' + actor + ')', fakeAsync(async() => {
                    // Given any board
                    // When distributing a house
                    await receiveMoveOrDoClick(new Coord(5, 1));

                    // Then it should take TIMEOUT_BETWEEN_SEED ms to empty the initial house
                    // then TIMEOUT_BETWEEN_SEED ms by seed to distribute it
                    awaitEndOfMove();
                }));
            }

            it('should immediately highlight last move clicked house', fakeAsync(async() => {
                // Given any board
                // When clicking on a house
                const element: DebugElement = mancalaTestUtils.testUtils.findElement('#click-5-1');
                element.triggerEventHandler('click', null);
                tick(0);

                // Then no seed should be distributed
                mancalaTestUtils.expectHouseToContain(new Coord(4, 1), ' 4 ');
                mancalaTestUtils.testUtils.expectElementToHaveClasses('#circle-4-1', ['base', 'player0-fill']);

                // And the clicked space should be highlighted and already empty
                mancalaTestUtils.expectHouseToContain(new Coord(5, 1), ' 0 ', ' -4 ');
                mancalaTestUtils.testUtils.expectElementToHaveClasses('#circle-5-1', ['base', 'last-move-stroke', 'player0-fill']);

                // Finish the distribution
                awaitEndOfMove();
            }));

            it('should make click possible when no distribution are ongoing', fakeAsync(async() => {
                // Given a space where no click have been done yet
                spyOn(mancalaTestUtils.testUtils.getGameComponent() as MancalaComponent<R>, 'onLegalClick').and.callThrough();

                // When clicking
                await mancalaTestUtils.testUtils.expectClickSuccess('#click-2-1');
                tick(0); // so that async bits of code are triggered but we wait no timeOut

                // Then onLegalUserClick should have been called
                expect(mancalaTestUtils.testUtils.getGameComponent().onLegalClick).toHaveBeenCalledOnceWith(2, 1);
                awaitEndOfMove();
            }));

            it('should make click impossible during opponent move animation', fakeAsync(async() => {
                // Given a move triggered by the opponent
                const gameComponent: C = mancalaTestUtils.testUtils.getGameComponent();
                const move: MancalaMove = gameComponent.generateMove(2);
                await gameComponent.chooseMove(move);
                void gameComponent.updateBoard(true); // void, so it starts but doesn't wait the animation's end
                tick(MancalaComponent.TIMEOUT_BETWEEN_SEEDS); // so that it is started but bot finished yet
                spyOn(mancalaTestUtils.testUtils.getGameComponent() as MancalaComponent<R>, 'onLegalClick').and.callThrough();

                // When clicking again
                await mancalaTestUtils.testUtils.expectClickSuccess('#click-3-1');
                tick(MancalaComponent.TIMEOUT_BETWEEN_SEEDS);

                // Then onLegalUserClick should not have been called
                expect(mancalaTestUtils.testUtils.getGameComponent().onLegalClick).not.toHaveBeenCalled();
                awaitEndOfMove();
            }));

            it('should make click impossible during player distribution animation', fakeAsync(async() => {
                // Given a move where a first click has been done but is not finished
                await mancalaTestUtils.testUtils.expectClickSuccess('#click-2-1');
                tick(MancalaComponent.TIMEOUT_BETWEEN_SEEDS); // so that it is started but not finished yet
                spyOn(mancalaTestUtils.testUtils.getGameComponent() as MancalaComponent<R>, 'onLegalClick').and.callThrough();

                // When clicking again
                await mancalaTestUtils.testUtils.expectClickSuccess('#click-3-1');
                tick(MancalaComponent.TIMEOUT_BETWEEN_SEEDS);

                // Then onLegalUserClick should not have been called
                expect(mancalaTestUtils.testUtils.getGameComponent().onLegalClick).not.toHaveBeenCalled();
                awaitEndOfMove();
            }));

        });

        it('should have a bijective encoder', () => {
            const rules: R = mancalaTestUtils.testUtils.getGameComponent().rules;
            const encoder: Encoder<MancalaMove> = mancalaTestUtils.testUtils.getGameComponent().encoder;
            const moveGenerator: MoveGenerator<MancalaMove, MancalaState, MancalaConfig> =
                mancalaTestUtils.moveGenerator;
            MoveTestUtils.testFirstTurnMovesBijectivity(rules, moveGenerator, encoder);
        });

    });
}
