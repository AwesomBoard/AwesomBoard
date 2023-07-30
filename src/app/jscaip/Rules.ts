import { GameNode } from 'src/app/jscaip/MGPNode';
import { Move } from './Move';
import { Type } from '@angular/core';
import { display } from '../utils/utils';
import { assert } from 'src/app/utils/assert';
import { GameState } from './GameState';
import { MGPOptional } from '../utils/MGPOptional';
import { MGPFallible } from '../utils/MGPFallible';
import { BoardValue } from './BoardValue';
import { GameStatus } from './GameStatus';

export abstract class Rules<M extends Move, S extends GameState, L = void> {

    public constructor(public readonly stateType: Type<S>) {
    }
    /* The data that represent the status of the game at the current moment, including:
     * the board
     * the turn
     * the extra data that might be score of each player
     * the remaining pawn that you can put on the board...
     */

    public choose(node: GameNode<M, S>, move: M) : MGPOptional<GameNode<M, S>> {
        /* used by the rules to update board
         * return true if the move was legal, and the node updated
         * return false otherwise
         */
        const LOCAL_VERBOSE: boolean = false;
        display(LOCAL_VERBOSE, 'Rules.choose: ' + move.toString() + ' was proposed');
        const legality: MGPFallible<L> = this.isLegal(move, node.gameState);
        const choice: MGPOptional<GameNode<M, S>> = node.getChild(move);
        if (legality.isFailure()) {
            display(LOCAL_VERBOSE, 'Rules.choose: Move is illegal: ' + legality.getReason());
            return MGPOptional.empty();
        }
        // let's not create the node twice
        if (choice.isPresent()) {
            assert(legality.isSuccess(), 'Rules.choose: Move is illegal: ' + legality.getReasonOr(''));
            display(LOCAL_VERBOSE, 'Rules.choose: and this proposed move is found in the list, so it is legal');
            return MGPOptional.of(choice.get());
        }
        const resultingState: GameState = this.applyLegalMove(move, node.gameState, legality.get());
        const child: GameNode<M, S> = new GameNode(resultingState as S, MGPOptional.of(node), MGPOptional.of(move));
        return MGPOptional.of(child);
    }
    /**
     * Applies a legal move, given the precomputed information `info`
     */
    public abstract applyLegalMove(move: M, state: S, info: L): S;
    /**
     * Returns success if the move is legal, with some potentially precomputed data.
     * If the move is illegal, returns a failure with information on why it is illegal
     */
    public abstract isLegal(move: M, state: S): MGPFallible<L>;

    public getInitialNode(): GameNode<M, S> {
        // eslint-disable-next-line dot-notation
        const initialState: S = this.stateType['getInitialState']();
        return new GameNode(initialState);
    }
    public applyMoves(encodedMoves: number[], state: S, moveDecoder: (em: number) => M): S {
        let i: number = 0;
        for (const encodedMove of encodedMoves) {
            const move: M = moveDecoder(encodedMove);
            const legality: MGPFallible<L> = this.isLegal(move, state);
            assert(legality.isSuccess(), `Can't create state from invalid moves (` + i + '): ' + legality.toString() + '.');
            state = this.applyLegalMove(move, state, legality.get());
            i++;
        }
        return state;
    }
    public abstract getGameStatus(node: GameNode<M, S>): GameStatus;
}

export abstract class AbstractRules extends Rules<Move, GameState, unknown> {
}
