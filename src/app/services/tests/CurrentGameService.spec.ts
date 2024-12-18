/* eslint-disable max-lines-per-function */
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ReplaySubject, Subscription } from 'rxjs';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { CurrentGame } from 'src/app/domain/User';
import { CurrentGameService } from '../CurrentGameService';
import { MGPOptional, MGPValidation, Utils } from '@everyboard/lib';
import { AuthUser, ConnectedUserService, GameActionFailure } from '../ConnectedUserService';
import { UserDAO } from 'src/app/dao/UserDAO';
import { ConnectedUserServiceMock } from './ConnectedUserService.spec';
import { UserDAOMock } from 'src/app/dao/tests/UserDAOMock.spec';
import { UserMocks } from 'src/app/domain/UserMocks.spec';
import { ErrorLoggerServiceMock } from './ErrorLoggerServiceMock.spec';
import { CurrentGameMocks } from 'src/app/domain/mocks/CurrentGameMocks.spec';
import { UserService } from '../UserService';
import { prepareUnsubscribeCheck } from 'src/app/utils/tests/TestUtils.spec';

export class CurrentGameServiceMock {

    public static setCurrentGame(currentGame: MGPOptional<CurrentGame>): void {
        (TestBed.inject(CurrentGameService) as unknown as CurrentGameServiceMock)
            .setCurrentGame(currentGame);
    }
    private readonly currentGameRS: ReplaySubject<MGPOptional<CurrentGame>>;

    private currentGame: MGPOptional<CurrentGame> = MGPOptional.empty();

    public constructor() {
        this.currentGameRS = new ReplaySubject<MGPOptional<CurrentGame>>(1);
    }
    public subscribeToCurrentGame(callback: (optCurrentGame: MGPOptional<CurrentGame>) => void): Subscription {
        return this.currentGameRS.asObservable().subscribe(callback);
    }
    public setCurrentGame(currentGame: MGPOptional<CurrentGame>): void {
        this.currentGame = currentGame;
        this.currentGameRS.next(currentGame);
    }
    public async removeCurrentGame(currentGame: string): Promise<void> {
        return;
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
    public async updateCurrentGame(currentGame: CurrentGame): Promise<void> {
        this.currentGameRS.next(MGPOptional.of(currentGame));
    }
    public getCurrentGame(): MGPOptional<CurrentGame> {
        return this.currentGame;
    }
}

describe('CurrentGameService', () => {

    let currentGameService: CurrentGameService;
    let connectedUserService: ConnectedUserService;
    let userDAO: UserDAO;
    let userService: UserService;
    const opponentId: string = UserMocks.OPPONENT_AUTH_USER.id;
    let alreadyDestroyed: boolean;

    beforeEach(async() => {
        await TestBed.configureTestingModule({
            imports: [],
            schemas: [CUSTOM_ELEMENTS_SCHEMA],
            providers: [
                { provide: UserDAO, useClass: UserDAOMock },
                { provide: ConnectedUserService, useClass: ConnectedUserServiceMock },
            ],
        }).compileComponents();

        userDAO = TestBed.inject(UserDAO);
        userService = TestBed.inject(UserService);
        connectedUserService = TestBed.inject(ConnectedUserService);
        currentGameService = TestBed.inject(CurrentGameService);
        alreadyDestroyed = false;

        await userDAO.set(UserMocks.OPPONENT_AUTH_USER.id, UserMocks.OPPONENT);
        await userDAO.set(UserMocks.CREATOR_AUTH_USER.id, UserMocks.CREATOR);
    });
    describe('login/logout', () => {
        it('should forget the currentGame when user is disconnected', fakeAsync(async() => {
            // Given a registered and connected user observing a game
            ConnectedUserServiceMock.setUser(UserMocks.OPPONENT_AUTH_USER);
            tick(0);
            let currentGame: MGPOptional<CurrentGame> = MGPOptional.empty();
            const subscription: Subscription =
                currentGameService.subscribeToCurrentGame((newValue: MGPOptional<CurrentGame>) => {
                    currentGame = newValue;
                });
            await userDAO.update(opponentId, { currentGame: { id: '1234', typeGame: 'P4' } });
            expect(currentGame.isPresent()).toBeTrue();

            // When connected user logs out
            ConnectedUserServiceMock.setUser(AuthUser.NOT_CONNECTED);

            // Then the service does not have an observed part anymore
            expect(currentGame.isAbsent()).toBeTrue();
            subscription.unsubscribe();
        }));
        it('should remember the currentGame when user logs in', fakeAsync(async() => {
            // Given a registered and disconnected user observing a game
            ConnectedUserServiceMock.setUser(AuthUser.NOT_CONNECTED);
            let currentGame: MGPOptional<CurrentGame> = MGPOptional.empty();
            const subscription: Subscription =
                currentGameService.subscribeToCurrentGame((newValue: MGPOptional<CurrentGame>) => {
                    currentGame = newValue;
                });
            await userDAO.update(opponentId, { currentGame: { id: '1234', typeGame: 'P4' } });
            expect(currentGame.isAbsent()).toBeTrue();

            // When disconnected user logs in
            ConnectedUserServiceMock.setUser(UserMocks.OPPONENT_AUTH_USER);
            tick(0);

            // Then the service now has an observed part
            expect(currentGame.isPresent()).toBeTrue();
            subscription.unsubscribe();
        }));
        it('should get the currentGame with getCurrentGame', fakeAsync(async() => {
            // Given a registered and disconnected user observing a game
            ConnectedUserServiceMock.setUser(AuthUser.NOT_CONNECTED);
            await userDAO.update(opponentId, { currentGame: { id: '1234', typeGame: 'P4' } });

            // When disconnected user logs in
            ConnectedUserServiceMock.setUser(UserMocks.OPPONENT_AUTH_USER);
            tick(0);

            // Then the service now has an observed part
            expect((await currentGameService.getCurrentGame()).isPresent()).toBeTrue();
        }));
        it('should keep observing users even when they are not logged in yet', fakeAsync(async() => {
            // This caused the infamous "part creation after login" bug
            // Given an observed part service with a disconnected user
            ConnectedUserServiceMock.setUser(AuthUser.NOT_CONNECTED);
            let currentGameSeen: boolean = false;
            const subscription: Subscription =
                currentGameService.subscribeToCurrentGame((value: MGPOptional<CurrentGame>) => {
                    currentGameSeen = value.isPresent();
                });

            // When the user logs in and sets an observed part
            ConnectedUserServiceMock.setUser(UserMocks.CONNECTED_AUTH_USER);
            tick(0);
            await userDAO.update(UserMocks.CONNECTED_AUTH_USER.id, { currentGame: { id: '1234', typeGame: 'P4' } });

            // Then the service should know about it
            expect(currentGameSeen).toBeTrue();

            subscription.unsubscribe();
        }));

    });
    describe('observed part', () => {
        it('should update currentGame observable when UserDAO touches it', fakeAsync(async() => {
            // Given a connected user
            ConnectedUserServiceMock.setUser(UserMocks.OPPONENT_AUTH_USER);
            tick(0);
            // and the currentGame observable
            let resolvePromise: () => void;
            const userHasUpdated: Promise<void> = new Promise((resolve: () => void) => {
                resolvePromise = resolve;
            });
            let lastValue: MGPOptional<CurrentGame> = MGPOptional.empty();
            const subscription: Subscription =
                currentGameService.subscribeToCurrentGame((currentGame: MGPOptional<CurrentGame>) => {
                    lastValue = currentGame;
                    resolvePromise();
                });
            // When the UserDAO modifies currentGame in the user document
            await userDAO.update(opponentId, { currentGame: { id: '1234', typeGame: 'P4' } });
            await userHasUpdated;

            // Then the observable should have updated its value
            expect(lastValue).toEqual(MGPOptional.of({ id: '1234', typeGame: 'P4' }));
            subscription.unsubscribe();
        }));
        describe('updateCurrentGame', () => {
            it('should throw when called whilst no user is logged', fakeAsync(async() => {
                // Given a moment at which service is not observing any user (not even AuthUser.NOT_CONNECTED)
                spyOn(Utils, 'logError').and.callFake(ErrorLoggerServiceMock.logError);
                const expectedError: string = 'Assertion failure: Should not call updateCurrentGame when not connected';

                // When calling updateCurrentGame
                // Then it should throw
                expect(() => currentGameService.updateCurrentGame({ id: 'some-part-doc-id' })).toThrowError(expectedError);
            }));
            it('should delegate to userDAO', fakeAsync(async() => {
                // Given a service observing an user
                ConnectedUserServiceMock.setUser(UserMocks.CREATOR_AUTH_USER);

                // When asking to update currentGame
                spyOn(userDAO, 'update').and.resolveTo();
                const currentGame: CurrentGame = CurrentGameMocks.CREATOR_WITHOUT_OPPONENT;
                await currentGameService.updateCurrentGame(currentGame);

                // Then the userDAO should update the connected user doc
                expect(userDAO.update).toHaveBeenCalledOnceWith(UserMocks.CREATOR_MINIMAL_USER.id, { currentGame });
            }));
            it('should merge old currentGame to new when the old is present', fakeAsync(async() => {
                // Given a service that has an old currentGame
                ConnectedUserServiceMock.setUser(UserMocks.CREATOR_AUTH_USER);
                tick(0);
                const oldValue: CurrentGame = {
                    id: 'old',
                    role: 'Candidate',
                    typeGame: 'old',
                };
                await currentGameService.updateCurrentGame(oldValue);

                // When updating it with another value
                spyOn(userDAO, 'update').and.resolveTo();
                const newValue: Partial<CurrentGame> = {
                    id: 'new',
                };
                await currentGameService.updateCurrentGame(newValue);

                // Then all value from the update should be there, and the one not mentionned should be from the old one
                const currentGame: CurrentGame = {
                    id: 'new',
                    role: 'Candidate',
                    typeGame: 'old',
                };
                expect(userDAO.update).toHaveBeenCalledOnceWith(UserMocks.CREATOR_AUTH_USER.id, { currentGame });
            }));
            it('should throw if currentGame update is incomplete when old observed part is absent (and role missing)', fakeAsync(async() => {
                // Given a service observing an user
                ConnectedUserServiceMock.setUser(UserMocks.CREATOR_AUTH_USER);

                // When updating with only one field the part
                spyOn(Utils, 'logError').and.callFake(ErrorLoggerServiceMock.logError);
                const expectedError: string = 'Assertion failure: field role should be set before updating currentGame';

                // Then the userDAO should update the connected user doc
                const updatedPart: Partial<CurrentGame> = {
                    id: 'another-id',
                    typeGame: 'whatever',
                };
                expect(() => currentGameService.updateCurrentGame(updatedPart)).toThrowError(expectedError);
            }));
            it('should throw if currentGame update is incomplete when old observed part is absent (and typeGame missing)', fakeAsync(async() => {
                // Given a service observing an user
                ConnectedUserServiceMock.setUser(UserMocks.CREATOR_AUTH_USER);

                // When updating with only one field the part
                spyOn(Utils, 'logError').and.callFake(ErrorLoggerServiceMock.logError);
                const expectedError: string = 'Assertion failure: field typeGame should be set before updating currentGame';

                // Then it should throw
                const updatedPart: Partial<CurrentGame> = {
                    id: 'another-id',
                    role: 'Candidate',
                };
                expect(() => currentGameService.updateCurrentGame(updatedPart)).toThrowError(expectedError);
            }));

        });
        describe('removeCurrentGame', () => {
            it('should throw when asking to remove whilst no user is logged', fakeAsync(async() => {
                // Given a moment at which service is not observing any user (not even AuthUser.NOT_CONNECTED)
                spyOn(Utils, 'logError').and.callFake(ErrorLoggerServiceMock.logError);
                const expectedError: string = 'Assertion failure: Should not call removeCurrentGame when not connected';

                // When calling updateCurrentGame
                // Then it should throw
                expect(() => currentGameService.removeCurrentGame()).toThrowError(expectedError);
            }));
            it('should delegate removal to userDAO', fakeAsync(async() => {
                // Given a service observing an user
                ConnectedUserServiceMock.setUser(UserMocks.CREATOR_AUTH_USER);

                // When asking to update currentGame
                spyOn(userDAO, 'update').and.resolveTo();
                await currentGameService.removeCurrentGame();

                // Then the userDAO should update the connected user doc
                expect(userDAO.update).toHaveBeenCalledOnceWith(UserMocks.CREATOR_MINIMAL_USER.id,
                                                                { currentGame: null });
            }));

        });
    });
    describe('canUserCreate', () => {
        beforeEach(() => {
            // Given a service observing a player
            ConnectedUserServiceMock.setUser(UserMocks.OPPONENT_AUTH_USER);
        });
        it('should return SUCCESS if user do not observe any part', fakeAsync(async() => {
            // Given a ConnectedUserService where user don't observe any part

            // When asking if you can create
            const validation: MGPValidation = currentGameService.canUserCreate();

            // Then it's should be authorized
            expect(validation.isSuccess()).toBeTrue();
        }));
        it('should refuse for a player already playing', fakeAsync(async() => {
            // Given a ConnectedUserService where user observe a part
            await userDAO.update(opponentId, { currentGame: { id: '1234', typeGame: 'P4', role: 'Player' } });

            // When asking if you can create
            const validation: MGPValidation = currentGameService.canUserCreate();

            // Then it's should be refused
            expect(validation.getReason()).toBe(GameActionFailure.YOU_ARE_ALREADY_PLAYING());
        }));
        it('should refuse for a player already creator', fakeAsync(async() => { // UNSTABLE: last failed 2022-08-18
            // Given a ConnectedUserService where user observe a part
            await userDAO.update(opponentId, { currentGame: { id: '1234', typeGame: 'P4', role: 'Creator' } });

            // When asking if you can create
            const validation: MGPValidation = currentGameService.canUserCreate();

            // Then it's should be refused
            expect(validation.getReason()).toBe(GameActionFailure.YOU_ARE_ALREADY_CREATING());
        }));
        it('should refuse for a player already candidate', fakeAsync(async() => {
            // Given a ConnectedUserService where user observe a part
            await userDAO.update(opponentId, { currentGame: { id: '1234', typeGame: 'P4', role: 'Candidate' } });

            // When asking if you can create
            const validation: MGPValidation = currentGameService.canUserCreate();

            // Then it's should be refused
            expect(validation.getReason()).toBe(GameActionFailure.YOU_ARE_ALREADY_CANDIDATE());
        }));
        it('should refuse for a player already Chosen Opponent', fakeAsync(async() => {
            // Given a ConnectedUserService where user observe a part
            await userDAO.update(opponentId, { currentGame: { id: '1234', typeGame: 'P4', role: 'ChosenOpponent' } });

            // When asking if you can create
            const validation: MGPValidation = currentGameService.canUserCreate();

            // Then it's should be refused
            expect(validation.getReason()).toBe(GameActionFailure.YOU_ARE_ALREADY_CHOSEN_OPPONENT());
        }));
        it('should refuse for a player already Observer', fakeAsync(async() => {
            // Given a ConnectedUserService where user observe a part
            await userDAO.update(opponentId, { currentGame: { id: '1234', typeGame: 'P4', role: 'Observer' } });

            // When asking if you can join some part
            const validation: MGPValidation = currentGameService.canUserCreate();

            // Then it's should be refused
            expect(validation.getReason()).toBe(GameActionFailure.YOU_ARE_ALREADY_OBSERVING());
        }));

    });
    describe('canUserJoin', () => {

        async function shouldAllowJoinPart(currentGame: CurrentGame, partToJoin: string, gameStarted: boolean)
        : Promise<void>
        {
            await userDAO.update(opponentId, { currentGame });

            // When asking if you can join that specific part again
            const validation: MGPValidation = currentGameService.canUserJoin(partToJoin, gameStarted);

            // Then it's should be authorized
            expect(validation.isSuccess())
                .withContext('validation should be a success')
                .toBeTrue();
        }
        async function shouldForbidJoinPart(currentGame: CurrentGame,
                                            partToJoin: string,
                                            gameStarted: boolean,
                                            reason: string)
        : Promise<void>
        {
            await userDAO.update(opponentId, { currentGame });

            // When asking if you can join that specific part again
            const validation: MGPValidation = currentGameService.canUserJoin(partToJoin, gameStarted);

            // Then it's should be refused
            expect(validation.getReason()).toBe(reason);
        }
        beforeEach(() => {
            // Given a service observing a player
            ConnectedUserServiceMock.setUser(UserMocks.OPPONENT_AUTH_USER);
        });
        it('should allow user to join started part when user do not observe any part', fakeAsync(async() => {
            // Given a ConnectedUserService where user observe don't observe a part
            ConnectedUserServiceMock.setUser(UserMocks.OPPONENT_AUTH_USER);

            // When asking if you can join that specific part again
            const validation: MGPValidation = currentGameService.canUserJoin('some-id', true);

            // Then it's should be authorized
            expect(validation.isSuccess()).toBeTrue();
        }));
        it('should allow user to join unstarted part when user do not observe any part', fakeAsync(async() => {
            // Given a ConnectedUserService where user don't observe a part
            ConnectedUserServiceMock.setUser(UserMocks.OPPONENT_AUTH_USER);

            // When asking if you can join that specific part again
            const validation: MGPValidation = currentGameService.canUserJoin('some-id', false);

            // Then it's should be authorized
            expect(validation.isSuccess()).toBeTrue();
        }));
        it('should allow user to join twice the same part', fakeAsync(async() => {
            // Given a ConnectedUserService where user observe a part
            // When asking if you can join that specific part again
            const currentGame: CurrentGame = { id: '1234', typeGame: 'P4', role: 'Player' };
            await shouldAllowJoinPart(currentGame, '1234', true);
        }));
        it('should refuse for a player already playing', fakeAsync(async() => {
            // Given a ConnectedUserService where user plays a part
            const currentGame: CurrentGame = { id: '1234', typeGame: 'P4', role: 'Player' };
            const reason: string = GameActionFailure.YOU_ARE_ALREADY_PLAYING();

            // When asking if you can join some started part
            await shouldForbidJoinPart(currentGame, 'some-id', true, reason);

            // When asking if you can join some unstarted part
            await shouldForbidJoinPart(currentGame, 'some-id', false, reason);
        }));
        it('should refuse for a player already creator', fakeAsync(async() => {
            // Given a ConnectedUserService where user is creating a part
            const currentGame: CurrentGame = { id: '1234', typeGame: 'P4', role: 'Creator' };
            const reason: string = GameActionFailure.YOU_ARE_ALREADY_CREATING();

            // When asking if you can join some started part
            await shouldForbidJoinPart(currentGame, 'some-id', true, reason);

            // When asking if you can join some unstarted part
            await shouldForbidJoinPart(currentGame, 'some-id', false, reason);
        }));
        it('should refuse for a player already candidate', fakeAsync(async() => { // Instable: last failed 2022-08-18
            // Given a ConnectedUserService where user is candidate of a part
            const currentGame: CurrentGame = { id: '1234', typeGame: 'P4', role: 'Candidate' };
            const reason: string = GameActionFailure.YOU_ARE_ALREADY_CANDIDATE();

            // When asking if you can join some started part
            await shouldForbidJoinPart(currentGame, 'some-id', true, reason);

            // When asking if you can join some unstarted part
            await shouldForbidJoinPart(currentGame, 'some-id', false, reason);
        }));
        it('should refuse for a player already Chosen Opponent', fakeAsync(async() => {
            // Given a ConnectedUserService where user is chosen opponent in a part
            const currentGame: CurrentGame = { id: '1234', typeGame: 'P4', role: 'ChosenOpponent' };
            const reason: string = GameActionFailure.YOU_ARE_ALREADY_CHOSEN_OPPONENT();

            // When asking if you can join some started part
            await shouldForbidJoinPart(currentGame, 'some-id', true, reason);

            // When asking if you can join some unstarted part
            await shouldForbidJoinPart(currentGame, 'some-id', false, reason);
        }));
        it('should refuse for a player already Observer to join non-started part', fakeAsync(async() => {
            // Given a ConnectedUserService where user observe a part
            const currentGame: CurrentGame = { id: '1234', typeGame: 'P4', role: 'Observer' };
            const reason: string = GameActionFailure.YOU_ARE_ALREADY_OBSERVING();

            // When asking if you can join some unstarted part
            await shouldForbidJoinPart(currentGame, 'some-id', false, reason);
        }));
        it('should allow for a player already Observer to join a started part', fakeAsync(async() => {
            // Given a ConnectedUserService where user observe a part
            const currentGame: CurrentGame = { id: '1234', typeGame: 'P4', role: 'Observer' };

            // When asking if you can join some started part
            await shouldAllowJoinPart(currentGame, 'some-id', true);
        }));

    });
    describe('unsubscriptions', () => {
        it('should unsubscribe from userService when destroying service', fakeAsync(async() => {
            // Given a service on which user is logged in
            ConnectedUserServiceMock.setUser(UserMocks.CONNECTED_AUTH_USER);
            const expectUnsubscribeToHaveBeenCalled: () => void = prepareUnsubscribeCheck(userService, 'observeUserOnServer');
            // Since the subscription is done in the constructor, we need to spy it before
            currentGameService = new CurrentGameService(userDAO, userService, connectedUserService);

            // When the service is destroyed
            currentGameService.ngOnDestroy();
            alreadyDestroyed = true;

            // Then it should have unsubscribed from active users
            expectUnsubscribeToHaveBeenCalled();
        }));
        it('should unsubscribe from connectedUserService when destroying service', fakeAsync(async() => {
            // Given a service
            const expectUnsubscribeToHaveBeenCalled: () => void = prepareUnsubscribeCheck(connectedUserService, 'subscribeToUser');
            // Since the subscription is done in the constructor, we need to spy it before
            currentGameService = new CurrentGameService(userDAO, userService, connectedUserService);

            // When the service is destroyed
            currentGameService.ngOnDestroy();
            alreadyDestroyed = true;

            // Then it should have unsubscribed from active users
            expectUnsubscribeToHaveBeenCalled();
        }));

    });

    afterEach(async() => {
        if (alreadyDestroyed === false) {
            currentGameService.ngOnDestroy();
        }
    });

});
