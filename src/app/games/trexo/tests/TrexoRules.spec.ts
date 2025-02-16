/* eslint-disable max-lines-per-function */
import { Coord } from 'src/app/jscaip/Coord';
import { Player } from 'src/app/jscaip/Player';
import { RulesUtils } from 'src/app/jscaip/tests/RulesUtils.spec';
import { ArrayUtils } from '@everyboard/lib';
import { TrexoFailure } from '../TrexoFailure';
import { TrexoMove } from '../TrexoMove';
import { TrexoNode, TrexoRules } from '../TrexoRules';
import { TrexoPiece, TrexoPieceStack, TrexoState } from '../TrexoState';
import { NoConfig } from 'src/app/jscaip/RulesConfigUtil';

const ______: TrexoPieceStack = TrexoPieceStack.EMPTY;
const O1__T0: TrexoPieceStack = TrexoPieceStack.of([new TrexoPiece(Player.ZERO, 0)]);
const O1__T1: TrexoPieceStack = TrexoPieceStack.of([new TrexoPiece(Player.ZERO, 1)]);
const O2__T2: TrexoPieceStack = TrexoPieceStack.of([
    new TrexoPiece(Player.ZERO, 0),
    new TrexoPiece(Player.ZERO, 2),
]);
const O1__T3: TrexoPieceStack = TrexoPieceStack.of([new TrexoPiece(Player.ZERO, 3)]);
const O1__T4: TrexoPieceStack = TrexoPieceStack.of([new TrexoPiece(Player.ZERO, 4)]);
const X1__T0: TrexoPieceStack = TrexoPieceStack.of([new TrexoPiece(Player.ONE, 0)]);
const X1__T1: TrexoPieceStack = TrexoPieceStack.of([new TrexoPiece(Player.ONE, 1)]);
const X2__T2: TrexoPieceStack = TrexoPieceStack.of([
    new TrexoPiece(Player.ONE, 0),
    new TrexoPiece(Player.ONE, 2),
]);
const X1__T3: TrexoPieceStack = TrexoPieceStack.of([new TrexoPiece(Player.ONE, 3)]);
const X1__T4: TrexoPieceStack = TrexoPieceStack.of([new TrexoPiece(Player.ONE, 4)]);

describe('TrexoRules', () => {

    let rules: TrexoRules;
    const defaultConfig: NoConfig = TrexoRules.get().getDefaultRulesConfig();

    beforeEach(() => {
        rules = TrexoRules.get();
    });

    it('should accept to drop piece on the floor', () => {
        // Given any board where two spaces on the floor are free
        const state: TrexoState = TrexoRules.get().getInitialState();

        // When dropping the piece
        const move: TrexoMove = TrexoMove.from(new Coord(4, 4), new Coord(4, 3)).get();

        // Then the move should succeed
        const expectedState: TrexoState = TrexoState.of([
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, X1__T0, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, O1__T0, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
        ], 1);
        RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
    });

    it('should refuse to drop piece on top of only one other piece', () => {
        // Given a board with a piece already on it
        const state: TrexoState = TrexoState.of([
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, X1__T0, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, O1__T0, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
        ], 1);

        // When dropping your piece over it
        const move: TrexoMove = TrexoMove.from(new Coord(4, 4), new Coord(4, 3)).get();

        // Then the move should be illegal
        const reason: string = TrexoFailure.CANNOT_DROP_ON_ONLY_ONE_PIECE();
        RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
    });

    it('should accept to drop piece on two other piece', () => {
        // Given a board with two pieces that are neighbor on it
        let LEFT: TrexoPiece[] = [new TrexoPiece(Player.ZERO, 0)];
        let RIGHT: TrexoPiece[] = [new TrexoPiece(Player.ZERO, 1)];
        const LEFT_0: TrexoPieceStack = TrexoPieceStack.of(LEFT);
        const RIGHT0: TrexoPieceStack = TrexoPieceStack.of(RIGHT);
        const state: TrexoState = TrexoState.of([
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, X1__T0, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, LEFT_0, RIGHT0, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, X1__T1, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
        ], 2);

        // When dropping the new piece partially on the first piece partially on the second
        const move: TrexoMove = TrexoMove.from(new Coord(4, 4), new Coord(5, 4)).get();

        // Then the move should succeed
        LEFT = ArrayUtils.copy(LEFT);
        RIGHT = ArrayUtils.copy(RIGHT);
        LEFT.push(new TrexoPiece(Player.ZERO, 2));
        RIGHT.push(new TrexoPiece(Player.ONE, 2));
        const LEFT_1: TrexoPieceStack = TrexoPieceStack.of(LEFT);
        const RIGHT1: TrexoPieceStack = TrexoPieceStack.of(RIGHT);
        const expectedState: TrexoState = TrexoState.of([
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, X1__T0, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, LEFT_1, RIGHT1, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, X1__T1, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
        ], 3);
        RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
    });

    it('should refuse dropping piece when both landing square are not on the same level', () => {
        // Given a board with one piece
        const state: TrexoState = TrexoState.of([
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, X1__T0, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, O1__T0, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
        ], 1);

        // When trying to drop another piece partially on it, partially on the floor
        const move: TrexoMove = TrexoMove.from(new Coord(4, 4), new Coord(5, 4)).get();

        // Then the move should be illegal
        const reason: string = TrexoFailure.CANNOT_DROP_PIECE_ON_UNEVEN_GROUNDS();
        RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
    });

    it('should declare as winner player who has a line of 5', () => {
        // Given a board where a player has a line of 4
        const state: TrexoState = TrexoState.of([
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, O1__T0, ______, O2__T2, ______, ______, ______, ______],
            [______, ______, ______, X1__T0, X1__T1, X2__T2, X1__T3, ______, ______, ______],
            [______, ______, ______, ______, O1__T1, ______, O1__T3, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
        ], 4);

        // When dropping to align 5 pieces of yours
        const move: TrexoMove = TrexoMove.from(new Coord(7, 2), new Coord(7, 3)).get();

        // Then you should be declared winner
        const expectedState: TrexoState = TrexoState.of([
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, O1__T0, ______, O2__T2, ______, O1__T4, ______, ______],
            [______, ______, ______, X1__T0, X1__T1, X2__T2, X1__T3, X1__T4, ______, ______],
            [______, ______, ______, ______, O1__T1, ______, O1__T3, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
        ], 5);
        const node: TrexoNode = new TrexoNode(expectedState);
        RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
        RulesUtils.expectToBeVictoryFor(rules, node, Player.ONE, defaultConfig);
        const victoryCoords: Coord[] = TrexoRules.getVictoriousCoords(expectedState);
        expect(victoryCoords.length).toBe(5);
    });

    it('should declare loser the player who align 5 piece of the opponent', () => {
        // Given a board where a player's opponent has a line of 4
        const state: TrexoState = TrexoState.of([
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, O1__T0, ______, O2__T2, ______, ______, ______, ______],
            [______, ______, ______, X1__T0, X1__T1, X2__T2, X1__T3, ______, ______, ______],
            [______, ______, ______, ______, O1__T1, ______, O1__T3, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
        ], 3);

        // When the drop aligns a fifth piece of the opponent
        const move: TrexoMove = TrexoMove.from(new Coord(7, 2), new Coord(7, 3)).get();

        // Then you should be declared loser
        const expectedState: TrexoState = TrexoState.of([
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, O1__T0, ______, O2__T2, ______, O1__T3, ______, ______],
            [______, ______, ______, X1__T0, X1__T1, X2__T2, X1__T3, X1__T3, ______, ______],
            [______, ______, ______, ______, O1__T1, ______, O1__T3, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
        ], 4);
        const node: TrexoNode = new TrexoNode(expectedState);
        RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
        RulesUtils.expectToBeVictoryFor(rules, node, Player.ONE, defaultConfig);
    });

    it('should declare loser the player who align 5 piece of both players', () => {
        // Given a board where two players have 4 pieces aligned
        const state: TrexoState = TrexoState.of([
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, O1__T0, O1__T1, O2__T2, O1__T3, ______, ______, ______],
            [______, ______, ______, X1__T0, X1__T1, X2__T2, X1__T3, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
        ], 4);

        // When the drop aligns a fifth piece of the opponent and yours
        const move: TrexoMove = TrexoMove.from(new Coord(7, 2), new Coord(7, 3)).get();

        // Then you should be declared loser
        const expectedState: TrexoState = TrexoState.of([
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, O1__T0, O1__T1, O2__T2, O1__T3, O1__T4, ______, ______],
            [______, ______, ______, X1__T0, X1__T1, X2__T2, X1__T3, X1__T4, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
            [______, ______, ______, ______, ______, ______, ______, ______, ______, ______],
        ], 5);
        const node: TrexoNode = new TrexoNode(expectedState);
        RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
        RulesUtils.expectToBeVictoryFor(rules, node, Player.ONE, defaultConfig);
        const victoryCoords: Coord[] = TrexoRules.getVictoriousCoords(expectedState);
        expect(victoryCoords.length).toBe(5);
    });

});
