/* eslint-disable max-lines-per-function */
import { Coord } from 'src/app/jscaip/Coord';
import { Orthogonal } from 'src/app/jscaip/Orthogonal';
import { Player } from 'src/app/jscaip/Player';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { RulesUtils } from 'src/app/jscaip/tests/RulesUtils.spec';
import { Table } from 'src/app/jscaip/TableUtils';
import { MGPOptional } from '@everyboard/lib';
import { TaflFailure } from '../TaflFailure';
import { TaflPawn } from '../TaflPawn';
import { TaflState } from '../TaflState';
import { MyTaflMove } from './MyTaflMove.spec';
import { MyTaflNode, MyTaflRules } from './MyTaflRules.spec';
import { TaflConfig } from '../TaflConfig';

export const myTaflConfig: TaflConfig = {

    canReturnInCastle: false,

    invaderStarts: true,

    kingFarFromHomeCanBeSandwiched: true,

    centralThroneCanSurroundKing: true,

    edgesAreKingsEnnemy: true,
};

describe('TaflRules', () => {

    let rules: MyTaflRules;
    const defaultConfig: MGPOptional<TaflConfig> = MyTaflRules.get().getDefaultRulesConfig();

    const _: TaflPawn = TaflPawn.UNOCCUPIED;
    const O: TaflPawn = TaflPawn.PLAYER_ZERO_PAWN;
    const X: TaflPawn = TaflPawn.PLAYER_ONE_PAWN;
    const A: TaflPawn = TaflPawn.PLAYER_ONE_KING;

    beforeEach(() => {
        rules = MyTaflRules.get();
    });

    describe('getSurroundings', () => {

        it('should return neighborings spaces', () => {
            const startingState: TaflState = rules.getInitialNode(defaultConfig).gameState;
            const { backCoord } =
                rules.getSurroundings(new Coord(3, 1), Orthogonal.RIGHT, Player.ZERO, startingState);
            expect(backCoord).toEqual(new Coord(4, 1));
        });

    });

    it('should be illegal to move an empty square', () => {
        // Given the initial board
        const state: TaflState = MyTaflRules.get().getInitialState(defaultConfig);

        // When trying to move an empty square
        const move: MyTaflMove = MyTaflMove.from(new Coord(0, 1), new Coord(1, 1)).get();

        // Then the move should be illegal
        const reason: string = RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_EMPTY();
        RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
    });

    it('should be illegal to move an opponent piece', () => {
        // Given the initial board
        const state: TaflState = MyTaflRules.get().getInitialState(defaultConfig);

        // When trying to move an opponent piece
        const move: MyTaflMove = MyTaflMove.from(new Coord(4, 2), new Coord(4, 3)).get();

        // Then the move should be illegal
        const reason: string = RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_OPPONENT();
        RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
    });

    it('should be illegal to land on a piece', () => {
        // Given the initial board
        const state: TaflState = MyTaflRules.get().getInitialState(defaultConfig);

        // When doing a move landing on the opponent
        const move: MyTaflMove = MyTaflMove.from(new Coord(1, 0), new Coord(1, 3)).get();

        // Then the move should be illegal
        const reason: string = TaflFailure.LANDING_ON_OCCUPIED_SQUARE();
        RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
    });

    it('should be illegal to pass through a piece', () => {
        // Given the initial board
        const state: TaflState = MyTaflRules.get().getInitialState(defaultConfig);

        // When doing a move passing through a piece
        const move: MyTaflMove = MyTaflMove.from(new Coord(1, 0), new Coord(1, 4)).get();

        // Then the move should be illegal
        const reason: string = RulesFailure.SOMETHING_IN_THE_WAY();
        RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
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
        const state: TaflState = new TaflState(board, 23);

        // When sacrificing him
        const move: MyTaflMove = MyTaflMove.from(new Coord(3, 0), new Coord(2, 0)).get();

        // Then the move should succeed and the part a victory of Odin's Kin.
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
        const expectedState: TaflState = new TaflState(expectedBoard, 24);
        const node: MyTaflNode =
            new MyTaflNode(expectedState, undefined, MGPOptional.of(move));
        RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
        RulesUtils.expectToBeVictoryFor(rules, node, Player.ONE, defaultConfig);
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
        const state: TaflState = new TaflState(board, 24);

        // When sacrificing him
        const move: MyTaflMove = MyTaflMove.from(new Coord(8, 4), new Coord(1, 4)).get();

        // Then the move should succeed and the part a victory of Odin's Kin.
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
        const expectedState: TaflState = new TaflState(expectedBoard, 25);
        const node: MyTaflNode =
            new MyTaflNode(expectedState, undefined, MGPOptional.of(move));
        RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
        RulesUtils.expectToBeVictoryFor(rules, node, Player.ZERO, defaultConfig);
    });

    describe('getInvader', () => {

        it('should return Player.ZERO when invader starts', () => {
            // Given a rules instance configured with a starting invader
            const customConfig: MGPOptional<TaflConfig> = MGPOptional.of({
                ...defaultConfig.get(),
                invaderStarts: true,
            });

            // When calling getInvader
            const invader: Player = rules.getInvader(customConfig.get());

            // Then the response should be Player.ZERO
            expect(invader).toEqual(Player.ZERO);
        });

        it(`should return Player.ONE when invader doesn't start`, () => {
            // Given a state instance configured with a starting defender
            const customConfig: MGPOptional<TaflConfig> = MGPOptional.of({
                ...defaultConfig.get(),
                invaderStarts: false,
            });

            // When calling getInvader
            const invader: Player = rules.getInvader(customConfig.get());

            // Then the response should be Player.ONE
            expect(invader).toEqual(Player.ONE);
        });

    });

    describe('getPossibleDestinations', () => {

        it('should have the right number of move for soldier', () => {
            // Given a board where a soldier has 16 destinations but 3 are thrones
            const board: Table<TaflPawn> = [
                [_, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, O],
                [_, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _],
            ];
            const state: TaflState = new TaflState(board, 24);

            // When calling getPossibleDestinations
            const possibleDestinations: Coord[] =
                rules.getPossibleDestinations(new Coord(8, 4), state, defaultConfig.get());

            // Then the result should have 13 coords
            expect(possibleDestinations.length).toBe(13);
        });

    });

});
