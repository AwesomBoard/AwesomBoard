/* eslint-disable max-lines-per-function */
import { MGPOptional } from '@everyboard/lib';
import { Coord } from 'src/app/jscaip/Coord';
import { HexodiaMove } from '../HexodiaMove';
import { HexodiaConfig, HexodiaNode, HexodiaRules } from '../HexodiaRules';
import { HexodiaState } from '../HexodiaState';
import { Table } from 'src/app/jscaip/TableUtils';
import { Minimax } from 'src/app/jscaip/AI/Minimax';
import { AIDepthLimitOptions } from 'src/app/jscaip/AI/AI';
import { HexodiaAlignmentMinimax } from '../HexodiaAlignmentMinimax';
import { FourStatePiece } from 'src/app/jscaip/FourStatePiece';
import { SlowTest, minimaxTest } from 'src/app/utils/tests/TestUtils.spec';

describe('HexodiaAlignmentMinimax', () => {

    let minimax: Minimax<HexodiaMove, HexodiaState, HexodiaConfig>;
    const level1: AIDepthLimitOptions = { name: 'Level 1', maxDepth: 1 };
    const level2: AIDepthLimitOptions = { name: 'Level 2', maxDepth: 2 };
    const defaultConfig: MGPOptional<HexodiaConfig> = HexodiaRules.get().getDefaultRulesConfig();

    const _: FourStatePiece = FourStatePiece.EMPTY;
    const O: FourStatePiece = FourStatePiece.ZERO;

    beforeEach(() => {
        minimax = new HexodiaAlignmentMinimax();
    });

    it('should do winning move when one is possible', () => {
        // Given a board where there is place for a victory of first player
        const board: Table<FourStatePiece> = [
            [O, O, O, O, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
        ];
        const state: HexodiaState = new HexodiaState(board, 2);
        const node: HexodiaNode = new HexodiaNode(state);

        // When asking what is the best move
        const bestMove: HexodiaMove = minimax.chooseNextMove(node, level1, defaultConfig);

        // Then it should be that victory
        expect(bestMove).toEqual(HexodiaMove.of([new Coord(4, 0), new Coord(5, 0)]));
    });

    SlowTest.it('should block double-open fives at level two', () => {
        // Given a minimax at level two
        // And a board where current opponent could win if current player does not block them (..XXXXX..)
        const board: Table<FourStatePiece> = [
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, O, O, O, O, O, _, _, _, _, _, _, _, _, _, _, _, _],
        ];
        const state: HexodiaState = new HexodiaState(board, 3);
        const node: HexodiaNode = new HexodiaNode(state);

        // When asking what is the best move
        const bestMove: HexodiaMove = minimax.chooseNextMove(node, level2, defaultConfig);

        // Then the minimax level two should block
        expect(bestMove).toEqual(HexodiaMove.of([new Coord(1, 18), new Coord(7, 18)]));
    });

    SlowTest.it('should block double-open four at level two', () => {
        // Given a minimax at level two
        // And an board where current opponent could win if current player does not block them (..XXXX..)
        const board: Table<FourStatePiece> = [
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, O, O, O, O, _, _, _, _, _, _, _, _, _, _, _, _, _],
        ];
        const state: HexodiaState = new HexodiaState(board, 3);
        const node: HexodiaNode = new HexodiaNode(state);

        // When asking what is the best move
        const bestMove: HexodiaMove = minimax.chooseNextMove(node, level2, defaultConfig);

        // Then the minimax level two should block
        expect(bestMove).toEqual(HexodiaMove.of([new Coord(1, 18), new Coord(6, 18)]));
    });

    SlowTest.it('should be able play against itself', () => {
        const rules: HexodiaRules = HexodiaRules.get();
        minimaxTest({
            rules,
            minimax,
            options: level1,
            config: defaultConfig,
            shouldFinish: false, // Not a finisher
        });
    });

});
