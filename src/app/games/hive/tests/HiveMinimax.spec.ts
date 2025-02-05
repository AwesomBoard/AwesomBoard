/* eslint-disable max-lines-per-function */
import { AIDepthLimitOptions } from 'src/app/jscaip/AI/AI';
import { HiveRules } from '../HiveRules';
import { minimaxTest, SlowTest } from 'src/app/utils/tests/TestUtils.spec';
import { HiveMinimax } from '../HiveMinimax';
import { NoConfig } from 'src/app/jscaip/RulesConfigUtil';

describe('HiveMinimax', () => {

    const rules: HiveRules = HiveRules.get();
    const minimax: HiveMinimax = new HiveMinimax();
    const minimaxOptions: AIDepthLimitOptions = { name: 'Level 1', maxDepth: 1 };
    const defaultConfig: NoConfig = HiveRules.get().getDefaultRulesConfig();

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
