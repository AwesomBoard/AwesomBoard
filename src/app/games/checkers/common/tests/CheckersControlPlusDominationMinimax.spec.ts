/* eslint-disable max-lines-per-function */
import { MGPOptional } from '@everyboard/lib';
import { AIDepthLimitOptions } from 'src/app/jscaip/AI/AI';
import { AbstractCheckersRules, CheckersConfig } from '../AbstractCheckersRules';
import { minimaxTest, SlowTest } from 'src/app/utils/tests/TestUtils.spec';
import { CheckersControlPlusDominationMinimax } from '../CheckersControlPlusDominationMinimax';
import { InternationalCheckersRules } from '../../international-checkers/InternationalCheckersRules';
import { LascaRules } from '../../lasca/LascaRules';

const rules: AbstractCheckersRules[] = [
    InternationalCheckersRules.get(),
    LascaRules.get(),
];

for (const rule of rules) {

    describe('CheckersControlPlusDominationMinimax for ' + rule.constructor.name, () => {
        const minimax: CheckersControlPlusDominationMinimax = new CheckersControlPlusDominationMinimax(rule);
        const minimaxOptions: AIDepthLimitOptions = { name: 'Level 1', maxDepth: 1 };
        const defaultConfig: MGPOptional<CheckersConfig> = rule.getDefaultRulesConfig();

        SlowTest.it('should be able play against itself', () => {
            minimaxTest({
                rules: rule,
                minimax,
                options: minimaxOptions,
                config: defaultConfig,
                shouldFinish: true,
            });
        });

    });

}
