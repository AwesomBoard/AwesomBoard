import { MGPOptional } from '@everyboard/lib';

import { PlayerMetricHeuristic } from 'src/app/jscaip/AI/Minimax';
import { QuebecCastlesMove } from './QuebecCastlesMove';
import { QuebecCastlesConfig, QuebecCastlesNode } from './QuebecCastlesRules';
import { QuebecCastlesState } from './QuebecCastlesState';
import { PlayerNumberTable } from 'src/app/jscaip/PlayerNumberTable';
import { Player } from 'src/app/jscaip/Player';

// A heuristic assigns values to game states
export class QuebecCastlesHeuristic extends PlayerMetricHeuristic<QuebecCastlesMove,
                                                                  QuebecCastlesState,
                                                                  QuebecCastlesConfig>
{
    public override getMetrics(node: QuebecCastlesNode, _config: MGPOptional<QuebecCastlesConfig>): PlayerNumberTable {
        const state: QuebecCastlesState = node.gameState;
        return PlayerNumberTable.ofSingle(
            state.count(Player.ZERO),
            state.count(Player.ONE),
        );
    }

}
