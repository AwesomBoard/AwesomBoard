/* eslint-disable max-lines-per-function */
import { MGPOptional, TestUtils } from '@everyboard/lib';

import { TeekoDropMove, TeekoMove, TeekoTranslationMove } from '../TeekoMove';
import { TeekoConfig, TeekoNode, TeekoRules } from '../TeekoRules';
import { TeekoState } from '../TeekoState';
import { Coord, CoordFailure } from 'src/app/jscaip/Coord';
import { RulesUtils } from 'src/app/jscaip/tests/RulesUtils.spec';
import { Player, PlayerOrNone } from 'src/app/jscaip/Player';
import { Table } from 'src/app/jscaip/TableUtils';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';

describe('TeekoRules', () => {

    const _: PlayerOrNone = PlayerOrNone.NONE;
    const O: PlayerOrNone = PlayerOrNone.ZERO;
    const X: PlayerOrNone = PlayerOrNone.ONE;

    let rules: TeekoRules;
    let defaultConfig: MGPOptional<TeekoConfig>;

    function translate(start: Coord, end: Coord): TeekoMove {
        return TeekoTranslationMove.from(start, end).get();
    }

    function drop(coord: Coord): TeekoMove {
        return TeekoDropMove.from(coord);
    }

    beforeEach(() => {
        rules = TeekoRules.get();
        defaultConfig = rules.getDefaultRulesConfig();
    });

    describe('dropping phase', () => {

        it('should fail when not in range', () => {
            // Given any state
            const state: TeekoState = rules.getInitialState();

            // When attempting a drop out of board
            const coord: Coord = new Coord(6, 6);
            const move: TeekoMove = drop(coord);

            // Then the move should be illegal
            const reason: string = CoordFailure.OUT_OF_RANGE(coord);
            RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
        });

        it('should fail if receiving translation in the 8 first turns', () => {
            // Given a board on the first phase
            const state: TeekoState = TeekoRules.get().getInitialState();

            // When doing a translation
            const move: TeekoMove = translate(new Coord(0, 0), new Coord(1, 1));

            // Then the move attempt should throw
            const reason: string = 'Cannot translate in dropping phase !';
            TestUtils.expectToThrowAndLog(() => {
                RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
            }, reason);
        });

        it('should refuse dropping on the opponent piece', () => {
            // Given a board with a piece, in dropping phase
            const board: Table<PlayerOrNone> = [
                [_, _, _, _, _],
                [_, _, _, _, _],
                [_, _, O, _, _],
                [_, _, _, X, _],
                [_, _, _, _, O],
            ];
            const state: TeekoState = new TeekoState(board, 3);

            // When dropping the piece on top of it
            const move: TeekoMove = drop(new Coord(2, 2));

            // Then the move should be illegal
            const reason: string = RulesFailure.MUST_LAND_ON_EMPTY_SPACE();
            RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
        });

        it('should allow simple drop', () => {
            // Given a board on the first phase
            const state: TeekoState = TeekoRules.get().getInitialState();

            // When dropping a piece
            const move: TeekoMove = drop(new Coord(2, 2));

            // Then the move should succeed
            const expectedBoard: Table<PlayerOrNone> = [
                [_, _, _, _, _],
                [_, _, _, _, _],
                [_, _, O, _, _],
                [_, _, _, _, _],
                [_, _, _, _, _],
            ];
            const expectedState: TeekoState = new TeekoState(expectedBoard, 1);
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
        });

        it('should notice horizontal victory', () => {
            // Given a board about to have 4 O in a line
            const board: Table<PlayerOrNone> = [
                [_, _, _, _, _],
                [_, _, _, _, _],
                [_, _, O, O, O],
                [_, _, X, X, X],
                [_, _, _, _, _],
            ];
            const state: TeekoState = new TeekoState(board, 6);

            // When dropping the fourth O in alignment with the 3 others
            const move: TeekoMove = drop(new Coord(1, 2));

            // Then the move should succeed and marked as victory
            const expectedBoard: Table<PlayerOrNone> = [
                [_, _, _, _, _],
                [_, _, _, _, _],
                [_, O, O, O, O],
                [_, _, X, X, X],
                [_, _, _, _, _],
            ];
            const expectedState: TeekoState = new TeekoState(expectedBoard, 7);
            const node: TeekoNode = new TeekoNode(expectedState);
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
            RulesUtils.expectToBeVictoryFor(rules, node, Player.ZERO, defaultConfig);
        });

        it('should notice diagonal victory', () => {
            // Given a board about to have 4 O in a line
            const board: Table<PlayerOrNone> = [
                [O, _, _, _, _],
                [X, O, _, _, _],
                [_, X, O, _, _],
                [_, _, X, _, _],
                [_, _, _, _, _],
            ];
            const state: TeekoState = new TeekoState(board, 6);

            // When dropping the fourth O in alignment with the 3 others
            const move: TeekoMove = drop(new Coord(3, 3));

            // Then the move should succeed and marked as victory
            const expectedBoard: Table<PlayerOrNone> = [
                [O, _, _, _, _],
                [X, O, _, _, _],
                [_, X, O, _, _],
                [_, _, X, O, _],
                [_, _, _, _, _],
            ];
            const expectedState: TeekoState = new TeekoState(expectedBoard, 7);
            const node: TeekoNode = new TeekoNode(expectedState);
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
            RulesUtils.expectToBeVictoryFor(rules, node, Player.ZERO, defaultConfig);
        });

        it('should notice vertical victory', () => {
            // Given a board about to have 4 O in a line
            const board: Table<PlayerOrNone> = [
                [_, _, O, X, _],
                [_, _, O, X, _],
                [_, _, O, X, _],
                [_, _, _, _, _],
                [_, _, _, _, _],
            ];
            const state: TeekoState = new TeekoState(board, 6);

            // When dropping the fourth O in alignment with the 3 others
            const move: TeekoMove = drop(new Coord(2, 3));

            // Then the move should succeed and marked as victory
            const expectedBoard: Table<PlayerOrNone> = [
                [_, _, O, X, _],
                [_, _, O, X, _],
                [_, _, O, X, _],
                [_, _, O, _, _],
                [_, _, _, _, _],
            ];
            const expectedState: TeekoState = new TeekoState(expectedBoard, 7);
            const node: TeekoNode = new TeekoNode(expectedState);
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
            RulesUtils.expectToBeVictoryFor(rules, node, Player.ZERO, defaultConfig);
        });

        it('should notice square victory', () => {
            // Given a board about to have 4 O in a square
            const board: Table<PlayerOrNone> = [
                [O, _, _, _, _],
                [O, O, _, _, _],
                [X, X, _, _, _],
                [X, _, _, _, _],
                [_, _, _, _, _],
            ];
            const state: TeekoState = new TeekoState(board, 6);

            // When dropping the fourth O forming a square with the 3 others
            const move: TeekoMove = drop(new Coord(1, 0));

            // Then the move should succeed and marked as victory
            const expectedBoard: Table<PlayerOrNone> = [
                [O, O, _, _, _],
                [O, O, _, _, _],
                [X, X, _, _, _],
                [X, _, _, _, _],
                [_, _, _, _, _],
            ];
            const expectedState: TeekoState = new TeekoState(expectedBoard, 7);
            const node: TeekoNode = new TeekoNode(expectedState, undefined, MGPOptional.of(move));
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
            RulesUtils.expectToBeVictoryFor(rules, node, Player.ZERO, defaultConfig);
        });

    });

    describe('translation phase', () => {

        it('should refuse drop after 8 turns', () => {
            // Given a board on the second phase
            const board: Table<PlayerOrNone> = [
                [O, X, _, _, _],
                [O, O, _, _, _],
                [X, X, _, _, _],
                [X, O, _, _, _],
                [_, _, _, _, _],
            ];
            const state: TeekoState = new TeekoState(board, 8);

            // When doing a drop
            const move: TeekoMove = drop(new Coord(4, 4));

            // Then the move attempt should throw
            const reason: string = 'Cannot drop in translation phase !';
            TestUtils.expectToThrowAndLog(() => {
                RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
            }, reason);
        });

        it('should refuse moving from outside the board', () => {
            // Given a board in second phase
            const board: Table<PlayerOrNone> = [
                [O, X, _, _, _],
                [O, O, _, _, _],
                [X, X, _, _, _],
                [X, O, _, _, _],
                [_, _, _, _, _],
            ];
            const state: TeekoState = new TeekoState(board, 8);

            // When doing translation starting out of the board
            const outOfBoard: Coord = new Coord(10, 10);
            const move: TeekoMove = translate(outOfBoard, new Coord(3, 3));

            // Then the move should be illegal
            const reason: string = CoordFailure.OUT_OF_RANGE(outOfBoard);
            RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
        });

        it('should refuse moving outside the board', () => {
            // Given a board in second phase
            const board: Table<PlayerOrNone> = [
                [O, X, _, _, _],
                [O, O, _, _, _],
                [X, X, _, _, _],
                [X, O, _, _, _],
                [_, _, _, _, _],
            ];
            const state: TeekoState = new TeekoState(board, 8);

            // When doing translation ending out of the board
            const outOfBoard: Coord = new Coord(-1, -1);
            const move: TeekoMove = translate(new Coord(0, 0), outOfBoard);

            // Then the move should be illegal
            const reason: string = CoordFailure.OUT_OF_RANGE(outOfBoard);
            RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
        });

        it('should refuse moving from an empty space', () => {
            // Given a board in second phase
            const board: Table<PlayerOrNone> = [
                [O, X, _, _, _],
                [O, O, _, _, _],
                [X, X, _, _, _],
                [X, O, _, _, _],
                [_, _, _, _, _],
            ];
            const state: TeekoState = new TeekoState(board, 8);

            // When doing translation with empty starting coord
            const move: TeekoMove = translate(new Coord(2, 2), new Coord(3, 3));

            // Then the move should be illegal
            const reason: string = RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_EMPTY();
            RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
        });

        it('should refuse moving opponent piece', () => {
            // Given a board in second phase
            const board: Table<PlayerOrNone> = [
                [O, X, _, _, _],
                [O, O, _, _, _],
                [X, X, _, _, _],
                [X, O, _, _, _],
                [_, _, _, _, _],
            ];
            const state: TeekoState = new TeekoState(board, 8);

            // When translating opponent piece
            const move: TeekoMove = translate(new Coord(0, 3), new Coord(2, 2));

            // Then the move should be illegal
            const reason: string = RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_OPPONENT();
            RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
        });

        it('should refuse dropping on occupied space', () => {
            // Given a board in second phase
            const board: Table<PlayerOrNone> = [
                [O, X, _, _, _],
                [O, O, _, _, _],
                [X, X, _, _, _],
                [X, O, _, _, _],
                [_, _, _, _, _],
            ];
            const state: TeekoState = new TeekoState(board, 8);

            // When translating a piece on occupied place
            const move: TeekoMove = translate(new Coord(0, 0), new Coord(1, 1));

            // Then the move should be illegal
            const reason: string = RulesFailure.MUST_LAND_ON_EMPTY_SPACE();
            RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
        });

        it('should allow legal translation to neighbor', () => {
            // Given a board in second phase
            const board: Table<PlayerOrNone> = [
                [O, X, _, _, _],
                [O, O, _, _, _],
                [X, X, _, _, _],
                [X, O, _, _, _],
                [_, _, _, _, _],
            ];
            const state: TeekoState = new TeekoState(board, 8);

            // When doing legal translation
            const move: TeekoMove = translate(new Coord(1, 1), new Coord(2, 1));

            // Then the move should succeed
            const expectedBoard: Table<PlayerOrNone> = [
                [O, X, _, _, _],
                [O, _, O, _, _],
                [X, X, _, _, _],
                [X, O, _, _, _],
                [_, _, _, _, _],
            ];
            const expectedState: TeekoState = new TeekoState(expectedBoard, 9);
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
        });

        it('should forbid teleportation by default', () => {
            // Given a board in second phase
            const board: Table<PlayerOrNone> = [
                [O, X, _, _, _],
                [O, O, _, _, _],
                [X, X, _, _, _],
                [X, O, _, _, _],
                [_, _, _, _, _],
            ];
            const state: TeekoState = new TeekoState(board, 8);

            // When doing a teleportation
            const move: TeekoMove = translate(new Coord(0, 0), new Coord(2, 1));

            // Then the move should be illegal
            const reason: string = RulesFailure.MUST_MOVE_ON_NEIGHBOR();
            RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
        });

        it('should allow teleportation when explicitly enabled', () => {
            // Given a board in second phase, with teleportation enabled
            const board: Table<PlayerOrNone> = [
                [O, X, _, _, _],
                [O, O, _, _, _],
                [X, X, _, _, _],
                [X, O, _, _, _],
                [_, _, _, _, _],
            ];
            const state: TeekoState = new TeekoState(board, 8);
            const customConfig: MGPOptional<TeekoConfig> = MGPOptional.of({
                teleport: true,
            });

            // When doing a teleportation
            const move: TeekoMove = translate(new Coord(0, 0), new Coord(2, 1));

            // Then the move should succeed
            const expectedBoard: Table<PlayerOrNone> = [
                [_, X, _, _, _],
                [O, O, O, _, _],
                [X, X, _, _, _],
                [X, O, _, _, _],
                [_, _, _, _, _],
            ];
            const expectedState: TeekoState = new TeekoState(expectedBoard, 9);
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, customConfig);
        });

        it('should notice horizontal victory', () => {
            // Given a board with 4 O in a line
            const board: Table<PlayerOrNone> = [
                [_, _, _, _, _],
                [_, _, _, _, X],
                [_, O, O, O, O],
                [_, _, X, X, X],
                [_, _, _, X, O],
            ];
            const state: TeekoState = new TeekoState(board, 9);
            const node: TeekoNode = new TeekoNode(state);

            // When checking game status
            // Then it should be a victory
            RulesUtils.expectToBeVictoryFor(rules, node, Player.ZERO, defaultConfig);
        });

        it('should notice diagonal victory', () => {
            // Given a board with 4 O in a line
            const board: Table<PlayerOrNone> = [
                [O, _, _, _, X],
                [X, O, _, _, _],
                [_, X, O, _, _],
                [_, _, X, O, _],
                [_, _, _, _, _],
            ];
            const state: TeekoState = new TeekoState(board, 9);
            const node: TeekoNode = new TeekoNode(state);

            // When checking game status
            // Then it should be a victory
            RulesUtils.expectToBeVictoryFor(rules, node, Player.ZERO, defaultConfig);
        });

        it('should notice vertical victory', () => {
            // Given a board with 4 O in a line
            const board: Table<PlayerOrNone> = [
                [O, X, _, _, _],
                [O, X, _, _, _],
                [O, X, _, _, _],
                [O, _, X, _, _],
                [_, _, _, _, _],
            ];
            const state: TeekoState = new TeekoState(board, 9);
            const node: TeekoNode = new TeekoNode(state);

            // When checking game status
            // Then it should be a victory
            RulesUtils.expectToBeVictoryFor(rules, node, Player.ZERO, defaultConfig);
        });

        it('should notice square victory', () => {
            // Given a board with 4 O in a square
            const board: Table<PlayerOrNone> = [
                [_, _, _, _, _],
                [_, _, X, X, O],
                [_, _, X, X, _],
                [_, _, O, O, O],
                [_, _, _, O, X],
            ];
            const state: TeekoState = new TeekoState(board, 10);
            const node: TeekoNode = new TeekoNode(state);

            // When checking game status
            // Then it should be a victory
            RulesUtils.expectToBeVictoryFor(rules, node, Player.ONE, defaultConfig);
        });

    });

});
