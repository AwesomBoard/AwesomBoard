/* eslint-disable max-lines-per-function */
import { MGPOptional } from '@everyboard/lib';
import { QuartoConfig, QuartoNode, QuartoRules } from '../QuartoRules';
import { QuartoMove } from '../QuartoMove';
import { QuartoPiece } from '../QuartoPiece';
import { EncoderTestUtils } from '@everyboard/lib';
import { QuartoMoveGenerator } from '../QuartoMoveGenerator';

describe('QuartoMove', () => {

    const defaultConfig: MGPOptional<QuartoConfig> = QuartoRules.get().getDefaultRulesConfig();

    it('should have a bijective encoder', () => {
        const rules: QuartoRules = QuartoRules.get();
        const moveGenerator: QuartoMoveGenerator = new QuartoMoveGenerator();
        const node: QuartoNode = rules.getInitialNode(defaultConfig);
        const firstTurnMoves: QuartoMove[] = moveGenerator.getListMoves(node, defaultConfig);
        for (const move of firstTurnMoves) {
            EncoderTestUtils.expectToBeBijective(QuartoMove.encoder, move);
        }
    });

    it('should override toString and equals correctly', () => {
        const move: QuartoMove = new QuartoMove(1, 1, QuartoPiece.AAAB);
        const secondMove: QuartoMove = new QuartoMove(0, 0, QuartoPiece.AAAB);
        const thirdMove: QuartoMove = new QuartoMove(1, 1, QuartoPiece.AAAA);
        expect(move.equals(move)).toBeTrue();
        expect(move.equals(secondMove)).toBeFalse();
        expect(move.equals(thirdMove)).toBeFalse();
        expect(move.toString()).toEqual('QuartoMove(1, 1, 1)');
    });

});
