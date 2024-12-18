/* eslint-disable max-lines-per-function */
import { AIDepthLimitOptions } from 'src/app/jscaip/AI/AI';
import { LinesOfActionRules } from '../LinesOfActionRules';
import { minimaxTest, SlowTest } from 'src/app/utils/tests/TestUtils.spec';
import { MGPOptional } from '@everyboard/lib';
import { LinesOfActionMinimax } from '../LinesOfActionMinimax';
import { EmptyRulesConfig } from 'src/app/jscaip/RulesConfigUtil';

describe('LinesOfActionMinimax', () => {

    const rules: LinesOfActionRules = LinesOfActionRules.get();
    const minimax: LinesOfActionMinimax = new LinesOfActionMinimax();
    const minimaxOptions: AIDepthLimitOptions = { name: 'Level 1', maxDepth: 1 };
    const defaultConfig: MGPOptional<EmptyRulesConfig> = LinesOfActionRules.get().getDefaultRulesConfig();

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
