import { Coord } from 'src/app/jscaip/Coord';
import { Orthogonal } from 'src/app/jscaip/Orthogonal';
import { BoardValue } from 'src/app/jscaip/AI/BoardValue';
import { Player } from 'src/app/jscaip/Player';
import { TaflPawn } from './TaflPawn';
import { TaflState } from './TaflState';
import { MGPOptional } from '@everyboard/lib';
import { TaflMove } from './TaflMove';
import { TaflPieceAndControlHeuristic, TaflPieceAndControlHeuristicMetrics } from './TaflPieceAndControlHeuristic';
import { TaflNode } from './TaflRules';
import { TaflConfig } from './TaflConfig';

export class TaflEscapeThenPieceThenControlHeuristic<M extends TaflMove> extends TaflPieceAndControlHeuristic<M> {

    public override getBoardValue(node: TaflNode<M>, config: MGPOptional<TaflConfig>): BoardValue {
        const metrics: TaflPieceAndControlHeuristicMetrics = this.getControlScoreAndPieceScores(node, config);
        const stepForEscape: number = this.getStepForEscapeMetric(node.gameState);
        return BoardValue.multiMetric([
            stepForEscape,
            metrics.safeScore,
            metrics.threatenedScore,
            metrics.controlScore,
        ]);
    }

    private getStepForEscapeMetric(state: TaflState): number {
        const defender: Player = state.getPieceAt(this.rules.getKingCoord(state).get()).getOwner() as Player;
        const stepForEscape: number = this.getStepForEscape(state) * defender.getScoreModifier();
        if (stepForEscape === -1) {
            return defender.getOpponent().getPreVictory();
        } else {
            return -1 * stepForEscape;
        }
    }

    private getStepForEscape(state: TaflState): number {
        const king: Coord = this.rules.getKingCoord(state).get();
        return this._getStepForEscape(state, 1, [king], []).getOrElse(-1);
    }

    private _getStepForEscape(state: TaflState,
                              step: number,
                              previousGen: Coord[],
                              handledCoords: Coord[])
    : MGPOptional<number>
    {
        const nextGen: Coord[] = this.getNextGen(state, previousGen, handledCoords);

        if (nextGen.length === 0) {
            // not found:
            return MGPOptional.empty();
        }
        if (nextGen.some((coord: Coord) => state.isExternalThrone(coord))) {
            return MGPOptional.of(step);
        } else {
            step++;
            handledCoords.push(...nextGen);
            return this._getStepForEscape(state, step, nextGen, handledCoords);
        }
    }

    private getNextGen(state: TaflState, previousGen: Coord[], handledCoords: Coord[]): Coord[] {
        const newGen: Coord[] = [];
        for (const piece of previousGen) {
            for (const dir of Orthogonal.ORTHOGONALS) {
                let landing: Coord = piece.getNext(dir, 1);
                while (state.hasPieceAt(landing, TaflPawn.UNOCCUPIED)) {
                    if (handledCoords.every((coord: Coord) => coord.equals(landing) === false)) {
                        // coord is new
                        newGen.push(landing);
                    }
                    landing = landing.getNext(dir, 1);
                }
            }
        }
        return newGen;
    }

}
