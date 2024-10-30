/* eslint-disable max-lines-per-function */
import { fakeAsync, TestBed } from '@angular/core/testing';
import { ConnectedUserService, AuthUser } from 'src/app/services/ConnectedUserService';
import { expectValidRouting, SimpleComponentTestUtils } from 'src/app/utils/tests/TestUtils.spec';
import { VerifyAccountComponent } from './verify-account.component';
import { ConnectedUserServiceMock } from 'src/app/services/tests/ConnectedUserService.spec';
import { MGPOptional, MGPValidation } from '@everyboard/lib';
import { Router } from '@angular/router';
import { LobbyComponent } from '../lobby/lobby.component';

describe('VerifyAccountComponent', () => {
    let testUtils: SimpleComponentTestUtils<VerifyAccountComponent>;

    let connectedUserService: ConnectedUserService;

    beforeEach(fakeAsync(async() => {
        testUtils = await SimpleComponentTestUtils.create(VerifyAccountComponent);
        connectedUserService = TestBed.inject(ConnectedUserService);
    }));
    it('should create', () => {
        expect(testUtils.getComponent()).toBeTruthy();
    });
    describe('google user', () => {
        beforeEach(() => {
            // Given a user that registered through google
            const authUser: AuthUser = new AuthUser('kd5457d',
                                                    MGPOptional.of('jeanjaja@gmail.com'),
                                                    MGPOptional.empty(),
                                                    true);
            ConnectedUserServiceMock.setUser(authUser);
            testUtils.detectChanges();
        });
        it('should ask the username if the user has none', fakeAsync(async() => {
            // When the user visits the page
            // Then the username is asked
            testUtils.expectElementToExist('#askUsername');
        }));
        it('should let user know if setting the username succeeds', fakeAsync(async() => {
            const username: string = 'jeanjaja';
            testUtils.expectElementNotToExist('#success');

            // When a valid username is picked
            spyOn(connectedUserService, 'setUsername').and.resolveTo(MGPValidation.SUCCESS);
            testUtils.fillInput('#username', username);
            testUtils.detectChanges();
            await testUtils.clickElement('#pickUsername');

            // Then the success message is shown
            testUtils.expectElementToExist('#success');
            testUtils.expectElementNotToExist('#askUsername');
            expect(connectedUserService.setUsername).toHaveBeenCalledWith(username);
        }));
        it('should show error if setting the username fails', fakeAsync(async() => {
            const failure: string = 'Invalid username';
            // When an invalid username is picked
            spyOn(connectedUserService, 'setUsername').and.resolveTo(MGPValidation.failure(failure));
            testUtils.fillInput('#username', 'jeanjiji');
            testUtils.detectChanges();
            await testUtils.clickElement('#pickUsername');

            // Then the failure message is shown
            testUtils.expectElementNotToExist('#success');
            testUtils.expectElementToExist('#errorMessage');
            expect(testUtils.findElement('#errorMessage').nativeElement.innerHTML).toEqual(failure);
        }));
    });
    describe('email user', () => {
        beforeEach(() => {
            // Given a user that registered through its email
            const user: AuthUser = new AuthUser('jeanjaja8946sd54q',
                                                MGPOptional.of('jean@jaja.europe'),
                                                MGPOptional.of('jeanjaja'),
                                                false);
            ConnectedUserServiceMock.setUser(user);
            testUtils.detectChanges();
        });
        it('should resend email verification if asked by the user and show that it succeeded', fakeAsync(async() => {
            testUtils.expectElementNotToExist('#success');

            // When the user asks for sending the email
            spyOn(connectedUserService, 'sendEmailVerification').and.resolveTo(MGPValidation.SUCCESS);
            testUtils.expectElementToExist('#verificationEmail');
            await testUtils.clickElement('#sendEmail');

            // Then the success message is shown
            testUtils.expectElementToExist('#success');
            expect(connectedUserService.sendEmailVerification).toHaveBeenCalledWith();
        }));
        it('should show error if sending the verification email failed', fakeAsync(async() => {
            const failure: string = 'I cannot send emails!';

            // When the user asks for sending the email
            spyOn(connectedUserService, 'sendEmailVerification').and.resolveTo(MGPValidation.failure(failure));
            await testUtils.clickElement('#sendEmail');

            // Then the success message is shown
            testUtils.expectElementNotToExist('#success');
            testUtils.expectElementToExist('#errorMessage');
            expect(testUtils.findElement('#errorMessage').nativeElement.innerHTML).toEqual(failure);
        }));
        it('should not finalize verification if the user did not verify its email', fakeAsync(async() => {
            spyOn(window, 'open').and.returnValue(null);
            // When the user clicks on "finalize" without having verified its account
            await testUtils.clickElement('#finalizeVerification');

            // Then a failure message is shown
            testUtils.expectElementNotToExist('#success');
            testUtils.expectElementToExist('#errorMessage');
            expect(testUtils.findElement('#errorMessage').nativeElement.innerHTML).toEqual(`You have not verified your email! Click on the link in the verification email.`);
        }));
        it('should finalize verification after the user has verified its email and clicked on the button', fakeAsync(async() => {
            const router: Router = TestBed.inject(Router);
            spyOn(router, 'navigate').and.resolveTo(true);
            spyOn(window, 'open').and.returnValue(null);

            // ... and given a user that verified its email
            ConnectedUserServiceMock.setUser(new AuthUser('5d8t6d', MGPOptional.of('jean@jaja.europe'), MGPOptional.of('jeanjaja'), true), false);

            // When the user clicks on "finalize" without having verified its account
            await testUtils.clickElement('#finalizeVerification');

            // Then no failure message is shown and user is redirected to the lobby
            testUtils.expectElementNotToExist('#errorMessage');
            expectValidRouting(router, ['/lobby'], LobbyComponent);
        }));

    });
});
