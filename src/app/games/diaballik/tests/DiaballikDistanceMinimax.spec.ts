/* eslint-disable max-lines-per-function */
import { AIDepthLimitOptions } from 'src/app/jscaip/AI/AI';
import { DiaballikRules } from '../DiaballikRules';
import { NoConfig } from 'src/app/jscaip/RulesConfigUtil';
import { minimaxTest, SlowTest } from 'src/app/utils/tests/TestUtils.spec';
import { DiaballikDistanceMinimax } from '../DiaballikDistanceMinimax';
import { DiaballikFilteredMoveGenerator } from '../DiaballikFilteredMoveGenerator';
import { DiaballikMoveGenerator } from '../DiaballikMoveGenerator';

describe('DiaballikDistanceMinimax', () => {

    const rules: DiaballikRules = DiaballikRules.get();
    const moveGenerator: DiaballikMoveGenerator = new DiaballikFilteredMoveGenerator(3, false);
    const minimax: DiaballikDistanceMinimax = new DiaballikDistanceMinimax('distance', moveGenerator);
    const minimaxOptions: AIDepthLimitOptions = { name: 'Level 1', maxDepth: 1 };
    const defaultConfig: NoConfig = DiaballikRules.get().getDefaultRulesConfig();

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
