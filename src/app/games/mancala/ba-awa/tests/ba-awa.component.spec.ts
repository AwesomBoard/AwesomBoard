/* eslint-disable max-lines-per-function */
import { DebugElement } from '@angular/core';
import { fakeAsync, tick } from '@angular/core/testing';

import { BaAwaComponent } from '../ba-awa.component';
import { BaAwaRules } from '../BaAwaRules';
import { MancalaState } from 'src/app/games/mancala/common/MancalaState';
import { MancalaComponentTestUtils, doMancalaComponentTests as doMancalaComponentTests } from '../../common/tests/GenericMancalaComponentTest.spec';
import { BaAwaMoveGenerator } from '../BaAwaMoveGenerator';
import { BaAwaConfig } from '../BaAwaConfig';
import { ComponentTestUtils } from 'src/app/utils/tests/TestUtils.spec';
import { MancalaDistribution, MancalaMove } from '../../common/MancalaMove';
import { MGPOptional } from '@everyboard/lib';
import { MancalaComponent } from '../../common/MancalaComponent';
import { PlayerNumberMap } from 'src/app/jscaip/PlayerMap';

describe('BaAwaComponent', () => {

    let mancalaTestUtils: MancalaComponentTestUtils<BaAwaComponent, BaAwaRules>;
    const defaultConfig: MGPOptional<BaAwaConfig> = BaAwaRules.get().getDefaultRulesConfig();

    doMancalaComponentTests({
        component: BaAwaComponent,
        gameName: 'BaAwa',
        moveGenerator: new BaAwaMoveGenerator(),
        distribution: {
            state: BaAwaRules.get().getInitialState(defaultConfig),
            move: MancalaMove.of(MancalaDistribution.of(0)),
            result: [
                { x: 0, y: 0, content: { mainContent: ' 7 ', secondaryContent: ' +3 ' } },
                { x: 1, y: 0, content: { mainContent: ' 1 ', secondaryContent: ' -3 ' } },
                { x: 2, y: 0, content: { mainContent: ' 6 ', secondaryContent: ' +2 ' } },
                { x: 3, y: 0, content: { mainContent: ' 1 ', secondaryContent: ' -3 ' } },
                { x: 4, y: 0, content: { mainContent: ' 6 ', secondaryContent: ' +2 ' } },
                { x: 5, y: 0, content: { mainContent: ' 6 ', secondaryContent: ' +2 ' } },

                { x: 1, y: 1, content: { mainContent: ' 6 ', secondaryContent: ' +2 ' } },
                { x: 2, y: 1, content: { mainContent: ' 6 ', secondaryContent: ' +2 ' } },
                { x: 3, y: 1, content: { mainContent: ' 1 ', secondaryContent: ' -3 ' } },
                { x: 4, y: 1, content: { mainContent: ' 0 ', secondaryContent: ' -4 ' } },
                { x: 5, y: 1, content: { mainContent: ' 6 ', secondaryContent: ' +2 ' } },
            ],
        },
        secondDistribution: {
            state: new MancalaState([
                [7, 1, 6, 1, 6, 6],
                [2, 6, 6, 1, 0, 6],
            ], 1, PlayerNumberMap.of(0, 0)),
            move: MancalaMove.of(MancalaDistribution.of(0)),
            result: [
                { x: 1, y: 0, content: { mainContent: ' 2 ', secondaryContent: ' +1 ' } },
                { x: 2, y: 0, content: { mainContent: ' 7 ', secondaryContent: ' +1 ' } },
                { x: 3, y: 0, content: { mainContent: ' 2 ', secondaryContent: ' +1 ' } },
                { x: 4, y: 0, content: { mainContent: ' 7 ', secondaryContent: ' +1 ' } },
                { x: 5, y: 0, content: { mainContent: ' 7 ', secondaryContent: ' +1 ' } },
                { x: 4, y: 1, content: { mainContent: ' 1 ', secondaryContent: ' +1 ' } },
                { x: 5, y: 1, content: { mainContent: ' 7 ', secondaryContent: ' +1 ' } },
            ],
        },
        monsoon: {
            state: new MancalaState([
                [0, 0, 0, 0, 0, 1],
                [0, 0, 0, 5, 6, 0],
            ], 121, PlayerNumberMap.of(0, 0)),
            move: MancalaMove.of(MancalaDistribution.of(5)),
            result: [
                { x: 3, y: 1, content: { mainContent: ' 0 ', secondaryContent: ' -5 ' } },
                { x: 4, y: 1, content: { mainContent: ' 0 ', secondaryContent: ' -6 ' } },
                { x: 5, y: 1, content: { mainContent: ' 0 ', secondaryContent: ' -1 ' } },
            ],
        },
        capture: {
            state: new MancalaState([
                [3, 1, 4, 4, 4, 4],
                [3, 1, 4, 4, 4, 4],
            ], 0, PlayerNumberMap.of(0, 0)),
            move: MancalaMove.of(MancalaDistribution.of(1)),
            result: [{ x: 0, y: 1, content: { mainContent: ' 0 ', secondaryContent: ' -4 ' } }],
        },
        fillThenCapture: {
            state: new MancalaState([
                [7, 1, 6, 1, 6, 6],
                [2, 6, 6, 1, 0, 6],
            ], 0, PlayerNumberMap.of(0, 0)),
            move: MancalaMove.of(MancalaDistribution.of(0)),
            result: [
                { x: 3, y: 1, content: { mainContent: ' 0 ', secondaryContent: ' -4 ' } },
            ],
        },
    });

    describe('Ba-awa Specific Tests', () => {

        beforeEach(fakeAsync(async() => {
            const testUtils: ComponentTestUtils<BaAwaComponent> = await ComponentTestUtils.forGame<BaAwaComponent>('BaAwa');
            mancalaTestUtils = new MancalaComponentTestUtils(testUtils, new BaAwaMoveGenerator());
        }));

        describe('Animations', () => {

            it('Should capture-on-the-go immediately', fakeAsync(async() => {
                // Given a board where a distribution pass by a capturable house
                const state: MancalaState = new MancalaState([
                    [0, 0, 0, 8, 0, 0],
                    [3, 2, 1, 0, 0, 0],
                ], 0, PlayerNumberMap.of(0, 0));
                await mancalaTestUtils.testUtils.setupState(state);
                const element: DebugElement = mancalaTestUtils.testUtils.findElement('#click-1-1');
                element.triggerEventHandler('click', null);
                tick(MancalaComponent.TIMEOUT_BETWEEN_LAPS); // House emptied, waiting for lap to start

                // When feeding the capturable house
                tick(MancalaComponent.TIMEOUT_BETWEEN_SEEDS);

                // Then it should be captured
                mancalaTestUtils.expectToBeCaptured([{ x: 0, y: 1, content: { mainContent: ' 0 ', secondaryContent: ' -4 ' } }]);
                tick(MancalaComponent.TIMEOUT_BETWEEN_SEEDS); // Dropping last seed
            }));

        });
    });

    describe('Custom Config', () => {

        let testUtils: ComponentTestUtils<BaAwaComponent>;

        beforeEach(fakeAsync(async() => {
            testUtils = await ComponentTestUtils.forGame<BaAwaComponent>('BaAwa');
            mancalaTestUtils = new MancalaComponentTestUtils(testUtils, new BaAwaMoveGenerator());
        }));

        it('should not require additional click when ending distribution in store', fakeAsync(async() => {
            // Given a Ba-awa state with a config with passByPlayerStore set to true
            const customConfig: MGPOptional<BaAwaConfig> = MGPOptional.of({
                ...defaultConfig.get(),
                passByPlayerStore: true,
            });
            const state: MancalaState = BaAwaRules.get().getInitialState(customConfig);
            await testUtils.setupState(state, { config: customConfig });

            // When doing simple distribution ending in store
            const move: MancalaMove = MancalaMove.of(MancalaDistribution.of(3));

            // Then this should trigger a single distribution move
            await mancalaTestUtils.expectMoveSuccess('#click-3-1', move, customConfig.get());
        }));

        it('should allow redistribution if allowed by config', fakeAsync(async() => {
            // Given a Ba-awa state with where multiple so would be possible, and the first sowing is done
            const customConfig: MGPOptional<BaAwaConfig> = MGPOptional.of({
                ...defaultConfig.get(),
                passByPlayerStore: true,
                mustContinueDistributionAfterStore: true,
            });
            const state: MancalaState = new MancalaState([
                [0, 0, 8, 0, 0, 0],
                [1, 0, 1, 1, 1, 0],
            ], 10, PlayerNumberMap.of(0, 0));
            await testUtils.setupState(state, { config: customConfig });
            await mancalaTestUtils.expectClickSuccess('#click-0-1');

            // When doing the second distribution
            const move: MancalaMove = MancalaMove.of(MancalaDistribution.of(0), [MancalaDistribution.of(2)]);

            // Then this should trigger a single distribution move
            await mancalaTestUtils.expectMoveSuccess('#click-2-1', move, customConfig.get());
            const expectedState: MancalaState = new MancalaState([
                [0, 0, 8, 0, 0, 0],
                [0, 1, 0, 1, 1, 0],
            ], 11, PlayerNumberMap.of(1, 0));
            const actualState: MancalaState = testUtils.getGameComponent().getState();
            expect(actualState).toEqual(expectedState);
        }));

    });

});
