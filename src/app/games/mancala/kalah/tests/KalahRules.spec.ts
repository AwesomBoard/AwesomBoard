/* eslint-disable max-lines-per-function */
import { RulesUtils } from 'src/app/jscaip/tests/RulesUtils.spec';
import { KalahRules } from '../KalahRules';
import { MancalaDistribution, MancalaMove } from '../../common/MancalaMove';
import { MancalaState } from '../../common/MancalaState';
import { Table, TableUtils } from 'src/app/jscaip/TableUtils';
import { MGPOptional, TestUtils } from '@everyboard/lib';
import { DoMancalaRulesTests } from '../../common/tests/GenericMancalaRulesTest.spec';
import { Player } from 'src/app/jscaip/Player';
import { MancalaConfig } from '../../common/MancalaConfig';
import { MancalaNode, MancalaRules } from '../../common/MancalaRules';
import { PlayerNumberMap } from 'src/app/jscaip/PlayerMap';

describe('KalahRules', () => {

    const rules: MancalaRules = KalahRules.get();
    const defaultConfig: MGPOptional<MancalaConfig> = KalahRules.get().getDefaultRulesConfig();

    describe('generic tests', () => {
        DoMancalaRulesTests({
            gameName: 'Kalah',
            rules,
            simpleMove: MancalaMove.of(MancalaDistribution.of(5)),
        });

    });

    describe('distribution', () => {

        it('should allow simple move', () => {
            // Given any board
            const state: MancalaState = KalahRules.get().getInitialState(defaultConfig);

            // When doing a simple move
            const move: MancalaMove = MancalaMove.of(MancalaDistribution.of(5));

            // Then the seeds should be distributed
            const expectedBoard: Table<number> = [
                [4, 4, 4, 4, 4, 4],
                [4, 5, 5, 5, 5, 0],
            ];
            const expectedState: MancalaState = new MancalaState(expectedBoard, 1, PlayerNumberMap.of(0, 0));
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
        });

        it('should feed initial house', () => {
            // Given a board where one house of current player is full enough to feed itself
            const state: MancalaState = new MancalaState([
                [0, 0, 0, 0, 0, 0],
                [13, 0, 0, 0, 0, 0],
            ], 0, PlayerNumberMap.of(0, 0));

            // When doing a simple move
            const move: MancalaMove = MancalaMove.of(MancalaDistribution.of(0));

            // Then the seeds should be distributed (and then by default that means a capture)
            const expectedBoard: Table<number> = [
                [0, 1, 1, 1, 1, 1],
                [0, 1, 1, 1, 1, 1],
            ];
            const expectedState: MancalaState = new MancalaState(expectedBoard, 1, PlayerNumberMap.of(3, 0));
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
        });

        it('should allow to distribute twice when first landing end up in the Kalah', () => {
            // Given a move with the first sub-move landing in the Kalah
            const state: MancalaState = KalahRules.get().getInitialState(defaultConfig);

            // When doing the double distribution
            const move: MancalaMove = MancalaMove.of(MancalaDistribution.of(3), [MancalaDistribution.of(5)]);

            // Then two distributions must have been done and one piece dropped in the Kalah
            const expectedBoard: Table<number> = [
                [4, 4, 4, 4, 4, 4],
                [5, 6, 6, 1, 5, 0],
            ];
            const expectedState: MancalaState = new MancalaState(expectedBoard, 1, PlayerNumberMap.of(1, 0));
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
        });

        it('should throw when distributing twice when first landing did not end in the Kalah', () => {
            // Given a double distribution with the first one not landing in the Kalah
            const state: MancalaState = KalahRules.get().getInitialState(defaultConfig);

            // When doing the double distribution
            const move: MancalaMove = MancalaMove.of(MancalaDistribution.of(1), [MancalaDistribution.of(2)]);

            // Then the move should be wildly considered as illegal, you scumbag hacker !
            const reason: string = 'Cannot play after non kalah move';
            TestUtils.expectToThrowAndLog(() => {
                RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
            }, reason);
        });

        it('should drop a piece in your Kalah when passing by', () => {
            // Given any move going further than your leftmost
            const state: MancalaState = KalahRules.get().getInitialState(defaultConfig);

            // When doing it
            const move: MancalaMove = MancalaMove.of(MancalaDistribution.of(0));

            // Then one of your seeds would be dropped in your Kalah
            // YEAH YOU READ THAT RIGHT, UP YOURS !!
            const expectedBoard: Table<number> = [
                [5, 5, 5, 4, 4, 4],
                [0, 4, 4, 4, 4, 4],
            ];
            const expectedState: MancalaState = new MancalaState(expectedBoard, 1, PlayerNumberMap.of(1, 0));
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
        });

        it(`should not drop a piece in opponent's Kalah when passing by`, () => {
            // Given any move going further than your leftmost house, and than last opponent's house
            const board: Table<number> = [
                [4, 4, 4, 4, 4, 4],
                [8, 4, 4, 4, 4, 4],
            ];
            const state: MancalaState = new MancalaState(board, 0, PlayerNumberMap.of(0, 0));

            // When doing it
            const move: MancalaMove = MancalaMove.of(MancalaDistribution.of(0));

            // Then one of your seeds would be dropped in your Kalah but not in the opponent's
            const expectedBoard: Table<number> = [
                [5, 5, 5, 5, 5, 5],
                [0, 4, 4, 4, 4, 5],
            ];
            const expectedState: MancalaState = new MancalaState(expectedBoard, 1, PlayerNumberMap.of(1, 0));
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
        });

        it('should forbid to stop distributing after landing in your Kalah', () => {
            // Given a simple distribution ending in the Kalah
            const state: MancalaState = KalahRules.get().getInitialState(defaultConfig);

            // When doing the move
            const move: MancalaMove = MancalaMove.of(MancalaDistribution.of(3));

            // Then the move should be illegal
            const reason: string = 'Must continue playing after kalah move';
            TestUtils.expectToThrowAndLog(() => {
                RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
            }, reason);
        });

        it('should allow to pass by Kalah several time', () => {
            // Given a board where you could pass by Kalah five times
            const state: MancalaState = new MancalaState([
                [0, 0, 1, 9, 0, 0],
                [1, 1, 4, 1, 5, 4],
            ], 10, PlayerNumberMap.of(13, 9));

            // When doing that complex move
            const move: MancalaMove =
            MancalaMove.of(MancalaDistribution.of(0),
                           [
                               MancalaDistribution.of(4),
                               MancalaDistribution.of(0),
                               MancalaDistribution.of(1),
                               MancalaDistribution.of(0),
                               MancalaDistribution.of(5),
                           ]);

            // Then the move should succeed
            const expectedState: MancalaState = new MancalaState([
                [0, 0, 1, 9, 0, 0],
                [0, 1, 6, 3, 1, 0],
            ], 11, PlayerNumberMap.of(18, 9));
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
        });

        it('should allow to stop distribution in the Kalah when no more piece available', () => {
            // Given a move where current player has no more non-Kalah sub-moves
            const state: MancalaState = new MancalaState([
                [0, 0, 1, 9, 0, 0],
                [1, 0, 0, 0, 0, 0],
            ], 10, PlayerNumberMap.of(13, 9));

            // When doing the only move possible for the remaining sub-move
            const move: MancalaMove = MancalaMove.of(MancalaDistribution.of(0));

            // Then that normally-illegal move should be accepted
            // And since player gave their last seeds, monsoon follows
            const expectedState: MancalaState = new MancalaState(
                TableUtils.create(6, 2, 0),
                11,
                PlayerNumberMap.of(14, 19),
            );
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
        });

    });

    describe('starvation and monsoon', () => {

        it('should monsoon even if next player will be able to feed current player', () => {
            // Given a state where next player is able to distribute
            const board: Table<number> = [
                [0, 0, 0, 0, 0, 1],
                [0, 3, 0, 0, 0, 0],
            ];
            const state: MancalaState = new MancalaState(board, 1, PlayerNumberMap.of(22, 22));

            // When current player player gives its last seed
            const move: MancalaMove = MancalaMove.of(MancalaDistribution.of(5));

            // Then the move should be the last of the game and Player.ZERO should monsoon
            const expectedBoard: Table<number> = TableUtils.create(6, 2, 0);
            const expectedState: MancalaState = new MancalaState(expectedBoard, 2, PlayerNumberMap.of(25, 23));
            const node: MancalaNode = new MancalaNode(expectedState);
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
            RulesUtils.expectToBeVictoryFor(rules, node, Player.ZERO, defaultConfig);
        });

        it(`should monsoon player after player captured opponent's last seeds`, () => {
            // Given a state where next player is able to distribute
            const board: Table<number> = [
                [0, 0, 0, 0, 2, 0],
                [0, 1, 0, 0, 0, 1],
            ];
            const state: MancalaState = new MancalaState(board, 0, PlayerNumberMap.of(22, 22));

            // When current player capture opponent last seeds
            const move: MancalaMove = MancalaMove.of(MancalaDistribution.of(5));

            // Then the move should be the last of the game and Player.ZERO should monsoon
            const expectedBoard: Table<number> = TableUtils.create(6, 2, 0);
            const expectedState: MancalaState = new MancalaState(expectedBoard, 1, PlayerNumberMap.of(26, 22));
            const node: MancalaNode = new MancalaNode(expectedState);
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
            RulesUtils.expectToBeVictoryFor(rules, node, Player.ZERO, defaultConfig);
        });

        it('should monsoon if next player will not be able to feed current player', () => {
            // Given a state where next player is unable to feed current player
            const board: Table<number> = [
                [0, 0, 0, 0, 0, 2],
                [0, 1, 2, 3, 4, 4],
            ];
            const state: MancalaState = new MancalaState(board, 1, PlayerNumberMap.of(10, 22));

            // When player gives its last seed
            const move: MancalaMove = MancalaMove.of(MancalaDistribution.of(5));

            // Then, since the other player can't distribute, all its pieces should be monsooned
            const expectedBoard: Table<number> = TableUtils.create(6, 2, 0);
            const expectedState: MancalaState = new MancalaState(expectedBoard, 2, PlayerNumberMap.of(25, 23));
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
            const node: MancalaNode = new MancalaNode(expectedState,
                                                      MGPOptional.empty(),
                                                      MGPOptional.of(move));
            RulesUtils.expectToBeVictoryFor(rules, node, Player.ZERO, defaultConfig);
        });

    });

    describe('captures', () => {

        it(`should capture opposite house when landing in your own territory on an empty house`, () => {
            // Given a board with an opponent's house full of seeds and your paralel house being empty
            const board: Table<number> = [
                [4, 4, 4, 4, 4, 4],
                [0, 0, 0, 0, 2, 0],
            ];
            const state: MancalaState = new MancalaState(board, 4, PlayerNumberMap.of(0, 0));

            // When doing a move that end up in this house of your
            const move: MancalaMove = MancalaMove.of(MancalaDistribution.of(4));

            // Then you should capture both houses
            const expectedBoard: Table<number> = [
                [4, 4, 0, 4, 4, 4],
                [0, 0, 0, 1, 0, 0],
            ];
            const expectedState: MancalaState = new MancalaState(expectedBoard, 5, PlayerNumberMap.of(5, 0));
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
        });

        it(`should not capture parallel opponent's house when landing in an occupied house of yours`, () => {
            // Given a board with an opponent's house full of seeds and your paralel house being empty
            const board: Table<number> = [
                [4, 4, 4, 4, 4, 4],
                [0, 0, 1, 0, 2, 0],
            ];
            const state: MancalaState = new MancalaState(board, 4, PlayerNumberMap.of(0, 0));

            // When doing a move that end up in this house of yours but after doing a full turn first
            const move: MancalaMove = MancalaMove.of(MancalaDistribution.of(4));

            // Then you should not capture anything
            const expectedBoard: Table<number> = [
                [4, 4, 4, 4, 4, 4],
                [0, 0, 2, 1, 0, 0],
            ];
            const expectedState: MancalaState = new MancalaState(expectedBoard, 5, PlayerNumberMap.of(0, 0));
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
        });

        it('should capture when landing on empty space inside your territory', () => {
            // Given a board with possible capture
            const board: Table<number> = [
                [0, 0, 0, 1, 0, 7],
                [8, 0, 0, 1, 0, 0],
            ];
            const state: MancalaState = new MancalaState(board, 0, PlayerNumberMap.of(0, 0));

            // When doing the move
            const move: MancalaMove = MancalaMove.of(MancalaDistribution.of(0));

            // Then the capture should be done too
            const expectedBoard: Table<number> = [
                [1, 1, 1, 2, 1, 0],
                [0, 0, 0, 1, 0, 0],
            ];
            const expectedState: MancalaState = new MancalaState(expectedBoard, 1, PlayerNumberMap.of(10, 0));
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
        });

        it('should allow long capture', () => {
            // Given a board where you could pass by Kalah five times
            const state: MancalaState = new MancalaState([
                [0, 0, 1, 9, 0, 0],
                [1, 2, 3, 0, 0, 0],
            ], 0, PlayerNumberMap.of(0, 0));

            // When doing that complex move
            const move: MancalaMove =
            MancalaMove.of(MancalaDistribution.of(0),
                           [
                               MancalaDistribution.of(1),
                               MancalaDistribution.of(0),
                               MancalaDistribution.of(2),
                               MancalaDistribution.of(0),
                               MancalaDistribution.of(1),
                           ]);

            // Then the move should succeed
            const expectedState: MancalaState = new MancalaState([
                [0, 0, 1, 9, 0, 0],
                [1, 0, 0, 0, 0, 0],
            ], 1, PlayerNumberMap.of(5, 0));
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
        });

    });

    describe('Custom Config', () => {

        it('should not require additionnal distribution when not allowed by config (mustContinueDistributionAfterStore)', () => {
            // Given a mancala state with a config with mustContinueDistributionAfterStore set to false
            const customConfig: MGPOptional<MancalaConfig> = MGPOptional.of({
                ...defaultConfig.get(),
                mustContinueDistributionAfterStore: false,
            });
            const state: MancalaState = KalahRules.get().getInitialState(customConfig);

            // When doing simple distribution ending in store
            const move: MancalaMove = MancalaMove.of(MancalaDistribution.of(3));

            // Then the move should succeed and the store should contain one (so, the score)
            const expectedBoard: Table<number> = [
                [4, 4, 4, 4, 4, 4],
                [5, 5, 5, 0, 4, 4],
            ];
            const expectedState: MancalaState = new MancalaState(expectedBoard, 1, PlayerNumberMap.of(1, 0));
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, customConfig);
        });

        it('should allow to do second distribution when multi-lap mancala ends-up in store', () => {
            // Given any board where a move doing a first distribution ending in store, then another distribution
            // and a config allowing to do that
            const customConfig: MGPOptional<MancalaConfig> = MGPOptional.of({
                ...defaultConfig.get(),
                passByPlayerStore: true,
                mustContinueDistributionAfterStore: true,
                continueLapUntilCaptureOrEmptyHouse: true,
            });
            const state: MancalaState = new MancalaState([
                [0, 2, 2, 0, 2, 0],
                [2, 0, 2, 1, 1, 0],
            ], 10, PlayerNumberMap.of(14, 9));

            // When applying that move
            const move: MancalaMove = MancalaMove.of(MancalaDistribution.of(3), [MancalaDistribution.of(4)]);

            // Then the move should succeed
            const expectedState: MancalaState = new MancalaState([
                [0, 2, 2, 0, 2, 0],
                [3, 1, 0, 1, 0, 0],
            ], 11, PlayerNumberMap.of(15, 9));

            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, customConfig);
        });

    });

});
