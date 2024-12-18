/* eslint-disable max-lines-per-function */
import { AIDepthLimitOptions } from 'src/app/jscaip/AI/AI';
import { QuixoRules } from '../QuixoRules';
import { minimaxTest, SlowTest } from 'src/app/utils/tests/TestUtils.spec';
import { MGPOptional } from '@everyboard/lib';
import { QuixoMinimax } from '../QuixoMinimax';
import { QuixoConfig } from '../QuixoState';

describe('QuixoMinimax', () => {

    const rules: QuixoRules = QuixoRules.get();
    const minimax: QuixoMinimax = new QuixoMinimax();
    const minimaxOptions: AIDepthLimitOptions = { name: 'Level 1', maxDepth: 1 };
    const defaultConfig: MGPOptional<QuixoConfig> = QuixoRules.get().getDefaultRulesConfig();

    SlowTest.it('should be able play against itself', () => {
        minimaxTest({
            rules,
            minimax,
            options: minimaxOptions,
            config: defaultConfig,
            shouldFinish: true,
        });
    });

});
