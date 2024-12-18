/* eslint-disable max-lines-per-function */
import { AIDepthLimitOptions } from 'src/app/jscaip/AI/AI';
import { MartianChessRules } from '../MartianChessRules';
import { minimaxTest, SlowTest } from 'src/app/utils/tests/TestUtils.spec';
import { MGPOptional } from '@everyboard/lib';
import { MartianChessScoreMinimax } from '../MartianChessScoreMinimax';
import { EmptyRulesConfig } from 'src/app/jscaip/RulesConfigUtil';

describe('MartianChessScoreMinimax', () => {

    const rules: MartianChessRules = MartianChessRules.get();
    const minimax: MartianChessScoreMinimax = new MartianChessScoreMinimax();
    const minimaxOptions: AIDepthLimitOptions = { name: 'Level 1', maxDepth: 1 };
    const defaultConfig: MGPOptional<EmptyRulesConfig> = MartianChessRules.get().getDefaultRulesConfig();

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
