/* eslint-disable max-lines-per-function */
import { fakeAsync, tick } from '@angular/core/testing';
import { JSONValue, MGPValidation, Utils } from '@everyboard/lib';

import { Player } from 'src/app/jscaip/Player';
import { ActivatedRouteStub, ComponentTestUtils, ConfigureTestingModuleUtils } from 'src/app/utils/tests/TestUtils.spec';
import { GameInfo } from '../../normal-component/pick-game/pick-game.component';
import { AbstractGameComponent } from './GameComponent';
import { AbaloneComponent } from 'src/app/games/abalone/abalone.component';
import { ErrorLoggerServiceMock } from 'src/app/services/tests/ErrorLoggerServiceMock.spec';

describe('GameComponent', () => {

    const activatedRouteStub: ActivatedRouteStub = new ActivatedRouteStub();

    beforeEach(fakeAsync(async() => {
        await ConfigureTestingModuleUtils.configureTestingModuleForGame(activatedRouteStub);
    }));

    it('should fail if pass() is called on a game that does not support it', fakeAsync(async() => {
        // Given such a game, like Abalone
        activatedRouteStub.setRoute('compo', 'Abalone');
        const testUtils: ComponentTestUtils<AbaloneComponent> = await ComponentTestUtils.forGame('Abalone', false);
        const component: AbstractGameComponent = testUtils.getGameComponent();
        expect(component).toBeDefined();
        testUtils.getWrapper().role = Player.ONE;
        testUtils.detectChanges();
        tick(0);

        spyOn(Utils, 'logError').and.callFake(ErrorLoggerServiceMock.logError);

        // When the player tries to pass
        const result: MGPValidation = await component.pass();

        // Then should fail and call logError
        const errorMessage: string = 'pass() called on a game that does not redefine it';
        const errorData: JSONValue = { gameName: 'AbaloneComponent' };
        expect(result.isFailure()).toBeTrue();
        expect(result.getReason()).toEqual('GameComponent: ' + errorMessage);
        expect(Utils.logError).toHaveBeenCalledWith('GameComponent', errorMessage, errorData);
    }));

    for (const gameInfo of GameInfo.getAllGames()) {
        it(`should have an encoder, tutorial and AI for ${ gameInfo.name }`, fakeAsync(async() => {
            // Given a game
            activatedRouteStub.setRoute('compo', gameInfo.urlName);
            const testUtils: ComponentTestUtils<AbstractGameComponent> =
                await ComponentTestUtils.forGame(gameInfo.urlName);

            // When displaying the game
            const component: AbstractGameComponent = testUtils.getGameComponent();
            testUtils.detectChanges();
            tick(0);

            // Then it should have an encoder and a non-empty tutorial
            expect(component.encoder).withContext('Encoder missing for ' + gameInfo.urlName).toBeTruthy();
            expect(component.tutorial).withContext('tutorial missing for ' + gameInfo.urlName).toBeTruthy();
            expect(component.tutorial.length).withContext('tutorial empty for ' + gameInfo.urlName).toBeGreaterThan(0);
            expect(component.availableAIs.length).withContext('AI list empty for ' + gameInfo.urlName).toBeGreaterThan(0);
        }));
    }

});
