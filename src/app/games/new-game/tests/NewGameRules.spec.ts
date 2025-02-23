import { RulesUtils } from 'src/app/jscaip/tests/RulesUtils.spec';
import { NewGameMove } from '../NewGameMove';
import { NewGameNode, NewGameRules } from '../NewGameRules';
import { NewGameState } from '../NewGameState';
import { NoConfig } from 'src/app/jscaip/RulesConfigUtil';

/**
 * This is the test suite for the rules
 */
describe('NewGameRules', () => {

    let rules: NewGameRules;
    const defaultConfig: NoConfig = NewGameRules.get().getDefaultRulesConfig();

    beforeEach(() => {
        // This is the rules instance that we will test
        rules = NewGameRules.get();
    });

    it('should adhere to some rule', () => {
        // This is how you would test a particular rule:

        // Given a state
        const state: NewGameState = NewGameRules.get().getInitialState(defaultConfig);

        // When doing some move
        const move: NewGameMove = new NewGameMove();

        // Then the move should succeed (or fail)
        const expectedState: NewGameState = new NewGameState(1);
        RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
    });

    it('should be a draw', () => {
        // This is how you would test the game status computation:

        // Given some state
        const state: NewGameState = new NewGameState(42);
        // When checking its status
        // Then it should be a draw
        const node: NewGameNode = new NewGameNode(state);
        RulesUtils.expectToBeDraw(rules, node, defaultConfig);
        // Or you could use this
        // RulesUtils.expectToBeVictoryFor(rules, node, Player.ZERO, defaultConfig);
    });

});
