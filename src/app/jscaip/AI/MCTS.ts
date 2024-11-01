import { ArrayUtils, MGPFallible, MGPOptional, Utils } from '@everyboard/lib';
import { GameState } from '../state/GameState';
import { GameStatus } from '../GameStatus';
import { AI, AITimeLimitOptions, MoveGenerator } from './AI';
import { GameNode } from './GameNode';
import { Move } from '../Move';
import { Player } from '../Player';
import { EmptyRulesConfig, RulesConfig } from '../RulesConfigUtil';
import { SuperRules } from '../Rules';
import { Debug } from 'src/app/utils/Debug';

type NodeAndPath<M extends Move, S extends GameState> = {
    node: GameNode<M, S>,
    path: GameNode<M, S>[],
}

/**
 * Implement Monte-Carlo Tree Search
 * Useful resources to understand MCTS:
 *   - https://www.analyticsvidhya.com/blog/2019/01/monte-carlo-tree-search-introduction-algorithm-deepmind-alphago/
 *   - https://vgarciasc.github.io/mcts-viz/
 */
export class MCTS<M extends Move,
                  S extends GameState,
                  C extends RulesConfig = EmptyRulesConfig,
                  L = void>
implements AI<M, S, AITimeLimitOptions, C>
{
    // The exploration parameter influences the MCTS results.
    // It is chosen "empirically". The generally recommended value from Wikipedia is Math.sqrt(2),
    // but in our case it seems to work much better with a higher exploration parameter.
    // A higher exploration parameter steers MCTS towards exploring more unexplored playouts, vs. exploring its wins.
    public explorationParameter: number = 80;

    // The longest a game can be before we decide to stop simulating it
    public maxGameLength: number = 7*6; // Set to the number of moves in connect 4

    public readonly availableOptions: AITimeLimitOptions[] = [];

    // A id unique to this MCTS, used to store/retrieve cached value in nodes without clashing with other AIs
    private readonly uniqueId: string;

    public constructor(public readonly name: string,
                       private readonly moveGenerator: MoveGenerator<M, S, C>,
                       private readonly rules: SuperRules<M, S, C, L>)
    {
        this.uniqueId = Math.random().toString(36).substring(2, 8);
        for (let i: number = 1; i < 10; i++) {
            this.availableOptions.push({ name: `${i*i} seconds`, maxSeconds: i*i });
        }
    }

    /**
     * Performs the search, given a node representing a board.
     * The search is performed for at most `iterations` iterations.
     */
    public chooseNextMove(root: GameNode<M, S>, options: AITimeLimitOptions, config: MGPOptional<C>): M {
        Utils.assert(this.rules.getGameStatus(root, config).isEndGame === false, 'cannot search from a finished game');
        const player: Player = root.gameState.getCurrentPlayer();
        const startTime: number = Date.now();
        const endTime: number = Date.now() + options.maxSeconds * 1000;
        let iterations: number = 0;
        while (Date.now() < endTime) {
            const expansionResult: NodeAndPath<M, S> = this.expand(
                this.select({ node: root, path: [root] }), config);
            const gameStatus: GameStatus = this.simulate(expansionResult.node, endTime, config);
            this.backpropagate(expansionResult.path, this.winScore(expansionResult.node, config, gameStatus, player));
            iterations++;
        }
        Debug.display('MCTS', 'chooseNextMove', 'root winRatio: ' + this.winRatio(root));
        Debug.display('MCTS', 'chooseNextMove', 'children winRatio: ' +
            (root.getChildren().map((n: GameNode<M, S>) => n.id + ': ' + this.winRatio(n))));
        const bestChildren: GameNode<M, S>[] =
            ArrayUtils.maximumsBy(root.getChildren(), (n: GameNode<M, S>) => this.winRatio(n));
        const bestChild: GameNode<M, S> = ArrayUtils.getRandomElement(bestChildren);
        const seconds: number = (Date.now() - startTime) / 1000;
        Debug.display('MCTS', 'chooseNextMove', `Computed ${iterations} in ${seconds} (rate: ${iterations/seconds} it/s)`);
        Debug.display('MCTS', 'chooseNextMove', 'Best child has a win ratio of: ' + this.winRatio(bestChild));
        return bestChild.previousMove.get();
    }

    /**
     * Returns 1 for win, 0 for losses. Must return a result between 0 and 1 otherwise.
     */
    protected winScore(_node: GameNode<M, S>,
                       _config: MGPOptional<RulesConfig>,
                       gameStatus: GameStatus,
                       player: Player): number {
        switch (gameStatus) {
            case GameStatus.DRAW:
            case GameStatus.ONGOING:
                return 0.01; // Prefer ongoing/draw to loss
            default:
                if (gameStatus.winner === player) return 1;
                else return 0;
        }
    }

    /**
     * Computes the UCB value of a node.
     * The UCB (Upper-Confidence-Bound) is a value used to select nodes to explore.
     */
    private ucb(node: GameNode<M, S>, parentSimulations: number): number {
        const simulations: number = this.simulations(node);
        if (parentSimulations === 0 || simulations === 0) {
            return Number.MAX_SAFE_INTEGER;
        }
        return (this.wins(node) / simulations) +
               this.explorationParameter * Math.sqrt(Math.log(parentSimulations) / simulations);
    }

    /**
     * Computes the win ratio for this node, as how many simulations have been won.
     */
    private winRatio(node: GameNode<M, S>): number {
        const simulations: number = this.simulations(node);
        if (this.simulations(node) === 0) {
            return 1;
        }
        return this.wins(node) / simulations;
    }

    private wins(node: GameNode<M, S>): number {
        return this.getCounterFromCache(node, 'wins');
    }

    private simulations(node: GameNode<M, S>): number {
        return this.getCounterFromCache(node, 'simulations');
    }

    public getCounterFromCache(node: GameNode<M, S>, name: string): number {
        const cachedValue: MGPOptional<number> = node.getCache(this.uniqueId + name);
        if (cachedValue.isPresent()) {
            return cachedValue.get();
        } else {
            node.setCache(this.uniqueId + name, 0);
            return 0;
        }
    }

    /**
     * Selects the node that we will consider in this iteration.
     * This takes the first unexplored node it finds in a BFS fashion.
     * @returns the selected node
     */
    private select(nodeAndPath: NodeAndPath<M, S>): NodeAndPath<M, S> {
        const node: GameNode<M, S> = nodeAndPath.node;
        Debug.display('MCTS', 'select', 'Exploring node: ' + node.id);
        if (node.hasChildren()) {
            const simulations: number = this.simulations(node);
            // Select within the child with the highest UCB value.
            Debug.display('MCTS', 'select', 'UCB values: ' +
                (node.getChildren().map((n: GameNode<M, S>) => n.id + ': ' + this.ucb(node, simulations))));
            const bestChildren: GameNode<M, S>[] =
                ArrayUtils.maximumsBy(node.getChildren(), (n: GameNode<M, S>) => this.ucb(n, simulations));
            const childToVisit: GameNode<M, S> = ArrayUtils.getRandomElement(bestChildren);
            Debug.display('MCTS', 'select', 'selecting children ' + childToVisit.id);
            return this.select({ node: childToVisit, path: nodeAndPath.path.concat([childToVisit]) });
        } else {
            // This is a leaf node, we select it.
            Debug.display('MCTS', 'select', 'this is a leaf node, we select it');
            return nodeAndPath;
        }
    }

    /**
     * Expands a node, i.e., creates children to explore if needed, or returns the node directly.
     * @returns one of the created child, or the node itself if it is terminal
     */
    private expand(nodeAndPath: NodeAndPath<M, S>, config: MGPOptional<C>): NodeAndPath<M, S> {
        if (this.rules.getGameStatus(nodeAndPath.node, config).isEndGame) {
            // Even though we haven't explicitly explored this node (that is, selected it for expansion),
            // it is a terminal node. We won't try to calculate its child.
            return nodeAndPath;
        }
        const node: GameNode<M, S> = nodeAndPath.node;
        const moves: M[] = this.moveGenerator.getListMoves(node, config);
        Utils.assert(moves.length > 0, `${this.name}: move generator did not return any move on a non-finished game: ${this.moveGenerator.constructor.name}`);
        // Create the children and pick the first one
        for (const move of moves) {
            node.addChild(this.play(node, move, config));
        }
        const pickedChild: GameNode<M, S> = ArrayUtils.getRandomElement(node.getChildren());
        return { node: pickedChild, path: nodeAndPath.path.concat([pickedChild]) };
    }

    /**
     * Simulate a game from the given node. Does not change anything in the node.
     * @returns the game status at the end of the simulation
     */
    private simulate(node: GameNode<M, S>, endTime: number, config: MGPOptional<C>): GameStatus {
        Debug.display('MCTS', 'simulate', 'simulate from node which has a last move of ' + node.previousMove.get().toString());
        let current: GameNode<M, S> = node;
        let steps: number = 0;
        while (steps < this.maxGameLength && Date.now() < endTime) {
            const status: GameStatus = this.rules.getGameStatus(current, config);
            if (status.isEndGame) {
                Debug.display('MCTS', 'simulate', `end game in ${steps} steps, winner is ${status.winner}`);
                return status;
            }
            steps++;
            current = this.playRandomStep(current, config);
        }
        // Game has taken too long
        return GameStatus.ONGOING;
    }

    /**
     * Picks a random move and play it
     * @returns the state after the move
     */
    private playRandomStep(node: GameNode<M, S>, config: MGPOptional<C>): GameNode<M, S> {
        const moves: M[] = this.moveGenerator.getListMoves(node, config);
        Utils.assert(moves.length > 0, 'MoveGenerator gave empty list of moves for ongoing game to MCTS');
        const move: M = ArrayUtils.getRandomElement(moves);
        return this.play(node, move, config);
    }

    /**
     * Plays a move.
     * @returns the state after the move
     */
    private play(node: GameNode<M, S>, move: M, config: MGPOptional<C>): GameNode<M, S> {
        const legality: MGPFallible<L> = this.rules.isLegal(move, node.gameState, config);
        Utils.assert(legality.isSuccess(), 'heuristic returned illegal move', { move: move.toString() });
        const childState: S = this.rules.applyLegalMove(move, node.gameState, config, legality.get());
        const childNode: GameNode<M, S> = new GameNode(childState,
                                                       MGPOptional.of(node),
                                                       MGPOptional.of(move));
        return childNode;
    }

    /**
     * Backpropagates the result of a simulation in a path from the simulated node to the root of the tree.
     * @returns nothing, as it modifies the nodes directly
     */
    private backpropagate(path: GameNode<M, S>[], winScore: number): void {
        for (const node of path) {
            this.addSimulationResult(node, winScore);
            Debug.display('MCTS', 'backpropagate', `backpropagate to node which now has ${this.wins(node)/this.simulations(node)}`);
        }
    }

    private addSimulationResult(node: GameNode<M, S>, winScore: number): void {
        const simulations: number = this.simulations(node) + 1;
        const wins: number = this.wins(node) + winScore;
        node.setCache(this.uniqueId + 'wins', wins);
        node.setCache(this.uniqueId + 'simulations', simulations);
    }

    public getInfo(node: GameNode<M, S>): string {
        const wins: number = this.getCounterFromCache(node, 'wins');
        const simulations: number = this.getCounterFromCache(node, 'simulations');
        return `wins/simulations=${wins}/${simulations}`;
    }

}
