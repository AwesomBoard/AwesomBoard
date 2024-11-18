import { MGPMap, MGPOptional, Utils } from '@everyboard/lib';
import { Move } from '../Move';
import { GameState } from '../state/GameState';
import { GameStatus } from '../GameStatus';
import { Player, PlayerOrNone } from '../Player';
import { RulesConfig } from '../RulesConfigUtil';
import { AbstractRules } from '../Rules';
import { Debug } from 'src/app/utils/Debug';

export class GameNodeStats {
    public static createdNodes: number = 0;
}

/**
 * A node of the game tree.
 * A node has a state, and may have a parent and previous move.
 * This is only a tree datastructure, we don't need any logic in here.
 * As an extra, a node may contain cached values used by AIs.
 */
@Debug.log
export class GameNode<M extends Move, S extends GameState> {

    public static ID: number = 0;

    public readonly id: number; // Used for debug purposes to uniquely identify nodes

    /**
     * The children of this node.
     * It is a map keyed with moves, with as value the child that corresponds
     * to applying that move to the current state.
     */
    private readonly children: MGPMap<M, GameNode<M, S>> = new MGPMap();

    /**
     * A cache that AIs can use. It is up to the AIs to properly name and type the values in the cache.
     */
    private readonly cache: MGPMap<string, NonNullable<unknown>> = new MGPMap();

    public constructor(public readonly gameState: S,
                       public readonly parent: MGPOptional<GameNode<M, S>> = MGPOptional.empty(),
                       public readonly previousMove: MGPOptional<M> = MGPOptional.empty())
    {
        this.id = GameNode.ID++;
        GameNodeStats.createdNodes++;
    }

    public root(): GameNode<M, S> {
        if (this.parent.isPresent()) {
            return this.parent.get().root();
        } else {
            return this;
        }
    }

    /**
     * Returns the child corresponding to applying the given move to the current state,
     * or empty if it has not yet been calculated.
     */
    public getChild(move: M): MGPOptional<GameNode<M, S>> {
        return this.children.get(move);
    }

    /**
     * Checks whether this node has children
     */
    public hasChildren(): boolean {
        return this.getChildren().length > 0;
    }

    /**
     * Returns all the children of the node
     */
    public getChildren(): GameNode<M, S>[] {
        return this.children.getValueList();
    }

    /**
     * Adds a child to this node.
     */
    public addChild(node: GameNode<M, S>): void {
        Utils.assert(node.previousMove.isPresent(), 'GameNode: addChild expects a node with a previous move');
        this.children.set(node.previousMove.get(), node);
    }

    /**
     * Represents the tree starting at this node as a DOT graph.
     * You can view the DOT graph with a tool like xdot,
     * or by pasting it on a website like https://dreampuf.github.io/GraphvizOnline/
     */
    public showDot(rules: AbstractRules,
                   config: MGPOptional<RulesConfig>,
                   labelFn?: (node: GameNode<M, S>) => string,
                   max?: number,
                   level: number = 0,
                   id: number = 0)
    : { dot: string, nextId: number, winner: PlayerOrNone }
    {
        let buffer: string = '';
        if (level === 0) {
            buffer += 'digraph G {\n';
        }
        const gameStatus: GameStatus = rules.getGameStatus(this, config);

        let winner: PlayerOrNone = PlayerOrNone.NONE;
        if (gameStatus.isEndGame) {
            winner = gameStatus.winner;
        }

        let nextId: number = id+1;
        const currentPlayer: Player = this.gameState.getCurrentPlayer();
        let onlyLosses: boolean = true;
        if (max === undefined || level < max) {
            const children: GameNode<M, S>[] = this.children.getValueList();
            for (const child of children) {
                const playerColor: string = this.getPlayerDotColor(this.gameState.getCurrentPlayer());
                buffer += `    node_${id} -> node_${nextId} [label="${child.previousMove.get()}"; color="${playerColor}"];\n`;
                const result: { dot: string, nextId: number, winner: PlayerOrNone } =
                    child.showDot(rules, config, labelFn, max, level+1, nextId);
                nextId = result.nextId;
                buffer += result.dot;
                // If current player has a guaranteed win with this move, color the node with player's color
                if (result.winner === currentPlayer) {
                    winner = result.winner;
                    onlyLosses = false;
                }
                if (result.winner !== currentPlayer.getOpponent()) {
                    onlyLosses = false;
                }
            }
            if (onlyLosses && gameStatus === GameStatus.ONGOING && children.length === 0) {
                // This means we aren't at an end game, but at not fully-explored node
                onlyLosses = false;
            }
        }
        if (gameStatus === GameStatus.ONGOING && onlyLosses) {
            winner = currentPlayer.getOpponent();
        }

        let color: string = 'white';
        if (winner.isPlayer()) {
            color = this.getPlayerDotColor(winner);
        }
        if (gameStatus === GameStatus.DRAW) {
            color = 'gray';
        }

        let label: string = `#${this.gameState.turn}: ${this.id}`;
        if (labelFn) {
            label += ` - ${labelFn(this)}`;
        }
        buffer += `    node_${id} [label="${label}", style=filled, fillcolor="${color}"];\n`;
        if (level === 0) {
            buffer += '}';
        }
        return { dot: buffer, nextId, winner };
    }

    private getPlayerDotColor(player: Player): string {
        switch (player) {
            case Player.ZERO: return '#994d00';
            default:
                Utils.expectToBe(player, Player.ONE);
                return '#ffc34d';
        }
    }

    /**
     * Get a value from the cache, or MGPOptional if it does not exist in the cache.
     */
    public getCache<T>(key: string): MGPOptional<T> {
        return this.cache.get(key) as MGPOptional<T>;
    }

    /**
     * Set or replace a value from the cache.
     */
    public setCache(key: NonNullable<string>, value: NonNullable<unknown>): void {
        if (this.cache.containsKey(key)) {
            this.cache.replace(key, value);
        } else {
            this.cache.set(key, value);
        }
    }

}

export class AbstractNode extends GameNode<Move, GameState> {}
