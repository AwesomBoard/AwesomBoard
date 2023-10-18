/* eslint-disable max-lines-per-function */
import { Coord } from 'src/app/jscaip/Coord';
import { Orthogonal } from 'src/app/jscaip/Direction';
import { Player } from 'src/app/jscaip/Player';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { RulesUtils } from 'src/app/jscaip/tests/RulesUtils.spec';
import { Table } from 'src/app/utils/ArrayUtils';
import { MGPOptional } from 'src/app/utils/MGPOptional';
import { TaflFailure } from '../TaflFailure';
import { TaflPawn } from '../TaflPawn';
import { TaflState } from '../TaflState';
import { MyTaflMove } from './MyTaflMove.spec';
import { MyTaflNode, MyTaflRules } from './MyTaflRules.spec';
import { MyTaflState } from './MyTaflState.spec';

describe('TaflRules', () => {

    let rules: MyTaflRules;

    const _: TaflPawn = TaflPawn.UNOCCUPIED;
    const O: TaflPawn = TaflPawn.PLAYER_ZERO_PAWN;
    const X: TaflPawn = TaflPawn.PLAYER_ONE_PAWN;
    const A: TaflPawn = TaflPawn.PLAYER_ONE_KING;

    beforeEach(() => {
        rules = MyTaflRules.get();
    });

    describe('getSurroundings', () => {

        it('should return neighborings spaces', () => {
            const startingState: TaflState = rules.getInitialNode(MyTaflRules.DEFAULT_CONFIG).gameState;
            const { backCoord } =
                rules.getSurroundings(new Coord(3, 1), Orthogonal.RIGHT, Player.ZERO, startingState);
            expect(backCoord).toEqual(new Coord(4, 1));
        });

    });

    it('should be illegal to move an empty square', () => {
        // Given the initial board
        const state: MyTaflState = MyTaflState.getInitialState(MyTaflRules.DEFAULT_CONFIG);

        // When trying to move an empty square
        const move: MyTaflMove = MyTaflMove.from(new Coord(0, 1), new Coord(1, 1)).get();

        // Then the move should be illegal
        const reason: string = RulesFailure.MUST_CHOOSE_PLAYER_PIECE();
        RulesUtils.expectMoveFailure(rules, state, move, reason);
    });

    it('should be illegal to move an opponent pawn', () => {
        // Given the initial board
        const state: MyTaflState = MyTaflState.getInitialState(MyTaflRules.DEFAULT_CONFIG);

        // When trying to move an opponent pawn
        const move: MyTaflMove = MyTaflMove.from(new Coord(4, 2), new Coord(4, 3)).get();

        // Then the move should be deemed illegal
        const reason: string = RulesFailure.CANNOT_CHOOSE_OPPONENT_PIECE();
        RulesUtils.expectMoveFailure(rules, state, move, reason);
    });

    it('should be illegal to land on a pawn', () => {
        // Given the initial board
        const state: MyTaflState = MyTaflState.getInitialState(MyTaflRules.DEFAULT_CONFIG);

        // When doing a move landing on the opponent
        const move: MyTaflMove = MyTaflMove.from(new Coord(1, 0), new Coord(1, 3)).get();

        // Then the move should be illegal
        const reason: string = TaflFailure.LANDING_ON_OCCUPIED_SQUARE();
        RulesUtils.expectMoveFailure(rules, state, move, reason);
    });

    it('should be illegal to pass through a pawn', () => {
        // Given the initial board
        const state: MyTaflState = MyTaflState.getInitialState(MyTaflRules.DEFAULT_CONFIG);

        // When doing a move passing through a piece
        const move: MyTaflMove = MyTaflMove.from(new Coord(1, 0), new Coord(1, 4)).get();

        // Then the move should be illegal
        const reason: string = RulesFailure.SOMETHING_IN_THE_WAY();
        RulesUtils.expectMoveFailure(rules, state, move, reason);
    });

    it('should consider defender winner when all invaders are dead', () => {
        // Given a board where the last invader is about to be slaughter on an altar dedicated to Thor
        const board: Table<TaflPawn> = [
            [_, O, _, A, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, X, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
        ];
        const state: MyTaflState = new MyTaflState(board, 23, MyTaflRules.DEFAULT_CONFIG);

        // When sacrificing him
        const move: MyTaflMove = MyTaflMove.from(new Coord(3, 0), new Coord(2, 0)).get();

        // Then the move should be a success and the part a victory of Odin's Kin.
        const expectedBoard: Table<TaflPawn> = [
            [_, _, A, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, X, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
        ];
        const expectedState: MyTaflState = new MyTaflState(expectedBoard, 24, MyTaflRules.DEFAULT_CONFIG);
        const node: MyTaflNode = new MyTaflNode(expectedState, MGPOptional.empty(), MGPOptional.of(move));
        RulesUtils.expectMoveSuccess(rules, state, move, expectedState);
        RulesUtils.expectToBeVictoryFor(rules, node, Player.ONE);
    });

    it('should consider invader winner when all defender are immobilized', () => {
        // Given a board where the last invader is about to be slaughter on an altar dedicated to Thor
        const board: Table<TaflPawn> = [
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [O, _, _, _, _, _, _, _, _],
            [X, O, _, _, _, _, _, _, _],
            [A, _, _, _, _, _, _, _, O],
            [X, O, _, _, _, _, _, _, _],
            [O, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
        ];
        const state: MyTaflState = new MyTaflState(board, 24, MyTaflRules.DEFAULT_CONFIG);

        // When sacrificing him
        const move: MyTaflMove = MyTaflMove.from(new Coord(8, 4), new Coord(1, 4)).get();

        // Then the move should be a success and the part a victory of Odin's Kin.
        const expectedBoard: Table<TaflPawn> = [
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [O, _, _, _, _, _, _, _, _],
            [X, O, _, _, _, _, _, _, _],
            [A, O, _, _, _, _, _, _, _],
            [X, O, _, _, _, _, _, _, _],
            [O, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
        ];
        const expectedState: MyTaflState = new MyTaflState(expectedBoard, 25, MyTaflRules.DEFAULT_CONFIG);
        const node: MyTaflNode = new MyTaflNode(expectedState, MGPOptional.empty(), MGPOptional.of(move));
        RulesUtils.expectMoveSuccess(rules, state, move, expectedState);
        RulesUtils.expectToBeVictoryFor(rules, node, Player.ZERO);
    });

    describe('getInvader', () => {

        it('should return Player.ZERO when invader starts', () => {
            // Given a rules instance configured with a starting invader
            const rules: MyTaflRules = MyTaflRules.get();
            rules.config = {
                ...MyTaflRules.DEFAULT_CONFIG,
                invaderStarts: true,
            };

            // When calling getInvader
            const invader: Player = rules.getInvader();

            // Then the response should be Player.ZERO
            expect(invader).toEqual(Player.ZERO);
        });

        it(`should return Player.ONE when invader don't start`, () => {
            // Given a rules instance configured with a starting defender
            const rules: MyTaflRules = MyTaflRules.get();
            rules.config = {
                ...MyTaflRules.DEFAULT_CONFIG,
                invaderStarts: false,
            };

            // When calling getInvader
            const invader: Player = rules.getInvader();

            // Then the response should be Player.ONE
            expect(invader).toEqual(Player.ONE);
        });

    });

});
