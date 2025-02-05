import { Coord } from 'src/app/jscaip/Coord';
import { Orthogonal } from 'src/app/jscaip/Orthogonal';
import { BoardValue } from 'src/app/jscaip/AI/BoardValue';
import { Player } from 'src/app/jscaip/Player';
import { MGPMap, MGPOptional, Set } from '@everyboard/lib';
import { TaflPawn } from './TaflPawn';
import { TaflState } from './TaflState';
import { SandwichThreat } from '../../jscaip/PieceThreat';
import { CoordSet } from 'src/app/jscaip/CoordSet';
import { TaflMove } from './TaflMove';
import { TaflPieceAndInfluenceHeuristic } from './TaflPieceAndInfluenceHeuristic';
import { TaflNode } from './TaflRules';
import { TaflConfig } from './TaflConfig';

export type TaflPieceAndControlHeuristicMetrics = {
    controlScore: number,
    threatenedScore: number,
    safeScore: number,
};

export class TaflPieceAndControlHeuristic<M extends TaflMove> extends TaflPieceAndInfluenceHeuristic<M> {

    public override getBoardValue(node: TaflNode<M>, config: MGPOptional<TaflConfig>): BoardValue {
        const metrics: TaflPieceAndControlHeuristicMetrics = this.getControlScoreAndPieceScores(node, config);
        return BoardValue.multiMetric([
            metrics.safeScore,
            metrics.threatenedScore,
            metrics.controlScore,
        ]);
    }

    protected getControlScoreAndPieceScores(node: TaflNode<M>, config: MGPOptional<TaflConfig>)
    : TaflPieceAndControlHeuristicMetrics
    {
        const state: TaflState = node.gameState;
        const pieceMap: MGPMap<Player, CoordSet> = this.getPiecesMap(state);
        const threatMap: MGPMap<Coord, Set<SandwichThreat>> = this.getThreatMap(node, pieceMap);
        const filteredThreatMap: MGPMap<Coord, Set<SandwichThreat>> = this.filterThreatMap(threatMap, state);
        const metrics: TaflPieceAndControlHeuristicMetrics = { safeScore: 0, threatenedScore: 0, controlScore: 0 };
        for (const owner of Player.PLAYERS) {
            let controlledSquares: CoordSet = new CoordSet();
            for (const coord of pieceMap.get(owner).get()) {
                if (filteredThreatMap.get(coord).isPresent()) {
                    metrics.threatenedScore += owner.getScoreModifier();
                } else {
                    metrics.safeScore += owner.getScoreModifier();
                    for (const dir of Orthogonal.ORTHOGONALS) {
                        let testedCoord: Coord = coord.getNext(dir, 1);
                        while (state.hasPieceAt(testedCoord, TaflPawn.UNOCCUPIED)) {
                            controlledSquares = controlledSquares.addElement(testedCoord);
                            testedCoord = testedCoord.getNext(dir, 1);
                        }
                    }
                }
            }
            for (const controlled of controlledSquares) {
                const controlledValue: number = this.getControlledPieceValue(controlled, state);
                metrics.controlScore += owner.getScoreModifier() * controlledValue;
            }
        }
        return metrics;
    }

    private getControlledPieceValue(coord: Coord, state: TaflState): number {
        let value: number = 1;
        if (state.isHorizontalEdge(coord)) {
            value *= state.getWidth();
        }
        if (state.isVerticalEdge(coord)) {
            value *= state.getWidth();
        }
        /** 1 for center
          * width for border
          * width * width for corners
          */
        return value;
    }

}
