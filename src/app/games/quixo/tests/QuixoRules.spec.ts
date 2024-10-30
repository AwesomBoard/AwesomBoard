/* eslint-disable max-lines-per-function */
import { Orthogonal } from 'src/app/jscaip/Orthogonal';
import { Player, PlayerOrNone } from 'src/app/jscaip/Player';
import { QuixoConfig, QuixoState } from '../QuixoState';
import { QuixoMove } from '../QuixoMove';
import { QuixoNode, QuixoRules } from '../QuixoRules';
import { Coord } from 'src/app/jscaip/Coord';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { Table } from 'src/app/jscaip/TableUtils';
import { RulesUtils } from 'src/app/jscaip/tests/RulesUtils.spec';
import { MGPOptional, TestUtils } from '@everyboard/lib';
import { QuixoFailure } from '../QuixoFailure';
import { CoordSet } from 'src/app/jscaip/CoordSet';

describe('QuixoRules', () => {

    let rules: QuixoRules;
    const defaultConfig: MGPOptional<QuixoConfig> = QuixoRules.get().getDefaultRulesConfig();
    const _: PlayerOrNone = PlayerOrNone.NONE;
    const O: PlayerOrNone = PlayerOrNone.ZERO;
    const X: PlayerOrNone = PlayerOrNone.ONE;

    beforeEach(() => {
        rules = QuixoRules.get();
    });

    it('should forbid player to start a move with opponents piece', () => {
        const board: Table<PlayerOrNone> = [
            [_, _, _, _, _],
            [_, _, _, _, _],
            [_, _, _, _, X],
            [_, _, _, _, _],
            [_, _, _, _, _],
        ];
        const state: QuixoState = new QuixoState(board, 0);
        const move: QuixoMove = new QuixoMove(4, 2, Orthogonal.LEFT);

        // Then the move should be illegal
        const reason: string = RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_OPPONENT();
        RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
    });

    it('should forbid move creation from coord not on the side', () => {
        // Given a normal config board
        const state: QuixoState = QuixoRules.get().getInitialState(defaultConfig);

        // When doing a move inside the board
        const move: QuixoMove = new QuixoMove(1, 1, Orthogonal.UP);

        // Then the move should be illegal
        const reason: string = QuixoFailure.NO_INSIDE_CLICK();
        RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
    });

    it('should throw when suggesting move for out of range', () => {
        // Given an normal config board
        const state: QuixoState = QuixoRules.get().getInitialState(defaultConfig);

        // When doing a move out of range
        const move: QuixoMove = new QuixoMove(-1, 0, Orthogonal.DOWN);

        // Then it should throw
        TestUtils.expectToThrowAndLog(() => {
            const reason: string = `won't reach the return of isLegal`;
            RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
        }, 'Invalid coord for QuixoMove: (-1, 0) is outside the board.');
    });

    const moveByDirection: QuixoMove[] = [
        new QuixoMove(0, 2, Orthogonal.LEFT),
        new QuixoMove(4, 2, Orthogonal.RIGHT),
        new QuixoMove(2, 0, Orthogonal.UP),
        new QuixoMove(2, 4, Orthogonal.DOWN),
    ];
    const errorByDirection: string [] = [
        `Invalid direction: piece on the left side can't be moved to the left.`,
        `Invalid direction: piece on the right side can't be moved to the right.`,
        `Invalid direction: piece on the top side can't be moved up.`,
        `Invalid direction: piece on the bottom side can't be moved down.`,
    ];

    for (let i: number = 0; i < 4; i++) {
        it(`should throw when suggesting move with coord whose side is the same as the direction (${ i })`, () => {
            // Given any normal config board
            const state: QuixoState = QuixoRules.get().getInitialState(defaultConfig);

            // When providing a move where a piece try to leave the board
            const move: QuixoMove = moveByDirection[i];

            // Then it should throw
            const error: string = errorByDirection[i];
            TestUtils.expectToThrowAndLog(() => {
                const reason: string = `won't reach the return of isLegal`;
                RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
            }, error);
        });
    }

    it('should always put moved piece to currentPlayer symbol', () => {
        const board: Table<PlayerOrNone> = [
            [_, _, _, _, _],
            [_, _, _, _, _],
            [_, _, _, _, _],
            [_, _, _, _, _],
            [_, _, _, _, _],
        ];
        const expectedBoard: Table<PlayerOrNone> = [
            [_, _, _, _, _],
            [_, _, _, _, _],
            [_, _, _, _, O],
            [_, _, _, _, _],
            [_, _, _, _, _],
        ];
        const state: QuixoState = new QuixoState(board, 0);
        const move: QuixoMove = new QuixoMove(0, 2, Orthogonal.RIGHT);
        const expectedState: QuixoState = new QuixoState(expectedBoard, 1);
        RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
    });

    it('should declare winner player zero when he create a line of his symbol', () => {
        const board: Table<PlayerOrNone> = [
            [_, _, _, _, O],
            [_, _, _, _, O],
            [_, _, _, _, _],
            [_, _, _, _, O],
            [_, _, _, _, O],
        ];
        const expectedBoard: Table<PlayerOrNone> = [
            [_, _, _, _, O],
            [_, _, _, _, O],
            [_, _, _, _, O],
            [_, _, _, _, O],
            [_, _, _, _, O],
        ];
        const state: QuixoState = new QuixoState(board, 0);
        const move: QuixoMove = new QuixoMove(0, 2, Orthogonal.RIGHT);
        const expectedState: QuixoState = new QuixoState(expectedBoard, 1);
        RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
        const node: QuixoNode = new QuixoNode(expectedState, MGPOptional.empty(), MGPOptional.of(move));
        RulesUtils.expectToBeVictoryFor(rules, node, Player.ZERO, defaultConfig);
    });

    it('should declare winner player one when he create a line of his symbol', () => {
        const board: Table<PlayerOrNone> = [
            [_, _, _, _, X],
            [_, _, _, _, X],
            [_, _, _, _, _],
            [_, _, _, _, X],
            [_, _, _, _, X],
        ];
        const expectedBoard: Table<PlayerOrNone> = [
            [_, _, _, _, X],
            [_, _, _, _, X],
            [_, _, _, _, X],
            [_, _, _, _, X],
            [_, _, _, _, X],
        ];
        const state: QuixoState = new QuixoState(board, 1);
        const move: QuixoMove = new QuixoMove(0, 2, Orthogonal.RIGHT);
        const expectedState: QuixoState = new QuixoState(expectedBoard, 2);
        RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
        const node: QuixoNode = new QuixoNode(expectedState, MGPOptional.empty(), MGPOptional.of(move));
        RulesUtils.expectToBeVictoryFor(rules, node, Player.ONE, defaultConfig);
    });

    it('should declare loser player zero who create a line of his opponent symbol, even if creating a line of his symbol too', () => {
        const board: Table<PlayerOrNone> = [
            [X, _, _, _, O],
            [X, _, _, _, O],
            [_, X, _, _, _],
            [X, _, _, _, O],
            [X, _, _, _, O],
        ];
        const expectedBoard: Table<PlayerOrNone> = [
            [X, _, _, _, O],
            [X, _, _, _, O],
            [X, _, _, _, O],
            [X, _, _, _, O],
            [X, _, _, _, O],
        ];
        const state: QuixoState = new QuixoState(board, 0);
        const move: QuixoMove = new QuixoMove(0, 2, Orthogonal.RIGHT);
        const expectedState: QuixoState = new QuixoState(expectedBoard, 1);
        RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
        const node: QuixoNode = new QuixoNode(expectedState, MGPOptional.empty(), MGPOptional.of(move));
        RulesUtils.expectToBeVictoryFor(rules, node, Player.ONE, defaultConfig);
    });

    it('should declare loser player one who create a line of his opponent symbol, even if creating a line of his symbol too', () => {
        const board: Table<PlayerOrNone> = [
            [O, _, _, _, X],
            [O, _, _, _, X],
            [_, O, _, _, _],
            [O, _, _, _, X],
            [O, _, _, _, X],
        ];
        const expectedBoard: Table<PlayerOrNone> = [
            [O, _, _, _, X],
            [O, _, _, _, X],
            [O, _, _, _, X],
            [O, _, _, _, X],
            [O, _, _, _, X],
        ];
        const state: QuixoState = new QuixoState(board, 1);
        const move: QuixoMove = new QuixoMove(0, 2, Orthogonal.RIGHT);
        const expectedState: QuixoState = new QuixoState(expectedBoard, 2);
        RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
        const node: QuixoNode = new QuixoNode(expectedState, MGPOptional.empty(), MGPOptional.of(move));
        RulesUtils.expectToBeVictoryFor(rules, node, Player.ZERO, defaultConfig);
    });

    describe('getVictoriousCoords', () => {

        it('should return empty row when no victories', () => {
            // Given a board without victories
            const state: QuixoState = QuixoRules.get().getInitialState(defaultConfig);

            // When calling getVictoriousCoords
            const result: Coord[] = QuixoRules.getVictoriousCoords(state);

            // Then result should be empty
            expect(result).toEqual([]);
        });

        it('should return victorious column', () => {
            const board: Table<PlayerOrNone> = [
                [O, _, _, _, X],
                [O, _, _, _, X],
                [O, _, _, _, _],
                [O, _, _, _, X],
                [O, _, _, _, X],
            ];
            const state: QuixoState = new QuixoState(board, 1);
            expect(QuixoRules.getVictoriousCoords(state))
                .toEqual([new Coord(0, 0), new Coord(0, 1), new Coord(0, 2), new Coord(0, 3), new Coord(0, 4)]);
        });

        it('should return victorious row', () => {
            const board: Table<PlayerOrNone> = [
                [O, O, O, O, O],
                [_, _, _, _, X],
                [_, _, _, _, _],
                [_, _, _, _, X],
                [_, _, _, _, X],
            ];
            const state: QuixoState = new QuixoState(board, 1);
            expect(QuixoRules.getVictoriousCoords(state))
                .toEqual([new Coord(0, 0), new Coord(1, 0), new Coord(2, 0), new Coord(3, 0), new Coord(4, 0)]);
        });

        it('should return victorious first diagonal', () => {
            const board: Table<PlayerOrNone> = [
                [O, _, _, _, _],
                [_, O, _, _, _],
                [_, _, O, _, _],
                [_, _, _, O, _],
                [_, _, _, _, O],
            ];
            const state: QuixoState = new QuixoState(board, 1);
            expect(QuixoRules.getVictoriousCoords(state))
                .toEqual([new Coord(0, 0), new Coord(1, 1), new Coord(2, 2), new Coord(3, 3), new Coord(4, 4)]);
        });

        it('should return victorious second diagonal', () => {
            const board: Table<PlayerOrNone> = [
                [_, _, _, _, O],
                [_, _, _, O, _],
                [_, _, O, _, _],
                [_, O, _, _, _],
                [O, _, _, _, _],
            ];
            const state: QuixoState = new QuixoState(board, 1);
            const victoriousCoord: CoordSet = new CoordSet(QuixoRules.getVictoriousCoords(state));
            const expectedVictoriousCoord: CoordSet = new CoordSet([
                new Coord(0, 4),
                new Coord(1, 3),
                new Coord(2, 2),
                new Coord(3, 1),
                new Coord(4, 0),
            ]);
            expect(victoriousCoord.equals(expectedVictoriousCoord)).toBeTrue();
        });

        it('should return victorious diagonal when rectangular board', () => {
            // Given a rectangular board from a custom config
            const board: Table<PlayerOrNone> = [
                [_, _, O, _, _, _, _],
                [_, _, _, O, _, _, _],
                [_, _, _, _, O, _, _],
                [_, _, _, _, _, O, _],
                [_, _, _, _, _, _, O],
            ];
            const state: QuixoState = new QuixoState(board, 1);
            const victoriousCoord: CoordSet = new CoordSet(QuixoRules.getVictoriousCoords(state));
            const expectedVictoriousCoord: CoordSet = new CoordSet([
                new Coord(2, 0),
                new Coord(3, 1),
                new Coord(4, 2),
                new Coord(5, 3),
                new Coord(6, 4),
            ]);
            expect(victoriousCoord.equals(expectedVictoriousCoord)).toBeTrue();
        });

        it('should return victorious line from opponent, not yours, when creating two', () => {
            // Given a board with two victories
            const board: Table<PlayerOrNone> = [
                [_, X, O, _, _],
                [_, X, O, _, _],
                [_, X, O, _, _],
                [_, X, O, _, _],
                [_, X, O, _, _],
            ];
            const state: QuixoState = new QuixoState(board, 1);

            // When evaluating victorious coords
            const victoriousCoord: CoordSet = new CoordSet(QuixoRules.getVictoriousCoords(state));

            // Then it should be only the opponent coord
            const expectedVictoriousCoord: CoordSet = new CoordSet([
                new Coord(1, 0),
                new Coord(1, 1),
                new Coord(1, 2),
                new Coord(1, 3),
                new Coord(1, 4),
            ]);
            expect(victoriousCoord.equals(expectedVictoriousCoord)).toBeTrue();
        });

        it('should return victorious line when giving opponent victory', () => {
            // Given a board with opponent victory
            const board: Table<PlayerOrNone> = [
                [_, _, X, _, _],
                [_, _, X, _, _],
                [_, _, X, _, _],
                [_, _, X, _, _],
                [_, _, X, _, _],
            ];
            const state: QuixoState = new QuixoState(board, 1);

            // When evaluating victorious coords
            const victoriousCoord: CoordSet = new CoordSet(QuixoRules.getVictoriousCoords(state));

            // Then it should be only the opponent coord
            const expectedVictoriousCoord: CoordSet = new CoordSet([
                new Coord(2, 0),
                new Coord(2, 1),
                new Coord(2, 2),
                new Coord(2, 3),
                new Coord(2, 4),
            ]);
            expect(victoriousCoord.equals(expectedVictoriousCoord)).toBeTrue();
        });

    });

});
