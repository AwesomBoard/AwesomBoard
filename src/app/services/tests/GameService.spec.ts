/* eslint-disable max-lines-per-function */
import { fakeAsync, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { GameService } from '../GameService';
import { PartDAO } from 'src/app/dao/PartDAO';
import { Part, MGPResult } from 'src/app/domain/Part';
import { PartDAOMock } from 'src/app/dao/tests/PartDAOMock.spec';
import { ConfigRoomDAOMock } from 'src/app/dao/tests/ConfigRoomDAOMock.spec';
import { ChatDAOMock } from 'src/app/dao/tests/ChatDAOMock.spec';
import { ChatDAO } from 'src/app/dao/ChatDAO';
import { Player, PlayerOrNone } from 'src/app/jscaip/Player';
import { ConfigRoomDAO } from 'src/app/dao/ConfigRoomDAO';
import { ConnectedUserService } from '../ConnectedUserService';
import { ConnectedUserServiceMock } from './ConnectedUserService.spec';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { JSONValue, MGPOptional, MGPValidation, MGPValidationTestUtils } from '@everyboard/lib';
import { UserMocks } from 'src/app/domain/UserMocks.spec';
import { Subscription } from 'rxjs';
import { PlayerNumberMap } from 'src/app/jscaip/PlayerMap';
import { MinimalUser } from 'src/app/domain/MinimalUser';
import { BlankComponent } from 'src/app/utils/tests/TestUtils.spec';
import { PartMocks } from 'src/app/domain/PartMocks.spec';
import { endpoint, expectedParams } from './BackendService.spec';

describe('GameService', () => {

    let gameService: GameService;
    let partDAO: PartDAO;

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
            playerZeroElo: 0,
            playerOne: UserMocks.OPPONENT_MINIMAL_USER,
            turn: 2,
            result: MGPResult.UNACHIEVED.value,
        };
        await partDAO.set('partId', part);

        let calledCallback: boolean = false;
        const myCallback: (currentGame: MGPOptional<Part>) => void = (currentGame: MGPOptional<Part>) => {
            expect(currentGame.isPresent()).toBeTrue();
            expect(currentGame.get()).toEqual(part);
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

    describe('getGameName', () => {

        it('should fetch expected resource and extract game name', fakeAsync(async() => {
            // Given an existing game
            const response: Response = Response.json({ gameName: 'P4' });
            spyOn(window, 'fetch').and.resolveTo(response);
            const gameId: string = 'game-id';
            // When calling getGameName
            const gameName: MGPOptional<string> = await gameService.getGameName(gameId);
            // Then it should fetch the expected resource and return the game name
            expect(window.fetch).toHaveBeenCalledOnceWith(endpoint(`/game/${gameId}?onlyGameName`), expectedParams('GET'));
            expect(gameName).toEqual(MGPOptional.of('P4'));
        }));

        it('should return MGPOptional.empty if there is no corresponding game', fakeAsync(async() => {
            // Given a game id corresponding to no game
            const response: Response = Response.error();
            spyOn(window, 'fetch').and.resolveTo(response);
            const gameId: string = 'game-id';
            // When calling getGameName
            const gameName: MGPOptional<string> = await gameService.getGameName(gameId);
            // Then it should fetch the expected resource and return no game name
            expect(window.fetch).toHaveBeenCalledOnceWith(endpoint(`/game/${gameId}?onlyGameName`), expectedParams('GET'));
            expect(gameName).toEqual(MGPOptional.empty());
        }));

    });

    describe('getGameValidity', () => {

        it('should succeed with valid game', fakeAsync(async() => {
            // Given an existing game
            const gameId: string = 'gameId';
            const gameName: string = 'P4';
            const response: Response = Response.json({ gameName: 'P4' });
            spyOn(window, 'fetch').and.resolveTo(response);

            // When calling getGameValidity
            const result: MGPValidation = await gameService.getGameValidity(gameId, gameName);

            // Then it should give us a success
            MGPValidationTestUtils.expectToBeSuccess(result);
        }));

        it('should fail if the game does not exist', fakeAsync(async() => {
            // Given a game that does not exist
            const gameId: string = 'gameId';
            const gameName: string = 'P4';
            const response: Response = Response.error();
            spyOn(window, 'fetch').and.resolveTo(response);

            // When calling getGameValidity
            const result: MGPValidation = await gameService.getGameValidity(gameId, gameName);

            // Then it should have delegated to the backend and failed
            MGPValidationTestUtils.expectToBeFailure(result, 'This game does not exist!');
        }));

        it('should fail if the game is not the one we want', fakeAsync(async() => {
            // Given a game that is not the one we expect
            const gameId: string = 'gameId';
            const gameName: string = 'P4';
            const response: Response = Response.json({ gameName: 'Quarto' });
            spyOn(window, 'fetch').and.resolveTo(response);

            // When calling getGameValidity
            const result: MGPValidation = await gameService.getGameValidity(gameId, gameName);

            // Then it should have delegated to the backend and failed
            MGPValidationTestUtils.expectToBeFailure(result, 'This is the wrong game type!');
        }));
    });

    describe('createGame', () => {

        it('should fetch expected resource and extract game id', fakeAsync(async() => {
            // Given a game
            const response: Response = Response.json({ id: 'game-id' });
            spyOn(window, 'fetch').and.resolveTo(response);
            // When calling createGame
            const gameId: string = await gameService.createGame('P4');
            // Then it should fetch the expected resource and return the game id
            expect(window.fetch).toHaveBeenCalledOnceWith(endpoint('/game?gameName=P4'), expectedParams('POST'));
            expect(gameId).toEqual('game-id');
        }));

    });

    describe('deleteGame', () => {

        it('should delete the expected resource', fakeAsync(async() => {
            // Given a game
            const response: Response = Response.json({}, { status: 200 });
            spyOn(window, 'fetch').and.resolveTo(response);
            const gameId: string = 'game-id';
            // When calling deleteGame
            await gameService.deleteGame(gameId);
            // Then it should delete the resource
            expect(window.fetch).toHaveBeenCalledOnceWith(endpoint(`/game/${gameId}`), expectedParams('DELETE'));
        }));

    });


    describe('acceptConfig', () => {

        it('should POST on the expected resource', fakeAsync(async() => {
            // Given a game
            const response: Response = Response.json({}, { status: 200 });
            spyOn(window, 'fetch').and.resolveTo(response);
            const gameId: string = 'game-id';
            // When calling acceptConfig
            await gameService.acceptConfig(gameId);
            // Then it should post on the expected resource
            expect(window.fetch).toHaveBeenCalledOnceWith(endpoint(`/config-room/${gameId}?action=accept`), expectedParams('POST'));
        }));

    });

    describe('getExistingGame', () => {

        it('should fetch expected resource and extract game name', fakeAsync(async() => {
            // Given a game
            const game: Part = PartMocks.INITIAL;
            const response: Response = Response.json(game);
            spyOn(window, 'fetch').and.resolveTo(response);
            const gameId: string = 'game-id';
            // When calling getGame
            const actualGame: Part = await gameService.getExistingGame(gameId);
            // Then it should fetch the full game
            expect(window.fetch).toHaveBeenCalledOnceWith(endpoint(`/game/${gameId}`), expectedParams('GET'));
            expect(actualGame).toEqual(game);
        }));

    });

    describe('resign', () => {

        it('should POST on the expected resource', fakeAsync(async() => {
            // Given a game
            const response: Response = Response.json({}, { status: 200 });
            spyOn(window, 'fetch').and.resolveTo(response);
            const gameId: string = 'game-id';
            // When calling resign
            await gameService.resign(gameId);
            // Then it should post on the expected resource
            expect(window.fetch).toHaveBeenCalledOnceWith(endpoint(`/game/${gameId}?action=resign`), expectedParams('POST'));
        }));

    });

    describe('notifyTimeout', () => {

        it('should POST on the expected resource', fakeAsync(async() => {
            // Given a game
            const response: Response = Response.json({}, { status: 200 });
            spyOn(window, 'fetch').and.resolveTo(response);
            const gameId: string = 'game-id';
            // When calling notifyTimeout
            const winner: MinimalUser = UserMocks.CANDIDATE_MINIMAL_USER;
            const loser: MinimalUser = UserMocks.OPPONENT_MINIMAL_USER;
            await gameService.notifyTimeout(gameId, winner, loser);
            // Then it should post on the expected resource
            const winnerStr: string = encodeURIComponent(JSON.stringify(winner));
            const loserStr: string = encodeURIComponent(JSON.stringify(loser));
            const expectedEndpoint: string = endpoint(`/game/${gameId}?action=notifyTimeout&winner=${winnerStr}&loser=${loserStr}`);
            expect(window.fetch).toHaveBeenCalledOnceWith(expectedEndpoint, expectedParams('POST'));
        }));

    });


    function testSimpleAction(methodName: string, action: string): void {
        describe(methodName, () => {

            it('should POST on the expected resource', fakeAsync(async() => {
                // Given a game
                const response: Response = Response.json({}, { status: 200 });
                spyOn(window, 'fetch').and.resolveTo(response);
                const gameId: string = 'game-id';
                // When doing the action
                await gameService[methodName](gameId);
                // Then it should post on the expected resource
                expect(window.fetch).toHaveBeenCalledOnceWith(endpoint(`/game/${gameId}?action=${action}`), expectedParams('POST'));
            }));

        });
    }

    testSimpleAction('proposeDraw', 'proposeDraw');
    testSimpleAction('acceptDraw', 'acceptDraw');
    testSimpleAction('refuseDraw', 'refuseDraw');
    testSimpleAction('proposeRematch', 'proposeRematch');
    testSimpleAction('acceptRematch', 'acceptRematch');
    testSimpleAction('rejectRematch', 'rejectRematch');
    testSimpleAction('askTakeBack', 'askTakeBack');
    testSimpleAction('acceptTakeBack', 'acceptTakeBack');
    testSimpleAction('refuseTakeBack', 'refuseTakeBack');
    testSimpleAction('addGlobalTime', 'addGlobalTime');
    testSimpleAction('addTurnTime', 'addTurnTime');

    describe('addMove', () => {

        it('should POST on the expected resource', fakeAsync(async() => {
            // Given a game
            const response: Response = Response.json({}, { status: 200 });
            spyOn(window, 'fetch').and.resolveTo(response);
            const gameId: string = 'game-id';
            // When doing a move
            const move: JSONValue = { x: 1 };
            await gameService.addMove(gameId, move, MGPOptional.empty());
            // Then it should post on the expected resource
            const moveStr: string = encodeURIComponent(JSON.stringify(move));
            const expectedEndpoint: string = endpoint(`/game/${gameId}?action=move&move=${moveStr}`);
            expect(window.fetch).toHaveBeenCalledOnceWith(expectedEndpoint, expectedParams('POST'));
        }));

        it('should POST on the expected resource (with scores)', fakeAsync(async() => {
            // Given a game
            const response: Response = Response.json({}, { status: 200 });
            spyOn(window, 'fetch').and.resolveTo(response);
            const gameId: string = 'game-id';
            // When doing a move (with scores)
            const move: JSONValue = { x: 1 };
            const scores: PlayerNumberMap = PlayerNumberMap.of(0, 1);
            await gameService.addMove(gameId, move, MGPOptional.of(scores));
            // Then it should post on the expected resource
            const moveStr: string = encodeURIComponent(JSON.stringify(move));
            const expectedEndpoint: string = endpoint(`/game/${gameId}?action=move&move=${moveStr}&score0=${scores.get(Player.ZERO)}&score1=${scores.get(Player.ONE)}`);
            expect(window.fetch).toHaveBeenCalledOnceWith(expectedEndpoint, expectedParams('POST'));
        }));

    });

    describe('addMoveAndEndGame', () => {

        it('should POST on the expected resource', fakeAsync(async() => {
            // Given a game
            const response: Response = Response.json({}, { status: 200 });
            spyOn(window, 'fetch').and.resolveTo(response);
            const gameId: string = 'game-id';
            // When doing a move
            const move: JSONValue = { x: 1 };
            await gameService.addMoveAndEndGame(gameId, move, MGPOptional.empty(), PlayerOrNone.NONE);
            // Then it should post on the expected resource
            const moveStr: string = encodeURIComponent(JSON.stringify(move));
            const expectedEndpoint: string = endpoint(`/game/${gameId}?action=moveAndEnd&move=${moveStr}`);
            expect(window.fetch).toHaveBeenCalledOnceWith(expectedEndpoint, expectedParams('POST'));
        }));

        it('should POST on the expected resource (with scores)', fakeAsync(async() => {
            // Given a game
            const response: Response = Response.json({}, { status: 200 });
            spyOn(window, 'fetch').and.resolveTo(response);
            const gameId: string = 'game-id';
            // When doing a move (with scores)
            const move: JSONValue = { x: 1 };
            const scores: PlayerNumberMap = PlayerNumberMap.of(0, 1);
            await gameService.addMoveAndEndGame(gameId, move, MGPOptional.of(scores), PlayerOrNone.NONE);
            // Then it should post on the expected resource
            const moveStr: string = encodeURIComponent(JSON.stringify(move));
            const expectedEndpoint: string = endpoint(`/game/${gameId}?action=moveAndEnd&move=${moveStr}&score0=${scores.get(Player.ZERO)}&score1=${scores.get(Player.ONE)}`);
            expect(window.fetch).toHaveBeenCalledOnceWith(expectedEndpoint, expectedParams('POST'));
        }));

        it('should POST on the expected resource (with winner)', fakeAsync(async() => {
            // Given a game
            const response: Response = Response.json({}, { status: 200 });
            spyOn(window, 'fetch').and.resolveTo(response);
            const gameId: string = 'game-id';
            // When doing a move
            const move: JSONValue = { x: 1 };
            await gameService.addMoveAndEndGame(gameId, move, MGPOptional.empty(), Player.ZERO);
            // Then it should post on the expected resource
            const moveStr: string = encodeURIComponent(JSON.stringify(move));
            const expectedEndpoint: string = endpoint(`/game/${gameId}?action=moveAndEnd&move=${moveStr}&winner=0`);
            expect(window.fetch).toHaveBeenCalledOnceWith(expectedEndpoint, expectedParams('POST'));
        }));

    });

});
