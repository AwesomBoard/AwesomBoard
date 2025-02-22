/* eslint-disable max-lines-per-function */
import { RulesUtils } from 'src/app/jscaip/tests/RulesUtils.spec';
import { MancalaState } from '../MancalaState';
import { MancalaDistribution, MancalaMove } from '../MancalaMove';
import { MancalaFailure } from '../MancalaFailure';
import { Player } from 'src/app/jscaip/Player';
import { MancalaConfig } from '../MancalaConfig';
import { GameNode } from 'src/app/jscaip/AI/GameNode';
import { MancalaNode, MancalaRules } from '../MancalaRules';
import { MGPOptional, TestUtils } from '@everyboard/lib';
import { PlayerNumberMap } from 'src/app/jscaip/PlayerMap';
import { Table, TableUtils } from 'src/app/jscaip/TableUtils';

export class MancalaRulesTestEntries {
    gameName: string; // 'Awale', 'Kalah', etc
    rules: MancalaRules;
    simpleMove: MancalaMove;
}

export function DoMancalaRulesTests(entries: MancalaRulesTestEntries): void {

    const rules: MancalaRules = entries.rules;
    const defaultConfig: MGPOptional<MancalaConfig> = rules.getDefaultRulesConfig();

    describe(entries.gameName + 'Rules generic tests', () => {

        it('should refuse distributing empty space', () => {
            // Given a board where 'simpleMove' would be illegal, distributing an empty house
            const board: number[][] = [
                [4, 0, 4, 4, 4, 4],
                [4, 0, 4, 4, 4, 0],
            ];
            const state: MancalaState = new MancalaState(board, 0, PlayerNumberMap.of(0, 0));
            // When attempting to distribute empty space
            // Then it should be illegal
            const reason: string = MancalaFailure.MUST_CHOOSE_NON_EMPTY_HOUSE();
            RulesUtils.expectMoveFailure(rules, state, entries.simpleMove, reason, defaultConfig);
        });

        it('should refuse starving when custom config refuse starvation', () => {
            // Given a state where you have to feed and pass by store
            const customConfig: MGPOptional<MancalaConfig> = MGPOptional.of({
                ...defaultConfig.get(),
                passByPlayerStore: true,
                mustFeed: true,
            });
            const state: MancalaState = new MancalaState([
                [0, 0, 0, 0, 0, 0],
                [2, 0, 0, 0, 2, 0],
            ], 10, PlayerNumberMap.of(0, 0));

            // When attempting starving move
            const move: MancalaMove = MancalaMove.of(MancalaDistribution.of(4));

            // Then it should be refused
            const reason: string = MancalaFailure.SHOULD_DISTRIBUTE();
            RulesUtils.expectMoveFailure(rules, state, move, reason, customConfig);
        });

        it('should allow starving when custom config allows it', () => {
            // Given a state where you don't have to feed and pass by store
            const customConfig: MGPOptional<MancalaConfig> = MGPOptional.of({
                ...defaultConfig.get(),
                passByPlayerStore: true,
                mustFeed: false,
            });
            const state: MancalaState = new MancalaState([
                [0, 0, 0, 0, 0, 0],
                [2, 0, 0, 0, 2, 0],
            ], 10, PlayerNumberMap.of(22, 22));

            // When attempting starving move
            const move: MancalaMove = MancalaMove.of(MancalaDistribution.of(4));

            // Then the move should succeed
            const expectedState: MancalaState = new MancalaState(
                TableUtils.create(6, 2, 0),
                11,
                PlayerNumberMap.of(26, 22),
            );
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, customConfig);
        });

        it('should know when to monsoon', () => {
            // Given a state where player is about to cede their last seed, and won't be feedable
            const customConfig: MGPOptional<MancalaConfig> = MGPOptional.of({
                ...defaultConfig.get(),
                passByPlayerStore: true,
                mustFeed: true,
            });
            const state: MancalaState = new MancalaState([
                [0, 0, 0, 0, 0, 1],
                [1, 0, 0, 0, 2, 0],
            ], 11, PlayerNumberMap.of(22, 22));

            // When doing the last move
            const move: MancalaMove = MancalaMove.of(MancalaDistribution.of(5));

            // Then the move should succeed
            const expectedState: MancalaState = new MancalaState(
                TableUtils.create(6, 2, 0),
                12,
                PlayerNumberMap.of(25, 23),
            );
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, customConfig);
        });

        it('should refuse ending move in store when config requires to continue', () => {
            // Given a mancala state with a config with passByPlayerStore set to true
            const customConfig: MGPOptional<MancalaConfig> = MGPOptional.of({
                ...defaultConfig.get(),
                passByPlayerStore: true,
                mustContinueDistributionAfterStore: true,
            });
            const state: MancalaState = rules.getInitialState(customConfig);

            // When attempting a store-ending single distribution
            const move: MancalaMove = MancalaMove.of(MancalaDistribution.of(3));

            // Then the move should succeed and the store should contain one (so, the score)
            const reason: string = 'Must continue playing after kalah move';
            TestUtils.expectToThrowAndLog(
                () => RulesUtils.expectMoveFailure(rules, state, move, reason, customConfig),
                reason,
            );
        });

        describe('getGameStatus', () => {
            const smallerConfig: MGPOptional<MancalaConfig> =
                MGPOptional.of({ ...defaultConfig.get(), seedsByHouse: 2 });
            const biggerConfig: MGPOptional<MancalaConfig> =
                MGPOptional.of({ ...defaultConfig.get(), seedsByHouse: 6 });
            for (const optionalConfig of [smallerConfig, defaultConfig, biggerConfig]) {
                const config: MancalaConfig = optionalConfig.get();
                const halfOfTotalSeeds: number = config.width * config.seedsByHouse;

                describe(`Config with ${ config.seedsByHouse } seeds by house`, () => {

                    it(`should identify victory for player 0`, () => {
                        // Given a state with no more seeds and where player 0 has captured more seeds
                        const board: Table<number> = TableUtils.create(config.width, 2, 0);
                        const state: MancalaState =
                            new MancalaState(board, 6, PlayerNumberMap.of(halfOfTotalSeeds + 2, halfOfTotalSeeds - 2));
                        const node: MancalaNode = new GameNode(state);
                        // Then it should be a victory for player 0
                        RulesUtils.expectToBeVictoryFor(rules, node, Player.ZERO, MGPOptional.of(config));
                    });

                    it('should identify victory for player 1', () => {
                        // Given a state with no more seeds and where player 1 has captured more seeds
                        const board: Table<number> = TableUtils.create(config.width, 2, 0);
                        const state: MancalaState =
                            new MancalaState(board, 6, PlayerNumberMap.of(halfOfTotalSeeds - 2, halfOfTotalSeeds + 2));
                        const node: MancalaNode = new GameNode(state);
                        // Then it should be a victory for player 1
                        RulesUtils.expectToBeVictoryFor(rules, node, Player.ONE, MGPOptional.of(config));
                    });

                    it('should identify draw', () => {
                        // Given a state with no more seeds and both players have captured the same number of seeds
                        const board: Table<number> = TableUtils.create(config.width, 2, 0);
                        const state: MancalaState =
                            new MancalaState(board, 6, PlayerNumberMap.of(halfOfTotalSeeds, halfOfTotalSeeds));
                        const node: MancalaNode = new GameNode(state);
                        // Then it should be a draw
                        RulesUtils.expectToBeDraw(rules, node, MGPOptional.of(config));
                    });

                });

            }

        });

    });

}
