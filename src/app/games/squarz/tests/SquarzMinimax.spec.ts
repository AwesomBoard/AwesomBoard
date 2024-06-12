/* eslint-disable max-lines-per-function */
import { AIDepthLimitOptions } from 'src/app/jscaip/AI/AI';
import { SquarzConfig, SquarzRules } from '../SquarzRules';
import { minimaxTest, SlowTest } from 'src/app/utils/tests/TestUtils.spec';
import { SquarzMinimax } from '../SquarzMinimax';
import { MGPOptional } from '@everyboard/lib';

describe('SquarzMinimax', () => {

    const rules: SquarzRules = SquarzRules.get();
    const minimax: SquarzMinimax = new SquarzMinimax();
    const minimaxOptions: AIDepthLimitOptions = { name: 'Level 1', maxDepth: 1 };
    const defaultConfig: MGPOptional<SquarzConfig> = SquarzRules.get().getDefaultRulesConfig();

    SlowTest.it('should be able play against itself', () => {
        minimaxTest({
            rules,
            minimax,
            options: minimaxOptions,
            config: defaultConfig,
            turns: 200,
            shouldFinish: true,
        });
    });
});
