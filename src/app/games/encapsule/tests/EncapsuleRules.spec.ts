/* eslint-disable max-lines-per-function */
import { EncapsuleConfig, EncapsuleNode, EncapsuleRules } from '../EncapsuleRules';
import { EncapsuleMove } from '../EncapsuleMove';
import { Coord } from 'src/app/jscaip/Coord';
import { EncapsuleRemainingPieces, EncapsuleSpace, EncapsuleState } from '../EncapsuleState';
import { Player } from 'src/app/jscaip/Player';
import { EncapsulePiece } from '../EncapsulePiece';
import { MGPMap, MGPOptional } from '@everyboard/lib';
import { RulesUtils } from 'src/app/jscaip/tests/RulesUtils.spec';
import { EncapsuleFailure } from '../EncapsuleFailure';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { Table } from 'src/app/jscaip/TableUtils';

describe('EncapsuleRules', () => {

    let rules: EncapsuleRules;
    const defaultConfig: MGPOptional<EncapsuleConfig> = EncapsuleRules.get().getDefaultRulesConfig();

    const smallDark: EncapsulePiece = EncapsulePiece.ofSizeAndPlayer(1, Player.ZERO);
    const mediumDark: EncapsulePiece = EncapsulePiece.ofSizeAndPlayer(2, Player.ZERO);
    const bigDark: EncapsulePiece = EncapsulePiece.ofSizeAndPlayer(3, Player.ZERO);
    const smallLight: EncapsulePiece = EncapsulePiece.ofSizeAndPlayer(1, Player.ONE);
    const mediumLight: EncapsulePiece = EncapsulePiece.ofSizeAndPlayer(2, Player.ONE);
    const bigLight: EncapsulePiece = EncapsulePiece.ofSizeAndPlayer(3, Player.ONE);
    const ___: EncapsuleSpace = new EncapsuleSpace(new MGPMap());
    const X__: EncapsuleSpace = ___.put(smallLight);
    const _X_: EncapsuleSpace = ___.put(mediumLight);
    const __X: EncapsuleSpace = ___.put(bigLight);
    const O__: EncapsuleSpace = ___.put(smallDark);
    const _O_: EncapsuleSpace = ___.put(mediumDark);
    const __O: EncapsuleSpace = ___.put(bigDark);
    const XO_: EncapsuleSpace = ___.put(smallLight).put(mediumDark);

    beforeEach(() => {
        rules = EncapsuleRules.get();
    });

    it('should be created', () => {
        expect(rules).toBeTruthy();
    });

    it('should detect victory', () => {
        // Given a board with three pieces owned by player zero in a row
        const board: EncapsuleSpace[][] = [
            [O__, ___, ___],
            [___, _O_, ___],
            [___, ___, __O],
        ];
        const remainingPieces: EncapsuleRemainingPieces = rules.getEncapsulePieceMapFrom([2, 2, 2], [0, 1, 2]);
        const state: EncapsuleState = new EncapsuleState(board, 2, remainingPieces, 3);
        const node: EncapsuleNode = new EncapsuleNode(state);
        // When evaluating it
        // Then it should be a victory
        RulesUtils.expectToBeVictoryFor(rules, node, Player.ZERO, defaultConfig);
    });

    it('should not consider a non-victory as a victory', () => {
        // Given a board that is an ongoing part
        const board: EncapsuleSpace[][] = [
            [O__, ___, ___],
            [___, _X_, ___],
            [___, ___, __X],
        ];
        const remainingPieces: EncapsuleRemainingPieces = rules.getEncapsulePieceMapFrom([1, 2, 2], [2, 1, 1]);
        const state: EncapsuleState = new EncapsuleState(board, 2, remainingPieces, 3);
        const node: EncapsuleNode = new EncapsuleNode(state);

        // When evaluating it
        // Then it should be considered as ongoing
        RulesUtils.expectToBeOngoing(rules, node, defaultConfig);
    });

    it('should know winner even when he was not playing', () => {
        // Given a board on which active player could lose by acting
        const board: EncapsuleSpace[][] = [
            [XO_, ___, ___],
            [___, _X_, ___],
            [___, ___, __X],
        ];
        const remainingPieces: EncapsuleRemainingPieces = rules.getEncapsulePieceMapFrom([2, 1, 2], [1, 1, 1]);
        const state: EncapsuleState = new EncapsuleState(board, 2, remainingPieces, 3);

        // When doing that "actively losing move"
        const move: EncapsuleMove = EncapsuleMove.ofMove(new Coord(0, 0), new Coord(1, 0));

        // Then the active player should have lost
        const expectedBoard: EncapsuleSpace[][] = [
            [X__, _O_, ___],
            [___, _X_, ___],
            [___, ___, __X],
        ];
        const expectedState: EncapsuleState = new EncapsuleState(expectedBoard, 3, remainingPieces, 3);

        RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
        const node: EncapsuleNode = new EncapsuleNode(expectedState, MGPOptional.empty(), MGPOptional.of(move));
        RulesUtils.expectToBeVictoryFor(rules, node, Player.ONE, defaultConfig);
    });

    it('should allow moving pieces on empty coord', () => {
        // Given a board with piece on it
        const board: EncapsuleSpace[][] = [
            [O__, ___, ___],
            [___, X__, ___],
            [___, ___, ___],
        ];
        const remainingPieces: EncapsuleRemainingPieces = rules.getEncapsulePieceMapFrom([1, 2, 2], [1, 2, 2]);
        const state: EncapsuleState = new EncapsuleState(board, 2, remainingPieces, 3);

        // When moving a single piece elsewhere
        const move: EncapsuleMove = EncapsuleMove.ofMove(new Coord(0, 0), new Coord(2, 2));

        // Then the piece should have been moved
        const expectedBoard: EncapsuleSpace[][] = [
            [___, ___, ___],
            [___, X__, ___],
            [___, ___, O__],
        ];
        const expectedState: EncapsuleState = new EncapsuleState(expectedBoard, 3, remainingPieces, 3);
        RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
    });

    it('should allow moving piece on a smaller piece', () => {
        // Given a board with small and bigger piece on it
        const board: EncapsuleSpace[][] = [
            [_O_, ___, ___],
            [___, ___, ___],
            [___, ___, X__],
        ];
        const remainingPieces: EncapsuleRemainingPieces = rules.getEncapsulePieceMapFrom([2, 2, 2], [1, 2, 2]);
        const state: EncapsuleState = new EncapsuleState(board, 2, remainingPieces, 3);

        // When moving a single piece elsewhere
        const move: EncapsuleMove = EncapsuleMove.ofMove(new Coord(0, 0), new Coord(2, 2));

        // Then the piece should have been moved over the smaller one
        const expectedBoard: EncapsuleSpace[][] = [
            [___, ___, ___],
            [___, ___, ___],
            [___, ___, XO_],
        ];
        const expectedState: EncapsuleState = new EncapsuleState(expectedBoard, 3, remainingPieces, 3);
        RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
    });

    it('should forbid dropping pieces on a piece with the same size', () => {
        // Given a board with a piece already put
        const board: EncapsuleSpace[][] = [
            [O__, ___, ___],
            [___, ___, ___],
            [___, ___, ___],
        ];
        const remainingPieces: EncapsuleRemainingPieces = rules.getEncapsulePieceMapFrom([1, 2, 2], [2, 1, 1]);
        const state: EncapsuleState = new EncapsuleState(board, 2, remainingPieces, 3);

        // When trying to drop another piece of the same size
        const piece: EncapsulePiece = EncapsulePiece.ofSizeAndPlayer(1, Player.ZERO);
        const move: EncapsuleMove = EncapsuleMove.ofDrop(piece, new Coord(0, 0));

        // Then the move should be illegal
        const reason: string = EncapsuleFailure.INVALID_PLACEMENT();
        RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
    });

    it('should forbid dropping a piece on a bigger piece', () => {
        const board: EncapsuleSpace[][] = [
            [__X, ___, ___],
            [___, ___, ___],
            [___, ___, ___],
        ];
        const remainingPieces: EncapsuleRemainingPieces = rules.getEncapsulePieceMapFrom([1, 1, 1], [2, 2, 2]);
        const state: EncapsuleState = new EncapsuleState(board, 2, remainingPieces, 3);
        const piece: EncapsulePiece = EncapsulePiece.ofSizeAndPlayer(1, Player.ZERO);
        const move: EncapsuleMove = EncapsuleMove.ofDrop(piece, new Coord(0, 0));
        const reason: string = EncapsuleFailure.INVALID_PLACEMENT();

        // Then the move should be illegal
        RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
    });

    it('should refuse to put three identical piece on the board', () => {
        // Given a board with no more SMALL_LIGHT available for drop
        const board: EncapsuleSpace[][] = [
            [O__, ___, ___],
            [___, _X_, ___],
            [___, ___, ___],
        ];
        const remainingPieces: EncapsuleRemainingPieces = rules.getEncapsulePieceMapFrom([], []);
        const state: EncapsuleState = new EncapsuleState(board, 3, remainingPieces, 3);

        // When trying to drop one
        const piece: EncapsulePiece = EncapsulePiece.ofSizeAndPlayer(1, Player.ONE);
        const move: EncapsuleMove = EncapsuleMove.ofDrop(piece, new Coord(2, 2));

        // Then the move should be illegal
        const reason: string = EncapsuleFailure.PIECE_OUT_OF_STOCK();
        RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
    });

    it('should refuse to move small piece on bigger piece', () => {
        // Given a board with a big piece already put
        const board: EncapsuleSpace[][] = [
            [O__, ___, ___],
            [___, _X_, ___],
            [___, ___, ___],
        ];
        const remainingPieces: EncapsuleRemainingPieces = rules.getEncapsulePieceMapFrom([1, 2, 2], [2, 1, 2]);
        const state: EncapsuleState = new EncapsuleState(board, 2, remainingPieces, 3);
        // When trying to put another piece on it
        const move: EncapsuleMove = EncapsuleMove.ofMove(new Coord(0, 0), new Coord(1, 1));

        // Then the move should be illegal
        const reason: string = EncapsuleFailure.INVALID_PLACEMENT();
        RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
    });

    it('should refuse to drop opponent piece on the board', () => {
        // Given any board
        const state: EncapsuleState = EncapsuleRules.get().getInitialState(defaultConfig);

        // When trying to drop a piece of the opponent
        const piece: EncapsulePiece = EncapsulePiece.ofSizeAndPlayer(1, Player.ONE);
        const move: EncapsuleMove = EncapsuleMove.ofDrop(piece, new Coord(2, 2));

        // Then the move should be illegal
        const reason: string = RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_OPPONENT();
        RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
    });

    it('should refuse to move opponent piece', () => {
        // Given a board with at least a piece of the opponent
        const board: Table<EncapsuleSpace> = [
            [O__, ___, ___],
            [___, _X_, ___],
            [___, ___, ___],
        ];
        const remainingPieces: EncapsuleRemainingPieces = rules.getEncapsulePieceMapFrom([1, 2, 2], [2, 1, 2]);
        const state: EncapsuleState = new EncapsuleState(board, 2, remainingPieces, 3);

        // When trying to move the opponent's piece
        const move: EncapsuleMove = EncapsuleMove.ofMove(new Coord(1, 1), new Coord(2, 2));

        // Then the move should be illegal
        const reason: string = RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_OPPONENT();
        RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
    });

    it('should refuse to drop nothing', () => {
        // Given any board
        const state: EncapsuleState = EncapsuleRules.get().getInitialState(defaultConfig);

        // When trying to drop "nothing"
        const move: EncapsuleMove = EncapsuleMove.ofDrop(EncapsulePiece.NONE, new Coord(2, 2));

        // Then the move should be illegal
        const reason: string = RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_EMPTY();
        RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
    });

    it('should refuse to move from an empty space', () => {
        // Given any board
        const state: EncapsuleState = EncapsuleRules.get().getInitialState(defaultConfig);

        // When trying to drop "nothing"
        const move: EncapsuleMove = EncapsuleMove.ofMove(new Coord(1, 1), new Coord(2, 2));

        // Then the move should be illegal
        const reason: string = RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_EMPTY();
        RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
    });

    describe('Custom Config', () => {

        it('should detect victory', () => {
            // Given a large board with three pieces owned by player zero in a row
            const customConfig: MGPOptional<EncapsuleConfig> = MGPOptional.of({
                ...defaultConfig.get(),
                width: 5,
                height: 5,
            });
            const board: EncapsuleSpace[][] = [
                [___, ___, ___, ___, ___],
                [___, ___, ___, ___, ___],
                [___, ___, O__, ___, ___],
                [X__, ___, ___, _O_, ___],
                [___, ___, ___, ___, __O],
            ];
            const remainingPieces: EncapsuleRemainingPieces = rules.getEncapsulePieceMapFrom([1, 1, 1], [1, 2, 2]);
            const state: EncapsuleState = new EncapsuleState(board, 2, remainingPieces, 3);
            const node: EncapsuleNode = new EncapsuleNode(state);
            // When evaluating it
            // Then it should be a victory
            RulesUtils.expectToBeVictoryFor(rules, node, Player.ZERO, customConfig);
        });

    });

});
