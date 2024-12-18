import { Type } from '@angular/core';
import { Route } from '@angular/router';
import { routes } from './app.module';
import { LobbyComponent } from './components/normal-component/lobby/lobby.component';
import { LocalGameCreationComponent } from './components/normal-component/local-game-creation/local-game-creation.component';
import { LoginComponent } from './components/normal-component/login/login.component';
import { NextGameLoadingComponent } from './components/normal-component/next-game-loading/next-game-loading.component';
import { NotFoundComponent } from './components/normal-component/not-found/not-found.component';
import { OnlineGameCreationComponent } from './components/normal-component/online-game-creation/online-game-creation.component';
import { OnlineGameSelectionComponent } from './components/normal-component/online-game-selection/online-game-selection.component';
import { RegisterComponent } from './components/normal-component/register/register.component';
import { SettingsComponent } from './components/normal-component/settings/settings.component';
import { TutorialGameCreationComponent } from './components/normal-component/tutorial-game-creation/tutorial-game-creation.component';
import { VerifyAccountComponent } from './components/normal-component/verify-account/verify-account.component';
import { WelcomeComponent } from './components/normal-component/welcome/welcome.component';
import { LocalGameWrapperComponent } from './components/wrapper-components/local-game-wrapper/local-game-wrapper.component';
import { OnlineGameWrapperComponent } from './components/wrapper-components/online-game-wrapper/online-game-wrapper.component';
import { TutorialGameWrapperComponent } from './components/wrapper-components/tutorial-game-wrapper/tutorial-game-wrapper.component';
import { MGPOptional, Utils } from '@everyboard/lib';
import * as Firestore from '@firebase/firestore';
import * as Auth from '@firebase/auth';
import { AccountComponent } from './components/normal-component/account/account.component';
import { setupEmulators } from './utils/tests/TestUtils.spec';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const routingSpecification: [string, Type<any>][] = [
    ['login', LoginComponent],
    ['lobby', LobbyComponent],
    ['settings', SettingsComponent],
    ['account', AccountComponent],
    ['register', RegisterComponent],
    ['notFound/errorMessage', NotFoundComponent],
    ['nextGameLoading', NextGameLoadingComponent],
    ['verify-account', VerifyAccountComponent],
    ['play', OnlineGameSelectionComponent],
    ['play/P4', OnlineGameCreationComponent],
    ['play/P4/part-id', OnlineGameWrapperComponent],
    ['local', LocalGameCreationComponent],
    ['local/P4', LocalGameWrapperComponent],
    ['tutorial', TutorialGameCreationComponent],
    ['tutorial/P4', TutorialGameWrapperComponent],
    ['', WelcomeComponent],
    ['unknown-url', NotFoundComponent],
];

export function findMatchingRoute(url: string): MGPOptional<Route> {
    if (url[0] === '/') {
        // Drop the first '/' if it is present
        url = url.substring(1);
    }
    const urlParts: string[] = url.split('/');
    for (const route of routes) {
        if (route.path === '**') {
            return MGPOptional.of(route);
        }
        const routeParts: string[] = Utils.getNonNullable(route.path).split('/');
        if (routeParts.length === urlParts.length) {
            let foundMatch: boolean = true;
            for (let i: number = 0; i < urlParts.length; i++) {
                const routeMatches: boolean = routeParts[i] === urlParts[i] || routeParts[i].startsWith(':');
                if (routeMatches === false) {
                    foundMatch = false;
                    break;
                }
            }
            if (foundMatch) {
                return MGPOptional.of(route);
            }
        }
    }
    return MGPOptional.empty();
}

describe('App module', () => {
    it('should provide all necessary firebase components', async() => {
        await setupEmulators();
        expect(Firestore.getFirestore()).toBeDefined();
        expect(Auth.getAuth()).toBeDefined();
    });
    it('router should map all urls to their expected components', () => {
        for (const [url, expectedComponent] of routingSpecification) {
            const matchingRoute: MGPOptional<Route> = findMatchingRoute(url);
            expect(matchingRoute.isPresent()).withContext(`Expected route to be present for url: ${url}`).toBeTrue();
            expect(matchingRoute.get().component).toEqual(expectedComponent);
        }
    });

});
