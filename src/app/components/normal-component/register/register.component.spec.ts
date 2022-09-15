/* eslint-disable max-lines-per-function */
import { fakeAsync, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ConnectedUserService } from 'src/app/services/ConnectedUserService';
import { MGPFallible } from 'src/app/utils/MGPFallible';
import { MGPValidation } from 'src/app/utils/MGPValidation';
import { expectValidRouting, SimpleComponentTestUtils } from 'src/app/utils/tests/TestUtils.spec';
import { RegisterComponent } from './register.component';
import { VerifyAccountComponent } from '../verify-account/verify-account.component';
import * as FireAuth from '@angular/fire/auth';

describe('RegisterComponent', () => {
    let testUtils: SimpleComponentTestUtils<RegisterComponent>;

    let router: Router;

    let connectedUserService: ConnectedUserService;

    const username: string = 'jeanjaja';
    const email: string = 'jean@jaja.europe';
    const password: string = 'hunter2';
    const user: FireAuth.User = { displayName: 'jeanjaja', email: 'jean@jaja.europe' } as FireAuth.User;

    function fillInUserDetails() {
        testUtils.fillInput('#email', email);
        testUtils.fillInput('#username', username);
        testUtils.fillInput('#password', password);
        testUtils.detectChanges();
    }

    function getShownError(): string {
        testUtils.expectElementToExist('#errorMessage');
        return testUtils.findElement('#errorMessage').nativeElement.innerHTML;
    }

    beforeEach(fakeAsync(async() => {
        testUtils = await SimpleComponentTestUtils.create(RegisterComponent);
        testUtils.detectChanges();
        router = TestBed.inject(Router);
        connectedUserService = TestBed.inject(ConnectedUserService);
    }));
    it('should create', () => {
        expect(testUtils.getComponent()).toBeTruthy();
    });
    it('should register, send email verification, and navigate to verification page upon success', fakeAsync(async() => {
        spyOn(router, 'navigate').and.callThrough();
        spyOn(connectedUserService, 'doRegister').and.resolveTo(MGPFallible.success(user));
        spyOn(connectedUserService, 'sendEmailVerification').and.resolveTo(MGPValidation.SUCCESS);

        // given some user
        fillInUserDetails();

        // when the user clicks on the registration button
        await testUtils.clickElement('#registerButton');

        // then the services are called and the user is registered
        expectValidRouting(router, ['/verify-account'], VerifyAccountComponent);
        expect(connectedUserService.sendEmailVerification).toHaveBeenCalledWith();
        expect(connectedUserService.doRegister).toHaveBeenCalledWith(username, email, password);
    }));
    it('should show a message upon registration failure', fakeAsync(async() => {
        const router: Router = TestBed.inject(Router);
        spyOn(router, 'navigate').and.callThrough();

        // given some user
        fillInUserDetails();

        // when the user registers and it fails
        const error: string = `c'est caca monsieur.`;
        spyOn(connectedUserService, 'doRegister').and.resolveTo(MGPFallible.failure(error));
        spyOn(connectedUserService, 'sendEmailVerification').and.resolveTo(MGPValidation.SUCCESS);
        await testUtils.clickElement('#registerButton');

        // then an error message is shown
        expect(getShownError()).toBe(error);
        expect(router.navigate).not.toHaveBeenCalled();
    }));
    it('should show a message if verification email fails to be sent', fakeAsync(async() => {
        const router: Router = TestBed.inject(Router);
        spyOn(router, 'navigate').and.callThrough();

        // given some user
        fillInUserDetails();

        // when the user registers and it fails
        const error: string = `c'est caca monsieur.`;
        spyOn(connectedUserService, 'doRegister').and.resolveTo(MGPFallible.success(user));
        spyOn(connectedUserService, 'sendEmailVerification').and.resolveTo(MGPValidation.failure(error));
        await testUtils.clickElement('#registerButton');
        testUtils.detectChanges();

        // then an error message is shown
        expect(getShownError()).toBe(error);
        expect(router.navigate).not.toHaveBeenCalled();
    }));
    it('should fail if the email is not given', fakeAsync(async() => {
        const router: Router = TestBed.inject(Router);
        spyOn(router, 'navigate').and.callThrough();

        // given some user that does not provide an email address
        testUtils.fillInput('#username', username);
        testUtils.fillInput('#password', password);
        testUtils.detectChanges();

        // when the user clicks on the registration button
        await testUtils.clickElement('#registerButton');

        // then an error message is shown
        expect(getShownError()).toBe(`There are missing fields in the registration form, please check that you filled in all fields.`);
        expect(router.navigate).not.toHaveBeenCalled();
    }));
    it('should fail if the username is not given', fakeAsync(async() => {
        const router: Router = TestBed.inject(Router);
        spyOn(router, 'navigate').and.callThrough();

        // given some user that does not provide a username
        testUtils.fillInput('#email', email);
        testUtils.fillInput('#password', password);
        testUtils.detectChanges();

        // when the user clicks on the registration button
        await testUtils.clickElement('#registerButton');

        // then an error message is shown
        expect(getShownError()).toBe(`There are missing fields in the registration form, please check that you filled in all fields.`);
        expect(router.navigate).not.toHaveBeenCalled();
    }));
    it('should fail if the password is not given', fakeAsync(async() => {
        const router: Router = TestBed.inject(Router);
        spyOn(router, 'navigate').and.callThrough();

        // given some user that does not provide a password
        testUtils.fillInput('#email', email);
        testUtils.fillInput('#username', username);
        testUtils.detectChanges();

        // when the user clicks on the registration button
        await testUtils.clickElement('#registerButton');

        // then an error message is shown
        expect(getShownError()).toBe(`There are missing fields in the registration form, please check that you filled in all fields.`);
        expect(router.navigate).not.toHaveBeenCalled();
    }));
    it('should dynamically validate password', fakeAsync(async() => {
        // given some user
        // when it fills in a password that is too short
        testUtils.fillInput('#password', '123');
        testUtils.detectChanges();

        // then the help indicator is colored red
        testUtils.expectElementToHaveClass('#passwordHelp', 'is-danger');
    }));
    describe('google registration', () => {
        it('should delegate registration with google to auth service', fakeAsync(async() => {
            // given a google user
            spyOn(connectedUserService, 'doGoogleLogin').and.resolveTo(MGPValidation.SUCCESS);
            // when that persons registers on the website with google
            await testUtils.clickElement('#googleButton');
            // then the corresponding service method is called
            expect(connectedUserService.doGoogleLogin).toHaveBeenCalledWith();
        }));
        it('should show an error if registration fails', fakeAsync(async() => {
            // given a user that will fail to register
            spyOn(connectedUserService, 'doGoogleLogin').and.resolveTo(MGPValidation.failure('Error message'));
            // when he user registers
            await testUtils.clickElement('#googleButton');
            // then the error message is shown
            expect(getShownError()).toEqual('Error message');
        }));
    });
});
