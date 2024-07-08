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
import { Heuristic } from './Minimax';

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
                       private readonly heuristic: Heuristic<M, S, B, C>)
    {
        super(name, moveGenerator, rules);
    }

    /**
     * Return a win score which is the average of all metrics
     */
    protected override winScore(node: GameNode<M, S>,
                                config: MGPOptional<C>,
                                gameStatus: GameStatus,
                                player: Player): number {
        if (gameStatus === GameStatus.ONGOING) {
            const boardValue: B = this.heuristic.getBoardValue(node, config);
            const optionalMaxValue: MGPOptional<B> = this.heuristic.getMaxValue(config);
            Utils.assert(optionalMaxValue.isPresent(),
                         'MCTSWithHeuristic used with a heuristic that has no max value, please define getMaxValue');
            const maxValue: B = optionalMaxValue.get();
            Utils.assert(boardValue.metrics.length === maxValue.metrics.length,
                         'Metrics and maximum values should have the same shape');
            let value: number = 0;
            for (let i: number = 0; i < boardValue.metrics.length; i++) {
                value += boardValue.metrics[i] / maxValue.metrics[i];
            }
            value = value / boardValue.metrics.length;
            Utils.assert(0 <= value && value <= 1, 'MCTSWithHeuristic got a value outside of [0,1]');
            return value;
        } else {
            return super.winScore(node, config, gameStatus, player);
        }
    }
}
