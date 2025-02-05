/* eslint-disable max-lines-per-function */
import { TestBed, fakeAsync, tick, discardPeriodicTasks } from '@angular/core/testing';
import { DebugElement } from '@angular/core';
import { Router } from '@angular/router';
import { MGPOptional } from '@everyboard/lib';

import { OnlineGameWrapperComponent, OnlineGameWrapperMessages } from './online-game-wrapper.component';
import { ConfigRoomService, ConfigRoomServiceFailure } from 'src/app/services/ConfigRoomService';
import { ConfigRoomDAO } from 'src/app/dao/ConfigRoomDAO';
import { ConfigRoom } from 'src/app/domain/ConfigRoom';
import { ConfigRoomMocks } from 'src/app/domain/ConfigRoomMocks.spec';
import { PartDAO } from 'src/app/dao/PartDAO';
import { PartMocks } from 'src/app/domain/PartMocks.spec';
import { ChatDAO } from 'src/app/dao/ChatDAO';
import { ComponentTestUtils, expectValidRouting, prepareUnsubscribeCheck } from 'src/app/utils/tests/TestUtils.spec';
import { ConnectedUserServiceMock } from 'src/app/services/tests/ConnectedUserService.spec';
import { P4Component } from 'src/app/games/p4/p4.component';
import { Part } from 'src/app/domain/Part';
import { NotFoundComponent } from '../../normal-component/not-found/not-found.component';
import { AbstractGameComponent } from '../../game-components/game-component/GameComponent';
import { UserDAO } from 'src/app/dao/UserDAO';
import { UserMocks } from 'src/app/domain/UserMocks.spec';
import { GameWrapperMessages } from '../GameWrapper';
import { GameService } from 'src/app/services/GameService';
import { MinimalUser } from 'src/app/domain/MinimalUser';
import { RulesConfig } from 'src/app/jscaip/RulesConfigUtil';
import { ConnectedUserService } from 'src/app/services/ConnectedUserService';

describe('OnlineGameWrapper for non-existing game', () => {

    it('should redirect to /notFound', fakeAsync(async() => {
        // Given a game wrapper for a game that does not exist
        const testUtils: ComponentTestUtils<AbstractGameComponent, MinimalUser> =
            await ComponentTestUtils.basic('invalid-game');
        ConnectedUserServiceMock.setUser(UserMocks.CONNECTED_AUTH_USER);
        testUtils.prepareFixture(OnlineGameWrapperComponent);
        const router: Router = TestBed.inject(Router);
        spyOn(router, 'navigate').and.resolveTo();

        await TestBed.inject(ConfigRoomDAO).set('configRoomId', ConfigRoomMocks.getInitial(MGPOptional.empty()));
        await TestBed.inject(PartDAO).set('configRoomId', { ...PartMocks.INITIAL, typeGame: 'invalid-game' });
        await TestBed.inject(ChatDAO).set('configRoomId', { });
        await TestBed.inject(UserDAO).set(UserMocks.CONNECTED_AUTH_USER.id, UserMocks.CONNECTED);

        // When loading the component
        testUtils.detectChanges();
        tick(0);

        // Then it goes to /notFound with the expected error message
        const expectedRoute: string[] = ['/notFound', GameWrapperMessages.NO_MATCHING_GAME('invalid-game')];
        expectValidRouting(router, expectedRoute, NotFoundComponent, { skipLocationChange: true });

        discardPeriodicTasks();
    }));

});

describe('OnlineGameWrapperComponent Lifecycle', () => {

    // Life cycle summary
    // component construction (beforeEach)
    // stage 0
    // ngOnInit (triggered by detectChanges)
    // stage 1: PartCreationComponent appear
    // startGame, launched by user if game was not started yet, or automatically (via partCreationComponent)
    // stage 2: PartCreationComponent disappear, game component appear
    // tick(0): the async part of startGame is now finished
    // stage 3: P4Component appear
    // differents scenarios

    let testUtils: ComponentTestUtils<P4Component, MinimalUser>;
    let wrapper: OnlineGameWrapperComponent;
    let configRoomDAO: ConfigRoomDAO;
    const config: RulesConfig = { width: 7, height: 6 };

    async function prepareComponent(accepted: boolean): Promise<void> {
        let initialConfigRoom: ConfigRoom;
        if (accepted) {
            initialConfigRoom = ConfigRoomMocks.withAcceptedConfig(MGPOptional.of(config));
        } else {
            initialConfigRoom = ConfigRoomMocks.getInitial(MGPOptional.of(config));
        }
        const initialPart: Part = PartMocks.INITIAL;
        configRoomDAO = TestBed.inject(ConfigRoomDAO);
        await configRoomDAO.set('configRoomId', initialConfigRoom);
        await TestBed.inject(PartDAO).set('configRoomId', initialPart);
        await TestBed.inject(ChatDAO).set('configRoomId', { });
        const userDAO: UserDAO = TestBed.inject(UserDAO);
        await userDAO.set(UserMocks.CREATOR_AUTH_USER.id, UserMocks.CREATOR);
        await userDAO.set(UserMocks.OPPONENT_AUTH_USER.id, UserMocks.OPPONENT);
        return Promise.resolve();
    }

    async function finishTest(): Promise<void> {
        testUtils.detectChanges();
        tick(0);
        await configRoomDAO.set('configRoomId', ConfigRoomMocks.withAcceptedConfig(MGPOptional.of(config)));
        testUtils.detectChanges();
        tick(ConfigRoomMocks.getInitial(MGPOptional.empty()).maximalMoveDuration * 1000);
    }

    beforeEach(async() => {
        testUtils = await ComponentTestUtils.basic('P4');
        ConnectedUserServiceMock.setUser(UserMocks.CREATOR_AUTH_USER); // Normally, the header does that

        testUtils.prepareFixture(OnlineGameWrapperComponent);
        wrapper = testUtils.getWrapper() as OnlineGameWrapperComponent;
        spyOn(TestBed.inject(ConnectedUserService), 'getIdToken').and.callFake(async() => {
            return 'idToken';
        });
    });

    describe('for creator', () => {

        it('should have PartCreation subscribe to ConfigRoomService upon initialization', fakeAsync(async() => {
            // Given a starting component, with no accepted config yet
            await prepareComponent(false);
            const configRoomService: ConfigRoomService = TestBed.inject(ConfigRoomService);

            spyOn(configRoomService, 'joinGame').and.callThrough();
            spyOn(configRoomService, 'subscribeToChanges').and.callThrough();
            expect(wrapper.currentPartId).not.toBeDefined();
            expect(configRoomService.joinGame).not.toHaveBeenCalled();
            expect(configRoomService.subscribeToChanges).not.toHaveBeenCalled();

            // When ngOnInit runs to completion
            testUtils.detectChanges();
            tick(0);

            // Then joinGame and observe should have been called
            expect(wrapper.currentPartId).withContext('currentPartId should be defined').toBeDefined();
            expect(configRoomService.joinGame).toHaveBeenCalledOnceWith('configRoomId');
            expect(configRoomService.subscribeToChanges).toHaveBeenCalledTimes(1);

            // finish the game to have no timeout still running
            await finishTest();
        }));

        it('should have PartCreationComponent calling startGame when config accepted', fakeAsync(async() => {
            // Given a starting component with an accepted config
            await prepareComponent(true);
            // When component initializes
            testUtils.detectChanges();

            spyOn(wrapper, 'startGame').and.callThrough();
            expect(wrapper.startGame).not.toHaveBeenCalled();

            tick(0); // Finish calling async code from PartCreationComponent initialization

            // Then startGame should be called
            expect(wrapper.startGame).toHaveBeenCalledTimes(1);

            testUtils.detectChanges(); // Needed so PartCreation is destroyed and game component created

            tick(wrapper.configRoom.maximalMoveDuration * 1000);
        }));

        it('should have some tags before starting', fakeAsync(async() => {
            // Given a online-game-wrapper component
            await prepareComponent(false);
            // When the game is not started yet
            expect(wrapper.gameStarted).toBeFalse();
            // Then the p4 and chat tags should already be present
            testUtils.expectElementNotToExist('app-p4');
            testUtils.expectElementToExist('app-chat');

            // Finish the game to have no timeout still running
            await finishTest();
        }));

        it('should have a PartCreationComponent', fakeAsync(async() => {
            // Given a component without accepted config
            await prepareComponent(false);
            // When the game is not started yet
            expect(wrapper.gameStarted).toBeFalse();
            // Then part creation should exist
            const partCreationId: DebugElement = testUtils.findElement('#partCreation');
            expect(partCreationId).withContext('partCreation id should be present after ngOnInit').toBeTruthy();

            // Finish the game to have no timeout still running
            await finishTest();
        }));

        it('should replace PartCreationComponent by game tag upon game start', fakeAsync(async() => {
            // Given a component with accepted config
            await prepareComponent(true);
            // When it is loaded
            testUtils.detectChanges();
            tick(0);

            // Then part creation is removed and game appears
            expect(wrapper.gameStarted).withContext('game should be started').toBeTrue();
            testUtils.expectElementNotToExist('#partCreation');
            testUtils.expectElementToExist('#game');
            testUtils.expectElementNotToExist('app-p4');
            tick(2);
        }));

        it('should make the game component appear in the end', fakeAsync(async() => {
            // Given a game component with accepted config
            await prepareComponent(true);
            // When it is fully loaded
            testUtils.detectChanges();
            tick(0);

            testUtils.detectChanges();
            testUtils.expectElementNotToExist('app-p4');

            tick(2);

            // Then it should have the real game component
            testUtils.expectElementToExist('app-p4');
            tick(1000);
        }));

    });

    describe('for ChosenOpponent', () => {
        xit('StartGame should replace PartCreationComponent by game component', fakeAsync(async() => {
            // Given a component loaded with non creator
            await prepareComponent(true);
            testUtils.detectChanges();
            tick(0);

            testUtils.detectChanges();

            const partCreationId: DebugElement = testUtils.findElement('#partCreation');
            const gameId: DebugElement = testUtils.findElement('#game');
            const p4Tag: DebugElement = testUtils.findElement('app-p4');

            expect(partCreationId).withContext('partCreation id should be absent after startGame call').toBeFalsy();
            expect(gameId).withContext('game id should be present after startGame call').toBeTruthy();
            expect(p4Tag).withContext('p4Tag id should still be absent after startGame call').toBeNull();
            tick(0);
        }));
    });

    it('should redirect to /notFound if part does not exist', fakeAsync(async() => {
        const router: Router = TestBed.inject(Router);
        spyOn(router, 'navigate').and.resolveTo(true);
        testUtils.detectChanges();
        await testUtils.expectToDisplayCriticalMessage(
            ConfigRoomServiceFailure.GAME_DOES_NOT_EXIST(),
            async() => {
                tick(0);
            });

        expectValidRouting(router, ['/notFound', OnlineGameWrapperMessages.NO_MATCHING_PART()], NotFoundComponent, { skipLocationChange: true });
    }));

    it('should unsubscribe from the part upon destruction', fakeAsync(async() => {
        // Given a started part
        const expectUnsubscribeToHaveBeenCalled: () => void = prepareUnsubscribeCheck(TestBed.inject(GameService), 'subscribeToChanges');

        await prepareComponent(true);
        testUtils.detectChanges();
        tick(0);
        testUtils.detectChanges();
        tick(2); // Need to wait for startPart to be called

        // When the component is destroyed
        await wrapper.ngOnDestroy();

        // Then it unsubscribed from the part
        expectUnsubscribeToHaveBeenCalled();
    }));

});

