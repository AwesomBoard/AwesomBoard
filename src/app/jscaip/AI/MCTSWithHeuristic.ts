import { MGPOptional, Utils } from '@everyboard/lib';
import { GameStatus } from '../GameStatus';
import { Move } from '../Move';
import { Player } from '../Player';
import { SuperRules } from '../Rules';
import { EmptyRulesConfig, RulesConfig } from '../RulesConfigUtil';
import { GameState } from '../state/GameState';
import { MoveGenerator } from './AI';
import { BoardValue } from './BoardValue';
import { GameNode } from './GameNode';
import { MCTS } from './MCTS';
import { HeuristicWithBounds, HeuristicBounds } from './Minimax';

/**
 * Like MCTS, but uses a heuristic function to evaluate non-terminated states.
 */
export class MCTSWithHeuristic<M extends Move,
                               S extends GameState,
                               C extends RulesConfig = EmptyRulesConfig,
                               B extends BoardValue = BoardValue,
                               L = void>
    extends MCTS<M, S, C, L>
{

    public constructor(name: string,
                       moveGenerator: MoveGenerator<M, S, C>,
                       rules: SuperRules<M, S, C, L>,
                       private readonly heuristic: HeuristicWithBounds<M, S, B, C>)
    {
        super(name, moveGenerator, rules);
    }

    /**
     * Return a win score which is the average of all metrics
     */
    protected override winScore(node: GameNode<M, S>,
                                config: MGPOptional<C>,
                                gameStatus: GameStatus,
                                player: Player)
    : number
    {
        if (gameStatus === GameStatus.ONGOING) {
            const boardValue: B = this.heuristic.getBoardValue(node, config);
            const bounds: HeuristicBounds<B> = this.heuristic.getBounds(config);
            Utils.assert(boardValue.metrics.length === bounds.player0Best.metrics.length &&
                         boardValue.metrics.length === bounds.player1Best.metrics.length,
                         'Metrics and bound values should have the same shape');
            let value: number = 0;
            for (let i: number = 0; i < boardValue.metrics.length; i++) {
                const player0Best: number = bounds.player0Best.metrics[i];
                const metric: number = boardValue.metrics[i];
                const player1Best: number = bounds.player1Best.metrics[i];
                // It can be the case sometimes that the metric is out of range from the bounds.
                // In such cases, we treat this as an extreme value, and cap it to the best available value
                const cappedValue: number = Math.max(Math.min(metric, player1Best), player0Best);
                if (cappedValue - metric < 1000) {
                    // Our metric is somewhat close to the bounds, it is likely an error in the metric.
                    // We can warn the user about it.
                    console.warn(`MCTSWithHeuristic capped a value close to the bounds: ${metric} has been capped to ${cappedValue}, bounds are [${player0Best}, ${player1Best}]`);
                }
                value += (Math.min(metric, player1Best) - player0Best) / (player1Best - player0Best);
            }
            value = value / boardValue.metrics.length;
            Utils.assert(0 <= value && value <= 1, 'MCTSWithHeuristic got a value outside of [0,1]');
            return value;
        } else {
            return super.winScore(node, config, gameStatus, player);
        }
    }
}
