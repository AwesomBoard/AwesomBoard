/* eslint-disable max-lines-per-function */
import { AIDepthLimitOptions } from 'src/app/jscaip/AI/AI';
import { EncapsuleConfig, EncapsuleRules } from '../EncapsuleRules';
import { minimaxTest, SlowTest } from 'src/app/utils/tests/TestUtils.spec';
import { MGPOptional } from '@everyboard/lib';
import { EncapsuleDummyMinimax } from '../EncapsuleDummyMinimax';

describe('EncapsuleDummyMinimax', () => {

    const rules: EncapsuleRules = EncapsuleRules.get();
    const minimax: EncapsuleDummyMinimax = new EncapsuleDummyMinimax();
    const minimaxOptions: AIDepthLimitOptions = { name: 'Level 1', maxDepth: 1 };
    const defaultConfig: MGPOptional<EncapsuleConfig> = EncapsuleRules.get().getDefaultRulesConfig();

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
