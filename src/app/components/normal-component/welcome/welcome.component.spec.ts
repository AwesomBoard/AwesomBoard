/* eslint-disable max-lines-per-function */
import { DebugElement } from '@angular/core';
import { fakeAsync, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MGPValidation } from '@everyboard/lib';

import { CurrentGameService } from 'src/app/services/CurrentGameService';
import { expectValidRouting, expectValidRoutingLink, SimpleComponentTestUtils } from 'src/app/utils/tests/TestUtils.spec';
import { TutorialGameWrapperComponent } from '../../wrapper-components/tutorial-game-wrapper/tutorial-game-wrapper.component';
import { LobbyComponent } from '../lobby/lobby.component';
import { OnlineGameCreationComponent } from '../online-game-creation/online-game-creation.component';
import { OnlineGameSelectionComponent } from '../online-game-selection/online-game-selection.component';
import { WelcomeComponent } from './welcome.component';
import { LocalGameConfigurationComponent } from '../../wrapper-components/local-game-configuration/local-game-configuration.component';

describe('WelcomeComponent', () => {

    let testUtils: SimpleComponentTestUtils<WelcomeComponent>;

    beforeEach(fakeAsync(async() => {
        testUtils = await SimpleComponentTestUtils.create(WelcomeComponent);
        testUtils.detectChanges();
    }));

    it('should create', () => {
        expect(testUtils.getComponent()).toBeTruthy();
    });

    it('should redirect to lobby when clicking on the corresponding button', fakeAsync(async() => {
        const button: DebugElement = testUtils.findElement('#seeGameList');
        expectValidRoutingLink(button, '/lobby', LobbyComponent);
    }));

    it('should redirect to part selection when clicking on the corresponding button', fakeAsync(async() => {
        const router: Router = TestBed.inject(Router);
        spyOn(router, 'navigate').and.resolveTo(true);

        await testUtils.clickElement('#createOnlineGame');

        expectValidRouting(router, ['/play'], OnlineGameSelectionComponent);
    }));
    describe('game list', () => {

        it('should open a modal dialog when picking a game', fakeAsync(async() => {
            // Given that the page is loaded

            // When picking a game (from PickGameComponent)
            testUtils.getComponent().pickGame('Awale');

            // Then the modal dialog is shown
            testUtils.expectElementToExist('#gameInfoModal');
        }));

        it('should close the modal dialog when clicking anywhere on its background', fakeAsync(async() => {
            // Given that the modal dialog is shown for a game
            testUtils.getComponent().pickGame('Awale');

            // When clicking on its background
            await testUtils.clickElement('#modalBackground');

            // Then the modal dialog disappears
            testUtils.expectElementNotToExist('#gameInfoModal');
        }));
        it('should close the modal dialog when clicking anywhere on its close button', fakeAsync(async() => {
            // Given that the modal dialog is shown for a game
            testUtils.getComponent().pickGame('Awale');

            // When clicking on its close button
            await testUtils.clickElement('#closeInfo');

            // Then the modal dialog disappears
            testUtils.expectElementNotToExist('#gameInfoModal');
        }));

        it('should redirect to online game creation when clicking on the corresponding button', fakeAsync(async() => {
            // Given a welcome component
            // where ConnectedUserService tells us user can join a game
            const currentGameService: CurrentGameService = TestBed.inject(CurrentGameService);
            spyOn(currentGameService, 'canUserCreate').and.returnValue(MGPValidation.SUCCESS);
            const router: Router = TestBed.inject(Router);
            spyOn(router, 'navigate').and.resolveTo(true);

            // When clicking on the button to start a specific game
            testUtils.getComponent().pickGame('Awale'); // first pick the game
            await testUtils.clickElement('#play-online'); // then on the button
            testUtils.detectChanges();

            // Then there should have been a redirection to online-game-creation
            expectValidRouting(router, ['/play', 'Awale'], OnlineGameCreationComponent);
        }));

        it('should not redirect to online game creation when clicking on the corresponding button while in a game', fakeAsync(async() => {
            // Given a welcome component
            // where ConnectedUserService tells us user cannot join a game
            const currentGameService: CurrentGameService = TestBed.inject(CurrentGameService);
            const error: string = `j'ai dit non!`;
            spyOn(currentGameService, 'canUserCreate').and.returnValue(MGPValidation.failure(error));
            const router: Router = TestBed.inject(Router);
            spyOn(router, 'navigate').and.resolveTo(true);

            // When clicking on the online-button of one game
            // Then the component should not have changed page and should toast the reason
            testUtils.getComponent().pickGame('Awale');
            await testUtils.expectToDisplayCriticalMessage(error, async() => {
                await testUtils.clickElement('#play-online');
            });
            expect(router.navigate).not.toHaveBeenCalled();
        }));

        it('should redirect to local game when clicking on the corresponding button', fakeAsync(async() => {
            // Given a welcome component
            const router: Router = TestBed.inject(Router);
            spyOn(router, 'navigate').and.resolveTo(true);

            // When picking a game and clicking on the "play offline" button
            testUtils.getComponent().pickGame('Awale');
            await testUtils.clickElement('#play-offline');
            testUtils.detectChanges();

            // Then we should be redirected to the game
            expectValidRouting(router, ['/local', 'Awale', 'config'], LocalGameConfigurationComponent);
        }));

        it('should redirect to tutorial when clicking on the corresponding button', fakeAsync(async() => {
            // Given a welcome component
            const router: Router = TestBed.inject(Router);
            spyOn(router, 'navigate').and.resolveTo(true);

            // When picking a game and clicking on the "learn the rules" button
            testUtils.getComponent().pickGame('Awale');
            await testUtils.clickElement('#play-tutorial');

            expectValidRouting(router, ['/tutorial', 'Awale'], TutorialGameWrapperComponent);
        }));

        it('should not redirect to part selection when clicking on the corresponding button while already playing', fakeAsync(async() => {
            // Given a welcome component
            // where ConnectedUserService tells us user cannot join a game
            const currentGameService: CurrentGameService = TestBed.inject(CurrentGameService);
            const error: string = `j'ai dit non!`;
            spyOn(currentGameService, 'canUserCreate').and.returnValue(MGPValidation.failure(error));
            const router: Router = TestBed.inject(Router);
            spyOn(router, 'navigate').and.resolveTo(true);

            // When clicking on the online-button of one game
            // Then the component should not have changed page and should toast the reason
            testUtils.getComponent().pickGame('Awale');
            await testUtils.expectToDisplayCriticalMessage(error, async() => {
                await testUtils.clickElement('#createOnlineGame');
            });
            expect(router.navigate).not.toHaveBeenCalled();
        }));
    });
});
