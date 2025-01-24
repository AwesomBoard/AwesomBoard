import { Injectable, OnDestroy } from '@angular/core';
import { Observable, ReplaySubject, Subscription } from 'rxjs';

import { CurrentGame, User, UserRoleInPart } from '../domain/User';
import { MGPMap, MGPOptional, MGPValidation, Utils } from '@everyboard/lib';
import { UserDAO } from '../dao/UserDAO';
import { AuthUser, ConnectedUserService, GameActionFailure } from './ConnectedUserService';
import { UserService } from './UserService';
import { Localized } from '../utils/LocaleUtils';

@Injectable({
    providedIn: 'root',
})
export class CurrentGameService implements OnDestroy {

    public static roleToMessage: MGPMap<UserRoleInPart, Localized> = new MGPMap([
        { key: 'Candidate', value: GameActionFailure.YOU_ARE_ALREADY_CANDIDATE },
        { key: 'ChosenOpponent', value: GameActionFailure.YOU_ARE_ALREADY_CHOSEN_OPPONENT },
        { key: 'Creator', value: GameActionFailure.YOU_ARE_ALREADY_CREATING },
        { key: 'Player', value: GameActionFailure.YOU_ARE_ALREADY_PLAYING },
        { key: 'Observer', value: GameActionFailure.YOU_ARE_ALREADY_OBSERVING },
    ]);
    private readonly authSubscription: Subscription;

    private userSubscription: Subscription = new Subscription();

    private currentGame: MGPOptional<CurrentGame> = MGPOptional.empty();
    private readonly currentGameRS: ReplaySubject<MGPOptional<CurrentGame>>;
    private readonly currentGameObs: Observable<MGPOptional<CurrentGame>>;

    public constructor(private readonly userDAO: UserDAO,
                       private readonly userService: UserService,
                       private readonly connectedUserService: ConnectedUserService)
    {
        this.currentGameRS = new ReplaySubject<MGPOptional<CurrentGame>>(1);
        this.currentGameObs = this.currentGameRS.asObservable();
        this.authSubscription = this.connectedUserService.subscribeToUser(async(user: AuthUser) => {
            await this.onUserUpdate(user);
        });
    }
    private async onUserUpdate(user: AuthUser): Promise<void> {
        if (user === AuthUser.NOT_CONNECTED) { // user logged out
            this.userSubscription.unsubscribe();
            this.currentGame = MGPOptional.empty();
            this.currentGameRS.next(MGPOptional.empty());
        } else { // new user logged in
            // We need to subscribe to any change to the user's observed part
            this.userSubscription =
                this.userService.observeUserOnServer(user.id, (docOpt: MGPOptional<User>) => {
                    Utils.assert(docOpt.isPresent(), 'Observing part service expected user to already have a document!');
                    const doc: User = docOpt.get();
                    this.onCurrentGameUpdate(doc.currentGame);
                });
            // And we need to make sure we get the current observed part
            const userInDB: MGPOptional<User> = await this.userDAO.read(user.id);
            this.currentGame = MGPOptional.ofNullable(userInDB.get().currentGame);
            this.currentGameRS.next(this.currentGame);
        }
    }
    private onCurrentGameUpdate(newCurrentGame: CurrentGame | null | undefined): void {
        // Undefined if the user had no currentGame, null if it has been removed
        const previousCurrentGame: MGPOptional<CurrentGame> = this.currentGame;
        const stayedNull: boolean = newCurrentGame == null && previousCurrentGame.isAbsent();
        const stayedItselfAsNonNull: boolean = newCurrentGame != null &&
                                               previousCurrentGame.equalsValue(newCurrentGame);
        const valueChanged: boolean = stayedNull === false && stayedItselfAsNonNull === false;
        if (valueChanged) {
            this.currentGame = MGPOptional.ofNullable(newCurrentGame);
            this.currentGameRS.next(this.currentGame);
        }
    }
    public updateCurrentGame(currentGame: Partial<CurrentGame>): Promise<void> {
        Utils.assert(this.connectedUserService.user.isPresent(), 'Should not call updateCurrentGame when not connected');
        if (this.currentGame.isPresent()) {
            const oldCurrentGame: CurrentGame = this.currentGame.get();
            const mergedCurrentGame: CurrentGame = { ...oldCurrentGame, ...currentGame };
            return this.userDAO.update(this.connectedUserService.user.get().id, { currentGame: mergedCurrentGame });
        } else {
            const fakeCurrentGame: CurrentGame = {
                id: 'id',
                role: 'Candidate',
                gameName: 'P4',
            };
            const keys: string[] = Object.keys(fakeCurrentGame);
            for (const key of keys) {
                Utils.assert(currentGame[key] != null, 'field ' + key + ' should be set before updating currentGame');
            }
            // Here, we know that currentGame is not partial
            return this.userDAO.update(this.connectedUserService.user.get().id, { currentGame });
        }
    }
    public removeCurrentGame(): Promise<void> {
        Utils.assert(this.connectedUserService.user.isPresent(), 'Should not call removeCurrentGame when not connected');
        return this.userDAO.update(this.connectedUserService.user.get().id, { currentGame: null });
    }
    public subscribeToCurrentGame(callback: (optCurrentGame: MGPOptional<CurrentGame>) => void): Subscription {
        return this.currentGameObs.subscribe(callback);
    }
    public canUserCreate(): MGPValidation {
        if (this.currentGame.isAbsent()) {
            return MGPValidation.SUCCESS;
        } else {
            const message: string = CurrentGameService.roleToMessage.get(this.currentGame.get().role).get()();
            return MGPValidation.failure(message);
        }
    }
    public canUserJoin(partId: string, gameStarted: boolean): MGPValidation {
        if (this.currentGame.isAbsent() || this.currentGame.get().id === partId) {
            // Users can join game if they are not in any game
            // Or they can join a game if they are already in this specific game
            return MGPValidation.SUCCESS;
        } else {
            if (gameStarted && this.currentGame.get().role === 'Observer') {
                // User is allowed to observe two different parts
                return MGPValidation.SUCCESS;
            } else {
                // If the other-part is not-started, you cannot (join it and become candidate)
                // if the other-part is started but you are active(aka: non-observer) you cannot join it
                const message: string = CurrentGameService.roleToMessage.get(this.currentGame.get().role).get()();
                return MGPValidation.failure(message);
            }
        }
    }
    public getCurrentGame(): Promise<MGPOptional<CurrentGame>> {
        // We need to make sure we have fully initialized, hence currentGameObs contains a value
        // We will get that value in the first call to the callback
        return new Promise((resolve: (result: MGPOptional<CurrentGame>) => void) => {
            // We need to initialize subscription first so that it is available within the called function
            let subscription: Subscription = new Subscription();
            subscription = this.currentGameObs.subscribe((observed: MGPOptional<CurrentGame>) => {
                resolve(observed);
                subscription.unsubscribe();
            });
        });
    }
    public ngOnDestroy(): void {
        this.userSubscription.unsubscribe();
        this.authSubscription.unsubscribe();
    }
}
