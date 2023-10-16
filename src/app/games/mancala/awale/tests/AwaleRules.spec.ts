/* eslint-disable max-lines-per-function */
import { AwaleNode, AwaleRules } from '../AwaleRules';
import { AwaleMove } from '../AwaleMove';
import { MancalaState } from '../../common/MancalaState';
import { RulesUtils } from 'src/app/jscaip/tests/RulesUtils.spec';
import { Player } from 'src/app/jscaip/Player';
import { MancalaFailure } from '../../common/MancalaFailure';
import { MGPOptional } from 'src/app/utils/MGPOptional';
import { Table } from 'src/app/utils/ArrayUtils';
import { Rules } from 'src/app/jscaip/Rules';
import { DoMancalaRulesTests } from '../../common/GenericMancalaRulesTest.spec';
import { MancalaConfig } from '../../common/MancalaConfig';

describe('AwaleRules', () => {

    const rules: Rules<AwaleMove, MancalaState> = AwaleRules.get();

    describe('generic tests', () => {
        DoMancalaRulesTests({
            gameName: 'Awale',
            rules,
            simpleMove: AwaleMove.of(5),
        });
    });
    describe('distribution', () => {
        it('should not drop a piece in the starting space', () => {
            // Given a state where the player can perform a distributing move with at least 12 stones
            const board: Table<number> = [
                [0, 0, 0, 0, 0, 18],
                [0, 0, 0, 0, 0, 0],
            ];
            const state: MancalaState = new MancalaState(board, 1, [0, 0], AwaleRules.DEFAULT_CONFIG);
            // When performing a distribution
            const move: AwaleMove = AwaleMove.of(5);
            // Then the distribution should be performed as expected, and leave 0 stones in the starting space
            const expectedBoard: Table<number> = [
                [2, 1, 1, 1, 1, 0],
                [2, 2, 2, 2, 2, 2],
            ];
            const expectedState: MancalaState = new MancalaState(expectedBoard, 2, [0, 0], AwaleRules.DEFAULT_CONFIG);
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState);
        });
        it('should allow feeding move', () => {
            // Given a state where the player could and should feed its opponent
            const board: Table<number> = [
                [1, 0, 0, 0, 0, 1],
                [0, 0, 0, 0, 0, 0],
            ];
            const state: MancalaState = new MancalaState(board, 1, [23, 23], AwaleRules.DEFAULT_CONFIG);

            // When performing a move that feeds the opponent
            const move: AwaleMove = AwaleMove.of(5);
            const expectedBoard: Table<number> = [
                [1, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 1],
            ];
            const expectedState: MancalaState = new MancalaState(expectedBoard, 2, [23, 23], AwaleRules.DEFAULT_CONFIG);

            // Then the move should be legal
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState);
        });
    });
    describe('starvation and monsoon', () => {
        it('should forbid starving move', () => {
            // Given a state where the player could feed its opponent
            const board: Table<number> = [
                [1, 0, 0, 0, 0, 1],
                [0, 0, 0, 0, 0, 0],
            ];
            const state: MancalaState = new MancalaState(board, 1, [23, 23], AwaleRules.DEFAULT_CONFIG);

            // When performing a move that does not feed the opponent
            const move: AwaleMove = AwaleMove.of(0);

            // Then the move should be illegal
            const reason: string = MancalaFailure.SHOULD_DISTRIBUTE();
            RulesUtils.expectMoveFailure(rules, state, move, reason);
        });
        it('should not monsoon if next player will be able to feed current player', () => {
            // Given a state where next player is able to distribute
            const board: Table<number> = [
                [0, 0, 0, 0, 0, 1],
                [0, 2, 0, 0, 0, 0],
            ];
            const state: MancalaState = new MancalaState(board, 1, [0, 0], AwaleRules.DEFAULT_CONFIG);

            // When current player player give its last stone
            const move: AwaleMove = AwaleMove.of(5);

            // Then the move should be legal and no monsoon should be done
            const expectedBoard: Table<number> = [
                [0, 0, 0, 0, 0, 0],
                [0, 2, 0, 0, 0, 1],
            ];
            const expectedState: MancalaState = new MancalaState(expectedBoard, 2, [0, 0], AwaleRules.DEFAULT_CONFIG);
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState);
        });
        it('should monsoon if next player will not be able to feed current player', () => {
            // Given a state where next player is unable to feed current player
            const board: Table<number> = [
                [0, 0, 0, 0, 0, 1],
                [0, 1, 2, 3, 4, 4],
            ];
            const state: MancalaState = new MancalaState(board, 1, [10, 23], AwaleRules.DEFAULT_CONFIG);

            // When player give its last stone
            const move: AwaleMove = AwaleMove.of(5);

            // Then, since the other player can't distribute, all its pieces should be mansooned
            const expectedBoard: Table<number> = [
                [0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0],
            ];
            const expectedState: MancalaState = new MancalaState(expectedBoard, 2, [25, 23], AwaleRules.DEFAULT_CONFIG);
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState);
            const node: AwaleNode = new AwaleNode(expectedState, MGPOptional.empty(), MGPOptional.of(move));
            RulesUtils.expectToBeVictoryFor(rules, node, Player.ZERO);
        });
    });
    describe('captures', () => {
        it('should capture for player zero', () => {
            // Given a state where a capture is possible for player 0
            const board: Table<number> = [
                [1, 1, 0, 0, 0, 0],
                [1, 1, 0, 0, 0, 0],
            ];
            const state: MancalaState = new MancalaState(board, 2, [1, 2], AwaleRules.DEFAULT_CONFIG);

            // When performing a move that will capture
            const move: AwaleMove = AwaleMove.of(0);

            // Then the capture should be performed
            const expectedBoard: Table<number> = [
                [0, 1, 0, 0, 0, 0],
                [0, 1, 0, 0, 0, 0],
            ];
            const expectedState: MancalaState = new MancalaState(expectedBoard, 3, [3, 2], AwaleRules.DEFAULT_CONFIG);
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState);
        });
        it('should capture for player one', () => {
            // Given a state where a capture is possible for player 1
            const board: Table<number> = [
                [0, 0, 0, 0, 1, 1],
                [0, 0, 0, 0, 1, 2],
            ];
            const state: MancalaState = new MancalaState(board, 1, [1, 2], AwaleRules.DEFAULT_CONFIG);

            // When performing a move that will capture
            const move: AwaleMove = AwaleMove.of(5);

            // Then the capture should be performed
            const expectedBoard: Table<number> = [
                [0, 0, 0, 0, 1, 0],
                [0, 0, 0, 0, 1, 0],
            ];
            const expectedState: MancalaState = new MancalaState(expectedBoard, 2, [1, 5], AwaleRules.DEFAULT_CONFIG);
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState);
        });
        it('should do multiple capture when possible', () => {
            // Given a state where a multiple-capture is possible for player 0
            const board: Table<number> = [
                [1, 1, 0, 0, 0, 1],
                [2, 1, 0, 0, 0, 0],
            ];
            const state: MancalaState = new MancalaState(board, 2, [0, 0], AwaleRules.DEFAULT_CONFIG);

            // When performing a move that will capture
            const move: AwaleMove = AwaleMove.of(0);

            // Then the capture should be performed
            const expectedBoard: Table<number> = [
                [0, 0, 0, 0, 0, 1],
                [0, 1, 0, 0, 0, 0],
            ];
            const expectedState: MancalaState = new MancalaState(expectedBoard, 3, [4, 0], AwaleRules.DEFAULT_CONFIG);
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState);
        });
        it('should stop multiple capture when crossing uncapturable house', () => {
            // Given a state where a multiple-capture is possible for player 0 but interrupted
            const board: Table<number> = [
                [1, 3, 2, 1, 0, 0],
                [4, 1, 0, 0, 0, 0],
            ];
            const state: MancalaState = new MancalaState(board, 2, [0, 0], AwaleRules.DEFAULT_CONFIG);

            // When performing a move that will capture
            const move: AwaleMove = AwaleMove.of(0);

            // Then the capture should be performed
            const expectedBoard: Table<number> = [
                [2, 4, 0, 0, 0, 0],
                [0, 1, 0, 0, 0, 0],
            ];
            const expectedState: MancalaState = new MancalaState(expectedBoard, 3, [5, 0], AwaleRules.DEFAULT_CONFIG);
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState);
        });
        it('should distribute but not capture in case of would-starve move', () => {
            // Given a state in which the player could capture all opponents seeds
            const board: Table<number> = [
                [1, 0, 0, 0, 0, 2],
                [0, 0, 0, 0, 1, 1],
            ];
            const state: MancalaState = new MancalaState(board, 1, [0, 0], AwaleRules.DEFAULT_CONFIG);

            // When the player does a would-starve move
            const move: AwaleMove = AwaleMove.of(5);

            // Then, the distribution should be done but not the capture
            const expectedBoard: Table<number> = [
                [1, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 2, 2],
            ];
            const expectedState: MancalaState = new MancalaState(expectedBoard, 2, [0, 0], AwaleRules.DEFAULT_CONFIG);
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState);
        });
        it('should not capture in your own territory', () => {
            // Given a board where you would capture in your own territory
            const board: Table<number> = [
                [1, 1, 0, 0, 0, 0],
                [1, 1, 0, 0, 1, 1],
            ];
            const state: MancalaState = new MancalaState(board, 0, [0, 0], AwaleRules.DEFAULT_CONFIG);

            // When doing that move
            const move: AwaleMove = AwaleMove.of(5);

            // Then the distribution should be done but not the capture
            const expectedBoard: Table<number> = [
                [1, 1, 0, 0, 0, 0],
                [1, 1, 0, 0, 2, 0],
            ];
            const expectedState: MancalaState = new MancalaState(expectedBoard, 1, [0, 0], AwaleRules.DEFAULT_CONFIG);
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState);
        });
    });

    describe('Cross Config Rules', () => {

        it('should feed store when config requires to', () => {
            // Given a mancala state with a config with passByPlayerStore set to true
            const config: MancalaConfig = {
                ...AwaleRules.DEFAULT_CONFIG,
                passByPlayerStore: true,
            };
            const state: MancalaState = MancalaState.getInitialState(config);

            // When doing simple distribution from the leftest house
            const move: AwaleMove = AwaleMove.of(0);

            // Then the move should be legal and the store should contain one (so, the score)
            const expectedBoard: Table<number> = [
                [5, 5, 5, 4, 4, 4],
                [0, 4, 4, 4, 4, 4],
            ];
            const expectedState: MancalaState = new MancalaState(expectedBoard, 1, [1, 0], config);
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState);
        });

    });
});
