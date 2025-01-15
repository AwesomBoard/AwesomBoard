/* eslint-disable max-lines-per-function */
import { MGPOptional } from '@everyboard/lib';

import { Coord } from 'src/app/jscaip/Coord';
import { HexodiaMove } from '../HexodiaMove';
import { HexodiaConfig, HexodiaNode, HexodiaRules } from '../HexodiaRules';
import { HexodiaState } from '../HexodiaState';
import { Table } from 'src/app/jscaip/TableUtils';
import { HexodiaMoveGenerator } from '../HexodiaMoveGenerator';
import { FourStatePiece } from 'src/app/jscaip/FourStatePiece';

describe('HexodiaMoveGenerator', () => {

    let moveGenerator: HexodiaMoveGenerator;

    const _: FourStatePiece = FourStatePiece.EMPTY;
    const O: FourStatePiece = FourStatePiece.ZERO;

    const defaultConfig: MGPOptional<HexodiaConfig> = HexodiaRules.get().getDefaultRulesConfig();

    beforeEach(() => {
        moveGenerator = new HexodiaMoveGenerator();
    });

    it('should propose only one move at first turn', () => {
        // Given the initial node
        const state: HexodiaState = HexodiaRules.get().getInitialState(defaultConfig);
        const size: number = state.getWidth();
        const node: HexodiaNode = new HexodiaNode(state);

        // When listing the moves
        const moves: HexodiaMove[] = moveGenerator.getListMoves(node, defaultConfig);

        // Then it should only include the center of the board
        const cx: number = Math.floor(size / 2);
        const cy: number = Math.floor(size / 2);
        expect(moves.length).toBe(1);
        expect(moves[0]).toEqual(HexodiaMove.of([new Coord(cx, cy)]));
    });

    it('should count all possible moves including only neighboring-coord', () => {
        // Given a board with 60 possibles combinations of two coords
        // With the firsts being neighbors of a piece on board
        // and the seconds being neighbors of a piece on board or of the firsts coords
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

        // When listing the moves
        const moves: HexodiaMove[] = moveGenerator.getListMoves(node, defaultConfig);

        // Then the answer should be 65
        expect(moves.length).toBe(65);
    });

});
