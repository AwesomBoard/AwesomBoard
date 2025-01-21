import { NewGameMove } from '../NewGameMove';
import { NewGameMoveGenerator } from '../NewGameMoveGenerator';
import { NewGameNode, NewGameRules } from '../NewGameRules';
import { NewGameState } from '../NewGameState';
import { NoConfig } from 'src/app/jscaip/RulesConfigUtil';

/**
 * These are the tests for the move generator.
 * We want to test that it gives us the expected moves.
 * Typically, this can be done by checking the number of moves available on the first turn of a game.
 */
describe('NewGameMoveGenerator', () => {

    let moveGenerator: NewGameMoveGenerator;
    const defaultConfig: NoConfig = NewGameRules.get().getDefaultRulesConfig();

    beforeEach(() => {
        moveGenerator = new NewGameMoveGenerator();
    });

    it('should have all move options', () => {
        // Given an initial node
        const initialState: NewGameState = NewGameRules.get().getInitialState(defaultConfig);
        const node: NewGameNode = new NewGameNode(initialState);

        // When listing the moves
        const moves: NewGameMove[] = moveGenerator.getListMoves(node, defaultConfig);

        // Then there should be this many moves
        expect(moves.length).toBe(1);
    });

});
