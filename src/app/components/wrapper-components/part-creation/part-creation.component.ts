import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

import { FirstPlayer, IFirstPlayer, ConfigRoom, IPartType, PartStatus, PartType, IPartStatus } from '../../../domain/ConfigRoom';
import { GameService } from '../../../services/GameService';
import { ConfigRoomService } from '../../../services/ConfigRoomService';
import { ChatService } from '../../../services/ChatService';
import { Debug, Utils } from 'src/app/utils/utils';
import { UserService } from 'src/app/services/UserService';
import { MessageDisplayer } from 'src/app/services/MessageDisplayer';
import { MGPOptional } from 'src/app/utils/MGPOptional';
import { AuthUser, ConnectedUserService } from 'src/app/services/ConnectedUserService';
import { MGPValidation } from 'src/app/utils/MGPValidation';
import { MinimalUser } from 'src/app/domain/MinimalUser';
import { getMillisecondsElapsed } from 'src/app/utils/TimeUtils';
import { FirestoreTime } from 'src/app/domain/Time';
import { ErrorLoggerService } from 'src/app/services/ErrorLoggerService';
import { CurrentGame, User, UserRoleInPart } from 'src/app/domain/User';
import { Timestamp } from 'firebase/firestore';
import { Subscription } from 'rxjs';
import { CurrentGameService } from 'src/app/services/CurrentGameService';
import { RulesConfig } from 'src/app/jscaip/RulesConfigUtil';
import { RulesConfigurationComponent } from '../rules-configuration/rules-configuration.component';
import { GameInfo } from '../../normal-component/pick-game/pick-game.component';
import { GameState } from 'src/app/jscaip/GameState';
import { RulesConfigDescription } from '../rules-configuration/RulesConfigDescription';
import { AbstractRules } from 'src/app/jscaip/Rules';

type PartCreationViewInfo = {
    userIsCreator: boolean;
    showCustomTime?: boolean;
    canEditConfig?: boolean;
    canProposeConfig?: boolean;
    canReviewConfig?: boolean;

    userIsChosenOpponent: boolean;
    creatorIsModifyingConfig?: boolean;
    userIsObserver: boolean;

    creator?: string;
    firstPlayer: IFirstPlayer;
    firstPlayerClasses: { [key: string]: string[] },
    partType: IPartType;
    partTypeClasses: { [key: string]: string[] },
    partTypeName?: string,
    maximalMoveDuration?: number;
    totalPartDuration?: number;
    candidates: string[];
    chosenOpponent?: string;
    candidateClasses: { [key: string]: string[] },
}
@Component({
    selector: 'app-part-creation',
    templateUrl: './part-creation.component.html',
})
@Debug.log
export class PartCreationComponent implements OnInit, OnDestroy {
    /*
     * Lifecycle:
     * 1. Creator chooses config and opponent
     * 2. Creator click on "proposing the config"
     * 3a. Chosen opponent accepts the config -> part starts
     * 3b. Creator clicks on "modifying config" -> back to 1, with the current config and opponent
     *
     * PageCreationComponent is always a child of OnlineGame component (one to one)
     * they need common data so that the parent calculates/retrieves the data then share it
     * with the part creation component
     */
    public static TOKEN_INTERVAL: number = 5 * 1000;
    public static TOKEN_TIMEOUT: number = 5 * 1000 * 2;

    public partType: typeof PartType = PartType;

    @Input() partId: string;

    @Input() rulesConfigDescription: MGPOptional<RulesConfigDescription>;

    // notify that the game has started, a thing evaluated with the configRoom doc game status
    @Output() gameStartNotification: EventEmitter<ConfigRoom> = new EventEmitter<ConfigRoom>();

    @ViewChild('rulesConfigurationComponent') public rulesConfigurationComponent: RulesConfigurationComponent;

    public gameStarted: boolean = false;

    public viewInfo: PartCreationViewInfo = {
        userIsCreator: false,
        userIsChosenOpponent: false,
        userIsObserver: false,
        partType: 'STANDARD',
        partTypeClasses: { 'STANDARD': ['is-selected', 'is-primary'], 'BLITZ': [], 'CUSTOM': [] },
        firstPlayer: 'RANDOM',
        firstPlayerClasses: { 'CREATOR': [], 'RANDOM': ['is-selected', 'is-primary'], 'CHOSEN_PLAYER': [] },
        candidateClasses: {},
        candidates: [],
    };
    public currentConfigRoom: ConfigRoom | null = null;
    public candidates: MinimalUser[] = [];

    // Subscription
    private readonly ngUnsubscribe: Subject<void> = new Subject<void>();
    private allUserInterval: MGPOptional<number> = MGPOptional.empty();
    private ownTokenInterval: MGPOptional<number> = MGPOptional.empty();
    private lastToken: Timestamp;
    private selfSubscription: Subscription = new Subscription();

    private configRoomSubscription: Subscription = new Subscription();
    private candidatesSubscription: Subscription = new Subscription();

    public configFormGroup: FormGroup;

    public allDocDeleted: boolean = false;

    protected rulesConfig: MGPOptional<RulesConfig> = MGPOptional.empty(); // Provided by RulesConfigurationComponent

    public constructor(public readonly router: Router,
                       public readonly activatedRoute: ActivatedRoute,
                       public readonly connectedUserService: ConnectedUserService,
                       public readonly currentGameService: CurrentGameService,
                       public readonly gameService: GameService,
                       public readonly configRoomService: ConfigRoomService,
                       public readonly chatService: ChatService,
                       public readonly userService: UserService,
                       public readonly formBuilder: FormBuilder,
                       public readonly messageDisplayer: MessageDisplayer)
    {
    }
    public async ngOnInit(): Promise<void> {
        this.checkInputs();
        this.createForms();
        const joinResult: MGPValidation = await this.configRoomService.joinGame(this.partId);
        if (joinResult.isFailure()) {
            const reason: string = joinResult.getReason();
            this.messageDisplayer.criticalMessage(reason);
            return;
        }
        await this.startSendingPresenceTokens();
        this.subscribeToConfigRoomDoc();
        this.subscribeToFormElements();
    }
    private checkInputs(): void {
        const user: MGPOptional<AuthUser> = this.connectedUserService.user;
        Utils.assert(user.isPresent(), 'PartCreationComponent should not be called without connected user');
        Utils.assert(user.get() !== AuthUser.NOT_CONNECTED, 'PartCreationComponent should not be created with an empty userName');
        Utils.assert(this.partId !== '', 'PartCreationComponent should not be created with an empty partId');
    }
    private createForms(): void {
        this.configFormGroup = this.formBuilder.group({
            firstPlayer: [FirstPlayer.RANDOM.value, Validators.required],
            maximalMoveDuration: [PartType.NORMAL_MOVE_DURATION, Validators.required],
            partType: ['STANDARD', Validators.required],
            totalPartDuration: [PartType.NORMAL_PART_DURATION, Validators.required],
            chosenOpponent: ['', Validators.required],
        });
    }
    private updateUserDocWithCurrentGame(configRoom: ConfigRoom): Promise<void> {
        const role: UserRoleInPart = this.getUserRoleInPart(configRoom);
        const currentGame: CurrentGame = {
            id: this.partId,
            opponent: this.getOpponent(),
            typeGame: this.getGameUrlName(),
            role,
        };
        return this.currentGameService.updateCurrentGame(currentGame);
    }
    private getUserRoleInPart(configRoom: ConfigRoom): UserRoleInPart {
        const currentUserId: string = this.connectedUserService.user.get().id;
        if (currentUserId === configRoom.creator.id) {
            return 'Creator';
        } else if (currentUserId === configRoom.chosenOpponent?.id) {
            return 'ChosenOpponent';
        } else {
            return 'Candidate';
        }
    }
    private getOpponent(): MinimalUser | null {
        let userOrUndefined: MinimalUser | null = null;
        if (this.connectedUserService.user.get().id === this.currentConfigRoom?.creator.id) {
            userOrUndefined = this.currentConfigRoom.chosenOpponent;
        } else {
            userOrUndefined = Utils.getNonNullable(this.currentConfigRoom?.creator);
        }
        return userOrUndefined;
    }
    private subscribeToConfigRoomDoc(): void {
        const configRoomCallback: (configRoom: MGPOptional<ConfigRoom>) => void =
            async(configRoom: MGPOptional<ConfigRoom>) => {
                await this.onCurrentConfigRoomUpdate(configRoom);
            };
        const candidatesCallback: (candidates: MinimalUser[]) => void = async(candidates: MinimalUser[]) => {
            await this.onCandidatesUpdate(candidates);
        };
        this.configRoomSubscription =
            this.configRoomService.subscribeToChanges(this.partId, configRoomCallback);
        this.candidatesSubscription =
            this.configRoomService.subscribeToCandidates(this.partId, candidatesCallback);
    }
    private getForm(name: string): AbstractControl {
        return Utils.getNonNullable(this.configFormGroup.get(name));
    }
    private subscribeToFormElements(): void {
        this.getForm('chosenOpponent').valueChanges
            .pipe(takeUntil(this.ngUnsubscribe)).subscribe((opponent: string) => {
                if (this.viewInfo.chosenOpponent !== undefined) {
                    this.viewInfo.candidateClasses[this.viewInfo.chosenOpponent] = [];
                }
                this.viewInfo.candidateClasses[opponent] = ['is-selected'];
                this.viewInfo.chosenOpponent = opponent;
                const partStatus: IPartStatus = Utils.getNonNullable(this.currentConfigRoom).partStatus;
                this.viewInfo.canProposeConfig = partStatus !== PartStatus.CONFIG_PROPOSED.value && opponent !== '';
            });
        this.getForm('partType').valueChanges
            .pipe(takeUntil(this.ngUnsubscribe)).subscribe((partType: IPartType) => {
                this.viewInfo.partTypeClasses[this.viewInfo.partType] = [];
                this.viewInfo.partTypeClasses[partType] = ['is-primary', 'is-selected'];
                this.viewInfo.partType = partType;
                this.viewInfo.showCustomTime = partType === 'CUSTOM';
            });
        this.getForm('maximalMoveDuration').valueChanges
            .pipe(takeUntil(this.ngUnsubscribe)).subscribe((maximalMoveDuration: number) => {
                this.viewInfo.maximalMoveDuration = maximalMoveDuration;
            });
        this.getForm('totalPartDuration').valueChanges
            .pipe(takeUntil(this.ngUnsubscribe)).subscribe((totalPartDuration: number) => {
                this.viewInfo.totalPartDuration = totalPartDuration;
            });
        this.getForm('firstPlayer').valueChanges
            .pipe(takeUntil(this.ngUnsubscribe)).subscribe((firstPlayer: IFirstPlayer) => {
                this.viewInfo.firstPlayerClasses[this.viewInfo.firstPlayer] = [];
                this.viewInfo.firstPlayerClasses[firstPlayer] = ['is-primary', 'is-selected'];
                this.viewInfo.firstPlayer = firstPlayer;
            });
    }
    private updateViewInfo(): void {
        const configRoom: ConfigRoom = Utils.getNonNullable(this.currentConfigRoom);
        const authUser: AuthUser = this.connectedUserService.user.get();

        this.viewInfo.canReviewConfig = configRoom.partStatus === PartStatus.CONFIG_PROPOSED.value;
        this.viewInfo.canEditConfig = configRoom.partStatus !== PartStatus.CONFIG_PROPOSED.value;
        this.viewInfo.userIsCreator = this.userIsCreator(configRoom);
        this.viewInfo.userIsChosenOpponent = authUser.id === configRoom.chosenOpponent?.id;
        this.viewInfo.userIsObserver =
                this.viewInfo.userIsChosenOpponent === false && this.viewInfo.userIsCreator === false;
        this.viewInfo.creatorIsModifyingConfig = configRoom.partStatus !== PartStatus.CONFIG_PROPOSED.value;
        this.viewInfo.showCustomTime = this.getForm('partType').value === 'CUSTOM';

        this.viewInfo.creator = configRoom.creator.name;
        this.viewInfo.candidates = this.candidates.map((candidate: MinimalUser) => candidate.name);
        if (this.userIsCreator(configRoom)) {
            this.setDataForCreator(configRoom);
        } else {
            this.viewInfo.maximalMoveDuration = configRoom.maximalMoveDuration;
            this.viewInfo.totalPartDuration = configRoom.totalPartDuration;
            this.viewInfo.partType = configRoom.partType;
            this.viewInfo.chosenOpponent = configRoom.chosenOpponent?.name;
            this.viewInfo.firstPlayer = configRoom.firstPlayer;
        }
        switch (configRoom.partType) {
            case 'CUSTOM':
                this.viewInfo.partTypeName = $localize`custom`;
                break;
            case 'BLITZ':
                this.viewInfo.partTypeName = $localize`blitz`;
                break;
            case 'STANDARD':
                this.viewInfo.partTypeName = $localize`standard`;
                break;
        }
    }
    private setDataForCreator(configRoom: ConfigRoom): void {
        this.viewInfo.maximalMoveDuration = this.viewInfo.maximalMoveDuration ?? configRoom.maximalMoveDuration;
        this.viewInfo.totalPartDuration = this.viewInfo.totalPartDuration ?? configRoom.totalPartDuration;
        let opponent: string | undefined = this.viewInfo.chosenOpponent;
        if (opponent == null || opponent === '') {
            opponent = configRoom.chosenOpponent?.name ?? '';
        } else {
            const chosenOpponentIsCandidate: boolean = this.candidates.some((minimalUser: MinimalUser) => {
                return minimalUser.name === opponent;
            });
            if (chosenOpponentIsCandidate === false) {
                opponent = ''; // chosenOpponent left
            }
        }
        this.getForm('chosenOpponent').setValue(opponent);
    }
    public selectFirstPlayer(firstPlayer: IFirstPlayer): void {
        this.getForm('firstPlayer').setValue(firstPlayer);
    }
    public selectPartType(partType: IPartType): void {
        if (partType === 'STANDARD') {
            this.getForm('maximalMoveDuration').setValue(PartType.NORMAL_MOVE_DURATION);
            this.getForm('totalPartDuration').setValue(PartType.NORMAL_PART_DURATION);
        } else if (partType === 'BLITZ') {
            this.getForm('maximalMoveDuration').setValue(PartType.BLITZ_MOVE_DURATION);
            this.getForm('totalPartDuration').setValue(PartType.BLITZ_PART_DURATION);
        }
        this.getForm('partType').setValue(partType);
    }
    public async selectOpponent(opponentName: string): Promise<void> {
        const opponent: MinimalUser = this.getUserFromName(opponentName);
        await Promise.all([
            this.currentGameService.updateCurrentGame({ opponent }),
            this.configRoomService.setChosenOpponent(this.partId, opponent),
        ]);
        return;
    }
    private getUserFromName(username: string): MinimalUser {
        const user: MinimalUser | undefined = this.candidates.find((c: MinimalUser) => c.name === username);
        return Utils.getNonNullable(user);
    }
    public async changeConfig(): Promise<void> {
        return this.configRoomService.reviewConfig(this.partId);
    }
    public async proposeConfig(): Promise<void> {
        const chosenOpponentName: string = this.getForm('chosenOpponent').value;
        const partType: string = this.getForm('partType').value;
        const maxMoveDur: number = this.getForm('maximalMoveDuration').value;
        const firstPlayer: string = this.getForm('firstPlayer').value;
        const totalPartDuration: number = this.getForm('totalPartDuration').value;
        const chosenOpponent: MinimalUser = this.getUserFromName(chosenOpponentName);
        return this.configRoomService.proposeConfig(this.partId,
                                                    chosenOpponent,
                                                    PartType.of(partType),
                                                    maxMoveDur,
                                                    FirstPlayer.of(firstPlayer),
                                                    totalPartDuration,
                                                    this.rulesConfig.get());
    }
    public async cancelGameCreation(): Promise<void> {
        this.allDocDeleted = true;
        await this.currentGameService.removeCurrentGame();
        Debug.display('PartCreationComponent', 'cancelGameCreation', 'observed part removed');

        await this.chatService.deleteChat(this.partId);
        Debug.display('PartCreationComponent', 'cancelGameCreation', 'chat deleted');

        await this.gameService.deletePart(this.partId);
        Debug.display('PartCreationComponent', 'cancelGameCreation', 'chat and part deleted');

        await this.configRoomService.deleteConfigRoom(this.partId, this.candidates);
        Debug.display('PartCreationComponent', 'cancelGameCreation', 'chat, part, and configRoom deleted');

        return;
    }
    private async onCurrentConfigRoomUpdate(configRoomOpt: MGPOptional<ConfigRoom>): Promise<void> {
        if (configRoomOpt.isAbsent()) {
            Debug.display('PartCreationComponent', 'onCurrentConfigRoomUpdate', 'LAST UPDATE : the game is cancelled');
            return this.onGameCanceled();
        } else {
            const configRoom: ConfigRoom = configRoomOpt.get();
            if (this.rulesConfig.isAbsent()) {
                this.rulesConfig = MGPOptional.of(configRoom.rulesConfig);
            }
            if (this.chosenOpponentJustLeft(configRoom) &&
                this.userIsCreator(configRoom))
            {
                const currentConfigRoom: ConfigRoom = Utils.getNonNullable(this.currentConfigRoom);
                const userName: string = Utils.getNonNullable(currentConfigRoom.chosenOpponent).name;
                this.messageDisplayer.infoMessage($localize`${userName} left the game, please pick another opponent.`);
                await this.currentGameService.updateCurrentGame({ opponent: null });
            }
            let currentGameUpdated: boolean = false;
            if (this.userJustChosenAsOpponent(configRoom)) {
                await this.updateUserDocWithCurrentGame(configRoom);
                currentGameUpdated = true;
            }
            this.currentConfigRoom = configRoom;
            if (this.allUserInterval.isAbsent()) { // Only do it once
                Utils.assert(currentGameUpdated === false, 'Expected currentGameUpdate to be false at first call of onCurrentConfigRoomUpdate');
                await this.updateUserDocWithCurrentGame(this.currentConfigRoom);
                await this.observeNeededPlayers();
            }
            this.updateViewInfo();
            if (this.isGameStarted(this.currentConfigRoom)) {
                Debug.display('PartCreationComponent', 'onCurrentConfigRoomUpdate', 'the game has started');
                this.onGameStarted();
            }
        }
    }
    private async onCandidatesUpdate(candidates: MinimalUser[]): Promise<void> {
        this.candidates = candidates;
        this.updateViewInfo();
    }
    private userJustChosenAsOpponent(configRoom: ConfigRoom): boolean {
        if (this.isGameStarted(configRoom)) return false;
        const currentUserId: string = this.connectedUserService.user.get().id;
        const userWasNotChosenOpponent: boolean = this.currentConfigRoom?.chosenOpponent?.id !== currentUserId;
        const userIsChosenOpponent: boolean = configRoom.chosenOpponent?.id === currentUserId;
        return userWasNotChosenOpponent && userIsChosenOpponent;
    }
    private chosenOpponentJustLeft(newConfigRoom: ConfigRoom): boolean {
        if (this.currentConfigRoom == null) return false;
        const currentConfigRoom: ConfigRoom = this.currentConfigRoom;
        const thereWasAChosenOpponent: boolean = currentConfigRoom.chosenOpponent != null;
        const thereIsNoLongerChosenOpponent: boolean = newConfigRoom.chosenOpponent == null;
        return thereWasAChosenOpponent && thereIsNoLongerChosenOpponent;
    }
    private async onGameCanceled(): Promise<void> {
        this.messageDisplayer.infoMessage($localize`The game has been canceled!`);
        await this.router.navigate(['/lobby']);
    }
    private isGameStarted(configRoom: ConfigRoom | null): boolean {
        Utils.assert(configRoom != null, 'configRoom should not be null (isGameStarted)');
        return Utils.getNonNullable(configRoom).partStatus === PartStatus.PART_STARTED.value;
    }
    private onGameStarted(): void {
        const configRoom: ConfigRoom = Utils.getNonNullable(this.currentConfigRoom);

        this.gameStartNotification.emit(configRoom);
        this.gameStarted = true;
    }
    private async observeNeededPlayers(): Promise<void> {
        const configRoom: ConfigRoom = Utils.getNonNullable(this.currentConfigRoom);
        Utils.assert(this.allUserInterval.isAbsent(), 'Cannot observe players multiple times');
        this.allUserInterval = MGPOptional.of(window.setInterval(async() => {
            const currentTime: Timestamp = this.lastToken;
            if (this.userIsCreator(configRoom)) {
                await this.checkCandidatesTokensFreshness(currentTime);
            } else {
                await this.checkCreatorTokenFreshness(currentTime);
            }
        }, PartCreationComponent.TOKEN_INTERVAL));
    }
    private userIsCreator(configRoom: ConfigRoom): boolean {
        const currentUserId: string = this.connectedUserService.user.get().id;
        return currentUserId === configRoom.creator.id;
    }
    private async checkCreatorTokenFreshness(currentTime: Timestamp): Promise<void> {
        const configRoom: ConfigRoom = Utils.getNonNullable(this.currentConfigRoom);
        if (await this.didUserTimeout(configRoom.creator.id, currentTime)) {
            await this.destroyDocIfPartDidNotStart();
        }
    }
    private async destroyDocIfPartDidNotStart(): Promise<void> {
        const partStarted: boolean = this.isGameStarted(this.currentConfigRoom);
        Utils.assert(partStarted === false, 'Should not try to cancelGameCreation when part started!');
        Utils.assert(this.allDocDeleted === false, 'Should not delete doc twice');
        await this.cancelGameCreation();
    }
    private async checkCandidatesTokensFreshness(currentTime: Timestamp): Promise<void> {
        for (const candidate of this.candidates) {
            if (await this.didUserTimeout(candidate.id, currentTime)) {
                await this.removeCandidateFromLobby(candidate);
            }
        }
    }
    private async didUserTimeout(userId: string, currentTime: Timestamp): Promise<boolean> {
        const lastChangedOpt: MGPOptional<FirestoreTime> = await this.userService.getUserLastUpdateTime(userId);
        if (lastChangedOpt.isAbsent()) {
            const error: string = 'found no user while observing ' + userId + ' !';
            ErrorLoggerService.logError('PartCreationComponent', error);
            return true;
        }
        const lastUpdateTime: Timestamp = lastChangedOpt.get() as Timestamp;
        const diff: number = getMillisecondsElapsed(lastUpdateTime, currentTime);
        return diff > PartCreationComponent.TOKEN_TIMEOUT;
    }
    private async removeCandidateFromLobby(user: MinimalUser): Promise<void> {
        const configRoom: ConfigRoom = Utils.getNonNullable(this.currentConfigRoom);
        if (user.id === configRoom.chosenOpponent?.id) {
            // The chosen player has been removed, the user will have to review the config
            // A message will be displayed once the configRoom has been update
            await this.configRoomService.reviewConfigAndRemoveChosenOpponent(this.partId);
        }
        return this.configRoomService.removeCandidate(this.partId, user);
    }
    public async startSendingPresenceTokens(): Promise<void> {
        await this.connectedUserService.sendPresenceToken();
        Utils.assert(this.ownTokenInterval.isAbsent(), 'should not start sending presence tokens twice');
        this.ownTokenInterval = MGPOptional.of(window.setInterval(() => {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this.connectedUserService.sendPresenceToken();
        }, PartCreationComponent.TOKEN_INTERVAL));
        const userId: string = this.connectedUserService.user.get().id;
        this.selfSubscription = this.userService.observeUserOnServer(userId, (user: MGPOptional<User>) => {
            Utils.assert(user.isPresent(), 'connected user should exist');
            this.lastToken = Utils.getNonNullable(user.get().lastUpdateTime) as Timestamp;
        });
    }
    public stopSendingPresenceTokensAndObservingUsersIfNeeded(): void {
        if (this.ownTokenInterval.isPresent()) {
            window.clearInterval(this.ownTokenInterval.get());
            this.ownTokenInterval = MGPOptional.empty();
        }
        if (this.allUserInterval.isPresent()) {
            window.clearInterval(this.allUserInterval.get());
        }
        this.selfSubscription.unsubscribe();
    }
    public acceptConfig(): Promise<void> {
        // called by the configRoom
        // triggers the redirection that will be applied for every subscribed user
        return this.gameService.acceptConfig(this.partId, Utils.getNonNullable(this.currentConfigRoom));
    }

    public saveRulesConfig(rulesConfig: MGPOptional<RulesConfig>): void {
        this.rulesConfig = rulesConfig;
    }

    protected getGameUrlName(): string {
        return Utils.getNonNullable(this.activatedRoute.snapshot.paramMap.get('compo'));
    }

    public getStateProvider(): MGPOptional<(config: MGPOptional<RulesConfig>) => GameState> {
        const urlName: string = this.getGameUrlName();
        const rules: AbstractRules = GameInfo.getByUrlName(urlName)[0].rules;
        const stateProvider: (config: MGPOptional<RulesConfig> ) => GameState = (config: MGPOptional<RulesConfig>) => {
            // eslint-disable-next-line dot-notation
            return rules.getInitialState(config);
        };
        return MGPOptional.of(stateProvider);
    }

    public async ngOnDestroy(): Promise<void> {
        // This will unsubscribe from all observables
        this.ngUnsubscribe.next();
        this.ngUnsubscribe.complete();

        // Unsubscribe from the config room and candidates
        this.configRoomSubscription.unsubscribe();
        this.candidatesSubscription.unsubscribe();

        this.stopSendingPresenceTokensAndObservingUsersIfNeeded();
        if (this.connectedUserService.user.isAbsent()) {
            // User disconnected, there's not much we can do at this point
            // We could instead remove parts in creation when doing the log out,
            // but this is an unlikely event and just ignoring log outs here
            // treats this similar to a "tab closed" event, so it is more consistent behavior.
            return;
        }
        const authUser: AuthUser = this.connectedUserService.user.get();

        if (this.gameStarted === true) {
            // Avoid canceling game creation if part started but user leave
            return;
        }
        if (this.currentConfigRoom === null) {
            Debug.display('PartCreationComponent', 'ngOnDestroy', 'there is no part here');
        } else if (this.allDocDeleted === true) {
            Debug.display('PartCreationComponent', 'ngOnDestroy', 'part has already been deleted');
        } else if (authUser.id === this.currentConfigRoom.creator.id) {
            Debug.display('PartCreationComponent', 'ngOnDestroy', 'you(creator) about to cancel creation.');
            await this.cancelGameCreation();
        } else {
            Debug.display('PartCreationComponent', 'ngOnDestroy', 'you are about to cancel game joining');
            await this.currentGameService.removeCurrentGame();
            await this.configRoomService.cancelJoining(this.partId);
        }
    }
}
