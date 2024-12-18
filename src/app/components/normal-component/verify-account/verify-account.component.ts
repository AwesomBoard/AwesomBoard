import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ConnectedUserService, AuthUser } from 'src/app/services/ConnectedUserService';
import { MGPValidation } from '@everyboard/lib';

/**
 * Component to verify an account.
 * The meaning of verifying an account depends on the type of account:
 *   - for an email account, it means resending the verification email
 *   - for a google account, it means entering a username
 */
@Component({
    selector: 'app-verify-account',
    templateUrl: './verify-account.component.html',
})
export class VerifyAccountComponent implements OnInit, OnDestroy {

    public verificationType: 'send-email' | 'enter-username' | null = null;

    public success: boolean = false;

    public triedToFinalize: boolean = false;

    public errorMessage: string;

    public emailAddress: string;

    private userSubscription: Subscription;

    public usernameForm: FormGroup = new FormGroup({
        username: new FormControl(),
    });

    public constructor(private readonly connectedUserService: ConnectedUserService,
                       public router: Router)
    {
    }
    public async ngOnInit(): Promise<void> {
        this.userSubscription = this.connectedUserService.subscribeToUser(
            async(user: AuthUser) => {
                this.emailAddress = user.email.get();
                // We know that if this page is shown, something needs to be done to finalize the account
                if (user.username.isAbsent()) {
                    // If the user has no username, it will need to be defined
                    this.verificationType = 'enter-username';
                } else {
                    // Otherwise, it means the user needs to verify its email
                    this.verificationType = 'send-email';
                    if (this.triedToFinalize && user.verified === false) {
                        // The user already clicked on the "finalize" button but hasn't verified the email!
                        this.errorMessage = $localize`You have not verified your email! Click on the link in the verification email.`;
                    }
                    if (user.verified) {
                        // The user is now verified
                        await this.router.navigate(['/lobby']);
                    }
                }
            });
    }
    public async pickUsername(formContent: { username: string }): Promise<void> {
        const result: MGPValidation = await this.connectedUserService.setUsername(formContent.username);
        if (result.isSuccess()) {
            this.success = true;
        } else {
            this.errorMessage = result.getReason();
        }
    }
    public async sendEmailVerification(): Promise<void> {
        const result: MGPValidation = await this.connectedUserService.sendEmailVerification();
        if (result.isSuccess()) {
            this.success = true;
        } else {
            this.errorMessage = result.getReason();
        }
    }
    public async finalizeEmailVerification(): Promise<void> {
        this.triedToFinalize = true;
        await this.connectedUserService.reloadUser();
        window.open(window.location.href, '_self');
    }
    public ngOnDestroy(): void {
        if (this.userSubscription != null && this.userSubscription.unsubscribe != null) {
            this.userSubscription.unsubscribe();
        }
    }
}
