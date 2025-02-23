/* eslint-disable max-lines-per-function */
import { BaAwaRules as BaAwaRules } from '../BaAwaRules';
import { MancalaState } from '../../common/MancalaState';
import { RulesUtils } from 'src/app/jscaip/tests/RulesUtils.spec';
import { MGPOptional } from '@everyboard/lib';
import { DoMancalaRulesTests } from '../../common/tests/GenericMancalaRulesTest.spec';

import { MancalaDistribution, MancalaMove } from '../../common/MancalaMove';
import { BaAwaConfig } from '../BaAwaConfig';
import { PlayerNumberMap } from 'src/app/jscaip/PlayerMap';
import { Table, TableUtils } from 'src/app/jscaip/TableUtils';

describe('BaAwaRules', () => {

    const rules: BaAwaRules = BaAwaRules.get();
    const defaultConfig: MGPOptional<BaAwaConfig> = BaAwaRules.get().getDefaultRulesConfig();

    describe('generic tests', () => {

        DoMancalaRulesTests({
            gameName: 'Ba-awa',
            rules,
            simpleMove: MancalaMove.of(MancalaDistribution.of(5)),
        });

    });

    describe('distribution', () => {

        it('should allow simple move', () => {
            // Given any board
            const state: MancalaState = rules.getInitialState(defaultConfig);

            // When doing a simple move
            const move: MancalaMove = MancalaMove.of(MancalaDistribution.of(5));

            // Then the seeds should be distributed
            const expectedBoard: Table<number> = [
                [6, 6, 0, 1, 6, 6],
                [6, 1, 6, 1, 7, 2],
            ];
            const expectedState: MancalaState = new MancalaState(expectedBoard, 1, PlayerNumberMap.of(0, 0));
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
        });

        it('should drop a piece in the starting space', () => {
            // Given a state where the player can perform a distributing move with at least 12 seeds
            const board: Table<number> = [
                [0, 0, 0, 0, 0, 18],
                [0, 0, 0, 0, 0, 0],
            ];
            const state: MancalaState = new MancalaState(board, 1, PlayerNumberMap.of(0, 0));
            // When performing a distribution
            const move: MancalaMove = MancalaMove.of(MancalaDistribution.of(5));
            // Then the distribution should be performed as expected, and leave 0 seeds in the starting space
            const expectedBoard: Table<number> = [
                [3, 1, 2, 0, 2, 0],
                [1, 0, 3, 3, 0, 3],
            ];
            const expectedState: MancalaState = new MancalaState(expectedBoard, 2, PlayerNumberMap.of(0, 0));
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
        });

        it('should allow feeding move', () => {
            // Given a state where the player could feed its opponent
            const board: Table<number> = [
                [8, 0, 0, 0, 0, 1],
                [0, 0, 0, 0, 0, 0],
            ];
            const state: MancalaState = new MancalaState(board, 1, PlayerNumberMap.of(19, 20));

            // When performing a move that feeds the opponent
            const move: MancalaMove = MancalaMove.of(MancalaDistribution.of(5));
            const expectedBoard: Table<number> = [
                [8, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 1],
            ];
            const expectedState: MancalaState = new MancalaState(expectedBoard, 2, PlayerNumberMap.of(19, 20));

            // Then the move should succeed
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
        });

    });

    describe('starvation and monsoon', () => {

        it('should monsoon for opponent when player gives its last seed', () => {
            // Given a state where next player is unable to feed current player
            const board: Table<number> = [
                [0, 0, 0, 0, 0, 5],
                [0, 0, 0, 1, 1, 2],
            ];
            const state: MancalaState = new MancalaState(board, 1, PlayerNumberMap.of(19, 20));

            // When player gives its last seed
            const move: MancalaMove = MancalaMove.of(MancalaDistribution.of(5));

            // Then we still let that player do its last move, so they see the last move was all the same
            const expectedBoard: Table<number> = TableUtils.create(6, 2, 0);
            const expectedState: MancalaState = new MancalaState(expectedBoard, 2, PlayerNumberMap.of(28, 20));
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
        });

    });

    describe('captures', () => {

        it('should capture for player zero', () => {
            // Given a state where a capture is possible for player 0
            const board: Table<number> = [
                [3, 8, 0, 0, 0, 0],
                [1, 1, 0, 0, 0, 0],
            ];
            const state: MancalaState = new MancalaState(board, 2, PlayerNumberMap.of(0, 0));

            // When performing a move that will capture
            const move: MancalaMove = MancalaMove.of(MancalaDistribution.of(0));

            // Then the capture should be performed
            const expectedBoard: Table<number> = [
                [0, 8, 0, 0, 0, 0],
                [0, 1, 0, 0, 0, 0],
            ];
            const expectedState: MancalaState = new MancalaState(expectedBoard, 3, PlayerNumberMap.of(4, 0));
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
        });

        it('should capture for player one', () => {
            // Given a state where a capture is possible for player 1
            const board: Table<number> = [
                [0, 0, 0, 0, 8, 1],
                [0, 0, 0, 0, 1, 3],
            ];
            const state: MancalaState = new MancalaState(board, 1, PlayerNumberMap.of(0, 0));

            // When performing a move that will capture
            const move: MancalaMove = MancalaMove.of(MancalaDistribution.of(5));

            // Then the capture should be performed
            const expectedBoard: Table<number> = [
                [0, 0, 0, 0, 8, 0],
                [0, 0, 0, 0, 1, 0],
            ];
            const expectedState: MancalaState = new MancalaState(expectedBoard, 2, PlayerNumberMap.of(0, 4));
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
        });

        it('should do capture-on-the-go for opponent when possible', () => {
            // Given a state where a capture-on-the-go is possible for passive player
            const board: Table<number> = [
                [3, 1, 0, 0, 0, 8],
                [3, 1, 0, 0, 0, 0],
            ];
            const state: MancalaState = new MancalaState(board, 2, PlayerNumberMap.of(0, 0));

            // When performing a move that will capture
            const move: MancalaMove = MancalaMove.of(MancalaDistribution.of(0));

            // Then the capture should be performed
            const expectedBoard: Table<number> = [
                [0, 2, 1, 0, 0, 8],
                [0, 1, 0, 0, 0, 0],
            ];
            const expectedState: MancalaState = new MancalaState(expectedBoard, 3, PlayerNumberMap.of(0, 4));
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
        });

        it('should do capture-on-the-go for player when possible', () => {
            // Given a state where a capture-on-the-go is possible for active player !
            const board: Table<number> = [
                [0, 0, 0, 0, 0, 8],
                [3, 2, 0, 0, 1, 0],
            ];
            const state: MancalaState = new MancalaState(board, 2, PlayerNumberMap.of(0, 0));

            // When performing a move that will create a 4 in a player's house
            const move: MancalaMove = MancalaMove.of(MancalaDistribution.of(1));

            // Then the capture should be performed
            const expectedBoard: Table<number> = [
                [1, 0, 0, 0, 0, 8],
                [0, 0, 0, 0, 1, 0],
            ];
            const expectedState: MancalaState = new MancalaState(expectedBoard, 3, PlayerNumberMap.of(4, 0));
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
        });

        it('should do multiple capture-on-the-go for opponent when possible', () => {
            // Given a state where a multiplie capture-on-the-go is possible for passive player
            const board: Table<number> = [
                [3, 3, 0, 0, 0, 8],
                [5, 1, 0, 0, 0, 0],
            ];
            const state: MancalaState = new MancalaState(board, 2, PlayerNumberMap.of(0, 0));

            // When performing a move that will capture
            const move: MancalaMove = MancalaMove.of(MancalaDistribution.of(0));

            // Then the capture should be performed
            const expectedBoard: Table<number> = [
                [0, 0, 1, 1, 1, 8],
                [0, 1, 0, 0, 0, 0],
            ];
            const expectedState: MancalaState = new MancalaState(expectedBoard, 3, PlayerNumberMap.of(0, 8));
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
        });

        it('should do multipe capture-on-the-go for player when possible', () => {
            // Given a state where a multiple capture-on-the-go is possible for active player !
            const board: Table<number> = [
                [0, 0, 0, 0, 0, 8],
                [3, 3, 3, 0, 0, 1],
            ];
            const state: MancalaState = new MancalaState(board, 2, PlayerNumberMap.of(0, 0));

            // When performing a move that will create a 4 in a player's house
            const move: MancalaMove = MancalaMove.of(MancalaDistribution.of(2));

            // Then the capture should be performed
            const expectedBoard: Table<number> = [
                [1, 0, 0, 0, 0, 8],
                [0, 0, 0, 0, 0, 1],
            ];
            const expectedState: MancalaState = new MancalaState(expectedBoard, 3, PlayerNumberMap.of(8, 0));
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
        });

        it(`should monsoon for player zero when total of seed drop to 8 or less (Player.ZERO's turn)`, () => {
            // Given a state in which Player.ZERO could capture and make total count of seeds drop below 8
            const board: Table<number> = [
                [0, 0, 0, 3, 3, 0],
                [0, 0, 2, 0, 3, 1],
            ];
            const state: MancalaState = new MancalaState(board, 0, PlayerNumberMap.of(0, 0));

            // When the player does a would-starve move
            const move: MancalaMove = MancalaMove.of(MancalaDistribution.of(5));

            // Then, the distribution should be done but not the capture
            const expectedBoard: Table<number> = TableUtils.create(6, 2, 0);
            const expectedState: MancalaState = new MancalaState(expectedBoard, 1, PlayerNumberMap.of(12, 0));
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
        });

        it(`should monsoon for player zero when total of seed drop to 8 or less (Player.ONE's turn)`, () => {
            // Given a state in which Player.ONE could capture and make the total of seeds drop below 8
            const board: Table<number> = [
                [0, 0, 2, 3, 1, 0],
                [0, 0, 2, 0, 3, 1],
            ];
            const state: MancalaState = new MancalaState(board, 1, PlayerNumberMap.of(0, 0));

            // When the player does the move that drops the number of piece below 8
            const move: MancalaMove = MancalaMove.of(MancalaDistribution.of(2));

            // Then the monsoon should be done
            const expectedBoard: Table<number> = TableUtils.create(6, 2, 0);
            const expectedState: MancalaState = new MancalaState(expectedBoard, 2, PlayerNumberMap.of(8, 4));
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
        });

    });

    describe('Custom Config', () => {

        it('should count "store-dropping" as "passing below 8"', () => {
            // Given a board where we are about to pass by store and drop to 8 or below
            const customConfig: MGPOptional<BaAwaConfig> = MGPOptional.of({
                ...defaultConfig.get(),
                passByPlayerStore: true,
            });
            const state: MancalaState = new MancalaState([
                [0, 0, 5, 0, 0, 0],
                [2, 0, 1, 0, 0, 0],
            ], 10, PlayerNumberMap.of(0, 0));

            // When passing by store during move
            const move: MancalaMove = MancalaMove.of(MancalaDistribution.of(0));

            // Then it should monsoon for end game
            const expectedState: MancalaState = new MancalaState([
                [0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0],
            ], 11, PlayerNumberMap.of(8, 0));
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, customConfig);
        });

        it(`should split monsoon for when total of seed drop to 8 or less and config ask for even split`, () => {
            // Given a state in which Player.ONE could capture and make total seed drop below 8
            // And a config mentionning that final seeds are split
            const board: Table<number> = [
                [0, 1, 2, 3, 0, 0],
                [0, 0, 2, 0, 3, 1],
            ];
            const state: MancalaState = new MancalaState(board, 1, PlayerNumberMap.of(0, 0));
            const customConfig: MGPOptional<BaAwaConfig> = MGPOptional.of({
                ...defaultConfig.get(),
                splitFinalSeedsEvenly: true,
            });

            // When the move is done
            const move: MancalaMove = MancalaMove.of(MancalaDistribution.of(2));

            // Then the distribution should be done, Player.ONE should have captured 4 + 4 after the split
            // And Player.ZERO only have the 4 of the split
            const expectedBoard: Table<number> = TableUtils.create(6, 2, 0);
            const expectedState: MancalaState = new MancalaState(expectedBoard, 2, PlayerNumberMap.of(4, 8));
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, customConfig);
        });

        it('should allow to do second distribution when multi-lap mancala ends-up in store', () => {
            // Given any board where a move doing a first distribution ending in store, then another distribution
            // and a config allowing to do that
            const customConfig: MGPOptional<BaAwaConfig> = MGPOptional.of({
                ...defaultConfig.get(),
                passByPlayerStore: true,
                mustContinueDistributionAfterStore: true,
                continueLapUntilCaptureOrEmptyHouse: true,
            });
            const state: MancalaState = new MancalaState([
                [0, 2, 2, 10, 2, 0],
                [2, 0, 2, 1, 1, 0],
            ], 10, PlayerNumberMap.of(14, 9));

            // When applying that move
            const move: MancalaMove = MancalaMove.of(MancalaDistribution.of(3), [MancalaDistribution.of(4)]);

            // Then the move should succeed
            const expectedState: MancalaState = new MancalaState([
                [0, 2, 2, 10, 2, 0],
                [3, 1, 0, 1, 0, 0],
            ], 11, PlayerNumberMap.of(15, 9));

            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, customConfig);
        });

    });

});
