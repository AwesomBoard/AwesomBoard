/* eslint-disable max-lines-per-function */
import { Coord } from 'src/app/jscaip/Coord';
import { Table } from 'src/app/jscaip/TableUtils';
import { TaflPawn } from '../TaflPawn';
import { TablutNode, TablutRules } from '../tablut/TablutRules';
import { TablutMove } from '../tablut/TablutMove';
import { Minimax } from 'src/app/jscaip/AI/Minimax';
import { TaflPieceAndInfluenceMinimax } from '../TaflPieceAndInfluenceMinimax';
import { TaflConfig } from '../TaflConfig';
import { MGPOptional } from '@everyboard/lib';
import { TaflState } from '../TaflState';
import { minimaxTest, SlowTest } from 'src/app/utils/tests/TestUtils.spec';
import { AIDepthLimitOptions } from 'src/app/jscaip/AI/AI';

describe('TaflPieceAndInfluenceMinimax', () => {

    const minimax: Minimax<TablutMove, TaflState, TaflConfig> = new TaflPieceAndInfluenceMinimax(TablutRules.get());
    const defaultConfig: MGPOptional<TaflConfig> = TablutRules.get().getDefaultRulesConfig();

    const _: TaflPawn = TaflPawn.UNOCCUPIED;
    const O: TaflPawn = TaflPawn.PLAYER_ZERO_PAWN;
    const A: TaflPawn = TaflPawn.PLAYER_ONE_KING;

    it('should choose king escape, at depth 1 and more', () => {
        const board: Table<TaflPawn> = [
            [_, A, _, _, _, _, _, O, _],
            [_, O, _, O, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, O, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
        ];
        const state: TaflState = new TaflState(board, 1);
        const node: TablutNode = new TablutNode(state);
        const expectedMove: TablutMove = TablutMove.from(new Coord(1, 0), new Coord(0, 0)).get();
        for (let depth: number = 1; depth < 4; depth++) {
            const chosenMove: TablutMove = minimax.chooseNextMove(node, { name: 'Level', maxDepth: depth }, defaultConfig);
            expect(chosenMove).withContext('AI chose the wrong move at level ' + depth).toEqual(expectedMove);
        }
    });

    SlowTest.it('should be able play against itself', () => {
        const minimaxOptions: AIDepthLimitOptions = { name: 'Level 1', maxDepth: 1 };
        minimaxTest({
            rules: TablutRules.get(),
            minimax,
            options: minimaxOptions,
            config: defaultConfig,
            shouldFinish: false, // not always a finisher
        });
    });

});
