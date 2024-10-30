import { HeuristicBounds, PlayerMetricHeuristic } from 'src/app/jscaip/AI/Minimax';
import { PlayerNumberTable } from 'src/app/jscaip/PlayerNumberTable';
import { DvonnMove } from './DvonnMove';
import { DvonnNode, DvonnRules } from './DvonnRules';
import { DvonnState } from './DvonnState';
import { NoConfig } from 'src/app/jscaip/RulesConfigUtil';
import { MGPOptional } from '@everyboard/lib';
import { BoardValue } from 'src/app/jscaip/AI/BoardValue';

export class DvonnScoreHeuristic extends PlayerMetricHeuristic<DvonnMove, DvonnState> {

    public override getMetrics(node: DvonnNode, _config: NoConfig): PlayerNumberTable {
        // The metric the total number of pieces controlled by a player
        return DvonnRules.getScores(node.gameState).toTable();
    }

    // Min/max value: all pieces are controlled by one. There are 49 pieces
    public override getBounds(_config: NoConfig): MGPOptional<HeuristicBounds<BoardValue>> {
        const numberOfPieces: number = 49;
        return MGPOptional.of({
            player0Max: BoardValue.ofSingle(numberOfPieces, 0),
            player1Max: BoardValue.ofSingle(0, numberOfPieces),
        });
    }
}
