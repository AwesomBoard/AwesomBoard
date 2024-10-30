import { GameComponent } from 'src/app/components/game-components/game-component/GameComponent';
import { NewGameLegalityInfo, NewGameRules } from './NewGameRules';
import { NewGameMove } from './NewGameMove';
import { NewGameState } from './NewGameState';
import { ChangeDetectorRef, Component } from '@angular/core';
import { MessageDisplayer } from 'src/app/services/MessageDisplayer';
import { MCTS } from 'src/app/jscaip/AI/MCTS';
import { RulesConfig } from 'src/app/jscaip/RulesConfigUtil';
import { NewGameMoveGenerator } from './NewGameMoveGenerator';
import { NewGameMinimax } from './NewGameMinimax';
import { MGPOptional } from '@everyboard/lib';
import { PlayerNumberMap } from 'src/app/jscaip/PlayerMap';

/**
 * This is an Angular directive to specify that this is a component of the app.
 * You just have adapt the selector and template URL here.
 */
@Component({
    selector: 'app-new-game',
    templateUrl: './new-game.component.html',
    styleUrls: ['../../components/game-components/game-component/game-component.scss'],
})
/**
 * This is the component.
 * The generic base class is `GameComponent`.
 * If you have a rectangular game, you might want to use `RectangularGameComponent` instead.
 */
export class NewGameComponent extends GameComponent<NewGameRules,
                                                    NewGameMove,
                                                    NewGameState,
                                                    RulesConfig,
                                                    NewGameLegalityInfo>
{
    /**
     * The component constructor always takes the same parameters.
     * It must set up the `rules`, `encoder`, `node`, and `availableMinimaxes` fields.
     * The minimax list can remain empty.
     */
    public constructor(messageDisplayer: MessageDisplayer, cdr: ChangeDetectorRef) {
        super(messageDisplayer, cdr);
        this.setRulesAndNode('NewGame');
        this.availableAIs = [
            new NewGameMinimax(),
            new MCTS($localize`MCTS`, new NewGameMoveGenerator(), this.rules),
        ];
        this.encoder = NewGameMove.encoder;

        // If the board you draw must not be rotated of 180° when you play the second player, disable the following:
        this.hasAsymmetricBoard = true;

        // If your game has no scores in-game, disable the following:
        this.scores = MGPOptional.of(PlayerNumberMap.of(0, 0));
    }

    /**
     * This method updates the displayed board.
     */
    public async updateBoard(_triggerAnimation: boolean): Promise<void> {
    }

    /**
     * This method should display the last move in the component
     */
    public override async showLastMove(move: NewGameMove): Promise<void> {
        return;
    }

    /**
     * This method has the role to hide the last move
     */
    public override hideLastMove(): void {
        return;
    }

    /**
     * This method should clear out any data coming from a move attempt
     */
    public override cancelMoveAttempt(): void {
    }

    /**
     * In the component's HTML, you will likely set onClick elements.
     * You can call back to the component, and call `this.chooseMove` to apply a move.
     * In case you want to cancel a move, you can call `this.cancelMove`.
     * It takes an optional parameter, being a toast to show to the user upon the move cancelation.
     */

}
