import { fakeAsync, TestBed } from '@angular/core/testing';
import { MGPOptional } from '@everyboard/lib';
import { ComponentTestUtils } from 'src/app/utils/tests/TestUtils.spec';
import { UserMocks } from 'src/app/domain/UserMocks.spec';
import { P4Component } from 'src/app/games/p4/p4.component';
import { ConnectedUserServiceMock } from 'src/app/services/tests/ConnectedUserService.spec';
import { ErrorLoggerService } from 'src/app/services/ErrorLoggerService';
import { LocalGameWrapperComponent } from './local-game-wrapper.component';

describe('LocalGameWrapperComponent (rules config phase)', () => {

    let testUtils: ComponentTestUtils<P4Component>;

    beforeEach(fakeAsync(async() => {
        testUtils = await ComponentTestUtils.forGame<P4Component>('P4', true, false);
        ConnectedUserServiceMock.setUser(UserMocks.CONNECTED_AUTH_USER);
        TestBed.inject(ErrorLoggerService);
    }));

    it('should show partCreation config and button to accept default config, at start', () => {
        // Given any game needing a config, like P4
        // When rendering component
        // Then a RulesConfiguration component should be present
        testUtils.expectElementToExist('#rules-config-component');
        // And a button to accept default rules config should be present
        testUtils.expectElementToExist('#start-game-with-config');
    });

    it('should disable button to accept default configuration when receiving empty optional from child component', fakeAsync(async() => {
        // Given any game needing a config, like P4
        const component: LocalGameWrapperComponent = testUtils.getComponent() as LocalGameWrapperComponent;

        // When updateConfig is called with MGPOptional.empty()
        component.updateConfig(MGPOptional.empty());

        // Then the button to accept default rules config should be disabled
        testUtils.expectElementToBeDisabled('#start-game-with-config');
    }));

    it('should create game component once you click on the button', fakeAsync(async() => {
        // Given any game needing a config, like P4
        // When clicking on startGameWithConfig
        testUtils.expectElementNotToExist('#board');
        await testUtils.clickElement('#start-game-with-config');

        // Then game component should be created
        testUtils.expectElementToExist('#board');
    }));

});
