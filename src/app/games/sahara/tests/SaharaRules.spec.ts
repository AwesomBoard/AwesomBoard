/* eslint-disable max-lines-per-function */
import { Coord, CoordFailure } from 'src/app/jscaip/Coord';
import { SaharaNode, SaharaRules } from '../SaharaRules';
import { SaharaMove } from '../SaharaMove';
import { SaharaState } from '../SaharaState';
import { TriangularCheckerBoard } from 'src/app/jscaip/state/TriangularCheckerBoard';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { RulesUtils } from 'src/app/jscaip/tests/RulesUtils.spec';
import { Player } from 'src/app/jscaip/Player';
import { FourStatePiece } from 'src/app/jscaip/FourStatePiece';
import { SaharaFailure } from '../SaharaFailure';
import { NoConfig } from 'src/app/jscaip/RulesConfigUtil';

describe('SaharaRules', () => {

    const N: FourStatePiece = FourStatePiece.UNREACHABLE;
    const O: FourStatePiece = FourStatePiece.ZERO;
    const X: FourStatePiece = FourStatePiece.ONE;
    const _: FourStatePiece = FourStatePiece.EMPTY;

    let rules: SaharaRules;
    const defaultConfig: NoConfig = SaharaRules.get().getDefaultRulesConfig();

    beforeEach(() => {
        rules = SaharaRules.get();
    });

    it('SaharaRules should be created', () => {
        expect(rules).toBeTruthy();
    });

    it('TriangularCheckerBoard should always give 3 neighbors', () => {
        const state: SaharaState = rules.getInitialState();
        for (const coordAndContent of state.getCoordsAndContents()) {
            const coord: Coord = coordAndContent.coord;
            expect(TriangularCheckerBoard.getNeighbors(coord).length).toBe(3);
        }
    });

    it('Bouncing on occupied space should be illegal', () => {
        // Given a board where two piece are neighbor
        const state: SaharaState = SaharaRules.get().getInitialState();

        // When trying to rebound on occupied piece
        const move: SaharaMove = SaharaMove.from(new Coord(7, 0), new Coord(8, 1)).get();

        // Then the move should be illegal
        const reason: string = SaharaFailure.CAN_ONLY_REBOUND_ON_EMPTY_SPACE();
        RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
    });

    it('should forbid move starting out of range', () => {
        // Given any board
        const state: SaharaState = rules.getInitialState();

        // When attempting a move starting out of board
        const start: Coord = new Coord(-1, 0);
        const end: Coord = new Coord(0, 0);
        const move: SaharaMove = SaharaMove.from(start, end).get();

        // Then the move should be illegal
        const reason: string = CoordFailure.OUT_OF_RANGE(start);
        RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
    });

    it('should forbid move ending out of range', () => {
        // Given any board
        const state: SaharaState = rules.getInitialState();

        // When attempting a move ending out of board
        const start: Coord = new Coord(0, 0);
        const end: Coord = new Coord(-1, 0);
        const move: SaharaMove = SaharaMove.from(start, end).get();

        // Then the move should be illegal
        const reason: string = CoordFailure.OUT_OF_RANGE(end);
        RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
    });

    it('should forbid moving opponent piece', () => {
        const state: SaharaState = SaharaRules.get().getInitialState();
        const move: SaharaMove = SaharaMove.from(new Coord(3, 0), new Coord(4, 0)).get();

        // Then the move should be illegal
        const reason: string = RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_OPPONENT();
        RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
    });

    it('should see that Player.ONE won', () => {
        const board: FourStatePiece[][] = [
            [N, N, O, _, _, _, X, O, X, N, N],
            [N, _, _, _, _, _, _, _, _, _, N],
            [X, _, _, _, _, _, _, _, _, _, O],
            [O, _, _, _, _, _, _, _, _, _, X],
            [N, _, _, _, _, _, _, _, _, _, N],
            [N, N, X, O, _, _, _, X, O, N, N],
        ];
        const state: SaharaState = new SaharaState(board, 4);
        const node: SaharaNode = new SaharaNode(state);
        RulesUtils.expectToBeVictoryFor(rules, node, Player.ONE, defaultConfig);
    });

});
