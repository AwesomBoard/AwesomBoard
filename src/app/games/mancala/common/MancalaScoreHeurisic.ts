import { MancalaState } from '../common/MancalaState';
import { HeuristicBounds, PlayerMetricHeuristic } from 'src/app/jscaip/AI/Minimax';
import { PlayerNumberTable } from 'src/app/jscaip/PlayerNumberTable';
import { MancalaMove } from './MancalaMove';
import { MancalaConfig } from './MancalaConfig';
import { MGPOptional } from '@everyboard/lib';
import { MancalaNode } from './MancalaRules';
import { BoardValue } from 'src/app/jscaip/AI/BoardValue';

export class MancalaScoreHeuristic extends PlayerMetricHeuristic<MancalaMove, MancalaState, MancalaConfig>
{

    public override getMetrics(node: MancalaNode, _config: MGPOptional<MancalaConfig>): PlayerNumberTable {
        return node.gameState.getScoresCopy().toTable();
    }

    public override getBounds(config: MGPOptional<MancalaConfig>): MGPOptional<HeuristicBounds<BoardValue>> {
        const maxScore: number = config.get().width * 2 * config.get().seedsByHouse;
        return MGPOptional.of({
            player0Max: BoardValue.ofSingle(maxScore, 0),
            player1Max: BoardValue.ofSingle(0, maxScore),
        });
    }

}
