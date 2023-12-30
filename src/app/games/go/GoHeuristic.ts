import { GoState, GoPiece } from './GoState';
import { GoMove } from './GoMove';
import { PlayerMetricHeuristic, PlayerNumberTable } from 'src/app/jscaip/AI/Minimax';
import { GoConfig, GoNode, GoRules } from './GoRules';

export class GoHeuristic extends PlayerMetricHeuristic<GoMove, GoState, GoConfig> {

    public getMetrics(node: GoNode): PlayerNumberTable {
        const goState: GoState = GoRules.markTerritoryAndCount(node.gameState);
        const goScore: number[] = goState.getCapturedCopy();
        const goKilled: number[] = this.getDeadStones(goState);
        return PlayerNumberTable.of(
            [goScore[0] + (2 * goKilled[1])],
            [goScore[1] + (2 * goKilled[0])],
        );
    }

    public getDeadStones(state: GoState): number[] {
        const killed: number[] = [0, 0];

        for (const coordAndContent of state.getCoordsAndContents()) {
            const piece: GoPiece = coordAndContent.content;
            if (piece.type === 'dead') {
                killed[piece.player.value] = killed[piece.player.value] + 1;
            }
        }
        return killed;
    }

}
