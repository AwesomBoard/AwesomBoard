import { CoerceoMove } from './CoerceoMove';
import { CoerceoState } from './CoerceoState';
import { CoerceoNode } from './CoerceoRules';
import { PlayerMetricHeuristic } from 'src/app/jscaip/AI/Minimax';
import { PlayerNumberTable } from 'src/app/jscaip/PlayerNumberTable';
import { NoConfig } from 'src/app/jscaip/RulesConfigUtil';

export class CoerceoCapturesAndFreedomHeuristic extends PlayerMetricHeuristic<CoerceoMove, CoerceoState> {

    public override getMetrics(node: CoerceoNode, _config: NoConfig): PlayerNumberTable {
        const state: CoerceoState = node.gameState;
        const piecesByFreedom: number[][] = state.getPiecesByFreedom();
        const piecesScores: number[] = this.getPiecesScore(piecesByFreedom);
        return PlayerNumberTable.of(
            [(2 * state.captures[0]) + piecesScores[0]],
            [(2 * state.captures[1]) + piecesScores[1]],
        );
    }

    public getPiecesScore(piecesByFreedom: number[][]): number[] {
        return [
            this.getPlayerPiecesScore(piecesByFreedom[0]),
            this.getPlayerPiecesScore(piecesByFreedom[1]),
        ];
    }

    public getPlayerPiecesScore(piecesScores: number[]): number {
        return (3 * piecesScores[0]) +
            (1 * piecesScores[1]) +
            (3 * piecesScores[2]) +
            (3 * piecesScores[3]);
    }

}
