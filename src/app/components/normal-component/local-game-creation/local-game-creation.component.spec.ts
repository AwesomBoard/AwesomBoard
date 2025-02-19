/* eslint-disable max-lines-per-function */
import { fakeAsync } from '@angular/core/testing';
import { SimpleComponentTestUtils } from 'src/app/utils/tests/TestUtils.spec';
import { LocalGameCreationComponent } from './local-game-creation.component';

describe('LocalGameCreationComponent', () => {

    let testUtils: SimpleComponentTestUtils<LocalGameCreationComponent>;

    beforeEach(async() => {
        testUtils = await SimpleComponentTestUtils.create(LocalGameCreationComponent);
        testUtils.detectChanges();
    });
    it('should create and redirect to chosen game', fakeAsync(async() => {
        // Given a local game creation component
        spyOn(testUtils.getComponent().router, 'navigate');
        // When picking a game
        await testUtils.getComponent().pickGame('whateverGame');
        // Then we should navigate to that game
        expect(testUtils.getComponent().router.navigate).toHaveBeenCalledOnceWith(['/local', 'whateverGame', 'config']);
    }));
});
