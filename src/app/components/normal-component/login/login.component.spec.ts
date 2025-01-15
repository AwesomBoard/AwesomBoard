/* eslint-disable max-lines-per-function */
import { fakeAsync, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Observable, ReplaySubject } from 'rxjs';
import { MGPValidation } from '@everyboard/lib';

import { LoginComponent } from './login.component';
import { ConnectedUserService, AuthUser } from 'src/app/services/ConnectedUserService';
import { expectValidRouting, prepareUnsubscribeCheck, SimpleComponentTestUtils } from 'src/app/utils/tests/TestUtils.spec';
import { LobbyComponent } from '../lobby/lobby.component';
import { UserMocks } from 'src/app/domain/UserMocks.spec';

describe('LoginComponent', () => {
    let testUtils: SimpleComponentTestUtils<LoginComponent>;

    let router: Router;

    let connectedUserService: ConnectedUserService;

    let userRS: ReplaySubject<AuthUser>;

    function getShownError(): string {
        return testUtils.findElement('#errorMessage').nativeElement.innerHTML;
    }

    beforeEach(fakeAsync(async() => {
        testUtils = await SimpleComponentTestUtils.create(LoginComponent);
        router = TestBed.inject(Router);
        connectedUserService = TestBed.inject(ConnectedUserService);
    }));
    it('should create', () => {
        testUtils.detectChanges();
        expect(testUtils.getComponent()).toBeTruthy();
    });
    describe('redirections', () => {
        beforeEach(() => {
            userRS = new ReplaySubject<AuthUser>(1);
            const userObs: Observable<AuthUser> = userRS.asObservable();
            spyOn(connectedUserService, 'subscribeToUser').and.callFake((callback: (user: AuthUser) => void) => {
                return userObs.subscribe(callback);
            });
            testUtils.detectChanges();
        });
        it('should redirect upon logged-in user change', fakeAsync(async() => {
            spyOn(router, 'navigate').and.resolveTo();

            // Given an existing user
            const user: AuthUser = UserMocks.CONNECTED_AUTH_USER;

            // When the user gets connected
            userRS.next(user);
            testUtils.detectChanges();

            // Then a redirection happens
            expectValidRouting(router, ['/lobby'], LobbyComponent);
        }));
        it('should not redirect if it sees a non logged-in user', fakeAsync(async() => {
            spyOn(router, 'navigate').and.resolveTo();

            // Given that no user is connected
            const user: AuthUser = AuthUser.NOT_CONNECTED;

            // When a non-connected visitor visits this component
            userRS.next(user);
            testUtils.detectChanges();

            // Then there is no redirection
            expect(router.navigate).not.toHaveBeenCalled();
        }));
    });
    describe('doEmailLogin', () => {
        const email: string = 'jean@jaja.europe';
        const password: string = 'hunter2';
        async function login(): Promise<void> {
            testUtils.fillInput('#email', email);
            testUtils.fillInput('#password', password);
            await testUtils.clickElement('#loginButton');
            testUtils.detectChanges();
        }

        it('should dispatch email login to authentication service', fakeAsync(async() => {
            // Given an existing user and a loaded component
            spyOn(connectedUserService, 'doEmailLogin').and.resolveTo(MGPValidation.SUCCESS);
            testUtils.detectChanges();

            // When the user logs in
            await login();

            // Then email login has been performed
            expect(connectedUserService.doEmailLogin).toHaveBeenCalledWith(email, password);
        }));
        it('should show an error if login fails', fakeAsync(async() => {
            // Given a user that will fail to login and a loaded component
            spyOn(connectedUserService, 'doEmailLogin').and.resolveTo(MGPValidation.failure('Error message'));
            testUtils.detectChanges();

            // When the user logs in
            await login();

            // Then the error message is shown
            expect(getShownError()).toEqual('Error message');
        }));
    });
    describe('doGoogleLogin', () => {
        async function login(): Promise<void> {
            return testUtils.clickElement('#googleButton');
        }
        it('should dispatch google login to authentication service', fakeAsync(async() => {
            // Given a google user
            spyOn(connectedUserService, 'doGoogleLogin').and.resolveTo(MGPValidation.SUCCESS);

            // When the user logs in
            await login();

            // Then google login has been performed
            expect(connectedUserService.doGoogleLogin).toHaveBeenCalledWith();
        }));
        it('should show an error if login fails', fakeAsync(async() => {
            // Given a user that will fail to login
            spyOn(connectedUserService, 'doGoogleLogin').and.resolveTo(MGPValidation.failure('Error message'));

            // When the user logs in
            await login();

            // Then the error message is shown
            expect(getShownError()).toEqual('Error message');
        }));
    });
    it('should unsubscribe from user upon destruction', fakeAsync(async() => {
        // Given the login component
        const expectUnsubscribeToBeCalled: () => void = prepareUnsubscribeCheck(connectedUserService, 'subscribeToUser');
        testUtils.detectChanges();

        // When it is destroyed
        testUtils.getComponent().ngOnDestroy();

        // Then it should have unsubscribed from the user
        expectUnsubscribeToBeCalled();
    }));
});
