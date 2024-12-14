/* eslint-disable max-lines-per-function */
import { MGPOptional } from '@everyboard/lib';

import { Coord } from 'src/app/jscaip/Coord';
import { Player } from 'src/app/jscaip/Player';
import { Table } from 'src/app/jscaip/TableUtils';
import { DvonnMove } from '../DvonnMove';
import { DvonnMoveGenerator } from '../DvonnMoveGenerator';
import { DvonnPieceStack } from '../DvonnPieceStack';
import { DvonnNode, DvonnRules } from '../DvonnRules';
import { DvonnState } from '../DvonnState';
import { NoConfig } from 'src/app/jscaip/RulesConfigUtil';

const N: DvonnPieceStack = DvonnPieceStack.UNREACHABLE;
const _: DvonnPieceStack = DvonnPieceStack.EMPTY;
const S: DvonnPieceStack = DvonnPieceStack.SOURCE;
const O: DvonnPieceStack = DvonnPieceStack.PLAYER_ZERO;
const OO: DvonnPieceStack = new DvonnPieceStack(Player.ZERO, 2, false);
const OOO: DvonnPieceStack = new DvonnPieceStack(Player.ZERO, 3, false);
const X: DvonnPieceStack = DvonnPieceStack.PLAYER_ONE;
const XS: DvonnPieceStack = new DvonnPieceStack(Player.ONE, 2, true);
const XX: DvonnPieceStack = new DvonnPieceStack(Player.ONE, 2, false);
const XSX: DvonnPieceStack = new DvonnPieceStack(Player.ONE, 3, true);
const X5: DvonnPieceStack = new DvonnPieceStack(Player.ONE, 5, false);
const X6: DvonnPieceStack = new DvonnPieceStack(Player.ONE, 6, false);
const XS6: DvonnPieceStack = new DvonnPieceStack(Player.ONE, 6, true);
const O6: DvonnPieceStack = new DvonnPieceStack(Player.ZERO, 6, false);
const OS6: DvonnPieceStack = new DvonnPieceStack(Player.ZERO, 6, true);

describe('DvonnMoveGenerator', () => {

    let rules: DvonnRules;
    let moveGenerator: DvonnMoveGenerator;
    const defaultConfig: NoConfig = DvonnRules.get().getDefaultRulesConfig();

    beforeEach(() => {
        rules = DvonnRules.get();
        moveGenerator = new DvonnMoveGenerator();
    });

    it('should propose 41 moves at first turn on the balanced board', () => {
        const node: DvonnNode = rules.getInitialNode(defaultConfig);
        expect(moveGenerator.getListMoves(node, defaultConfig).length).toBe(41);
    });

    it('should only propose moves to occupied spaces', () => {
        const board: Table<DvonnPieceStack> = [
            [N, N, O, X, _, X, O, _, X, S, X],
            [N, X, X, O, O, O, X, X, O, X, X],
            [X, X, X, _, O, S, _, O, O, O, O],
            [O, _, X, O, O, _, X, X, O, O, N],
            [O, S, O, X, X, O, O, O, X, N, N],
        ];
        const state: DvonnState = new DvonnState(board, 0, false);
        const node: DvonnNode = new DvonnNode(state);
        const moves: DvonnMove[] = moveGenerator.getListMoves(node, defaultConfig);
        for (const move of moves) {
            expect(state.getPieceAt(move.getEnd()).isEmpty()).toBeFalse();
        }
    });

    it('should only propose moves to occupied spaces, variant', () => {
        const board: Table<DvonnPieceStack> = [
            [N, N, OO, X, _, _, _, _, _, _, _],
            [N, OOO, XS, O, O, _, _, S, _, _, _],
            [XX, X, X, _, O, _, _, XX, _, _, _],
            [O, _, X, OOO, O, _, _, _, _, _, N],
            [O, S, O, X, X, O, _, _, _, N, N],
        ];
        const state: DvonnState = new DvonnState(board, 0, false);
        const node: DvonnNode = new DvonnNode(state);
        const moves: DvonnMove[] = moveGenerator.getListMoves(node, defaultConfig);
        for (const move of moves) {
            expect(state.getPieceAt(move.getEnd()).isEmpty()).toBeFalse();
        }
    });

    it('should move stacks as a whole, by as many spaces as there are pieces in the stack', () => {
        const board: Table<DvonnPieceStack> = [
            [N, N, OO, X, _, _, _, _, _, _, _],
            [N, OOO, XS, O, O, _, _, S, _, _, _],
            [XX, X, X, _, O, _, _, XX, _, _, _],
            [O, _, X, OOO, O, _, _, _, _, _, N],
            [O, S, O, X, X, O, _, _, _, N, N],
        ];
        const state: DvonnState = new DvonnState(board, 0, false);
        const node: DvonnNode = new DvonnNode(state);
        const moves: DvonnMove[] = moveGenerator.getListMoves(node, defaultConfig);
        for (const move of moves) {
            expect(move.length()).toEqual(state.getPieceAt(move.getStart()).getSize());
        }
    });

    it('should not allow generate moves of a single red piece, but move stacks with red pieces within it', () => {
        const board: Table<DvonnPieceStack> = [
            [N, N, OO, X, _, _, _, _, _, _, _],
            [N, OOO, XS, O, O, _, _, S, _, _, _],
            [XX, X, X, _, O, _, _, XX, _, _, _],
            [O, _, XSX, OOO, O, _, _, _, _, _, N],
            [O, S, O, X, X, O, _, _, _, N, N],
        ];
        const state: DvonnState = new DvonnState(board, 0, false);
        const node: DvonnNode = new DvonnNode(state);
        const moves: DvonnMove[] = moveGenerator.getListMoves(node, defaultConfig);
        for (const move of moves) {
            const stack: DvonnPieceStack = state.getPieceAt(move.getStart());
            // every movable piece should belong to the current player
            expect(stack.belongsTo(state.getCurrentPlayer())).toBeTrue();
        }
    });

    it('should generate PASS when it is the only possible move', () => {
        const board: Table<DvonnPieceStack> = [
            [N, N, OO, _, _, _, _, _, _, _, _],
            [N, _, S, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, N],
            [_, _, _, _, _, _, _, _, _, N, N],
        ];
        const state: DvonnState = new DvonnState(board, 0, false);
        const node: DvonnNode = new DvonnNode(state);
        const moves: DvonnMove[] = moveGenerator.getListMoves(node, defaultConfig);
        expect(moves.length).toEqual(1);
        expect(moves[0]).toEqual(DvonnMove.PASS);
    });

    it('should not generate any move when the game is finished', () => {
        const board: Table<DvonnPieceStack> = [
            [N, N, OO, _, _, _, _, _, _, _, _],
            [N, _, S, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, N],
            [_, _, _, _, _, _, _, _, _, N, N],
        ];
        const state: DvonnState = new DvonnState(board, 10, true);
        const node: DvonnNode = new DvonnNode(state, MGPOptional.empty(), MGPOptional.of(DvonnMove.PASS));
        expect(moveGenerator.getListMoves(node, defaultConfig).length).toEqual(0);
    });

    it('should still generate moves when possible', () => {
        const board: Table<DvonnPieceStack> = [
            [N, N, _, _, _, _, _, _, _, XS6, _],
            [N, _, _, X6, OO, _, X5, _, _, _, _],
            [_, _, _, _, O, XS6, O6, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, N],
            [_, OS6, _, _, _, _, _, _, _, N, N],
        ];
        const state: DvonnState = new DvonnState(board, 11, true);
        const move: DvonnMove = DvonnMove.from(new Coord(1, 3), new Coord(1, 4)).get();
        const node: DvonnNode = new DvonnNode(state,
                                              MGPOptional.empty(),
                                              MGPOptional.of(move));
        expect(moveGenerator.getListMoves(node, defaultConfig).length).toEqual(1);
    });

});
