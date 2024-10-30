/* eslint-disable max-lines-per-function */
import { fakeAsync } from '@angular/core/testing';
import { MGPOptional } from '@everyboard/lib';

import { AwaleComponent } from '../awale.component';
import { AwaleRules } from '../AwaleRules';
import { PlayerNumberMap } from 'src/app/jscaip/PlayerMap';
import { MancalaState } from 'src/app/games/mancala/common/MancalaState';
import { doMancalaComponentTests as doMancalaComponentTests, MancalaComponentTestUtils } from '../../common/tests/GenericMancalaComponentTest.spec';
import { AwaleMoveGenerator } from '../AwaleMoveGenerator';
import { MancalaConfig } from '../../common/MancalaConfig';
import { ComponentTestUtils } from 'src/app/utils/tests/TestUtils.spec';
import { MancalaDistribution, MancalaMove } from '../../common/MancalaMove';
import { Table } from 'src/app/jscaip/TableUtils';
import { MancalaFailure } from '../../common/MancalaFailure';

const defaultConfig: MGPOptional<MancalaConfig> = AwaleRules.get().getDefaultRulesConfig();

describe('AwaleComponent', () => {

    doMancalaComponentTests({
        component: AwaleComponent,
        gameName: 'Awale',
        moveGenerator: new AwaleMoveGenerator(),
        distribution: {
            state: AwaleRules.get().getInitialState(defaultConfig),
            move: MancalaMove.of(MancalaDistribution.of(0)),
            result: [
                { x: 0, y: 0, content: { mainContent: ' 5 ', secondaryContent: ' +1 ' } },
                { x: 1, y: 0, content: { mainContent: ' 5 ', secondaryContent: ' +1 ' } },
                { x: 2, y: 0, content: { mainContent: ' 5 ', secondaryContent: ' +1 ' } },
                { x: 3, y: 0, content: { mainContent: ' 5 ', secondaryContent: ' +1 ' } },
            ],
        },
        secondDistribution: {
            state: new MancalaState([
                [5, 5, 5, 5, 4, 4],
                [0, 4, 4, 4, 4, 4],
            ], 1, PlayerNumberMap.of(0, 0)),
            move: MancalaMove.of(MancalaDistribution.of(1)),
            result: [
                { x: 2, y: 0, content: { mainContent: ' 6 ', secondaryContent: ' +1 ' } },
                { x: 3, y: 0, content: { mainContent: ' 6 ', secondaryContent: ' +1 ' } },
                { x: 4, y: 0, content: { mainContent: ' 5 ', secondaryContent: ' +1 ' } },
                { x: 5, y: 0, content: { mainContent: ' 5 ', secondaryContent: ' +1 ' } },
                { x: 5, y: 1, content: { mainContent: ' 5 ', secondaryContent: ' +1 ' } },
            ],
        },
        monsoon: {
            state: new MancalaState([
                [0, 0, 0, 0, 0, 1],
                [0, 0, 0, 0, 0, 4],
            ], 121, PlayerNumberMap.of(0, 0)),
            move: MancalaMove.of(MancalaDistribution.of(5)),
            result: [{ x: 5, y: 1, content: { mainContent: ' 0 ', secondaryContent: ' -5 ' } }],
        },
        capture: {
            state: new MancalaState([
                [4, 1, 4, 4, 4, 4],
                [2, 4, 4, 4, 4, 4],
            ], 0, PlayerNumberMap.of(0, 0)),
            move: MancalaMove.of(MancalaDistribution.of(0)),
            result: [{ x: 1, y: 0, content: { mainContent: ' 0 ', secondaryContent: ' -2 ' } }],
        },
        fillThenCapture: {
            state: new MancalaState([
                [11, 4, 4, 4, 4, 0],
                [17, 4, 4, 4, 4, 4],
            ], 0, PlayerNumberMap.of(0, 0)),
            move: MancalaMove.of(MancalaDistribution.of(0)),
            result: [{ x: 5, y: 0, content: { mainContent: ' 0 ', secondaryContent: ' -2 ' } }],
        },
    });

    describe('Custom configuration', () => {

        let testUtils: ComponentTestUtils<AwaleComponent>;
        let mancalaTestUtils: MancalaComponentTestUtils<AwaleComponent, AwaleRules>;

        beforeEach(fakeAsync(async() => {
            testUtils = await ComponentTestUtils.forGame<AwaleComponent>('Awale');
            mancalaTestUtils = new MancalaComponentTestUtils(testUtils, new AwaleMoveGenerator());
        }));

        it('should not require additional click when ending distribution in store', fakeAsync(async() => {
            // Given an awale state with a config with passByPlayerStore set to true
            const customConfig: MGPOptional<MancalaConfig> = MGPOptional.of({
                ...defaultConfig.get(),
                passByPlayerStore: true,
            });
            const state: MancalaState = AwaleRules.get().getInitialState(customConfig);
            await testUtils.setupState(state, { config: customConfig });

            // When doing simple distribution ending in store
            const move: MancalaMove = MancalaMove.of(MancalaDistribution.of(3));

            // Then this should trigger a single distribution move
            await mancalaTestUtils.expectMoveSuccess('#click-3-1', move, customConfig.get());
        }));

        it('should allow redistribution if allowed by config', fakeAsync(async() => {
            // Given an awale state with where multiple so would be possible, and the first sowing is done
            const customConfig: MGPOptional<MancalaConfig> = MGPOptional.of({
                ...defaultConfig.get(),
                passByPlayerStore: true,
                mustContinueDistributionAfterStore: true,
            });
            const state: MancalaState = AwaleRules.get().getInitialState(customConfig);
            await testUtils.setupState(state, { config: customConfig });
            await mancalaTestUtils.expectClickSuccess('#click-3-1');

            // When doing the second distribution
            const move: MancalaMove = MancalaMove.of(MancalaDistribution.of(3), [MancalaDistribution.of(0)]);

            // Then this should trigger a single distribution move
            await mancalaTestUtils.expectMoveSuccess('#click-0-1', move, customConfig.get());
            const expectedState: MancalaState = new MancalaState([
                [5, 5, 5, 5, 4, 4],
                [0, 5, 5, 0, 4, 4],
            ], 1, PlayerNumberMap.of(2, 0));
            const actualState: MancalaState = testUtils.getGameComponent().getState();
            expect(actualState).toEqual(expectedState);
        }));

    });

    it('should not animate illegal distribution', fakeAsync(async() => {
        // Given a state where the player could feed its opponent
        const board: Table<number> = [
            [1, 0, 0, 0, 0, 1],
            [0, 0, 0, 0, 0, 0],
        ];
        const state: MancalaState = new MancalaState(board, 1, PlayerNumberMap.of(23, 23));
        const testUtils: ComponentTestUtils<AwaleComponent> = await ComponentTestUtils.forGame<AwaleComponent>('Awale');
        await testUtils.setupState(state);

        // When performing a click that would trigger an illegal move
        // Then the move should be illegal
        await testUtils.expectClickFailure('#click-0-0', MancalaFailure.SHOULD_DISTRIBUTE());
    }));

});
