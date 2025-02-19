import { MGPOptional } from '@everyboard/lib';

import { PlayerMetricHeuristic } from 'src/app/jscaip/AI/Minimax';
import { CheckersMove } from './CheckersMove';
import { CheckersState } from './CheckersState';
import { CheckersConfig, CheckersNode } from './AbstractCheckersRules';
import { PlayerNumberTable } from 'src/app/jscaip/PlayerNumberTable';

export class CheckersScoreHeuristic extends PlayerMetricHeuristic<CheckersMove, CheckersState, CheckersConfig> {

    public override getMetrics(node: CheckersNode, _config: MGPOptional<CheckersConfig>): PlayerNumberTable {
        return node.gameState.getScores().get().toTable();
    }

}
