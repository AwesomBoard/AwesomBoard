/* eslint-disable max-lines-per-function */
import { DebugElement } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MGPOptional, Utils } from '@everyboard/lib';

import { UserDAO } from 'src/app/dao/UserDAO';
import { CurrentGameMocks } from 'src/app/domain/mocks/CurrentGameMocks.spec';
import { CurrentGame } from 'src/app/domain/User';
import { UserMocks } from 'src/app/domain/UserMocks.spec';
import { AuthUser, ConnectedUserService } from 'src/app/services/ConnectedUserService';
import { CurrentGameService } from 'src/app/services/CurrentGameService';
import { ConnectedUserServiceMock } from 'src/app/services/tests/ConnectedUserService.spec';
import { CurrentGameServiceMock } from 'src/app/services/tests/CurrentGameService.spec';
import { expectValidRoutingLink, prepareUnsubscribeCheck, SimpleComponentTestUtils } from 'src/app/utils/tests/TestUtils.spec';
import { AccountComponent } from '../account/account.component';
import { HeaderComponent } from './header.component';
import { GameInfo } from '../pick-game/pick-game.component';

describe('HeaderComponent', () => {

    let testUtils: SimpleComponentTestUtils<HeaderComponent>;

    beforeEach(fakeAsync(async() => {
        testUtils = await SimpleComponentTestUtils.create(HeaderComponent);
        const userDAO: UserDAO = TestBed.inject(UserDAO);
        await userDAO.set(UserMocks.CONNECTED_AUTH_USER.id, UserMocks.CONNECTED);
    }));
    it('should create', fakeAsync(() => {
        ConnectedUserServiceMock.setUser(UserMocks.CONNECTED_AUTH_USER);
        testUtils.detectChanges();
        expect(testUtils.getComponent()).toBeTruthy();
    }));
    it('should bring to account settings when clicking on the account button', fakeAsync(async() => {
        // Given a connected user
        ConnectedUserServiceMock.setUser(UserMocks.CONNECTED_AUTH_USER);
        // When displaying the component
        testUtils.detectChanges();
        // Then the account link should point to the account component
        const button: DebugElement = testUtils.findElement('#account');
        expectValidRoutingLink(button, '/account', AccountComponent);
    }));
    describe('disconnection', () => {
        it('should disconnect when connected user clicks on the logout button', fakeAsync(async() => {
            // Given a connected user
            ConnectedUserServiceMock.setUser(UserMocks.CONNECTED_AUTH_USER);
            testUtils.detectChanges();
            spyOn(testUtils.getComponent().connectedUserService, 'disconnect').and.callThrough();
            await testUtils.clickElement('#logout');
            tick(0);
            const component: HeaderComponent = testUtils.getComponent();
            expect(component.connectedUserService.disconnect).toHaveBeenCalledTimes(1);
        }));
        it('should remove comment in header when disconnecting', fakeAsync(async() => {
            // Given a connected user that has an currentGame
            ConnectedUserServiceMock.setUser(UserMocks.CONNECTED_AUTH_USER);
            const currentGame: CurrentGame = CurrentGameMocks.CANDIDATE;
            CurrentGameServiceMock.setCurrentGame(MGPOptional.of(currentGame));
            testUtils.detectChanges();
            tick(0);
            testUtils.expectElementToExist('#currentGameLink');

            // When connectedUserService informs us that user is disconnected
            ConnectedUserServiceMock.setUser(AuthUser.NOT_CONNECTED);
            CurrentGameServiceMock.setCurrentGame(MGPOptional.empty());
            testUtils.detectChanges();

            // Then currentGameLink should not be displayed
            testUtils.expectElementNotToExist('#currentGameLink');
        }));
    });
    it('should have empty username when user is not connected', fakeAsync(async() => {
        ConnectedUserServiceMock.setUser(AuthUser.NOT_CONNECTED);
        testUtils.detectChanges();
        tick(0);
        expect(testUtils.getComponent().username).toEqual(MGPOptional.empty());
    }));
    it('should show user email if the user has not set its username yet', fakeAsync(async() => {
        const email: string = 'jean@jaja.us';
        ConnectedUserServiceMock.setUser(new AuthUser('id', MGPOptional.of(email), MGPOptional.empty(), false));
        testUtils.detectChanges();
        expect(testUtils.getComponent().username).toEqual(MGPOptional.of(email));
    }));
    it('should redirect to your current part when clicking on its reference on the header', fakeAsync(async() => {
        // Given a component where connected user is observing a part
        ConnectedUserServiceMock.setUser(UserMocks.CONNECTED_AUTH_USER);
        const currentGame: CurrentGame = CurrentGameMocks.CREATOR_WITH_OPPONENT;
        CurrentGameServiceMock.setCurrentGame(MGPOptional.of(currentGame));
        testUtils.detectChanges();
        tick(0);

        // When clicking on the info about the part
        const router: Router = TestBed.inject(Router);
        spyOn(router, 'navigate').and.resolveTo(true);
        await testUtils.clickElement('#currentGameLink');

        // Then it should have redirect to the part
        expect(router.navigate).toHaveBeenCalledOnceWith(['/play', currentGame.typeGame, currentGame.id]);
    }));
    describe('currentGame', () => {
        it('should display "<TypeGame> (waiting for opponent)" when creator without chosenOpponent', fakeAsync(async() => {
            // Given a connected user that has no currentGame
            ConnectedUserServiceMock.setUser(UserMocks.CONNECTED_AUTH_USER);
            testUtils.detectChanges();
            tick(0);
            testUtils.expectElementNotToExist('#currentGameLink');

            // When user become linked to an currentGame
            const currentGame: CurrentGame = CurrentGameMocks.CREATOR_WITHOUT_OPPONENT;
            CurrentGameServiceMock.setCurrentGame(MGPOptional.of(currentGame));
            testUtils.detectChanges();
            tick(0);

            // Then "Four in a Row (waiting for opponent)" should be displayed
            const currentGameLink: DebugElement = testUtils.findElement('#currentGameLink');
            const gameName: string = GameInfo.getByUrlName(currentGame.typeGame).get().name;
            expect(currentGameLink.nativeElement.innerText).toEqual(gameName + ' (waiting for opponent)');
        }));
        it('should display "<TypeGame> against <Opponent>" when creator with chosenOpponent', fakeAsync(async() => {
            // Given a connected user that has no currentGame
            ConnectedUserServiceMock.setUser(UserMocks.CONNECTED_AUTH_USER);
            testUtils.detectChanges();
            tick(0);
            testUtils.expectElementNotToExist('#currentGameLink');

            // When user become linked to an currentGame with an opponent set
            const currentGame: CurrentGame = CurrentGameMocks.CREATOR_WITH_OPPONENT;
            CurrentGameServiceMock.setCurrentGame(MGPOptional.of(currentGame));
            testUtils.detectChanges();
            tick(0);

            // Then "<Game> against <Opponent>" should be displayed
            const currentGameLink: DebugElement = testUtils.findElement('#currentGameLink');
            const gameName: string = GameInfo.getByUrlName(currentGame.typeGame).get().name;
            const opponentName: string = Utils.getNonNullable(currentGame.opponent?.name);
            expect(currentGameLink.nativeElement.innerText).toEqual(gameName + ' against ' + opponentName);
        }));
        it(`should display '<TypeGame> by <Creator>' when watching as observer`, fakeAsync(async() => {
            // Given a connected user that has no currentGame
            ConnectedUserServiceMock.setUser(UserMocks.CONNECTED_AUTH_USER);
            testUtils.detectChanges();
            tick(0);
            testUtils.expectElementNotToExist('#currentGameLink');

            // When user become linked to an currentGame
            const currentGame: CurrentGame = CurrentGameMocks.OBSERVER;
            CurrentGameServiceMock.setCurrentGame(MGPOptional.of(currentGame));
            testUtils.detectChanges();
            tick(0);

            // Then "<TypeGame> by <Opponent, that should contain the creator>" should be displayed
            const currentGameLink: DebugElement = testUtils.findElement('#currentGameLink');
            const gameName: string = GameInfo.getByUrlName(currentGame.typeGame).get().name;
            const opponent: string = Utils.getNonNullable(currentGame.opponent?.name);
            expect(currentGameLink.nativeElement.innerText).toEqual(gameName + ' by ' + opponent);
        }));
        it(`should display '<TypeGame> by <Creator>' when watching as candidate`, fakeAsync(async() => {
            // Given a connected user that has no currentGame
            ConnectedUserServiceMock.setUser(UserMocks.CONNECTED_AUTH_USER);
            testUtils.detectChanges();
            tick(0);
            testUtils.expectElementNotToExist('#currentGameLink');

            // When user become linked to an currentGame
            const currentGame: CurrentGame = CurrentGameMocks.CANDIDATE;
            CurrentGameServiceMock.setCurrentGame(MGPOptional.of(currentGame));
            testUtils.detectChanges();
            tick(0);

            // Then "Epaminondas by El Creatoro" should be displayed
            const currentGameLink: DebugElement = testUtils.findElement('#currentGameLink');
            const gameName: string = GameInfo.getByUrlName(currentGame.typeGame).get().name;
            const opponent: string = Utils.getNonNullable(currentGame.opponent?.name);
            expect(currentGameLink.nativeElement.innerText).toEqual(gameName + ' by ' + opponent);
        }));
    });
    it('should unsubscribe from connectedUserService when destroying component', fakeAsync(async() => {
        // Given a header
        const connectedUserService: ConnectedUserService = TestBed.inject(ConnectedUserService);
        const expectUnsubscribeToHaveBeenCalled: () => void = prepareUnsubscribeCheck(connectedUserService, 'subscribeToUser');
        testUtils.detectChanges();

        // When it is destroyed
        testUtils.getComponent().ngOnDestroy();

        // Then it should have unsubscribed from connected user
        // Because well, we destroy the header a LOT!
        // By hitting it in the ... HEAD.
        expectUnsubscribeToHaveBeenCalled();
    }));
    it('should unsubscribe from currentGameService when destroying component', fakeAsync(async() => {
        // Given a header
        const currentGameService: CurrentGameService = TestBed.inject(CurrentGameService);
        const expectUnsubscribeToHaveBeenCalled: () => void = prepareUnsubscribeCheck(currentGameService, 'subscribeToCurrentGame');
        testUtils.detectChanges();

        // When it is destroyed
        testUtils.getComponent().ngOnDestroy();

        // Then it should have unsubscribed from observed part
        expectUnsubscribeToHaveBeenCalled();
    }));
});
