/* eslint-disable max-lines-per-function */
import { AIDepthLimitOptions } from 'src/app/jscaip/AI/AI';
import { PylosRules } from '../PylosRules';
import { minimaxTest, SlowTest } from 'src/app/utils/tests/TestUtils.spec';
import { MGPOptional } from '@everyboard/lib';
import { PylosMinimax } from '../PylosMinimax';
import { EmptyRulesConfig } from 'src/app/jscaip/RulesConfigUtil';

describe('PylosMinimax', () => {

    const rules: PylosRules = PylosRules.get();
    const minimax: PylosMinimax = new PylosMinimax();
    const minimaxOptions: AIDepthLimitOptions = { name: 'Level 1', maxDepth: 1 };
    const defaultConfig: MGPOptional<EmptyRulesConfig> = PylosRules.get().getDefaultRulesConfig();

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
