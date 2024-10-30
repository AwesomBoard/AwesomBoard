/* eslint-disable max-lines-per-function */
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { DebugElement } from '@angular/core';
import { Router } from '@angular/router';
import { Timestamp } from 'firebase/firestore';

import { PartCreationComponent } from './part-creation.component';
import { LobbyComponent } from '../../normal-component/lobby/lobby.component';

import { ConfigRoomService, ConfigRoomServiceFailure } from 'src/app/services/ConfigRoomService';
import { GameService } from 'src/app/services/GameService';
import { ErrorLoggerServiceMock } from 'src/app/services/tests/ErrorLoggerServiceMock.spec';
import { AuthUser, ConnectedUserService } from 'src/app/services/ConnectedUserService';
import { ConnectedUserServiceMock } from 'src/app/services/tests/ConnectedUserService.spec';

import { ConfigRoomDAO } from 'src/app/dao/ConfigRoomDAO';
import { PartDAO } from 'src/app/dao/PartDAO';
import { ChatDAO } from 'src/app/dao/ChatDAO';
import { UserDAO } from 'src/app/dao/UserDAO';

import { ActivatedRouteStub, expectValidRouting, prepareUnsubscribeCheck, SimpleComponentTestUtils } from 'src/app/utils/tests/TestUtils.spec';
import { MGPOptional, Utils } from '@everyboard/lib';

import { ConfigRoomMocks } from 'src/app/domain/ConfigRoomMocks.spec';
import { FirstPlayer, PartStatus, PartType, ConfigRoom } from 'src/app/domain/ConfigRoom';
import { Part } from 'src/app/domain/Part';
import { PartMocks } from 'src/app/domain/PartMocks.spec';
import { CurrentGame } from 'src/app/domain/User';
import { CurrentGameMocks } from 'src/app/domain/mocks/CurrentGameMocks.spec';
import { UserMocks } from 'src/app/domain/UserMocks.spec';
import { FirestoreTime } from 'src/app/domain/Time';
import { UserService } from 'src/app/services/UserService';
import { CurrentGameService } from 'src/app/services/CurrentGameService';
import { addCandidate } from '../online-game-wrapper/online-game-wrapper.quarto.component.spec';
import { LocalGameWrapperComponent } from '../local-game-wrapper/local-game-wrapper.component';

describe('PartCreationComponent', () => {

    let testUtils: SimpleComponentTestUtils<PartCreationComponent>;
    let component: PartCreationComponent;

    let configRoomDAO: ConfigRoomDAO;
    let partDAO: PartDAO;
    let userDAO: UserDAO;
    let chatDAO: ChatDAO;
    let userService: UserService;
    let configRoomService: ConfigRoomService;
    let gameService: GameService;
    let connectedUserService: ConnectedUserService;
    let currentGameService: CurrentGameService;

    let destroyed: boolean;

    async function mockCandidateArrival(lastUpdateTime?: Timestamp): Promise<void> {
        if (lastUpdateTime) {
            await userDAO.update(UserMocks.OPPONENT_MINIMAL_USER.id, { lastUpdateTime });
        }
        return addCandidate(UserMocks.OPPONENT_MINIMAL_USER);
    }
    async function receiveConfigRoomUpdate(update: Partial<ConfigRoom>): Promise<void> {
        // As we are mocking the DAO, we can directly change the config room ourselves
        // In practice, we should receive this from the other player.
        await configRoomDAO.update('configRoomId', update);
        tick(0);
    }
    async function proposeConfig(): Promise<void> {
        await clickElement('#proposeConfig');
    }
    async function chooseOpponent(): Promise<void> {
        await clickElement('#presenceOf_' + UserMocks.OPPONENT.username);
    }
    function awaitComponentInitialization(): void {
        // Once tick is executed, ngOnInit of the PartCreationComponent is normally over
        testUtils.detectChanges();
        tick(0);
    }
    async function clickElement(elementName: string): Promise<void> {
        // [W] [medium] PartCreationComponent & TestUtils refactor
        testUtils.detectChanges();
        await testUtils.clickElement(elementName);
    }
    function expectElementToExist(elementName: string): void {
        // [W] [medium] PartCreationComponent & TestUtils refactor
        testUtils.detectChanges();
        testUtils.expectElementToExist(elementName);
    }
    function expectElementNotToExist(elementName: string): void {
        // [W] [medium] PartCreationComponent & TestUtils refactor
        testUtils.detectChanges();
        testUtils.expectElementNotToExist(elementName);
    }
    function findElement(elementName: string): DebugElement {
        // [W] [medium] PartCreationComponent & TestUtils refactor
        testUtils.detectChanges();
        return testUtils.findElement(elementName);
    }
    function expectElementToHaveClass(elementName: string, classes: string): void {
        // [W] [medium] PartCreationComponent & TestUtils refactor
        testUtils.detectChanges();
        testUtils.expectElementToHaveClass(elementName, classes);
    }
    beforeEach(fakeAsync(async() => {
        testUtils = await SimpleComponentTestUtils.create(PartCreationComponent, new ActivatedRouteStub('P4'));
        destroyed = false;
        chatDAO = TestBed.inject(ChatDAO);
        partDAO = TestBed.inject(PartDAO);
        configRoomDAO = TestBed.inject(ConfigRoomDAO);
        userDAO = TestBed.inject(UserDAO);
        userService = TestBed.inject(UserService);
        configRoomService = TestBed.inject(ConfigRoomService);
        gameService = TestBed.inject(GameService);
        connectedUserService = TestBed.inject(ConnectedUserService);
        currentGameService = TestBed.inject(CurrentGameService);
        component = testUtils.getComponent();
        component.partId = 'configRoomId';
        component.rulesConfigDescription = MGPOptional.empty();
        await chatDAO.set('configRoomId', { messages: [], status: 'dummy status' });
        await userDAO.set(UserMocks.CREATOR_AUTH_USER.id, UserMocks.CREATOR);
        await userDAO.set(UserMocks.OPPONENT_AUTH_USER.id, UserMocks.OPPONENT);
        await partDAO.set('configRoomId', PartMocks.INITIAL);
    }));

    describe('For creator', () => {
        beforeEach(fakeAsync(async() => {
            // Given a component that is loaded by the creator
            // meaning that before clicking it, user was subscribed to themself
            ConnectedUserServiceMock.setUser(UserMocks.CREATOR_AUTH_USER);
            await configRoomDAO.set('configRoomId', ConfigRoomMocks.getInitial(MGPOptional.empty()));
        }));
        describe('Creator arrival on component', () => {
            it('should call joinGame and observe', fakeAsync(() => {
                spyOn(configRoomService, 'joinGame').and.callThrough();
                spyOn(configRoomService, 'subscribeToChanges').and.callThrough();

                // When the component is loaded
                awaitComponentInitialization();

                // Then joinGame and observe are called
                expect(configRoomService.joinGame).toHaveBeenCalledTimes(1);
                expect(configRoomService.subscribeToChanges).toHaveBeenCalledTimes(1);
                expect(component).withContext('PartCreationComponent should have been created').toBeTruthy();
                component.stopSendingPresenceTokensAndObservingUsersIfNeeded();
            }));

            it('should add currentGame to user doc', fakeAsync(() => {
                // Given a partCreation
                spyOn(currentGameService, 'updateCurrentGame').and.callFake(async() => {});

                // When the user, the creator, arrives
                awaitComponentInitialization();

                // Then currentGame in user doc should be set
                const expectedCurrentGame: CurrentGame = CurrentGameMocks.CREATOR_WITHOUT_OPPONENT;
                expect(currentGameService.updateCurrentGame).toHaveBeenCalledOnceWith(expectedCurrentGame);
                component.stopSendingPresenceTokensAndObservingUsersIfNeeded();
            }));

            it('should not start observing configRoom if part does not exist', fakeAsync(async() => {
                // Given a part that does not exist
                component.partId = 'does not exist';
                spyOn(configRoomDAO, 'read').and.resolveTo(MGPOptional.empty());
                spyOn(configRoomService, 'subscribeToChanges').and.callThrough();

                // When the component is loaded
                // Then subscribeToChange is not called and a message is displayed
                await testUtils.expectToDisplayCriticalMessage(
                    ConfigRoomServiceFailure.GAME_DOES_NOT_EXIST(),
                    async() => {
                        awaitComponentInitialization();
                    });
                expect(configRoomService.subscribeToChanges).not.toHaveBeenCalled();
            }));

            it('should have button to go to lobby and cancel game', fakeAsync(async() => {
                // Given a part creation component with no opponent
                spyOn(gameService, 'deleteGame').and.callThrough();
                const router: Router = TestBed.inject(Router);
                spyOn(router, 'navigate').and.resolveTo(true);
                awaitComponentInitialization();

                // When clicking on the "go to lobby" button
                const infoMessage: string = 'The game has been canceled!';
                await testUtils.expectToDisplayInfoMessage(infoMessage, async() => {
                    await clickElement('#go-to-lobby');
                });
                // Then it should cancel game and navigate to lobby
                expect(gameService.deleteGame).toHaveBeenCalledOnceWith('configRoomId');
                expectValidRouting(router, ['/lobby'], LobbyComponent);
            }));

            it('should have button to play against AI and cancel game', fakeAsync(async() => {
                // Given a part creation component with no opponent
                spyOn(gameService, 'deleteGame').and.callThrough();
                const router: Router = TestBed.inject(Router);
                spyOn(router, 'navigate').and.resolveTo(true);
                awaitComponentInitialization();

                // When clicking on the "play against AI" button
                const infoMessage: string = 'The game has been canceled!';
                await testUtils.expectToDisplayInfoMessage(infoMessage, async() => {
                    await clickElement('#play-against-ai');
                });
                // Then it should cancel game and navigate to local game
                expect(gameService.deleteGame).toHaveBeenCalledOnceWith('configRoomId');
                expectValidRouting(router, ['/local', 'P4'], LocalGameWrapperComponent);
            }));
        });

        describe('Candidate arrival', () => {
            it('should make candidate choice possible for creator when candidate arrives', fakeAsync(async() => {
                // Given a component that is loaded and there is no candidate
                awaitComponentInitialization();
                expectElementNotToExist('#chooseOpponent');

                // When the candidate arrives
                await mockCandidateArrival();

                // Then it is possible to choose a candidate
                expect(component.currentConfigRoom).toEqual(ConfigRoomMocks.getInitial(MGPOptional.empty()));
                expectElementToExist('#chooseOpponent');
                component.stopSendingPresenceTokensAndObservingUsersIfNeeded();
            }));
            it('should not see candidate change if it is modified', fakeAsync(async() => {
                // Given a page that has loaded, a candidate joined and has been chosen as opponent
                awaitComponentInitialization();
                await mockCandidateArrival();
                expectElementToExist('#candidate_firstCandidate');

                // When the candidate user's document changes
                const lastUpdateTime: FirestoreTime = new Timestamp(500, 0);
                await userDAO.update(UserMocks.OPPONENT_AUTH_USER.id, { lastUpdateTime });
                tick(PartCreationComponent.TOKEN_INTERVAL);

                // Then it is in the list of candidates
                expectElementToExist('#candidate_firstCandidate');
                component.stopSendingPresenceTokensAndObservingUsersIfNeeded();
            }));
        });
        describe('Candidate/chosenOpponent clean departure', () => {
            it('should go back to start when ChosenOpponent leaves', fakeAsync(async() => {
                // Given a page that has loaded, a candidate joined and has been chosen as opponent
                awaitComponentInitialization();
                await mockCandidateArrival();
                await chooseOpponent();
                expectElementToExist('#selected_' + UserMocks.OPPONENT.username);

                // When the chosenOpponent leaves
                // and a toast to warn creator appears
                spyOn(currentGameService, 'updateCurrentGame').and.callThrough();
                const infoMessage: string = UserMocks.OPPONENT.username + ' left the game, please pick another opponent.';
                await testUtils.expectToDisplayInfoMessage(infoMessage, async() => {
                    await receiveConfigRoomUpdate({
                        partStatus: PartStatus.PART_CREATED.value,
                        chosenOpponent: null,
                    });
                });
                await configRoomService.removeCandidate('configRoomId', UserMocks.OPPONENT_MINIMAL_USER.id);

                // Then it is not selected anymore
                expectElementNotToExist('#selected_' + UserMocks.OPPONENT.username);
                // And configRoom when back to its initial state
                expect(component.currentConfigRoom).toEqual(ConfigRoomMocks.getInitial(MGPOptional.empty()));
                // And component should update the observedPart
                expect(currentGameService.updateCurrentGame).toHaveBeenCalledOnceWith({ opponent: null });
                component.stopSendingPresenceTokensAndObservingUsersIfNeeded();
            }));
            it('should not display non chosen candidate anymore when they leaves', fakeAsync(async() => {
                // Given a page that has loaded, and a candidate joined
                awaitComponentInitialization();
                await mockCandidateArrival();
                expectElementToExist('#presenceOf_' + UserMocks.OPPONENT.username);

                // When the candidate leaves
                await configRoomService.removeCandidate('configRoomId', UserMocks.OPPONENT_MINIMAL_USER.id);

                // Then it is still not selected, configRoom is back to start
                expectElementNotToExist('#presenceOf_' + UserMocks.OPPONENT.username);
                expect(component.currentConfigRoom).toEqual(ConfigRoomMocks.getInitial(MGPOptional.empty()));
                component.stopSendingPresenceTokensAndObservingUsersIfNeeded();
            }));
        });
        describe('Candidate/chosenOpponent stop sending token', () => {
            it('should go back to start when ChosenOpponent token is too old', fakeAsync(async() => {
                // Given a page that has loaded, a candidate that has joined and that has been chosen as opponent
                awaitComponentInitialization();
                await mockCandidateArrival(new Timestamp(123, 456000000));
                await chooseOpponent();
                expectElementToExist('#selected_' + UserMocks.OPPONENT.username);

                // When the candidate token becomes too old
                spyOn(currentGameService, 'updateCurrentGame').and.callThrough();
                // Creator update his last presence token
                await userService.updatePresenceToken(UserMocks.CREATOR_AUTH_USER.id);
                // but chosenOpponent don't update his last presence token
                const infoMessage: string = UserMocks.OPPONENT.username + ' left the game, please pick another opponent.';
                await testUtils.expectToDisplayInfoMessage(infoMessage, async() => {
                    tick(PartCreationComponent.TOKEN_TIMEOUT); // two token time pass and timeout is reached
                });

                // Then there is no longer any candidate nor chosen opponent in the room
                expectElementNotToExist('#selected_' + UserMocks.OPPONENT.username);
                expect(component.currentConfigRoom).toEqual(ConfigRoomMocks.getInitial(MGPOptional.empty()));
                // And component should update the currentGame
                expect(currentGameService.updateCurrentGame).toHaveBeenCalledOnceWith({ opponent: null });
                component.stopSendingPresenceTokensAndObservingUsersIfNeeded();
            }));
            it('should remove candidates from the list when they stop sending token', fakeAsync(async() => {
                // Given a component that is loaded and there is a non-chosen candidate
                awaitComponentInitialization();
                await mockCandidateArrival(new Timestamp(123, 456000000));
                expectElementToExist('#candidate_firstCandidate');

                // When the candidate stop sending token
                // Creator updates its last presence
                await userService.updatePresenceToken(UserMocks.CREATOR_AUTH_USER.id);
                // but candidate don't
                tick(PartCreationComponent.TOKEN_TIMEOUT); // two token time pass and reactive the timeout

                // Then the candidate should have disappeared and the configRoom have been updated and no toast appeared
                expectElementNotToExist('#candidate_firstCandidate');
                expect(component.currentConfigRoom).toEqual(ConfigRoomMocks.getInitial(MGPOptional.empty()));
                component.stopSendingPresenceTokensAndObservingUsersIfNeeded();
            }));
        });
        describe('Candidate/ChosenOpponent removal', () => {
            it('should deselect candidate, remove it, and call logError when a candidate is removed from db', fakeAsync(async() => {
                spyOn(Utils, 'logError').and.callFake(ErrorLoggerServiceMock.logError);
                // Given a part with a candidate that has been chosen
                awaitComponentInitialization();
                await mockCandidateArrival();
                await chooseOpponent();
                expectElementToExist('#selected_' + UserMocks.OPPONENT.username);

                // When the candidate is deleted and one TOKEN_INTERVAL passes
                await userDAO.delete(UserMocks.OPPONENT_AUTH_USER.id);
                const infoMessage: string = UserMocks.OPPONENT.username + ' left the game, please pick another opponent.';
                await testUtils.expectToDisplayInfoMessage(infoMessage, async() => {
                    tick(PartCreationComponent.TOKEN_INTERVAL);
                });

                // Then logError has been called as this is an unusual situation
                const error: string = 'found no user while observing ' + UserMocks.OPPONENT_MINIMAL_USER.id + ' !';
                expect(Utils.logError).toHaveBeenCalledOnceWith('PartCreationComponent', error);
                // and the candidate has been deselected
                expectElementNotToExist('#selected_' + UserMocks.OPPONENT.username);
                // and the candidate has been removed from the lobby
                expect(component.currentConfigRoom).toEqual(ConfigRoomMocks.getInitial(MGPOptional.empty()));
                component.stopSendingPresenceTokensAndObservingUsersIfNeeded();
            }));
        });
        describe('Chosing Opponent', () => {
            it('should modify config room, make proposal possible, and select opponent when choosing opponent', fakeAsync(async() => {
                // Given a component with candidate present but not selected
                awaitComponentInitialization();
                await mockCandidateArrival();
                expectElementToExist('#presenceOf_firstCandidate');

                const contextBefore: string = 'Proposing config should be impossible before there is a ChosenOpponent';
                expect(findElement('#proposeConfig').nativeElement.disabled).withContext(contextBefore).toBeTruthy();

                // When choosing the opponent
                await chooseOpponent();
                testUtils.detectChanges();

                // Then current config room doc should be updated
                expect(component.currentConfigRoom).toEqual(ConfigRoomMocks.withChosenOpponent(MGPOptional.empty()));

                // and proposal should now be possible
                const proposeConfigDisabled: boolean = findElement('#proposeConfig').nativeElement.disabled;
                const contextAfter: string = 'Proposing config should become possible after ChosenOpponent is set';
                expect(proposeConfigDisabled).withContext(contextAfter).toBeFalse();

                // and opponent should be selected
                expectElementToExist('#selected_' + UserMocks.OPPONENT.username);
                component.stopSendingPresenceTokensAndObservingUsersIfNeeded();
            }));
            it('should modify currentGame to add chosen opponent', fakeAsync(async() => {
                // Given a component with candidate present but not selected
                awaitComponentInitialization();
                await mockCandidateArrival();
                expectElementToExist('#presenceOf_firstCandidate');

                const contextBefore: string = 'Proposing config should be impossible before there is a ChosenOpponent';
                expect(findElement('#proposeConfig').nativeElement.disabled).withContext(contextBefore).toBeTruthy();

                // When choosing the opponent
                spyOn(currentGameService, 'updateCurrentGame').and.callThrough();
                await chooseOpponent();

                // Then updateCurrentGame should have been called
                expect(currentGameService.updateCurrentGame).toHaveBeenCalledOnceWith({
                    opponent: UserMocks.OPPONENT_MINIMAL_USER,
                });
                component.stopSendingPresenceTokensAndObservingUsersIfNeeded();
            }));
        });
        describe('Config proposal', () => {
            it('should send what creator sees, not what is stored in the configRoom', fakeAsync(async() => {
                // Given a component where creator has changed the maximalMoveDuration and totalPartDuration
                awaitComponentInitialization();
                await clickElement('#partTypeCustom');
                Utils.getNonNullable(component.configFormGroup.get('maximalMoveDuration')).setValue(100);
                Utils.getNonNullable(component.configFormGroup.get('totalPartDuration')).setValue(1000);

                // When a candidate arrives and is proposed a config
                await mockCandidateArrival();
                await chooseOpponent();
                spyOn(configRoomDAO, 'update').and.callThrough();
                await proposeConfig();

                // Then the data sent should be what creator saw
                expect(configRoomDAO.update).toHaveBeenCalledOnceWith('configRoomId', {
                    partStatus: PartStatus.CONFIG_PROPOSED.value,
                    partType: PartType.CUSTOM.value,
                    maximalMoveDuration: 100,
                    totalPartDuration: 1000,
                    firstPlayer: FirstPlayer.RANDOM.value,
                    rulesConfig: {},
                });
                component.stopSendingPresenceTokensAndObservingUsersIfNeeded();
            }));
            it('should support blitz part', fakeAsync(async() => {
                // Given a component with a chosen opponent where blitz is selected
                awaitComponentInitialization();
                await mockCandidateArrival();
                await chooseOpponent();
                await clickElement('#partTypeBlitz');

                spyOn(configRoomDAO, 'update').and.callThrough();

                // When proposing the config
                await proposeConfig();

                // The blitz should be part of it
                expect(configRoomDAO.update).toHaveBeenCalledOnceWith('configRoomId', {
                    partStatus: PartStatus.CONFIG_PROPOSED.value,
                    partType: PartType.BLITZ.value,
                    maximalMoveDuration: 30,
                    totalPartDuration: 900,
                    firstPlayer: FirstPlayer.RANDOM.value,
                    rulesConfig: {},
                });
                component.stopSendingPresenceTokensAndObservingUsersIfNeeded();
            }));
            it('should change configRoom doc stored in component', fakeAsync(async() => {
                // Given a component where creator selected a config and chose an opponent
                awaitComponentInitialization();
                await mockCandidateArrival();
                await chooseOpponent();

                // When proposing config
                await proposeConfig();

                // Then currentConfigRoom should be updated with the proposed config
                const proposedConfig: ConfigRoom = {
                    ...ConfigRoomMocks.getInitialRandom(MGPOptional.empty()),
                    chosenOpponent: UserMocks.OPPONENT_MINIMAL_USER,
                    partStatus: PartStatus.CONFIG_PROPOSED.value,
                };
                expect(component.currentConfigRoom).toEqual(proposedConfig);
                component.stopSendingPresenceTokensAndObservingUsersIfNeeded();
            }));

            it('should not emit rules config when modifying field', fakeAsync(async() => {
                // Given a component where creator selected a config and chose an opponent
                awaitComponentInitialization();
                await mockCandidateArrival();
                await chooseOpponent();

                // When changing a rules config but not saving config
                component.saveRulesConfig(MGPOptional.of({ chaussettes_de_crepes: 5 }));

                // Then the config should not have been sent yet
                const proposedConfig: ConfigRoom = {
                    ...ConfigRoomMocks.getInitial(MGPOptional.empty()),
                    chosenOpponent: UserMocks.OPPONENT_MINIMAL_USER,
                };
                expect(component.currentConfigRoom).toEqual(proposedConfig);
                component.stopSendingPresenceTokensAndObservingUsersIfNeeded();
            }));

            it('should emit rules config when proposing config', fakeAsync(async() => {
                // Given a component where creator selected a config and chose an opponent
                awaitComponentInitialization();
                await mockCandidateArrival();
                await chooseOpponent();

                // When changing a rules config then proposing config
                component.saveRulesConfig(MGPOptional.of({ chaussettes_de_crepes: 5 }));
                await proposeConfig();

                // Then currentConfigRoom should be updated with the proposed config
                const proposedConfig: ConfigRoom = {
                    ...ConfigRoomMocks.getInitialRandom(MGPOptional.empty()),
                    chosenOpponent: UserMocks.OPPONENT_MINIMAL_USER,
                    partStatus: PartStatus.CONFIG_PROPOSED.value,
                    rulesConfig: {
                        chaussettes_de_crepes: 5,
                    },
                };
                expect(component.currentConfigRoom).toEqual(proposedConfig);
                component.stopSendingPresenceTokensAndObservingUsersIfNeeded();
            }));

            it('should disable config proposition button when rules config is invalid', fakeAsync(async() => {
                // Given a component where creator selected a config and chose an opponent
                awaitComponentInitialization();
                await mockCandidateArrival();
                await chooseOpponent();

                // When changing a rules config to something illegal
                // (then as a rule, we'll get informed by an empty optional)
                component.saveRulesConfig(MGPOptional.empty());

                // Then the propose config should be disabled
                testUtils.expectElementToBeDisabled('#proposeConfig');
                component.stopSendingPresenceTokensAndObservingUsersIfNeeded();
            }));

        });
        describe('Form interaction', () => {
            it('should update the form data when changing first player', fakeAsync(async() => {
                // Given a part being created
                awaitComponentInitialization();

                // When changing the first player
                await clickElement('#firstPlayerOpponent');

                // Then form is updated
                const firstPlayer: string = Utils.getNonNullable(component.configFormGroup.get('firstPlayer')).value;
                expect(firstPlayer).toEqual(FirstPlayer.CHOSEN_PLAYER.value);
                component.stopSendingPresenceTokensAndObservingUsersIfNeeded();
            }));
            it('should show detailed timing options when choosing a custom part type', fakeAsync(async() => {
                // Given a part being created
                awaitComponentInitialization();

                // When setting the part type to custom
                await clickElement('#partTypeCustom');

                // Then the detailed timing options are shown
                expectElementToExist('#customTime');
                component.stopSendingPresenceTokensAndObservingUsersIfNeeded();
            }));
            it('should update the timings when selecting blitz part', fakeAsync(async() => {
                // Given a part creation
                awaitComponentInitialization();

                // When setting the part type to 'blitz'
                await clickElement('#partTypeBlitz');
                testUtils.detectChanges();

                // Then the timings in the form are updated
                const maximalMoveDuration: number = Utils.getNonNullable(component.configFormGroup.get('maximalMoveDuration')).value;
                expect(maximalMoveDuration).toBe(PartType.BLITZ_MOVE_DURATION);
                const totalPartDuration: number = Utils.getNonNullable(component.configFormGroup.get('totalPartDuration')).value;
                expect(totalPartDuration).toBe(PartType.BLITZ_PART_DURATION);
                component.stopSendingPresenceTokensAndObservingUsersIfNeeded();
            }));
            it('should update the timings when reselecting normal part', fakeAsync(async() => {
                // Given a part creation with blitz selected
                awaitComponentInitialization();
                await clickElement('#partTypeBlitz');

                // When setting the part type back to standard
                await clickElement('#partTypeStandard');

                // Then the timings are updated
                const maximalMoveDuration: number = Utils.getNonNullable(component.configFormGroup.get('maximalMoveDuration')).value;
                expect(maximalMoveDuration).toBe(PartType.NORMAL_MOVE_DURATION);
                const totalPartDuration: number = Utils.getNonNullable(component.configFormGroup.get('totalPartDuration')).value;
                expect(totalPartDuration).toBe(PartType.NORMAL_PART_DURATION);
                component.stopSendingPresenceTokensAndObservingUsersIfNeeded();
            }));
            it('should go back to created status when clicking on review config button', fakeAsync(async() => {
                // Given a part creation where the config has been proposed
                awaitComponentInitialization();
                await receiveConfigRoomUpdate({
                    partStatus: PartStatus.CONFIG_PROPOSED.value,
                    maximalMoveDuration: 10,
                    totalPartDuration: 60,
                    firstPlayer: FirstPlayer.CREATOR.value,
                });

                spyOn(configRoomDAO, 'update').and.callThrough();

                // When the config is reviewed
                await clickElement('#reviewConfig');

                // Then the part is set back to created
                expect(configRoomDAO.update).toHaveBeenCalledWith('configRoomId', {
                    partStatus: PartStatus.PART_CREATED.value,
                });
                component.stopSendingPresenceTokensAndObservingUsersIfNeeded();
            }));
            it('should remember settings after a configRoom update', fakeAsync(async() => {
                // Given a part creation with some changes to the config
                awaitComponentInitialization();
                await clickElement('#firstPlayerCreator');
                await clickElement('#partTypeBlitz');

                // When a new candidate appears
                await mockCandidateArrival();

                // Then the config does not change
                expectElementToHaveClass('#firstPlayerCreator', 'is-selected');
                expectElementToHaveClass('#partTypeBlitz', 'is-selected');
                component.stopSendingPresenceTokensAndObservingUsersIfNeeded();
            }));
        });
        describe('Canceling part creation and component destruction', () => {
            it('should delete the game', fakeAsync(async() => {
                // Given a part creation
                awaitComponentInitialization();

                spyOn(gameService, 'deleteGame').and.callThrough();

                // When clicking on cancel

                await testUtils.expectToDisplayInfoMessage('The game has been canceled!', async() => {
                    await clickElement('#cancel');
                });

                // Then the game is deleted
                expect(gameService.deleteGame).toHaveBeenCalledOnceWith('configRoomId');

                component.stopSendingPresenceTokensAndObservingUsersIfNeeded();
            }));
            it('should not cancel game if it has been canceled already', fakeAsync(async() => {
                // Given a part creation where the part has been canceled
                awaitComponentInitialization();
                await testUtils.expectToDisplayInfoMessage('The game has been canceled!', async() => {
                    await clickElement('#cancel');
                    tick(0);
                });
                component.stopSendingPresenceTokensAndObservingUsersIfNeeded();

                // When the component is destroyed
                spyOn(component, 'cancelGameCreation').and.callThrough();
                testUtils.destroy();
                tick(1);
                destroyed = true;

                // Then it should not delete anything
                expect(component.cancelGameCreation).not.toHaveBeenCalled();
            }));
            it('should ask ConnectedUserService to remove currentGame', fakeAsync(async() => {
                // Given any part with a non started game
                awaitComponentInitialization();

                // When user cancel game creation
                spyOn(currentGameService, 'removeCurrentGame').and.callThrough();
                await testUtils.expectToDisplayInfoMessage('The game has been canceled!', async() => {
                    await clickElement('#cancel');
                    tick(0);
                });

                // Then currentGame should be emptied
                expect(currentGameService.removeCurrentGame).toHaveBeenCalledOnceWith();
                component.stopSendingPresenceTokensAndObservingUsersIfNeeded();
                await partDAO.set('configRoomId', PartMocks.INITIAL);
                await configRoomDAO.set('configRoomId', ConfigRoomMocks.getInitial(MGPOptional.empty()));
                await chatDAO.set('configRoomId', { messages: [], status: 'dummy status' });
            }));
            it('should unsubscribe from configRoom upon destruction', fakeAsync(async() => {
                // Given a component that is loaded by anyone (here, the creator) for a started part
                const expectConfigRoomUnsubscribeToHaveBeenCalled: () => void =
                    prepareUnsubscribeCheck(configRoomService, 'subscribeToChanges');
                const expectCandidateUnsubscribeToHaveBeenCalled: () => void =
                    prepareUnsubscribeCheck(configRoomService, 'subscribeToCandidates');
                awaitComponentInitialization();
                spyOn(component, 'cancelGameCreation').and.resolveTo(); // spied in order to avoid calling it

                // When the component is destroyed
                component.stopSendingPresenceTokensAndObservingUsersIfNeeded();
                destroyed = true;
                await component.ngOnDestroy();

                // Then the component unsubscribes from the configRoom subscriptions
                expectConfigRoomUnsubscribeToHaveBeenCalled();
                expectCandidateUnsubscribeToHaveBeenCalled();
            }));
        });
    });

    describe('Candidate', () => {
        beforeEach(fakeAsync(async() => {
            // Given a component where user is a candidate
            ConnectedUserServiceMock.setUser(UserMocks.OPPONENT_AUTH_USER);
            await configRoomDAO.set('configRoomId', ConfigRoomMocks.getInitial(MGPOptional.empty()));
        }));
        describe('Arrival', () => {
            it('should add user to configRoom candidates with service', fakeAsync(() => {
                spyOn(configRoomService, 'joinGame').and.callThrough();

                // When candidate arrives
                awaitComponentInitialization();

                // Then the candidate is added to the configRoom and the configRoom is updated
                expect(configRoomService.joinGame).toHaveBeenCalledOnceWith('configRoomId');
                expect(component.currentConfigRoom).toEqual(ConfigRoomMocks.getInitial(MGPOptional.empty()));
                component.stopSendingPresenceTokensAndObservingUsersIfNeeded();
            }));
            it('should add currentGame to user doc', fakeAsync(() => {
                // Given a partCreation
                spyOn(currentGameService, 'updateCurrentGame').and.callFake(async() => {});

                // When the user, a candidate, arrives
                awaitComponentInitialization();

                // Then currentGame in user doc should be set
                const currentGame: CurrentGame = CurrentGameMocks.CANDIDATE;
                expect(currentGameService.updateCurrentGame).toHaveBeenCalledOnceWith(currentGame);
                component.stopSendingPresenceTokensAndObservingUsersIfNeeded();
            }));
            it('should start sending presence token', fakeAsync(() => {
                // Given a partCreation where user is not opponent
                // When user is selected as chosen opponent
                spyOn(component, 'startSendingPresenceTokens').and.callThrough();
                awaitComponentInitialization();

                // Then "start sending token" should have been called
                expect(component.startSendingPresenceTokens).toHaveBeenCalledOnceWith();

                // To avoid finishing test with periodic timer in queue
                component.stopSendingPresenceTokensAndObservingUsersIfNeeded();
            }));
            it(`should delete part when finding an outdated creator token`, fakeAsync(async() => {
                spyOn(gameService, 'deleteGame').and.callThrough();

                // Given a component where creator has an out of date token
                const lastUpdateTime: Timestamp = new Timestamp(- PartCreationComponent.TOKEN_TIMEOUT, 0);
                await userDAO.update(UserMocks.CREATOR_AUTH_USER.id, { lastUpdateTime });
                await partDAO.set('configRoomId', PartMocks.INITIAL);

                // When arriving on that component
                awaitComponentInitialization();
                // and waiting one TOKEN_INTERVAL
                await testUtils.expectToDisplayInfoMessage('The game has been canceled!', async() => {
                    tick(PartCreationComponent.TOKEN_INTERVAL);
                });

                // Then the part and all its related data should be removed
                expect(gameService.deleteGame).toHaveBeenCalledOnceWith('configRoomId');

                component.stopSendingPresenceTokensAndObservingUsersIfNeeded();
            }));
        });
        describe('Not chosen yet', () => {
            it('should reroute to server when game is cancelled', fakeAsync(async() => {
                const router: Router = TestBed.inject(Router);
                spyOn(router, 'navigate').and.resolveTo(true);

                // Given component that has loaded
                awaitComponentInitialization();

                // When the configRoom is deleted (because the game has been cancelled)
                await testUtils.expectToDisplayInfoMessage('The game has been canceled!', async() => {
                    await configRoomDAO.delete('configRoomId');
                });
                testUtils.detectChanges();

                // Then the user is rerouted to the server
                expectValidRouting(router, ['/lobby'], LobbyComponent);
                component.stopSendingPresenceTokensAndObservingUsersIfNeeded();
            }));
            it('should not start sending presence token once selected as chosen opponent', fakeAsync(async() => {
                // Given a partCreation where user is candidate
                awaitComponentInitialization();

                // When user is selected as chosen opponent
                spyOn(component, 'startSendingPresenceTokens').and.callThrough();
                await receiveConfigRoomUpdate(ConfigRoomMocks.withChosenOpponent(MGPOptional.empty()));

                // Then "start sending token" should have been called
                expect(component.startSendingPresenceTokens).not.toHaveBeenCalled();
                // To avoid finishing test with periodic timer in queue
                component.stopSendingPresenceTokensAndObservingUsersIfNeeded();
            }));
        });
        describe('Chosen opponent', () => {
            it('should send a presence token every 5 second', fakeAsync(async() => {
                // Given a partCreation were you are already chosen as candidate
                awaitComponentInitialization();
                await receiveConfigRoomUpdate(ConfigRoomMocks.withChosenOpponent(MGPOptional.empty()));

                // When 2 * 5 sec pass
                spyOn(connectedUserService, 'sendPresenceToken').and.callFake(async() => {});
                tick(PartCreationComponent.TOKEN_TIMEOUT);

                // Then a presence token should be emitted
                expect(connectedUserService.sendPresenceToken).toHaveBeenCalledTimes(2);
                // To avoid finishing test with periodic timer in queue
                component.stopSendingPresenceTokensAndObservingUsersIfNeeded();
            }));
            it('should make config acceptation possible for configRoom when config is proposed', fakeAsync(async() => {
                // Given a part in creation where the candidate is chosen
                awaitComponentInitialization();
                await receiveConfigRoomUpdate(ConfigRoomMocks.withChosenOpponent(MGPOptional.empty()));
                testUtils.expectElementNotToExist('#acceptConfig');

                // When the config is proposed
                await receiveConfigRoomUpdate({
                    partStatus: PartStatus.CONFIG_PROPOSED.value,
                    maximalMoveDuration: 10,
                    totalPartDuration: 60,
                    firstPlayer: FirstPlayer.CREATOR.value,
                });

                // Then the candidate can accept the config
                expectElementToExist('#acceptConfig');
                // To avoid finishing test with periodic timer in queue
                component.stopSendingPresenceTokensAndObservingUsersIfNeeded();
            }));
            it('accepting config should change configRoom and part', fakeAsync(async() => {
                spyOn(component.gameStartNotification, 'emit').and.callThrough();
                // Given a part where the config has been proposed with creator as first player
                awaitComponentInitialization();
                await receiveConfigRoomUpdate({
                    ...ConfigRoomMocks.withProposedConfig(MGPOptional.empty()),
                    firstPlayer: FirstPlayer.CREATOR.value,
                });

                // When accepting the config
                await clickElement('#acceptConfig');
                tick(0);

                // Then the game start notification is emitted
                expect(component.gameStartNotification.emit).toHaveBeenCalledWith({
                    ...ConfigRoomMocks.withAcceptedConfig(MGPOptional.empty()),
                    firstPlayer: FirstPlayer.CREATOR.value,
                });
                // the configRoom is updated
                expect(component.currentConfigRoom).toEqual({
                    ...ConfigRoomMocks.withAcceptedConfig(MGPOptional.empty()),
                    firstPlayer: FirstPlayer.CREATOR.value,
                });
                // and the part is set to starting
                const currentPart: Part = (await partDAO.read('configRoomId')).get();
                const expectedPart: Part = { ...PartMocks.STARTED, beginning: currentPart.beginning };
                expect(currentPart).toEqual(expectedPart);
                // To avoid finishing test with periodic timer in queue
                component.stopSendingPresenceTokensAndObservingUsersIfNeeded();
            }));
            it('should not stop sending token when no longer chosen opponent', fakeAsync(async() => {
                // Given a component where user is chosen opponent amongst two candidate
                awaitComponentInitialization();
                await receiveConfigRoomUpdate(ConfigRoomMocks.getInitial(MGPOptional.empty()));
                await addCandidate(UserMocks.OTHER_OPPONENT_MINIMAL_USER);
                await addCandidate(UserMocks.OPPONENT_MINIMAL_USER);
                await receiveConfigRoomUpdate(ConfigRoomMocks.withChosenOpponent(MGPOptional.empty()));

                // When an update notifies user that the chosen opponent changed
                spyOn(component, 'stopSendingPresenceTokensAndObservingUsersIfNeeded').and.callThrough();
                await receiveConfigRoomUpdate(ConfigRoomMocks.withAnotherChosenOpponent(MGPOptional.empty()));

                // Then stopSendingPresenceTokensAndObservingCreatorIfNeeded should not have been called
                expect(component.stopSendingPresenceTokensAndObservingUsersIfNeeded).not.toHaveBeenCalled();
                component.stopSendingPresenceTokensAndObservingUsersIfNeeded();
            }));
            it('should update currentGame and mark user as chosen opponent', fakeAsync(async() => {
                // Given a partCreation where user is candidate
                awaitComponentInitialization();

                // When user is selected as chosen opponent
                spyOn(currentGameService, 'updateCurrentGame').and.callThrough();
                await receiveConfigRoomUpdate(ConfigRoomMocks.withChosenOpponent(MGPOptional.empty()));

                // Then an update should change user doc to say it's chosenOpponent now
                expect(currentGameService.updateCurrentGame)
                    .toHaveBeenCalledOnceWith(CurrentGameMocks.CHOSEN_OPPONENT);
                // To avoid finishing test with periodic timer in queue
                component.stopSendingPresenceTokensAndObservingUsersIfNeeded();
            }));
        });
        describe('Leaving', () => {
            it('should remove yourself when leaving the room and empty user.currentGame', fakeAsync(async() => {
                // Given a partCreation where user is candidate
                awaitComponentInitialization();
                expect(component.currentConfigRoom).toEqual(ConfigRoomMocks.getInitial(MGPOptional.empty()));
                expect(component.candidates).toEqual([UserMocks.OPPONENT_MINIMAL_USER]);

                // When leaving the page (tested here by calling ngOnDestroy)
                spyOn(currentGameService, 'removeCurrentGame').and.callThrough();
                spyOn(configRoomService, 'removeCandidate').and.callThrough();
                testUtils.destroy();
                tick(1);
                destroyed = true;

                // Then configRoomService.cancelJoining should have been called
                expect(currentGameService.removeCurrentGame).toHaveBeenCalledOnceWith();
                expect(configRoomService.removeCandidate)
                    .toHaveBeenCalledOnceWith('configRoomId', UserMocks.OPPONENT_MINIMAL_USER.id);
            }));
            it('should not try to modify DAOs after user logged out', fakeAsync(async() => {
                // Given a part creation
                awaitComponentInitialization();

                // When user logs out
                spyOn(currentGameService, 'removeCurrentGame').and.callThrough();
                spyOn(configRoomService, 'removeCandidate').and.callThrough();

                ConnectedUserServiceMock.setUser(AuthUser.NOT_CONNECTED);
                testUtils.destroy();
                tick(1);
                destroyed = true;

                // Then it should not call cancelJoining nor removeCurrentGame
                expect(currentGameService.removeCurrentGame).not.toHaveBeenCalled();
                expect(configRoomService.removeCandidate).not.toHaveBeenCalled();
            }));
        });
    });
    afterEach(fakeAsync(async() => {
        if (destroyed === false) {
            testUtils.destroy();
        }
    }));
});
