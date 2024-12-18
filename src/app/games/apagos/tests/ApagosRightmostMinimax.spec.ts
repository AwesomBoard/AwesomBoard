/* eslint-disable max-lines-per-function */
import { AIDepthLimitOptions } from 'src/app/jscaip/AI/AI';
import { ApagosConfig, ApagosRules } from '../ApagosRules';
import { minimaxTest, SlowTest } from 'src/app/utils/tests/TestUtils.spec';
import { MGPOptional } from '@everyboard/lib';
import { ApagosRightmostMinimax } from '../ApagosRightmostMinimax';

describe('ApagosRightmostMinimax', () => {

    const rules: ApagosRules = ApagosRules.get();
    const minimax: ApagosRightmostMinimax = new ApagosRightmostMinimax();
    const minimaxOptions: AIDepthLimitOptions = { name: 'Level 1', maxDepth: 1 };
    const defaultConfig: MGPOptional<ApagosConfig> = ApagosRules.get().getDefaultRulesConfig();

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
