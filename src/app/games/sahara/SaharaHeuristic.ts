import { Player } from 'src/app/jscaip/Player';
import { SaharaMove } from './SaharaMove';
import { SaharaState } from './SaharaState';
import { SaharaNode, SaharaRules } from './SaharaRules';
import { PlayerMetricHeuristic } from 'src/app/jscaip/AI/Minimax';
import { PlayerNumberTable } from 'src/app/jscaip/PlayerNumberTable';
import { NoConfig } from 'src/app/jscaip/RulesConfigUtil';

export class SaharaHeuristic extends PlayerMetricHeuristic<SaharaMove, SaharaState> {

    public override getMetrics(node: SaharaNode, _config: NoConfig): PlayerNumberTable {
        const zeroFreedoms: number[] = SaharaRules.getBoardValuesFor(node.gameState, Player.ZERO);
        const oneFreedoms: number[] = SaharaRules.getBoardValuesFor(node.gameState, Player.ONE);
        return PlayerNumberTable.of(zeroFreedoms, oneFreedoms);
    }

}
