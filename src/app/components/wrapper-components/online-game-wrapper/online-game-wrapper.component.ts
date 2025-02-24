import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, Event } from '@angular/router';
import { Mutex } from 'async-mutex';
import { Subscription } from 'rxjs';
import { JSONValue, MGPFallible, MGPOptional, MGPValidation, Utils } from '@everyboard/lib';

import { ConnectedUserService, AuthUser } from 'src/app/services/ConnectedUserService';
import { GameService } from 'src/app/services/GameService';
import { Move } from '../../../jscaip/Move';
import { Game, GameEvent, GameEventMove, GameEventReply, GameResult, RequestType } from '../../../domain/Part';
import { CountDownComponent } from '../../normal-component/count-down/count-down.component';
import { CurrentGame } from '../../../domain/User';
import { GameWrapper, GameWrapperMessages } from '../GameWrapper';
import { ConfigRoom } from 'src/app/domain/ConfigRoom';
import { Player, PlayerOrNone } from 'src/app/jscaip/Player';
import { GameState } from 'src/app/jscaip/state/GameState';
import { MessageDisplayer } from 'src/app/services/MessageDisplayer';
import { GameInfo } from '../../normal-component/pick-game/pick-game.component';
import { Localized } from 'src/app/utils/LocaleUtils';
import { MinimalUser } from 'src/app/domain/MinimalUser';
import { CurrentGameService } from 'src/app/services/CurrentGameService';
import { AbstractNode, GameNode } from 'src/app/jscaip/AI/GameNode';
import { OGWCTimeManagerService } from './OGWCTimeManagerService';
import { GameStatus } from 'src/app/jscaip/GameStatus';
import { OGWCRequestManagerService, RequestInfo } from './OGWCRequestManagerService';
import { RulesConfig } from 'src/app/jscaip/RulesConfigUtil';
import { Debug } from 'src/app/utils/Debug';

export class OnlineGameWrapperMessages {

    public static readonly CANNOT_PLAY_AS_OBSERVER: Localized = () => $localize`You are an observer in this game, you cannot play.`;

    public static readonly MUST_ANSWER_REQUEST: Localized = () => $localize`You must answer your opponent's request.`;
}

@Component({
    selector: 'app-online-game-wrapper',
    templateUrl: './online-game-wrapper.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
@Debug.log
export class OnlineGameWrapperComponent extends GameWrapper<MinimalUser> implements OnInit, OnDestroy {

    // GameWrapping's Template
    @ViewChild('chronoZeroGlobal') public chronoZeroGlobal: CountDownComponent;
    @ViewChild('chronoOneGlobal') public chronoOneGlobal: CountDownComponent;
    @ViewChild('chronoZeroTurn') public chronoZeroTurn: CountDownComponent;
    @ViewChild('chronoOneTurn') public chronoOneTurn: CountDownComponent;

    public game: Game | null = null;
    public gameId!: string; // Initialized in ngOnInit
    public gameStarted: boolean = false;
    public opponent: MinimalUser | null = null;
    public authUser!: AuthUser; // Initialized in ngOnInit
    public currentUser: MinimalUser | null = null;

    private isSynced: boolean = false;

    public configRoom: ConfigRoom;
    public currentGame: MGPOptional<CurrentGame> = MGPOptional.empty();
    private userLinkedToThisPart: boolean = true;

    private routerEventsSubscription!: Subscription; // Initialized in ngOnInit
    private userSubscription!: Subscription; // Initialized in ngOnInit
    private gameSubscription: Subscription = new Subscription();

    public readonly OFFLINE_FONT_COLOR: { [key: string]: string } = { color: 'lightgrey' };

    public readonly globalTimeMessage: string = $localize`05:00`;
    public readonly turnTimeMessage: string = $localize`00:30`;

    public readonly requestInfos: Record<RequestType, RequestInfo> = OGWCRequestManagerService.requestInfos;
    public readonly allRequests: RequestType[] = ['TakeBack', 'Draw', 'Rematch'];

    private moveSentButNotReceivedYet: boolean = false;

    public constructor(activatedRoute: ActivatedRoute,
                       connectedUserService: ConnectedUserService,
                       router: Router,
                       messageDisplayer: MessageDisplayer,
                       private readonly currentGameService: CurrentGameService,
                       private readonly gameService: GameService,
                       private readonly timeManager: OGWCTimeManagerService,
                       private readonly requestManager: OGWCRequestManagerService,
                       private readonly cdr: ChangeDetectorRef)
    {
        super(activatedRoute, connectedUserService, router, messageDisplayer);
    }

    private extractGameIdFromURL(): string {
        return Utils.getNonNullable(this.activatedRoute.snapshot.paramMap.get('id'));
    }

    public isPlaying(): boolean {
        return this.role.isPlayer();
    }

    public override getPlayer(): MinimalUser {
        return this.authUser.toMinimalUser();
    }

    private async redirectIfPartOrGameIsInvalid(): Promise<void> {
        const urlName: string = this.getGameUrlName();
        const gameExists: boolean = GameInfo.getByUrlName(urlName).isPresent();
        if (gameExists === false) {
            this.routerEventsSubscription.unsubscribe();
            const message: string = GameWrapperMessages.NO_MATCHING_GAME(urlName);
            await this.router.navigate(['/notFound', message], { skipLocationChange: true } );
        }
    }

    private setCurrentPartIdOrRedirect(): Promise<void> {
        this.gameId = this.extractGameIdFromURL();
        return this.redirectIfPartOrGameIsInvalid();
    }

    public async ngOnInit(): Promise<void> {
        this.routerEventsSubscription = this.router.events.subscribe(async(ev: Event) => {
            if (ev instanceof NavigationEnd) {
                // TODO: This one seems useless? check if it breaks any test
                // await this.setCurrentPartIdOrRedirect();
            }
        });
        this.userSubscription = this.connectedUserService.subscribeToUser(async(user: AuthUser) => {
            // player should be authenticated and have a username to be here
            // TODO: do we need a subscription? ConnectedUserService already has one! We can use its .user
            this.authUser = user;
        });

        await this.setCurrentPartIdOrRedirect();
    }

    public async startGame(configRoom: ConfigRoom): Promise<void> {
        Utils.assert(this.gameStarted === false, 'Should not start already started game');
        this.configRoom = configRoom;

        this.gameStarted = true;
        window.setTimeout(async() => {
            // the small waiting is there to make sure that the chronos are loaded by view
            const createdSuccessfully: boolean = await this.createMatchingGameComponent();
            this.timeManager.setClocks([this.chronoZeroTurn, this.chronoOneTurn],
                                       [this.chronoZeroGlobal, this.chronoOneGlobal]);
            Utils.assert(createdSuccessfully, 'Game should be created successfully, otherwise part-creation would have redirected');
            Utils.assert(this.gameComponent !== null, 'Game component should exist');
            this.gameComponent.config = MGPOptional.of(configRoom.rulesConfig);
            await this.startPart();
        }, 2);
    }

    private async startPart(): Promise<void> {
        // This mutex will ensure that we receive one update/event at a time.
        // Without it, it could be the case that async operations are scheduled at the wrong time
        const mutex: Mutex = new Mutex();
        this.gameSubscription =
            await this.gameService.subscribeTo(this.gameId,
                                               (game: Game) => {
                                                   return mutex.runExclusive(async() => {
                                                       await this.onGameUpdate(game);
                                                   });
                                               },
                                               (event: GameEvent) => {
                                                   return mutex.runExclusive(async() => {
                                                       await this.onGameEvent(event);
                                                   });
                                               });
    }

    private async onGameUpdate(game: Game): Promise<void> {
        this.game = game;
        if (game.result === 'InProgress') {
            await this.onGameStart();
        } else {
            // Game has ended!
            await this.onGameEnd();
        }
        this.cdr.detectChanges();
    }

    private async onGameStart(): Promise<void> {
        const turn: number = this.gameComponent.getTurn();
        Utils.assert(turn === 0, 'turn should always be 0 upon game start');
        await this.initializePlayersData();
        this.timeManager.onGameStart(this.configRoom, Utils.getNonNullable(this.game), this.players);
        this.requestManager.onGameStart();
    }

    private async onGameEvent(event: GameEvent): Promise<void> {
        console.log('OGWC.onGameEvent: ' + JSON.stringify(event))
        switch (event.eventType) {
            case 'Move':
                await this.onReceivedMove(event);
                break;
            case 'Request':
                this.requestManager.onReceivedRequest(event);
                break;
            case 'Reply':
                const mustHandle: boolean = await this.requestManager.onReceivedReply(event);
                if (mustHandle) {
                    await this.handleReply(event);
                }
                break;
            default:
                Utils.expectToBe(event.eventType, 'Action', 'Event should be an action');
                this.timeManager.onReceivedAction(Player.ofTurn(this.gameComponent.getTurn()), event);
                // if (event.action === 'EndGame') await this.onGameEnd();
                if (event.action === 'Sync') this.isSynced = true;
                break;
        }
        this.cdr.detectChanges();
    }

    private async handleReply(reply: GameEventReply): Promise<void> {
        console.log('handleReply: ' + JSON.stringify(reply));
        switch (reply.requestType) {
            case 'TakeBack':
                const accepter: Player = this.timeManager.playerOfMinimalUser(reply.user);
                await this.takeBackToPreviousPlayerTurn(accepter.getOpponent());
                break;
            case 'Rematch':
                await this.router.navigate(['/nextGameLoading']);
                const urlName: string = this.getGameUrlName();
                await this.router.navigate(['/play', urlName, reply.data]);
                break;
            case 'Draw':
                // Nothing to do as the part will be updated with the draw
                break;
        }
    }

    private async onGameEnd(): Promise<void> {
        await this.currentGameService.removeCurrentGame();
        await this.setInteractive(false);
        this.endGame = true;
    }

    private async onReceivedMove(moveEvent: GameEventMove): Promise<void> {
        if (this.moveSentButNotReceivedYet) {
            // This is our move, we have already shown it
            // So we do nothing to show it again.
            this.moveSentButNotReceivedYet = false;
        } else {
            // This is not our move, it is either the move of the opponent, or we are observing.
            // In any case, we have to show and animate it.
            const move: Move = this.gameComponent.encoder.decode(moveEvent.move);
            await this.applyMove(move, this.isSynced);
        }
        // Need to handle the rest irrespective of which move we received
        await this.setCurrentPlayerAccordingToCurrentTurn();
        this.timeManager.onReceivedMove(moveEvent);
        this.requestManager.onReceivedMove();
    }

    public getTurn(): number {
        return this.gameComponent.getTurn();
    }

    private async setCurrentPlayerAccordingToCurrentTurn(): Promise<void> {
        this.currentUser = this.players[this.getTurn() % 2].get();
        await this.setInteractive(
            this.currentUser.name === this.getPlayer().name,
            false,
        );
    }

    private async takeBackToPreviousPlayerTurn(player: Player): Promise<void> {
        // Take back once, in any case
        this.gameComponent.node = this.gameComponent.node.parent.get();
        if (this.gameComponent.getCurrentPlayer() !== player) {
            Utils.assert(this.gameComponent.getTurn() > 0, 'Should not allow player that never moved to take back');
            // Take back a second time to make sure it end up on player's turn
            this.gameComponent.node = this.gameComponent.node.parent.get();
        }
        await this.setCurrentPlayerAccordingToCurrentTurn();
        const triggerAnimation: boolean = this.gameComponent.getTurn() === 0;
        await this.showCurrentState(triggerAnimation);
    }

    public canResign(): boolean {
        Utils.assert(this.isPlaying(), 'Non playing should not call canResign');
        if (this.endGame) {
            return false;
        }
        const hasOpponent: boolean = this.opponent != null;
        return hasOpponent;
    }

    public requestAvailable(request: RequestType): boolean {
        switch (request) {
            case 'TakeBack':
                return this.canAskTakeBack();
            case 'Draw':
                return this.canProposeDraw();
            default:
                Utils.expectToBe(request, 'Rematch');
                return this.canProposeRematch();
        }
    }

    public mustReply(): boolean {
        return this.getRequestAwaitingReplyFromUs().isPresent();
    }

    public getRequestAwaitingReplyFromUs(): MGPOptional<RequestType> {
        Utils.assert(this.role.isPlayer(), 'User should be playing');
        return this.requestManager.getUnrespondedRequestFrom(Utils.getNonNullable(this.opponent));
    }

    public getRequestAwaitingReplyFromOpponent(): MGPOptional<RequestType> {
        Utils.assert(this.role.isPlayer(), 'User should be playing');
        return this.requestManager.getUnrespondedRequestFrom(Utils.getNonNullable(this.currentUser));
    }

    public deniedRequest(): MGPOptional<RequestType> {
        return this.requestManager.deniedRequest();
    }

    public canPass(): boolean {
        Utils.assert(this.isPlaying(), 'Non playing should not call canPass');
        if (this.endGame) return false;
        if (this.currentUser?.name !== this.getPlayer().name) return false;
        return this.gameComponent.canPass;
    }

    private canAskTakeBack(): boolean {
        Utils.assert(this.isPlaying(), 'Non playing should not call canAskTakeBack');
        Utils.assert(this.game != null, 'should not call canAskTakeBack when game is not defined yet');
        // Cannot do a request in end game
        if (this.endGame) return false;
        // Cannot do a take back request before we played
        if (this.gameComponent.getTurn() <= this.role.getValue()) return false;
        // Otherwise, it depends on the request manager
        return this.requestManager.canMakeRequest('TakeBack');
    }

    private canProposeDraw(): boolean {
        Utils.assert(this.isPlaying(), 'Non playing should not call canProposeDraw');
        // Cannot propose draw in end game
        if (this.endGame) return false;
        // Otherwise, it depends on the request manager
        return this.requestManager.canMakeRequest('Draw');
    }

    private canProposeRematch(): boolean {
        return this.endGame && this.requestManager.canMakeRequest('Rematch');
    }

    public override async canUserPlay(clickedElementName: string): Promise<MGPValidation> {
        if (this.role.isNone()) {
            const message: string = OnlineGameWrapperMessages.CANNOT_PLAY_AS_OBSERVER();
            return MGPValidation.failure(message);
        }
        const result: MGPValidation = await super.canUserPlay(clickedElementName);
        if (result.isFailure()) {
            return result; // NOT_YOUR_TURN or GAME_HAS_ENDED are checked here
        } else if (this.mustReply()) {
            return MGPValidation.failure(OnlineGameWrapperMessages.MUST_ANSWER_REQUEST());
        } else {
            return MGPValidation.SUCCESS;
        }
    }

    private async initializePlayersData(): Promise<void> {
        const game: Game = Utils.getNonNullable(this.game);
        this.players = [
            MGPOptional.of(game.playerZero),
            MGPOptional.ofNullable(game.playerOne),
        ];
        await this.setCurrentPlayerAccordingToCurrentTurn();
        await this.setRealObserverRole();
        await this.setCurrentGame(game);
    }

    private async setRealObserverRole(): Promise<void> {
        if (this.players[0].equalsValue(this.getPlayer())) {
            await this.setRole(Player.ZERO);
            this.opponent = this.players[1].get();
        } else if (this.players[1].equalsValue(this.getPlayer())) {
            await this.setRole(Player.ONE);
            this.opponent = this.players[0].get();
        } else {
            await this.setRole(PlayerOrNone.NONE);
        }
    }

    private async setCurrentGame(game: Game): Promise<void>{
        await this.currentGameService.updateCurrentGame({
            id: this.gameId,
            gameName: game.gameName,
            opponent: this.opponent,
            role: this.role.isNone() ? 'Observer' : 'Player',
        });
    }


    public async onLegalUserMove(move: Move): Promise<void> {
        // First, show the move in the component
        await this.applyMove(move, false); // Move was already animated by its game component, no need to animate again
        // Then, send the move
        const config: MGPOptional<RulesConfig> = await this.getConfig();
        const gameStatus: GameStatus = this.gameComponent.rules.getGameStatus(this.gameComponent.node, config);
        const encodedMove: JSONValue = this.gameComponent.encoder.encode(move);
        this.moveSentButNotReceivedYet = true;
        await this.gameService.addMove(encodedMove);
        if (gameStatus.isEndGame) {
            await this.gameService.endGame(gameStatus.winner);
        }
    }

    private async applyMove(move: Move, triggerAnimation: boolean): Promise<void> {
        const oldNode: AbstractNode = this.gameComponent.node;
        const state: GameState = oldNode.gameState;
        const config: MGPOptional<RulesConfig> = await this.getConfig();
        const legality: MGPFallible<unknown> = this.gameComponent.rules.isLegal(move, state, config);
        Utils.assert(legality.isSuccess(), 'OGWC.applyMove called with an illegal move');
        const stateAfterMove: GameState = this.gameComponent.rules.applyLegalMove(move, state, config, legality.get());
        this.gameComponent.node = new GameNode(stateAfterMove, MGPOptional.of(oldNode), MGPOptional.of(move));
        await this.showNewMove(triggerAnimation);
    }

    // Called by the resign button
    public async resign(): Promise<void> {
        await this.gameService.resign();
    }

    // Called by the clocks
    public async reachedOutOfTime(player: Player): Promise<void> {
        if (this.isPlaying() === false) {
            return;
        }
        await this.gameService.notifyTimeout(player);
    }

    // Called by the corresponding button
    public async propose(request: RequestType): Promise<void> {
        Utils.assert(this.role.isPlayer(), 'cannot propose request if not player');
        switch (request) {
            case 'Rematch':
                return this.gameService.proposeRematch();
            case 'Draw':
                return this.gameService.proposeDraw();
            default:
                Utils.expectToBe(request, 'TakeBack');
                return this.gameService.askTakeBack();
        }
    }

    // Called by the 'accept' button
    public async accept(): Promise<void> {
        Utils.assert(this.role.isPlayer(), 'cannot accept request if not player');
        const request: RequestType = this.requestManager.getCurrentRequest().get().requestType;
        switch (request) {
            case 'Rematch':
                return this.gameService.acceptRematch();
            case 'Draw':
                return this.gameService.acceptDraw();
            default:
                Utils.expectToBe(request, 'TakeBack');
                return this.gameService.acceptTakeBack();
        }
    }

    // Called by the 'reject' button
    public async reject(): Promise<void> {
        Utils.assert(this.role.isPlayer(), 'cannot reject request if not player');
        const request: RequestType = this.requestManager.getCurrentRequest().get().requestType;
        switch (request) {
            case 'Rematch':
                return this.gameService.rejectRematch();
            case 'Draw':
                return this.gameService.refuseDraw();
            default:
                Utils.expectToBe(request, 'TakeBack');
                return this.gameService.refuseTakeBack();
        }
    }

    // Called by the 'AddGlobalTime' button
    public addGlobalTime(): Promise<void> {
        return this.gameService.addGlobalTime();
    }

    // Called by the 'AddTurnTime' button
    public addTurnTime(): Promise<void> {
        return this.gameService.addTurnTime();
    }

    public override async onCancelMove(reason?: string): Promise<void> {
        await super.onCancelMove(reason);
        if (this.gameComponent.node.previousMove.isPresent()) {
            const move: Move = this.gameComponent.node.previousMove.get();
            await this.gameComponent.showLastMove(move);
        }
        this.cdr.detectChanges();
    }

    public async ngOnDestroy(): Promise<void> {
        this.routerEventsSubscription.unsubscribe();
        this.userSubscription.unsubscribe();
        if (this.isPlaying() === false && this.userLinkedToThisPart && this.connectedUserService.user.isPresent()) {
            await this.currentGameService.removeCurrentGame();
        }
        if (this.gameStarted) {
            this.gameSubscription.unsubscribe();
        }
    }

    public override async getConfig(): Promise<MGPOptional<RulesConfig>> {
        const rulesConfig: RulesConfig = this.configRoom.rulesConfig;
        return MGPOptional.of(rulesConfig);
    }


    public isAgreedDraw(): boolean {
        const result: GameResult = Utils.getNonNullable(this.game).result;
        return result === 'AgreedDrawByZero' || result === 'AgreedDrawByOne';
    }

    public getDrawAccepter(): MinimalUser {
        const result: GameResult = Utils.getNonNullable(this.game).result;
        switch (result) {
            case 'AgreedDrawByZero':
                return Utils.getNonNullable(this.game).playerZero;
            default:
                Utils.expectToBe(result, 'AgreedDrawByOne');
                return Utils.getNonNullable(this.game).playerOne;
        }
    }

    public isWin(): boolean {
        const result: GameResult = Utils.getNonNullable(this.game).result;
        return result === 'VictoryOfZero' || result === 'VictoryOfOne'
    }

    public isTimeout(): boolean {
        const result: GameResult = Utils.getNonNullable(this.game).result;
        return result === 'TimeoutOfZero' || result === 'TimeoutOfOne';
    }

    public isResign(): boolean {
        const result: GameResult = Utils.getNonNullable(this.game).result;
        return result === 'ResignOfZero' || result === 'ResignOfOne';
    }

    public getWinner(): MinimalUser {
        const result: GameResult = Utils.getNonNullable(this.game).result;
        switch (result) {
            case 'VictoryOfOne':
            case 'TimeoutOfZero':
            case 'ResignOfZero':
                return Utils.getNonNullable(this.game).playerZero;
            case 'VictoryOfZero':
            case 'TimeoutOfOne':
            case 'ResignOfOne':
                return Utils.getNonNullable(this.game).playerOne;
            default:
                throw new Error('should not be called'); // TODO
        }
    }

    public getLoser(): MinimalUser {
        const result: GameResult = Utils.getNonNullable(this.game).result;
        switch (result) {
            case 'VictoryOfOne':
            case 'TimeoutOfZero':
            case 'ResignOfZero':
                return Utils.getNonNullable(this.game).playerOne;
            case 'VictoryOfZero':
            case 'TimeoutOfOne':
            case 'ResignOfOne':
                return Utils.getNonNullable(this.game).playerZero;
            default:
                throw new Error('should not be called'); // TODO
        }
    }
}
