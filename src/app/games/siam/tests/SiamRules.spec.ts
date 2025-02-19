/* eslint-disable max-lines-per-function */
import { SiamConfig, SiamNode, SiamRules } from '../SiamRules';
import { SiamMove } from '../SiamMove';
import { SiamPiece } from '../SiamPiece';
import { SiamState } from '../SiamState';
import { Orthogonal } from 'src/app/jscaip/Orthogonal';
import { MGPOptional } from '@everyboard/lib';
import { Player, PlayerOrNone } from 'src/app/jscaip/Player';
import { SiamFailure } from '../SiamFailure';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { Table } from 'src/app/jscaip/TableUtils';
import { RulesUtils } from 'src/app/jscaip/tests/RulesUtils.spec';
import { Coord } from 'src/app/jscaip/Coord';

describe('SiamRules', () => {

    let rules: SiamRules = SiamRules.get();

    const _: SiamPiece = SiamPiece.EMPTY;
    const M: SiamPiece = SiamPiece.MOUNTAIN;

    const U: SiamPiece = SiamPiece.LIGHT_UP;
    const L: SiamPiece = SiamPiece.LIGHT_LEFT;
    const R: SiamPiece = SiamPiece.LIGHT_RIGHT;
    const D: SiamPiece = SiamPiece.LIGHT_DOWN;

    const u: SiamPiece = SiamPiece.DARK_UP;
    const l: SiamPiece = SiamPiece.DARK_LEFT;
    const r: SiamPiece = SiamPiece.DARK_RIGHT;
    const d: SiamPiece = SiamPiece.DARK_DOWN;

    const defaultConfig: MGPOptional<SiamConfig> = SiamRules.get().getDefaultRulesConfig();

    beforeEach(() => {
        rules = SiamRules.get();
    });

    describe('out of board moves', () => {

        it('should ensure move ends inside the board', () => {
            // Given any board
            const state: SiamState = SiamRules.get().getInitialState(defaultConfig);

            // When attempting out of board move
            const move: SiamMove = SiamMove.of(-1, 2, MGPOptional.of(Orthogonal.UP), Orthogonal.UP);

            // Then the move should be illegal
            const reason: string = 'SiamMove should end or start on the board: SiamMove(-1, 2, UP, UP)';
            RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
        });

        it('should forbid rotation outside the board', () => {
            // Given any board
            const state: SiamState = SiamRules.get().getInitialState(defaultConfig);

            // When attempting out of board move
            const move: SiamMove = SiamMove.of(-1, 2, MGPOptional.empty(), Orthogonal.UP);

            // Then the move should be illegal
            const reason: string = 'You cannot rotate piece outside the board: SiamMove(-1, 2, -, UP)';
            RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
        });

        it('should forbid invalid SiamMove creation', () => {
            // Given any board
            const state: SiamState = SiamRules.get().getInitialState(defaultConfig);

            // When attempting out of board move
            const move: SiamMove = SiamMove.of(0, 0, MGPOptional.of(Orthogonal.UP), Orthogonal.DOWN);

            // Then the move should be illegal
            const reason: string = 'SiamMove should have moveDirection and landingOrientation matching when a piece goes out of the board: SiamMove(0, 0, UP, DOWN)';
            RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
        });

    });

    it('should allow insertions', () => {
        // Given the initial board
        const state: SiamState = SiamRules.get().getInitialState(defaultConfig);
        // When performing an insertion
        const move: SiamMove = SiamMove.of(-1, 4, MGPOptional.of(Orthogonal.RIGHT), Orthogonal.RIGHT);
        // Then it should succeed
        const expectedBoard: Table<SiamPiece> = [
            [_, _, _, _, _],
            [_, _, _, _, _],
            [_, M, M, M, _],
            [_, _, _, _, _],
            [r, _, _, _, _],
        ];
        const expectedState: SiamState = new SiamState(expectedBoard, 1);
        RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
    });

    it('should allow moving a piece forward', () => {
        // Given a state with a piece already on the board
        const board: Table<SiamPiece> = [
            [_, _, _, _, _],
            [_, _, _, _, _],
            [_, M, M, M, _],
            [_, _, _, _, _],
            [_, _, u, _, _],
        ];
        const state: SiamState = new SiamState(board, 0);
        // When moving a piece forward
        const move: SiamMove = SiamMove.of(2, 4, MGPOptional.of(Orthogonal.UP), Orthogonal.UP);
        // Then it should succeed
        const expectedBoard: Table<SiamPiece> = [
            [_, _, _, _, _],
            [_, _, _, _, _],
            [_, M, M, M, _],
            [_, _, u, _, _],
            [_, _, _, _, _],
        ];
        const expectedState: SiamState = new SiamState(expectedBoard, 1);
        RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
    });

    it('should forbid moving pieces of the opponent', () => {
        // Given a state with a piece already on the board
        const board: Table<SiamPiece> = [
            [_, _, _, _, _],
            [_, _, _, _, _],
            [_, M, M, M, _],
            [_, _, _, _, _],
            [_, _, U, _, _],
        ];
        const state: SiamState = new SiamState(board, 0);

        // When trying to move a piece of the opponent
        const move: SiamMove = SiamMove.of(2, 4, MGPOptional.of(Orthogonal.UP), Orthogonal.UP);

        // Then the move should be illegal
        const reason: string = RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_OPPONENT();
        RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
    });

    it('should forbid moving the empty piece', () => {
        // Given a state
        const state: SiamState = SiamRules.get().getInitialState(defaultConfig);

        // When trying to move an empty piece
        const move: SiamMove = SiamMove.of(2, 4, MGPOptional.of(Orthogonal.UP), Orthogonal.UP);

        // Then the move should be illegal
        const reason: string = RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_EMPTY();
        RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
    });

    it('should allow pushing', () => {
        // Given a board with pieces next to each other
        const board: Table<SiamPiece> = [
            [_, _, _, _, _],
            [_, _, _, _, _],
            [_, M, M, M, _],
            [R, _, _, _, _],
            [u, _, _, _, _],
        ];
        const state: SiamState = new SiamState(board, 0);
        // When pushing the opponent's piece with the player's piece
        const move: SiamMove = SiamMove.of(0, 4, MGPOptional.of(Orthogonal.UP), Orthogonal.UP);
        // Then it should succeed
        const expectedBoard: Table<SiamPiece> = [
            [_, _, _, _, _],
            [_, _, _, _, _],
            [R, M, M, M, _],
            [u, _, _, _, _],
            [_, _, _, _, _],
        ];
        const expectedState: SiamState = new SiamState(expectedBoard, 1);
        RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
    });

    it('should allow rotating a piece', () => {
        // Given a board with a piece
        const board: Table<SiamPiece> = [
            [_, _, _, _, _],
            [_, _, _, _, _],
            [_, M, M, M, _],
            [_, _, _, _, _],
            [u, _, _, _, _],
        ];
        const state: SiamState = new SiamState(board, 0);
        // When performing a rotation
        const move: SiamMove = SiamMove.of(0, 4, MGPOptional.empty(), Orthogonal.RIGHT);
        // Then it should succeed
        const expectedBoard: Table<SiamPiece> = [
            [_, _, _, _, _],
            [_, _, _, _, _],
            [_, M, M, M, _],
            [_, _, _, _, _],
            [r, _, _, _, _],
        ];
        const expectedState: SiamState = new SiamState(expectedBoard, 1);
        RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
    });

    it('should allow rotating a piece by half a turn', () => {
        // Given a board with a piece
        const board: Table<SiamPiece> = [
            [_, _, _, _, _],
            [_, _, _, _, _],
            [_, M, M, M, _],
            [_, _, _, _, _],
            [u, _, _, _, _],
        ];
        const state: SiamState = new SiamState(board, 0);
        // When performing a half-turn rotation
        const move: SiamMove = SiamMove.of(0, 4, MGPOptional.empty(), Orthogonal.DOWN);
        // Then it should succeed
        const expectedBoard: Table<SiamPiece> = [
            [_, _, _, _, _],
            [_, _, _, _, _],
            [_, M, M, M, _],
            [_, _, _, _, _],
            [d, _, _, _, _],
        ];
        const expectedState: SiamState = new SiamState(expectedBoard, 1);
        RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
    });

    it('should allow rotating and moving forward', () => {
        // Given a board with a piece
        const board: Table<SiamPiece> = [
            [_, _, _, _, _],
            [_, _, _, _, _],
            [_, M, M, M, _],
            [_, _, _, _, _],
            [u, _, _, _, _],
        ];
        const state: SiamState = new SiamState(board, 0);
        // When rotating the piece and moving it forward at the same time
        const move: SiamMove = SiamMove.of(0, 4, MGPOptional.of(Orthogonal.UP), Orthogonal.DOWN);
        // Then it should succeed
        const expectedBoard: Table<SiamPiece> = [
            [_, _, _, _, _],
            [_, _, _, _, _],
            [_, M, M, M, _],
            [d, _, _, _, _],
            [_, _, _, _, _],
        ];
        const expectedState: SiamState = new SiamState(expectedBoard, 1);
        RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
    });

    it('should forbid staying in the same orientation through a fake rotation', () => {
        // Given a board with a player piece
        const board: Table<SiamPiece> = [
            [_, _, _, _, _],
            [_, _, _, _, _],
            [_, M, M, M, _],
            [_, _, _, _, _],
            [_, _, u, _, _],
        ];
        const state: SiamState = new SiamState(board, 0);

        // When trying to perform a rotation that does not change the orientation
        const move: SiamMove = SiamMove.of(2, 4, MGPOptional.empty(), Orthogonal.UP);

        // Then the move should be illegal
        const reason: string = SiamFailure.MUST_MOVE_OR_ROTATE();
        RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
    });

    it('should allow moving in a direction different from the orientation of the piece', () => {
        // Given a board with a piece
        const board: Table<SiamPiece> = [
            [_, _, _, _, _],
            [_, _, _, _, _],
            [_, M, M, M, _],
            [_, _, _, _, _],
            [u, _, _, _, _],
        ];
        const state: SiamState = new SiamState(board, 0);

        // When moving the piece in a different direction than its orientation
        const move: SiamMove = SiamMove.of(0, 4, MGPOptional.of(Orthogonal.RIGHT), Orthogonal.LEFT);
        // Then it should succeed
        const expectedBoard: Table<SiamPiece> = [
            [_, _, _, _, _],
            [_, _, _, _, _],
            [_, M, M, M, _],
            [_, _, _, _, _],
            [_, l, _, _, _],
        ];
        const expectedState: SiamState = new SiamState(expectedBoard, 1);
        RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
    });

    it('should forbid pushing one against one', () => {
        // Given a board with head-to-head pieces
        const board: Table<SiamPiece> = [
            [_, _, _, _, _],
            [_, _, _, _, _],
            [_, M, M, M, _],
            [D, _, _, _, _],
            [u, _, _, _, _],
        ];
        const state: SiamState = new SiamState(board, 0);

        // When trying to push the other piece
        const move: SiamMove = SiamMove.of(0, 4, MGPOptional.of(Orthogonal.UP), Orthogonal.UP);

        // Then the move should be illegal
        const reason: string = SiamFailure.NOT_ENOUGH_FORCE_TO_PUSH();
        RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
    });

    it('should forbid pushing one against one, next to a border', () => {
        // Given a board with head-to-head pieces, with one next to the border
        const board: Table<SiamPiece> = [
            [_, _, _, _, _],
            [_, _, _, _, _],
            [_, M, M, M, _],
            [d, _, _, _, _],
            [U, _, _, _, _],
        ];
        const state: SiamState = new SiamState(board, 0);

        // When trying to push the other piece over the border
        const move: SiamMove = SiamMove.of(0, 3, MGPOptional.of(Orthogonal.DOWN), Orthogonal.DOWN);

        // Then the move should be illegal
        const reason: string = SiamFailure.NOT_ENOUGH_FORCE_TO_PUSH();
        RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
    });

    it('should allow to push two against one', () => {
        // Given a board with two pieces against one
        const board: Table<SiamPiece> = [
            [_, _, _, _, _],
            [_, _, _, _, _],
            [D, M, M, M, _],
            [u, _, _, _, _],
            [u, _, _, _, _],
        ];
        const state: SiamState = new SiamState(board, 0);
        // When pushing the one piece
        const move: SiamMove = SiamMove.of(0, 4, MGPOptional.of(Orthogonal.UP), Orthogonal.UP);
        // Then it should succeed
        const expectedBoard: Table<SiamPiece> = [
            [_, _, _, _, _],
            [D, _, _, _, _],
            [u, M, M, M, _],
            [u, _, _, _, _],
            [_, _, _, _, _],
        ];
        const expectedState: SiamState = new SiamState(expectedBoard, 1);
        RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
    });

    it('should forbid to push two against one in case of sandwich', () => {
        // Given a board with two pieces against one, where the one is sandwiched between the other pieces
        const board: Table<SiamPiece> = [
            [_, _, _, _, _],
            [_, _, _, _, _],
            [u, M, M, M, _],
            [D, _, _, _, _],
            [u, _, _, _, _],
        ];
        const state: SiamState = new SiamState(board, 0);

        // When tryig to push the one piece
        const move: SiamMove = SiamMove.of(0, 4, MGPOptional.of(Orthogonal.UP), Orthogonal.UP);

        // Then the move should be illegal
        const reason: string = SiamFailure.NOT_ENOUGH_FORCE_TO_PUSH();
        RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
    });

    it('should forbid to push while changing direction', () => {
        // Given a board with two pieces head-to-head
        const board: Table<SiamPiece> = [
            [_, _, _, _, _],
            [_, _, _, _, _],
            [_, M, M, M, _],
            [L, _, _, _, _],
            [u, _, _, _, _],
        ];
        const state: SiamState = new SiamState(board, 0);

        // When trying to push and change direction at the same time
        const move: SiamMove = SiamMove.of(0, 4, MGPOptional.of(Orthogonal.UP), Orthogonal.LEFT);

        // Then the move should be illegal
        const reason: string = SiamFailure.ILLEGAL_PUSH();
        RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
    });

    it('should be forbidden to insert a sixth peice', () => {
        // Given a board with 5 pieces of the player
        const board: Table<SiamPiece> = [
            [_, _, _, _, _],
            [_, _, _, _, _],
            [_, M, M, M, _],
            [_, _, _, _, _],
            [u, u, u, u, u],
        ];
        const state: SiamState = new SiamState(board, 0);

        // When trying to insert a 6th piece
        const move: SiamMove = SiamMove.of(0, -1, MGPOptional.of(Orthogonal.DOWN), Orthogonal.DOWN);

        // Then the move should be illegal
        const reason: string = SiamFailure.NO_REMAINING_PIECE_TO_INSERT();
        RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
    });

    it('should be forbidden to push several mountains with a single piece', () => {
        // Given a board with a piece next to aligned mountains
        const board: Table<SiamPiece> = [
            [_, _, _, _, _],
            [_, _, _, _, _],
            [r, M, M, _, _],
            [_, _, _, M, _],
            [_, _, _, _, _],
        ];
        const state: SiamState = new SiamState(board, 0);

        // When trying to push more than one mountain
        const move: SiamMove = SiamMove.of(0, 2, MGPOptional.of(Orthogonal.RIGHT), Orthogonal.RIGHT);

        // Then the move should be illegal
        const reason: string = SiamFailure.NOT_ENOUGH_FORCE_TO_PUSH();
        RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
    });

    it('should be allowed to push two montains with two pushers', () => {
        // Given a board with two pushers next to the mountains
        const board: Table<SiamPiece> = [
            [_, _, _, _, _],
            [_, _, _, _, _],
            [r, r, M, M, _],
            [_, _, _, M, _],
            [_, _, _, _, _],
        ];
        const state: SiamState = new SiamState(board, 0);
        // When pushing two mountains
        const move: SiamMove = SiamMove.of(0, 2, MGPOptional.of(Orthogonal.RIGHT), Orthogonal.RIGHT);
        // Then it should succeed
        const expectedBoard: Table<SiamPiece> = [
            [_, _, _, _, _],
            [_, _, _, _, _],
            [_, r, r, M, M],
            [_, _, _, M, _],
            [_, _, _, _, _],
        ];
        const expectedState: SiamState = new SiamState(expectedBoard, 1);
        RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
    });

    describe('victory', () => {

        it('should assign victory to Player.ZERO if its pieces push the mountain out of the board', () => {
            // Given a board with two Player.ZERO pieces ready to push a mountain
            const board: Table<SiamPiece> = [
                [_, _, M, _, _],
                [_, _, U, _, _],
                [_, M, U, M, _],
                [_, _, _, _, _],
                [_, _, _, _, _],
            ];
            const state: SiamState = new SiamState(board, 1);

            // When pushing the mountain out of the board
            const move: SiamMove = SiamMove.of(2, 2, MGPOptional.of(Orthogonal.UP), Orthogonal.UP);

            // Then it should succeed
            const expectedBoard: Table<SiamPiece> = [
                [_, _, U, _, _],
                [_, _, U, _, _],
                [_, M, _, M, _],
                [_, _, _, _, _],
                [_, _, _, _, _],
            ];
            const expectedState: SiamState = new SiamState(expectedBoard, 2);
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
            // and victory should be for player zero
            const node: SiamNode =
            new SiamNode(expectedState, undefined, MGPOptional.of(move));
            RulesUtils.expectToBeVictoryFor(rules, node, Player.ONE, defaultConfig);
        });

        it('should assign victory to the player closest to and aligned with the fallen mountain', () => {
            // Given a board where Player.ONE can push a piece of Player.ZERO that pushes the mountain
            const board: Table<SiamPiece> = [
                [_, _, M, _, _],
                [_, _, u, _, _],
                [_, M, U, M, _],
                [_, _, _, _, _],
                [_, _, _, _, _],
            ];
            const state: SiamState = new SiamState(board, 1);

            // When pushing the mountain out of the board
            const move: SiamMove = SiamMove.of(2, 2, MGPOptional.of(Orthogonal.UP), Orthogonal.UP);

            // Then it should succeed
            const expectedBoard: Table<SiamPiece> = [
                [_, _, u, _, _],
                [_, _, U, _, _],
                [_, M, _, M, _],
                [_, _, _, _, _],
                [_, _, _, _, _],
            ];
            const expectedState: SiamState = new SiamState(expectedBoard, 2);
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
            // and victory should be for player zero
            const node: SiamNode =
            new SiamNode(expectedState, undefined, MGPOptional.of(move));
            RulesUtils.expectToBeVictoryFor(rules, node, Player.ZERO, defaultConfig);
        });

        it('should assign victory to player closest to and aligned with the fallen mountain (and not to the non-aligned pieces)', () => {
            // Given a board where the piece next to the mountain is not aligned vertically
            const board: Table<SiamPiece> = [
                [_, _, M, _, _],
                [_, _, l, _, _],
                [_, M, R, M, _],
                [_, _, R, _, _],
                [_, _, R, _, _],
            ];
            const state: SiamState = new SiamState(board, 2);

            // When pushing the mountain out of the board vertically
            const move: SiamMove = SiamMove.of(2, 5, MGPOptional.of(Orthogonal.UP), Orthogonal.UP);

            // Then it should succeed
            const expectedBoard: Table<SiamPiece> = [
                [_, _, l, _, _],
                [_, _, R, _, _],
                [_, M, R, M, _],
                [_, _, R, _, _],
                [_, _, u, _, _],
            ];
            const expectedState: SiamState = new SiamState(expectedBoard, 3);
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
            // and victory should be for player zero, whose pieces are aligned with the push
            const node: SiamNode = new SiamNode(expectedState, undefined, MGPOptional.of(move));
            RulesUtils.expectToBeVictoryFor(rules, node, Player.ZERO, defaultConfig);
        });

    });

    it('should compute empty list of moves between two impossible squares', () => {
        // Given two coordinatess that are not neighbors
        const state: SiamState = SiamRules.get().getInitialState(defaultConfig);
        const start: Coord = new Coord(0, 0);
        const end: Coord = new Coord(2, 2);
        // When listing the moves between these coords
        const moves: SiamMove[] = rules.getMovesBetween(state, SiamPiece.LIGHT_UP, start, end);
        // Then there should be no moves
        expect(moves).toEqual([]);
    });

    it('should compute empty list of moves between aligned squares that are too far away', () => {
        // Given two coordinatess that are aligned but of a distance greater than one
        const state: SiamState = SiamRules.get().getInitialState(defaultConfig);
        const start: Coord = new Coord(0, 0);
        const end: Coord = new Coord(2, 0);
        // When listing the moves between these coords
        const moves: SiamMove[] = rules.getMovesBetween(state, SiamPiece.LIGHT_UP, start, end);
        // Then there should be no moves
        expect(moves).toEqual([]);
    });

    it('should compute the pusher player even with a mountain amongs the pushers', () => {
        // Given a board where there is a mountain amongst the pusher,
        // and a winning move
        const board: Table<SiamPiece> = [
            [_, _, M, _, _],
            [_, _, u, _, _],
            [_, M, M, _, _],
            [_, _, U, _, _],
            [_, _, u, _, _],
        ];
        const state: SiamState = new SiamState(board, 0);
        const move: SiamMove = SiamMove.of(2, 4, MGPOptional.of(Orthogonal.UP), Orthogonal.UP);
        // When computing the pusher for the winning move
        const pusher: PlayerOrNone = rules.getPusher(state, move);
        // Then it should identify the right player
        expect(pusher).toBe(Player.ZERO);
    });

    describe('Custom Config Rules', () => {

        it('should allow inserting a 6th piece when config announce there are as much pieces', () => {
            // Given a state with a higher number of piece
            const customConfig: MGPOptional<SiamConfig> = MGPOptional.of({
                ...defaultConfig.get(),
                numberOfPiece: 6,
            });
            const board: Table<SiamPiece> = [
                [_, _, _, _, _],
                [_, _, _, _, _],
                [_, M, M, M, _],
                [_, _, _, _, _],
                [U, U, U, U, U],
            ];
            const state: SiamState = new SiamState(board, 1);

            // When trying to insert a 6th piece
            const move: SiamMove = SiamMove.of(0, -1, MGPOptional.of(Orthogonal.DOWN), Orthogonal.DOWN);

            // Then it should be a success
            const expectedBard: Table<SiamPiece> = [
                [D, _, _, _, _],
                [_, _, _, _, _],
                [_, M, M, M, _],
                [_, _, _, _, _],
                [U, U, U, U, U],
            ];
            const expectedState: SiamState = new SiamState(expectedBard, 2);
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, customConfig);
        });

        it('should notice victory with lower amount of mountain', () => {
            // Given a board with at start only two mountains
            const customConfig: MGPOptional<SiamConfig> = MGPOptional.of({
                ...defaultConfig.get(),
                numberOfBonusMountain: 1,
            });
            const board: Table<SiamPiece> = [
                [_, _, M, _, _],
                [_, _, l, _, _],
                [_, M, R, _, _],
                [_, _, R, _, _],
                [_, _, R, _, _],
            ];
            const state: SiamState = new SiamState(board, 1);

            // When pushing the mountain out of the board vertically
            const move: SiamMove = SiamMove.of(2, 5, MGPOptional.of(Orthogonal.UP), Orthogonal.UP);

            // Then it should succeed
            const expectedBoard: Table<SiamPiece> = [
                [_, _, l, _, _],
                [_, _, R, _, _],
                [_, M, R, _, _],
                [_, _, R, _, _],
                [_, _, U, _, _],
            ];
            const expectedState: SiamState = new SiamState(expectedBoard, 2);
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, customConfig);
            // and victory should be for player zero, whose pieces are aligned with the push
            const node: SiamNode = new SiamNode(expectedState, undefined, MGPOptional.of(move));
            RulesUtils.expectToBeVictoryFor(rules, node, Player.ONE, customConfig);
        });

    });

});
