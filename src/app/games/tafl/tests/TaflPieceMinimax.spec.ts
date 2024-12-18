/* eslint-disable max-lines-per-function */
import { Coord } from 'src/app/jscaip/Coord';
import { TaflPawn } from '../TaflPawn';
import { TablutNode, TablutRules } from '../tablut/TablutRules';
import { Table } from 'src/app/jscaip/TableUtils';
import { TablutMove } from '../tablut/TablutMove';
import { TaflPieceMinimax } from '../TaflPieceMinimax';
import { TaflConfig } from '../TaflConfig';
import { MGPOptional } from '@everyboard/lib';
import { TaflState } from '../TaflState';
import { minimaxTest, SlowTest } from 'src/app/utils/tests/TestUtils.spec';
import { AIDepthLimitOptions } from 'src/app/jscaip/AI/AI';

describe('TaflPieceMinimax', () => {

    const _: TaflPawn = TaflPawn.UNOCCUPIED;
    const O: TaflPawn = TaflPawn.PLAYER_ZERO_PAWN;
    const X: TaflPawn = TaflPawn.PLAYER_ONE_PAWN;
    const A: TaflPawn = TaflPawn.PLAYER_ONE_KING;
    const defaultConfig: MGPOptional<TaflConfig> = TablutRules.get().getDefaultRulesConfig();
    const minimax: TaflPieceMinimax<TablutMove> = new TaflPieceMinimax(TablutRules.get());

    it('should try to make the king escape when it can', () => {
        const board: Table<TaflPawn> = [
            [_, _, O, A, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, X, _],
            [_, _, _, _, _, _, _, _, _],
        ];
        const state: TaflState = new TaflState(board, 1);
        const node: TablutNode = new TablutNode(state);
        const winnerMove: TablutMove = TablutMove.from(new Coord(3, 0), new Coord(8, 0)).get();

        const bestMove: TablutMove = minimax.chooseNextMove(node, { name: 'Level 1', maxDepth: 1 }, defaultConfig);
        expect(bestMove).toEqual(winnerMove);
    });

    SlowTest.it('should be able play against itself', () => {
        const minimaxOptions: AIDepthLimitOptions = { name: 'Level 1', maxDepth: 1 };
        minimaxTest({
            rules: TablutRules.get(),
            minimax,
            options: minimaxOptions,
            config: defaultConfig,
            shouldFinish: true,
        });
    });

});
