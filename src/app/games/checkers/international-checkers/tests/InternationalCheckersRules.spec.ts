/* eslint-disable max-lines-per-function */
import { MGPOptional } from '@everyboard/lib';
import { Coord, CoordFailure } from 'src/app/jscaip/Coord';
import { Player } from 'src/app/jscaip/Player';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { RulesUtils } from 'src/app/jscaip/tests/RulesUtils.spec';
import { CheckersMove } from '../../common/CheckersMove';
import { CheckersConfig, CheckersNode } from '../../common/AbstractCheckersRules';
import { CheckersFailure } from '../../common/CheckersFailure';
import { CheckersPiece, CheckersStack, CheckersState } from '../../common/CheckersState';
import { InternationalCheckersRules } from '../InternationalCheckersRules';

describe('InternationalCheckersRules', () => {

    const zero: CheckersPiece = CheckersPiece.ZERO;
    const one: CheckersPiece = CheckersPiece.ONE;
    const zeroKing: CheckersPiece = CheckersPiece.ZERO_PROMOTED;
    const oneKing: CheckersPiece = CheckersPiece.ONE_PROMOTED;

    const U: CheckersStack = new CheckersStack([zero]);
    const O: CheckersStack = new CheckersStack([zeroKing]);
    const V: CheckersStack = new CheckersStack([one]);
    const X: CheckersStack = new CheckersStack([oneKing]);
    const _: CheckersStack = CheckersStack.EMPTY;

    let rules: InternationalCheckersRules;
    const defaultConfig: MGPOptional<CheckersConfig> = InternationalCheckersRules.get().getDefaultRulesConfig();

    beforeEach(() => {
        rules = InternationalCheckersRules.get();
    });

    describe('Step', () => {

        it('should forbid move when first coord is empty', () => {
            // Given any board
            const state: CheckersState = rules.getInitialState(defaultConfig);

            // When doing a move that starts on an empty coord
            const move: CheckersMove = CheckersMove.fromStep(new Coord(4, 5), new Coord(3, 4));

            // Then the move should be illegal
            const reason: string = RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_EMPTY();
            RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
        });

        it('should forbid moving opponent piece', () => {
            // Given any board
            const state: CheckersState = rules.getInitialState(defaultConfig);

            // When doing a move that starts on an opponent's piece
            const move: CheckersMove = CheckersMove.fromStep(new Coord(1, 2), new Coord(2, 3));

            // Then the move should be illegal
            const reason: string = RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_OPPONENT();
            RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
        });

        it('should forbid moving normal piece backward', () => {
            // Given any board
            const state: CheckersState = CheckersState.of([
                [V, _, V, _, V, _, V],
                [_, V, _, V, _, V, _],
                [V, _, V, _, V, _, V],
                [_, _, _, _, _, _, _],
                [_, _, _, _, U, _, U],
                [_, U, _, U, _, U, _],
                [U, _, _, _, U, _, U],
            ], 0);

            // When doing a move that moves a normal piece backward
            const move: CheckersMove = CheckersMove.fromStep(new Coord(1, 5), new Coord(2, 6));

            // Then the move should be illegal
            const reason: string = CheckersFailure.CANNOT_GO_BACKWARD();
            RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
        });

        it('should forbid landing on an occupied square', () => {
            // Given a board where a piece could be tempted to take another's place
            const state: CheckersState = rules.getInitialState(defaultConfig);

            // When trying to land on an occupied square
            const move: CheckersMove = CheckersMove.fromStep(new Coord(6, 7), new Coord(5, 6));

            // Then the move should be illegal
            const reason: string = RulesFailure.MUST_LAND_ON_EMPTY_SPACE();
            RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
        });

        it('should forbid vertical move', () => {
            // Given any board
            const state: CheckersState = rules.getInitialState(defaultConfig);

            // When trying to movea piece vertically
            const move: CheckersMove = CheckersMove.fromStep(new Coord(5, 6), new Coord(5, 4));

            // Then the move should be illegal
            const reason: string = CheckersFailure.CANNOT_DO_ORTHOGONAL_MOVE();
            RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
        });

        it('should allow simple move', () => {
            // Given any board
            const state: CheckersState = rules.getInitialState(defaultConfig);

            // When doing a simple move
            const move: CheckersMove = CheckersMove.fromStep(new Coord(5, 6), new Coord(4, 5));

            // Then it should succeed
            const expectedState: CheckersState = CheckersState.of([
                [_, V, _, V, _, V, _, V, _, V],
                [V, _, V, _, V, _, V, _, V, _],
                [_, V, _, V, _, V, _, V, _, V],
                [V, _, V, _, V, _, V, _, V, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, U, _, _, _, _, _],
                [_, U, _, U, _, _, _, U, _, U],
                [U, _, U, _, U, _, U, _, U, _],
                [_, U, _, U, _, U, _, U, _, U],
                [U, _, U, _, U, _, U, _, U, _],
            ], 1);
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
        });

        it('should forbid to start out of the board', () => {
            // Given any board
            const state: CheckersState = rules.getInitialState(defaultConfig);

            // When trying a move starting outside of the board
            const move: CheckersMove = CheckersMove.fromStep(new Coord(-1, 1), new Coord(0, 0));

            // Then it should be illegal
            const reason: string = CoordFailure.OUT_OF_RANGE(new Coord(-1, 1));
            RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
        });

        it('should forbid to get out of the board', () => {
            // Given any board
            const state: CheckersState = rules.getInitialState(defaultConfig);

            // When trying a move going outside of the board
            const outOfBoardCoord: Coord = new Coord(-1, -1);
            const move: CheckersMove = CheckersMove.fromStep(new Coord(0, 0), outOfBoardCoord);

            // Then it should be illegal
            const reason: string = CoordFailure.OUT_OF_RANGE(outOfBoardCoord);
            RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
        });

        it('should forbid long step for normal piece', () => {
            // Given any board
            const state: CheckersState = CheckersState.of([
                [V, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, U],
            ], 0);

            // When trying to make a long step with a normal piece
            const move: CheckersMove = CheckersMove.fromStep(new Coord(9, 9), new Coord(3, 3));

            // Then it should be illegal
            const reason: string = CheckersFailure.NORMAL_PIECES_CANNOT_MOVE_LIKE_THIS();
            RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
        });

        it('should allow long step forward for king', () => {
            // Given any board with a king
            const state: CheckersState = CheckersState.of([
                [V, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, O],
            ], 0);

            // When doing a simple move
            const move: CheckersMove = CheckersMove.fromStep(new Coord(9, 9), new Coord(5, 5));

            // Then it should succeed
            const expectedState: CheckersState = CheckersState.of([
                [V, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, O, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
            ], 1);
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
        });

        it('should allow long step for backward king', () => {
            // Given any board with a king
            const state: CheckersState = CheckersState.of([
                [V, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, O, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
            ], 0);

            // When doing a simple move
            const move: CheckersMove = CheckersMove.fromStep(new Coord(8, 2), new Coord(5, 5));

            // Then it should succeed
            const expectedState: CheckersState = CheckersState.of([
                [V, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, O, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
            ], 1);
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
        });

        it('should forbid jump over allies', () => {
            // Given any board
            const state: CheckersState = CheckersState.of([
                [V, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, U, _, _, _],
                [_, _, _, _, U, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, O],
            ], 0);

            // When trying to capture two pieces in one jump
            const move: CheckersMove = CheckersMove.fromStep(new Coord(6, 6), new Coord(2, 2));

            // Then it should be illegal
            const reason: string = CheckersFailure.CANNOT_JUMP_OVER_SEVERAL_PIECES();
            RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
        });

    });

    describe('Capture', () => {

        describe('Normal Pieces', () => {

            it('should forbid continuing move after last capture', () => {
                // Given a board with a possible capture
                const state: CheckersState = CheckersState.of([
                    [V, _, V, _, V, _, V, _, _, _],
                    [_, V, _, V, _, V, _, _, _, _],
                    [V, _, V, _, V, _, V, _, _, _],
                    [_, U, _, _, _, _, _, _, _, _],
                    [_, _, U, _, U, _, U, _, _, _],
                    [_, _, _, U, _, U, _, _, _, _],
                    [U, _, _, _, U, _, U, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                ], 1);

                // When doing a move that jump over an empty square after capture
                const capture: Coord[] = [new Coord(2, 2), new Coord(0, 4), new Coord(2, 6)];
                const move: CheckersMove = CheckersMove.fromCapture(capture).get();

                // Then the move should be illegal
                const reason: string = CheckersFailure.MOVE_CANNOT_CONTINUE_AFTER_NON_CAPTURE_MOVE();
                RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
            });

            it('should forbid to pass out of the board', () => {
                // Given any board
                const state: CheckersState = rules.getInitialState(defaultConfig);

                // When trying a move going outside of the board
                const outOfBoardCoord: Coord = new Coord(-2, 4);
                const captures: Coord[] = [new Coord(0, 6), outOfBoardCoord, new Coord(0, 2)];
                const move: CheckersMove = CheckersMove.fromCapture(captures).get();

                // Then it should be illegal
                const reason: string = CoordFailure.OUT_OF_RANGE(outOfBoardCoord);
                RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
            });

            it('should forbid skipping capture', () => {
                // Given a board with a possible capture
                const state: CheckersState = CheckersState.of([
                    [V, _, V, _, V, _, V],
                    [_, V, _, V, _, V, _],
                    [V, _, V, _, V, _, V],
                    [_, U, _, _, _, _, _],
                    [_, _, U, _, U, _, U],
                    [_, _, _, U, _, U, _],
                    [U, _, _, _, U, _, U],
                ], 1);

                // When doing a non capturing move
                const move: CheckersMove = CheckersMove.fromStep(new Coord(2, 2), new Coord(3, 3));

                // Then the move should be illegal
                const reason: string = CheckersFailure.CANNOT_SKIP_CAPTURE();
                RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
            });

            it('should forbid partial-capture', () => {
                // Given a board on which a capture of two pieces is possible
                const state: CheckersState = CheckersState.of([
                    [V, _, V, _, V, _, V, _, _, _],
                    [_, V, _, V, _, V, _, _, _, _],
                    [V, _, U, _, V, _, V, _, _, _],
                    [_, U, _, _, _, _, _, _, _, _],
                    [_, _, U, _, U, _, U, _, _, _],
                    [_, _, _, U, _, U, _, _, _, _],
                    [U, _, _, _, U, _, U, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                ], 1);

                // When capturing the first but not the second
                const move: CheckersMove = CheckersMove.fromCapture([new Coord(1, 1), new Coord(3, 3)]).get();

                // Then the move should be illegal
                const reason: string = CheckersFailure.MUST_FINISH_CAPTURING();
                RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
            });

            it('should forbid self-capturing', () => {
                // Given a board on which a piece could try to capture its ally
                const state: CheckersState = CheckersState.of([
                    [_, _, _, _, _, _, _],
                    [_, V, _, _, _, _, _],
                    [_, _, V, _, _, _, _],
                    [_, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _],
                    [_, _, _, _, _, U, _],
                    [_, _, _, _, _, _, _],
                ], 1);

                // When doing so
                const move: CheckersMove = CheckersMove.fromCapture([new Coord(1, 1), new Coord(3, 3)]).get();

                // Then the move should be illegal
                const reason: string = RulesFailure.CANNOT_SELF_CAPTURE();
                RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
            });

            it('should forbid to do small capture when big capture available', () => {
                // Given a board where two different sized captures are possible
                const state: CheckersState = CheckersState.of([
                    [_, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _],
                    [_, _, V, _, _, _, _],
                    [_, U, _, U, _, _, _],
                    [_, _, _, _, _, _, _],
                    [_, _, _, _, _, U, _],
                    [_, _, _, _, _, _, _],
                ], 1);

                // When doing the small capture
                const move: CheckersMove = CheckersMove.fromCapture([new Coord(2, 2), new Coord(0, 4)]).get();

                // Then it should be illegal
                const reason: string = CheckersFailure.MUST_DO_LONGEST_CAPTURE();
                RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
            });

            it('should forbid long capture for normal piece', () => {
                // Given a board where a normal piece could try a capture with a longer jump
                const state: CheckersState = CheckersState.of([
                    [_, _, V, _, _, _, _, _, _, _],
                    [_, _, _, U, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, U, _, _, _, _],
                    [_, _, V, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [U, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                ], 0);

                // When trying to do a capture that does too long step
                const move: CheckersMove = CheckersMove.fromCapture([new Coord(0, 6), new Coord(3, 3)]).get();

                // Then it should fail
                const reason: string = CheckersFailure.FLYING_CAPTURE_IS_FORBIDDEN_FOR_NORMAL_PIECES();
                RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
            });

            it('should allow backward simple capture', () => {
                // Given a board on which a backward capture is possible
                const state: CheckersState = CheckersState.of([
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, U, _, _, _, _, _],
                    [_, _, _, V, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                ], 1);

                // When doing so
                const move: CheckersMove = CheckersMove.fromCapture([new Coord(3, 3), new Coord(5, 1)]).get();

                // Then the piece should be captured
                const expectedState: CheckersState = CheckersState.of([
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, V, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                ], 2);
                RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
            });

            it('should allow backward complex capture', () => {
                // Given a board on which a backward complex capture is possible
                const state: CheckersState = CheckersState.of([
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, U, _, U, _, U, _],
                    [_, _, _, V, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                ], 1);

                // When doing so
                const captures: Coord[] = [
                    new Coord(3, 3),
                    new Coord(5, 1),
                    new Coord(7, 3),
                    new Coord(9, 1),
                ];
                const move: CheckersMove = CheckersMove.fromCapture(captures).get();

                // Then the piece should be captured
                const expectedState: CheckersState = CheckersState.of([
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, V],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                ], 2);
                RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
            });

            it('should allow to do big capture when small capture available', () => {
                // Given a board where two different sized captures are possible
                const state: CheckersState = CheckersState.of([
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, V, _, _, _, _],
                    [_, _, _, _, U, _, U, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, U, _],
                    [_, _, _, _, _, _, _, _, _, _],
                ], 1);

                // When doing the big capture
                const capture: Coord[] = [new Coord(5, 5), new Coord(7, 7), new Coord(9, 9)];
                const move: CheckersMove = CheckersMove.fromCapture(capture).get();

                // Then it should succeed
                const expectedState: CheckersState = CheckersState.of([
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, U, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, X],
                ], 2);
                RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
            });

            it('should allow capturing standalone opponent piece', () => {
                // Given a board with a possible single-capture
                const state: CheckersState = CheckersState.of([
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, V, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, V, _, _, _, _, _],
                    [_, _, _, _, _, U, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                ], 2);

                // When capturing the single piece
                const move: CheckersMove = CheckersMove.fromCapture([new Coord(5, 5), new Coord(3, 3)]).get();

                // Then it should succeed
                const expectedState: CheckersState = CheckersState.of([
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, V, _, _, _],
                    [_, _, _, U, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                ], 3);
                RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
            });

            it('should allow multiple-capture', () => {
                // Given a board where a multiple captures is possible
                const state: CheckersState = CheckersState.of([
                    [_, _, V, _, _, _, _, _, _, _],
                    [_, _, _, U, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, U, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [U, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                ], 1);

                // When doing the multiple capture
                const move: CheckersMove = CheckersMove.fromCapture([
                    new Coord(2, 0),
                    new Coord(4, 2),
                    new Coord(6, 4),
                ]).get();

                // Then it should succeed
                const expectedState: CheckersState = CheckersState.of([
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, V, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [U, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                ], 2);
                RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
            });

        });

        describe('King', () => {

            it('should allow backward capture with king', () => {
                // Given a board on which an king can capture backward
                const state: CheckersState = CheckersState.of([
                    [_, _, _, _, _, _, _],
                    [_, _, _, _, _, V, _],
                    [_, _, _, _, O, _, _],
                    [_, V, _, _, _, _, _],
                    [_, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _],
                ], 2);

                // When doing it
                const move: CheckersMove = CheckersMove.fromCapture([new Coord(4, 2), new Coord(6, 0)]).get();

                // Then it should be a success
                const expectedState: CheckersState = CheckersState.of([
                    [_, _, _, _, _, _, O],
                    [_, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _],
                    [_, V, _, _, _, _, _],
                    [_, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _],
                ], 3);
                RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
            });

            it('should forbid capturing two allies in one jump', () => {
                // Given any board
                const state: CheckersState = CheckersState.of([
                    [V, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, U, _, _, _],
                    [_, _, _, _, _, _, _, U, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, O],
                ], 0);

                // When trying to capture two pieces in one jump
                const move: CheckersMove = CheckersMove.fromStep(new Coord(9, 9), new Coord(3, 3));

                // Then it should be illegal
                const reason: string = CheckersFailure.CANNOT_JUMP_OVER_SEVERAL_PIECES();
                RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
            });

            it('should forbid capturing two ennemies in one jump', () => {
                // Given any board
                const state: CheckersState = CheckersState.of([
                    [V, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, V, _, _, _],
                    [_, _, _, _, _, _, _, V, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, O],
                ], 0);

                // When trying to capture two pieces in one jump
                const move: CheckersMove = CheckersMove.fromStep(new Coord(9, 9), new Coord(3, 3));

                // Then it should be illegal
                const reason: string = CheckersFailure.CANNOT_JUMP_OVER_SEVERAL_PIECES();
                RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
            });

            it('should allow king capture to land just after capture', () => {
                // Given a board where a king could capture with a longer jump
                const state: CheckersState = CheckersState.of([
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, U, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, U, _, _, _, _],
                    [_, _, V, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [O, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, V],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                ], 0);

                // When trying to do a capture with "right after" landing
                const move: CheckersMove = CheckersMove.fromCapture([new Coord(0, 6), new Coord(3, 3)]).get();

                // Then it should succeed
                const expectedState: CheckersState = CheckersState.of([
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, U, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, O, _, U, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, V],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                ], 1);
                RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
            });

            it('should allow king capture to land far after capture', () => {
                // Given a board where a king could capture with a longer jump
                const state: CheckersState = CheckersState.of([
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, U, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, U, _, _, _, _],
                    [_, _, V, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [O, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, V],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                ], 0);

                // When trying to do a capture with a "further" landing
                const move: CheckersMove = CheckersMove.fromCapture([new Coord(0, 6), new Coord(4, 2)]).get();

                // Then it should succeed
                const expectedState: CheckersState = CheckersState.of([
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, U, _, _, _, _, _, _],
                    [_, _, _, _, O, _, _, _, _, _],
                    [_, _, _, _, _, U, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, V],
                    [_, _, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _, _],
                ], 1);
                RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
            });

        });

    });

    describe('Promotion', () => {

        it('should promote piece that reached last line', () => {
            // Given a board where a single piece is about to reach final line
            const state: CheckersState = CheckersState.of([
                [_, _, _, _, V, _, V],
                [_, U, _, V, _, V, _],
                [_, _, _, _, V, _, V],
                [_, _, _, _, _, _, _],
                [_, _, U, _, U, _, U],
                [_, _, _, U, _, U, _],
                [U, _, _, _, U, _, U],
            ], 0);

            // When doing that move
            const move: CheckersMove = CheckersMove.fromStep(new Coord(1, 1), new Coord(0, 0));

            // Then the piece should be promoted
            const expectedState: CheckersState = CheckersState.of([
                [O, _, _, _, V, _, V],
                [_, _, _, V, _, V, _],
                [_, _, _, _, V, _, V],
                [_, _, _, _, _, _, _],
                [_, _, U, _, U, _, U],
                [_, _, _, U, _, U, _],
                [U, _, _, _, U, _, U],
            ], 1);
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
        });

        it('should not promote piece that reached last line but came back to capture', () => {
            // Given a board where a single piece is about to reach final line then go backward
            const state: CheckersState = CheckersState.of([
                [_, _, _, _, _, _, _, _, V, _],
                [_, _, _, V, _, V, _, V, _, _],
                [_, _, U, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, V, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
            ], 0);

            // When doing that move
            const captures: Coord[] = [new Coord(2, 2), new Coord(4, 0), new Coord(6, 2)];
            const move: CheckersMove = CheckersMove.fromCapture(captures).get();

            // Then the piece should be promoted
            const expectedState: CheckersState = CheckersState.of([
                [_, _, _, _, _, _, _, _, V, _],
                [_, _, _, _, _, _, _, V, _, _],
                [_, _, _, _, _, _, U, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, V, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
            ], 1);
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
        });

    });

    describe('End Game', () => {

        it(`should declare current player winner when opponent has no more pieces`, () => {
            // Given a board where Player.ONE have no more piece
            // When evaluating its value
            // Then the current Player.ZERO should win
            const expectedState: CheckersState = CheckersState.of([
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
                [O, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
            ], 1);
            const node: CheckersNode = new CheckersNode(expectedState);
            RulesUtils.expectToBeVictoryFor(rules, node, Player.ZERO, defaultConfig);
        });

        it(`should declare current player winner when blocking all opponent's pieces`, () => {
            // Given a board where the last commander(s) of Player.ZERO are stucked
            // When evaluating its value
            // Then the board should be considered as a victory of Player.ONE
            const expectedState: CheckersState = CheckersState.of([
                [O, _, X, _, _, _, _],
                [_, X, _, _, _, _, _],
                [_, _, X, _, _, _, _],
                [_, _, _, X, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
            ], 2);
            const node: CheckersNode = new CheckersNode(expectedState);
            RulesUtils.expectToBeVictoryFor(rules, node, Player.ONE, defaultConfig);
        });

    });

    describe('getLegalCaptures', () => {

        it('should forbid to pass over the same coord several times', () => {
            // Given a board with only one possible capture
            const state: CheckersState = new CheckersState([
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, V, _, _, _, _],
                [_, _, _, _, _, _, V, _, V, _],
                [_, _, _, _, _, _, _, _, _, O],
                [_, _, _, _, V, _, V, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
            ], 20);

            // When checking the legal list of captures
            const legalCaptures: CheckersMove[] = rules.getLegalCaptures(state, defaultConfig.get());

            // Then it should be this one, the bigger not to fly over same coord twice
            const coords: Coord[] = [
                new Coord(9, 7),
                new Coord(6, 4),
                new Coord(3, 7),
                new Coord(5, 9),
                new Coord(7, 7),
            ];
            const move: CheckersMove = CheckersMove.fromCapture(coords).get();
            expect(legalCaptures).toEqual([move]);
        });

    });

    describe('Custom config', () => {

        it('Should capture instead of stacking when config demands it', () => {
            // Given a board where a kill is possible
            // And a config requesting to do capture instead of kill
            const alternateConfig: MGPOptional<CheckersConfig> = MGPOptional.of({
                ...defaultConfig.get(),
                canStackPiece: false,
            });
            const state: CheckersState = CheckersState.of([
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, V, _, _, _, _],
                [_, U, _, _, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
            ], 1);

            // When doing the move
            const move: CheckersMove = CheckersMove.fromCapture([new Coord(2, 2), new Coord(0, 4)]).get();

            // Then it should succeed
            const expectedState: CheckersState = CheckersState.of([
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
                [V, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
            ], 2);
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, alternateConfig);
        });

        it('should put piece on even squares if config requires it', () => {
            // Given a customConfig where piece are to be put on even squares
            const customConfig: MGPOptional<CheckersConfig> = MGPOptional.of({
                ...defaultConfig.get(),
                occupyEvenSquare: true,
            });

            // When generating it
            const initialState: CheckersState = rules.getInitialState(customConfig);

            // Then it should be correct
            const expectedState: CheckersState = CheckersState.of([
                [V, _, V, _, V, _, V, _, V, _],
                [_, V, _, V, _, V, _, V, _, V],
                [V, _, V, _, V, _, V, _, V, _],
                [_, V, _, V, _, V, _, V, _, V],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [U, _, U, _, U, _, U, _, U, _],
                [_, U, _, U, _, U, _, U, _, U],
                [U, _, U, _, U, _, U, _, U, _],
                [_, U, _, U, _, U, _, U, _, U],
            ], 0);
            expect(initialState).toEqual(expectedState);
        });

        it('Should allow forward frisian-capture when config allows it', () => {
            // Given a board where a frisian capture is possible
            const alternateConfig: MGPOptional<CheckersConfig> = MGPOptional.of({
                ...defaultConfig.get(),
                frisianCaptureAllowed: true,
            });
            const state: CheckersState = CheckersState.of([
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
                [_, U, _, V, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, U, _, _, _],
                [_, _, _, _, _, _, _],
            ], 2);

            // When doing the move
            const move: CheckersMove = CheckersMove.fromCapture([new Coord(3, 5), new Coord(3, 1)]).get();

            // Then it should succeed
            const expectedState: CheckersState = CheckersState.of([
                [_, _, _, _, _, _, _],
                [_, _, _, U, _, _, _],
                [_, _, _, _, _, _, _],
                [_, U, _, _, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
            ], 3);
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, alternateConfig);
        });

        it('Should allow lateral frisian-capture when config allows it', () => {
            // Given a board where a frisian capture is possible
            const alternateConfig: MGPOptional<CheckersConfig> = MGPOptional.of({
                ...defaultConfig.get(),
                frisianCaptureAllowed: true,
            });
            const state: CheckersState = CheckersState.of([
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
                [_, U, _, V, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
            ], 2);

            // When doing the move
            const move: CheckersMove = CheckersMove.fromCapture([new Coord(1, 3), new Coord(5, 3)]).get();

            // Then it should succeed
            const expectedState: CheckersState = CheckersState.of([
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, U, _],
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
            ], 3);
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, alternateConfig);
        });

        it('Should allow backward frisian-capture when config allows it', () => {
            // Given a board where a frisian capture is possible
            const alternateConfig: MGPOptional<CheckersConfig> = MGPOptional.of({
                ...defaultConfig.get(),
                frisianCaptureAllowed: true,
                simplePieceCanCaptureBackwards: true,
            });
            const state: CheckersState = CheckersState.of([
                [_, _, _, _, _, _, _],
                [_, _, _, U, _, _, _],
                [_, _, _, _, _, _, _],
                [_, U, _, V, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
            ], 2);

            // When doing the move
            const move: CheckersMove = CheckersMove.fromCapture([new Coord(3, 1), new Coord(3, 5)]).get();

            // Then it should succeed
            const expectedState: CheckersState = CheckersState.of([
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
                [_, U, _, _, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, U, _, _, _],
                [_, _, _, _, _, _, _],
            ], 3);
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, alternateConfig);
        });

        it('Should refuse frisian-step even if config allows frisian capture', () => {
            // Given a board where a frisian capture is possible
            const alternateConfig: MGPOptional<CheckersConfig> = MGPOptional.of({
                ...defaultConfig.get(),
                frisianCaptureAllowed: true,
            });
            const state: CheckersState = CheckersState.of([
                [_, _, _, _, _, _, _],
                [_, _, _, V, _, _, _],
                [_, _, _, _, _, _, _],
                [_, U, _, _, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
            ], 2);

            // When doing the move
            const move: CheckersMove = CheckersMove.fromCapture([new Coord(1, 3), new Coord(3, 3)]).get();

            // Then it should fail
            const reason: string = CheckersFailure.INVALID_FRISIAN_MOVE();
            RulesUtils.expectMoveFailure(rules, state, move, reason, alternateConfig);
        });

        it('Should refuse a uneven frisian capture even if config allows frisian capture', () => {
            // Given a board where a frisian capture is possible
            const alternateConfig: MGPOptional<CheckersConfig> = MGPOptional.of({
                ...defaultConfig.get(),
                frisianCaptureAllowed: true,
            });
            const state: CheckersState = CheckersState.of([
                [_, _, _, _, _, _, _],
                [_, _, _, V, _, _, _],
                [_, _, _, _, _, _, _],
                [_, U, _, V, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
            ], 2);

            // When doing the move
            const move: CheckersMove = CheckersMove.fromCapture([new Coord(1, 3), new Coord(4, 3)]).get();

            // Then it should fail
            const reason: string = CheckersFailure.FRISIAN_CAPTURE_MUST_BE_EVEN();
            RulesUtils.expectMoveFailure(rules, state, move, reason, alternateConfig);
        });

        it('Should allow flying-frisian when config allows it', () => {
            // Given a board where a frisian capture is possible
            const alternateConfig: MGPOptional<CheckersConfig> = MGPOptional.of({
                ...defaultConfig.get(),
                frisianCaptureAllowed: true,
                promotedPiecesCanFly: true,
            });
            const state: CheckersState = CheckersState.of([
                [O, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
                [V, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
            ], 2);

            // When doing the move
            const move: CheckersMove = CheckersMove.fromCapture([new Coord(0, 0), new Coord(0, 6)]).get();

            // Then it should succeed
            const expectedState: CheckersState = CheckersState.of([
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
                [O, _, _, _, _, _, _],
            ], 3);
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, alternateConfig);
        });

    });

});
