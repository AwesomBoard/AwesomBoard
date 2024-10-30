import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, Event } from '@angular/router';
import { Mutex } from 'async-mutex';
import { Subscription } from 'rxjs';

import { JSONValue, MGPFallible, MGPOptional, MGPValidation, Utils } from '@everyboard/lib';
import { ConnectedUserService, AuthUser } from 'src/app/services/ConnectedUserService';
import { GameService } from 'src/app/services/GameService';
import { Move } from '../../../jscaip/Move';
import { Part, PartDocument, GameEvent, GameEventMove, GameEventReply, RequestType } from '../../../domain/Part';
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
import { GameEventService } from 'src/app/services/GameEventService';
import { AbstractNode, GameNode } from 'src/app/jscaip/AI/GameNode';
import { OGWCTimeManagerService } from './OGWCTimeManagerService';
import { GameStatus } from 'src/app/jscaip/GameStatus';
import { OGWCRequestManagerService, RequestInfo } from './OGWCRequestManagerService';
import { PlayerNumberMap } from 'src/app/jscaip/PlayerMap';
import { RulesConfig } from 'src/app/jscaip/RulesConfigUtil';
import { Debug } from 'src/app/utils/Debug';
import { ServerTimeService } from 'src/app/services/ServerTimeService';
import { UserService } from 'src/app/services/UserService';

export class OnlineGameWrapperMessages {

    public static readonly NO_MATCHING_PART: Localized = () => $localize`The game you tried to join does not exist.`;

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

    // link between GameWrapping's template and remote opponent
    public currentPart: PartDocument | null = null;
    public currentPartId!: string; // Initialized in ngOnInit
    public gameStarted: boolean = false;
    public opponent: MinimalUser | null = null;
    public authUser!: AuthUser; // Initialized in ngOnInit
    public currentUser: MinimalUser | null = null;

    public configRoom: ConfigRoom;
    public currentGame: MGPOptional<CurrentGame> = MGPOptional.empty();
    private userLinkedToThisPart: boolean = true;

    private routerEventsSubscription!: Subscription; // Initialized in ngOnInit
    private userSubscription!: Subscription; // Initialized in ngOnInit
    private partSubscription: Subscription = new Subscription();
    private gameEventsSubscription: Subscription = new Subscription();
    private currentGameSubscription: Subscription = new Subscription();

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
                       private readonly gameEventService: GameEventService,
                       private readonly timeManager: OGWCTimeManagerService,
                       private readonly requestManager: OGWCRequestManagerService,
                       private readonly serverTimeService: ServerTimeService,
                       private readonly userService: UserService,
                       private readonly cdr: ChangeDetectorRef)
    {
        super(activatedRoute, connectedUserService, router, messageDisplayer);
    }

    private extractPartIdFromURL(): string {
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
        if (gameExists) {
            const partValidity: MGPValidation =
                await this.gameService.getGameValidity(this.currentPartId, urlName);
            if (partValidity.isFailure()) {
                this.routerEventsSubscription.unsubscribe();
                const message: string = OnlineGameWrapperMessages.NO_MATCHING_PART();
                await this.router.navigate(['/notFound', message], { skipLocationChange: true } );
            }
        } else {
            this.routerEventsSubscription.unsubscribe();
            const message: string = GameWrapperMessages.NO_MATCHING_GAME(urlName);
            await this.router.navigate(['/notFound', message], { skipLocationChange: true } );
        }
    }

    private setCurrentPartIdOrRedirect(): Promise<void> {
        this.currentPartId = this.extractPartIdFromURL();
        return this.redirectIfPartOrGameIsInvalid();
    }

    public async ngOnInit(): Promise<void> {

        this.routerEventsSubscription = this.router.events.subscribe(async(ev: Event) => {
            if (ev instanceof NavigationEnd) {
                await this.setCurrentPartIdOrRedirect();
            }
        });
        this.userSubscription = this.connectedUserService.subscribeToUser(async(user: AuthUser) => {
            // player should be authenticated and have a username to be here
            this.authUser = user;
        });

        await this.setCurrentPartIdOrRedirect();
        // onCurrentGameUpdate needs to access to currentPartId, so it must do it after setCurrentPartIdOrRedirect
        this.currentGameSubscription = this.currentGameService.subscribeToCurrentGame(
            (async(part: MGPOptional<CurrentGame>) => {
                await this.onCurrentGameUpdate(part);
            }));
    }

    /**
      * Here you can only be an observer or a player
      * (creator, candidate and chosen opponent being only for non started game)
      * If you are player, it is impossible that you start creating/joining a part
      * If you are observer, you can join this part as observer in another tab
      * then, if you quit this tab, you become unlinked to this part in here
      * then, if you start creating a game, this tab should go back to the lobby
      * because user that are playing should not see other players playing
      */
    private async onCurrentGameUpdate(part: MGPOptional<CurrentGame>): Promise<void> {
        if (part.isPresent()) {
            const newPart: CurrentGame = part.get();
            if (newPart.role === 'Observer' || newPart.id === this.currentPartId) {
                // if we learn that other tabs are observer
                // or that other tabs are from the same part
                // then nothing is to be done here
                this.currentGame = part;
            } else {
                // we learn that we are active in another part (typically creating another game) so we quit
                this.userLinkedToThisPart = false;
                await this.router.navigate(['/lobby']);
            }
        } else {
            this.currentGame = MGPOptional.empty();
        }
        this.cdr.detectChanges();
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
        // Trigger the first update manually, so that we will have info on the part before receiving any moves
        // This is useful when we join a part in the middle.
        const part: Part = await this.gameService.getExistingGame(this.currentPartId);
        this.currentPart = new PartDocument(this.currentPartId, part);

        // We subscribe to the part only at this point.
        // Once we receive the notification that the part started, we will subscribe to the events
        this.partSubscription =
            this.gameService.subscribeToChanges(this.currentPartId, async(p: MGPOptional<Part>) => {
                Utils.assert(p.isPresent(), 'OnlineGameWrapper observed a part being deleted, this should not happen');
                this.currentPart = new PartDocument(this.currentPartId, p.get());
            });
        this.subscribeToEvents();
    }

    private async onGameStart(): Promise<void> {
        await this.initializePlayersData(this.currentPart as PartDocument);
        const turn: number = this.gameComponent.getTurn();
        Utils.assert(turn === 0, 'turn should always be 0 upon game start');
        this.timeManager.onGameStart(this.configRoom, this.players);
        this.requestManager.onGameStart();
        this.cdr.detectChanges();
    }

    private subscribeToEvents(): void {
        // The game has started, we can subscribe to the events to receive moves etc.
        // We don't want to do it sooner, as the clocks need to be started before receiving any move
        // Importantly, we can receive more than one event at a time.
        // This is in particular used to deal with joining a game in the middle:
        // we don't want to apply all clock actions then
        const mutex: Mutex = new Mutex(); // Need to ensure we receive events one at a time
        const callback: (events: GameEvent[]) => Promise<void> = async(events: GameEvent[]): Promise<void> => {
            if (events.length === 0) return; // Only happens in the test suite
            await mutex.runExclusive(async() => {
                const numberOfMoves: number = events.filter((g: GameEvent) => g.eventType === 'Move').length;
                let numberOfMovesDone: number = 0;
                this.beforeEventsBatch();
                for (const event of events) {
                    switch (event.eventType) {
                        case 'Move':
                            const isLastMove: boolean = (numberOfMovesDone + 1 === numberOfMoves);
                            await this.onReceivedMove(event, isLastMove);
                            numberOfMovesDone += 1;
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
                            this.timeManager.onReceivedAction(event);
                            if (event.action === 'EndGame') await this.onGameEnd();
                            else if (event.action === 'StartGame') await this.onGameStart();
                            break;
                    }
                }
                await this.afterEventsBatch();
                this.cdr.detectChanges();
            });
        };
        this.gameEventsSubscription = this.gameEventService.subscribeToEvents(this.currentPartId, callback);
    }

    private async handleReply(reply: GameEventReply): Promise<void> {
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
        this.cdr.detectChanges();
    }

    private async onReceivedMove(moveEvent: GameEventMove, isLastMoveOfBatch: boolean): Promise<void> {
        if (this.moveSentButNotReceivedYet) {
            // This is our move, we have already shown it
            // So we do nothing to show it again.
            this.moveSentButNotReceivedYet = false;
        } else {
            // This is not our move, it is either the move of the opponent, or we are observing.
            // In any case, we have to show and animate it.
            const move: Move = this.gameComponent.encoder.decode(moveEvent.move);
            await this.applyMove(move, isLastMoveOfBatch);
        }
        // Need to handle the rest irrespective of which move we received
        await this.setCurrentPlayerAccordingToCurrentTurn();
        this.timeManager.onReceivedMove(moveEvent);
        this.requestManager.onReceivedMove();
        this.cdr.detectChanges();
    }

    private async setCurrentPlayerAccordingToCurrentTurn(): Promise<void> {
        this.currentUser = this.players[this.gameComponent.getTurn() % 2].get();
        await this.setInteractive(
            this.currentUser.name === this.getPlayer().name,
            false,
        );
    }

    private beforeEventsBatch(): void {
        this.timeManager.beforeEventsBatch(this.endGame);
    }

    private async afterEventsBatch(): Promise<void> {
        const player: Player = Player.ofTurn(this.gameComponent.getTurn());
        const serverTimeMs: number = await this.serverTimeService.getServerTimeInMs();
        this.timeManager.afterEventsBatch(this.endGame, player, serverTimeMs);
    }

    private async takeBackToPreviousPlayerTurn(player: Player): Promise<void> {
        // Take back once, in any case
        this.gameComponent.node = this.gameComponent.node.parent.get();
        if (this.gameComponent.getCurrentPlayer() !== player) {
            Utils.assert(this.gameComponent.getTurn() > 0, 'Should not allow player that never played to take back');
            // Take back a second time to make sure it end up on player's turn
            this.gameComponent.node = this.gameComponent.node.parent.get();
        }
        await this.setCurrentPlayerAccordingToCurrentTurn();
        const triggerAnimation: boolean = this.gameComponent.getTurn() === 0;
        await this.showCurrentState(triggerAnimation);
    }

    public canResign(): boolean {
        Utils.assert(this.isPlaying(), 'Non playing should not call canResign');
        if (this.endGame === true) {
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
        Utils.assert(this.currentPart != null, 'should not call canAskTakeBack when currentPart is not defined yet');
        // Cannot do a request in end game
        if (this.endGame === true) return false;
        // Cannot do a take back request before we played
        const currentPart: PartDocument = Utils.getNonNullable(this.currentPart);
        if (currentPart.data.turn <= this.role.getValue()) return false;
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

    private async initializePlayersData(part: PartDocument): Promise<void> {
        this.players = [
            MGPOptional.of(part.data.playerZero),
            MGPOptional.ofNullable(part.data.playerOne),
        ];
        Utils.assert(part.data.playerOne != null, 'should not initializePlayersData when players data is not received');
        await this.setCurrentPlayerAccordingToCurrentTurn();
        await this.setRealObserverRole();
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
        await this.currentGameService.updateCurrentGame({
            ...this.currentGame.get(),
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
        const partId: string = this.currentPartId;
        const scores: MGPOptional<PlayerNumberMap> = this.gameComponent.scores;
        this.moveSentButNotReceivedYet = true;
        if (gameStatus.isEndGame) {
            await this.gameService.addMoveAndEndGame(partId, encodedMove, scores, gameStatus.winner);
        } else {
            await this.gameService.addMove(partId, encodedMove, scores);
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

    private async notifyTimeoutVictory(victoriousPlayer: MinimalUser, loser: MinimalUser): Promise<void> {
        await this.gameService.notifyTimeout(this.currentPartId, victoriousPlayer, loser);
    }

    // Called by the resign button
    public async resign(): Promise<void> {
        await this.gameService.resign(this.currentPartId);
    }

    // Called by the clocks
    public async reachedOutOfTime(player: Player): Promise<void> {
        if (this.isPlaying() === false) {
            return;
        }
        const opponent: MinimalUser = Utils.getNonNullable(this.opponent);
        if (player === this.role) {
            await this.notifyTimeoutVictory(opponent, this.authUser.toMinimalUser());
        } else {
            await this.notifyTimeoutVictory(this.authUser.toMinimalUser(), opponent);
        }
    }

    // Called by the corresponding button
    public async propose(request: RequestType): Promise<void> {
        Utils.assert(this.role.isPlayer(), 'cannot propose request if not player');
        switch (request) {
            case 'Rematch':
                return this.gameService.proposeRematch(this.currentPartId);
            case 'Draw':
                return this.gameService.proposeDraw(this.currentPartId);
            default:
                Utils.expectToBe(request, 'TakeBack');
                return this.gameService.askTakeBack(this.currentPartId);
        }
    }

    // Called by the 'accept' button
    public async accept(): Promise<void> {
        Utils.assert(this.role.isPlayer(), 'cannot accept request if not player');
        const request: RequestType = this.requestManager.getCurrentRequest().get().requestType;
        switch (request) {
            case 'Rematch':
                return this.gameService.acceptRematch(this.currentPartId);
            case 'Draw':
                return this.gameService.acceptDraw(this.currentPartId);
            default:
                Utils.expectToBe(request, 'TakeBack');
                return this.gameService.acceptTakeBack(this.currentPartId);
        }
    }

    // Called by the 'reject' button
    public async reject(): Promise<void> {
        Utils.assert(this.role.isPlayer(), 'cannot reject request if not player');
        const request: RequestType = this.requestManager.getCurrentRequest().get().requestType;
        switch (request) {
            case 'Rematch':
                return this.gameService.rejectRematch(this.currentPartId);
            case 'Draw':
                return this.gameService.refuseDraw(this.currentPartId);
            default:
                Utils.expectToBe(request, 'TakeBack');
                return this.gameService.refuseTakeBack(this.currentPartId);
        }
    }

    // Called by the 'AddGlobalTime' button
    public addGlobalTime(): Promise<void> {
        return this.gameService.addGlobalTime(this.currentPartId);
    }

    // Called by the 'AddTurnTime' button
    public addTurnTime(): Promise<void> {
        return this.gameService.addTurnTime(this.currentPartId);
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
        this.currentGameSubscription.unsubscribe();
        if (this.isPlaying() === false && this.userLinkedToThisPart && this.connectedUserService.user.isPresent()) {
            await this.currentGameService.removeCurrentGame();
        }
        if (this.gameStarted === true) {
            this.partSubscription.unsubscribe();
            this.gameEventsSubscription.unsubscribe();
        }
    }

    public override async getConfig(): Promise<MGPOptional<RulesConfig>> {
        const rulesConfig: RulesConfig = this.configRoom.rulesConfig;
        return MGPOptional.of(rulesConfig);
    }

}
