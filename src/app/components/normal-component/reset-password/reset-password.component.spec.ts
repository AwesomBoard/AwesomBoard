/* eslint-disable max-lines-per-function */
import { fakeAsync, TestBed } from '@angular/core/testing';
import { ConnectedUserService } from 'src/app/services/ConnectedUserService';
import { MGPValidation } from '@everyboard/lib';

import { SimpleComponentTestUtils } from 'src/app/utils/tests/TestUtils.spec';
import { ResetPasswordComponent } from './reset-password.component';

describe('ResetPasswordComponent', () => {
    let testUtils: SimpleComponentTestUtils<ResetPasswordComponent>;

    let connectedUserService: ConnectedUserService;

    const email: string = 'jean@jaja.europe';

    function fillInEmail(): void {
        testUtils.fillInput('#email', email);
        testUtils.detectChanges();
    }

    function getShownError(): string {
        testUtils.expectElementToExist('#errorMessage');
        return testUtils.findElement('#errorMessage').nativeElement.innerHTML;
    }

    beforeEach(fakeAsync(async() => {
        testUtils = await SimpleComponentTestUtils.create(ResetPasswordComponent);
        testUtils.detectChanges();
        connectedUserService = TestBed.inject(ConnectedUserService);
    }));

    it('should create', () => {
        expect(testUtils.getComponent()).toBeTruthy();
    });
    it('should have button disabled if email is not filled in', fakeAsync(async() => {
        expect(testUtils.findElement('#resetPasswordButton').nativeElement.disabled).toBeTrue();
    }));
    it('should delegate to authentication service when button is clicked and show success message', fakeAsync(async() => {
        spyOn(connectedUserService, 'sendPasswordResetEmail').and.resolveTo(MGPValidation.SUCCESS);
        // Given a user with an email
        fillInEmail();

        // When asking for password reset
        await testUtils.clickElement('#resetPasswordButton');

        // Then it has called sendPasswordResetEmail and shows the success message
        expect(connectedUserService.sendPasswordResetEmail).toHaveBeenCalledWith(email);
        expect(testUtils.findElement('#successMessage').nativeElement.innerHTML).toEqual('The email has been sent, please follow the instructions from that email.');
    }));
    it('should show error message upon failure', fakeAsync(async() => {
        // Given a user with an email that will fail password reset
        spyOn(connectedUserService, 'sendPasswordResetEmail').and.resolveTo(MGPValidation.failure('error'));
        fillInEmail();
        // When asking for password reset
        await testUtils.clickElement('#resetPasswordButton');
        // Then it has called sendPasswordResetEmail and shows the success message
        expect(connectedUserService.sendPasswordResetEmail).toHaveBeenCalledWith(email);
        expect(getShownError()).toEqual('error');
    }));
});
