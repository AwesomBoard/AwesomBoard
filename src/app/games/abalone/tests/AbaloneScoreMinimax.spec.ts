/* eslint-disable max-lines-per-function */
import { AIDepthLimitOptions } from 'src/app/jscaip/AI/AI';
import { AbaloneConfig, AbaloneRules } from '../AbaloneRules';
import { minimaxTest, SlowTest } from 'src/app/utils/tests/TestUtils.spec';
import { MGPOptional } from '@everyboard/lib';
import { AbaloneScoreMinimax } from '../AbaloneScoreMinimax';

describe('AbaloneScoreMinimax', () => {

    const rules: AbaloneRules = AbaloneRules.get();
    const minimax: AbaloneScoreMinimax = new AbaloneScoreMinimax();
    const minimaxOptions: AIDepthLimitOptions = { name: 'Level 1', maxDepth: 1 };
    const defaultConfig: MGPOptional<AbaloneConfig> = AbaloneRules.get().getDefaultRulesConfig();

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
