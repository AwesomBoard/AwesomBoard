/* eslint-disable max-lines-per-function */
import { fakeAsync, tick } from '@angular/core/testing';
import { DebugElement } from '@angular/core';

import { ComponentTestUtils } from 'src/app/utils/tests/TestUtils.spec';
import { Table } from 'src/app/jscaip/TableUtils';
import { Coord } from 'src/app/jscaip/Coord';
import { Player } from 'src/app/jscaip/Player';
import { LocalGameWrapperComponent } from 'src/app/components/wrapper-components/local-game-wrapper/local-game-wrapper.component';

import { MancalaDistribution, MancalaMove } from '../../common/MancalaMove';
import { doMancalaComponentTests, MancalaComponentTestUtils } from '../../common/tests/GenericMancalaComponentTest.spec';
import { MancalaState } from '../../common/MancalaState';
import { MancalaFailure } from '../../common/MancalaFailure';
import { MancalaComponent } from '../../common/MancalaComponent';
import { MancalaConfig } from '../../common/MancalaConfig';

import { KalahComponent } from '../kalah.component';
import { KalahRules } from '../KalahRules';
import { KalahMoveGenerator } from '../KalahMoveGenerator';
import { PlayerNumberMap } from 'src/app/jscaip/PlayerMap';
import { MGPOptional } from '@everyboard/lib';

describe('KalahComponent', () => {

    let mancalaTestUtils: MancalaComponentTestUtils<KalahComponent, KalahRules>;
    const defaultConfig: MGPOptional<MancalaConfig> = KalahRules.get().getDefaultRulesConfig();

    doMancalaComponentTests({
        component: KalahComponent,
        gameName: 'Kalah',
        moveGenerator: new KalahMoveGenerator(),

        distribution: {
            state: KalahRules.get().getInitialState(defaultConfig),
            move: MancalaMove.of(MancalaDistribution.of(0)),
            result: [
                { x: 0, y: 0, content: { mainContent: ' 5 ', secondaryContent: ' +1 ' } },
                { x: 1, y: 0, content: { mainContent: ' 5 ', secondaryContent: ' +1 ' } },
                { x: 2, y: 0, content: { mainContent: ' 5 ', secondaryContent: ' +1 ' } },
            ],
        },
        secondDistribution: {
            state: new MancalaState([
                [5, 5, 5, 4, 4, 4],
                [0, 4, 4, 4, 4, 4],
            ], 1, PlayerNumberMap.of(1, 0)),
            move: MancalaMove.of(MancalaDistribution.of(0)),
            result: [
                { x: 1, y: 0, content: { mainContent: ' 6 ', secondaryContent: ' +1 ' } },
                { x: 2, y: 0, content: { mainContent: ' 6 ', secondaryContent: ' +1 ' } },
                { x: 3, y: 0, content: { mainContent: ' 5 ', secondaryContent: ' +1 ' } },
                { x: 4, y: 0, content: { mainContent: ' 5 ', secondaryContent: ' +1 ' } },
                { x: 5, y: 0, content: { mainContent: ' 5 ', secondaryContent: ' +1 ' } },
            ],
        },
        monsoon: {
            state: new MancalaState([
                [0, 0, 0, 0, 2, 0],
                [1, 0, 0, 0, 0, 1],
            ], 100, PlayerNumberMap.of(0, 0)),
            move: MancalaMove.of(MancalaDistribution.of(5)),
            result: [
                { x: 4, y: 0, content: { mainContent: ' 0 ', secondaryContent: ' -2 ' } },
                { x: 4, y: 1, content: { mainContent: ' 0 ', secondaryContent: ' -1 ' } },
                { x: 0, y: 1, content: { mainContent: ' 0 ', secondaryContent: ' -1 ' } },
            ],
        },
        capture: {
            state: new MancalaState([
                [0, 6, 6, 5, 5, 5],
                [6, 0, 5, 0, 4, 4],
            ], 2, PlayerNumberMap.of(0, 0)),
            move: MancalaMove.of(MancalaDistribution.of(5)),
            result: [
                { x: 1, y: 0, content: { mainContent: ' 0 ', secondaryContent: ' -6 ' } },
                { x: 1, y: 1, content: { mainContent: ' 0 ', secondaryContent: ' -1 ' } },
            ],
        },
        fillThenCapture: {
            state: new MancalaState([
                [1, 0, 0, 0, 0, 0],
                [8, 1, 0, 0, 0, 0],
            ], 0, PlayerNumberMap.of(0, 0)),
            move: MancalaMove.of(MancalaDistribution.of(0)),
            result: [
                { x: 5, y: 0, content: { mainContent: ' 0 ', secondaryContent: ' -1 ' } },
                { x: 5, y: 1, content: { mainContent: ' 0 ', secondaryContent: ' -1 ' } },
            ],
        },
    });

    describe('Kalah Specific Tests', () => {
        beforeEach(fakeAsync(async() => {
            const testUtils: ComponentTestUtils<KalahComponent> = await ComponentTestUtils.forGame<KalahComponent>('Kalah');
            mancalaTestUtils = new MancalaComponentTestUtils(testUtils, new KalahMoveGenerator());
        }));

        describe('Animations', () => {

            it('should feed the Kalah during animation', fakeAsync(async() => {
                // Given a board where a distribution pass by the Kalah
                const element: DebugElement = mancalaTestUtils.testUtils.findElement('#click-1-1');
                element.triggerEventHandler('click', null);
                tick(MancalaComponent.TIMEOUT_BETWEEN_SEEDS);
                mancalaTestUtils.expectStoreContentToBe(Player.ZERO, ' 0 ');

                // When passing right after the leftmost house in player's territory
                tick(MancalaComponent.TIMEOUT_BETWEEN_SEEDS);

                // Then the next fed house should be the Kalah
                mancalaTestUtils.expectStoreContentToBe(Player.ZERO, ' 1 ', ' +1 ');
                mancalaTestUtils.testUtils.expectElementToHaveClass('#circle--1--1', 'moved-stroke');
                tick(3 * MancalaComponent.TIMEOUT_BETWEEN_SEEDS);
            }));

            it('should feed the Kalah twice during animation of double-distribution-move', fakeAsync(async() => {
                // Given a board where a first distribution has been done and the second started
                await mancalaTestUtils.expectClickSuccess('#click-3-1');
                const element: DebugElement = mancalaTestUtils.testUtils.findElement('#click-0-1');
                element.triggerEventHandler('click', null);
                mancalaTestUtils.expectStoreContentToBe(Player.ZERO, ' 1 ', ' +1 ');

                // When waiting for the first sub-move (in Kalah) to happen
                tick(MancalaComponent.TIMEOUT_BETWEEN_SEEDS);

                // Then the Kalah should be fed a second time
                mancalaTestUtils.expectStoreContentToBe(Player.ZERO, ' 2 ', ' +2 ');
                tick(5 * MancalaComponent.TIMEOUT_BETWEEN_SEEDS);
            }));

            it('should wait TIMEOUT_BETWEEN_LAPS between each sub-distribution when receiving move', fakeAsync(async() => {
                // Given a board where AI move is sure to be two distributions (here, the initial state)
                // When AI play
                await mancalaTestUtils.testUtils.selectAIPlayer(Player.ZERO);

                // Then the pause of the AI should be done first
                tick(LocalGameWrapperComponent.AI_TIMEOUT);
                // Then it should take TIMEOUT_BETWEEN_SEED ms to empty the initial house
                tick(MancalaComponent.TIMEOUT_BETWEEN_SEEDS);
                // Then 4 * TIMEOUT_BETWEEN_SEED ms to sow the 4 seeds
                tick(4 * MancalaComponent.TIMEOUT_BETWEEN_SEEDS);

                // Then second turn start, pause that this test is about
                tick(MancalaComponent.TIMEOUT_BETWEEN_LAPS);
                // and to optimize gain, AI will still play a move that pass through the Kalah
                // hence a move in column 0 1 or 2, which will all be of 5 seeds now
                // so again TIMEOUT_BETWEEN_SEED ms to empty the second initial house
                tick(MancalaComponent.TIMEOUT_BETWEEN_SEEDS);
                // Then 5 * TIMEOUT_BETWEEN_SEED ms to sow the final 5 seeds
                tick(5 * MancalaComponent.TIMEOUT_BETWEEN_SEEDS);
            }));

            it('should feed the original house during animation', fakeAsync(async() => {
                // Given a board with a house with more than 12 seeds
                const state: MancalaState = new MancalaState([
                    [0, 1, 0, 0, 0, 0],
                    [0, 0, 14, 0, 0, 0],
                ], 0, PlayerNumberMap.of(0, 0));
                await mancalaTestUtils.testUtils.setupState(state);

                // When distributing the house
                mancalaTestUtils.testUtils.findElement('#click-2-1').triggerEventHandler('click', null);
                // and waiting for the time where the seed is to be dropped in the original house
                tick(13 * MancalaComponent.TIMEOUT_BETWEEN_SEEDS);

                // Then the initial house should have been fed
                mancalaTestUtils.expectHouseToContain(new Coord(2, 1), ' 1 ', ' -13 ');
                tick(MancalaComponent.TIMEOUT_BETWEEN_SEEDS);
            }));

            it('should hide capture of previous turn in opponent store (animation)', fakeAsync(async() => {
                // Given a state where there has been a point-won last turn
                const moveZero: MancalaMove = mancalaTestUtils.testUtils.getGameComponent().generateMove(0);
                await mancalaTestUtils.expectMoveSuccess('#click-0-1', moveZero, defaultConfig.get());
                mancalaTestUtils.expectStoreContentToBe(Player.ZERO, ' 1 ', ' +1 ');

                // When starting the second turn
                const element: DebugElement = mancalaTestUtils.testUtils.findElement('#click-0-0');
                element.triggerEventHandler('click', null);
                tick(0); // Just start the click effect but we don't need to wait any window.setTimeout

                // Then the capture of last turn should be hidden
                mancalaTestUtils.expectStoreContentToBe(Player.ZERO, ' 1 '); // no longer +1
                tick(6 * MancalaComponent.TIMEOUT_BETWEEN_SEEDS);
            }));
        });

        it('should show constructed move during multi-distribution move', fakeAsync(async() => {
            // Given any board where first distribution has been done

            // When doing the first part of the move
            await mancalaTestUtils.expectClickSuccess('#click-3-1');

            // Then it should already been displayed
            mancalaTestUtils.expectHouseToContain(new Coord(2, 1), ' 5 ', ' +1 ');
            // and the chosen coord should be visible already
            mancalaTestUtils.testUtils.expectElementToHaveClasses('#circle-3-1', ['base', 'last-move-stroke', 'player0-fill']);
            // The filled spaces
            mancalaTestUtils.testUtils.expectElementToHaveClasses('#circle-2-1', ['base', 'moved-stroke', 'player0-fill']);
            mancalaTestUtils.testUtils.expectElementToHaveClasses('#circle-1-1', ['base', 'moved-stroke', 'player0-fill']);
            mancalaTestUtils.testUtils.expectElementToHaveClasses('#circle-0-1', ['base', 'moved-stroke', 'player0-fill']);
        }));

        it('should allow double distribution move', fakeAsync(async() => {
            // Given any board where first distribution has been done
            await mancalaTestUtils.expectClickSuccess('#click-3-1');
            // When doing double distribution move
            const move: MancalaMove = MancalaMove.of(MancalaDistribution.of(3), [MancalaDistribution.of(0)]);
            // Then it should be a success
            await mancalaTestUtils.expectMoveSuccess('#click-0-1', move, defaultConfig.get());
        }));

        it('should hide last move when doing illegal click during complex move', fakeAsync(async() => {
            // Given a distribution that just ended up in the Kalah
            await mancalaTestUtils.expectClickSuccess('#click-3-1');

            // When doing an illegal click
            const reason: string = MancalaFailure.MUST_CHOOSE_NON_EMPTY_HOUSE();
            await mancalaTestUtils.testUtils.expectClickFailure('#click-3-1', reason);

            // Then the last move should be hidden
            mancalaTestUtils.expectHouseToContain(new Coord(3, 1), ' 4 ');
            mancalaTestUtils.expectHouseToContain(new Coord(2, 1), ' 4 ');
            mancalaTestUtils.expectHouseToContain(new Coord(1, 1), ' 4 ');
            mancalaTestUtils.expectHouseToContain(new Coord(0, 1), ' 4 ');
            mancalaTestUtils.expectStoreContentToBe(Player.ZERO, ' 0 ');
            mancalaTestUtils.testUtils.expectElementToHaveClasses('#circle-3-1', ['base', 'player0-fill']);
            // The filled spaces
            mancalaTestUtils.testUtils.expectElementToHaveClasses('#circle-2-1', ['base', 'player0-fill']);
            mancalaTestUtils.testUtils.expectElementToHaveClasses('#circle-1-1', ['base', 'player0-fill']);
            mancalaTestUtils.testUtils.expectElementToHaveClasses('#circle-0-1', ['base', 'player0-fill']);
            mancalaTestUtils.testUtils.expectElementToHaveClasses('#circle--1--1', ['base', 'player0-fill']);
        }));

        it('should allow triple distribution move (player one)', fakeAsync(async() => {
            // Given a state where multiple capture are possible
            const state: MancalaState = new MancalaState([
                [6, 1, 7, 6, 1, 7],
                [2, 1, 6, 2, 2, 5],
            ], 3, PlayerNumberMap.of(4, 2));
            await mancalaTestUtils.testUtils.setupState(state);

            // When doing the complex move
            await mancalaTestUtils.expectClickSuccess('#click-0-0');
            await mancalaTestUtils.expectClickSuccess('#click-4-0');
            const move: MancalaMove = MancalaMove.of(MancalaDistribution.of(0),
                                                     [MancalaDistribution.of(4), MancalaDistribution.of(1)]);

            // Then the move should succeed
            await mancalaTestUtils.expectMoveSuccess('#click-1-0', move, defaultConfig.get());
        }));

        it('should allow triple distribution move (player zero)', fakeAsync(async() => {
            // Given a state where multiple capture are possible
            const state: MancalaState = new MancalaState([
                [5, 0, 6, 6, 0, 6],
                [0, 5, 5, 1, 5, 5],
            ], 2, PlayerNumberMap.of(2, 2));
            await mancalaTestUtils.testUtils.setupState(state);

            // When doing the complex move
            await mancalaTestUtils.expectClickSuccess('#click-4-1');
            await mancalaTestUtils.expectClickSuccess('#click-0-1');
            const move: MancalaMove = MancalaMove.of(MancalaDistribution.of(4),
                                                     [MancalaDistribution.of(0), MancalaDistribution.of(5)]);

            // Then the move should succeed
            await mancalaTestUtils.expectMoveSuccess('#click-5-1', move, defaultConfig.get());
        }));

        it('should hide previous capture when starting multiple distribution move', fakeAsync(async() => {
            // Given a board where a capture has been done
            const previousBoard: Table<number> = [
                [4, 4, 4, 4, 4, 4],
                [0, 0, 0, 2, 0, 0],
            ];
            const previousState: MancalaState = new MancalaState(previousBoard, 4, PlayerNumberMap.of(0, 0));
            const board: Table<number> = [
                [4, 0, 4, 4, 4, 4],
                [0, 0, 1, 0, 0, 0],
            ];
            const state: MancalaState = new MancalaState(board, 5, PlayerNumberMap.of(5, 0));
            const previousMove: MancalaMove = MancalaMove.of(MancalaDistribution.of(3));
            await mancalaTestUtils.testUtils.setupState(state,
                                                        { previousState, previousMove, config: defaultConfig });

            // When starting a multiple-capture move
            await mancalaTestUtils.expectClickSuccess('#click-2-0');

            // Then the capture should no longer be displayed
            mancalaTestUtils.testUtils.expectElementNotToHaveClass('#circle-1-1', 'captured-fill');
            mancalaTestUtils.testUtils.expectElementNotToHaveClass('#circle-1-0', 'captured-fill');
        }));

        it('should get back to original board when taking back move', fakeAsync(async() => {
            // Given a board where a first move has been done
            const move: MancalaMove = MancalaMove.of(MancalaDistribution.of(0));
            await mancalaTestUtils.expectMoveSuccess('#click-0-1', move, defaultConfig.get());

            // When taking back
            await mancalaTestUtils.testUtils.expectInterfaceClickSuccess('#take-back');

            // Then the board should be restored
            mancalaTestUtils.expectHouseToContain(new Coord(0, 1), ' 4 ');
        }));

        it('should show number of seed dropped in Kalah after AI move', fakeAsync(async() => {
            // Given a move Player.ZERO only choice is dropping a seed in the Kalah
            const state: MancalaState = new MancalaState([
                [0, 0, 0, 1, 0, 0],
                [0, 4, 0, 0, 0, 0],
            ], 0, PlayerNumberMap.of(0, 0));
            await mancalaTestUtils.testUtils.setupState(state);

            // When giving turn to AI to play and waiting for move
            await mancalaTestUtils.testUtils.selectAIPlayer(Player.ZERO);
            // time for AI to take action + time for the distribution
            tick(LocalGameWrapperComponent.AI_TIMEOUT + (5 * MancalaComponent.TIMEOUT_BETWEEN_SEEDS));

            // Then the " +1 " in Kalah secondary message should have disappeared
            mancalaTestUtils.expectStoreContentToBe(Player.ZERO, ' 1 ', ' +1 ');
        }));

        it('should allow to stop distribution in the Kalah when no more piece available', fakeAsync(async() => {
            // Given a move where current player has no more non-kalah sub-moves
            const state: MancalaState = new MancalaState([
                [0, 0, 1, 9, 0, 0],
                [1, 0, 0, 0, 0, 0],
            ], 10, PlayerNumberMap.of(13, 9));
            await mancalaTestUtils.testUtils.setupState(state);

            // When doing the only move possible for the remaining sub-move
            const move: MancalaMove = MancalaMove.of(MancalaDistribution.of(0));

            // Then that normally-illegal move should be accepted
            await mancalaTestUtils.expectMoveSuccess('#click-0-1', move, defaultConfig.get());
        }));

        it('should hide capture of previous turn in opponent store (move)', fakeAsync(async() => {
            // Given a state where there has been a point-won last turn
            const moveZero: MancalaMove = mancalaTestUtils.testUtils.getGameComponent().generateMove(0);
            await mancalaTestUtils.expectMoveSuccess('#click-0-1', moveZero, defaultConfig.get());
            mancalaTestUtils.expectStoreContentToBe(Player.ZERO, ' 1 ', ' +1 ');

            // When doing second turn
            await mancalaTestUtils.expectMoveSuccess('#click-0-0', moveZero, defaultConfig.get());

            // Then the capture of last turn should be hidden
            mancalaTestUtils.expectStoreContentToBe(Player.ZERO, ' 1 '); // no longer +1
        }));
    });

});
