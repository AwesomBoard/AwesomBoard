import { MancalaState } from '../common/MancalaState';
import { HeuristicBounds, PlayerMetricHeuristicWithBounds } from 'src/app/jscaip/AI/Minimax';
import { PlayerNumberTable } from 'src/app/jscaip/PlayerNumberTable';
import { MancalaMove } from './MancalaMove';
import { MancalaConfig } from './MancalaConfig';
import { MGPOptional } from '@everyboard/lib';
import { MancalaNode } from './MancalaRules';
import { BoardValue } from 'src/app/jscaip/AI/BoardValue';

export class MancalaScoreHeuristic extends PlayerMetricHeuristicWithBounds<MancalaMove, MancalaState, MancalaConfig>
{

    public override getMetrics(node: MancalaNode, _config: MGPOptional<MancalaConfig>): PlayerNumberTable {
        return node.gameState.getScoresCopy().toTable();
    }

    public override getBounds(config: MGPOptional<MancalaConfig>): HeuristicBounds<BoardValue> {
        const maxScore: number = config.get().width * 2 * config.get().seedsByHouse;
        return {
            player0Best: BoardValue.ofSingle(maxScore, 0),
            player1Best: BoardValue.ofSingle(0, maxScore),
        };
    }

}
