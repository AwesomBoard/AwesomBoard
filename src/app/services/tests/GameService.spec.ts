/* eslint-disable max-lines-per-function */
import { fakeAsync, TestBed } from '@angular/core/testing';
import { GameService, StartingPartConfig } from '../GameService';
import { PartDAO } from 'src/app/dao/PartDAO';
import { Part, PartDocument, MGPResult } from 'src/app/domain/Part';
import { PartDAOMock } from 'src/app/dao/tests/PartDAOMock.spec';
import { ConfigRoomDAOMock } from 'src/app/dao/tests/ConfigRoomDAOMock.spec';
import { ChatDAOMock } from 'src/app/dao/tests/ChatDAOMock.spec';
import { ChatDAO } from 'src/app/dao/ChatDAO';
import { Player } from 'src/app/jscaip/Player';
import { FirstPlayer, ConfigRoom, PartStatus, PartType } from 'src/app/domain/ConfigRoom';
import { ConfigRoomDAO } from 'src/app/dao/ConfigRoomDAO';
import { RouterTestingModule } from '@angular/router/testing';
import { BlankComponent } from 'src/app/utils/tests/TestUtils.spec';
import { ConnectedUserService } from '../ConnectedUserService';
import { ConnectedUserServiceMock } from './ConnectedUserService.spec';
import { ConfigRoomMocks } from 'src/app/domain/ConfigRoomMocks.spec';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { Utils } from 'src/app/utils/utils';
import { ConfigRoomService } from '../ConfigRoomService';
import { MGPOptional } from 'src/app/utils/MGPOptional';
import { UserMocks } from 'src/app/domain/UserMocks.spec';
import { serverTimestamp, Timestamp } from 'firebase/firestore';
import { PartMocks } from 'src/app/domain/PartMocks.spec';
import { Subscription } from 'rxjs';
import { GameEventService } from '../GameEventService';

describe('GameService', () => {

    let gameService: GameService;

    let partDAO: PartDAO;

    let gameEventService: GameEventService;

    beforeEach(fakeAsync(async() => {
        await TestBed.configureTestingModule({
            imports: [
                RouterTestingModule.withRoutes([
                    { path: '**', component: BlankComponent },
                ]),
                BrowserAnimationsModule,
            ],
            providers: [
                { provide: ConnectedUserService, useClass: ConnectedUserServiceMock },
                { provide: PartDAO, useClass: PartDAOMock },
                { provide: ConfigRoomDAO, useClass: ConfigRoomDAOMock },
                { provide: ChatDAO, useClass: ChatDAOMock },
            ],
        }).compileComponents();
        gameService = TestBed.inject(GameService);
        gameEventService = TestBed.inject(GameEventService);
        partDAO = TestBed.inject(PartDAO);
        ConnectedUserServiceMock.setUser(UserMocks.CREATOR_AUTH_USER);
    }));
    it('should create', () => {
        expect(gameService).toBeTruthy();
    });
    it('should delegate subscribeToChanges callback to partDAO', fakeAsync(async() => {
        // Given an existing part
        const part: Part = {
            typeGame: 'Quarto',
            playerZero: UserMocks.CREATOR_MINIMAL_USER,
            playerOne: UserMocks.OPPONENT_MINIMAL_USER,
            turn: 2,
            result: MGPResult.UNACHIEVED.value,
        };
        await partDAO.set('partId', part);

        let calledCallback: boolean = false;
        const myCallback: (observedPart: MGPOptional<Part>) => void = (observedPart: MGPOptional<Part>) => {
            expect(observedPart.isPresent()).toBeTrue();
            expect(observedPart.get()).toEqual(part);
            calledCallback = true;
        };
        spyOn(partDAO, 'subscribeToChanges').and.callThrough();

        // When observing the part
        const subscription: Subscription = gameService.subscribeToChanges('partId', myCallback);

        // Then subscribeToChanges should be called on the DAO and the part should be observed
        expect(partDAO.subscribeToChanges).toHaveBeenCalledWith('partId', myCallback);
        expect(calledCallback).toBeTrue();

        subscription.unsubscribe();
    }));
    it('should delegate delete to PartDAO', fakeAsync(async() => {
        // Given the service at any moment
        spyOn(partDAO, 'delete').and.resolveTo();

        // When calling deletePart
        await gameService.deletePart('partId');

        // Then it should delegate to the DAO
        expect(partDAO.delete).toHaveBeenCalledOnceWith('partId');
    }));
    describe('acceptConfig', () => {
        it('should delegate to ConfigRoomService.acceptConfig', fakeAsync(async() => {
            const configRoomService: ConfigRoomService = TestBed.inject(ConfigRoomService);
            spyOn(configRoomService, 'acceptConfig').and.resolveTo();
            spyOn(partDAO, 'update').and.resolveTo();

            // Given a config
            const configRoom: ConfigRoom = ConfigRoomMocks.WITH_PROPOSED_CONFIG;
            // When accepting it
            await gameService.acceptConfig('partId', configRoom);
            // Then acceptConfig should be called
            expect(configRoomService.acceptConfig).toHaveBeenCalledOnceWith('partId');
        }));
        it('should can startGame with the accepter player as argument (Player.ZERO)', fakeAsync(async() => {
            const configRoomService: ConfigRoomService = TestBed.inject(ConfigRoomService);
            const gameEventService: GameEventService = TestBed.inject(GameEventService);
            spyOn(configRoomService, 'acceptConfig').and.resolveTo();
            spyOn(partDAO, 'update').and.resolveTo();
            spyOn(gameEventService, 'startGame').and.resolveTo();

            // Given a config where we will start as player 0
            const configRoom: ConfigRoom = {
                ...ConfigRoomMocks.WITH_PROPOSED_CONFIG,
                firstPlayer: FirstPlayer.CHOSEN_PLAYER.value,
            };
            // When accepting it
            await gameService.acceptConfig('partId', configRoom);
            // Then startGame is called with Player.ZERO
            expect(gameEventService.startGame).toHaveBeenCalledWith('partId', Player.ZERO);
        }));
        it('should can startGame with the accepter player as argument (Player.ONE)', fakeAsync(async() => {
            const configRoomService: ConfigRoomService = TestBed.inject(ConfigRoomService);
            const gameEventService: GameEventService = TestBed.inject(GameEventService);
            spyOn(configRoomService, 'acceptConfig').and.resolveTo();
            spyOn(partDAO, 'update').and.resolveTo();
            spyOn(gameEventService, 'startGame').and.resolveTo();

            // Given a config where we will start as player 0
            const configRoom: ConfigRoom = {
                ...ConfigRoomMocks.WITH_PROPOSED_CONFIG,
                firstPlayer: FirstPlayer.CHOSEN_PLAYER.value,
            };
            // When accepting it
            await gameService.acceptConfig('partId', configRoom);
            // Then startGame is called with Player.ZERO
            expect(gameEventService.startGame).toHaveBeenCalledWith('partId', Player.ZERO);
        }));
    });
    it('createPartConfigRoomAndChat should create in this order: part, configRoom, and then chat', fakeAsync(async() => {
        const configRoomDAO: ConfigRoomDAO = TestBed.inject(ConfigRoomDAO);
        const chatDAO: ChatDAO = TestBed.inject(ChatDAO);
        // Install some mocks to check what we need
        // (we can't rely on toHaveBeenCalled on a mocked method, so we model this manually)
        let chatCreated: boolean = false;
        let configRoomCreated: boolean = false;
        spyOn(chatDAO, 'set').and.callFake(async(): Promise<void> => {
            chatCreated = true;
        });
        spyOn(configRoomDAO, 'set').and.callFake(async(): Promise<void> => {
            expect(chatCreated).withContext('configRoom should be created before the chat').toBeFalse();
            configRoomCreated = true;
        });
        spyOn(partDAO, 'create').and.callFake(async(): Promise<string> => {
            expect(chatCreated).withContext('part should be created before the chat').toBeFalse();
            expect(configRoomCreated).withContext('part should be created before the configRoom').toBeFalse();
            return 'partId';
        });

        // When calling createPartConfigRoomAndChat
        await gameService.createPartConfigRoomAndChat('Quarto');
        // Then, the order of the creations must be part, configRoom, chat (as checked by the mocks)
        // Moreover, everything needs to have been called eventually
        const part: Part = PartMocks.INITIAL;
        const configRoom: ConfigRoom = ConfigRoomMocks.INITIAL_RANDOM;
        expect(partDAO.create).toHaveBeenCalledOnceWith(part);
        expect(chatDAO.set).toHaveBeenCalledOnceWith('partId', {});
        expect(configRoomDAO.set).toHaveBeenCalledOnceWith('partId', configRoom);
    }));
    describe('getStartingConfig', () => {
        it('should put creator first when math.random() is below 0.5', fakeAsync(async() => {
            // Given a configRoom config asking random start
            const configRoom: ConfigRoom = {
                chosenOpponent: UserMocks.OPPONENT_MINIMAL_USER,
                creator: UserMocks.CREATOR_MINIMAL_USER,
                firstPlayer: 'RANDOM',
                maximalMoveDuration: 10,
                partStatus: 3,
                partType: PartType.BLITZ.value,
                totalPartDuration: 25,
            };

            // When calling getStartingConfig
            spyOn(Math, 'random').and.returnValue(0.4);
            const startConfig: StartingPartConfig = gameService.getStartingConfig(configRoom);

            // Then we should have a creator starting the game
            expect(startConfig.playerZero).toEqual(configRoom.creator);
            expect(startConfig.playerOne).toEqual(Utils.getNonNullable(configRoom.chosenOpponent));
        }));
        it('should put ChosenOpponent first when math.random() is over 0.5', fakeAsync(async() => {
            // Given a configRoom config asking random start
            const configRoom: ConfigRoom = {
                chosenOpponent: UserMocks.OPPONENT_MINIMAL_USER,
                creator: UserMocks.CREATOR_MINIMAL_USER,
                firstPlayer: 'RANDOM',
                maximalMoveDuration: 10,
                partStatus: 3,
                partType: PartType.BLITZ.value,
                totalPartDuration: 25,
            };

            // When calling getStartingConfig
            spyOn(Math, 'random').and.returnValue(0.6);
            const startConfig: StartingPartConfig = gameService.getStartingConfig(configRoom);

            // Then we should have a creator starting the game
            expect(startConfig.playerZero).toEqual(Utils.getNonNullable(configRoom.chosenOpponent));
            expect(startConfig.playerOne).toEqual(configRoom.creator);
        }));
    });
    describe('rematch', () => {
        let configRoomService: ConfigRoomService;
        let partDAO: PartDAO;
        beforeEach(() => {
            configRoomService = TestBed.inject(ConfigRoomService);
            partDAO = TestBed.inject(PartDAO);
        });
        it('should send request when proposing a rematch', fakeAsync(async() => {
            spyOn(gameEventService, 'addRequest').and.resolveTo();

            await gameService.proposeRematch('partId', Player.ZERO);

            expect(gameEventService.addRequest).toHaveBeenCalledOnceWith('partId', Player.ZERO, 'Rematch');
        }));
        it('should start with the other player when first player mentioned in previous game', fakeAsync(async() => {
            // Given a previous match with creator starting
            const lastPart: PartDocument = new PartDocument('partId', {
                playerZero: UserMocks.CREATOR_MINIMAL_USER,
                playerOne: UserMocks.OPPONENT_MINIMAL_USER,
                result: MGPResult.VICTORY.value,
                turn: 2,
                typeGame: 'laMarelle',
                beginning: new Timestamp(1700102, 680000000),
                loser: UserMocks.CREATOR_MINIMAL_USER,
                winner: UserMocks.OPPONENT_MINIMAL_USER,
            });
            const lastGameConfigRoom: ConfigRoom = {
                chosenOpponent: UserMocks.OPPONENT_MINIMAL_USER,
                creator: UserMocks.CREATOR_MINIMAL_USER,
                firstPlayer: 'CREATOR',
                maximalMoveDuration: 10,
                partStatus: 3,
                partType: PartType.BLITZ.value,
                totalPartDuration: 25,
            };
            await gameService.proposeRematch('partId', Player.ZERO);
            spyOn(configRoomService, 'readConfigRoomById').and.resolveTo(lastGameConfigRoom);
            let called: boolean = false;
            spyOn(partDAO, 'set').and.callFake(async(_id: string, element: Part) => {
                expect(element.playerZero).toEqual(Utils.getNonNullable(lastPart.data.playerOne));
                expect(element.playerOne).toEqual(Utils.getNonNullable(lastPart.data.playerZero));
                called = true;
            });

            // When accepting rematch
            await gameService.acceptRematch(lastPart, Player.ONE);

            // Then we should have a part created with playerOne and playerZero switched
            expect(called).toBeTrue();
        }));
        it('should start with the other player when first player was random', fakeAsync(async() => {
            // Given a previous match with creator starting
            const lastPart: PartDocument = new PartDocument('partId', {
                playerZero: UserMocks.OPPONENT_MINIMAL_USER,
                playerOne: UserMocks.CREATOR_MINIMAL_USER,
                result: MGPResult.VICTORY.value,
                turn: 2,
                typeGame: 'laMarelle',
                beginning: new Timestamp(1700102, 680000000),
                loser: UserMocks.CREATOR_MINIMAL_USER,
                winner: UserMocks.OPPONENT_MINIMAL_USER,
            });
            const lastGameConfigRoom: ConfigRoom = {
                chosenOpponent: UserMocks.OPPONENT_MINIMAL_USER,
                creator: UserMocks.CREATOR_MINIMAL_USER,
                firstPlayer: 'RANDOM',
                maximalMoveDuration: 10,
                partStatus: 3,
                partType: PartType.BLITZ.value,
                totalPartDuration: 25,
            };
            await gameService.proposeRematch('partId', Player.ZERO);
            spyOn(configRoomService, 'readConfigRoomById').and.resolveTo(lastGameConfigRoom);
            let called: boolean = false;
            spyOn(partDAO, 'set').and.callFake(async(_id: string, element: Part) => {
                expect(element.playerZero).toEqual(Utils.getNonNullable(lastPart.data.playerOne));
                expect(element.playerOne).toEqual(Utils.getNonNullable(lastPart.data.playerZero));
                called = true;
            });

            // When accepting rematch
            await gameService.acceptRematch(lastPart, Player.ONE);

            // Then we should have a part created with playerOne and playerZero switched
            expect(called).toBeTrue();
        }));
        it('should create elements in this order: part, configRoom, and then chat', fakeAsync(async() => {
            const configRoomDAO: ConfigRoomDAO = TestBed.inject(ConfigRoomDAO);
            const chatDAO: ChatDAO = TestBed.inject(ChatDAO);
            // Given a part that will be replayed
            const lastPart: PartDocument = new PartDocument('partId', {
                playerZero: UserMocks.CREATOR_MINIMAL_USER,
                playerOne: UserMocks.OPPONENT_MINIMAL_USER,
                result: MGPResult.VICTORY.value,
                turn: 2,
                typeGame: 'laMarelle',
                beginning: new Timestamp(1700102, 680000000),
                loser: UserMocks.CREATOR_MINIMAL_USER,
                winner: UserMocks.OPPONENT_MINIMAL_USER,
            });
            const lastGameConfigRoom: ConfigRoom = {
                chosenOpponent: UserMocks.OPPONENT_MINIMAL_USER,
                creator: UserMocks.CREATOR_MINIMAL_USER,
                firstPlayer: FirstPlayer.CREATOR.value,
                maximalMoveDuration: 10,
                partStatus: 3,
                partType: PartType.BLITZ.value,
                totalPartDuration: 25,
            };
            await gameService.proposeRematch('partId', Player.ZERO);
            spyOn(configRoomService, 'readConfigRoomById').and.resolveTo(lastGameConfigRoom);

            // Install some mocks to check what we need
            // (we can't rely on toHaveBeenCalled on a mocked method, so we model this manually)
            let chatCreated: boolean = false;
            let configRoomCreated: boolean = false;
            spyOn(chatDAO, 'set').and.callFake(async(): Promise<void> => {
                chatCreated = true;
            });
            spyOn(configRoomDAO, 'set').and.callFake(async(): Promise<void> => {
                expect(chatCreated).withContext('configRoom should be created before the chat').toBeFalse();
                configRoomCreated = true;
            });
            spyOn(partDAO, 'create').and.callFake(async(): Promise<string> => {
                expect(chatCreated).withContext('part should be created before the chat').toBeFalse();
                expect(configRoomCreated).withContext('part should be created before the configRoom').toBeFalse();
                return 'partId';
            });

            // When creator accepts the rematch
            await gameService.acceptRematch(lastPart, Player.ONE);
            // Then, the order of the creations must be part, configRoom, chat (as checked by the mocks)
            // Moreover, everything needs to have been called eventually
            const part: Part = {
                typeGame: 'laMarelle',
                playerZero: UserMocks.OPPONENT_MINIMAL_USER,
                playerOne: UserMocks.CREATOR_MINIMAL_USER,
                turn: 0,
                result: MGPResult.UNACHIEVED.value,
                beginning: serverTimestamp(),
            };
            const configRoom: ConfigRoom = {
                chosenOpponent: UserMocks.OPPONENT_MINIMAL_USER,
                creator: UserMocks.CREATOR_MINIMAL_USER,
                firstPlayer: FirstPlayer.CHOSEN_PLAYER.value,
                partType: PartType.BLITZ.value,
                partStatus: PartStatus.PART_STARTED.value,
                maximalMoveDuration: 10,
                totalPartDuration: 25,
            };
            expect(partDAO.create).toHaveBeenCalledOnceWith(part);
            expect(chatDAO.set).toHaveBeenCalledOnceWith('partId', {});
            expect(configRoomDAO.set).toHaveBeenCalledOnceWith('partId', configRoom);
        }));
    });
    describe('updatePart', () => {
        beforeEach(() => {
            const part: Part = {
                typeGame: 'Quarto',
                playerZero: UserMocks.CREATOR_MINIMAL_USER,
                playerOne: UserMocks.OPPONENT_MINIMAL_USER,
                turn: 1,
                result: MGPResult.UNACHIEVED.value,
            };
            spyOn(partDAO, 'read').and.resolveTo(MGPOptional.of(part));
            spyOn(partDAO, 'update').and.resolveTo();
        });
        it('should add scores to update when scores are present', fakeAsync(async() => {
            // When updating the board with scores
            const scores: [number, number] = [5, 0];
            await gameService.updatePart('partId', scores);
            // Then the update should contain the scores
            const expectedUpdate: Partial<Part> = {
                turn: 2,
                scorePlayerZero: 5,
                scorePlayerOne: 0,
            };
            expect(partDAO.update).toHaveBeenCalledOnceWith('partId', expectedUpdate);
        }));
    });
    describe('drawPart', () => {
        it('should include the draw notification', fakeAsync(async() => {
            // Given a part
            const part: Part = { ...PartMocks.STARTED, turn: 1 };
            spyOn(partDAO, 'read').and.resolveTo(MGPOptional.of(part));
            // When updating the board to notify of a draw
            spyOn(partDAO, 'update').and.resolveTo();
            await gameService.drawPart('partId', Player.ONE);
            // Then the result is set to draw in the update
            const expectedUpdate: Partial<Part> = {
                turn: 2,
                result: MGPResult.HARD_DRAW.value,
            };
            expect(partDAO.update).toHaveBeenCalledWith('partId', expectedUpdate);
        }));
    });
    describe('acceptDraw', () => {
        for (const player of Player.PLAYERS) {
            it('should send AGREED_DRAW_BY_ZERO/ONE when call as ZERO/ONE', async() => {
                // Given any state of service
                spyOn(partDAO, 'update').and.resolveTo();

                // When calling acceptDraw as the player
                await gameService.acceptDraw('configRoomId', player);

                // Then PartDAO should have been called with the appropriate MGPResult
                const result: number = [
                    MGPResult.AGREED_DRAW_BY_ZERO.value,
                    MGPResult.AGREED_DRAW_BY_ONE.value][player.value];
                expect(partDAO.update).toHaveBeenCalledOnceWith('configRoomId', {
                    result,
                });
            });
        }
    });
    describe('acceptTakeBack', () => {
        it('should decrease turn by 1 when accepting during our turn', fakeAsync(async() => {
            spyOn(partDAO, 'update').and.resolveTo();
            // Given a part during our turn
            const part = { ...PartMocks.STARTED, turn: 2 };
            // When accepting the take back
            await gameService.acceptTakeBack('configRoomId', part, Player.ZERO);
            // Then it should decrease the turn by one
            expect(partDAO.update).toHaveBeenCalledOnceWith('configRoomId', { turn: 1 });
        }));
        it(`should decrease turn by 2 when accepting during the opponent's turn`, fakeAsync(async() => {
            spyOn(partDAO, 'update').and.resolveTo();
            // Given a part during the opponent's turn
            const part = { ...PartMocks.STARTED, turn: 3 };
            // When accepting the take back
            await gameService.acceptTakeBack('configRoomId', part, Player.ZERO);
            // Then it should decrease the turn by two
            expect(partDAO.update).toHaveBeenCalledOnceWith('configRoomId', {
                turn: 1,
            });
        }));
    });
});
