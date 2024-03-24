/* eslint-disable max-lines-per-function */
import { Player, PlayerOrNone } from 'src/app/jscaip/Player';
import { SixState } from '../SixState';
import { SixMove } from '../SixMove';
import { SixNode, SixRules } from '../SixRules';
import { Table } from 'src/app/utils/ArrayUtils';
import { SixMoveGenerator } from '../SixMoveGenerator';
import { NoConfig } from 'src/app/jscaip/RulesConfigUtil';

const O: PlayerOrNone = Player.ZERO;
const X: PlayerOrNone = Player.ONE;

describe('SixMoveGenerator', () => {

    let moveGenerator: SixMoveGenerator;
    const defaultConfig: NoConfig = SixRules.get().getDefaultRulesConfig();

    beforeEach(() => {
        moveGenerator = new SixMoveGenerator();
    });

    it(`should propose all movements`, () => {
        // Given an board where all pieces are blocked
        const board: Table<PlayerOrNone> = [
            [O, X, X, X, X, X, O],
        ];
        const state: SixState = SixState.ofRepresentation(board, 40);
        const node: SixNode = new SixNode(state);

        // When listing the moves
        const choices: SixMove[] = moveGenerator.getListMoves(node, defaultConfig);

        // Then there should be all the possibilities
        // 2 starting positions * 15 possible ends
        expect(choices.length).toBe(30);
    });

});
