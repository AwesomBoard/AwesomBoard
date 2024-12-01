import { MGPOptional } from '@everyboard/lib';

import { BoardValue } from 'src/app/jscaip/AI/BoardValue';
import { Heuristic } from 'src/app/jscaip/AI/Minimax';
import { HexodiaMove } from './HexodiaMove';
import { HexodiaConfig, HexodiaNode, HexodiaRules } from './HexodiaRules';
import { HexodiaState } from './HexodiaState';

export class HexodiaAlignmentHeuristic extends Heuristic<HexodiaMove,
                                                         HexodiaState,
                                                         BoardValue,
                                                         HexodiaConfig>
{
    public getBoardValue(node: HexodiaNode, config: MGPOptional<HexodiaConfig>): BoardValue {
        const state: HexodiaState = node.gameState;
        let score: number = 0;
        for (const coordAndContent of state.getPlayerCoordsAndContent()) {
            const squareScore: number = HexodiaRules
                .getHexodiaHelper(config)
                .getSquareScore(state, coordAndContent.coord);
            score += squareScore;
        }
        return BoardValue.of(score);
    }

}
