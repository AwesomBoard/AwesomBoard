/* eslint-disable max-lines-per-function */
import { Coord } from 'src/app/jscaip/Coord';
import { Player, PlayerOrNone } from 'src/app/jscaip/Player';
import { SixState } from '../SixState';
import { SixMove } from '../SixMove';
import { Table } from 'src/app/jscaip/TableUtils';
import { SixLegalityInformation, SixNode, SixRules } from '../SixRules';
import { Minimax } from 'src/app/jscaip/AI/Minimax';
import { AIDepthLimitOptions } from 'src/app/jscaip/AI/AI';
import { SixMinimax } from '../SixMinimax';
import { EmptyRulesConfig, NoConfig } from 'src/app/jscaip/RulesConfigUtil';
import { minimaxTest, SlowTest } from 'src/app/utils/tests/TestUtils.spec';

const O: PlayerOrNone = Player.ZERO;
const X: PlayerOrNone = Player.ONE;
const _: PlayerOrNone = PlayerOrNone.NONE;

describe('SixMinimax', () => {

    let minimax: Minimax<SixMove, SixState, EmptyRulesConfig, SixLegalityInformation>;
    const minimaxOptions: AIDepthLimitOptions = { name: 'Level 1', maxDepth: 1 };
    const defaultConfig: NoConfig = SixRules.get().getDefaultRulesConfig();

    beforeEach(() => {
        minimax = new SixMinimax();
    });

    it('should not consider moving piece that are blocking an opponent victory', () => {
        // Given a board with only one non losing move
        const board: Table<PlayerOrNone> = [
            [O, O, _, _, _, _, O],
            [X, _, _, _, _, X, _],
            [X, _, _, O, X, X, _],
            [X, X, O, X, X, O, _],
            [X, _, X, X, O, _, _],
            [_, X, _, _, _, _, _],
        ];
        const state: SixState = SixState.ofRepresentation(board, 40);
        const node: SixNode = new SixNode(state);

        // When asking the minimax the best choice
        const bestMove: SixMove = minimax.chooseNextMove(node, minimaxOptions, defaultConfig);
        expect(bestMove.start.get()).toEqual(new Coord(1, 0));
    });

    SlowTest.it('should be able to play against itself', () => {
        minimaxTest({
            rules: SixRules.get(),
            minimax,
            options: minimaxOptions,
            config: defaultConfig,
            shouldFinish: true,
        });
    });

});
