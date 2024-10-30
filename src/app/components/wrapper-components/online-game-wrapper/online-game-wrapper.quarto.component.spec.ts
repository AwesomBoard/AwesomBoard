/* eslint-disable max-lines-per-function */
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { DebugElement } from '@angular/core';
import { Router } from '@angular/router';
import * as Firestore from '@firebase/firestore';
import { Timestamp } from 'firebase/firestore';

import { OnlineGameWrapperComponent, OnlineGameWrapperMessages } from './online-game-wrapper.component';
import { ConfigRoomDAO } from 'src/app/dao/ConfigRoomDAO';
import { ConfigRoom } from 'src/app/domain/ConfigRoom';
import { ConfigRoomMocks } from 'src/app/domain/ConfigRoomMocks.spec';
import { PartDAO } from 'src/app/dao/PartDAO';
import { PartMocks } from 'src/app/domain/PartMocks.spec';
import { UserDAO } from 'src/app/dao/UserDAO';
import { QuartoMove } from 'src/app/games/quarto/QuartoMove';
import { QuartoPiece } from 'src/app/games/quarto/QuartoPiece';
import { Action, GameEvent, MGPResult, Part, Reply, RequestType } from 'src/app/domain/Part';
import { JSONValue, MGPOptional, MGPValidation, Utils } from '@everyboard/lib';
import { Player, PlayerOrNone } from 'src/app/jscaip/Player';
import { CurrentGame, User } from 'src/app/domain/User';
import { ConnectedUserServiceMock } from 'src/app/services/tests/ConnectedUserService.spec';
import { QuartoComponent } from 'src/app/games/quarto/quarto.component';
import { ComponentTestUtils, expectValidRouting } from 'src/app/utils/tests/TestUtils.spec';
import { AuthUser } from 'src/app/services/ConnectedUserService';
import { GameWrapperMessages } from '../GameWrapper';
import { GameService } from 'src/app/services/GameService';
import { NextGameLoadingComponent } from '../../normal-component/next-game-loading/next-game-loading.component';
import { UserMocks } from 'src/app/domain/UserMocks.spec';
import { PartCreationComponent } from '../part-creation/part-creation.component';
import { MinimalUser } from 'src/app/domain/MinimalUser';
import { CurrentGameMocks } from 'src/app/domain/mocks/CurrentGameMocks.spec';
import { LobbyComponent } from '../../normal-component/lobby/lobby.component';
import { AbstractGameComponent } from '../../game-components/game-component/GameComponent';
import { UserService } from 'src/app/services/UserService';
import { CurrentGameService } from 'src/app/services/CurrentGameService';
import { CurrentGameServiceMock } from 'src/app/services/tests/CurrentGameService.spec';
import { OGWCTimeManagerService } from './OGWCTimeManagerService';
import { GameStatus } from 'src/app/jscaip/GameStatus';
import { RulesConfig, RulesConfigUtils } from 'src/app/jscaip/RulesConfigUtil';
import { IFirestoreDAO } from 'src/app/dao/FirestoreDAO';

export type PreparationResult<T extends AbstractGameComponent> = {
    testUtils: ComponentTestUtils<T, MinimalUser>;
    role: PlayerOrNone;
}

export async function prepareMockDBContent(initialConfigRoom: ConfigRoom): Promise<void> {
    const partDAO: PartDAO = TestBed.inject(PartDAO);
    const configRoomDAO: ConfigRoomDAO = TestBed.inject(ConfigRoomDAO);
    const userDAO: UserDAO = TestBed.inject(UserDAO);
    await configRoomDAO.set('configRoomId', initialConfigRoom);
    await partDAO.set('configRoomId', PartMocks.INITIAL);
    await userDAO.set(UserMocks.OPPONENT_AUTH_USER.id, UserMocks.OPPONENT);
    await userDAO.set(UserMocks.CREATOR_AUTH_USER.id, UserMocks.CREATOR);
    const OBSERVER: User = {
        username: 'jeanJaja',
        lastUpdateTime: new Timestamp(Date.now() / 1000, Date.now() % 1000),
        verified: true,
        currentGame: null,
    };
    const USER_OBSERVER: AuthUser = new AuthUser('obs3rv3eDu8012',
                                                 MGPOptional.ofNullable(OBSERVER.username),
                                                 MGPOptional.of('observer@home'),
                                                 true);
    await userDAO.set(USER_OBSERVER.id, OBSERVER);
    return;
}

export type PreparationOptions = {
    shorterGlobalClock: boolean;
    waitForPartToStart: boolean;
    runClocks: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-redeclare
export namespace PreparationOptions {

    export const def: PreparationOptions = {
        shorterGlobalClock: false,
        waitForPartToStart: true,
        runClocks: true,
    };

    export const dontWait: PreparationOptions = {
        ...def,
        waitForPartToStart: false,
    };

    export const shortGlobalClock: PreparationOptions = {
        ...def,
        shorterGlobalClock: true,
    };

    export const withoutClocks: PreparationOptions = {
        ...def,
        runClocks: false,
    };

    export const dontWaitNoClocks: PreparationOptions = {
        ...dontWait,
        runClocks: false,
    };

}

export async function addCandidate(candidate: MinimalUser): Promise<void> {
    const configRoomDAO: ConfigRoomDAO = TestBed.inject(ConfigRoomDAO);
    return configRoomDAO.subCollectionDAO('configRoomId', 'candidates').set(candidate.id, candidate);
}

export async function prepareStartedGameFor<T extends AbstractGameComponent>(
    user: AuthUser,
    game: string,
    preparationOptions: PreparationOptions = PreparationOptions.def)
: Promise<PreparationResult<T>>
{
    const rulesConfig: MGPOptional<RulesConfig> = RulesConfigUtils.getGameDefaultConfig(game);
    const testUtils: ComponentTestUtils<T, MinimalUser> = await ComponentTestUtils.basic(game);
    await prepareMockDBContent(ConfigRoomMocks.getInitial(rulesConfig));
    ConnectedUserServiceMock.setUser(user);
    testUtils.prepareFixture(OnlineGameWrapperComponent);
    if (preparationOptions.runClocks === false) {
        spyOn(TestBed.inject(OGWCTimeManagerService), 'resumeClocks').and.callFake(async() => {});
    }
    testUtils.detectChanges();
    tick(0);

    const partCreationId: DebugElement = testUtils.findElement('#partCreation');
    expect(partCreationId).withContext('partCreation id should be present after ngOnInit').toBeTruthy();
    await addCandidate(UserMocks.OPPONENT_MINIMAL_USER);
    testUtils.detectChanges();
    const configRoomDAO: ConfigRoomDAO = TestBed.inject(ConfigRoomDAO);
    await configRoomDAO.update('configRoomId', ConfigRoomMocks.withChosenOpponent(rulesConfig));
    testUtils.detectChanges();
    let role: PlayerOrNone = PlayerOrNone.NONE;
    if (user.id === UserMocks.CREATOR_AUTH_USER.id) {
        role = Player.ZERO;
    } else if (user.id === UserMocks.OPPONENT_AUTH_USER.id) {
        role = Player.ONE;
    }
    let configRoom: ConfigRoom = ConfigRoomMocks.withProposedConfig(rulesConfig);
    await configRoomDAO.update('configRoomId', configRoom);
    testUtils.detectChanges();
    if (preparationOptions.shorterGlobalClock === true) {
        configRoom = { ...configRoom, totalPartDuration: 10 };
        await configRoomDAO.update('configRoomId', {
            totalPartDuration: 10,
        });
    }
    const gameService: GameService = TestBed.inject(GameService);
    await gameService.acceptConfig('configRoomId');
    testUtils.detectChanges();
    if (preparationOptions.waitForPartToStart === true) {
        tick(2);
        testUtils.detectChanges();
        testUtils.bindGameComponent();
        testUtils.prepareSpies();
    }
    return { testUtils, role };
}

describe('OnlineGameWrapperComponent of Quarto:', () => {

    //
    // component construction (beforeEach)
    // stage 0
    // ngOnInit (triggered by detectChanges)
    // stage 1: PartCreationComponent appear
    // startGame, launched by user if game was not started yet, or automatically (via partCreationComponent)
    // stage 2: PartCreationComponent dissapear, game component appear
    // tick(0): the async part of startGame is now finished
    // stage 3: P4Component appear
    // differents scenarios

    let testUtils: ComponentTestUtils<QuartoComponent, MinimalUser>;
    let wrapper: OnlineGameWrapperComponent;
    let partDAO: PartDAO;
    let eventsDAO: IFirestoreDAO<GameEvent>;
    let gameService: GameService;

    const OBSERVER: User = {
        username: 'jeanJaja',
        lastUpdateTime: new Timestamp(Date.now() / 1000, Date.now() % 1000),
        verified: true,
        currentGame: null,
    };
    const USER_OBSERVER: AuthUser = new AuthUser('obs3rv3eDu8012',
                                                 MGPOptional.ofNullable(OBSERVER.username),
                                                 MGPOptional.of('observer@home'),
                                                 true);

    let role: PlayerOrNone;

    const FIRST_MOVE: QuartoMove = new QuartoMove(0, 3, QuartoPiece.BABB);
    const SECOND_MOVE: QuartoMove = new QuartoMove(2, 3, QuartoPiece.ABBA);
    const THIRD_MOVE: QuartoMove = new QuartoMove(3, 3, QuartoPiece.BABA);
    const FOURTH_MOVE: QuartoMove = new QuartoMove(3, 0, QuartoPiece.BBAA);

    const FIRST_MOVE_ENCODED: JSONValue = QuartoMove.encoder.encode(FIRST_MOVE);
    const SECOND_MOVE_ENCODED: JSONValue = QuartoMove.encoder.encode(SECOND_MOVE);
    const THIRD_MOVE_ENCODED: JSONValue = QuartoMove.encoder.encode(THIRD_MOVE);
    const FOURTH_MOVE_ENCODED: JSONValue = QuartoMove.encoder.encode(FOURTH_MOVE);

    async function doMoveByClicks(move: QuartoMove): Promise<void> {
        await testUtils.expectClickSuccess(`#click-coord-${ move.coord.x }-${ move.coord.y }`);
        await testUtils.expectMoveSuccess('#click-piece-' + move.piece.value, move);
    }

    function userFromPlayer(player: Player): MinimalUser {
        if (player === Player.ZERO) {
            return UserMocks.CREATOR_MINIMAL_USER;
        } else {
            return UserMocks.OPPONENT_MINIMAL_USER;
        }
    }

    async function receiveRequest(player: Player, request: RequestType): Promise<void> {
        // As we are mocking the DAO, we can directly add the request ourselves
        // In practice, we should receive this from the other player.
        await eventsDAO.create({
            eventType: 'Request',
            time: Date.now(),
            user: userFromPlayer(player),
            requestType: request,
        });
        testUtils.detectChanges();
    }

    async function receiveReply(player: Player, reply: Reply, request: RequestType, data?: JSONValue): Promise<void> {
        // As we are mocking the DAO, we can directly add the reply ourselves
        // In practice, we should receive this from the other player.
        await eventsDAO.create({
            eventType: 'Reply',
            time: Date.now(),
            user: userFromPlayer(player),
            requestType: request,
            reply,
            data,
        });
        testUtils.detectChanges();
        tick();
    }

    async function receiveAction(player: Player, action: Action): Promise<void> {
        // As we are mocking the DAO, we can directly add the action ourselves
        // In practice, we should receive this from the other player.
        await eventsDAO.create({
            eventType: 'Action',
            time: Date.now(),
            user: userFromPlayer(player),
            action,
        });
        testUtils.detectChanges();
        tick(0);
    }

    async function receivePartDAOUpdate(update: Partial<Part>, detectChanges: boolean = true): Promise<void> {
        // As we are mocking the DAO, we can directly change the part ourselves
        // In practice, we should receive this from the other player.
        await partDAO.update('configRoomId', update);
        if (detectChanges) {
            testUtils.detectChanges();
        }
        tick(0);
    }

    async function askTakeBack(): Promise<void> {
        await testUtils.clickElement('#proposeTakeBack');
        tick(0);
    }

    async function acceptTakeBack(): Promise<void> {
        await testUtils.clickElement('#accept');
        tick(0);
    }

    async function refuseTakeBack(): Promise<void> {
        return await testUtils.clickElement('#reject');
    }

    async function receiveNewMoves(initialTurn: number,
                                   newMoves: JSONValue[],
                                   detectChanges: boolean = true)
    : Promise<void>
    {
        const update: Partial<Part> = {
            turn: initialTurn + newMoves.length,
        };
        let currentPlayer: Player = Player.of(initialTurn % 2);
        for (const move of newMoves) {
            await eventsDAO.create({
                eventType: 'Move',
                time: Date.now(),
                user: userFromPlayer(currentPlayer),
                move,
            });
            currentPlayer = currentPlayer.getOpponent();
        }
        return await receivePartDAOUpdate(update, detectChanges);
    }

    async function prepareTestUtilsFor(authUser: AuthUser,
                                       options?: PreparationOptions)
    : Promise<void>
    {
        const preparationResult: PreparationResult<QuartoComponent> =
            await prepareStartedGameFor<QuartoComponent>(authUser, 'Quarto', options);
        testUtils = preparationResult.testUtils;
        role = preparationResult.role;
        partDAO = TestBed.inject(PartDAO);
        eventsDAO = partDAO.subCollectionDAO('configRoomId', 'events');
        gameService = TestBed.inject(GameService);
        wrapper = testUtils.getWrapper() as OnlineGameWrapperComponent;
    }

    async function prepareBoard(moves: QuartoMove[], player: Player = Player.ZERO): Promise<void> {
        let authUser: AuthUser;
        if (player === Player.ONE) {
            authUser = UserMocks.OPPONENT_AUTH_USER;
        } else {
            authUser = UserMocks.CREATOR_AUTH_USER;
        }
        await prepareTestUtilsFor(authUser);
        let offset: number = 0;
        let turn: number = 0;
        if (player === Player.ONE) {
            offset = 1;
            const firstMove: QuartoMove = moves[0];
            const encodedMove: JSONValue = QuartoMove.encoder.encode(firstMove);
            await receiveNewMoves(turn, [encodedMove]);
            turn += 1;
        }
        for (let i: number = offset; i < moves.length; i+=2) {
            const move: QuartoMove = moves[i];
            await doMoveByClicks(moves[i]);
            const newMoves: JSONValue[] = [
                QuartoMove.encoder.encode(move),
                QuartoMove.encoder.encode(moves[i+1]),
            ];
            await receiveNewMoves(turn, newMoves);
            turn += 2;
        }
    }

    function expectGameToBeOver(): void {
        expect(wrapper.chronoZeroGlobal.isIdle())
            .withContext(`chrono zero global should be idle (${ wrapper.chronoZeroGlobal.remainingMs })`)
            .toBeTrue();
        expect(wrapper.chronoZeroTurn.isIdle())
            .withContext(`chrono zero turn should be idle ${ wrapper.chronoZeroTurn.remainingMs }`)
            .toBeTrue();
        expect(wrapper.chronoOneGlobal.isIdle())
            .withContext(`chrono one global should be idle ${ wrapper.chronoOneGlobal.remainingMs }`)
            .toBeTrue();
        expect(wrapper.chronoOneTurn.isIdle())
            .withContext(`chrono one turn should be idle ${ wrapper.chronoOneTurn.remainingMs }`)
            .toBeTrue();
        expect(wrapper.endGame)
            .withContext('game should be ended')
            .toBeTrue();
    }

    async function prepareStartedGameWithMoves(encodedMoves: JSONValue[], waitForPartToStart: boolean = true)
    : Promise<void>
    {
        // 1. Creating the mocks and testUtils but NOT component
        await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER, PreparationOptions.dontWait);
        // 2. Setting the db with the encodedMoves including
        await prepareMoves(encodedMoves);
        // 3. Setting the component and making it start like it would
        if (waitForPartToStart) {
            tick(2);
        }
    }

    async function prepareMoves(encodedMoves: JSONValue[]): Promise<void> {
        let offset: number = 0;
        let turn: number = 0;
        if (role === Player.ONE) {
            offset = 1;
            const encodedMove: JSONValue = encodedMoves[0];
            await receiveNewMoves(turn, [encodedMove], false);
            turn += 1;
        }
        for (let i: number = offset; i < encodedMoves.length; i++) {
            await receiveNewMoves(turn, [encodedMoves[i]], false);
            turn += 1;
        }
        wrapper = testUtils.getWrapper() as OnlineGameWrapperComponent;
        testUtils.detectChanges();
        tick(0);
    }

    type DaoFunction<T> = (id: string, update: Firestore.UpdateData<T>) => Promise<void>;

    function setPartDAOUpdateBackup(daoFunction: DaoFunction<Part>): void {
        // eslint-disable-next-line dot-notation
        partDAO['updateBackup'] = daoFunction;
    }

    it('should be able to prepare a started game for creator', fakeAsync(async() => {
        await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER, PreparationOptions.withoutClocks);
        expect(Utils.getNonNullable(wrapper.currentUser).name).toEqual('creator');
    }));

    it('should no longer have PartCreationComponent and QuartoComponent instead', fakeAsync(async() => {
        // Given an online game being created
        await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER, PreparationOptions.dontWait);
        testUtils.expectElementNotToExist('#partCreation');
        testUtils.expectElementNotToExist('app-quarto');

        testUtils.expectElementNotToExist('#partCreation');
        expect(testUtils.getGameComponent())
            .withContext('gameComponent field should be absent after config accepted and async ms finished')
            .toBeFalsy();

        // When the component initializes
        tick(2);
        testUtils.detectChanges();

        // Then the game component should become present in the component
        testUtils.expectElementToExist('app-quarto');
        expect(wrapper.gameComponent)
            .withContext('gameComponent field should also be present after config accepted and async millisecond finished')
            .toBeTruthy();
        tick(wrapper.configRoom.maximalMoveDuration * 1000);
    }));

    it('should allow sending and receiving moves (creator)', fakeAsync(async() => {
        // Given a started part
        await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER);

        // When doing a move
        await doMoveByClicks(FIRST_MOVE);
        // Then the part should be updated
        expect(wrapper.currentPart?.data.turn).toEqual(1);

        // And when receiving a second move
        await receiveNewMoves(1, [SECOND_MOVE_ENCODED]);
        // Then the part should also be updated
        expect(wrapper.currentPart?.data.turn).toEqual(2);

        tick(wrapper.configRoom.maximalMoveDuration * 1000);
    }));

    describe('Animation', () => {
        it(`should trigger animation when receiving opponent's move`, fakeAsync(async() => {
            // Given a board where it's the opponent's turn
            await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER);
            await doMoveByClicks(FIRST_MOVE);

            // When receiving opponent's move
            spyOn(testUtils.getGameComponent(), 'updateBoard').and.callThrough();
            await receiveNewMoves(1, [SECOND_MOVE_ENCODED]);

            // Then gameComponent.updateBoard should have been called with true, to show animation
            expect(testUtils.getGameComponent().updateBoard).toHaveBeenCalledOnceWith(true);
            tick(wrapper.configRoom.maximalMoveDuration * 1000);
        }));

        it(`should not trigger animation when receiving your own move`, fakeAsync(async() => {
            // Given a board where it's player's turn
            await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER);

            // When doing you move
            spyOn(testUtils.getGameComponent(), 'updateBoard').and.callThrough();
            await doMoveByClicks(FIRST_MOVE);

            // Then gameComponent.updateBoard should have been called with false
            expect(testUtils.getGameComponent().updateBoard).toHaveBeenCalledOnceWith(false);
            tick(wrapper.configRoom.maximalMoveDuration * 1000);
        }));

        it(`should not trigger animation when receiving several moves`, fakeAsync(async() => {
            // Given a board where you arrive late
            const encodedMoves: JSONValue[] = [
                FIRST_MOVE_ENCODED,
                SECOND_MOVE_ENCODED,
                THIRD_MOVE_ENCODED,
                FOURTH_MOVE_ENCODED,
            ];
            await prepareStartedGameWithMoves(encodedMoves, false);
            let numberOfCall: number = 0;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            spyOn<any>(testUtils.getWrapper(), 'onReceivedMove').and.callFake((_: any, isLastMoveOfBatch: boolean) => {
                numberOfCall++;
                // Then only once move should have been animated
                if (numberOfCall === 4) {
                    expect(isLastMoveOfBatch).withContext('last call should have been true').toBeTrue();
                } else {
                    expect(isLastMoveOfBatch).withContext('first calls should have been false').toBeFalse();
                }
            });

            // When receiving several pairs of moves
            tick(2);

            // Finish the part (the real Then is in the callback of onReceivedMove)
            tick(wrapper.configRoom.maximalMoveDuration * 1000);
        }));
    });

    it('should allow sending and receiving moves (opponent)', fakeAsync(async() => {
        // Given a started part
        await prepareTestUtilsFor(UserMocks.OPPONENT_AUTH_USER);

        // When receiving a move
        await receiveNewMoves(0, [FIRST_MOVE_ENCODED]);
        // Then the part should be updated
        expect(wrapper.currentPart?.data.turn).toEqual(1);

        // And when doing a second move
        await doMoveByClicks(SECOND_MOVE);
        // Then the part should also be updated
        expect(wrapper.currentPart?.data.turn).toEqual(2);

        tick(wrapper.configRoom.maximalMoveDuration * 1000);
    }));

    describe('Late Arrival', () => {
        it('should allow user to arrive late on the game (on their turn)', fakeAsync(async() => {
            // Given a part that has already started (moves have been done)
            await prepareStartedGameWithMoves([FIRST_MOVE_ENCODED, SECOND_MOVE_ENCODED], false);

            // When arriving and playing
            tick(2);

            // Then the new move should be done
            expect(testUtils.getWrapper().gameComponent.getState().turn).toBe(2);
            tick(wrapper.configRoom.maximalMoveDuration * 1000);
        }));

        it('should allow user to arrive late on the game (not on their turn)', fakeAsync(async() => {
            // Given a part that has already started (moves have been done)
            await prepareStartedGameWithMoves([FIRST_MOVE_ENCODED, SECOND_MOVE_ENCODED, THIRD_MOVE_ENCODED], false);

            // When arriving and playing
            tick(2);

            // Then the new move should be done
            expect(testUtils.getWrapper().gameComponent.getState().turn).toBe(3);
            tick(wrapper.configRoom.maximalMoveDuration * 1000);
        }));
    });

    describe('Component initialization', () => {
        it('should mark creator as Player when arriving', fakeAsync(async() => {
            // Given a component that is not initialized yet
            await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER, PreparationOptions.dontWait);

            // When component is initialized
            const currentGameService: CurrentGameService = TestBed.inject(CurrentGameService);
            spyOn(currentGameService, 'updateCurrentGame').and.callThrough();
            tick(2);
            testUtils.detectChanges();

            // Then updateCurrentGame should have been called as Player
            const update: Partial<CurrentGame> = {
                id: 'configRoomId',
                typeGame: 'Quarto',
                opponent: null,
                role: 'Player',
            };
            expect(currentGameService.updateCurrentGame).toHaveBeenCalledOnceWith(update);
            tick(wrapper.configRoom.maximalMoveDuration * 1000);
        }));

        it('should mark chosen opponent as Player when arriving', fakeAsync(async() => {
            // Given a component that is not initialized yet
            await prepareTestUtilsFor(UserMocks.OPPONENT_AUTH_USER, PreparationOptions.dontWait);

            // When component is initialized
            const currentGameService: CurrentGameService = TestBed.inject(CurrentGameService);
            spyOn(currentGameService, 'updateCurrentGame').and.callThrough();
            tick(2);
            testUtils.detectChanges();

            // Then updateCurrentGame should have been called as Player
            const update: Partial<CurrentGame> = {
                id: 'configRoomId',
                typeGame: 'Quarto',
                opponent: UserMocks.CREATOR_MINIMAL_USER,
                role: 'Player',
            };
            expect(currentGameService.updateCurrentGame).toHaveBeenCalledOnceWith(update);
            tick(wrapper.configRoom.maximalMoveDuration * 1000);
        }));

        it('should show player names', fakeAsync(async() => {
            // Given a started game
            await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER, PreparationOptions.dontWait);

            // When initializing the component
            tick(2);
            testUtils.detectChanges();

            // Then the usernames should be shown
            testUtils.expectElementToExist('#playerZeroIndicator');
            const playerIndicator: HTMLElement = testUtils.findElement('#playerZeroIndicator').nativeElement;
            expect(playerIndicator.innerText).toBe(UserMocks.CREATOR_AUTH_USER.username.get());
            testUtils.expectElementToExist('#playerOneIndicator');
            const opponentIndicator: HTMLElement = testUtils.findElement('#playerOneIndicator').nativeElement;
            expect(opponentIndicator.innerText).toBe(UserMocks.OPPONENT_AUTH_USER.username.get());

            tick(wrapper.configRoom.maximalMoveDuration * 1000);
        }));
    });

    it('should trigger part change and send the move upon second move', fakeAsync(async() => {
        // Given a part
        await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER);
        spyOn(gameService, 'addMove').and.callThrough();
        // When playing a move
        await doMoveByClicks(FIRST_MOVE);
        // Then it should send the move
        expect(gameService.addMove).toHaveBeenCalledOnceWith('configRoomId', FIRST_MOVE_ENCODED, MGPOptional.empty());
        tick(wrapper.configRoom.maximalMoveDuration * 1000);
    }));

    it('should forbid making a move when it is not the turn of the player', fakeAsync(async() => {
        // Given a game
        await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER);

        // When it is not the player's turn (because he made the first move)
        await doMoveByClicks(FIRST_MOVE);

        // Then the player cannot play
        await testUtils.expectToDisplayGameMessage(GameWrapperMessages.NOT_YOUR_TURN(), async() => {
            await testUtils.clickElement('#click-coord-0-0');
        });

        tick(wrapper.configRoom.maximalMoveDuration * 1000);
    }));

    it('should allow player to pass when gameComponent allows it', fakeAsync(async() => {
        // Given a game where it is possible to pass
        await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER);
        testUtils.expectElementToBeDisabled('#pass');

        wrapper.gameComponent.canPass = true;
        spyOn(wrapper.gameComponent, 'pass').and.resolveTo(MGPValidation.SUCCESS);
        testUtils.detectChanges();

        // When clicking on the pass button
        testUtils.expectElementToBeEnabled('#pass');
        await testUtils.clickElement('#pass');

        // Then it should pass
        expect(wrapper.gameComponent.pass).toHaveBeenCalledOnceWith();
        tick(wrapper.configRoom.maximalMoveDuration * 1000);
    }));

    describe('CurrentGame Change', () => {

        it('should redirect to lobby when role and partId change', fakeAsync(async() => {
            // Given a part where the user is observer
            await prepareTestUtilsFor(USER_OBSERVER, PreparationOptions.withoutClocks);

            // When currentGame is updated to inform component that user is now candidate in a game
            const router: Router = TestBed.inject(Router);
            spyOn(router, 'navigate').and.resolveTo();
            const currentGame: CurrentGame = CurrentGameMocks.OTHER_CANDIDATE;
            CurrentGameServiceMock.setCurrentGame(MGPOptional.of(currentGame));

            // Then a redirection to lobby should be triggered
            expectValidRouting(router, ['/lobby'], LobbyComponent);
        }));

        it('should not redirect to lobby when role stay "observer" but partId change', fakeAsync(async() => {
            // Given a part where the user is observer
            await prepareTestUtilsFor(USER_OBSERVER, PreparationOptions.withoutClocks);

            // When currentGame is updated to inform component that user is now candidate in a game
            const router: Router = TestBed.inject(Router);
            spyOn(router, 'navigate').and.resolveTo();
            const currentGame: CurrentGame = CurrentGameMocks.OTHER_OBSERVER;
            CurrentGameServiceMock.setCurrentGame(MGPOptional.of(currentGame));

            // Then a redirection to lobby should not have been triggered
            expect(router.navigate).not.toHaveBeenCalled();
            tick(wrapper.configRoom.maximalMoveDuration * 1000);
        }));

        it('should not do anything particular when observer leaves this part from another tab', fakeAsync(async() => {
            // Given a part where the user is observer
            await prepareTestUtilsFor(USER_OBSERVER, PreparationOptions.withoutClocks);

            // When currentGame is updated to inform component that user stopped observing some part in another tab
            const router: Router = TestBed.inject(Router);
            spyOn(router, 'navigate').and.resolveTo();
            CurrentGameServiceMock.setCurrentGame(MGPOptional.empty());

            // Then nothing special should have happened, including no redirection
            // Though compo.currentGame should have been locally changed
            expect(router.navigate).not.toHaveBeenCalled();
            expect(wrapper['currentGame']).toEqual(MGPOptional.empty());
            tick(wrapper.configRoom.maximalMoveDuration * 1000);
        }));

    });

    describe('Move victory', () => {
        it('should notifyVictory when active player wins', fakeAsync(async() => {
            // Given a board on which user can win
            await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER);
            spyOn(wrapper.gameComponent.rules, 'getGameStatus').and.returnValue(GameStatus.ZERO_WON);
            testUtils.expectElementNotToExist('#winnerIndicator');

            // When doing winning move
            let partDAOCalled: boolean = false;
            setPartDAOUpdateBackup(partDAO.update);
            spyOn(partDAO, 'update').and.callFake(async(id: string, update: Part) => {
                expect(update.winner).toBe(UserMocks.CREATOR_MINIMAL_USER);
                expect(update.loser).toBe(UserMocks.OPPONENT_MINIMAL_USER);
                expect(update.result).toBe(MGPResult.VICTORY.value);
                partDAOCalled = true;
                return partDAO['updateBackup'](id, update);
            });
            await doMoveByClicks(FIRST_MOVE);
            // the call to the serverTimeMock() is very close to the update
            // hence, the second update got called while the first update was executing
            tick(1000);

            // Then the game should be a victory
            expect(wrapper.gameComponent.node.previousMove.get()).toEqual(FIRST_MOVE);
            expect(partDAOCalled).toBeTrue(); // Ensure the check on update has passed and succeed
            testUtils.detectChanges();
            testUtils.expectElementToExist('#youWonIndicator');
            expectGameToBeOver();
        }));

        it('should notifyVictory when active player loses', fakeAsync(async() => {
            // Given a board on which user can lose on their turn
            await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER);
            spyOn(wrapper.gameComponent.rules, 'getGameStatus').and.returnValue(GameStatus.ONE_WON);
            testUtils.expectElementNotToExist('#youLostIndicator');

            // When doing losing move
            let partDAOCalled: boolean = false;
            setPartDAOUpdateBackup(partDAO.update);
            spyOn(partDAO, 'update').and.callFake(async(id: string, update: Part) => {
                expect(update.winner).toBe(UserMocks.OPPONENT_MINIMAL_USER);
                expect(update.loser).toBe(UserMocks.CREATOR_MINIMAL_USER);
                expect(update.result).toBe(MGPResult.VICTORY.value);
                partDAOCalled = true;
                return partDAO['updateBackup'](id, update);
            });
            await doMoveByClicks(FIRST_MOVE);
            // the call to the serverTimeMock() is very close to the update
            // hence, the second update got called while the first update was executing
            tick(1000);

            // Then the game should be a victory
            expect(wrapper.gameComponent.node.previousMove.get()).toEqual(FIRST_MOVE);
            expect(partDAOCalled).toBeTrue(); // Ensure the check on update has passed and succeed
            testUtils.detectChanges();
            testUtils.expectElementToExist('#youLostIndicator');
            expectGameToBeOver();
        }));

        it('should removeCurrentGame when one player wins', fakeAsync(async() => {
            // Given a board on which user can win
            await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER);
            spyOn(wrapper.gameComponent.rules, 'getGameStatus').and.returnValue(GameStatus.ZERO_WON);
            testUtils.expectElementNotToExist('#winnerIndicator');

            // When doing winning move
            const currentGameService: CurrentGameService = TestBed.inject(CurrentGameService);
            spyOn(currentGameService, 'removeCurrentGame').and.callThrough();
            await doMoveByClicks(FIRST_MOVE);
            // the call to the serverTimeMock() is very close to the update
            // hence, the second update got called while the first update was executing
            tick(1000);
            testUtils.detectChanges();

            // Then removeCurrentGame should have been called
            expect(currentGameService.removeCurrentGame).toHaveBeenCalledOnceWith();
            expectGameToBeOver();
        }));

        it('should notifyDraw when a draw move from player is done', fakeAsync(async() => {
            // Given a board on which user can draw
            await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER);
            spyOn(wrapper.gameComponent.rules, 'getGameStatus').and.returnValue(GameStatus.DRAW);
            testUtils.expectElementNotToExist('#winnerIndicator');

            // When doing drawing move
            let partDAOCalled: boolean = false;
            setPartDAOUpdateBackup(partDAO.update);
            spyOn(partDAO, 'update').and.callFake(async(id: string, update: Part) => {
                expect(update.result).toBe(MGPResult.HARD_DRAW.value);
                partDAOCalled = true;
                return partDAO['updateBackup'](id, update);
            });
            await doMoveByClicks(FIRST_MOVE);
            tick(1000); // When time arrive too quickly after the move_without_time started
            testUtils.detectChanges();

            // Then the game should be a draw
            expect(wrapper.gameComponent.node.previousMove.get()).toEqual(FIRST_MOVE);
            expect(partDAOCalled).toBeTrue(); // Ensure the check on update has passed and succeed
            testUtils.expectElementToExist('#hardDrawIndicator');
            expectGameToBeOver();
        }));

        it('should removeCurrentGame when players draw', fakeAsync(async() => {
            // Given a board on which user can draw
            await prepareBoard([new QuartoMove(0, 0, QuartoPiece.AAAB)], Player.ONE);
            spyOn(wrapper.gameComponent.rules, 'getGameStatus').and.returnValue(GameStatus.DRAW);
            testUtils.expectElementNotToExist('#winnerIndicator');

            // When doing drawing move
            const currentGameService: CurrentGameService = TestBed.inject(CurrentGameService);
            spyOn(currentGameService, 'removeCurrentGame').and.callThrough();
            await doMoveByClicks(FIRST_MOVE);

            // Then removeCurrentGame should have been called
            expect(currentGameService.removeCurrentGame).toHaveBeenCalledOnceWith();
            expectGameToBeOver();
        }));
    });

    describe('Take Back', () => {

        describe('sending/receiving', () => {

            it('should send take back request when player asks to', fakeAsync(async() => {
                // Given a board where its the opponent's (first) turn
                await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER);
                await doMoveByClicks(FIRST_MOVE);

                // When asking to take back
                spyOn(gameService, 'askTakeBack').and.callThrough();
                await askTakeBack();

                // Then a request should be sent
                expect(gameService.askTakeBack).toHaveBeenCalledOnceWith('configRoomId');
                tick(wrapper.configRoom.maximalMoveDuration * 1000);
            }));

            it('should not allow to propose take back after it has been proposed', fakeAsync(async() => {
                // Given a board where a move has been made
                await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER, PreparationOptions.withoutClocks);
                await doMoveByClicks(FIRST_MOVE);

                // When asking to take back
                await askTakeBack();
                tick(0);
                testUtils.detectChanges();

                // Then it should not be possible to ask a second time
                testUtils.expectElementToBeDisabled('#proposeTakeBack');
            }));

            it('should not propose to Player.ONE to take back before any move', fakeAsync(async() => {
                // Given a board where nobody already played
                await prepareTestUtilsFor(UserMocks.OPPONENT_AUTH_USER, PreparationOptions.withoutClocks);
                // When displaying the page
                // Then the take back button should not be there
                testUtils.expectElementToBeDisabled('#proposeTakeBack');
            }));

            it('should not propose to Player.ONE to take back before their first move', fakeAsync(async() => {
                // Given a board where nobody already played
                await prepareTestUtilsFor(UserMocks.OPPONENT_AUTH_USER, PreparationOptions.withoutClocks);
                // When receiving a new move
                await receiveNewMoves(0, [FIRST_MOVE_ENCODED]);
                // Then the take back button should not be there
                testUtils.expectElementToBeDisabled('#proposeTakeBack');
            }));

            it('should only propose to accept take back when opponent asked', fakeAsync(async() => {
                // Given a board where opponent did not ask to take back and where both player could have ask
                await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER);
                await doMoveByClicks(FIRST_MOVE);
                await receiveNewMoves(1, [SECOND_MOVE_ENCODED]);

                // accepting take back should not be proposed
                testUtils.expectElementNotToExist('#acceptTakeBack');
                await receiveRequest(Player.ONE, 'TakeBack');

                // Then should allow it after proposing sent
                await acceptTakeBack();
                testUtils.detectChanges();

                // and then again not allowing it
                testUtils.expectElementNotToExist('#acceptTakeBack');
                tick(wrapper.configRoom.maximalMoveDuration * 1000);
            }));

            it('should remove take back rejection button after it has been rejected', fakeAsync(async() => {
                // Given a board with previous move
                await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER);
                await doMoveByClicks(FIRST_MOVE);
                await receiveNewMoves(1, [SECOND_MOVE_ENCODED]);
                testUtils.expectElementNotToExist('#refuseTakeBack');
                await receiveRequest(Player.ONE, 'TakeBack');
                spyOn(gameService, 'refuseTakeBack').and.callThrough();

                // When refusing take back
                await refuseTakeBack();
                testUtils.detectChanges();

                // Then a TakeBack rejection reply should have been sent
                testUtils.expectElementNotToExist('#refuseTakeBack');
                expect(gameService.refuseTakeBack).toHaveBeenCalledOnceWith('configRoomId');

                tick(wrapper.configRoom.maximalMoveDuration * 1000);
            }));

            it('should not allow player to play while take back request is waiting for them', fakeAsync(async() => {
                // Given a component where a take back request is waiting for user
                await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER);
                await doMoveByClicks(FIRST_MOVE);
                await receiveNewMoves(1, [SECOND_MOVE_ENCODED]);
                await receiveRequest(Player.ONE, 'TakeBack');

                // When ignoring it and trying to play
                const reason: string = OnlineGameWrapperMessages.MUST_ANSWER_REQUEST();

                // Then it should fail
                testUtils.resetSpies();
                await testUtils.expectClickFailure('#click-coord-0-0', reason);
                tick(wrapper.configRoom.maximalMoveDuration * 1000);
            }));

            it('should cancel take back request when take back requester do a move', fakeAsync(async() => {
                // Given an initial board where a take back request has been done by user
                await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER);
                await doMoveByClicks(FIRST_MOVE);
                await receiveNewMoves(1, [SECOND_MOVE_ENCODED]);
                await askTakeBack();

                // When doing move while waiting for answer
                spyOn(gameService, 'addMove').and.callThrough();
                await doMoveByClicks(THIRD_MOVE);

                // Then the move should be sent
                expect(gameService.addMove).toHaveBeenCalledWith('configRoomId', THIRD_MOVE_ENCODED, MGPOptional.empty());
                tick(wrapper.configRoom.maximalMoveDuration * 1000);
            }));

            it('should forbid player to ask take back again after refusal', fakeAsync(async() => {
                await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER);
                await doMoveByClicks(FIRST_MOVE);
                await askTakeBack();
                await receiveReply(Player.ONE, 'Reject', 'TakeBack');

                testUtils.expectElementToBeDisabled('#proposeTakeBack');

                tick(wrapper.configRoom.maximalMoveDuration * 1000);
            }));

        });

        describe('opponent given take back during their turn', () => {

            it('should move board back two turns', fakeAsync(async() => {
                // Given an initial board where it's opponent second turn, and opponent asked for take back
                await prepareTestUtilsFor(UserMocks.OPPONENT_AUTH_USER, PreparationOptions.withoutClocks);
                await receiveNewMoves(0, [FIRST_MOVE_ENCODED]);
                await doMoveByClicks(SECOND_MOVE);
                await receiveRequest(Player.ZERO, 'TakeBack');
                expect(wrapper.gameComponent.getTurn()).toBe(2);

                // When accepting opponent's take back
                await acceptTakeBack();

                // Then turn should be changed to 0
                const opponentTurnDiv: DebugElement = testUtils.findElement('#currentPlayerIndicator');
                expect(opponentTurnDiv.nativeElement.innerText).toBe(`It is creator's turn.`);
                expect(wrapper.gameComponent.getTurn()).toBe(0);
                tick(wrapper.configRoom.maximalMoveDuration * 1000);
            }));

            it(`should preserve opponent's clocks to what it was before asking take back`, fakeAsync(async() => {
                // Given an initial board where it's opponent second turn, and opponent asked for take back
                await prepareTestUtilsFor(UserMocks.OPPONENT_AUTH_USER);
                await receiveNewMoves(0, [FIRST_MOVE_ENCODED]);
                await doMoveByClicks(SECOND_MOVE);
                await receiveRequest(Player.ZERO, 'TakeBack');
                const globalTimeBeforeTakeBack: number = wrapper.chronoZeroGlobal.remainingMs;
                const turnTimeBeforeTakeBack: number = wrapper.chronoZeroTurn.remainingMs;

                // When accepting opponent's take back
                await acceptTakeBack();

                // Then opponents chrono should have continued to decrease
                tick(1000); // wait a bit to ensure time is decreasing
                const globalTimeAfterTakeBack: number = wrapper.chronoZeroGlobal.remainingMs;
                const turnTimeAfterTakeBack: number = wrapper.chronoZeroTurn.remainingMs;
                expect(globalTimeAfterTakeBack).toBeLessThan(globalTimeBeforeTakeBack);
                expect(turnTimeAfterTakeBack).toBeLessThan(turnTimeBeforeTakeBack);
                tick(wrapper.configRoom.maximalMoveDuration * 1000);
            }));

        });

        describe('opponent given take back during user turn', () => {

            it('should move board back one turn', fakeAsync(async() => {
                // Given an initial board where it's user's (first) turn, and opponent asked for take back
                await prepareTestUtilsFor(UserMocks.OPPONENT_AUTH_USER);
                await receiveNewMoves(0, [FIRST_MOVE_ENCODED]);
                await receiveRequest(Player.ZERO, 'TakeBack');
                expect(wrapper.gameComponent.getTurn()).toBe(1);

                // When accepting opponent's take back
                await acceptTakeBack();
                testUtils.detectChanges();

                // Then turn should be changed to 0
                const opponentTurnDiv: DebugElement = testUtils.findElement('#currentPlayerIndicator');
                expect(opponentTurnDiv.nativeElement.innerText).toBe(`It is creator's turn.`);
                expect(wrapper.gameComponent.getTurn()).toBe(0);
                tick(wrapper.configRoom.maximalMoveDuration * 1000);
            }));

            it(`should resumeCountDown for opponent`, fakeAsync(async() => {
                // Given an initial board where it's user's (first) turn, and opponent asked for take back
                await prepareTestUtilsFor(UserMocks.OPPONENT_AUTH_USER);
                await receiveNewMoves(0, [FIRST_MOVE_ENCODED]);
                await receiveRequest(Player.ZERO, 'TakeBack');
                testUtils.detectChanges();

                // When accepting opponent's take back
                spyOn(wrapper.chronoZeroGlobal, 'resume').and.callThrough();
                await acceptTakeBack();

                // Then count down should be resumed for opponent and user should receive their decision time back
                expect(wrapper.chronoZeroGlobal.resume).toHaveBeenCalledOnceWith();

                tick(wrapper.configRoom.maximalMoveDuration * 1000);
            }));

        });

        describe('User given take back during their turn', () => {

            it('should move board back two turns', fakeAsync(async() => {
                // Given an initial board where it's user (second) turn, and user just asked for take back
                await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER);
                await doMoveByClicks(FIRST_MOVE);
                await receiveNewMoves(1, [SECOND_MOVE_ENCODED]);
                await askTakeBack();
                expect(wrapper.gameComponent.getTurn()).toBe(2);

                // When opponent accepts user's take back
                spyOn(wrapper.chronoZeroGlobal, 'resume').and.callThrough();
                await receiveReply(Player.ONE, 'Accept', 'TakeBack');
                const opponentTurnDiv: DebugElement = testUtils.findElement('#currentPlayerIndicator');
                expect(opponentTurnDiv.nativeElement.innerText).toBe(`It is your turn.`);
                tick(0);

                // Then turn should be changed to 0 and resumeCountDown be called
                expect(wrapper.chronoZeroGlobal.resume).toHaveBeenCalledOnceWith();
                expect(wrapper.gameComponent.getTurn()).toBe(0);
                tick(wrapper.configRoom.maximalMoveDuration * 1000);
            }));

            it(`should do alternative move afterwards without taking back move time off (during user's turn)`, fakeAsync(async() => {
                // Given an initial board where user was authorized to take back
                await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER);
                await doMoveByClicks(FIRST_MOVE);
                await receiveNewMoves(1, [SECOND_MOVE_ENCODED]);
                await askTakeBack();
                testUtils.detectChanges();
                await receiveReply(Player.ONE, 'Accept', 'TakeBack');
                await receivePartDAOUpdate({ turn: 0 }); // go back to turn 0
                tick(0);

                // When playing an alternative move
                spyOn(partDAO, 'update').and.callThrough();
                spyOn(gameService, 'addMove').and.callThrough();
                const alternativeMove: QuartoMove = new QuartoMove(2, 3, QuartoPiece.BBBA);
                const alternativeMoveEncoded: JSONValue = QuartoMove.encoder.encode(alternativeMove);
                await doMoveByClicks(alternativeMove);

                // Then partDAO should be updated, and move should be sent
                expect(partDAO.update).toHaveBeenCalledOnceWith('configRoomId', { turn: 1 });
                expect(gameService.addMove).toHaveBeenCalledOnceWith('configRoomId', alternativeMoveEncoded, MGPOptional.empty());
                tick(wrapper.configRoom.maximalMoveDuration * 1000);
            }));

        });

        describe('User given take back during opponent turn', () => {

            it('should move board back one turn and update current turn', fakeAsync(async() => {
                // Given an initial board where it's opponent's [second] turn, and user just asked for take back
                await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER);
                await doMoveByClicks(FIRST_MOVE);
                await askTakeBack();
                expect(wrapper.gameComponent.getTurn()).toBe(1);

                // When opponent accept user's take back
                await receiveReply(Player.ONE, 'Accept', 'TakeBack');
                const opponentTurnDiv: DebugElement = testUtils.findElement('#currentPlayerIndicator');
                expect(opponentTurnDiv.nativeElement.innerText).toBe(`It is your turn.`);

                // Then turn should be changed to 0
                expect(wrapper.gameComponent.getTurn()).toBe(0);
                tick(wrapper.configRoom.maximalMoveDuration * 1000);
            }));

            it(`should resume clock for user`, fakeAsync(async() => {
                // Given an initial board where it's opponent's [second] turn, and user just asked for take back
                await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER);
                await doMoveByClicks(FIRST_MOVE);
                spyOn(wrapper.chronoOneGlobal, 'resume').and.callThrough();
                await askTakeBack();

                // When opponent accept user's take back
                await receiveReply(Player.ONE, 'Accept', 'TakeBack');

                // Then count down should be resumed and update not changing time
                expect(wrapper.chronoOneGlobal.resume).toHaveBeenCalledOnceWith();
                tick(wrapper.configRoom.maximalMoveDuration * 1000);
            }));

            it('should do alternative move afterwards without taking back move time off (during opponent turn)', fakeAsync(async() => {
                // Given an initial board where opponent just took back a move
                await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER);
                await doMoveByClicks(FIRST_MOVE);
                await askTakeBack();
                await receiveReply(Player.ONE, 'Accept', 'TakeBack');
                await receivePartDAOUpdate({ turn: 0 }); // go back to turn 0

                // When playing an alernative move
                spyOn(partDAO, 'update').and.callThrough();
                spyOn(gameService, 'addMove').and.callThrough();
                const alternativeMove: QuartoMove = new QuartoMove(2, 3, QuartoPiece.BBBA);
                const alternativeMoveEncoded: JSONValue = QuartoMove.encoder.encode(alternativeMove);
                await doMoveByClicks(alternativeMove);

                // Then partDAO should be updated, and move should be sent
                expect(partDAO.update).toHaveBeenCalledOnceWith('configRoomId', { turn: 1 });
                expect(gameService.addMove)
                    .toHaveBeenCalledOnceWith('configRoomId', alternativeMoveEncoded, MGPOptional.empty());
                tick(wrapper.configRoom.maximalMoveDuration * 1000);
            }));

        });
        it('should call cancelMoveAttempt', fakeAsync(async() => {
            // Given an initial board where it's opponent's [second] turn, and user just asked for take back
            await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER);
            await doMoveByClicks(FIRST_MOVE);
            await askTakeBack();

            // When opponent accept user's take back
            spyOn(testUtils.getGameComponent(), 'cancelMoveAttempt').and.callThrough();
            await receiveReply(Player.ONE, 'Accept', 'TakeBack');

            // Then cancelMoveAttempt should have been called
            expect(testUtils.getGameComponent().cancelMoveAttempt).toHaveBeenCalledOnceWith();
            tick(wrapper.configRoom.maximalMoveDuration * 1000);
        }));

    });

    describe('Agreed Draw', () => {

        it('should send draw request when player asks to', fakeAsync(async() => {
            // Given any board
            await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER);
            spyOn(gameService, 'proposeDraw').and.callThrough();

            // When clicking the propose draw button
            await testUtils.clickElement('#proposeDraw');

            // Then a draw request should have been sent
            expect(gameService.proposeDraw).toHaveBeenCalledOnceWith('configRoomId');
            tick(wrapper.configRoom.maximalMoveDuration * 1000);
        }));

        it('should forbid to propose to draw while draw request is waiting', fakeAsync(async() => {
            // Given a page where we sent a draw request
            await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER);
            await testUtils.clickElement('#proposeDraw');

            // When displaying it
            testUtils.detectChanges();

            // Then it should not allow us to propose a second draw
            testUtils.expectElementToBeDisabled('#proposeDraw');

            tick(wrapper.configRoom.maximalMoveDuration * 1000);
        }));

        it('should forbid to click while draw request is waiting', fakeAsync(async() => {
            // Given a page where we received a draw request
            await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER);
            await receiveRequest(Player.ONE, 'Draw');
            testUtils.detectChanges();

            // When ignoring it and trying to play
            const reason: string = OnlineGameWrapperMessages.MUST_ANSWER_REQUEST();

            // Then it should fail
            await testUtils.expectClickFailure('#click-coord-0-0', reason);
            tick(wrapper.configRoom.maximalMoveDuration * 1000);
        }));

        it('should forbid to propose to draw after refusal', fakeAsync(async() => {
            // Given a page where we sent a draw request
            await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER);
            await testUtils.clickElement('#proposeDraw');
            tick(0);

            // When it is rejected
            await receiveReply(Player.ONE, 'Reject', 'Draw');

            // Then we cannot request to draw anymore
            testUtils.expectElementToBeDisabled('#proposeDraw');

            tick(wrapper.configRoom.maximalMoveDuration * 1000);
        }));

        it('should finish the game after accepting a proposed draw', fakeAsync(async() => {
            // Given a part on which a draw has been proposed
            await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER);
            await receiveRequest(Player.ONE, 'Draw');
            spyOn(gameService, 'acceptDraw').and.callThrough();
            testUtils.detectChanges();

            // When accepting the draw
            await testUtils.clickElement('#accept');

            // Then the draw is being accepted
            expect(gameService.acceptDraw).toHaveBeenCalledOnceWith('configRoomId');
            tick(0);
            testUtils.detectChanges();
            testUtils.expectElementToExist('#youAgreedToDrawIndicator');
            expectGameToBeOver();
            tick(wrapper.configRoom.maximalMoveDuration * 1000);
        }));

        it('should finish the game when opponent accepts our proposed draw', fakeAsync(async() => {
            // Given a gameComponent where draw has been proposed
            await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER);
            await testUtils.clickElement('#proposeDraw');
            tick(0);

            // When draw is accepted
            spyOn(partDAO, 'update').and.callThrough();
            await receivePartDAOUpdate({
                result: MGPResult.AGREED_DRAW_BY_ONE.value,
            });
            await receiveAction(Player.ONE, 'EndGame');

            // Then game should be over
            expectGameToBeOver();
            testUtils.expectElementToExist('#yourOpponentAgreedToDrawIndicator');
            expect(partDAO.update).toHaveBeenCalledTimes(1);
        }));

        it('should removeCurrentGame when opponent accepts our proposed draw', fakeAsync(async() => {
            // Given a gameComponent where draw has been proposed
            await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER);
            await testUtils.clickElement('#proposeDraw');
            tick(0);

            // When draw is accepted
            const currentGameService: CurrentGameService = TestBed.inject(CurrentGameService);
            spyOn(currentGameService, 'removeCurrentGame').and.callThrough();
            await receivePartDAOUpdate({
                result: MGPResult.AGREED_DRAW_BY_ONE.value,
            });
            await receiveAction(Player.ONE, 'EndGame');
            tick(0);

            // Then removeCurrentGame should have been called
            expect(currentGameService.removeCurrentGame).toHaveBeenCalledOnceWith();
            expectGameToBeOver();
        }));

        it('should send refusal when player asks to', fakeAsync(async() => {
            await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER);
            await receiveRequest(Player.ONE, 'Draw');

            spyOn(gameService, 'refuseDraw').and.callThrough();

            await testUtils.clickElement('#reject');
            expect(gameService.refuseDraw).toHaveBeenCalledOnceWith('configRoomId');

            tick(wrapper.configRoom.maximalMoveDuration * 1000);
        }));

        it('should only propose to accept/refuse draw when asked', fakeAsync(async() => {
            await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER);
            testUtils.expectElementNotToExist('#accept');
            testUtils.expectElementNotToExist('#reject');
            await receiveRequest(Player.ONE, 'Draw');

            testUtils.expectElementToExist('#accept');
            testUtils.expectElementToExist('#reject');

            tick(wrapper.configRoom.maximalMoveDuration * 1000);
        }));
    });

    describe('End Game Time Management', () => {
        it(`should stop player's global clock when turn reaches end`, fakeAsync(async() => {
            await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER);
            spyOn(wrapper, 'reachedOutOfTime').and.callThrough();
            spyOn(wrapper.chronoZeroGlobal, 'stop').and.callThrough();
            tick(wrapper.configRoom.maximalMoveDuration * 1000);
            expect(wrapper.reachedOutOfTime).toHaveBeenCalledOnceWith(Player.ZERO);
            expect(wrapper.chronoZeroGlobal.stop).toHaveBeenCalledOnceWith();
        }));

        it(`should stop player's turn clock when global clock reaches end`, fakeAsync(async() => {
            await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER, PreparationOptions.shortGlobalClock);
            spyOn(wrapper, 'reachedOutOfTime').and.callThrough();
            spyOn(wrapper.chronoZeroTurn, 'stop').and.callThrough();
            tick(wrapper.configRoom.maximalMoveDuration * 1000);
            expect(wrapper.reachedOutOfTime).toHaveBeenCalledOnceWith(Player.ZERO);
            expect(wrapper.chronoZeroTurn.stop).toHaveBeenCalledOnceWith();
        }));

        it(`should stop opponent's global clock when turn reaches end`, fakeAsync(async() => {
            // Given an online game where it's the opponent's turn
            await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER);
            await doMoveByClicks(FIRST_MOVE);
            spyOn(wrapper, 'reachedOutOfTime').and.callThrough();
            spyOn(wrapper.chronoOneGlobal, 'stop').and.callThrough();

            // When he reach time out
            tick(wrapper.configRoom.maximalMoveDuration * 1000);

            // Then it should be considered as a timeout
            expect(wrapper.reachedOutOfTime).toHaveBeenCalledOnceWith(Player.ONE);
            expect(wrapper.chronoOneGlobal.stop).toHaveBeenCalledOnceWith();
        }));

        it(`should stop opponent's local clock when global clock reaches end`, fakeAsync(async() => {
            // Given an online game where it's the opponent's turn
            await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER, PreparationOptions.shortGlobalClock);
            await doMoveByClicks(FIRST_MOVE);
            spyOn(wrapper, 'reachedOutOfTime').and.callThrough();
            spyOn(wrapper.chronoOneTurn, 'stop').and.callThrough();

            // When he reach time out
            tick(wrapper.configRoom.maximalMoveDuration * 1000);

            // Then it should be considered as a timeout
            expect(wrapper.reachedOutOfTime).toHaveBeenCalledOnceWith(Player.ONE);
            expect(wrapper.chronoOneTurn.stop).toHaveBeenCalledOnceWith();
        }));

        it(`should notifyTimeout for opponent if they are considered offline`, fakeAsync(async() => {
            // Given an online game where it's the opponent's turn and opponent is offline
            await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER);
            await doMoveByClicks(FIRST_MOVE);
            spyOn(wrapper, 'reachedOutOfTime').and.callThrough();
            spyOn(wrapper.chronoOneGlobal, 'stop').and.callThrough();
            spyOn(partDAO, 'update').and.callThrough();

            // When opponent reach time out locally
            tick(wrapper.configRoom.maximalMoveDuration * 1000);

            // Then it should be considered as a timeout
            expect(wrapper.reachedOutOfTime).toHaveBeenCalledOnceWith(Player.ONE);
            expect(wrapper.chronoOneGlobal.stop).toHaveBeenCalledOnceWith();
            expect(partDAO.update).toHaveBeenCalledOnceWith('configRoomId', {
                winner: UserMocks.CREATOR_MINIMAL_USER,
                loser: UserMocks.OPPONENT_MINIMAL_USER,
                result: MGPResult.TIMEOUT.value,
            });
        }));
    });

    describe('Add time feature', () => {
        describe('from creator', () => {
            async function prepareStartedGameForCreator(): Promise<void> {
                await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER);
            }
            function waitTimeout(): void {
                const msUntilTimeout: number = (wrapper.configRoom.maximalMoveDuration + 30) * 1000;
                tick(msUntilTimeout);
            }
            it('should allow to add turn time to opponent', fakeAsync(async() => {
                // Given an onlineGameComponent
                await prepareStartedGameForCreator();
                spyOn(gameService, 'addTurnTime').and.callThrough();

                // When creator adds turn time to the opponent
                await wrapper.addTurnTime();

                // Then an add turn time action is generated
                expect(gameService.addTurnTime).toHaveBeenCalledOnceWith('configRoomId');
                waitTimeout();
            }));
            it('should resume both clocks at once when adding turn time', fakeAsync(async() => {
                // Given an onlineGameComponent
                await prepareStartedGameForCreator();
                spyOn(wrapper.chronoZeroGlobal, 'resume').and.callThrough();
                spyOn(wrapper.chronoZeroTurn, 'resume').and.callThrough();

                // When receiving a request to add local time to player zero
                await receiveAction(Player.ZERO, 'AddTurnTime');

                // Then both clocks of player zero should have been resumed
                expect(wrapper.chronoZeroGlobal.resume).toHaveBeenCalledTimes(1);
                expect(wrapper.chronoZeroTurn.resume).toHaveBeenCalledTimes(1);
                waitTimeout();
            }));
            it('should add turn time when receiving AddTurnTime action from Player.ONE', fakeAsync(async() => {
                // Given an onlineGameComponent
                await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER);
                spyOn(partDAO, 'update').and.callThrough();

                // When receiving AddTurnTime action from player one
                await receiveAction(Player.ONE, 'AddTurnTime');

                // Then the turn time of player zero should be increased
                const msUntilTimeout: number = (wrapper.configRoom.maximalMoveDuration + 30) * 1000;
                // it should be around 2 minutes + 30 seconds
                // (minus the drift it took to process the event, usually 1 or 2ms)
                expect(wrapper.chronoZeroTurn.remainingMs).toBeGreaterThan(msUntilTimeout - 10);
                expect(wrapper.chronoZeroTurn.remainingMs).toBeLessThanOrEqual(msUntilTimeout);
                tick(msUntilTimeout);
            }));
            it('should add turn time when receiving AddTurnTime action from Player.ZERO', fakeAsync(async() => {
                // Given an onlineGameComponent on user turn
                await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER);
                spyOn(partDAO, 'update').and.callThrough();

                // When receiving AddTurnTime action from player zero
                await receiveAction(Player.ZERO, 'AddTurnTime');

                // Then the turn time of player one should be increased
                const msUntilTimeout: number = (wrapper.configRoom.maximalMoveDuration + 30) * 1000;
                expect(wrapper.chronoOneTurn.remainingMs).toBe(msUntilTimeout); // initial 2 minutes + 30 sec
                tick(msUntilTimeout);
            }));
            it('should allow to add global time to opponent (as Player.ZERO)', fakeAsync(async() => {
                // Given an onlineGameComponent on user's turn
                await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER);
                spyOn(gameService, 'addGlobalTime').and.callThrough();

                // When the player adds global time to the opponent
                await wrapper.addGlobalTime();

                // Then a request to add global time to player one should be sent
                expect(gameService.addGlobalTime).toHaveBeenCalledOnceWith('configRoomId');
                const msUntilTimeout: number = wrapper.configRoom.maximalMoveDuration * 1000;
                expect(wrapper.chronoOneTurn.remainingMs).toBe(msUntilTimeout); // initial 2 minutes
                tick(msUntilTimeout);
            }));
            it('should add time to global clock when receiving AddGlobalTime action from Player.ONE', fakeAsync(async() => {
                // Given an onlineGameComponent on user's turn
                await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER);
                spyOn(partDAO, 'update').and.callThrough();

                // When receiving addGlobalTime request
                await receiveAction(Player.ONE, 'AddGlobalTime');

                // Then chrono global of player one should be increased by 5 new minutes
                const msUntilTimeout: number = (30 * 60 * 1000) + (5 * 60 * 1000);
                expect(wrapper.chronoZeroGlobal.remainingMs).toBeGreaterThan(msUntilTimeout - 10);
                expect(wrapper.chronoZeroGlobal.remainingMs).toBeLessThanOrEqual(msUntilTimeout);
                tick(wrapper.configRoom.maximalMoveDuration * 1000);
            }));
            it('should add time to global clock when receiving the AddGlobalTime action from Player.ZERO', fakeAsync(async() => {
                // Given an onlineGameComponent
                await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER);

                // When receiving addGlobalTime request
                await receiveAction(Player.ZERO, 'AddGlobalTime');

                // Then chrono global of player one should be increased by 5 new minutes
                expect(wrapper.chronoOneGlobal.remainingMs).toBe((30 * 60 * 1000) + (5 * 60 * 1000));
                tick(wrapper.configRoom.maximalMoveDuration * 1000);
            }));
            it('should postpone the timeout of chrono and not only change displayed time', fakeAsync(async() => {
                // Given an onlineGameComponent
                await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER);

                // When receiving an AddTurnTime action
                await receiveAction(Player.ONE, 'AddTurnTime');
                testUtils.detectChanges();

                // Then game should end by timeout only after new time has run out
                tick(wrapper.configRoom.maximalMoveDuration * 1000);
                expect(testUtils.getWrapper().endGame).withContext('game should not be finished yet').toBeFalse();
                tick(30 * 1000);
                expectGameToBeOver();
            }));
        });
        describe('opponent', () => {
            it('should allow to add global time to opponent (as Player.ONE)', fakeAsync(async() => {
                // Given an onlineGameComponent on opponent's turn
                await prepareTestUtilsFor(UserMocks.OPPONENT_AUTH_USER);
                spyOn(gameService, 'addGlobalTime').and.callThrough();

                // When countDownComponent emit addGlobalTime
                await wrapper.addGlobalTime();

                // Then a request to add global time to player zero should be sent
                expect(gameService.addGlobalTime).toHaveBeenCalledOnceWith('configRoomId');

                const msUntilTimeout: number = wrapper.configRoom.maximalMoveDuration * 1000;
                tick(msUntilTimeout);
            }));
        });
    });

    describe('User "handshake"', () => {
        // Disabled because we don't have a way to check the connectivity status currently
        xit(`should make opponent's name lightgrey when he is token-outdated`, fakeAsync(async() => {
            // Given a connected opponent
            await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER);

            // When the opponent token become too old
            // Creator update his last presence token
            const userService: UserService = TestBed.inject(UserService);
            await userService.updatePresenceToken(UserMocks.CREATOR_AUTH_USER.id);
            // but chosenOpponent don't update his last presence token
            tick(PartCreationComponent.TOKEN_TIMEOUT); // two token time pass and reactive the timeout
            testUtils.detectChanges();

            // Then opponent's name should be lightgrey
            testUtils.expectElementToHaveClass('#playerOneIndicator', 'has-text-grey-light');
            tick(wrapper.configRoom.maximalMoveDuration * 1000 + 1);
        }));
    });

    describe('Resign', () => {
        it('should end game after clicking on resign button', fakeAsync(async() => {
            // Given an online game component
            await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER);
            await doMoveByClicks(FIRST_MOVE);

            // When clicking on resign button
            spyOn(partDAO, 'update').and.callThrough();
            await testUtils.clickElement('#resign');
            tick(0);

            // Then the game should be ended
            expect(partDAO.update).toHaveBeenCalledOnceWith('configRoomId', {
                winner: UserMocks.OPPONENT_MINIMAL_USER,
                loser: UserMocks.CREATOR_MINIMAL_USER,
                result: MGPResult.RESIGN.value,
            });
            expectGameToBeOver();
        }));

        it('should not allow player to move after resigning', fakeAsync(async() => {
            // Given a component where user has resigned
            await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER);
            await testUtils.clickElement('#resign');
            tick(0);

            // When attempting a move
            // Then it should fail
            spyOn(partDAO, 'update').and.callThrough();
            await testUtils.expectClickFailure('#click-piece-1', GameWrapperMessages.GAME_HAS_ENDED());

            expect(partDAO.update).not.toHaveBeenCalled();
            expectGameToBeOver();
        }));

        it('should display when the opponent resigned', fakeAsync(async() => {
            // Given a board where the opponent has resigned
            await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER);
            await doMoveByClicks(FIRST_MOVE);
            await receiveNewMoves(1, [SECOND_MOVE_ENCODED]);
            await receivePartDAOUpdate({
                winner: UserMocks.CREATOR_MINIMAL_USER,
                loser: UserMocks.OPPONENT_MINIMAL_USER,
                result: MGPResult.RESIGN.value,
            });
            await receiveAction(Player.ONE, 'EndGame');

            // When checking "victory text"
            const resignText: string = testUtils.findElement('#resignIndicator').nativeElement.innerText;

            // Then we should see "opponent has resign"
            expect(resignText).toBe(`firstCandidate has resigned.`);
            expectGameToBeOver();
        }));

        it('should removeCurrentGame when the opponent resigned', fakeAsync(async() => {
            // Given a board where user has resign
            await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER);
            await doMoveByClicks(FIRST_MOVE);
            await receiveNewMoves(1, [SECOND_MOVE_ENCODED]);

            // When receiving opponents submission to our greatness and recognition as overlord of their land
            const currentGameService: CurrentGameService = TestBed.inject(CurrentGameService);
            spyOn(currentGameService, 'removeCurrentGame').and.callThrough();
            await receivePartDAOUpdate({
                winner: UserMocks.CREATOR_MINIMAL_USER,
                loser: UserMocks.OPPONENT_MINIMAL_USER,
                result: MGPResult.RESIGN.value,
            });
            await receiveAction(Player.ONE, 'EndGame');

            // Then removeCurrentGame should be called
            expect(currentGameService.removeCurrentGame).toHaveBeenCalledOnceWith();
            expectGameToBeOver();
        }));
    });

    describe('rematch', () => {

        it('should show propose button only when game is ended', fakeAsync(async() => {
            // Given a game that is not finished
            await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER, PreparationOptions.withoutClocks);
            testUtils.expectElementToBeDisabled('#proposeRematch');

            // When it is finished
            await testUtils.expectInterfaceClickSuccess('#resign', undefined, 0);

            // Then it should allow to propose rematch
            testUtils.expectElementToBeEnabled('#proposeRematch');
        }));

        it('should send proposal request when proposing', fakeAsync(async() => {
            // Given an ended game
            await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER, PreparationOptions.withoutClocks);
            await testUtils.expectInterfaceClickSuccess('#resign');
            tick(0);
            testUtils.detectChanges();

            // When the propose rematch button is clicked
            gameService = TestBed.inject(GameService);
            spyOn(gameService, 'proposeRematch').and.callThrough();
            await testUtils.expectInterfaceClickSuccess('#proposeRematch');

            // Then the gameService must be called
            expect(gameService.proposeRematch).toHaveBeenCalledOnceWith('configRoomId');
        }));

        it('should disable button after proposing', fakeAsync(async() => {
            // Given an ended game
            await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER, PreparationOptions.withoutClocks);
            await testUtils.expectInterfaceClickSuccess('#resign');
            tick(0);
            testUtils.detectChanges();

            // When the propose rematch button is clicked
            spyOn(gameService, 'proposeRematch').and.callThrough();
            await testUtils.expectInterfaceClickSuccess('#proposeRematch');

            // Then the button should be disabled
            testUtils.expectElementToBeDisabled('#proposeRematch');
        }));

        it('should send reply when rejecting', fakeAsync(async() => {
            // Given an ended game with a received proposal request
            await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER, PreparationOptions.withoutClocks);
            await testUtils.expectInterfaceClickSuccess('#resign');
            await receiveRequest(Player.ONE, 'Rematch');
            tick(0);
            testUtils.detectChanges();
            gameService = TestBed.inject(GameService);
            spyOn(gameService, 'rejectRematch').and.callThrough();

            // When the reject rematch button is clicked
            await testUtils.expectInterfaceClickSuccess('#reject');

            // Then the gameService's rejectRematch must be called
            expect(gameService.rejectRematch).toHaveBeenCalledOnceWith('configRoomId');
        }));

        it('should show when opponent rejected our rematch proposal', fakeAsync(async() => {
            // Given an ended game where we propose a rematch
            await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER, PreparationOptions.withoutClocks);
            await testUtils.expectInterfaceClickSuccess('#resign');
            tick(0);
            testUtils.detectChanges();
            await testUtils.expectInterfaceClickSuccess('#proposeRematch');
            tick(0);

            // When the rematch is rejected by the opponent
            await receiveReply(Player.ONE, 'Reject', 'Rematch');

            // Then we should be notified
            testUtils.expectElementToExist('#requestRejected');
        }));

        it('should show accept/reject button when proposition has been sent', fakeAsync(async() => {
            // Given an ended game
            await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER, PreparationOptions.withoutClocks);
            await testUtils.expectInterfaceClickSuccess('#resign');
            tick(0);
            testUtils.detectChanges();

            // When request is received
            testUtils.expectElementNotToExist('#accept');
            await receiveRequest(Player.ONE, 'Rematch');

            // Then accept/refuse buttons must be shown
            testUtils.detectChanges();
            testUtils.expectElementToExist('#accept');
        }));

        it('should send accepting request when user accept rematch', fakeAsync(async() => {
            // give a part with rematch request send by opponent
            await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER, PreparationOptions.withoutClocks);
            await testUtils.expectInterfaceClickSuccess('#resign');
            await receiveRequest(Player.ONE, 'Rematch');

            // When accepting it
            const router: Router = TestBed.inject(Router);
            spyOn(router, 'navigate').and.resolveTo();
            gameService = TestBed.inject(GameService);
            spyOn(gameService, 'acceptRematch').and.callThrough();
            tick(0);
            testUtils.detectChanges();
            await testUtils.expectInterfaceClickSuccess('#accept');

            // Then it should have called acceptRematch
            expect(gameService.acceptRematch).toHaveBeenCalledTimes(1);
        }));

        it('should redirect to new part when rematch is accepted', fakeAsync(async() => {
            // Given a part lost with rematch request send by user
            await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER, PreparationOptions.withoutClocks);

            await testUtils.expectInterfaceClickSuccess('#resign');
            tick(0);
            testUtils.detectChanges();
            await testUtils.expectInterfaceClickSuccess('#proposeRematch');

            // When opponent accepts it
            const router: Router = TestBed.inject(Router);
            spyOn(router, 'navigate').and.resolveTo();
            await receiveReply(Player.ONE, 'Accept', 'Rematch', 'nextPartId');
            await receiveAction(Player.ONE, 'EndGame');

            // Then it should redirect to new part
            expectValidRouting(router, ['/nextGameLoading'], NextGameLoadingComponent, { otherRoutes: true });
            expectValidRouting(router, ['/play', 'Quarto', 'nextPartId'], OnlineGameWrapperComponent, { otherRoutes: true });
        }));
    });

    describe('Non Player Experience', () => {
        it('should mark user as Observer when arriving', fakeAsync(async() => {
            // Given a component that is not initialized yet
            await prepareTestUtilsFor(USER_OBSERVER, PreparationOptions.dontWaitNoClocks);

            // When component is initialized
            const currentGameService: CurrentGameService = TestBed.inject(CurrentGameService);
            spyOn(currentGameService, 'updateCurrentGame').and.callThrough();
            tick(2);
            testUtils.detectChanges();

            // Then updateCurrentGame should have been called as Observer
            const update: Partial<CurrentGame> = {
                id: 'configRoomId',
                opponent: UserMocks.CREATOR_MINIMAL_USER,
                typeGame: 'Quarto',
                role: 'Observer',
            };
            expect(currentGameService.updateCurrentGame).toHaveBeenCalledOnceWith(update);
            tick(wrapper.configRoom.maximalMoveDuration * 1000);
        }));

        it('should remove currentGame when leaving the component', fakeAsync(async() => {
            // Given a part component where user is observer
            await prepareTestUtilsFor(USER_OBSERVER, PreparationOptions.withoutClocks);

            // When user leaves the component (here, destroys it)
            const currentGameService: CurrentGameService = TestBed.inject(CurrentGameService);
            spyOn(currentGameService, 'removeCurrentGame').and.callThrough();
            testUtils.destroy();

            // Then the currentGame should have been removed
            expect(currentGameService.removeCurrentGame).toHaveBeenCalledOnceWith();
        }));

        it('should redirect to lobby when currentGame changed to non-observer', fakeAsync(async() => {
            // Given a part component where user is observer
            await prepareTestUtilsFor(USER_OBSERVER, PreparationOptions.withoutClocks);

            // When currentGame is updated to inform component that user is now candidate in another game
            const router: Router = TestBed.inject(Router);
            spyOn(router, 'navigate').and.resolveTo();
            const currentGame: CurrentGame = CurrentGameMocks.OTHER_CANDIDATE;
            CurrentGameServiceMock.setCurrentGame(MGPOptional.of(currentGame));

            // Then the currentGame should have been removed
            expectValidRouting(router, ['/lobby'], LobbyComponent);
        }));

        it('should not removeCurrentGame when destroying component after currentGame changed to non-observer', fakeAsync(async() => {
            // Given a part component where user was observer
            // Then receive an update telling that user is now non-observer-elsewhere
            await prepareTestUtilsFor(USER_OBSERVER);
            const currentGameService: CurrentGameService = TestBed.inject(CurrentGameService);
            spyOn(currentGameService, 'removeCurrentGame').and.callThrough();
            const currentGame: CurrentGame = CurrentGameMocks.OTHER_CANDIDATE;
            CurrentGameServiceMock.setCurrentGame(MGPOptional.of(currentGame));

            // When destroying the component (should normally be triggered once router is triggered)
            testUtils.destroy();

            // Then the currentGame should have been removed
            expect(currentGameService.removeCurrentGame).not.toHaveBeenCalled();
        }));

        it('should not be able to do anything', fakeAsync(async() => {
            // Given a part that we are observing
            await prepareTestUtilsFor(USER_OBSERVER, PreparationOptions.withoutClocks);
            // which has already some moves
            await receiveNewMoves(0, [FIRST_MOVE_ENCODED, SECOND_MOVE_ENCODED]);
            // and a request
            await receiveRequest(Player.ZERO, 'TakeBack');
            // When displaying the component
            // Then we don't see any interaction button
            const forbiddenButtons: string[] = [
                '#proposeTakeBack',
                '#proposeDraw',
                '#resign',
                '#accept',
                '#reject',
            ];
            for (const forbiddenButton of forbiddenButtons) {
                testUtils.expectElementNotToExist(forbiddenButton);
            }
        }));

        it('should display that the game is a draw', fakeAsync(async() => {
            // Given a part that the two players agreed to draw
            await prepareTestUtilsFor(USER_OBSERVER, PreparationOptions.withoutClocks);
            await receiveRequest(Player.ZERO, 'Draw');
            await receivePartDAOUpdate({
                result: MGPResult.AGREED_DRAW_BY_ONE.value,
            });
            await receiveReply(Player.ONE, 'Accept', 'Draw');
            await receiveAction(Player.ONE, 'EndGame');
            testUtils.detectChanges();
            tick(0);

            // When displaying the board
            // Then the text should indicate players have agreed to draw
            testUtils.expectElementToExist('#playersAgreedToDraw');
            expectGameToBeOver();
        }));

        it('should not notify timeout victory', fakeAsync(async() => {
            // Given a part where we are observer
            await prepareTestUtilsFor(USER_OBSERVER, PreparationOptions.withoutClocks);
            spyOn(gameService, 'notifyTimeout').and.callThrough();
            // When a player times out
            await wrapper.reachedOutOfTime(Player.ZERO);
            // Then we should not notify the timeout
            expect(gameService.notifyTimeout).not.toHaveBeenCalled();
        }));
        describe('Animation', () => {
            it(`should trigger animation when receiving player move (observer)`, fakeAsync(async() => {
                // Given any turn
                await prepareTestUtilsFor(USER_OBSERVER, PreparationOptions.withoutClocks);

                // When receiving players's move
                spyOn(testUtils.getGameComponent(), 'updateBoard').and.callThrough();
                await receiveNewMoves(0, [FIRST_MOVE_ENCODED]);

                // Then gameComponent.updateBoard should have been called with true, to show animation
                expect(testUtils.getGameComponent().updateBoard).toHaveBeenCalledOnceWith(true);
                tick(wrapper.configRoom.maximalMoveDuration * 1000);
            }));
        });
    });

    describe('Visuals', () => {
        it('should highlight each player name in their respective color', fakeAsync(async() => {
            // Given a game that has been started
            await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER, PreparationOptions.dontWait);

            // When the game is displayed
            tick(2);
            testUtils.detectChanges();

            // Then it should highlight the player's names
            testUtils.expectElementToHaveClass('#playerZeroIndicator', 'player0-bg-darker');
            testUtils.expectElementToHaveClass('#playerOneIndicator', 'player1-bg-darker');
            tick(wrapper.configRoom.maximalMoveDuration * 1000);
        }));

        it('should highlight the board with the color of the player when it is their turn', fakeAsync(async() => {
            // Given a game that has been started
            await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER, PreparationOptions.dontWait);

            // When the component initialize and it is the current player's turn
            tick(2);
            testUtils.detectChanges();

            // Then it should highlight the board with its color
            testUtils.expectElementToHaveClass('#board-highlight', 'player0-bg');
            tick(wrapper.configRoom.maximalMoveDuration * 1000);
        }));

        it('should highlight the board in grey when game is over', fakeAsync(async() => {
            // Given a game that has been started
            await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER);

            // When the game is over
            await testUtils.clickElement('#resign');
            tick(0);
            testUtils.detectChanges();

            // Then it should highlight the board with its color
            testUtils.expectElementToHaveClass('#board-highlight', 'endgame-bg');
            tick(wrapper.configRoom.maximalMoveDuration * 1000);
        }));

        it('should not highlight the board when it is the turn of the opponent', fakeAsync(async() => {
            // Given a game that has been started
            await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER);

            // When it is not the current player's turn
            await doMoveByClicks(FIRST_MOVE);
            testUtils.detectChanges();

            // Then it should not highlight the board
            testUtils.expectElementNotToHaveClass('#board-highlight', 'player1-bg');
            tick(wrapper.configRoom.maximalMoveDuration * 1000);
        }));
    });

    describe('onCancelMove', () => {
        it('should delegate to gameComponent.showLastMove', fakeAsync(async() => {
            // Given a any component
            await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER, PreparationOptions.withoutClocks);
            await doMoveByClicks(FIRST_MOVE);
            const component: QuartoComponent = testUtils.getGameComponent();
            spyOn(component, 'showLastMove').and.callThrough();

            // When calling onCancelMove
            await testUtils.getWrapper().onCancelMove();

            // Then showLastMove should have been called
            expect(component.showLastMove).toHaveBeenCalledOnceWith(FIRST_MOVE);
        }));

        it('should not call gameComponent.showLastMove if there is no move', fakeAsync(async() => {
            // Given a component without previous move
            await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER);
            const component: QuartoComponent = testUtils.getGameComponent();
            spyOn(component, 'showLastMove').and.callThrough();

            // When calling onCancelMove
            await testUtils.getWrapper().onCancelMove();

            // Then showLastMove should not have been called
            expect(component.showLastMove).not.toHaveBeenCalled();
            tick(wrapper.configRoom.maximalMoveDuration * 1000);
        }));
    });

    describe('interactivity', () => {
        it('should be interactive at first turn for current player', fakeAsync(async() => {
            // Given a component at the beginning of the game, where we are Player.ZERO
            await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER);
            // When displaying it
            // Then it should be interactive
            expect(testUtils.getGameComponent().isInteractive()).toBeTrue();
            tick(wrapper.configRoom.maximalMoveDuration * 1000);
        }));

        it('should not be interactive when at the turn of the opponent', fakeAsync(async() => {
            // Given a game that has been started
            await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER);

            // When it is not the current player's turn
            await doMoveByClicks(FIRST_MOVE);
            testUtils.detectChanges();

            // Then it should not be interactive
            expect(testUtils.getGameComponent().isInteractive()).toBeFalse();
            tick(wrapper.configRoom.maximalMoveDuration * 1000);
        }));

        it('should not be interactive when the game is finished', fakeAsync(async() => {
            // Given a board at the opponent's turn
            await prepareTestUtilsFor(UserMocks.CREATOR_AUTH_USER);
            await doMoveByClicks(FIRST_MOVE);

            // When the game ends (e.g., they lose or resign)
            await receiveNewMoves(1, [SECOND_MOVE_ENCODED]);
            await receivePartDAOUpdate({
                winner: UserMocks.CREATOR_MINIMAL_USER,
                loser: UserMocks.OPPONENT_MINIMAL_USER,
                result: MGPResult.RESIGN.value,
            });
            await receiveAction(Player.ONE, 'EndGame');

            // Then it should not be interactive
            expect(testUtils.getGameComponent().isInteractive()).toBeFalse();
            tick(wrapper.configRoom.maximalMoveDuration * 1000);
        }));
    });

});
