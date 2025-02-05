import { Coord } from 'src/app/jscaip/Coord';
import { Ordinal } from 'src/app/jscaip/Ordinal';
import { BoardValue } from 'src/app/jscaip/AI/BoardValue';
import { Player, PlayerOrNone } from 'src/app/jscaip/Player';
import { EpaminondasState } from './EpaminondasState';
import { EpaminondasConfig, EpaminondasNode } from './EpaminondasRules';
import { EpaminondasHeuristic } from './EpaminondasHeuristic';
import { MGPOptional } from '@everyboard/lib';

export class EpaminondasAttackHeuristic extends EpaminondasHeuristic {

    private readonly DOMINANCE_FACTOR: number = 20;
    private readonly DEFENSE_FACTOR: number = 5;
    private readonly TERRITORY_FACTOR: number = 2;
    private readonly OFFENSE_FACTOR: number = 10;
    private readonly CENTER_FACTOR: number = 5;
    private readonly MOBILITY_FACTOR: number = 0.12;

    public override getBoardValue(node: EpaminondasNode, _config: MGPOptional<EpaminondasConfig>): BoardValue {
        const state: EpaminondasState = node.gameState;
        const dominance: number = this.getDominance(state);
        const defense: number = this.getDefense(state);
        const territory: number = this.getTerritory(state);
        const center: number = this.getCenter(state);
        const winning: number = this.getOffense(state);
        const mobility: number = this.getMobility(state);
        return BoardValue.of(dominance + defense + territory + center + winning + mobility);
    }

    public getDominance(state: EpaminondasState): number {
        let score: number = 0;
        for (const coordAndContent of state.getPlayerCoordsAndContent()) {
            score += coordAndContent.content.getScoreModifier();
        }
        return score * this.DOMINANCE_FACTOR;
    }

    public getDefense(state: EpaminondasState): number {
        let score: number = 0;
        const width: number = state.getWidth();
        const height: number = state.getHeight();
        for (let x: number = 0; x < width; x++) {
            if (state.getPieceAtXY(x, height - 1) === Player.ZERO) {
                score += Player.ZERO.getScoreModifier();
            }
            if (state.getPieceAtXY(x, 0) === Player.ONE) {
                score += Player.ONE.getScoreModifier();
            }
        }
        return score * this.DEFENSE_FACTOR;
    }

    public getTerritory(state: EpaminondasState): number {
        let score: number = 0;
        for (const coordAndContent of state.getPlayerCoordsAndContent()) {
            const owner: Player = coordAndContent.content;
            for (let dx: number = -1; dx <= 1; dx++) {
                for (let dy: number = -1; dy <= 1; dy++) {
                    const coord: Coord = coordAndContent.coord.getNext(new Coord(dx, dy), 1);
                    if (state.hasPieceAt(coord, owner)) {
                        score += 1 * owner.getScoreModifier();
                    } else if (state.hasPieceAt(coord, PlayerOrNone.NONE)) {
                        score += 1 * owner.getScoreModifier();
                    }
                }
            }
            score -= owner.getScoreModifier();
        }
        return score * this.TERRITORY_FACTOR;
    }

    public getOffense(state: EpaminondasState): number {
        let score: number = 0;
        const width: number = state.getWidth();
        const height: number = state.getHeight();
        for (let x: number = 0; x < width; x++) {
            if (state.getPieceAtXY(x, 0) === Player.ZERO) {
                score += Player.ZERO.getScoreModifier();
            }
            if (state.getPieceAtXY(x, height - 1) === Player.ONE) {
                score += Player.ONE.getScoreModifier();
            }
        }
        return score * this.OFFENSE_FACTOR;
    }

    public getCenter(state: EpaminondasState): number {
        let score: number = 0;
        const width: number = state.getWidth();
        const cx: number = (width - 1) / 2;
        for (const coordAndContent of state.getPlayerCoordsAndContent()) {
            const owner: Player = coordAndContent.content;
            score += owner.getScoreModifier() * Math.abs(coordAndContent.coord.x - cx);
        }
        return score * this.CENTER_FACTOR;
    }

    public getMobility(state: EpaminondasState): number {
        let score: number = 0;
        let biggestZero: number = 0;
        let biggestOne: number = 0;
        for (const coordAndContent of state.getPlayerCoordsAndContent()) {
            const firstCoord: Coord = coordAndContent.coord;
            const owner: Player = coordAndContent.content;
            for (const direction of Ordinal.ORDINALS) {
                let phalanxSize: number = 1;
                let nextCoord: Coord = firstCoord.getNext(direction, 1);
                while (state.hasPieceAt(nextCoord, owner)) {
                    phalanxSize += 1;
                    nextCoord = nextCoord.getNext(direction, 1);
                }
                let stepSize: number = 1;
                while (stepSize <= phalanxSize &&
                       state.hasPieceAt(nextCoord, PlayerOrNone.NONE))
                {
                    stepSize++;
                    nextCoord = nextCoord.getNext(direction, 1);
                }
                score += (stepSize * stepSize) * owner.getScoreModifier();
                if (owner === Player.ZERO) {
                    biggestZero = Math.max(biggestZero, stepSize);
                } else if (owner === Player.ONE) {
                    biggestOne = Math.max(biggestOne, stepSize);
                }
            }
        }
        return (score +
            biggestZero * Player.ZERO.getScoreModifier() +
            biggestOne * Player.ONE.getScoreModifier()) * this.MOBILITY_FACTOR;
    }
}
