/* eslint-disable max-lines-per-function */
import { TablutNode, TablutRules } from '../TablutRules';
import { TablutMove } from '../TablutMove';
import { Coord } from 'src/app/jscaip/Coord';
import { TaflPawn } from '../../TaflPawn';
import { Player } from 'src/app/jscaip/Player';
import { Table } from 'src/app/jscaip/TableUtils';
import { MGPOptional } from '@everyboard/lib';
import { RulesUtils } from 'src/app/jscaip/tests/RulesUtils.spec';
import { TaflFailure } from '../../TaflFailure';
import { TaflConfig } from '../../TaflConfig';
import { TaflState } from '../../TaflState';

describe('TablutRules', () => {

    let rules: TablutRules;
    const _: TaflPawn = TaflPawn.UNOCCUPIED;
    const O: TaflPawn = TaflPawn.PLAYER_ZERO_PAWN;
    const X: TaflPawn = TaflPawn.PLAYER_ONE_PAWN;
    const A: TaflPawn = TaflPawn.PLAYER_ONE_KING;
    const defaultConfig: MGPOptional<TaflConfig> = TablutRules.get().getDefaultRulesConfig();

    beforeEach(() => {
        rules = TablutRules.get();
    });

    it('should be created', () => {
        expect(rules).toBeTruthy();
    });

    it('Capture should work', () => {
        const board: Table<TaflPawn> = [
            [_, A, _, _, _, _, _, _, _],
            [_, O, O, _, _, _, _, _, _],
            [_, _, X, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
        ];
        const expectedBoard: Table<TaflPawn> = [
            [_, _, A, _, _, _, _, _, _],
            [_, O, _, _, _, _, _, _, _],
            [_, _, X, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
        ];
        const state: TaflState = new TaflState(board, 3);
        const move: TablutMove = TablutMove.from(new Coord(1, 0), new Coord(2, 0)).get();
        const expectedState: TaflState = new TaflState(expectedBoard, 4);
        RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
    });

    it('Capturing against empty throne should work', () => {
        const board: Table<TaflPawn> = [
            [_, O, _, A, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, O, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
        ];
        const expectedBoard: Table<TaflPawn> = [
            [_, _, A, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, O, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
        ];
        const state: TaflState = new TaflState(board, 3);
        const move: TablutMove = TablutMove.from(new Coord(3, 0), new Coord(2, 0)).get();
        const expectedState: TaflState = new TaflState(expectedBoard, 4);
        RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
    });

    it('Capturing king should require four invader and lead to victory', () => {
        const board: Table<TaflPawn> = [
            [_, _, O, _, _, _, _, _, _],
            [_, _, O, A, O, _, _, _, _],
            [_, _, _, O, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
        ];
        const expectedBoard: Table<TaflPawn> = [
            [_, _, _, O, _, _, _, _, _],
            [_, _, O, _, O, _, _, _, _],
            [_, _, _, O, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
        ];
        const state: TaflState = new TaflState(board, 0);
        const move: TablutMove = TablutMove.from(new Coord(2, 0), new Coord(3, 0)).get();
        const expectedState: TaflState = new TaflState(expectedBoard, 1);
        RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
        const node: TablutNode = new TablutNode(expectedState, undefined, MGPOptional.of(move));
        RulesUtils.expectToBeVictoryFor(rules, node, Player.ZERO, defaultConfig);
    });

    it('Capturing king should require three invader and an edge lead to victory', () => {
        const board: Table<TaflPawn> = [
            [_, _, O, A, O, _, _, _, _],
            [_, _, O, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
        ];
        const expectedBoard: Table<TaflPawn> = [
            [_, _, O, _, O, _, _, _, _],
            [_, _, _, O, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
        ];
        const state: TaflState = new TaflState(board, 0);
        const move: TablutMove = TablutMove.from(new Coord(2, 1), new Coord(3, 1)).get();
        const expectedState: TaflState = new TaflState(expectedBoard, 1);
        RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
        const node: TablutNode = new TablutNode(expectedState, undefined, MGPOptional.of(move));
        RulesUtils.expectToBeVictoryFor(rules, node, Player.ZERO, defaultConfig);
    });

    it('Capturing king with one soldier, one throne, and one edge should not work', () => {
        const board: Table<TaflPawn> = [
            [_, A, O, _, _, _, _, _, _],
            [_, _, O, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
        ];
        const expectedBoard: Table<TaflPawn> = [
            [_, A, O, _, _, _, _, _, _],
            [_, O, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
        ];
        const state: TaflState = new TaflState(board, 2);
        const move: TablutMove = TablutMove.from(new Coord(2, 1), new Coord(1, 1)).get();
        const expectedState: TaflState = new TaflState(expectedBoard, 3);
        RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
        const node: TablutNode = new TablutNode(expectedState, undefined, MGPOptional.of(move));
        // Then it should be considered as ongoing
        RulesUtils.expectToBeOngoing(rules, node, defaultConfig);
    });

    it('Sandwiching king against a throne should not work', () => {
        // Given a board where the king could be sandwiched against the throne
        const board: Table<TaflPawn> = [
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, O, _, _, _, _, _, _],
            [_, _, _, _, A, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
        ];
        const state: TaflState = new TaflState(board, 0);

        // When trying to sandwich
        const move: TablutMove = TablutMove.from(new Coord(2, 2), new Coord(4, 2)).get();

        // Then the move should succeed but the king alive, and the game ongoing
        const expectedBoard: Table<TaflPawn> = [
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, O, _, _, _, _],
            [_, _, _, _, A, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
        ];
        const expectedState: TaflState = new TaflState(expectedBoard, 1);
        const node: TablutNode = new TablutNode(expectedState, undefined, MGPOptional.of(move));
        RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
        RulesUtils.expectToBeOngoing(rules, node, defaultConfig);
    });

    it('Capturing king against a throne with 3 soldier should not work', () => {
        // Given a King about to be surrounded by 3 solder and a throne
        const board: Table<TaflPawn> = [
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, O, _, _, _, _, _, _],
            [_, _, _, O, A, O, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
        ];
        const state: TaflState = new TaflState(board, 12);

        // When attempting to surround him
        const move: TablutMove = TablutMove.from(new Coord(2, 2), new Coord(4, 2)).get();

        // Then the move should succeed but the king not captured, and the part ongoing
        const expectedBoard: Table<TaflPawn> = [
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, O, _, _, _, _],
            [_, _, _, O, A, O, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
        ];
        const expectedState: TaflState = new TaflState(expectedBoard, 13);
        const node: TablutNode = new TablutNode(expectedState, undefined, MGPOptional.of(move));
        RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
        RulesUtils.expectToBeOngoing(rules, node, defaultConfig);
    });

    it('should allow King to come back on the throne', () => {
        // Given a board where the king is not on their throne but can go back
        const board: TaflPawn[][] = [
            [_, _, O, _, _, _, _, _, _],
            [_, _, O, _, O, _, _, _, _],
            [_, _, _, O, _, _, _, _, _],
            [_, _, _, _, A, _, _, _, _],
            [_, _, _, X, _, X, _, _, _],
            [_, _, _, _, X, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
        ];
        const state: TaflState = new TaflState(board, 1);

        // When moving the king back to their throne
        const move: TablutMove = TablutMove.from(new Coord(4, 3), new Coord(4, 4)).get();

        // Then the move should succeed
        const expectedBoard: TaflPawn[][] = [
            [_, _, O, _, _, _, _, _, _],
            [_, _, O, _, O, _, _, _, _],
            [_, _, _, O, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, X, A, X, _, _, _],
            [_, _, _, _, X, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
        ];
        const expectedState: TaflState = new TaflState(expectedBoard, 2);
        RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
    });

    it('should forbid soldier to land on the central throne (4, 4)', () => {
        // Given a board where a soldier could reach the throne
        const board: Table<TaflPawn> = [
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, O, _, _, _, _, _],
            [_, _, _, _, A, _, _, _, _],
            [X, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
        ];
        const state: TaflState = new TaflState(board, 1);

        // When trying to sit on the king's throne
        const move: TablutMove = TablutMove.from(new Coord(0, 4), new Coord(4, 4)).get();

        // Then the move should be illegal
        const reason: string = TaflFailure.SOLDIERS_CANNOT_SIT_ON_THRONE();
        RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
    });

    it('should not sandwich the king far from throne', () => {
        // Given a board where the king is next to a corner and one move ahead from sandwich
        const board: TaflPawn[][] = [
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [O, _, _, X, _, X, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [A, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
        ];
        const state: TaflState = new TaflState(board, 2);

        // When trying to sandwiching the king
        const move: TablutMove = TablutMove.from(new Coord(0, 4), new Coord(0, 6)).get();

        // Then the move should succeed
        const expectedBoard: TaflPawn[][] = [
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, X, _, X, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [O, _, _, _, _, _, _, _, _],
            [A, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
        ];
        const expectedState: TaflState = new TaflState(expectedBoard, 3);
        RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
    });

});
