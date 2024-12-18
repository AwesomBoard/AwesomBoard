/* eslint-disable max-lines-per-function */
import { AIDepthLimitOptions } from 'src/app/jscaip/AI/AI';
import { CoerceoConfig, CoerceoRules } from '../CoerceoRules';
import { minimaxTest, SlowTest } from 'src/app/utils/tests/TestUtils.spec';
import { MGPOptional } from '@everyboard/lib';
import { CoerceoCapturesAndFreedomMinimax } from '../CoerceoCapturesAndFreedomMinimax';

describe('CoerceoCapturesAndFreedomMinimax', () => {

    const rules: CoerceoRules = CoerceoRules.get();
    const minimax: CoerceoCapturesAndFreedomMinimax = new CoerceoCapturesAndFreedomMinimax();
    const minimaxOptions: AIDepthLimitOptions = { name: 'Level 1', maxDepth: 1 };
    const defaultConfig: MGPOptional<CoerceoConfig> = CoerceoRules.get().getDefaultRulesConfig();

    SlowTest.it('should be able play against itself', () => {
        minimaxTest({
            rules,
            minimax,
            options: minimaxOptions,
            config: defaultConfig,
            shouldFinish: false, // not a finisher
        });
    });

});
