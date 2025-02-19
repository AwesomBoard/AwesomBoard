/* eslint-disable max-lines-per-function */
import { AIDepthLimitOptions } from 'src/app/jscaip/AI/AI';
import { SaharaRules } from '../SaharaRules';
import { minimaxTest, SlowTest } from 'src/app/utils/tests/TestUtils.spec';
import { SaharaMinimax } from '../SaharaMinimax';
import { NoConfig } from 'src/app/jscaip/RulesConfigUtil';

describe('SaharaMinimax', () => {

    const rules: SaharaRules = SaharaRules.get();
    const minimax: SaharaMinimax = new SaharaMinimax();
    const minimaxOptions: AIDepthLimitOptions = { name: 'Level 1', maxDepth: 1 };
    const defaultConfig: NoConfig = SaharaRules.get().getDefaultRulesConfig();

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
