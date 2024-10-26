/* eslint-disable max-lines-per-function */
import { MGPOptional } from '@everyboard/lib';

import { AIDepthLimitOptions } from 'src/app/jscaip/AI/AI';
import { ApagosConfig, ApagosRules } from '../ApagosRules';
import { minimaxTest, SlowTest } from 'src/app/utils/tests/TestUtils.spec';
import { ApagosFullBoardMinimax } from '../ApagosFullBoardMinimax';

describe('ApagosFullBoardMinimax', () => {

    const rules: ApagosRules = ApagosRules.get();
    const minimax: ApagosFullBoardMinimax = new ApagosFullBoardMinimax();
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
