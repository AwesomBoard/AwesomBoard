
/* eslint-disable max-lines-per-function */
import { AIDepthLimitOptions } from 'src/app/jscaip/AI/AI';
import { DiamRules } from '../DiamRules';
import { minimaxTest, SlowTest } from 'src/app/utils/tests/TestUtils.spec';
import { MGPOptional } from '@everyboard/lib';
import { DiamDummyMinimax } from '../DiamDummyMinimax';
import { EmptyRulesConfig } from 'src/app/jscaip/RulesConfigUtil';

describe('DiamDummyMinimax', () => {

    const rules: DiamRules = DiamRules.get();
    const minimax: DiamDummyMinimax = new DiamDummyMinimax();
    const minimaxOptions: AIDepthLimitOptions = { name: 'Level 1', maxDepth: 1 };
    const defaultConfig: MGPOptional<EmptyRulesConfig> = DiamRules.get().getDefaultRulesConfig();

    SlowTest.it('should be able play against itself', () => {
        minimaxTest({
            rules,
            minimax,
            options: minimaxOptions,
            config: defaultConfig,
            turns: 200,
            shouldFinish: false, // not a finisher
        });
    });
});
