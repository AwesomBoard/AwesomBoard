/* eslint-disable max-lines-per-function */
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { UserMocks } from 'src/app/domain/UserMocks.spec';
import { MessageDisplayer } from 'src/app/services/MessageDisplayer';
import { ObservedPartService } from 'src/app/services/ObservedPartService';
import { ConnectedUserServiceMock } from 'src/app/services/tests/ConnectedUserService.spec';
import { MGPValidation } from 'src/app/utils/MGPValidation';
import { ActivatedRouteStub, expectValidRouting, SimpleComponentTestUtils } from 'src/app/utils/tests/TestUtils.spec';
import { GameWrapperMessages } from '../../wrapper-components/GameWrapper';
import { OnlineGameWrapperComponent } from '../../wrapper-components/online-game-wrapper/online-game-wrapper.component';
import { LobbyComponent } from '../lobby/lobby.component';
import { NotFoundComponent } from '../not-found/not-found.component';
import { OnlineGameCreationComponent } from './online-game-creation.component';

describe('OnlineGameCreationComponent for non-existing game', () => {
    it('should redirect to /notFound', fakeAsync(async() => {
        // Given a creation of a game that does not exist
        const testUtils: SimpleComponentTestUtils<OnlineGameCreationComponent> = await SimpleComponentTestUtils.create(OnlineGameCreationComponent, new ActivatedRouteStub('invalid-game'));
        const router: Router = TestBed.inject(Router);
        spyOn(router, 'navigate').and.resolveTo();

        // When loading the wrapper
        testUtils.detectChanges();
        tick(3000);

        // Then it goes to /notFound with the expected error message
        const route: string[] = ['/notFound', GameWrapperMessages.NO_MATCHING_GAME('invalid-game')];
        expectValidRouting(router, route, NotFoundComponent, { skipLocationChange: true });

    }));
});

describe('OnlineGameCreationComponent', () => {

    let testUtils: SimpleComponentTestUtils<OnlineGameCreationComponent>;

    const game: string = 'P4';
    beforeEach(fakeAsync(async() => {
        testUtils = await SimpleComponentTestUtils.create(OnlineGameCreationComponent, new ActivatedRouteStub(game));
    }));
    it('should create and redirect to the game upon success', fakeAsync(async() => {
        // Given a page that is loaded for a specific game by an online user that can create a game
        const router: Router = TestBed.inject(Router);
        spyOn(router, 'navigate').and.callThrough();
        ConnectedUserServiceMock.setUser(UserMocks.CONNECTED_AUTH_USER);

        // When the page is rendered
        testUtils.detectChanges();
        tick(3000); // wait for some toast to leave

        // Then the user should be redirected to the game
        expectValidRouting(router, ['/play', game, 'PartDAOMock0'], OnlineGameWrapperComponent);
    }));
    it('should show toast and navigate to server when creator has active parts', fakeAsync(async() => {
        // Given a page that is loaded for a specific game by a connected user that already has an active part
        const router: Router = TestBed.inject(Router);
        const observedPartService: ObservedPartService = TestBed.inject(ObservedPartService);
        const refusalReason: string = 'whatever reason the service has';
        spyOn(observedPartService, 'canUserCreate').and.returnValue(MGPValidation.failure(refusalReason));
        spyOn(router, 'navigate').and.callThrough();
        ConnectedUserServiceMock.setUser(UserMocks.CONNECTED_AUTH_USER);

        // When the page is rendered
        testUtils.detectChanges();

        // Then it should toast, and navigate to server
        testUtils.expectInfoMessageToHaveBeenDisplayed(refusalReason);
        expectValidRouting(router, ['/lobby'], LobbyComponent);
    }));
});
