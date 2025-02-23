/* eslint-disable max-lines-per-function */
import { Coord } from 'src/app/jscaip/Coord';
import { Player } from 'src/app/jscaip/Player';
import { RulesUtils } from 'src/app/jscaip/tests/RulesUtils.spec';
import { MGPOptional } from '@everyboard/lib';
import { YinshFailure } from '../YinshFailure';
import { YinshState } from '../YinshState';
import { YinshCapture, YinshMove } from '../YinshMove';
import { YinshPiece } from '../YinshPiece';
import { YinshNode, YinshRules } from '../YinshRules';
import { Table } from 'src/app/jscaip/TableUtils';
import { GameStatus } from 'src/app/jscaip/GameStatus';
import { PlayerNumberMap } from 'src/app/jscaip/PlayerMap';
import { NoConfig } from 'src/app/jscaip/RulesConfigUtil';

describe('YinshRules', () => {

    const _: YinshPiece = YinshPiece.EMPTY;
    const N: YinshPiece = YinshPiece.UNREACHABLE;
    const a: YinshPiece = YinshPiece.MARKER_ZERO;
    const A: YinshPiece = YinshPiece.RING_ZERO;
    const b: YinshPiece = YinshPiece.MARKER_ONE;
    const B: YinshPiece = YinshPiece.RING_ONE;

    let rules: YinshRules;
    const defaultConfig: NoConfig = YinshRules.get().getDefaultRulesConfig();

    beforeEach(() => {
        rules = YinshRules.get();
    });

    describe('isLegal and applyLegalMove', () => {

        it('should initially allow placing rings', () => {
            // Given the initial state
            const state: YinshState = YinshRules.get().getInitialState();
            // When placing a ring
            const move: YinshMove = new YinshMove([], new Coord(3, 2), MGPOptional.empty(), []);

            // Then the move should succeed
            const expectedBoard: Table<YinshPiece> = [
                [N, N, N, N, N, N, _, _, _, _, N],
                [N, N, N, N, _, _, _, _, _, _, _],
                [N, N, N, A, _, _, _, _, _, _, _],
                [N, N, _, _, _, _, _, _, _, _, _],
                [N, _, _, _, _, _, _, _, _, _, _],
                [N, _, _, _, _, _, _, _, _, _, N],
                [_, _, _, _, _, _, _, _, _, _, N],
                [_, _, _, _, _, _, _, _, _, N, N],
                [_, _, _, _, _, _, _, _, N, N, N],
                [_, _, _, _, _, _, _, N, N, N, N],
                [N, _, _, _, _, N, N, N, N, N, N],
            ];
            const expectedState: YinshState = new YinshState(expectedBoard, PlayerNumberMap.of(4, 5), 1);
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
        });

        it('should initially forbid placing markers', () => {
            // Given the initial state
            const state: YinshState = YinshRules.get().getInitialState();

            // When trying to place a marker
            const move: YinshMove = new YinshMove([], new Coord(3, 3), MGPOptional.of(new Coord(3, 4)), []);

            // Then the move should be illegal
            const reason: string = YinshFailure.NO_MARKERS_IN_INITIAL_PHASE();
            RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
        });

        it('should forbid placing rings without moving after turn 10', () => {
            // Given a state at turn 10
            const state: YinshState =
                new YinshState(YinshRules.get().getInitialState().board, PlayerNumberMap.of(0, 0), 10);

            // When trying to place a ring
            const move: YinshMove = new YinshMove([], new Coord(3, 3), MGPOptional.empty(), []);

            // Then the move should be illegal
            const reason: string = YinshFailure.PLACEMENT_AFTER_INITIAL_PHASE();
            RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
        });

        it('should allow placing marker in a ring and then moving the ring after turn 10', () => {
            // Given a state after turn 10, with a ring on the board
            const board: Table<YinshPiece> = [
                [N, N, N, N, N, N, _, _, _, _, N],
                [N, N, N, N, _, _, _, _, _, _, _],
                [N, N, N, A, _, _, _, _, _, _, _],
                [N, N, _, _, _, _, _, _, _, _, _],
                [N, _, _, _, _, _, _, _, _, _, _],
                [N, _, _, _, _, _, _, _, _, _, N],
                [_, _, _, _, _, _, _, _, _, _, N],
                [_, _, _, _, _, _, _, _, _, N, N],
                [_, _, _, _, _, _, _, _, N, N, N],
                [_, _, _, _, _, _, _, N, N, N, N],
                [N, _, _, _, _, N, N, N, N, N, N],
            ];
            const state: YinshState = new YinshState(board, PlayerNumberMap.of(0, 0), 10);

            // When placing a marker and moving the ring
            const move: YinshMove = new YinshMove([], new Coord(3, 2), MGPOptional.of(new Coord(3, 3)), []);

            // Then the move should succeed
            const expectedBoard: Table<YinshPiece> = [
                [N, N, N, N, N, N, _, _, _, _, N],
                [N, N, N, N, _, _, _, _, _, _, _],
                [N, N, N, a, _, _, _, _, _, _, _],
                [N, N, _, A, _, _, _, _, _, _, _],
                [N, _, _, _, _, _, _, _, _, _, _],
                [N, _, _, _, _, _, _, _, _, _, N],
                [_, _, _, _, _, _, _, _, _, _, N],
                [_, _, _, _, _, _, _, _, _, N, N],
                [_, _, _, _, _, _, _, _, N, N, N],
                [_, _, _, _, _, _, _, N, N, N, N],
                [N, _, _, _, _, N, N, N, N, N, N],
            ];
            const expectedState: YinshState = new YinshState(expectedBoard, PlayerNumberMap.of(0, 0), 11);

            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
        });

        it('should forbid a move in an invalid direction', () => {
            // Given a state after turn 10 with a ring on the board
            const board: Table<YinshPiece> = [
                [N, N, N, N, N, N, _, _, _, _, N],
                [N, N, N, N, _, _, _, _, _, _, _],
                [N, N, N, A, _, _, _, _, _, _, _],
                [N, N, _, _, _, _, _, _, _, _, _],
                [N, _, _, _, _, _, _, _, _, _, _],
                [N, _, _, _, _, _, _, _, _, _, N],
                [_, _, _, _, _, _, _, _, _, _, N],
                [_, _, _, _, _, _, _, _, _, N, N],
                [_, _, _, _, _, _, _, _, N, N, N],
                [_, _, _, _, _, _, _, N, N, N, N],
                [N, _, _, _, _, N, N, N, N, N, N],
            ];
            const state: YinshState = new YinshState(board, PlayerNumberMap.of(0, 0), 10);

            // When placing a marker and trying to move the ring in an invalid direction
            const move: YinshMove = new YinshMove([], new Coord(3, 2), MGPOptional.of(new Coord(5, 8)), []);

            // Then the move should be illegal
            const reason: string = YinshFailure.MOVE_DIRECTION_INVALID();
            RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
        });

        it('should forbid a move that starts from an non-ring', () => {
            // Given a state after turn 10 with a ring on the board
            const board: Table<YinshPiece> = [
                [N, N, N, N, N, N, _, _, _, _, N],
                [N, N, N, N, _, _, _, _, _, _, _],
                [N, N, N, A, _, _, _, _, _, _, _],
                [N, N, _, _, _, _, _, _, _, _, _],
                [N, _, _, _, _, _, _, _, _, _, _],
                [N, _, _, _, _, _, _, _, _, _, N],
                [_, _, _, _, _, _, _, _, _, _, N],
                [_, _, _, _, _, _, _, _, _, N, N],
                [_, _, _, _, _, _, _, _, N, N, N],
                [_, _, _, _, _, _, _, N, N, N, N],
                [N, _, _, _, _, N, N, N, N, N, N],
            ];
            const state: YinshState = new YinshState(board, PlayerNumberMap.of(0, 0), 10);

            // When trying to move from an invalid position
            const move: YinshMove = new YinshMove([], new Coord(5, 5), MGPOptional.of(new Coord(3, 3)), []);

            // Then the move should be illegal
            const reason: string = YinshFailure.SHOULD_SELECT_PLAYER_RING();
            RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
        });

        it('should flip all markers on the path of the moved ring, but not the one that was placed in the ring', () => {
            // Given a state with some markers
            const board: Table<YinshPiece> = [
                [N, N, N, N, N, N, _, _, _, _, N],
                [N, N, N, N, _, _, _, _, _, _, _],
                [N, N, N, A, _, _, _, _, _, _, _],
                [N, N, _, a, _, _, _, _, _, _, _],
                [N, _, _, b, _, _, _, _, _, _, _],
                [N, _, _, _, _, _, _, _, _, _, N],
                [_, _, _, _, _, _, _, _, _, _, N],
                [_, _, _, _, _, _, _, _, _, N, N],
                [_, _, _, _, _, _, _, _, N, N, N],
                [_, _, _, _, _, _, _, N, N, N, N],
                [N, _, _, _, _, N, N, N, N, N, N],
            ];
            const state: YinshState = new YinshState(board, PlayerNumberMap.of(0, 0), 10);
            // When moving a ring over markers
            const move: YinshMove = new YinshMove([], new Coord(3, 2), MGPOptional.of(new Coord(3, 5)), []);

            // Then the move should succeed and flip all markers it went over
            const expectedBoard: Table<YinshPiece> = [
                [N, N, N, N, N, N, _, _, _, _, N],
                [N, N, N, N, _, _, _, _, _, _, _],
                [N, N, N, a, _, _, _, _, _, _, _],
                [N, N, _, b, _, _, _, _, _, _, _],
                [N, _, _, a, _, _, _, _, _, _, _],
                [N, _, _, A, _, _, _, _, _, _, N],
                [_, _, _, _, _, _, _, _, _, _, N],
                [_, _, _, _, _, _, _, _, _, N, N],
                [_, _, _, _, _, _, _, _, N, N, N],
                [_, _, _, _, _, _, _, N, N, N, N],
                [N, _, _, _, _, N, N, N, N, N, N],
            ];
            const expectedState: YinshState = new YinshState(expectedBoard, PlayerNumberMap.of(0, 0), 11);

            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
        });

        it('should allow moving above empty spaces as long as it lands after the first empty space following a marker', () => {
            // Given a state with some markers and a gap to the ring
            const board: Table<YinshPiece> = [
                [N, N, N, N, N, N, _, _, _, _, N],
                [N, N, N, N, _, _, _, _, _, _, _],
                [N, N, N, A, _, _, _, _, _, _, _],
                [N, N, _, _, _, _, _, _, _, _, _],
                [N, _, _, b, _, _, _, _, _, _, _],
                [N, _, _, a, _, _, _, _, _, _, N],
                [_, _, _, _, _, _, _, _, _, _, N],
                [_, _, _, _, _, _, _, _, _, N, N],
                [_, _, _, _, _, _, _, _, N, N, N],
                [_, _, _, _, _, _, _, N, N, N, N],
                [N, _, _, _, _, N, N, N, N, N, N],
            ];
            const state: YinshState = new YinshState(board, PlayerNumberMap.of(0, 0), 10);
            // When moving the ring over the empty space and then over markers
            const move: YinshMove = new YinshMove([], new Coord(3, 2), MGPOptional.of(new Coord(3, 6)), []);

            // Then the move should succeed
            const expectedBoard: Table<YinshPiece> = [
                [N, N, N, N, N, N, _, _, _, _, N],
                [N, N, N, N, _, _, _, _, _, _, _],
                [N, N, N, a, _, _, _, _, _, _, _],
                [N, N, _, _, _, _, _, _, _, _, _],
                [N, _, _, a, _, _, _, _, _, _, _],
                [N, _, _, b, _, _, _, _, _, _, N],
                [_, _, _, A, _, _, _, _, _, _, N],
                [_, _, _, _, _, _, _, _, _, N, N],
                [_, _, _, _, _, _, _, _, N, N, N],
                [_, _, _, _, _, _, _, N, N, N, N],
                [N, _, _, _, _, N, N, N, N, N, N],
            ];
            const expectedState: YinshState = new YinshState(expectedBoard, PlayerNumberMap.of(0, 0), 11);

            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
        });

        it('should forbid moving more than one space beyond the last marker of the group jumped', () => {
            // Given a state with some markers and a gap to the ring
            const board: Table<YinshPiece> = [
                [N, N, N, N, N, N, _, _, _, _, N],
                [N, N, N, N, _, _, _, _, _, _, _],
                [N, N, N, A, _, _, _, _, _, _, _],
                [N, N, _, _, _, _, _, _, _, _, _],
                [N, _, _, b, _, _, _, _, _, _, _],
                [N, _, _, a, _, _, _, _, _, _, N],
                [_, _, _, _, _, _, _, _, _, _, N],
                [_, _, _, _, _, _, _, _, _, N, N],
                [_, _, _, _, _, _, _, _, N, N, N],
                [_, _, _, _, _, _, _, N, N, N, N],
                [N, _, _, _, _, N, N, N, N, N, N],
            ];
            const state: YinshState = new YinshState(board, PlayerNumberMap.of(0, 0), 10);

            // When trying to move further than the first empty spot avec the markers
            const move: YinshMove = new YinshMove([], new Coord(3, 2), MGPOptional.of(new Coord(3, 7)), []);

            // Then the move should be illegal
            const reason: string = YinshFailure.MOVE_SHOULD_END_AT_FIRST_EMPTY_SPACE_AFTER_MARKERS();
            RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
        });

        it('should forbid moving over two sets of markers', () => {
            // Given a state with multiple groups of markers separated by empty spaces
            const board: Table<YinshPiece> = [
                [N, N, N, N, N, N, _, _, _, _, N],
                [N, N, N, N, _, _, _, _, _, _, _],
                [N, N, N, A, _, _, _, _, _, _, _],
                [N, N, _, _, _, _, _, _, _, _, _],
                [N, _, _, b, _, _, _, _, _, _, _],
                [N, _, _, a, _, _, _, _, _, _, N],
                [_, _, _, _, _, _, _, _, _, _, N],
                [_, _, _, a, _, _, _, _, _, N, N],
                [_, _, _, _, _, _, _, _, N, N, N],
                [_, _, _, _, _, _, _, N, N, N, N],
                [N, _, _, _, _, N, N, N, N, N, N],
            ];
            const state: YinshState = new YinshState(board, PlayerNumberMap.of(0, 0), 10);

            // When trying to move over all groups of markers
            const move: YinshMove = new YinshMove([], new Coord(3, 2), MGPOptional.of(new Coord(3, 8)), []);

            // Then the move should be illegal
            const reason: string = YinshFailure.MOVE_SHOULD_END_AT_FIRST_EMPTY_SPACE_AFTER_MARKERS();
            RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
        });

        it('should forbid moving over rings', () => {
            // Given a state with multiple aligned rings
            const board: Table<YinshPiece> = [
                [N, N, N, N, N, N, _, _, _, _, N],
                [N, N, N, N, _, _, _, _, _, _, _],
                [N, N, N, A, _, _, _, _, _, _, _],
                [N, N, _, _, _, _, _, _, _, _, _],
                [N, _, _, B, _, _, _, _, _, _, _],
                [N, _, _, a, _, _, _, _, _, _, N],
                [_, _, _, _, _, _, _, _, _, _, N],
                [_, _, _, _, _, _, _, _, _, N, N],
                [_, _, _, _, _, _, _, _, N, N, N],
                [_, _, _, _, _, _, _, N, N, N, N],
                [N, _, _, _, _, N, N, N, N, N, N],
            ];
            const state: YinshState = new YinshState(board, PlayerNumberMap.of(0, 0), 10);

            // When trying to move over a ring
            const move: YinshMove = new YinshMove([], new Coord(3, 2), MGPOptional.of(new Coord(3, 6)), []);

            // Then the move should be illegal
            const reason: string = YinshFailure.MOVE_SHOULD_NOT_PASS_ABOVE_RING();
            RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
        });

        it('should forbid captures that do not take a ring', () => {
            // Given a state with a possible capture
            const board: Table<YinshPiece> = [
                [N, N, N, N, N, N, _, _, _, _, N],
                [N, N, N, N, _, _, _, _, _, _, _],
                [N, N, N, A, _, _, _, _, _, _, _],
                [N, N, _, b, _, A, _, _, _, _, _],
                [N, _, _, b, _, _, _, _, _, _, _],
                [N, _, _, b, _, _, _, _, _, _, N],
                [_, _, _, b, _, _, _, _, _, _, N],
                [_, _, _, _, _, _, _, _, _, N, N],
                [_, _, _, _, _, _, _, _, N, N, N],
                [_, _, _, _, _, _, _, N, N, N, N],
                [N, _, _, _, _, N, N, N, N, N, N],
            ];
            const state: YinshState = new YinshState(board, PlayerNumberMap.of(0, 0), 10);

            // When performing a capture but not taking a ring
            const move: YinshMove = new YinshMove([],
                                                  new Coord(3, 2),
                                                  MGPOptional.of(new Coord(3, 7)),
                                                  [YinshCapture.of(new Coord(3, 2),
                                                                   new Coord(3, 6),
                                                                   MGPOptional.of(new Coord(6, 3)))]);
            // Then the move should be illegal
            const reason: string = YinshFailure.CAPTURE_SHOULD_TAKE_RING();
            RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);

        });

        it(`should allow captures, and should increase the capturing player's side rings by one when capturing`, () => {
            // Given a state with a possible capture
            const board: Table<YinshPiece> = [
                [N, N, N, N, N, N, _, _, _, _, N],
                [N, N, N, N, _, _, _, _, _, _, _],
                [N, N, N, A, _, _, _, _, _, _, _],
                [N, N, _, b, _, A, _, _, _, _, _],
                [N, _, _, b, _, _, _, _, _, _, _],
                [N, _, _, b, _, _, _, _, _, _, N],
                [_, _, _, b, _, _, _, _, _, _, N],
                [_, _, _, _, _, _, _, _, _, N, N],
                [_, _, _, _, _, _, _, _, N, N, N],
                [_, _, _, _, _, _, _, N, N, N, N],
                [N, _, _, _, _, N, N, N, N, N, N],
            ];
            const state: YinshState = new YinshState(board, PlayerNumberMap.of(0, 0), 10);
            // When performing a capture
            const move: YinshMove = new YinshMove([],
                                                  new Coord(3, 2),
                                                  MGPOptional.of(new Coord(3, 7)),
                                                  [YinshCapture.of(new Coord(3, 2),
                                                                   new Coord(3, 6),
                                                                   MGPOptional.of(new Coord(5, 3)))]);
            // Then the move should succeed
            const expectedBoard: Table<YinshPiece> = [
                [N, N, N, N, N, N, _, _, _, _, N],
                [N, N, N, N, _, _, _, _, _, _, _],
                [N, N, N, _, _, _, _, _, _, _, _],
                [N, N, _, _, _, _, _, _, _, _, _],
                [N, _, _, _, _, _, _, _, _, _, _],
                [N, _, _, _, _, _, _, _, _, _, N],
                [_, _, _, _, _, _, _, _, _, _, N],
                [_, _, _, A, _, _, _, _, _, N, N],
                [_, _, _, _, _, _, _, _, N, N, N],
                [_, _, _, _, _, _, _, N, N, N, N],
                [N, _, _, _, _, N, N, N, N, N, N],
            ];
            const expectedState: YinshState = new YinshState(expectedBoard, PlayerNumberMap.of(1, 0), 11);

            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
        });

        it('should support multiple captures', () => {
            // Given a state where more than one capture can happen in a single move
            const board: Table<YinshPiece> = [
                [N, N, N, N, N, N, _, _, _, _, N],
                [N, N, N, N, _, _, _, _, _, _, _],
                [N, N, N, a, a, A, A, A, _, _, _],
                [N, N, _, a, a, _, _, _, _, _, _],
                [N, _, _, a, a, _, _, _, _, _, _],
                [N, _, _, a, a, _, _, _, _, _, N],
                [_, _, _, a, a, _, _, _, _, _, N],
                [_, _, _, _, _, _, _, _, _, N, N],
                [_, _, _, _, _, _, _, _, N, N, N],
                [_, _, _, _, _, _, _, N, N, N, N],
                [N, _, _, _, _, N, N, N, N, N, N],
            ];
            const state: YinshState = new YinshState(board, PlayerNumberMap.of(0, 0), 10);
            // When performing multiple captures in one move
            const move: YinshMove = new YinshMove([
                YinshCapture.of(new Coord(3, 2), new Coord(3, 6), MGPOptional.of(new Coord(6, 2))),
                YinshCapture.of(new Coord(4, 2), new Coord(4, 6), MGPOptional.of(new Coord(7, 2))),
            ],
                                                  new Coord(5, 2), MGPOptional.of(new Coord(5, 3)),
                                                  []);
            // Then the move should succeed
            const expectedBoard: Table<YinshPiece> = [
                [N, N, N, N, N, N, _, _, _, _, N],
                [N, N, N, N, _, _, _, _, _, _, _],
                [N, N, N, _, _, a, _, _, _, _, _],
                [N, N, _, _, _, A, _, _, _, _, _],
                [N, _, _, _, _, _, _, _, _, _, _],
                [N, _, _, _, _, _, _, _, _, _, N],
                [_, _, _, _, _, _, _, _, _, _, N],
                [_, _, _, _, _, _, _, _, _, N, N],
                [_, _, _, _, _, _, _, _, N, N, N],
                [_, _, _, _, _, _, _, N, N, N, N],
                [N, _, _, _, _, N, N, N, N, N, N],
            ];
            const expectedState: YinshState = new YinshState(expectedBoard, PlayerNumberMap.of(2, 0), 11);

            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
        });

        it('should forbid not making initial captures when it is possible', () => {
            // Given a state with a capture that need to be done before placing a piece
            const board: Table<YinshPiece> = [
                [N, N, N, N, N, N, _, _, _, _, N],
                [N, N, N, N, _, _, _, _, _, _, _],
                [N, N, N, A, _, _, _, _, _, _, _],
                [N, N, _, a, _, _, _, _, _, _, _],
                [N, _, _, a, _, _, _, _, _, _, _],
                [N, _, _, a, _, _, _, _, _, _, N],
                [_, _, _, a, _, _, _, _, _, _, N],
                [_, _, _, a, _, _, _, _, _, N, N],
                [_, _, _, _, _, _, _, _, N, N, N],
                [_, _, _, _, _, _, _, N, N, N, N],
                [N, _, _, _, _, N, N, N, N, N, N],
            ];
            const state: YinshState = new YinshState(board, PlayerNumberMap.of(0, 0), 10);

            // When performing a move, but not capturing anything
            const move: YinshMove = new YinshMove([], new Coord(3, 2), MGPOptional.of(new Coord(4, 2)), []);

            // Then the move should be illegal
            const reason: string = YinshFailure.MISSING_CAPTURES();
            RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
        });

        it('should forbid not making final captures when it is possible', () => {
            // Given a state with a possible capture
            const board: Table<YinshPiece> = [
                [N, N, N, N, N, N, _, _, _, _, N],
                [N, N, N, N, _, _, _, _, _, _, _],
                [N, N, N, A, _, _, _, _, _, _, _],
                [N, N, _, b, _, _, _, _, _, _, _],
                [N, _, _, b, _, _, _, _, _, _, _],
                [N, _, _, b, _, _, _, _, _, _, N],
                [_, _, _, b, _, _, _, _, _, _, N],
                [_, _, _, _, _, _, _, _, _, N, N],
                [_, _, _, _, _, _, _, _, N, N, N],
                [_, _, _, _, _, _, _, N, N, N, N],
                [N, _, _, _, _, N, N, N, N, N, N],
            ];
            const state: YinshState = new YinshState(board, PlayerNumberMap.of(0, 0), 20);

            // When performing a move that would capture something, but without capturing anything
            const move: YinshMove = new YinshMove([], new Coord(3, 2), MGPOptional.of(new Coord(3, 7)), []);

            // Then the move should be illegal
            const reason: string = YinshFailure.MISSING_CAPTURES();
            RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
        });

        it(`should forbid capturing the opponent's markers`, () => {
            // Given some state
            const board: Table<YinshPiece> = [
                [N, N, N, N, N, N, _, _, _, _, N],
                [N, N, N, N, _, _, _, _, _, _, _],
                [N, N, N, A, A, _, _, _, _, _, _],
                [N, N, _, a, _, _, _, _, _, _, _],
                [N, _, _, a, _, _, _, _, _, _, _],
                [N, _, _, b, _, _, _, _, _, _, N],
                [_, _, _, a, _, _, _, _, _, _, N],
                [_, _, _, a, _, _, _, _, _, N, N],
                [_, _, _, _, _, _, _, _, N, N, N],
                [_, _, _, _, _, _, _, N, N, N, N],
                [N, _, _, _, _, N, N, N, N, N, N],
            ];
            const state: YinshState = new YinshState(board, PlayerNumberMap.of(0, 0), 10);

            // When aligning 5 of the opponent's markers and trying to capture them
            const move: YinshMove = new YinshMove([YinshCapture.of(new Coord(3, 3),
                                                                   new Coord(3, 7),
                                                                   MGPOptional.of(new Coord(4, 2)))],
                                                  new Coord(3, 2),
                                                  MGPOptional.of(new Coord(3, 3)),
                                                  []);
            // Then the move should be illegal
            const reason: string = YinshFailure.CAN_ONLY_CAPTURE_YOUR_MARKERS();
            RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
        });

        it('should forbid capturing empty spaces', () => {
            // Given some state
            const board: Table<YinshPiece> = [
                [N, N, N, N, N, N, _, _, _, _, N],
                [N, N, N, N, _, _, _, _, _, _, _],
                [N, N, N, A, A, _, _, _, _, _, _],
                [N, N, _, a, _, _, _, _, _, _, _],
                [N, _, _, a, _, _, _, _, _, _, _],
                [N, _, _, _, _, _, _, _, _, _, N],
                [_, _, _, a, _, _, _, _, _, _, N],
                [_, _, _, a, _, _, _, _, _, N, N],
                [_, _, _, _, _, _, _, _, N, N, N],
                [_, _, _, _, _, _, _, N, N, N, N],
                [N, _, _, _, _, N, N, N, N, N, N],
            ];
            const state: YinshState = new YinshState(board, PlayerNumberMap.of(0, 0), 10);

            // When performing a move that cannot capture anything, and yet trying to capture something
            const move: YinshMove = new YinshMove([YinshCapture.of(new Coord(3, 3),
                                                                   new Coord(3, 7),
                                                                   MGPOptional.of(new Coord(4, 2)))],
                                                  new Coord(3, 2),
                                                  MGPOptional.of(new Coord(4, 2)),
                                                  []);
            // Then the move should be illegal
            const reason: string = YinshFailure.CAN_ONLY_CAPTURE_YOUR_MARKERS();
            RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
        });

        it('should not allow making moves once victory has been reached');
    });

    describe('getPossibleCaptures', () => {

        it('should not consider rings as capturable pieces', () => {
            // Given a state with 5 player pieces aligned, but including rings
            const board: Table<YinshPiece> = [
                [N, N, N, N, N, N, _, _, _, _, N],
                [N, N, N, N, _, _, _, _, _, _, _],
                [N, N, N, A, A, _, _, _, _, _, _],
                [N, N, _, A, A, _, _, _, _, _, _],
                [N, _, _, A, _, _, _, _, _, _, _],
                [N, _, _, a, _, _, _, _, _, _, N],
                [_, _, _, a, _, _, _, _, _, _, N],
                [_, _, _, _, _, _, _, _, _, N, N],
                [_, _, _, _, _, _, _, _, N, N, N],
                [_, _, _, _, _, _, _, N, N, N, N],
                [N, _, _, _, _, N, N, N, N, N, N],
            ];
            const state: YinshState = new YinshState(board, PlayerNumberMap.of(0, 0), 10);
            // When looking for possible captures
            // Then there should be none
            expect(rules.getPossibleCaptures(state)).toEqual([]);
        });

        it('should not consider aligned markers of different players as capturable', () => {
            // Given a state with 5 markers aligned, but belonging to different players
            const board: Table<YinshPiece> = [
                [N, N, N, N, N, N, _, _, _, _, N],
                [N, N, N, N, N, _, _, _, _, _, _],
                [N, N, N, a, _, _, _, _, _, _, _],
                [N, _, _, a, _, _, _, _, _, _, _],
                [_, _, _, b, _, _, _, _, _, _, _],
                [N, _, _, a, _, _, _, _, _, _, N],
                [_, _, _, a, _, _, _, _, _, _, N],
                [_, _, _, _, _, _, _, _, _, N, N],
                [_, _, _, _, _, _, _, _, N, N, N],
                [_, _, _, _, _, _, _, N, N, N, N],
                [N, _, _, _, _, N, N, N, N, N, N],
            ];
            const state: YinshState = new YinshState(board, PlayerNumberMap.of(0, 0), 10);
            // When looking for possible captures
            // Then there should be none
            expect(rules.getPossibleCaptures(state)).toEqual([]);
        });

        it('should not consider 4 aligned markers as capturable', () => {
            // Given a state with 4 markers of the same players being aligned
            const board: Table<YinshPiece> = [
                [N, N, N, N, N, N, _, _, _, _, N],
                [N, N, N, N, _, _, _, _, _, _, _],
                [N, N, N, _, _, _, _, _, _, _, _],
                [N, N, _, a, _, _, _, _, _, _, _],
                [N, _, _, a, _, _, _, _, _, _, _],
                [N, _, _, a, _, _, _, _, _, _, N],
                [_, _, _, a, _, _, _, _, _, _, N],
                [_, _, _, _, _, _, _, _, _, N, N],
                [_, _, _, _, _, _, _, _, N, N, N],
                [_, _, _, _, _, _, _, N, N, N, N],
                [N, _, _, _, _, N, N, N, N, N, N],
            ];
            const state: YinshState = new YinshState(board, PlayerNumberMap.of(0, 0), 10);
            // When looking for possible captures
            // Then there should be none
            expect(rules.getPossibleCaptures(state)).toEqual([]);
        });

        it('should consider 5 aligned markers as capturable', () => {
            // Given a state with 5 aligned markers
            const board: Table<YinshPiece> = [
                [N, N, N, N, N, N, _, _, _, _, N],
                [N, N, N, N, _, _, _, _, _, _, _],
                [N, N, N, a, _, _, _, _, _, _, _],
                [N, N, _, a, _, _, _, _, _, _, _],
                [N, _, _, a, _, _, _, _, _, _, _],
                [N, _, _, a, _, _, _, _, _, _, N],
                [_, _, _, a, _, _, _, _, _, _, N],
                [_, _, _, A, _, _, _, _, _, N, N],
                [_, _, _, _, _, _, _, _, N, N, N],
                [_, _, _, _, _, _, _, N, N, N, N],
                [N, _, _, _, _, N, N, N, N, N, N],
            ];
            const state: YinshState = new YinshState(board, PlayerNumberMap.of(0, 0), 10);
            // When looking for possible captures
            // Then there should be exactly one capture
            const captures: YinshCapture[] = rules.getPossibleCaptures(state);
            const expectedCapture: YinshCapture = YinshCapture.of(new Coord(3, 2), new Coord(3, 6));
            expect(captures).toEqual([expectedCapture]);
        });

        it('should consider 6 aligned markers as two possible captures', () => {
            // Given a state with 6 aligned markers
            const board: Table<YinshPiece> = [
                [N, N, N, N, N, N, _, _, _, _, N],
                [N, N, N, N, _, _, _, _, _, _, _],
                [N, N, N, a, _, _, _, _, _, _, _],
                [N, N, _, a, _, _, _, _, _, _, _],
                [N, _, _, a, _, _, _, _, _, _, _],
                [N, _, _, a, _, _, _, _, _, _, N],
                [_, _, _, a, _, _, _, _, _, _, N],
                [_, _, _, a, _, _, _, _, _, N, N],
                [_, _, _, _, _, _, _, _, N, N, N],
                [_, _, _, _, _, _, _, N, N, N, N],
                [N, _, _, _, _, N, N, N, N, N, N],
            ];
            const state: YinshState = new YinshState(board, PlayerNumberMap.of(0, 0), 10);
            // When looking for possible captures
            const captures: YinshCapture[] = rules.getPossibleCaptures(state);
            // Then there should be exactly 2 captures
            expect(captures.length).toBe(2);
            expect(captures.some((c: YinshCapture): boolean =>
                c.equals(YinshCapture.of(new Coord(3, 2), new Coord(3, 6))))).toBeTrue();
            expect(captures.some((c: YinshCapture): boolean =>
                c.equals(YinshCapture.of(new Coord(3, 3), new Coord(3, 7))))).toBeTrue();
        });

        it('should detect diagonal capture', () => {
            // Given a board with diagonal captures
            const board: Table<YinshPiece> = [
                [N, N, N, N, N, N, _, _, _, _, N],
                [N, N, N, N, _, _, _, _, _, _, _],
                [N, N, N, _, _, _, _, _, b, _, _],
                [N, N, _, _, _, _, _, a, _, _, _],
                [N, _, _, _, _, _, a, _, _, _, _],
                [N, _, _, _, _, a, _, _, _, _, N],
                [_, _, _, _, a, _, _, _, _, _, N],
                [_, _, _, a, _, _, _, _, _, N, N],
                [_, _, b, _, _, _, _, _, N, N, N],
                [_, _, _, _, _, _, _, N, N, N, N],
                [N, _, _, _, _, N, N, N, N, N, N],
            ];
            const state: YinshState = new YinshState(board, PlayerNumberMap.of(0, 0), 10);
            // When looking for possible captures
            const captures: YinshCapture[] = rules.getPossibleCaptures(state);
            // Then there should be exactly one
            expect(captures.length).toBe(1);
        });

    });

    describe('getGameStatus', () => {

        it('should consider initial phase as ongoing', () => {
            const state: YinshState = YinshRules.get().getInitialState();
            expect(rules.getGameStatus(new YinshNode(state))).toBe(GameStatus.ONGOING);
        });

        it('should detect part after initial phase as ongoing if victory criterion is not met', () => {
            const state: YinshState =
                new YinshState(YinshRules.get().getInitialState().board, PlayerNumberMap.of(0, 0), 20);
            expect(rules.getGameStatus(new YinshNode(state))).toBe(GameStatus.ONGOING);
        });

        it('should detect victory for a player if it obtains more than 3 rings (Player.ZERO)', () => {
            const state: YinshState =
                new YinshState(YinshRules.get().getInitialState().board, PlayerNumberMap.of(3, 0), 20);
            const node: YinshNode = new YinshNode(state);
            RulesUtils.expectToBeVictoryFor(rules, node, Player.ZERO, defaultConfig);
        });

        it('should detect victory for a player if it obtains more than 3 rings (Player.ONE)', () => {
            const state: YinshState =
                new YinshState(YinshRules.get().getInitialState().board, PlayerNumberMap.of(0, 3), 20);
            const node: YinshNode = new YinshNode(state);
            RulesUtils.expectToBeVictoryFor(rules, node, Player.ONE, defaultConfig);
        });

    });

});
