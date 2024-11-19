import { MGPOptional } from '@everyboard/lib';
import { PlayerMetricHeuristic } from 'src/app/jscaip/AI/Minimax';
import { PlayerNumberTable } from 'src/app/jscaip/PlayerNumberTable';
import { AbaloneMove } from './AbaloneMove';
import { AbaloneConfig, AbaloneNode } from './AbaloneRules';
import { AbaloneState } from './AbaloneState';

export class AbaloneScoreHeuristic extends PlayerMetricHeuristic<AbaloneMove, AbaloneState, AbaloneConfig> {

    public override getMetrics(node: AbaloneNode, _config: MGPOptional<AbaloneConfig>): PlayerNumberTable {
        return node.gameState.getScores().toTable();
    }

}
