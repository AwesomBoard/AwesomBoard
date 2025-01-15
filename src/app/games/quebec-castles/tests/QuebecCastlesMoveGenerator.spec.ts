import { MGPOptional } from '@everyboard/lib';

import { QuebecCastlesMove } from '../QuebecCastlesMove';
import { QuebecCastlesMoveGenerator } from '../QuebecCastlesMoveGenerator';
import { QuebecCastlesConfig, QuebecCastlesNode, QuebecCastlesRules } from '../QuebecCastlesRules';
import { QuebecCastlesState } from '../QuebecCastlesState';

/**
 * These are the tests for the move generator.
 * We want to test that it gives us the expected moves.
 * Typically, this can be done by checking the number of moves available on the first turn of a game.
 */
describe('QuebecCastlesMoveGenerator', () => {

    let moveGenerator: QuebecCastlesMoveGenerator;
    const defaultConfig: MGPOptional<QuebecCastlesConfig> = QuebecCastlesRules.get().getDefaultRulesConfig();

    beforeEach(() => {
        moveGenerator = new QuebecCastlesMoveGenerator();
    });

    it('should have all move options', () => {
        // Given an initial node
        const initialState: QuebecCastlesState = QuebecCastlesRules.get().getInitialState(defaultConfig);
        const node: QuebecCastlesNode = new QuebecCastlesNode(initialState);

        // When listing the moves
        const moves: QuebecCastlesMove[] = moveGenerator.getListMoves(node, defaultConfig);

        // Then there should be this many moves
        expect(moves.length).toBe(1);
    });

});
