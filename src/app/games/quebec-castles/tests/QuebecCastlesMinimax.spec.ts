import { MGPOptional } from '@everyboard/lib';

import { QuebecCastlesState } from '../QuebecCastlesState';
import { Minimax } from 'src/app/jscaip/AI/Minimax';
import { QuebecCastlesMove } from '../QuebecCastlesMove';
import { QuebecCastlesConfig, QuebecCastlesNode, QuebecCastlesRules } from '../QuebecCastlesRules';
import { QuebecCastlesMinimax } from '../QuebecCastlesMinimax';
import { AIDepthLimitOptions } from 'src/app/jscaip/AI/AI';
import { minimaxTest, SlowTest } from 'src/app/utils/tests/TestUtils.spec';

/**
 * These are the tests for the minimax.
 * We want to test that it selects a certain move on a specific board.
 */
fdescribe('QuebecCastlesMinimax', () => {

    let minimax: Minimax<QuebecCastlesMove, QuebecCastlesState, QuebecCastlesConfig>;
    const defaultConfig: MGPOptional<QuebecCastlesConfig> = QuebecCastlesRules.get().getDefaultRulesConfig();

    beforeEach(() => {
        minimax = new QuebecCastlesMinimax();
    });

    it('should select some move', () => {
        // Given state
        const state: QuebecCastlesState = QuebecCastlesRules.get().getInitialState(defaultConfig);
        const node: QuebecCastlesNode = new QuebecCastlesNode(state);

        // When selecting the best move
        const bestMove: QuebecCastlesMove = minimax.chooseNextMove(node, { name: 'Level 1', maxDepth: 1 }, defaultConfig);
        // Then it should be the move I want it to be
        expect(bestMove).toBeTruthy();
    });

    SlowTest.it('should be able play against itself', () => {
        // This is a test that makes the minimax play against itself. It is "slow" and will not run locally then.
        const minimaxOptions: AIDepthLimitOptions = { name: 'Level 1', maxDepth: 1 };
        minimaxTest({
            rules: QuebecCastlesRules.get(),
            minimax,
            options: minimaxOptions,
            config: defaultConfig,
            shouldFinish: false,
        });
    });

});
