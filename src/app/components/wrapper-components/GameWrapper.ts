import { Component, ComponentRef, Type, ViewChild, ViewContainerRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { Comparable, MGPFallible, MGPOptional, MGPValidation, Utils } from '@everyboard/lib';
import { ConnectedUserService } from 'src/app/services/ConnectedUserService';
import { Move } from '../../jscaip/Move';
import { GameInfo } from '../normal-component/pick-game/pick-game.component';
import { Player, PlayerOrNone } from 'src/app/jscaip/Player';
import { Localized } from 'src/app/utils/LocaleUtils';
import { AbstractGameComponent } from '../game-components/game-component/GameComponent';
import { MessageDisplayer } from 'src/app/services/MessageDisplayer';
import { RulesConfig, RulesConfigUtils } from 'src/app/jscaip/RulesConfigUtil';
import { RulesConfigDescription } from './rules-configuration/RulesConfigDescription';
import { BaseWrapperComponent } from './BaseWrapperComponent';

export class GameWrapperMessages {

    public static readonly NOT_YOUR_TURN: Localized = () => $localize`It is not your turn!`;

    public static readonly GAME_HAS_ENDED: Localized = () => $localize`This game has ended.`;

    public static NO_MATCHING_GAME(gameName: string): string {
        return $localize`This game (${gameName}) does not exist.`;
    }

}

@Component({ template: '' })
export abstract class GameWrapper<P extends Comparable> extends BaseWrapperComponent {

    // This holds the #board html element
    @ViewChild('board', { read: ViewContainerRef })
    public boardRef: ViewContainerRef | null = null;

    public gameComponent: AbstractGameComponent;

    public players: MGPOptional<P>[] = [MGPOptional.empty(), MGPOptional.empty()];

    /**
     * The role of the player, i.e., ZERO if we are the first player, ONE if we are the second player,
     * and NONE if we are observing
     */
    public role: PlayerOrNone = PlayerOrNone.NONE;

    public endGame: boolean = false;

    private isMoveAttemptOngoing: boolean = false;

    public Player: typeof Player = Player;

    public constructor(activatedRoute: ActivatedRoute,
                       protected readonly connectedUserService: ConnectedUserService,
                       protected readonly router: Router,
                       protected readonly messageDisplayer: MessageDisplayer)
    {
        super(activatedRoute);
    }

    public abstract onLegalUserMove(move: Move, scores?: [number, number]): Promise<void>;

    public abstract getPlayer(): P;

    private getMatchingComponent(gameName: string): MGPOptional<Type<AbstractGameComponent>> {
        const optionalGameInfo: MGPOptional<GameInfo> = GameInfo.getByUrlName(gameName);
        return optionalGameInfo.map((gameInfo: GameInfo) => gameInfo.component);
    }

    /**
     * This method is to be called only after view init.
     * It will create the game component and initialize its node.
     * It returns true if successful, or false if this is not a valid game.
     */
    protected async createMatchingGameComponent(): Promise<boolean> {
        const componentType: MGPOptional<Type<AbstractGameComponent>> =
            await this.getMatchingComponentAndNavigateOutIfAbsent();
        if (componentType.isPresent()) {
            // This waits for the config to be chosen
            const config: MGPOptional<RulesConfig> = await this.getConfig();
            await this.createGameComponent(componentType.get());
            this.gameComponent.config = config;
            this.gameComponent.node = this.gameComponent.rules.getInitialNode(config);
            await this.setRole(this.role);
            await this.gameComponent.updateBoardAndRedraw(false);
            return true;
        } else {
            return false;
        }
    }

    private async getMatchingComponentAndNavigateOutIfAbsent(): Promise<MGPOptional<Type<AbstractGameComponent>>> {
        const urlName: string = this.getGameUrlName();
        const component: MGPOptional<Type<AbstractGameComponent>> = this.getMatchingComponent(urlName);
        if (component.isAbsent()) {
            await this.router.navigate(['/notFound', GameWrapperMessages.NO_MATCHING_GAME(urlName)], { skipLocationChange: true });
            return MGPOptional.empty();
        } else {
            return component;
        }
    }

    private async createGameComponent(component: Type<AbstractGameComponent>): Promise<void> {
        Utils.assert(this.boardRef != null, 'Board element should be present');

        const componentRef: ComponentRef<AbstractGameComponent> =
            Utils.getNonNullable(this.boardRef).createComponent(component);
        this.gameComponent = componentRef.instance;

        // chooseMove is called by the game component when a move is done
        this.gameComponent.chooseMove = (m: Move): Promise<MGPValidation> => {
            // the game wrapper can then act accordingly to the chosen move.
            return this.receiveValidMove(m);
        };
        // canUserPlay is called upon a click by the user
        this.gameComponent.canUserPlay = (elementName: string): Promise<MGPValidation> => {
            return this.canUserPlay(elementName);
        };
        this.gameComponent.isPlayerTurn = (): boolean => {
            return this.isPlayerTurn();
        };
        // Mostly for interception by TutorialGameWrapper
        this.gameComponent.cancelMoveOnWrapper = (reason?: string): Promise<void> => {
            return this.onCancelMove(reason);
        };
    }

    public async setRole(role: PlayerOrNone): Promise<void> {
        this.role = role;
        if (role.isNone()) {
            this.gameComponent.setPointOfView(Player.ZERO);
        } else {
            this.gameComponent.setPointOfView(role);
        }
        await this.showCurrentState(false); // Trigger redrawing of the board (might need to be rotated 180°)
    }

    public async setInteractive(interactive: boolean, updateBoard: boolean = true): Promise<void> {
        const interactivityChanged: boolean = this.gameComponent.isInteractive() !== interactive;
        if (interactivityChanged) {
            this.gameComponent.setInteractive(interactive);
            if (updateBoard) {
                await this.gameComponent.updateBoardAndRedraw(false);
            }
        }
    }

    public async receiveValidMove(move: Move): Promise<MGPValidation> {
        const config: MGPOptional<RulesConfig> = await this.getConfig();
        const legality: MGPFallible<unknown> =
            this.gameComponent.rules.isLegal(move, this.gameComponent.node.gameState, config);
        if (legality.isFailure()) {
            await this.gameComponent.cancelMove(legality.getReason());
            return MGPValidation.ofFallible(legality);
        }
        this.gameComponent.cancelMoveAttempt();
        this.isMoveAttemptOngoing = false;
        await this.onLegalUserMove(move);
        return MGPValidation.SUCCESS;
    }

    public async onCancelMove(_reason?: string): Promise<void> {
        this.isMoveAttemptOngoing = false;
    }

    public async getConfig(): Promise<MGPOptional<RulesConfig>> {
        const urlName: string = this.getGameUrlName();
        return RulesConfigUtils.getGameDefaultConfig(urlName);
    }

    public async canUserPlay(_clickedElementName: string): Promise<MGPValidation> {
        if (this.isPlayerTurn() === false) {
            return MGPValidation.failure(GameWrapperMessages.NOT_YOUR_TURN());
        }
        if (this.endGame) {
            return MGPValidation.failure(GameWrapperMessages.GAME_HAS_ENDED());
        }
        if (this.isMoveAttemptOngoing === false) {
            // It is the first click
            this.gameComponent.hideLastMove();
            this.isMoveAttemptOngoing = true;
        }
        return MGPValidation.SUCCESS;
    }

    public isPlayerTurn(): boolean {
        if (this.role.isNone()) {
            return false;
        }
        if (this.gameComponent == null) {
            // This can happen if called before the component has been set up
            return false;
        }
        const turn: number = this.gameComponent.getTurn();
        const indexPlayer: number = turn % 2;
        const player: P = this.getPlayer();
        if (this.players[indexPlayer].isPresent()) {
            return this.players[indexPlayer].equalsValue(player);
        } else {
            return true;
        }
    }

    public getBoardHighlight(): string[] {
        if (this.endGame) {
            return ['endgame-bg'];
        } else if (this.isPlayerTurn()) {
            const turn: number = this.gameComponent.getTurn();
            const player: Player = Player.ofTurn(turn % 2);
            return [player.getHTMLClass('-bg')];
        } else {
            return [];
        }
    }

    /**
     * Called when there is a need to put the current board to original state, meaning:
     *     1. ongoing move attempt must be canceled (cancelMoveAttempt)
     *     2. any previous move must be hidden (hideLastMove)
     *     3. after the board is changed, we now show the correct previous move (showLastMove)
     * @param triggerAnimation a boolean set to true if there is a need to trigger the animation of the last move
     */
    protected async showCurrentState(triggerAnimation: boolean): Promise<void> {
        this.gameComponent.cancelMoveAttempt();
        this.gameComponent.hideLastMove();
        if (this.gameComponent.node.previousMove.isPresent()) {
            await this.showNewMove(triggerAnimation);
        } else {
            // We have no previous move to animate
            await this.gameComponent.updateBoardAndRedraw(false);
        }
    }

    /**
     * Used when a new move is done:
     *     1. by user click, locally
     *     2. by opponent online
     *     3. by the AI
     * @param triggerAnimation a boolean set to true if there is a need to trigger the animation of the last move
     */
    protected async showNewMove(triggerAnimation: boolean): Promise<void> {
        await this.gameComponent.updateBoard(triggerAnimation);
        await this.gameComponent.showLastMoveAndRedraw();
    }

    public getRulesConfigDescription(): MGPOptional<RulesConfigDescription<RulesConfig>> {
        const urlName: string = this.getGameUrlName();
        return this.getRulesConfigDescriptionByName(urlName);
    }

    private getRulesConfigDescriptionByName(gameName: string): MGPOptional<RulesConfigDescription<RulesConfig>> {
        const gameInfos: MGPOptional<GameInfo> = GameInfo.getByUrlName(gameName);
        if (gameInfos.isAbsent()) {
            return MGPOptional.empty();
        } else {
            return gameInfos.get().getRulesConfigDescription();
        }
    }
}
