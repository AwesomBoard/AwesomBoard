import { MGPFallible, MGPOptional } from '@everyboard/lib';

import { GameNode } from 'src/app/jscaip/AI/GameNode';
import { NewGameMove } from './NewGameMove';
import { NewGameState } from './NewGameState';
import { GameStatus } from 'src/app/jscaip/GameStatus';
import { NoConfig } from 'src/app/jscaip/RulesConfigUtil';
import { Rules } from 'src/app/jscaip/Rules';

/**
 * This class is optional.
 * If you don't use it, you can remove it everywhere it is mentioned.
 *
 * It provides extra information that is returned by the `isLegal` method of the rules.
 * This information is then provided to the `applyLegalMove` method of the rules.
 * That way, we can avoid duplicating some computations already made in `isLegal`.
 * By default, `void` is used if you don't provide one.
 * There are no restrictions to this definition.
 */
export class NewGameLegalityInfo {
}

/**
 * Defining the game node class is only for cosmetic purposes. It reduces the length of the argument to `getGameStatus`.
 */
export class NewGameNode extends GameNode<NewGameMove, NewGameState> {}

/**
 * This is where you define the rules of the game.
 * It should be a singleton class.
 * It is used by the wrappers to check the legality of a move, and to apply the move on a state.
 */
export class NewGameRules extends Rules<NewGameMove, NewGameState, NewGameLegalityInfo> {

    /**
     * This is the singleton instance. You should keep this as is, except for adapting the class name.
     */
    private static singleton: MGPOptional<NewGameRules> = MGPOptional.empty();

    /**
     * This gets the singleton instance. Similarly, keep this as is.
     */
    public static get(): NewGameRules {
        if (NewGameRules.singleton.isAbsent()) {
            NewGameRules.singleton = MGPOptional.of(new NewGameRules());
        }
        return NewGameRules.singleton.get();
    }

    /**
     * This method returns the initial state of a game
     */
    public override getInitialState(config: NoConfig): NewGameState {
        return new NewGameState(0);
    }

    /**
     * This method checks whether it is legal to apply a move to a state.
     * @param move the move
     * @param state the state on which to check the move legality
     * @returns a MGPFallible of the GameLegalityInfo, being a success if the move is legal,
     *   a failure containing the reason for the illegality of the move.
     */
    public override isLegal(move: NewGameMove, state: NewGameState): MGPFallible<NewGameLegalityInfo> {
        return MGPFallible.success(new NewGameLegalityInfo());
    }

    /**
     * This is the methods that applies the move to a state.
     * We know the move is legal because it has been checked with `isLegal`.
     * @param move the move to apply to the state
     * @param state the state on which to apply the move
     * @param info the info that had been returned by `isLegal`
     * @returns the resulting state, i.e., the state on which move has been applied
     */
    public override applyLegalMove(_move: NewGameMove,
                                   state: NewGameState,
                                   _config: NoConfig,
                                   _info: NewGameLegalityInfo)
    : NewGameState
    {
        return new NewGameState(state.turn + 1);
    }

    /**
     * This method checks whether the game is in progress or finished.
     * @param node the node for which we check the game status
     * @returns a GameStatus (ZERO_WON, ONE_WON, DRAW, ONGOING)
     */
    public override getGameStatus(node: NewGameNode, _config: NoConfig): GameStatus {
        if (node.gameState.turn < 42) {
            return GameStatus.ONGOING;
        } else {
            return GameStatus.DRAW;
        }
    }

}
