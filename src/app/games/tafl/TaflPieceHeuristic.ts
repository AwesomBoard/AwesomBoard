import { TaflNode, TaflRules } from './TaflRules';
import { TaflMove } from './TaflMove';
import { TaflState } from './TaflState';
import { Player } from 'src/app/jscaip/Player';
import { HeuristicBounds, PlayerMetricHeuristicWithBounds } from 'src/app/jscaip/AI/Minimax';
import { PlayerNumberTable } from 'src/app/jscaip/PlayerNumberTable';
import { TaflConfig } from './TaflConfig';
import { MGPOptional } from '@everyboard/lib';
import { BoardValue } from 'src/app/jscaip/AI/BoardValue';
import { PlayerNumberMap } from 'src/app/jscaip/PlayerMap';

export class TaflPieceHeuristic<M extends TaflMove> extends PlayerMetricHeuristicWithBounds<M, TaflState, TaflConfig> {

    public constructor(public readonly rules: TaflRules<M>) {
        super();
    }

    public override getMetrics(node: TaflNode<M>, config: MGPOptional<TaflConfig>): PlayerNumberTable {
        const state: TaflState = node.gameState;
        // We just count the pawns
        const nPawnsZero: number = this.rules.getPlayerListPawns(Player.ZERO, state).length;
        const nPawnsOne: number = this.rules.getPlayerListPawns(Player.ONE, state).length;
        return this.getHeuristicValue(config.get(), nPawnsZero, nPawnsOne).toTable();
    }

    private getHeuristicValue(config: TaflConfig, nPawnsZero: number, nPawnsOne: number): PlayerNumberMap {
        const invader: Player = this.rules.getInvader(config);
        const scoreZero: number = this.getScoreFor(Player.ZERO, invader, nPawnsZero);
        const scoreOne: number = this.getScoreFor(Player.ZERO, invader, nPawnsOne);
        return PlayerNumberMap.of(scoreZero, scoreOne);
    }

    private getScoreFor(player: Player, invader: Player, nPawns: number): number {
        // Invaders pieces are twice as numerous, so they are twice  less valuable
        const mult: number = [[1, 2], [2, 1]][player.getValue()][invader.getValue()];
        return nPawns * mult;
    }

    public override getBounds(config: MGPOptional<TaflConfig>): HeuristicBounds<BoardValue> {
        // For the maximum, we consider the game of hnefatafl which has 24 pieces and 13
        // Another option would be to define a heuristic that is mostly copy-pasted from this, but in each tafl games
        // In the end, what we care about is "bigger metric = better", not that it is 100% accurate
        const maxPawns: [number, number] = [24, 13];
        const invader: Player = this.rules.getInvader(config.get());
        const nPawnsZero: number = maxPawns[invader.getValue()];
        const nPawnsOne: number = maxPawns[invader.getOpponent().getValue()];
        const player0Best: BoardValue =
            BoardValue.ofPlayerNumberMap(this.getHeuristicValue(config.get(), nPawnsZero, 0));
        const player1Best: BoardValue =
            BoardValue.ofPlayerNumberMap(this.getHeuristicValue(config.get(), 0, nPawnsOne));
        return { player0Best, player1Best };
    }

}
