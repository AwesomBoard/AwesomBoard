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
import { LascaRules } from '../LascaRules';

describe('LascaRules', () => {

    const zero: CheckersPiece = CheckersPiece.ZERO;
    const one: CheckersPiece = CheckersPiece.ONE;
    const zeroOfficer: CheckersPiece = CheckersPiece.ZERO_PROMOTED;
    const oneOfficer: CheckersPiece = CheckersPiece.ONE_PROMOTED;

    const __U: CheckersStack = new CheckersStack([zero]);
    const __O: CheckersStack = new CheckersStack([zeroOfficer]);
    const __V: CheckersStack = new CheckersStack([one]);
    const _VU: CheckersStack = new CheckersStack([one, zero]);
    const _UV: CheckersStack = new CheckersStack([zero, one]);
    const _OV: CheckersStack = new CheckersStack([zeroOfficer, one]);
    const __X: CheckersStack = new CheckersStack([oneOfficer]);
    const ___: CheckersStack = CheckersStack.EMPTY;

    let rules: LascaRules;
    const defaultConfig: MGPOptional<CheckersConfig> = LascaRules.get().getDefaultRulesConfig();

    beforeEach(() => {
        rules = LascaRules.get();
    });

    describe('Step', () => {

        it('should forbid move when first coord is empty', () => {
            // Given any board
            const state: CheckersState = rules.getInitialState(defaultConfig);

            // When doing a move that starts on an empty coord
            const move: CheckersMove = CheckersMove.fromStep(new Coord(1, 3), new Coord(2, 2));

            // Then the move should be illegal
            const reason: string = RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_EMPTY();
            RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
        });

        it('should forbid moving opponent piece', () => {
            // Given any board
            const state: CheckersState = rules.getInitialState(defaultConfig);

            // When doing a move that starts on an opponent's piece
            const move: CheckersMove = CheckersMove.fromStep(new Coord(0, 2), new Coord(1, 3));

            // Then the move should be illegal
            const reason: string = RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_OPPONENT();
            RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
        });

        it('should forbid moving normal piece backward', () => {
            // Given any board
            const state: CheckersState = CheckersState.of([
                [__V, ___, __V, ___, __V, ___, __V],
                [___, __V, ___, __V, ___, __V, ___],
                [__V, ___, __V, ___, __V, ___, __V],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, __U, ___, __U],
                [___, __U, ___, __U, ___, __U, ___],
                [__U, ___, ___, ___, __U, ___, __U],
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
            const move: CheckersMove = CheckersMove.fromStep(new Coord(5, 5), new Coord(4, 4));

            // Then the move should be illegal
            const reason: string = RulesFailure.MUST_LAND_ON_EMPTY_SPACE();
            RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
        });

        it('should forbid vertical move', () => {
            // Given any board
            const state: CheckersState = rules.getInitialState(defaultConfig);

            // When trying to movea piece vertically
            const move: CheckersMove = CheckersMove.fromStep(new Coord(1, 5), new Coord(1, 3));

            // Then the move should be illegal
            const reason: string = CheckersFailure.CANNOT_DO_ORTHOGONAL_MOVE();
            RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
        });

        it('should allow simple move', () => {
            // Given any board
            const state: CheckersState = rules.getInitialState(defaultConfig);

            // When doing a simple move
            const move: CheckersMove = CheckersMove.fromStep(new Coord(2, 4), new Coord(3, 3));

            // Then it should succeed
            const expectedState: CheckersState = CheckersState.of([
                [__V, ___, __V, ___, __V, ___, __V],
                [___, __V, ___, __V, ___, __V, ___],
                [__V, ___, __V, ___, __V, ___, __V],
                [___, ___, ___, __U, ___, ___, ___],
                [__U, ___, ___, ___, __U, ___, __U],
                [___, __U, ___, __U, ___, __U, ___],
                [__U, ___, __U, ___, __U, ___, __U],
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

        it('should forbid long step', () => {
            // Given any board
            const state: CheckersState = CheckersState.of([
                [__V, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, __U],
            ], 0);

            // When trying to make a long step with a normal piece
            const move: CheckersMove = CheckersMove.fromStep(new Coord(6, 6), new Coord(3, 3));

            // Then it should be illegal
            const reason: string = CheckersFailure.NO_PIECE_CAN_DO_LONG_JUMP();
            RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
        });

        it('should forbid capturing two allies in one jump', () => {
            // Given any board
            const state: CheckersState = CheckersState.of([
                [__V, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, __U, ___, ___, ___],
                [___, ___, ___, ___, __U, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, __O],
            ], 0);

            // When trying to capture two pieces in one jump
            const move: CheckersMove = CheckersMove.fromStep(new Coord(6, 6), new Coord(2, 2));

            // Then it should be illegal
            const reason: string = CheckersFailure.CANNOT_JUMP_OVER_SEVERAL_PIECES();
            RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
        });

    });

    describe('Capture', () => {

        it('should forbid continuing move after last capture', () => {
            // Given a board with a possible capture
            const state: CheckersState = CheckersState.of([
                [__V, ___, __V, ___, __V, ___, __V],
                [___, __V, ___, __V, ___, __V, ___],
                [__V, ___, __V, ___, __V, ___, __V],
                [___, __U, ___, ___, ___, ___, ___],
                [___, ___, __U, ___, __U, ___, __U],
                [___, ___, ___, __U, ___, __U, ___],
                [__U, ___, ___, ___, __U, ___, __U],
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
            const outOfBoardCoord: Coord = new Coord(8, 4);
            const captures: Coord[] = [new Coord(6, 6), outOfBoardCoord, new Coord(6, 2)];
            const move: CheckersMove = CheckersMove.fromCapture(captures).get();

            // Then it should be illegal
            const reason: string = CoordFailure.OUT_OF_RANGE(outOfBoardCoord);
            RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
        });

        it('should forbid skipping capture', () => {
            // Given a board with a possible capture
            const state: CheckersState = CheckersState.of([
                [__V, ___, __V, ___, __V, ___, __V],
                [___, __V, ___, __V, ___, __V, ___],
                [__V, ___, __V, ___, __V, ___, __V],
                [___, __U, ___, ___, ___, ___, ___],
                [___, ___, __U, ___, __U, ___, __U],
                [___, ___, ___, __U, ___, __U, ___],
                [__U, ___, ___, ___, __U, ___, __U],
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
                [__V, ___, __V, ___, __V, ___, __V],
                [___, __V, ___, __V, ___, __V, ___],
                [__V, ___, __U, ___, __V, ___, __V],
                [___, __U, ___, ___, ___, ___, ___],
                [___, ___, __U, ___, __U, ___, __U],
                [___, ___, ___, __U, ___, __U, ___],
                [__U, ___, ___, ___, __U, ___, __U],
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
                [___, ___, ___, ___, ___, ___, ___],
                [___, __V, ___, ___, ___, ___, ___],
                [___, ___, __V, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, __U, ___],
                [___, ___, ___, ___, ___, ___, ___],
            ], 1);

            // When doing so
            const move: CheckersMove = CheckersMove.fromCapture([new Coord(1, 1), new Coord(3, 3)]).get();

            // Then the move should be illegal
            const reason: string = RulesFailure.CANNOT_SELF_CAPTURE();
            RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
        });

        it('should forbid backward capture with normal piece', () => {
            // Given a board on which a normal-piece could try to capture backward
            const state: CheckersState = CheckersState.of([
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, __U, ___, ___],
                [___, ___, ___, __V, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
            ], 1);

            // When doing so
            const move: CheckersMove = CheckersMove.fromCapture([new Coord(3, 3), new Coord(5, 1)]).get();

            // Then the move should be illegal
            const reason: string = CheckersFailure.CANNOT_GO_BACKWARD();
            RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
        });

        it('should forbid backward complexe capture', () => {
            // Given a board on which a backward complexe capture is possible
            const state: CheckersState = CheckersState.of([
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, __U, ___, __U, ___, __U, ___],
                [__V, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
            ], 1);

            // When doing so
            const captures: Coord[] = [
                new Coord(0, 3),
                new Coord(2, 1),
                new Coord(4, 3),
                new Coord(6, 1),
            ];
            const move: CheckersMove = CheckersMove.fromCapture(captures).get();

            // Then the move should be illegal
            const reason: string = CheckersFailure.CANNOT_GO_BACKWARD();
            RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
        });

        it('should forbid long capture for all piece', () => {
            // Given a board where a piece could try a capture with a longer jump
            const state: CheckersState = CheckersState.of([
                [___, ___, __V, ___, ___, ___, ___],
                [___, ___, ___, __U, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, __U, ___],
                [___, ___, __V, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [__U, ___, ___, ___, ___, ___, ___],
            ], 0);

            // When trying to do a capture that does too long step
            const move: CheckersMove = CheckersMove.fromCapture([new Coord(0, 6), new Coord(3, 3)]).get();

            // Then it should fail
            const reason: string = CheckersFailure.NO_PIECE_CAN_DO_LONG_JUMP();
            RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
        });

        it('should allow to do small capture when big capture available', () => {
            // Given a board where two different sized captures are possible
            const state: CheckersState = CheckersState.of([
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, __V, ___, ___, ___, ___],
                [___, __U, ___, __U, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, __U, ___],
                [___, ___, ___, ___, ___, ___, ___],
            ], 1);

            // When doing the small capture
            const move: CheckersMove = CheckersMove.fromCapture([new Coord(2, 2), new Coord(0, 4)]).get();

            // Then it should succeed
            const expectedState: CheckersState = CheckersState.of([
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, __U, ___, ___, ___],
                [_VU, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, __U, ___],
                [___, ___, ___, ___, ___, ___, ___],
            ], 2);
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
        });

        it('should allow to do big capture when small capture available', () => {
            // Given a board where two different sized captures are possible
            const state: CheckersState = CheckersState.of([
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, __V, ___, ___, ___, ___],
                [___, __U, ___, __U, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, __U, ___],
                [___, ___, ___, ___, ___, ___, ___],
            ], 1);

            // When doing the big capture
            const capture: Coord[] = [new Coord(2, 2), new Coord(4, 4), new Coord(6, 6)];
            const move: CheckersMove = CheckersMove.fromCapture(capture).get();

            // Then it should succeed
            const stack: CheckersPiece[] = [CheckersPiece.ONE_PROMOTED, CheckersPiece.ZERO, CheckersPiece.ZERO];
            const Xoo: CheckersStack = new CheckersStack(stack);
            const expectedState: CheckersState = CheckersState.of([
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, __U, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, Xoo],
            ], 2);
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
        });

        it('should allow capturing standalone opponent piece', () => {
            // Given a board with a possible single-capture
            const state: CheckersState = CheckersState.of([
                [__V, ___, __V, ___, __V, ___, __V],
                [___, __V, ___, __V, ___, __V, ___],
                [__V, ___, __V, ___, __V, ___, __V],
                [___, __U, ___, ___, ___, ___, ___],
                [___, ___, __U, ___, __U, ___, __U],
                [___, ___, ___, __U, ___, __U, ___],
                [__U, ___, ___, ___, __U, ___, __U],
            ], 1);

            // When capturing the single piece
            const move: CheckersMove = CheckersMove.fromCapture([new Coord(2, 2), new Coord(0, 4)]).get();

            // Then it should succeed
            const expectedState: CheckersState = CheckersState.of([
                [__V, ___, __V, ___, __V, ___, __V],
                [___, __V, ___, __V, ___, __V, ___],
                [__V, ___, ___, ___, __V, ___, __V],
                [___, ___, ___, ___, ___, ___, ___],
                [_VU, ___, __U, ___, __U, ___, __U],
                [___, ___, ___, __U, ___, __U, ___],
                [__U, ___, ___, ___, __U, ___, __U],
            ], 2);
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
        });

        it('should allow capturing commander of an opponent stack', () => {
            // Given a board with a possible stack-capture
            const state: CheckersState = CheckersState.of([
                [__V, ___, __V, ___, __V, ___, __V],
                [___, __V, ___, __V, ___, __V, ___],
                [__V, ___, __V, ___, __V, ___, __V],
                [___, _UV, ___, ___, ___, ___, ___],
                [___, ___, __U, ___, __U, ___, __U],
                [___, ___, ___, __U, ___, __U, ___],
                [__U, ___, ___, ___, __U, ___, __U],
            ], 1);

            // When capturing the commander of the stack
            const move: CheckersMove = CheckersMove.fromCapture([new Coord(2, 2), new Coord(0, 4)]).get();

            // Then it should succeed
            const expectedState: CheckersState = CheckersState.of([
                [__V, ___, __V, ___, __V, ___, __V],
                [___, __V, ___, __V, ___, __V, ___],
                [__V, ___, ___, ___, __V, ___, __V],
                [___, __V, ___, ___, ___, ___, ___],
                [_VU, ___, __U, ___, __U, ___, __U],
                [___, ___, ___, __U, ___, __U, ___],
                [__U, ___, ___, ___, __U, ___, __U],
            ], 2);
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
        });

        it('should allow multiple-capture', () => {
            // Given a board where a multiple captures is possible
            const state: CheckersState = CheckersState.of([
                [___, ___, __V, ___, ___, ___, ___],
                [___, ___, ___, __U, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, __U, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [__U, ___, ___, ___, ___, ___, ___],
            ], 1);

            // When doing the multiple capture
            const move: CheckersMove = CheckersMove.fromCapture([
                new Coord(2, 0),
                new Coord(4, 2),
                new Coord(6, 4)]).get();

            // Then it should succeed
            const vuu: CheckersStack = new CheckersStack([CheckersPiece.ONE, CheckersPiece.ZERO, CheckersPiece.ZERO]);
            const expectedState: CheckersState = CheckersState.of([
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, vuu],
                [___, ___, ___, ___, ___, ___, ___],
                [__U, ___, ___, ___, ___, ___, ___],
            ], 2);
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
        });

        it('should forbid capturing two ennemies in one jump', () => {
            // Given any board
            const state: CheckersState = CheckersState.of([
                [__V, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, __V, ___, ___, ___],
                [___, ___, ___, ___, __V, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, __O],
            ], 0);

            // When trying to capture two pieces in one jump
            const move: CheckersMove = CheckersMove.fromStep(new Coord(6, 6), new Coord(2, 2));

            // Then it should be illegal
            const reason: string = CheckersFailure.CANNOT_JUMP_OVER_SEVERAL_PIECES();
            RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
        });

        describe('Commander', () => {

            it('should allow backward capture with officer', () => {
                // Given a board on which an officer can capture backward
                const state: CheckersState = CheckersState.of([
                    [___, ___, ___, ___, ___, ___, ___],
                    [___, ___, ___, ___, ___, __V, ___],
                    [___, ___, ___, ___, __O, ___, ___],
                    [___, ___, ___, ___, ___, ___, ___],
                    [___, ___, __V, ___, ___, ___, ___],
                    [___, ___, ___, ___, ___, ___, ___],
                    [___, ___, ___, ___, ___, ___, ___],
                ], 2);

                // When doing it
                const move: CheckersMove = CheckersMove.fromCapture([new Coord(4, 2), new Coord(6, 0)]).get();

                // Then it should be a success
                const expectedState: CheckersState = CheckersState.of([
                    [___, ___, ___, ___, ___, ___, _OV],
                    [___, ___, ___, ___, ___, ___, ___],
                    [___, ___, ___, ___, ___, ___, ___],
                    [___, ___, ___, ___, ___, ___, ___],
                    [___, ___, __V, ___, ___, ___, ___],
                    [___, ___, ___, ___, ___, ___, ___],
                    [___, ___, ___, ___, ___, ___, ___],
                ], 3);
                RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
            });

        });

    });

    describe('Promotion', () => {

        it('should promote the commander of a stack that reached last line', () => {
            // Given a board where a stack is about to reach final line
            const state: CheckersState = CheckersState.of([
                [___, ___, ___, ___, __V, ___, __V],
                [___, _UV, ___, __V, ___, __V, ___],
                [___, ___, __V, ___, __V, ___, __V],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, __U, ___, __U, ___, __U],
                [___, ___, ___, __U, ___, __U, ___],
                [__U, ___, ___, ___, __U, ___, __U],
            ], 0);

            // When doing that move
            const move: CheckersMove = CheckersMove.fromStep(new Coord(1, 1), new Coord(0, 0));

            // Then the commander of the stack should be promoted
            const expectedState: CheckersState = CheckersState.of([
                [_OV, ___, ___, ___, __V, ___, __V],
                [___, ___, ___, __V, ___, __V, ___],
                [___, ___, __V, ___, __V, ___, __V],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, __U, ___, __U, ___, __U],
                [___, ___, ___, __U, ___, __U, ___],
                [__U, ___, ___, ___, __U, ___, __U],
            ], 1);
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
        });

        it('should promote piece that reached last line', () => {
            // Given a board where a single piece is about to reach final line
            const state: CheckersState = CheckersState.of([
                [___, ___, ___, ___, __V, ___, __V],
                [___, __U, ___, __V, ___, __V, ___],
                [___, ___, __V, ___, __V, ___, __V],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, __U, ___, __U, ___, __U],
                [___, ___, ___, __U, ___, __U, ___],
                [__U, ___, ___, ___, __U, ___, __U],
            ], 0);

            // When doing that move
            const move: CheckersMove = CheckersMove.fromStep(new Coord(1, 1), new Coord(0, 0));

            // Then the piece should be promoted
            const expectedState: CheckersState = CheckersState.of([
                [__O, ___, ___, ___, __V, ___, __V],
                [___, ___, ___, __V, ___, __V, ___],
                [___, ___, __V, ___, __V, ___, __V],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, __U, ___, __U, ___, __U],
                [___, ___, ___, __U, ___, __U, ___],
                [__U, ___, ___, ___, __U, ___, __U],
            ], 1);
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
        });

    });

    describe('End Game', () => {

        it(`should declare current player winner when opponent commands no more stack`, () => {
            // Given a board where Player.ONE have no more commander
            // When evaluating its value
            // Then the current Player.ZERO should win
            const expectedState: CheckersState = CheckersState.of([
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [_UV, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
            ], 1);
            const node: CheckersNode = new CheckersNode(expectedState);
            RulesUtils.expectToBeVictoryFor(rules, node, Player.ZERO, defaultConfig);
        });

        it(`should declare current player winner when blocking all opponent's pieces`, () => {
            // Given a board where the last commander(s) of Player.ZERO are stucked
            // When evaluating its value
            // Then the board should be considered as a victory of Player.ONE
            const expectedState: CheckersState = CheckersState.of([
                [__O, ___, __X, ___, ___, ___, ___],
                [___, __X, ___, ___, ___, ___, ___],
                [___, ___, __X, ___, ___, ___, ___],
                [___, ___, ___, __X, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
            ], 2);
            const node: CheckersNode = new CheckersNode(expectedState);
            RulesUtils.expectToBeVictoryFor(rules, node, Player.ONE, defaultConfig);
        });

    });

    describe('getLegalCaptures', () => {

        it('should forbid to pass over the same coord several times', () => {
            // Given a board with only one possible capture
            const state: CheckersState = new CheckersState([
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, __V, ___, __V, ___],
                [___, ___, ___, ___, ___, ___, __O],
                [___, ___, ___, __V, ___, __V, ___],
                [___, ___, ___, ___, ___, ___, ___],
            ], 20);

            // When checking the legal list of captures
            const legalCaptures: CheckersMove[] = rules.getLegalCaptures(state, defaultConfig.get());

            // Then it should be this one, the bigger not to fly over same coord twice
            const coordsClockwise: Coord[] = [
                new Coord(6, 4),
                new Coord(4, 2),
                new Coord(2, 4),
                new Coord(4, 6),
            ];
            const moveClockwise: CheckersMove = CheckersMove.fromCapture(coordsClockwise).get();
            const coordsCounterClockwise: Coord[] = [
                new Coord(6, 4),
                new Coord(4, 6),
                new Coord(2, 4),
                new Coord(4, 2),
            ];
            const moveCounterClockwise: CheckersMove = CheckersMove.fromCapture(coordsCounterClockwise).get();
            expect(legalCaptures).toEqual([moveClockwise, moveCounterClockwise]);
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
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, __V, ___, ___, ___, ___],
                [___, __U, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
            ], 1);

            // When doing the move
            const move: CheckersMove = CheckersMove.fromCapture([new Coord(2, 2), new Coord(0, 4)]).get();

            // Then it should succeed
            const expectedState: CheckersState = CheckersState.of([
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [__V, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
            ], 2);
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, alternateConfig);
        });

        it('should put piece on odd squares if config requires it', () => {
            // Given a customConfig where piece are to be put on odd squares
            const customConfig: MGPOptional<CheckersConfig> = MGPOptional.of({
                ...defaultConfig.get(),
                occupyEvenSquare: false,
            });

            // When generating it
            const initialState: CheckersState = rules.getInitialState(customConfig);

            // Then it should be correct
            const expectedState: CheckersState = CheckersState.of([
                [___, __V, ___, __V, ___, __V, ___],
                [__V, ___, __V, ___, __V, ___, __V],
                [___, __V, ___, __V, ___, __V, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, __U, ___, __U, ___, __U, ___],
                [__U, ___, __U, ___, __U, ___, __U],
                [___, __U, ___, __U, ___, __U, ___],
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
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, __U, ___, __V, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, __U, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
            ], 2);

            // When doing the move
            const move: CheckersMove = CheckersMove.fromCapture([new Coord(3, 5), new Coord(3, 1)]).get();

            // Then it should succeed
            const expectedState: CheckersState = CheckersState.of([
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, _UV, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, __U, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
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
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, __U, ___, __V, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
            ], 2);

            // When doing the move
            const move: CheckersMove = CheckersMove.fromCapture([new Coord(1, 3), new Coord(5, 3)]).get();

            // Then it should succeed
            const expectedState: CheckersState = CheckersState.of([
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, _UV, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
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
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, __U, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, __U, ___, __V, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
            ], 2);

            // When doing the move
            const move: CheckersMove = CheckersMove.fromCapture([new Coord(3, 1), new Coord(3, 5)]).get();

            // Then it should succeed
            const expectedState: CheckersState = CheckersState.of([
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, __U, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, _UV, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
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
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, __V, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, __U, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
            ], 2);

            // When doing the move
            const move: CheckersMove = CheckersMove.fromCapture([new Coord(1, 3), new Coord(3, 3)]).get();

            // Then it should fail
            const reason: string = CheckersFailure.INVALID_FRISIAN_MOVE();
            RulesUtils.expectMoveFailure(rules, state, move, reason, alternateConfig);
        });

        it('Should refuse uneven frisian capture even if config allows frisian capture', () => {
            // Given a board where a frisian capture is possible
            const alternateConfig: MGPOptional<CheckersConfig> = MGPOptional.of({
                ...defaultConfig.get(),
                frisianCaptureAllowed: true,
            });
            const state: CheckersState = CheckersState.of([
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, __V, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, __U, ___, __V, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
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
                [__O, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [__V, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
            ], 2);

            // When doing the move
            const move: CheckersMove = CheckersMove.fromCapture([new Coord(0, 0), new Coord(0, 6)]).get();

            // Then it should succeed
            const expectedState: CheckersState = CheckersState.of([
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___, ___, ___],
                [_OV, ___, ___, ___, ___, ___, ___],
            ], 3);
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, alternateConfig);
        });

    });

});
