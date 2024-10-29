/* eslint-disable max-lines-per-function */
import { QuartoConfig, QuartoNode, QuartoRules } from '../QuartoRules';
import { QuartoMove } from '../QuartoMove';
import { QuartoPiece } from '../QuartoPiece';
import { QuartoState } from '../QuartoState';
import { Table } from 'src/app/jscaip/TableUtils';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { RulesUtils } from 'src/app/jscaip/tests/RulesUtils.spec';
import { Player } from 'src/app/jscaip/Player';
import { QuartoFailure } from '../QuartoFailure';
import { MGPOptional } from '@everyboard/lib';

const AAAA: QuartoPiece = QuartoPiece.AAAA;
const AABA: QuartoPiece = QuartoPiece.AABA;
const AAAB: QuartoPiece = QuartoPiece.AAAB;
const AABB: QuartoPiece = QuartoPiece.AABB;
const ABAA: QuartoPiece = QuartoPiece.ABAA;
const ABAB: QuartoPiece = QuartoPiece.ABAB;
const ABBA: QuartoPiece = QuartoPiece.ABBA;
const ABBB: QuartoPiece = QuartoPiece.ABBB;
const BAAA: QuartoPiece = QuartoPiece.BAAA;
const BAAB: QuartoPiece = QuartoPiece.BAAB;
const BABA: QuartoPiece = QuartoPiece.BABA;
const BABB: QuartoPiece = QuartoPiece.BABB;
const BBAA: QuartoPiece = QuartoPiece.BBAA;
const BBAB: QuartoPiece = QuartoPiece.BBAB;
const BBBA: QuartoPiece = QuartoPiece.BBBA;
const BBBB: QuartoPiece = QuartoPiece.BBBB;
const ____: QuartoPiece = QuartoPiece.EMPTY;

describe('QuartoRules', () => {

    let rules: QuartoRules;
    const defaultConfig: MGPOptional<QuartoConfig> = QuartoRules.get().getDefaultRulesConfig();

    beforeEach(() => {
        rules = QuartoRules.get();
    });

    it('should create', () => {
        expect(rules).toBeTruthy();
    });

    it('should forbid not to give a piece when not last turn', () => {
        // Given a board that is not on last turn
        const state: QuartoState = QuartoRules.get().getInitialState(defaultConfig);

        // When giving no piece to next player
        const move: QuartoMove = new QuartoMove(0, 0, QuartoPiece.EMPTY);

        // Then the move should be illegal
        const reason: string = 'You must give a piece.';
        RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
    });

    it('should allow not to give a piece on last turn, and consider the game a draw if no one win', () => {
        // Given a board on last turn
        const board: Table<QuartoPiece> = [
            [AABB, AAAB, ABBA, BBAA],
            [BBAB, BAAA, BBBA, ABBB],
            [BABA, BBBB, ABAA, AABA],
            [AAAA, ABAB, BABB, ____],
        ];
        const state: QuartoState = new QuartoState(board, 15, BAAB);

        // When giving no piece
        const move: QuartoMove = new QuartoMove(3, 3, QuartoPiece.EMPTY);

        // Then the move should be deemed legal
        const expectedBoard: Table<QuartoPiece> = [
            [AABB, AAAB, ABBA, BBAA],
            [BBAB, BAAA, BBBA, ABBB],
            [BABA, BBBB, ABAA, AABA],
            [AAAA, ABAB, BABB, BAAB],
        ];
        const expectedState: QuartoState = new QuartoState(expectedBoard, 16, QuartoPiece.EMPTY);
        const node: QuartoNode = new QuartoNode(expectedState);
        RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
        RulesUtils.expectToBeDraw(rules, node, defaultConfig);
    });

    it('should forbid to give a piece already on the board', () => {
        // Given a board with AAAA on it
        const board: Table<QuartoPiece> = [
            [____, ____, ____, ____],
            [____, ____, ____, ____],
            [____, ____, ____, ____],
            [AAAA, ____, ____, ____],
        ];
        const state: QuartoState = new QuartoState(board, 1, AABA);

        // When giving AAAA to next player
        const move: QuartoMove = new QuartoMove(0, 0, AAAA);

        // Then the move should be illegal
        const reason: string = QuartoFailure.PIECE_ALREADY_ON_BOARD();
        RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
    });

    it('should forbid to give the piece that you had in your hand', () => {
        // Given any board
        const state: QuartoState = QuartoRules.get().getInitialState(defaultConfig);

        // When giving the piece you had in hand
        const move: QuartoMove = new QuartoMove(0, 0, AAAA);

        // Then the move should be illegal
        const reason: string = QuartoFailure.CANNOT_GIVE_PIECE_IN_HAND();
        RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
    });

    it('should forbid to play on occupied square', () => {
        // Given a board with occupied square
        const board: Table<QuartoPiece> = [
            [____, ____, ____, ____],
            [____, ____, ____, ____],
            [____, ____, ____, ____],
            [AAAA, ____, ____, ____],
        ];
        const state: QuartoState = new QuartoState(board, 1, AABA);

        // When playing on another square
        const move: QuartoMove = new QuartoMove(0, 3, BBAA);

        // Then the move should be illegal
        const reason: string = RulesFailure.MUST_LAND_ON_EMPTY_SPACE();
        RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
    });

    it('should allow simple move', () => {
        // Given a board
        const state: QuartoState = QuartoRules.get().getInitialState(defaultConfig);

        // When doing a simple move
        const move: QuartoMove = new QuartoMove(2, 2, AAAB);

        // Then the move should be deemed legal
        const expectedBoard: Table<QuartoPiece> = [
            [____, ____, ____, ____],
            [____, ____, ____, ____],
            [____, ____, AAAA, ____],
            [____, ____, ____, ____],
        ];
        const expectedState: QuartoState = new QuartoState(expectedBoard, 1, AAAB);
        RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
    });

    describe('victory', () => {

        it('should consider Player.ZERO winner when doing a full line (horizontal)', () => {
            // Given a board with 3 pieces aligned with common criterion
            const board: Table<QuartoPiece> = [
                [BBBB, BBBA, BBAB, ____],
                [____, ____, ____, ____],
                [____, ____, ____, ____],
                [AAAA, ____, ____, ____],
            ];
            const state: QuartoState = new QuartoState(board, 4, BBAA);

            // When aligning a fourth one
            const move: QuartoMove = new QuartoMove(3, 0, AAAB);

            // Then the game should be a victory for Player.ZERO
            const expectedBoard: Table<QuartoPiece> = [
                [BBBB, BBBA, BBAB, BBAA],
                [____, ____, ____, ____],
                [____, ____, ____, ____],
                [AAAA, ____, ____, ____],
            ];
            const expectedState: QuartoState = new QuartoState(expectedBoard, 5, AAAB);
            const node: QuartoNode = new QuartoNode(expectedState, MGPOptional.empty(), MGPOptional.of(move));

            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
            RulesUtils.expectToBeVictoryFor(rules, node, Player.ZERO, defaultConfig);
        });

        it('should consider Player.ONE winner when doing a full line (descending diagonal)', () => {
            // Given a board with 4 piece with common criterion aligned
            const board: Table<QuartoPiece> = [
                [AAAA, BAAA, BBAA, ____],
                [____, AAAB, ____, ____],
                [____, ____, AABB, ____],
                [____, ____, ____, AABA],
            ];
            const state: QuartoState = new QuartoState(board, 10, AABA);

            // When evaluating it's board status
            // Then it should be a victory for Player.ONE
            const node: QuartoNode = new QuartoNode(state);

            RulesUtils.expectToBeVictoryFor(rules, node, Player.ONE, defaultConfig);
        });

        it('should recognize ongoing games', () => {
            // Given an ongoing game
            const board: Table<QuartoPiece> = [
                [AAAA, ABBB, ABBB, ____],
                [____, ____, ____, BBBB],
                [____, ____, ____, AAAB],
                [____, ____, ____, AAAB],
            ];
            const state: QuartoState = new QuartoState(board, 9, BAAA);
            const node: QuartoNode = new QuartoNode(state);

            // When evaluating the board status
            // Then it should be considered as ongoing
            RulesUtils.expectToBeOngoing(rules, node, defaultConfig);
        });

    });

    describe('Level Two Config', () => {

        it('should allow player to make victory by strong level victory (square)', () => {
            // Given a config where both player are level 2 and Player.ONE made a square
            const alternateConfig: MGPOptional<QuartoConfig> = MGPOptional.of({
                playerZeroLevel: 2,
                playerOneLevel: 2,
            });
            const board: Table<QuartoPiece> = [
                [AAAA, AAAB, ____, ____],
                [AABA, AABB, ____, ____],
                [____, ____, ____, ____],
                [____, ____, ____, ____],
            ];
            const state: QuartoState = new QuartoState(board, 4, BAAA);
            const node: QuartoNode = new QuartoNode(state);

            // When evaluating the board status
            // Then that player should win
            RulesUtils.expectToBeVictoryFor(rules, node, Player.ONE, alternateConfig);
        });

        it('should give victory to player with stronger level when weaker level make a strong level victory (square)', () => {
            // Given a config where Player.ZERO is level 2 and Player.ONE is not but made a square anyway
            const alternateConfig: MGPOptional<QuartoConfig> = MGPOptional.of({
                playerZeroLevel: 2,
                playerOneLevel: 1,
            });
            const board: Table<QuartoPiece> = [
                [AAAA, AAAB, ____, ____],
                [AABA, AABB, ____, ____],
                [____, ____, ____, ____],
                [____, ____, ____, ____],
            ];
            const state: QuartoState = new QuartoState(board, 4, BAAA);
            const node: QuartoNode = new QuartoNode(state);

            // When evaluating the board status
            // Then Player.ZERO should win
            RulesUtils.expectToBeVictoryFor(rules, node, Player.ZERO, alternateConfig);
        });

        it('should give victory to player with stronger level when they do a strong level victory (square)', () => {
            // Given a config where Player.ONE is level 1 and Player.ZERO is level 2 and made a square
            const alternateConfig: MGPOptional<QuartoConfig> = MGPOptional.of({
                playerZeroLevel: 2,
                playerOneLevel: 1,
            });
            const board: Table<QuartoPiece> = [
                [AAAA, AAAB, ____, ____],
                [AABA, AABB, ____, ____],
                [____, ____, BBBB, ____],
                [____, ____, ____, ____],
            ];
            const state: QuartoState = new QuartoState(board, 5, BAAA);
            const node: QuartoNode = new QuartoNode(state);

            // When evaluating the board status
            // Then Player.ZERO should win
            RulesUtils.expectToBeVictoryFor(rules, node, Player.ZERO, alternateConfig);
        });

        it('shoud give victory to stronger level when weaker level make both a strong and weak victory at the same turn', () => {
            // Given a config where Player.ONE is level 2 and Player.ZERO is level 1 and just made a square and a line
            const alternateConfig: MGPOptional<QuartoConfig> = MGPOptional.of({
                playerZeroLevel: 1,
                playerOneLevel: 2,
            });
            const board: Table<QuartoPiece> = [
                [AAAA, AAAB, ____, ____],
                [AABA, AABB, ____, BBAA],
                [ABAA, ____, ____, ____],
                [ABAB, ____, ____, ____],
            ];
            const state: QuartoState = new QuartoState(board, 7, BAAA);
            const node: QuartoNode = new QuartoNode(state);

            // When evaluating the board status
            // Then Player.ONE should win
            RulesUtils.expectToBeVictoryFor(rules, node, Player.ONE, alternateConfig);
        });

        it('shoud give victory to weaker level when weaker level make a weak victory', () => {
            // Given a config where Player.ONE is level 2 and Player.ZERO is level 1 and made a line
            const alternateConfig: MGPOptional<QuartoConfig> = MGPOptional.of({
                playerZeroLevel: 1,
                playerOneLevel: 2,
            });
            const board: Table<QuartoPiece> = [
                [AAAA, ____, ____, ____],
                [AABA, ____, ____, ____],
                [ABAA, ____, AABB, ____],
                [ABAB, ____, ____, ____],
            ];
            const state: QuartoState = new QuartoState(board, 5, BAAA);
            const node: QuartoNode = new QuartoNode(state);

            // When evaluating the board status
            // Then Player.ZERO should win
            RulesUtils.expectToBeVictoryFor(rules, node, Player.ZERO, alternateConfig);
        });

    });

});
