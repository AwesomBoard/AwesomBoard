/* eslint-disable max-lines-per-function */
import { AIDepthLimitOptions } from 'src/app/jscaip/AI/AI';
import { LodestoneRules } from '../LodestoneRules';
import { minimaxTest, SlowTest } from 'src/app/utils/tests/TestUtils.spec';
import { LodestoneScoreMinimax } from '../LodestoneScoreMinimax';
import { NoConfig } from 'src/app/jscaip/RulesConfigUtil';

describe('LodestoneScoreMinimax', () => {

    const rules: LodestoneRules = LodestoneRules.get();
    const minimax: LodestoneScoreMinimax = new LodestoneScoreMinimax();
    const minimaxOptions: AIDepthLimitOptions = { name: 'Level 1', maxDepth: 1 };
    const defaultConfig: NoConfig = LodestoneRules.get().getDefaultRulesConfig();

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
