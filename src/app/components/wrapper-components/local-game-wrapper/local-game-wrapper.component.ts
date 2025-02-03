import { Component, AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { MGPFallible, MGPOptional, MGPValidation, Utils } from '@everyboard/lib';

import { AbstractNode, GameNode, GameNodeStats } from 'src/app/jscaip/AI/GameNode';
import { ConnectedUserService } from 'src/app/services/ConnectedUserService';
import { GameWrapper } from 'src/app/components/wrapper-components/GameWrapper';
import { Move } from 'src/app/jscaip/Move';
import { GameState } from 'src/app/jscaip/state/GameState';
import { MessageDisplayer } from 'src/app/services/MessageDisplayer';
import { Player } from 'src/app/jscaip/Player';
import { GameStatus } from 'src/app/jscaip/GameStatus';
import { Debug } from 'src/app/utils/Debug';
import { RulesConfig, RulesConfigUtils } from 'src/app/jscaip/RulesConfigUtil';
import { AIOptions, AIStats, AbstractAI } from 'src/app/jscaip/AI/AI';
import { GameInfo } from '../../normal-component/pick-game/pick-game.component';
import { SuperRules } from 'src/app/jscaip/Rules';
import { DemoNodeInfo } from '../demo-card-wrapper/demo-card-wrapper.component';

@Component({
    selector: 'app-local-game-wrapper',
    templateUrl: './local-game-wrapper.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
@Debug.log
export class LocalGameWrapperComponent extends GameWrapper<string> implements AfterViewInit {

    public static readonly AI_TIMEOUT: number = 1;

    public aiOptions: [string, string] = ['none', 'none'];

    public playerSelection: [string, string] = ['human', 'human'];

    public winnerMessage: MGPOptional<string> = MGPOptional.empty();

    public displayAIMetrics: boolean = false;

    public configIsSet: boolean = false;

    public configDemo: DemoNodeInfo;

    public rulesConfig: MGPOptional<RulesConfig> = MGPOptional.empty();

    private readonly configBS: BehaviorSubject<MGPOptional<RulesConfig>> = new BehaviorSubject(MGPOptional.empty());
    private readonly configObs: Observable<MGPOptional<RulesConfig>> = this.configBS.asObservable();

    public constructor(activatedRoute: ActivatedRoute,
                       connectedUserService: ConnectedUserService,
                       router: Router,
                       messageDisplayer: MessageDisplayer,
                       private readonly cdr: ChangeDetectorRef)
    {
        super(activatedRoute, connectedUserService, router, messageDisplayer);
        this.players = [MGPOptional.of(this.playerSelection[0]), MGPOptional.of(this.playerSelection[1])];
        this.role = Player.ZERO; // The user is playing, not observing
        this.setDefaultRulesConfig();
    }

    // Will set the default rules config.
    // Will set it to MGPOptional.empty() if the game doesn't exist, but an error will be handled by another function.
    // ConfiglessRules have MGPOptional.empty() value.
    private setDefaultRulesConfig(): void {
        const urlName: string = this.getGameUrlName();
        this.rulesConfig = RulesConfigUtils.getGameDefaultConfig(urlName);
    }

    public getCreatedNodes(): number {
        return GameNodeStats.createdNodes;
    }

    public getMinimaxTime(): number {
        return AIStats.aiTime;
    }

    public ngAfterViewInit(): void {
        window.setTimeout(async() => {
            const createdSuccessfully: boolean = await this.createMatchingGameComponent();
            if (createdSuccessfully) {
                await this.restartGame();
                this.cdr.detectChanges();
            }
        }, 1);
    }

    public async updatePlayer(player: Player): Promise<void> {
        this.players[player.getValue()] = MGPOptional.of(this.playerSelection[player.getValue()]);
        if (this.playerSelection[1] === 'human' && this.playerSelection[0] !== 'human') {
            await this.setInteractive(false);
            await this.setRole(Player.ONE);
        } else {
            await this.setInteractive(true);
            await this.setRole(Player.ZERO);
        }
        await this.proposeAIToPlay();
    }

    public async onLegalUserMove(move: Move): Promise<void> {
        const config: MGPOptional<RulesConfig> = await this.getConfig();
        this.gameComponent.node = this.gameComponent.rules.choose(this.gameComponent.node, move, config).get();
        await this.applyNewMove();
    }

    private async updateWrapper(): Promise<void> {
        const config: MGPOptional<RulesConfig> = await this.getConfig();
        const gameStatus: GameStatus = this.gameComponent.rules.getGameStatus(this.gameComponent.node, config);
        if (gameStatus.isEndGame) {
            this.endGame = true;
            if (gameStatus.winner.isPlayer()) {
                const winner: string = $localize`Player ${gameStatus.winner.getValue() + 1}`;
                const loser: Player = gameStatus.winner.getOpponent();
                const loserValue: number = loser.getValue();
                if (this.players[gameStatus.winner.getValue()].equalsValue('human')) {
                    // When human wins
                    if (this.players[loserValue].equalsValue('human')) {
                        this.winnerMessage = MGPOptional.of($localize`${ winner } won`);
                    } else {
                        this.winnerMessage = MGPOptional.of($localize`You won`);
                    }
                } else {
                    // When AI wins
                    if (this.players[loserValue].equalsValue('human')) {
                        this.winnerMessage = MGPOptional.of($localize`You lost`);
                    } else {
                        this.winnerMessage = MGPOptional.of($localize`${this.players[gameStatus.winner.getValue()].get()} (Player ${gameStatus.winner.getValue() + 1}) won`);
                    }
                }
            }
        }
        this.cdr.detectChanges();
    }

    public async proposeAIToPlay(): Promise<void> {
        const currentPlayerIsHuman: boolean = await this.hasSelectedAI() === false;
        await this.setInteractive(currentPlayerIsHuman);
        if (currentPlayerIsHuman === false) {
            // It is AI's turn, let it play after a small delay
            const playingAI: MGPOptional<{ ai: AbstractAI, options: AIOptions }> = this.getPlayingAI();
            if (playingAI.isPresent()) {
                window.setTimeout(async() => {
                    const config: MGPOptional<RulesConfig> = await this.getConfig();
                    const gameIsOngoing: boolean =
                        this.gameComponent.rules.getGameStatus(this.gameComponent.node, config) === GameStatus.ONGOING;
                    if (gameIsOngoing) {
                        await this.doAIMove(playingAI.get().ai, playingAI.get().options);
                    }
                }, LocalGameWrapperComponent.AI_TIMEOUT);
            }
            // If playingAI is absent, that means the user selected an AI without selecting options yet
            // We do nothing in this case.
        }
    }

    /**
     * @returns false if the game is finished
     *          false if no AI is selected
     *          true if an AI is selected even if its option is not selected yet
     */
    private async hasSelectedAI(): Promise<boolean> {
        const config: MGPOptional<RulesConfig> = await this.getConfig();
        if (this.gameComponent.rules.getGameStatus(this.gameComponent.node, config).isEndGame) {
            // No AI is playing when the game is finished
            return false;
        }

        const playerIndex: number = this.gameComponent.getTurn() % 2;
        return this.playerSelection[playerIndex] !== 'human';
    }

    private lastMoveWasAI(): boolean {
        const playerIndex: number = (this.gameComponent.getTurn() - 1) % 2;
        return this.playerSelection[playerIndex] !== 'human';
    }

    private getPlayingAI(): MGPOptional<{ ai: AbstractAI, options: AIOptions }> {
        const playerIndex: number = this.gameComponent.getTurn() % 2;
        const aiOpt: MGPOptional<AbstractAI> = this.getAI(playerIndex);
        if (aiOpt.isPresent()) {
            const ai: AbstractAI = aiOpt.get();
            const optionsName: string = this.aiOptions[playerIndex];
            const matchingOptions: MGPOptional<AIOptions> =
                MGPOptional.ofNullable(ai.availableOptions.find((options: AIOptions) => {
                    return options.name === optionsName;
                }));
            // If the option is not selected
            // then it is not a PLAYING AI yet, just a selected AI
            // and user must still select the AI's options
            return matchingOptions.map((options: AIOptions) => {
                return { ai, options };
            });
        } else {
            return MGPOptional.empty();
        }
    }

    /**
     * @param playerIndex 0 or 1 (the index of the current player)
     * @returns MGPOptional.empty() if no AI is selected
     *          MGPOptional.of(some AI) if an AI is selected, even if AI has its options unchosen
     */
    private getAI(playerIndex: number): MGPOptional<AbstractAI> {
        return MGPOptional.ofNullable(
            this.gameComponent.availableAIs.find((a: AbstractAI) => {
                return this.players[playerIndex].equalsValue(a.name);
            }));
    }

    public getStateProvider(): MGPOptional<(config: MGPOptional<RulesConfig>) => GameState> {
        return GameInfo.getStateProvider(this.getGameUrlName());
    }

    public async doAIMove(playingAI: AbstractAI, options: AIOptions): Promise<MGPValidation> {
        // called only when it's AI's Turn
        const ruler: SuperRules<Move, GameState, RulesConfig, unknown> = this.gameComponent.rules;
        const config: MGPOptional<RulesConfig> = await this.getConfig();
        const gameStatus: GameStatus = ruler.getGameStatus(this.gameComponent.node, config);
        Utils.assert(gameStatus === GameStatus.ONGOING, 'AI should not try to play when game is over!');
        const aiMove: Move = playingAI.chooseNextMove(this.gameComponent.node, options, config);
        const nextNode: MGPFallible<AbstractNode> = ruler.choose(this.gameComponent.node, aiMove, config);
        if (nextNode.isSuccess()) {
            this.gameComponent.hideLastMove();
            this.gameComponent.node = nextNode.get();
            await this.applyNewMove();
            return MGPValidation.SUCCESS;
        } else {
            return this.handleAIError(playingAI, aiMove, nextNode.getReason());
        }
    }

    private async applyNewMove(): Promise<void> {
        const lastMoveWasAI: boolean = this.lastMoveWasAI();
        await this.showNewMove(lastMoveWasAI);
        await this.updateWrapper();
        await this.proposeAIToPlay();
        this.cdr.detectChanges();
    }

    private async handleAIError(playingAI: AbstractAI, illegalMove: Move, error: string): Promise<MGPValidation> {
        this.messageDisplayer.criticalMessage($localize`The AI chose an illegal move! This is an unexpected situation that we logged, we will try to solve this as soon as possible. In the meantime, consider that you won!`);
        return Utils.logError('LocalGameWrapper', 'AI chose illegal move', {
            game: this.getGameUrlName(),
            name: playingAI.name,
            move: illegalMove.toString(),
            reason: error,
        });
    }

    public availableAIOptions(player: number): AIOptions[] {
        return this.getAI(player).get().availableOptions;
    }

    public canTakeBack(): boolean {
        if (this.players[0].equalsValue('human')) {
            return this.gameComponent.getTurn() > 0;
        } else if (this.players[1].equalsValue('human')) {
            return this.gameComponent.getTurn() > 1;
        } else {
            return false;
        }
    }

    public async takeBack(): Promise<void> {
        this.gameComponent.node = this.gameComponent.node.parent.get();
        if (this.isTurnOfPlayingAI()) {
            Utils.assert(this.gameComponent.node.parent.isPresent(),
                         'Cannot take back in first turn when AI is Player.ZERO');
            this.gameComponent.node = this.gameComponent.node.parent.get();
        }
        await this.showCurrentState(false);
    }

    private isTurnOfPlayingAI(): boolean {
        return this.getPlayingAI().isPresent();
    }

    public async restartGame(): Promise<void> {
        const config: MGPOptional<RulesConfig> = await this.getConfig();
        this.gameComponent.node = this.gameComponent.rules.getInitialNode(config);
        this.gameComponent.cancelMoveAttempt();
        this.gameComponent.hideLastMove();
        await this.gameComponent.updateBoardAndRedraw(false);
        this.endGame = false;
        this.winnerMessage = MGPOptional.empty();
        await this.proposeAIToPlay();
    }

    public override getPlayer(): string {
        return 'human';
    }

    public override async onCancelMove(reason?: string): Promise<void> {
        await super.onCancelMove(reason);
        if (this.gameComponent.node.previousMove.isPresent()) {
            const move: Move = this.gameComponent.node.previousMove.get();
            await this.gameComponent.showLastMove(move);
        }
    }

    public override async getConfig(): Promise<MGPOptional<RulesConfig>> {
        let subcription: MGPOptional<Subscription> = MGPOptional.empty();
        const rulesConfigPromise: Promise<RulesConfig> =
            new Promise((resolve: (value: RulesConfig) => void) => {
                subcription = MGPOptional.of(
                    this.configObs.subscribe((response: MGPOptional<RulesConfig>) => {
                        if (response.isPresent()) {
                            resolve(response.get());
                        }
                    }),
                );
            });
        const rulesConfig: RulesConfig = await rulesConfigPromise;
        // Subscription will never be empty at this point
        // but this is needed to prevent linter from complaining that:
        // "subscription is used before it is set"
        subcription.get().unsubscribe();
        return MGPOptional.of(rulesConfig);
    }

    public updateConfig(rulesConfig: MGPOptional<RulesConfig>): void {
        this.rulesConfig = rulesConfig;
        // If there is no config for this game, then rulesConfig value will be MGPOptional.empty()
        if (rulesConfig.isPresent()) {
            this.setConfigDemo(rulesConfig.get());
            if (Object.keys(rulesConfig.get()).length === 0) {
                // There is nothing to configure for this game!
                this.markConfigAsFilled();
            }
        }
    }

    public markConfigAsFilled(): void {
        this.configIsSet = true;
        this.configBS.next(this.rulesConfig);
        this.cdr.detectChanges();
    }

    public displayAIInfo(): boolean {
        return localStorage.getItem('displayAIInfo') === 'true';
    }

    private setConfigDemo(config: RulesConfig): void {
        const stateProvider: MGPOptional<(config: MGPOptional<RulesConfig>) => GameState> = this.getStateProvider();
        if (stateProvider.isPresent()) {
            const node: AbstractNode = new GameNode(stateProvider.get()(MGPOptional.of(config)));
            this.configDemo = {
                click: MGPOptional.empty(),
                name: this.getGameUrlName(),
                node,
            };
            this.cdr.detectChanges();
        }
    }

    public getConfigDemo(): DemoNodeInfo {
        return this.configDemo;
    }

}
