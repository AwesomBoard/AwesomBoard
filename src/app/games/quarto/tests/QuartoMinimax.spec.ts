/* eslint-disable max-lines-per-function */
import { AIDepthLimitOptions } from 'src/app/jscaip/AI/AI';
import { QuartoConfig, QuartoNode, QuartoRules } from '../QuartoRules';
import { minimaxTest, SlowTest } from 'src/app/utils/tests/TestUtils.spec';
import { MGPOptional } from '@everyboard/lib';
import { QuartoMinimax } from '../QuartoMinimax';
import { Table } from 'src/app/jscaip/TableUtils';
import { QuartoPiece } from '../QuartoPiece';
import { QuartoState } from '../QuartoState';
import { QuartoMove } from '../QuartoMove';
import { Coord } from 'src/app/jscaip/Coord';

const ____: QuartoPiece = QuartoPiece.EMPTY;
const AAAA: QuartoPiece = QuartoPiece.AAAA;
const AAAB: QuartoPiece = QuartoPiece.AAAB;
const AABA: QuartoPiece = QuartoPiece.AABA;
const ABBB: QuartoPiece = QuartoPiece.ABBB;

describe('QuartoMinimax', () => {

    const rules: QuartoRules = QuartoRules.get();
    const minimax: QuartoMinimax = new QuartoMinimax();
    const minimaxOptions: AIDepthLimitOptions = { name: 'Level 1', maxDepth: 1 };
    const defaultConfig: MGPOptional<QuartoConfig> = QuartoRules.get().getDefaultRulesConfig();

    SlowTest.it('should be able play against itself', () => {
        minimaxTest({
            rules,
            minimax,
            options: minimaxOptions,
            config: defaultConfig,
            shouldFinish: true,
        });
    });

    describe('winning', () => {

        describe('Level 2 vs Level 2', () => {

            const level2v2Config: MGPOptional<QuartoConfig> = MGPOptional.of({
                playerZeroLevel: 2,
                playerOneLevel: 2,
            });

            it(`should choose victory of level two when possible`, () => {
                // Given a board where a 2x2 is possible
                const board: Table<QuartoPiece> = [
                    [AAAA, ABBB, ____, ____],
                    [AAAB, ____, ____, ____],
                    [____, ____, ____, ____],
                    [____, ____, ____, ____],
                ];
                const state: QuartoState = new QuartoState(board, 3, QuartoPiece.ABBB);
                const node: QuartoNode = new QuartoNode(state);

                // When computing the best move
                const chosenMove: QuartoMove = minimax.chooseNextMove(node, minimaxOptions, level2v2Config);

                // Then the best move should be playing the winning piece in the winning square
                expect(chosenMove.coord.equals(new Coord(1, 1))).toBeTrue();
            });

        });

        it(`should choose victory of level one when it is level one player's turn and both victory level are possible`, () => {
            // Given a board where a 2x2 is possible and a line as well
            const board: Table<QuartoPiece> = [
                [AAAA, ABBB, ____, ____],
                [AAAB, ____, ____, ____],
                [AABA, ____, ____, ____],
                [____, ____, ____, ____],
            ];
            const state: QuartoState = new QuartoState(board, 4, QuartoPiece.ABBB);
            const node: QuartoNode = new QuartoNode(state);
            const asymetricConfig: MGPOptional<QuartoConfig> = MGPOptional.of({
                playerZeroLevel: 1,
                playerOneLevel: 2,
            });

            // When computing the best move
            const chosenMove: QuartoMove = minimax.chooseNextMove(node, minimaxOptions, asymetricConfig);

            // Then the best move should be playing the winning piece in the winning square
            expect(chosenMove.coord.equals(new Coord(0, 3))).toBeTrue();
        });

        it(`should choose victory of level one when it is level two player's turn and both victory level are possible`, () => {
            // Given a board where a 2x2 is possible and a line as well
            const board: Table<QuartoPiece> = [
                [AAAA, ABBB, ____, ____],
                [AAAB, ____, ____, ____],
                [AABA, ____, ____, ____],
                [____, ____, ____, ____],
            ];
            const state: QuartoState = new QuartoState(board, 4, QuartoPiece.ABBB);
            const node: QuartoNode = new QuartoNode(state);
            const asymetricConfig: MGPOptional<QuartoConfig> = MGPOptional.of({
                playerZeroLevel: 1,
                playerOneLevel: 2,
            });

            // When computing the best move
            const chosenMove: QuartoMove = minimax.chooseNextMove(node, minimaxOptions, asymetricConfig);

            // Then the best move should be playing the winning piece in the winning square
            expect(chosenMove.coord).toEqual(new Coord(0, 3));
        });

    });

});
