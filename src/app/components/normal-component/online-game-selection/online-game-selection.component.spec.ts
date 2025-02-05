/* eslint-disable max-lines-per-function */
import { fakeAsync, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MGPValidation } from '@everyboard/lib';

import { expectValidRouting, SimpleComponentTestUtils } from 'src/app/utils/tests/TestUtils.spec';
import { OnlineGameCreationComponent } from '../online-game-creation/online-game-creation.component';
import { OnlineGameSelectionComponent } from './online-game-selection.component';

describe('OnlineGameSelectionComponent', () => {

    let testUtils: SimpleComponentTestUtils<OnlineGameSelectionComponent>;

    beforeEach(fakeAsync(async() => {
        testUtils = await SimpleComponentTestUtils.create(OnlineGameSelectionComponent);
        testUtils.detectChanges();
    }));

    it('should redirect to OnlineGameCreation to create chosen game', fakeAsync(async() => {
        // Given a selection component
        const router: Router = TestBed.inject(Router);
        spyOn(router, 'navigate').and.resolveTo(true);

        // When picking a game
        await testUtils.getComponent().pickGame('whateverGame');

        // Then the user is redirected to the game
        expectValidRouting(router, ['/play', 'whateverGame'], OnlineGameCreationComponent);
    }));

    it('should display refusal reason when user cannot join game', fakeAsync(async() => {
        // Given a selection component and a game that the user is not allowed to join
        const component: OnlineGameSelectionComponent = testUtils.getComponent();
        const router: Router = TestBed.inject(Router);
        spyOn(router, 'navigate').and.resolveTo(true);

        // When picking a game
        // Then refusal should be toasted and router not called
        const reason: string = 'some refusal reason from the service';
        spyOn(component.currentGameService, 'canUserCreate').and.returnValue(MGPValidation.failure(reason));
        await testUtils.expectToDisplayCriticalMessage(reason, async() => {
            await testUtils.getComponent().pickGame('whateverGame');
        });
        expect(router.navigate).not.toHaveBeenCalled();
    }));

});
