/* eslint-disable max-lines-per-function */
import { DebugElement, Type } from '@angular/core';
import { fakeAsync, tick } from '@angular/core/testing';
import { ComponentTestUtils } from 'src/app/utils/tests/TestUtils.spec';
import { MancalaComponent } from '../MancalaComponent';
import { MancalaRules } from '../MancalaRules';
import { MancalaDistribution, MancalaMove } from '../MancalaMove';
import { MancalaState } from '../MancalaState';
import { Cell, Table } from 'src/app/utils/ArrayUtils';
import { MancalaFailure } from '../MancalaFailure';
import { Encoder } from 'src/app/utils/Encoder';
import { Coord } from 'src/app/jscaip/Coord';
import { Player } from 'src/app/jscaip/Player';
import { MGPOptional } from 'src/app/utils/MGPOptional';
import { MancalaConfig } from '../MancalaConfig';
import { RulesConfigUtils } from 'src/app/jscaip/RulesConfigUtil';
import { MoveGenerator } from 'src/app/jscaip/AI';
import { MoveTestUtils } from 'src/app/jscaip/tests/Move.spec';

type MancalaHouseContents = Cell<{ mainContent: string, secondaryContent?: string }>;

export class MancalaComponentTestUtils<C extends MancalaComponent<R>,
                                       R extends MancalaRules>
{
    public constructor(public readonly testUtils: ComponentTestUtils<C>,
                       public readonly moveGenerator: MoveGenerator<MancalaMove, MancalaState>) {
    }
    public async expectMancalaMoveSuccess(click: string, move: MancalaMove): Promise<void> {
        const component: C = this.testUtils.getGameComponent();
        const state: MancalaState = component.constructedState;
        const playerY: number = state.getCurrentPlayerY();
        const lastDistribution: MancalaDistribution = move.distributions[move.distributions.length - 1];
        let lastDistributionSeedNumber: number = state.getPieceAtXY(lastDistribution.x, playerY);
        if (lastDistributionSeedNumber > (2 * state.getWidth())) {
            // Since we are distributing enough seed to do the whole turn
            // it'll take TIMEOUT_BETWEEN_SEED ms to skip the initial house
            lastDistributionSeedNumber++;
        }
        // The time to move the seeds
        const moveDuration: number = (lastDistributionSeedNumber + 1) * MancalaComponent.TIMEOUT_BETWEEN_SEED;
        await this.testUtils.expectMoveSuccess(click, move, moveDuration);
    }
    public async expectMancalaClickSuccess(coord: Coord): Promise<void> {
        const pieceInHouse: number = this.testUtils.getGameComponent().constructedState.getPieceAt(coord);
        const timeToWait: number = (pieceInHouse + 1) * MancalaComponent.TIMEOUT_BETWEEN_SEED;
        const click: string = '#click_' + coord.x + '_' + coord.y;
        await this.testUtils.expectClickSuccess(click);
        tick(timeToWait);
    }
    public expectToBeCaptured(cells: MancalaHouseContents[]): void {
        for (const cell of cells) {
            const coordSuffix: string = cell.x + '_' + cell.y;
            const content: DebugElement = this.testUtils.findElement('#secondary_message_' + coordSuffix);
            expect(content).withContext('(' + cell.x + ', ' + cell.y + ') should have a secondary_message').toBeTruthy();
            expect(content.nativeElement.innerHTML).toBe(cell.content.mainContent);
            this.testUtils.expectElementToHaveClasses('#circle_' + coordSuffix, ['base', 'moved-stroke', 'captured-fill']);
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
        for (const coordAndContent of MancalaState.getInitialState(config).getCoordsAndContents()) {
            const suffix: string = coordAndContent.coord.x + '_' + coordAndContent.coord.y;
            const optionalCell: MGPOptional<MancalaHouseContents> =
                this.getCellAt(coordAndContent.coord, actionAndResult);
            const playerFill: string = 'player' + ((coordAndContent.coord.y + 1) % 2) + '-fill';
            if (optionalCell.isPresent()) { // Filled house
                const cell: MancalaHouseContents = optionalCell.get();
                this.expectHouseToContain(new Coord(cell.x, cell.y),
                                          cell.content.mainContent,
                                          cell.content.secondaryContent);
                const classes: string[] = ['base', 'moved-stroke', playerFill];
                this.testUtils.expectElementToHaveClasses('#circle_' + suffix, classes);
            } else {
                const playerY: number = actionAndResult.state.getCurrentPlayerY();
                const startingCoord: Coord = new Coord(actionAndResult.move.distributions[0].x, playerY);
                if (startingCoord.equals(coordAndContent.coord)) { // Initial house
                    const classes: string[] = ['base', 'last-move-stroke', playerFill];
                    this.testUtils.expectElementToHaveClasses('#circle_' + suffix, classes);
                } else { // Neutral house
                    const classes: string[] = [playerFill, 'base'];
                    this.testUtils.expectElementToHaveClasses('#circle_' + suffix, classes);
                }
            }
        }
    }
    public expectHouseToContain(coord: Coord, value: string, secondaryMessage?: string): void {
        const suffix: string = '_' + coord.x + '_' + coord.y;
        const content: DebugElement = this.testUtils.findElement('#number' + suffix);
        expect(content.nativeElement.innerHTML).withContext('For ' + coord.toString()).toBe(value);
        if (secondaryMessage === undefined) {
            const content: DebugElement = this.testUtils.findElement('#secondary_message' + suffix);
            expect(content).withContext('For ' + coord.toString()).toBeNull();
        } else {
            const content: DebugElement = this.testUtils.findElement('#secondary_message' + suffix);
            expect(content).withContext('For ' + coord.toString()).not.toBeNull();
            expect(content.nativeElement.innerHTML).withContext('For ' + coord.toString()).toBe(secondaryMessage);
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
        const lastMoveX: number = mancalaActionAndResult.move.distributions[0].x;
        const suffix: string = lastMoveX + '_' + (mancalaActionAndResult.state.turn + 1) % 2;
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
    moveGenerator: MoveGenerator<MancalaMove, MancalaState>;

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

    const defaultConfig: MancalaConfig =
        RulesConfigUtils.getGameDefaultConfig(entries.gameName) as MancalaConfig;

    describe(entries.gameName + ' component generic tests', () => {
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
            await mancalaTestUtils.expectMancalaMoveSuccess('#click_' + suffix, move);

            // Then it should be a success
            mancalaTestUtils.expectToBeFed(entries.distribution, defaultConfig);
        }));
        it('should display score of players on the board (after point are won)', fakeAsync(async() => {
            const initialState: MancalaState = entries.capture.state;
            await mancalaTestUtils.testUtils.setupState(initialState);
            const currentPlayer: Player = initialState.getCurrentPlayer();
            const initialScore: number = initialState.scores[currentPlayer.value];
            const move: MancalaMove = entries.capture.move;
            const suffix: string = mancalaTestUtils.getSuffix(entries.capture);

            // When doing single distribution capture move
            await mancalaTestUtils.expectMancalaMoveSuccess('#click_' + suffix, move);

            // Then the store should contain newScore +difference
            const newState: MancalaState = mancalaTestUtils.testUtils.getGameComponent().getState();
            const newScore: number = newState.scores[currentPlayer.value];
            const difference: number = newScore - initialScore;
            mancalaTestUtils.expectStoreContentToBe(currentPlayer, ' ' + newScore + ' ', ' +' + difference + ' ');
        }));
        it('should allow two move in a row', fakeAsync(async() => {
            // Given a board where a first move has been done
            await mancalaTestUtils.testUtils.setupState(entries.distribution.state);
            let move: MancalaMove = entries.distribution.move;
            let suffix: string = mancalaTestUtils.getSuffix(entries.distribution);
            await mancalaTestUtils.expectMancalaMoveSuccess('#click_' + suffix, move);

            // When doing second single distribution move
            move = entries.secondDistribution.move;

            // Then it should be a success too
            suffix = mancalaTestUtils.getSuffix(entries.secondDistribution);
            await mancalaTestUtils.expectMancalaMoveSuccess('#click_' + suffix, move);

            // Then it should be a success
            mancalaTestUtils.expectToBeFed(entries.secondDistribution, defaultConfig);
        }));
        it('should display last move after basic move', fakeAsync(async() => {
            // Given any state (initial here by default)

            // When player performs a move
            const move: MancalaMove = mancalaTestUtils.testUtils.getGameComponent().generateMove(5);
            await mancalaTestUtils.expectMancalaMoveSuccess('#click_5_1', move);

            // Then the moved spaces should be shown
            // Initial element
            mancalaTestUtils.testUtils.expectElementToHaveClasses('#circle_5_1', ['base', 'last-move-stroke', 'player0-fill']);
            // The filled spaces
            mancalaTestUtils.testUtils.expectElementToHaveClasses('#circle_4_1', ['base', 'moved-stroke', 'player0-fill']);
            mancalaTestUtils.testUtils.expectElementToHaveClasses('#circle_3_1', ['base', 'moved-stroke', 'player0-fill']);
            mancalaTestUtils.testUtils.expectElementToHaveClasses('#circle_2_1', ['base', 'moved-stroke', 'player0-fill']);
            mancalaTestUtils.testUtils.expectElementToHaveClasses('#circle_1_1', ['base', 'moved-stroke', 'player0-fill']);
        }));
        it('should forbid moving empty house', fakeAsync(async() => {
            // Given a state with an empty house
            const board: Table<number> = [
                [0, 4, 4, 4, 4, 4],
                [4, 4, 4, 4, 4, 4],
            ];
            const state: MancalaState = new MancalaState(board, 1, [0, 0], defaultConfig);
            await mancalaTestUtils.testUtils.setupState(state);

            // When clicking on the empty house
            // Then it should fail
            const reason: string = MancalaFailure.MUST_CHOOSE_NON_EMPTY_HOUSE();
            await mancalaTestUtils.testUtils.expectClickFailure('#click_0_0', reason);
        }));
        it(`should forbid moving opponent's house`, fakeAsync(async() => {
            // Given a state
            const board: Table<number> = [
                [4, 4, 4, 4, 4, 4],
                [4, 4, 4, 4, 4, 4],
            ];
            const state: MancalaState = new MancalaState(board, 0, [0, 0], defaultConfig);
            await mancalaTestUtils.testUtils.setupState(state);

            // When clicking on a house of the opponent
            // Then it should fail
            await mancalaTestUtils.testUtils.expectClickFailure('#click_0_0', MancalaFailure.MUST_DISTRIBUTE_YOUR_OWN_HOUSES());
        }));
        it('should hide last move when taking move back', fakeAsync(async() => {
            // Given a board with a last move
            const move: MancalaMove = mancalaTestUtils.testUtils.getGameComponent().generateMove(5);
            await mancalaTestUtils.expectMancalaMoveSuccess('#click_5_1', move);

            // When taking back
            await mancalaTestUtils.testUtils.expectInterfaceClickSuccess('#takeBack');

            // Then the last-move highlight should be removed
            mancalaTestUtils.testUtils.expectElementToHaveClasses('#circle_5_1', ['base', 'player0-fill']);
            // And the moved highlight should be removed
            mancalaTestUtils.testUtils.expectElementToHaveClasses('#circle_4_1', ['base', 'player0-fill']);
            mancalaTestUtils.testUtils.expectElementToHaveClasses('#circle_3_1', ['base', 'player0-fill']);
            mancalaTestUtils.testUtils.expectElementToHaveClasses('#circle_2_1', ['base', 'player0-fill']);
            mancalaTestUtils.testUtils.expectElementToHaveClasses('#circle_1_1', ['base', 'player0-fill']);
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
            await mancalaTestUtils.expectMancalaMoveSuccess('#click_' + suffix, entries.monsoon.move);

            // Then the space in question should be marked as "captured"
            mancalaTestUtils.expectToBeCaptured(entries.monsoon.result);
        }));
        it('should display capture', fakeAsync(async() => {
            // Given a state where player zero can capture
            await mancalaTestUtils.testUtils.setupState(entries.capture.state);

            // When player zero clicks on a house to distribute
            const suffix: string = mancalaTestUtils.getSuffix(entries.capture);
            await mancalaTestUtils.expectMancalaMoveSuccess('#click_' + suffix, entries.capture.move);

            // Then the moved spaces should be shown
            // Initial element
            mancalaTestUtils.testUtils.expectElementToHaveClasses('#circle_' + suffix, ['base', 'last-move-stroke', 'player0-fill']);
            // as well as the captured spaces
            mancalaTestUtils.expectToBeCaptured(entries.capture.result);
        }));
        it('should display filled-then-captured capture', fakeAsync(async() => {
            // Given a board where some empty space could filled then captured
            await mancalaTestUtils.testUtils.setupState(entries.fillThenCapture.state);

            // When doing the capturing move
            const suffix: string = mancalaTestUtils.getSuffix(entries.fillThenCapture);
            await mancalaTestUtils.expectMancalaMoveSuccess('#click_' + suffix, entries.fillThenCapture.move);

            // Then the space in question should be marked as "captured"
            mancalaTestUtils.expectToBeCaptured(entries.fillThenCapture.result);
        }));
        it('should explain why clicking on store is stupid', fakeAsync(async() => {
            // Given any board
            // When clicking on any store
            // THen it should fail cause it's dumb
            const reason: string = MancalaFailure.MUST_DISTRIBUTE_YOUR_OWN_HOUSES();
            await mancalaTestUtils.testUtils.expectClickFailure('#store_player_0', reason);
        }));
        describe('Move Animation', () => {
            for (const actor of ['user', 'not_the_user']) {
                let receiveMoveOrDoClick: (coord: Coord) => Promise<void>;
                if (actor === 'user') {
                    receiveMoveOrDoClick = async(coord: Coord): Promise<void> => {
                        const elementName: string = '#click_' + coord.x + '_' + coord.y;
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
                    tick(MancalaComponent.TIMEOUT_BETWEEN_SEED);

                    // Then only the first seed should be distributed
                    mancalaTestUtils.expectHouseToContain(new Coord(4, 1), ' 5 ', ' +1 ');
                    mancalaTestUtils.testUtils.expectElementToHaveClasses('#circle_4_1', ['base', 'moved-stroke', 'player0-fill']);
                    // But not the second seed
                    mancalaTestUtils.expectHouseToContain(new Coord(3, 1), ' 4 ');

                    // Finish the distribution
                    tick(4 * MancalaComponent.TIMEOUT_BETWEEN_SEED);
                }));
                it('should take N ms by seed to distribute + N ms (' + actor + ')', fakeAsync(async() => {
                    // Given any board
                    // When distributing a house
                    await receiveMoveOrDoClick(new Coord(5, 1));

                    // Then it should take TIMEOUT_BETWEEN_SEED ms to empty the initial house
                    // then TIMEOUT_BETWEEN_SEED ms by seed to distribute it
                    tick((4 + 1) * MancalaComponent.TIMEOUT_BETWEEN_SEED);
                }));
            }
            it('should immediately highlight last move clicked house', fakeAsync(async() => {
                // Given any board
                // When clicking on a house
                const element: DebugElement = mancalaTestUtils.testUtils.findElement('#click_5_1');
                element.triggerEventHandler('click', null);
                tick(0);

                // Then no seed should be distributed
                mancalaTestUtils.expectHouseToContain(new Coord(4, 1), ' 4 ');
                mancalaTestUtils.testUtils.expectElementToHaveClasses('#circle_4_1', ['base', 'player0-fill']);

                // And the clicked space should be highlighted and already empty
                mancalaTestUtils.expectHouseToContain(new Coord(5, 1), ' 0 ', ' -4 ');
                mancalaTestUtils.testUtils.expectElementToHaveClasses('#circle_5_1', ['base', 'last-move-stroke', 'player0-fill']);

                // Finish the distribution
                tick(5 * MancalaComponent.TIMEOUT_BETWEEN_SEED);
            }));
            it('should make click possible when no distribution are ongoing', fakeAsync(async() => {
                // Given a space where no click have been done yet
                spyOn(mancalaTestUtils.testUtils.getGameComponent() as MancalaComponent<R>, 'onLegalClick').and.callThrough();

                // When clicking
                await mancalaTestUtils.testUtils.expectClickSuccess('#click_2_1');
                tick(0); // so that async bits of code are triggered but we wait no timeOut

                // Then onLegalUserClick should have been called
                expect(mancalaTestUtils.testUtils.getGameComponent().onLegalClick).toHaveBeenCalledOnceWith(2, 1);
                tick(5 * MancalaComponent.TIMEOUT_BETWEEN_SEED);
            }));
            it('should make click impossible during opponent move animation', fakeAsync(async() => {
                // Given a move triggered by the opponent
                const gameComponent: C = mancalaTestUtils.testUtils.getGameComponent();
                const move: MancalaMove = gameComponent.generateMove(2);
                await gameComponent.chooseMove(move);
                void gameComponent.updateBoard(true); // void, so it starts but doesn't wait the animation's end
                tick(MancalaComponent.TIMEOUT_BETWEEN_SEED); // so that it is started but bot finished yet
                spyOn(mancalaTestUtils.testUtils.getGameComponent() as MancalaComponent<R>, 'onLegalClick').and.callThrough();

                // When clicking again
                await mancalaTestUtils.testUtils.expectClickSuccess('#click_3_1');
                tick(MancalaComponent.TIMEOUT_BETWEEN_SEED);

                // Then onLegalUserClick should not have been called
                expect(mancalaTestUtils.testUtils.getGameComponent().onLegalClick).not.toHaveBeenCalled();
                tick(3 * MancalaComponent.TIMEOUT_BETWEEN_SEED);
            }));
            it('should make click impossible during player distribution animation', fakeAsync(async() => {
                // Given a move where a first click has been done but is not finished
                await mancalaTestUtils.testUtils.expectClickSuccess('#click_2_1');
                tick(MancalaComponent.TIMEOUT_BETWEEN_SEED); // so that it is started but bot finished yet
                spyOn(mancalaTestUtils.testUtils.getGameComponent() as MancalaComponent<R>, 'onLegalClick').and.callThrough();

                // When clicking again
                await mancalaTestUtils.testUtils.expectClickSuccess('#click_3_1');
                tick(MancalaComponent.TIMEOUT_BETWEEN_SEED);

                // Then onLegalUserClick should not have been called
                expect(mancalaTestUtils.testUtils.getGameComponent().onLegalClick).not.toHaveBeenCalled();
                tick(3 * MancalaComponent.TIMEOUT_BETWEEN_SEED);
            }));
        });
        it('should have a bijective encoder', () => {
            const rules: R = mancalaTestUtils.testUtils.getGameComponent().rules;
            const encoder: Encoder<MancalaMove> = mancalaTestUtils.testUtils.getGameComponent().encoder;
            const moveGenerator: MoveGenerator<MancalaMove, MancalaState> = mancalaTestUtils.moveGenerator;
            MoveTestUtils.testFirstTurnMovesBijectivity(rules, moveGenerator, encoder, defaultConfig);
        });
    });
}
