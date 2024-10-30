/* eslint-disable max-lines-per-function */
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { DebugElement } from '@angular/core';
import { Subscription } from 'rxjs';
import { ActivePartsService } from 'src/app/services/ActivePartsService';
import { GameActionFailure } from 'src/app/services/ConnectedUserService';
import { ConnectedUserServiceMock } from 'src/app/services/tests/ConnectedUserService.spec';
import { expectValidRouting, prepareUnsubscribeCheck, SimpleComponentTestUtils } from 'src/app/utils/tests/TestUtils.spec';
import { MGPOptional, MGPValidation } from '@everyboard/lib';
import { PartMocks } from 'src/app/domain/PartMocks.spec';
import { PartDocument } from 'src/app/domain/Part';
import { UserMocks } from 'src/app/domain/UserMocks.spec';
import { LobbyComponent } from './lobby.component';
import { OnlineGameWrapperComponent } from '../../wrapper-components/online-game-wrapper/online-game-wrapper.component';
import { CurrentGameService } from 'src/app/services/CurrentGameService';
import { CurrentGameServiceMock } from 'src/app/services/tests/CurrentGameService.spec';

describe('LobbyComponent', () => {

    let testUtils: SimpleComponentTestUtils<LobbyComponent>;
    let component: LobbyComponent;
    let router: Router;

    beforeEach(fakeAsync(async() => {
        testUtils = await SimpleComponentTestUtils.create(LobbyComponent);
        ConnectedUserServiceMock.setUser(UserMocks.CREATOR_AUTH_USER);
        component = testUtils.getComponent();
        router = TestBed.inject(Router);
        spyOn(router, 'navigate').and.resolveTo();
    }));

    it('should create', fakeAsync(async() => {
        expect(component).toBeDefined();
        component.ngOnInit();
    }));

    describe('tab-create element', () => {

        it('should display online-game-selection component when clicking on it when allowed by connectedUserService', fakeAsync(async() => {
            // Given a server page
            testUtils.detectChanges();
            // where you are allowed by currentGameService
            const currentGameService: CurrentGameService = TestBed.inject(CurrentGameService);
            spyOn(currentGameService, 'canUserCreate').and.returnValue(MGPValidation.SUCCESS);

            // When clicking on the 'create game' tab
            await testUtils.clickElement('#tab-create');

            // Then online-game-selection component should be on the page
            testUtils.expectElementToExist('#online-game-selection');
        }));

        it('should refuse to change page when clicking on it while not allowed by connectedUserService, and toast the reason', fakeAsync(async() => {
            // Given a server page
            testUtils.detectChanges();
            // where you are forbidden by connectedUserService
            const currentGameService: CurrentGameService = TestBed.inject(CurrentGameService);
            const error: string = `Si je dit non, c'est non!!!`;
            spyOn(currentGameService, 'canUserCreate').and.returnValue(MGPValidation.failure(error));

            // When clicking on the 'create game' tab
            // Then online-game-selection component should not be visible and an error should be toasted
            await testUtils.expectToDisplayCriticalMessage(error, async() => {
                await testUtils.clickElement('#tab-create');
            });

            testUtils.expectElementNotToExist('#online-game-selection');
        }));

    });

    function setLobbyPartList(list: PartDocument[]): void {
        const activePartsService: ActivePartsService = TestBed.inject(ActivePartsService);
        spyOn(activePartsService, 'subscribeToActiveParts')
            .and.callFake((callback: (parts: PartDocument[]) => void) => {
                callback(list);
                return new Subscription();
            });
    }

    async function shouldAllowJoinPart(partList: PartDocument[]): Promise<void> {
        // Given a server with the given partList
        setLobbyPartList(partList);
        testUtils.detectChanges();

        // When clicking on the first part
        await testUtils.clickElement('#part-0');

        // Then the component should have navigate to the part
        expectValidRouting(router, ['/play', 'Quarto', partList[0].id], OnlineGameWrapperComponent);
    }

    async function shouldForbidToJoinPart(partList: PartDocument[], reason: string): Promise<void> {
        setLobbyPartList(partList);
        testUtils.detectChanges();

        // When clicking on the part
        // Then the refusal reason should be given
        await testUtils.expectToDisplayCriticalMessage(reason, async() => {
            await testUtils.clickElement('#part-0');
        });
    }

    describe('clicking on a started game', () => {

        let unstartedPartUserCreated: PartDocument;
        let unstartedPartUserDidNotCreate: PartDocument;
        let anotherUnstartedPartUserDidNotCreate: PartDocument;

        let startedPartUserPlay: PartDocument;
        let startedPartUserDoNotPlay: PartDocument;
        let anotherStartedPartUserDoNotPlay: PartDocument;

        beforeEach(fakeAsync(async() => {
            // Unstarted
            unstartedPartUserCreated = new PartDocument('I-create', PartMocks.INITIAL);
            unstartedPartUserDidNotCreate = new PartDocument('I-did-not-create', PartMocks.OTHER_UNSTARTED);
            anotherUnstartedPartUserDidNotCreate = new PartDocument('me-no-create-either', PartMocks.OTHER_UNSTARTED);

            // Started
            startedPartUserPlay = new PartDocument('I-play', PartMocks.STARTED);
            startedPartUserDoNotPlay = new PartDocument('I-do-not-play', PartMocks.OTHER_STARTED);
            anotherStartedPartUserDoNotPlay = new PartDocument('me-no-play-either', PartMocks.OTHER_STARTED);
        }));

        describe('as a user participating to no games', () => {

            beforeEach(() => {
                // Given an user not part of any part
                CurrentGameServiceMock.setCurrentGame(MGPOptional.empty());
            });

            it('should redirect to /play', fakeAsync(async() => {
                // And a server with one active part
                await shouldAllowJoinPart([startedPartUserDoNotPlay]);
            }));

        });

        describe('as a player', () => {

            beforeEach(() => {
                // Given an user observing a part as a Player
                CurrentGameServiceMock.setCurrentGame(MGPOptional.of({
                    id: startedPartUserPlay.id,
                    role: 'Player',
                    typeGame: 'P4',
                }));
            });

            it('should forbid user to join another game', fakeAsync(async() => {
                // And a lobby where the a part user do not play is present
                const reason: string = GameActionFailure.YOU_ARE_ALREADY_PLAYING();
                await shouldForbidToJoinPart([startedPartUserDoNotPlay], reason);
            }));

            it('should allow users to play their games from several tabs', fakeAsync(async() => {
                // And a lobby where the part player plays is present
                await shouldAllowJoinPart([startedPartUserPlay]);
            }));

        });

        describe('as an observer', () => {

            beforeEach(() => {
                // Given an user observing a part as an Observer
                CurrentGameServiceMock.setCurrentGame(MGPOptional.of({
                    id: startedPartUserDoNotPlay.id,
                    role: 'Observer',
                    typeGame: 'P4',
                }));
            });

            it('should allow to observe a second part', fakeAsync(async() => {
                // And a lobby where another started part that user do not play is present
                await shouldAllowJoinPart([anotherStartedPartUserDoNotPlay]);
            }));

            it('should allow to observe twice the same part', fakeAsync(async() => {
                // Given a lobby where the connected user is already the observer in this part
                await shouldAllowJoinPart([startedPartUserDoNotPlay]);
            }));

        });

        describe('as a creator', () => {

            beforeEach(() => {
                // Given an user observing a part as a Creator
                CurrentGameServiceMock.setCurrentGame(MGPOptional.of({
                    id: unstartedPartUserCreated.id,
                    role: 'Creator',
                    typeGame: 'P4',
                }));
            });

            it('should forbid user to observe game while creating another one', fakeAsync(async() => {
                // And a lobby where another started part that user do not play is present
                const reason: string = GameActionFailure.YOU_ARE_ALREADY_CREATING();
                await shouldForbidToJoinPart([startedPartUserDoNotPlay], reason);
            }));

        });

        describe('as a candidate', () => {

            beforeEach(() => {
                // Given an user observing a part as a Candidate
                CurrentGameServiceMock.setCurrentGame(MGPOptional.of({
                    id: unstartedPartUserDidNotCreate.id,
                    role: 'Candidate',
                    typeGame: 'P4',
                }));
            });

            it('should forbid user to observe game while candidate in another one', fakeAsync((async() => {
                // And a lobby where another unstarted part not linked to user is present
                const reason: string = GameActionFailure.YOU_ARE_ALREADY_CANDIDATE();
                await shouldForbidToJoinPart([anotherUnstartedPartUserDidNotCreate], reason);
            })));

        });

        describe('as chosen opponent', () => {

            beforeEach(() => {
                // Given an user observing a part as a Candidate
                CurrentGameServiceMock.setCurrentGame(MGPOptional.of({
                    id: unstartedPartUserDidNotCreate.id,
                    role: 'ChosenOpponent',
                    typeGame: 'P4',
                }));
            });

            it('should forbid user to observe game while chosen opponent in another one', fakeAsync((async() => {
                // And a lobby where another unstarted part not linked to user is present
                const reason: string = GameActionFailure.YOU_ARE_ALREADY_CHOSEN_OPPONENT();
                await shouldForbidToJoinPart([anotherUnstartedPartUserDidNotCreate], reason);
            })));

        });

    });

    describe('clicking on a unstarted game', () => {

        let unstartedPartUserCreated: PartDocument;
        let startedPartUserPlay: PartDocument;
        let unstartedPartUserDidNotCreate: PartDocument;
        let anotherUnstartedPartUserDidNotCreate: PartDocument;

        beforeEach(fakeAsync(async() => {
            unstartedPartUserCreated = new PartDocument('the-part-I-create', PartMocks.INITIAL);
            startedPartUserPlay = new PartDocument('the-part-I-created', PartMocks.STARTED);
            unstartedPartUserDidNotCreate = new PartDocument('a-part-I-do-not-create', PartMocks.OTHER_STARTED);
            anotherUnstartedPartUserDidNotCreate = new PartDocument('another-part-user-did-not-createru', PartMocks.OTHER_STARTED);
        }));

        describe('as a user part of no games', () => {

            beforeEach(() => {
                // Given an user not part of any part
                CurrentGameServiceMock.setCurrentGame(MGPOptional.empty());
            });

            it('should redirect to /play', fakeAsync(async() => {
                // And a server with one active part
                await shouldAllowJoinPart([unstartedPartUserDidNotCreate]);
            }));

        });

        describe('as a player', () => {

            beforeEach(() => {
                // Given an user already playing a part
                CurrentGameServiceMock.setCurrentGame(MGPOptional.of({
                    id: startedPartUserPlay.id,
                    role: 'Player',
                    typeGame: 'P4',
                }));
            });

            it('should forbid user to become candidate while already playing another game', fakeAsync(async() => {
                // And a lobby where the connected user is already the Player in one part
                const reason: string = GameActionFailure.YOU_ARE_ALREADY_PLAYING();
                await shouldForbidToJoinPart([unstartedPartUserDidNotCreate], reason);
            }));

        });

        describe('as a creator', () => {

            beforeEach(() => {
                // Given an user already creator of a part
                CurrentGameServiceMock.setCurrentGame(MGPOptional.of({
                    id: unstartedPartUserCreated.id,
                    role: 'Creator',
                    typeGame: 'P4',
                }));
            });

            it('should forbid user to be candidate while already creating another game', fakeAsync(async() => {
                // And a lobby where another unstarted part not linked to user is present
                const reason: string = GameActionFailure.YOU_ARE_ALREADY_CREATING();
                await shouldForbidToJoinPart([unstartedPartUserDidNotCreate], reason);
            }));

            it('should allow user to have their created part in two tabs', fakeAsync(async() => {
                // And a lobby where the same part is obviously already
                await shouldAllowJoinPart([unstartedPartUserCreated]);
            }));

        });

        describe('as a chosen opponent', () => {

            beforeEach(() => {
                // Given an user observing a part as a chosen opponent
                CurrentGameServiceMock.setCurrentGame(MGPOptional.of({
                    id: unstartedPartUserDidNotCreate.id,
                    role: 'ChosenOpponent',
                    typeGame: 'P4',
                }));
            });

            it('should forbid user to be candidate while already chosen opponent in another game', fakeAsync(async() => {
                // Given a lobby where the connected user is already the chosen opponent in one part
                const reason: string = GameActionFailure.YOU_ARE_ALREADY_CHOSEN_OPPONENT();
                await shouldForbidToJoinPart([anotherUnstartedPartUserDidNotCreate], reason);
            }));

            it('should allow user to be candidate of the same part in several tabs', fakeAsync(async() => {
                // And a lobby where the same part is obviously already
                await shouldAllowJoinPart([unstartedPartUserDidNotCreate]);
            }));

        });

        describe('as a candidate', () => {

            beforeEach(() => {
                // Given an user observing a part as a Candidate
                CurrentGameServiceMock.setCurrentGame(MGPOptional.of({
                    id: unstartedPartUserDidNotCreate.id,
                    role: 'Candidate',
                    typeGame: 'P4',
                }));
            });

            it('should forbid user to be candidate in two part as once', fakeAsync(async() => {
                // Given a lobby where the connected user is already the candidate in one part
                const reason: string = GameActionFailure.YOU_ARE_ALREADY_CANDIDATE();
                await shouldForbidToJoinPart([anotherUnstartedPartUserDidNotCreate], reason);
            }));

            it('should allow user to have be candidate of the same part in two tabs', fakeAsync(async() => {
                // And a lobby where the same part is obviously already
                await shouldAllowJoinPart([unstartedPartUserDidNotCreate]);
            }));

        });

    });

    it('should unsubscribe from active parts when destroying component', fakeAsync(async() => {
        // Given the lobby
        const expectUnsubscribeToHaveBeenCalled: () => void =
            prepareUnsubscribeCheck(TestBed.inject(ActivePartsService), 'subscribeToActiveParts');
        testUtils.detectChanges();

        // When it is destroyed
        component.ngOnDestroy();

        // Then it should have unsubscribed from active parts
        expectUnsubscribeToHaveBeenCalled();
    }));

    it('should unsubscribe from observed part when destroying component', fakeAsync(async() => {
        // Given an initialized lobby
        const expectUnsubscribeToHaveBeenCalled: () => void =
            prepareUnsubscribeCheck(TestBed.inject(CurrentGameService), 'subscribeToCurrentGame');
        testUtils.detectChanges();

        // When it is destroyed
        component.ngOnDestroy();

        // Then it should have unsubscribed from active users
        expectUnsubscribeToHaveBeenCalled();
    }));

    it('should display turn for humans', fakeAsync(async() => {
        // Given a server with an existing part
        setLobbyPartList([new PartDocument('started', PartMocks.STARTED)]);

        // When displaying it
        testUtils.detectChanges();

        // Then it should show the turn, starting at turn 0 instead of -1
        testUtils.expectElementToExist('#part-0 > .data-turn');
        const turn: DebugElement = testUtils.findElement('#part-0 > .data-turn');
        expect(turn.nativeElement.innerText).toEqual('1');
    }));

    it('should display game name for humans', fakeAsync(async() => {
        // Given a server with an existing part
        setLobbyPartList([new PartDocument('started', {
            ...PartMocks.STARTED,
            typeGame: 'P4', // A game whose name is different from their URL name
        })]);

        // When displaying it
        testUtils.detectChanges();

        // Then it should show the turn, starting at turn 0 instead of -1
        testUtils.expectElementToExist('#part-0 > .data-turn');
        const gameName: DebugElement = testUtils.findElement('#part-0 > .data-game-name');
        expect(gameName.nativeElement.innerText).toEqual('Four in a Row');
    }));

    it('should display creator elo has a floor version', fakeAsync(async() => {
        // Given a server with an existing part
        setLobbyPartList([new PartDocument('started', {
            ...PartMocks.STARTED,
            typeGame: 'P4', // A game whose name is different from their URL name
            playerZeroElo: 12.67865,
        })]);

        // When displaying it
        testUtils.detectChanges();

        // Then it should show the turn, starting at turn 0 instead of -1
        const gameName: DebugElement = testUtils.findElement('#part-of-creator');
        expect(gameName.nativeElement.innerText).toEqual('creator (12)');
    }));

    it('should show the chat when clicking on the corresponding tab', fakeAsync(async() => {
        // Given a lobby

        // When clicking on the chat tab
        await testUtils.clickElement('#tab-chat');
        tick(0);
        testUtils.detectChanges();

        // Then it should show the chat
        testUtils.expectElementToExist('#chat');
    }));

});
