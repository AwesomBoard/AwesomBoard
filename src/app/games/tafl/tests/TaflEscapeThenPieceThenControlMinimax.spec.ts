/* eslint-disable max-lines-per-function */
import { AIDepthLimitOptions } from 'src/app/jscaip/AI/AI';
import { minimaxTest, SlowTest } from 'src/app/utils/tests/TestUtils.spec';
import { MGPOptional } from '@everyboard/lib';
import { TaflEscapeThenPieceThenControlMinimax } from '../TaflEscapeThenPieceThenControlMinimax';
import { TablutRules } from '../tablut/TablutRules';
import { TaflConfig } from '../TaflConfig';
import { TablutMove } from '../tablut/TablutMove';

describe('TaflEscapeThenPieceThenControlMinimax', () => {

    const minimax: TaflEscapeThenPieceThenControlMinimax<TablutMove> =
        new TaflEscapeThenPieceThenControlMinimax(TablutRules.get());
    const minimaxOptions: AIDepthLimitOptions = { name: 'Level 1', maxDepth: 1 };
    const defaultConfig: MGPOptional<TaflConfig> = TablutRules.get().getDefaultRulesConfig();

    SlowTest.it('should be able play against itself', () => {
        minimaxTest({
            rules: TablutRules.get(),
            minimax,
            options: minimaxOptions,
            config: defaultConfig,
            shouldFinish: false, // not always a finisher
        });
    });

});
