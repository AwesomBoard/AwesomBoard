/* eslint-disable max-lines-per-function */
import { AIDepthLimitOptions } from 'src/app/jscaip/AI/AI';
import { YinshRules } from '../YinshRules';
import { minimaxTest, SlowTest } from 'src/app/utils/tests/TestUtils.spec';
import { YinshScoreMinimax } from '../YinshScoreMinimax';
import { NoConfig } from 'src/app/jscaip/RulesConfigUtil';

describe('YinshScoreMinimax', () => {

    const rules: YinshRules = YinshRules.get();
    const minimax: YinshScoreMinimax = new YinshScoreMinimax();
    const minimaxOptions: AIDepthLimitOptions = { name: 'Level 1', maxDepth: 1 };
    const defaultConfig: NoConfig = YinshRules.get().getDefaultRulesConfig();

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
