/* eslint-disable max-lines-per-function */
import { RulesUtils } from 'src/app/jscaip/tests/RulesUtils.spec';
import { SquarzConfig, SquarzNode, SquarzRules } from '../SquarzRules';
import { SquarzState } from '../SquarzState';
import { SquarzMove } from '../SquarzMove';
import { Coord } from 'src/app/jscaip/Coord';
import { Player, PlayerOrNone } from 'src/app/jscaip/Player';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { SquarzFailure } from '../SquarzFailure';
import { MGPOptional } from '@everyboard/lib';

describe('SquarzRules', () => {

    const _: PlayerOrNone = PlayerOrNone.NONE;
    const O: PlayerOrNone = PlayerOrNone.ZERO;
    const X: PlayerOrNone = PlayerOrNone.ONE;

    let rules: SquarzRules;
    const defaultConfig: MGPOptional<SquarzConfig> = SquarzRules.get().getDefaultRulesConfig();

    beforeEach(() => {
        // This is the rules instance that we will test
        rules = SquarzRules.get();
    });

    it('should allow duplication move', () => {
        // Given any state
        const state: SquarzState = rules.getInitialState(defaultConfig);

        // When applying duplication move
        const move: SquarzMove = SquarzMove.from(new Coord(0, 0), new Coord(1, 1)).get();

        // Then the move should succeed
        const expectedState: SquarzState = new SquarzState([
            [O, _, _, _, _, _, _, X],
            [_, O, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _],
            [X, _, _, _, _, _, _, O],
        ], 1);
        RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
    });

    it('should allow jump move (linear)', () => {
        // Given any state with possible jumps
        const state: SquarzState = rules.getInitialState(defaultConfig);

        // When doing a jump
        const move: SquarzMove = SquarzMove.from(new Coord(0, 0), new Coord(2, 2)).get();

        // Then the move should succeed
        const expectedState: SquarzState = new SquarzState([
            [_, _, _, _, _, _, _, X],
            [_, _, _, _, _, _, _, _],
            [_, _, O, _, _, _, _, _],
            [_, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _],
            [X, _, _, _, _, _, _, O],
        ], 1);
        RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
    });

    it('should turn opponent into allies when landing near them', () => {
        // Given a board where opponent are close enough
        const state: SquarzState = new SquarzState([
            [O, _, _, _, _, _, _, X],
            [_, O, _, _, _, _, _, _],
            [_, _, O, _, _, _, _, _],
            [_, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _],
            [_, _, X, _, _, _, _, _],
            [_, X, _, _, _, _, _, _],
            [X, _, _, _, _, _, _, O],
        ], 4);

        // When jumping to them
        const move: SquarzMove = SquarzMove.from(new Coord(2, 2), new Coord(2, 4)).get();

        // Then the piece should have been switched
        const expectedState: SquarzState = new SquarzState([
            [O, _, _, _, _, _, _, X],
            [_, O, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _],
            [_, _, O, _, _, _, _, _],
            [_, _, O, _, _, _, _, _],
            [_, X, _, _, _, _, _, _],
            [X, _, _, _, _, _, _, O],
        ], 5);
        RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
    });

    it('should allow jump move (knight)', () => {
        // Given any state with possible jumps
        const state: SquarzState = rules.getInitialState(defaultConfig);

        // When doing a knight jump
        const move: SquarzMove = SquarzMove.from(new Coord(0, 0), new Coord(1, 2)).get();

        // Then the move should succeed
        const expectedState: SquarzState = new SquarzState([
            [_, _, _, _, _, _, _, X],
            [_, _, _, _, _, _, _, _],
            [_, O, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _],
            [X, _, _, _, _, _, _, O],
        ], 1);
        RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
    });

    it('should refuse moving opponent piece', () => {
        // Given any state
        const state: SquarzState = rules.getInitialState(defaultConfig);

        // When moving an opponent piece
        const move: SquarzMove = SquarzMove.from(new Coord(7, 0), new Coord(6, 0)).get();

        // Then the move should be illegal
        const reason: string = RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_OPPONENT();
        RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
    });

    it('should refuse moving empty space', () => {
        // Given any state
        const state: SquarzState = rules.getInitialState(defaultConfig);

        // When moving an opponent piece
        const move: SquarzMove = SquarzMove.from(new Coord(4, 4), new Coord(3, 3)).get();

        // Then the move should be illegal
        const reason: string = RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_EMPTY();
        RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
    });

    it('should refuse landing on occupied space', () => {
        // Given any state where piece has neigbhors
        const state: SquarzState = new SquarzState([
            [O, _, _, _, _, _, _, X],
            [_, O, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _],
            [_, X, _, _, _, _, _, _],
            [X, _, _, _, _, _, _, O],
        ], 2);

        // When trying to land on an occupied piece
        const move: SquarzMove = SquarzMove.from(new Coord(0, 0), new Coord(1, 1)).get();

        // Then the move should be illegal
        const reason: string = RulesFailure.MUST_LAND_ON_EMPTY_SPACE();
        RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
    });

    it('should refuse when making jump longer than 2', () => {
        // Given any state
        const state: SquarzState = rules.getInitialState(defaultConfig);

        // When trying to create a jump of 3
        const move: SquarzMove = SquarzMove.from(new Coord(0, 0), new Coord(3, 3)).get();

        // Then the move should be illegal
        const reason: string = SquarzFailure.MAX_DISTANCE_IS_N(2);
        RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
    });

    describe('gameStatus', () => {

        it('should give victory to player with the most pieces once board is full', () => {
            // Given a full board mostly owned by Player.ZERO
            const state: SquarzState = new SquarzState([
                [O, O, O, O, O, O, X, X],
                [O, O, O, O, O, O, X, X],
                [O, O, O, O, O, O, X, X],
                [O, O, O, O, O, O, X, X],
                [O, O, O, O, O, O, X, X],
                [O, O, O, O, O, O, X, X],
                [O, O, O, O, O, O, X, X],
                [O, O, O, O, O, O, X, X],
            ], 64);
            // Then victory should be granted to Player.ZERO
            const node: SquarzNode = new SquarzNode(state);
            RulesUtils.expectToBeVictoryFor(rules, node, Player.ZERO, defaultConfig);
        });

        it('should give victory to player with the most pieces once current player can no longer play', () => {
            // Given a board mostly owned by Player.ONE, and Player.ZERO cannot move
            const state: SquarzState = new SquarzState([
                [_, _, _, X, X, X, O, O],
                [_, _, _, X, X, X, O, O],
                [_, _, _, X, X, X, O, O],
                [_, _, _, X, X, X, O, O],
                [_, _, _, X, X, X, O, O],
                [_, _, _, X, X, X, O, O],
                [_, _, _, X, X, X, O, O],
                [_, _, _, X, X, X, O, O],
            ], 64);
            // Then victory should be granted to Player.ONE
            const node: SquarzNode = new SquarzNode(state);
            RulesUtils.expectToBeVictoryFor(rules, node, Player.ONE, defaultConfig);
        });

        it('should recognize a draw', () => {
            // Given a full board perfectly shared
            const state: SquarzState = new SquarzState([
                [O, O, O, O, X, X, X, X],
                [O, O, O, O, X, X, X, X],
                [O, O, O, O, X, X, X, X],
                [O, O, O, O, X, X, X, X],
                [O, O, O, O, X, X, X, X],
                [O, O, O, O, X, X, X, X],
                [O, O, O, O, X, X, X, X],
                [O, O, O, O, X, X, X, X],
            ], 64);
            // Then it should be a draw
            const node: SquarzNode = new SquarzNode(state);
            RulesUtils.expectToBeDraw(rules, node, defaultConfig);
        });

        it('should recognize ongoing board', () => {
            // Given state
            const state: SquarzState = new SquarzState([
                [X, X, X, X, X, X, X, X],
                [X, X, X, X, X, X, X, O],
                [O, O, O, O, O, O, O, O],
                [O, O, O, O, O, O, O, O],
                [O, O, X, X, O, X, O, O],
                [O, X, X, X, O, X, X, X],
                [O, X, O, X, X, X, _, X],
                [O, X, O, X, X, X, X, X],
            ], 100);
            const node: SquarzNode = new SquarzNode(state);

            // When evaluating if it's an ongoing game or not
            // Then yes, it is !
            RulesUtils.expectToBeOngoing(rules, node, defaultConfig);
        });

    });

    describe('other config', () => {

        it('should allow longer jumps when config allows it', () => {
            // Given any state and a different config
            const customConfig: MGPOptional<SquarzConfig> = MGPOptional.of({
                ...defaultConfig.get(),
                jumpSize: 3,
            });
            const state: SquarzState = rules.getInitialState(customConfig);

            // When trying to create a jump of 3
            const move: SquarzMove = SquarzMove.from(new Coord(0, 0), new Coord(3, 3)).get();

            // Then the move should succeed
            const expectedState: SquarzState = new SquarzState([
                [_, _, _, _, _, _, _, X],
                [_, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _],
                [_, _, _, O, _, _, _, _],
                [_, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _],
                [X, _, _, _, _, _, _, O],
            ], 1);
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, customConfig);
        });

    });

});
