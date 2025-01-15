/* eslint-disable max-lines-per-function */
import { AIDepthLimitOptions } from 'src/app/jscaip/AI/AI';
import { PentagoRules } from '../PentagoRules';
import { minimaxTest, SlowTest } from 'src/app/utils/tests/TestUtils.spec';
import { PentagoDummyMinimax } from '../PentagoDummyMinimax';
import { NoConfig } from 'src/app/jscaip/RulesConfigUtil';

describe('PentagoDummyMinimax', () => {

    const rules: PentagoRules = PentagoRules.get();
    const minimax: PentagoDummyMinimax = new PentagoDummyMinimax();
    const minimaxOptions: AIDepthLimitOptions = { name: 'Level 1', maxDepth: 1 };
    const defaultConfig: NoConfig = PentagoRules.get().getDefaultRulesConfig();

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
