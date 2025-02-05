import { AI, AIDepthLimitOptions, MoveGenerator } from './AI';
import { Move } from '../Move';
import { BoardValue } from './BoardValue';
import { ArrayUtils, MGPFallible, MGPOptional, Set, Utils } from '@everyboard/lib';
import { GameState } from '../state/GameState';
import { Player } from '../Player';
import { GameStatus } from '../GameStatus';
import { SuperRules } from '../Rules';
import { EmptyRulesConfig, RulesConfig } from '../RulesConfigUtil';
import { GameNode } from './GameNode';
import { PlayerNumberTable } from '../PlayerNumberTable';

/**
 * A heuristic assigns a specific value for a node.
 * This is used for example by minimax-based AIs.
 * The value assigned to a node can be more than just a number, and is thus a `BoardValue`
 */
export abstract class Heuristic<M extends Move,
                                S extends GameState,
                                B extends BoardValue = BoardValue,
                                C extends RulesConfig = EmptyRulesConfig>
{
    public abstract getBoardValue(node: GameNode<M, S>, config: MGPOptional<C>): B;
}

export abstract class PlayerMetricHeuristic<M extends Move,
                                            S extends GameState,
                                            C extends RulesConfig = EmptyRulesConfig>
    extends Heuristic<M, S, BoardValue, C>
{
    public abstract getMetrics(node: GameNode<M, S>, config: MGPOptional<C>): PlayerNumberTable;

    public getBoardValue(node: GameNode<M, S>, config: MGPOptional<C>): BoardValue {
        const metrics: PlayerNumberTable = this.getMetrics(node, config);
        return BoardValue.ofMultiple(
            metrics.get(Player.ZERO).get(),
            metrics.get(Player.ONE).get(),
        );
    }

}

export class DummyHeuristic<M extends Move, S extends GameState, C extends RulesConfig = EmptyRulesConfig>
    extends PlayerMetricHeuristic<M, S, C>
{

    public override getMetrics(_node: GameNode<M, S>, _config?: MGPOptional<C>): PlayerNumberTable {
        // This is really a dummy heuristic: boards have no value
        return PlayerNumberTable.ofSingle(0, 0);
    }

}

/**
 * This implements the minimax algorithm with alpha-beta pruning.
 */
export class Minimax<M extends Move,
                     S extends GameState,
                     C extends RulesConfig = EmptyRulesConfig,
                     L = void>
implements AI<M, S, AIDepthLimitOptions, C>
{

    // States whether the minimax takes random moves from the list of best moves.
    public random: boolean = false;
    // States whether alpha-beta pruning must be done. It probably is never useful to set it to false.
    public prune: boolean = true;

    public readonly availableOptions: AIDepthLimitOptions[] = [];

    public constructor(public readonly name: string,
                       private readonly rules: SuperRules<M, S, C, L>,
                       private readonly heuristic: Heuristic<M, S, BoardValue, C>,
                       private readonly moveGenerator: MoveGenerator<M, S, C>)
    {
        for (let i: number = 1; i < 10; i++) {
            this.availableOptions.push({ name: `Level ${i}`, maxDepth: i });
        }
    }

    public toString(): string {
        return this.name;
    }

    public chooseNextMove(node: GameNode<M, S>, options: AIDepthLimitOptions, config: MGPOptional<C>): M {
        Utils.assert(this.rules.getGameStatus(node, config).isEndGame === false,
                     'Minimax has been asked to choose a move from a finished game');
        const boardValue: BoardValue = this.getExpectedExtremum(node, config);
        let bestDescendant: GameNode<M, S> = this.alphaBeta(node,
                                                            options.maxDepth,
                                                            boardValue.toMinimum(),
                                                            boardValue.toMaximum(),
                                                            config);
        while (bestDescendant.gameState.turn > node.gameState.turn + 1) {
            bestDescendant = bestDescendant.parent.get();
        }
        return bestDescendant.previousMove.get();
    }

    public alphaBeta(node: GameNode<M, S>,
                     depth: number,
                     alpha: BoardValue,
                     beta: BoardValue,
                     config: MGPOptional<C>)
    : GameNode<M, S>
    {
        if (depth < 1) {
            return node; // leaf by calculation
        } else if (this.rules.getGameStatus(node, config).isEndGame) {
            return node; // rules - leaf or calculation - leaf
        }
        const possibleMoves: Set<M> = this.getPossibleMoves(node, config);
        Utils.assert(possibleMoves.size() > 0, 'Minimax ' + this.name + ' should give move, received none!');
        const bestChildren: GameNode<M, S>[] = this.getBestChildren(node, possibleMoves, depth, alpha, beta, config);
        const bestChild: GameNode<M, S> = this.getBestChildAmong(bestChildren);
        const bestChildScore: BoardValue = this.getScore(bestChild, config);
        this.setScore(node, bestChildScore);
        return bestChild;
    }

    private getPossibleMoves(node: GameNode<M, S>, config: MGPOptional<C>): Set<M> {
        const currentMoves: MGPOptional<Set<M>> = this.getMoves(node);
        if (currentMoves.isAbsent()) {
            const moves: M[] = this.moveGenerator.getListMoves(node, config);
            this.setMoves(node, new Set(moves));
            return new Set(moves);
        } else {
            return currentMoves.get();
        }
    }

    private getBestChildren(node: GameNode<M, S>,
                            possibleMoves: Set<M>,
                            depth: number,
                            alpha: BoardValue,
                            beta: BoardValue,
                            config: MGPOptional<C>)
    : GameNode<M, S>[]
    {
        let bestChildren: GameNode<M, S>[] = [];
        const currentPlayer: Player = node.gameState.getCurrentPlayer();
        let extremumExpected: BoardValue = this.getExpectedExtremum(node, config);
        const newValueIsBetter: (newValue: BoardValue, currentValue: BoardValue) => boolean =
            currentPlayer === Player.ZERO ? BoardValue.isLessThan : BoardValue.isGreaterThan;
        for (const move of possibleMoves) {
            const child: GameNode<M, S> = this.getOrCreateChild(node, move, config);
            const bestChildDescendant: GameNode<M, S> = this.alphaBeta(child, depth - 1, alpha, beta, config);
            const bestChildValue: BoardValue = this.getScore(bestChildDescendant, config);
            if (newValueIsBetter(bestChildValue, extremumExpected) || bestChildren.length === 0) {
                extremumExpected = bestChildValue;
                bestChildren = [bestChildDescendant];
            } else if (bestChildValue.equals(extremumExpected)) {
                bestChildren.push(bestChildDescendant);
            }
            if (this.prune && newValueIsBetter(extremumExpected, currentPlayer === Player.ZERO ? alpha : beta)) {
                // cut-off, no need to explore the other children
                break;
            }
            if (currentPlayer === Player.ZERO) {
                beta = BoardValue.min(extremumExpected, beta);
            } else {
                alpha = BoardValue.max(extremumExpected, alpha);
            }
        }
        return bestChildren;
    }

    private getExpectedExtremum(node: GameNode<M, S>, config: MGPOptional<C>): BoardValue {
        const childValue: BoardValue = this.getScore(node, config);
        const currentPlayer: Player = node.gameState.getCurrentPlayer();
        if (currentPlayer === Player.ZERO) {
            return childValue.toMaximum();
        } else {
            return childValue.toMinimum();
        }
    }

    private getBestChildAmong(bestChildren: GameNode<M, S>[]): GameNode<M, S> {
        if (this.random) {
            return ArrayUtils.getRandomElement(bestChildren);
        } else {
            return bestChildren[0];
        }
    }

    private getOrCreateChild(node: GameNode<M, S>, move: M, config: MGPOptional<C>): GameNode<M, S> {
        const child: MGPOptional<GameNode<M, S>> = node.getChild(move);
        if (child.isAbsent()) {
            const legality: MGPFallible<L> = this.rules.isLegal(move, node.gameState, config);
            const moveString: string = move.toString();
            Utils.assert(legality.isSuccess(), 'The minimax "' + this.name + '" has proposed an illegal move at turn ' + node.gameState.turn + ' (' + moveString + '), ' +
                                               'refusal reason: "' + legality.getReasonOr('') + '", this should not happen.');
            const state: S = this.rules.applyLegalMove(move, node.gameState, config, legality.get());
            const newChild: GameNode<M, S> = new GameNode(state,
                                                          MGPOptional.of(node),
                                                          MGPOptional.of(move));
            node.addChild(newChild);
            this.setScore(newChild, this.computeBoardValue(newChild, config));
            return newChild;
        }
        return child.get();
    }

    private setScore(node: GameNode<M, S>, score: BoardValue): void {
        node.setCache(this.name + '-score', score);
    }

    private getScore(node: GameNode<M, S>, config: MGPOptional<C>): BoardValue {
        // Scores are created during node creation, so we might think that they are always present
        // but other AIs can expand the tree without creating the scores
        const score: MGPOptional<BoardValue> = node.getCache<BoardValue>(this.name + '-score');
        if (score.isPresent()) {
            return score.get();
        } else {
            const boardValue: BoardValue = this.computeBoardValue(node, config);
            this.setScore(node, boardValue);
            return boardValue;
        }
    }

    private computeBoardValue(node: GameNode<M, S>, config: MGPOptional<C>): BoardValue {
        const gameStatus: GameStatus = this.rules.getGameStatus(node, config);
        if (gameStatus.isEndGame) {
            return gameStatus.toBoardValue();
        } else {
            return this.heuristic.getBoardValue(node, config);
        }
    }

    private setMoves(node: GameNode<M, S>, moves: Set<M>): void {
        node.setCache(this.name + '-moves', moves);
    }

    private getMoves(node: GameNode<M, S>): MGPOptional<Set<M>> {
        return node.getCache(this.name + '-moves');
    }

    public getInfo(node: GameNode<M, S>, config: MGPOptional<C>): string {
        return 'BoardValue=' + this.heuristic.getBoardValue(node, config).metrics;
    }

}
