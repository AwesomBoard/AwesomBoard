import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { faCog, faSpinner, IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { Subscription } from 'rxjs';
import { ConnectedUserService, AuthUser } from 'src/app/services/ConnectedUserService';
import { CurrentGameService } from 'src/app/services/CurrentGameService';
import { UserService } from 'src/app/services/UserService';
import { MGPOptional } from 'src/app/utils/MGPOptional';
import { CurrentGame } from 'src/app/domain/User';

@Component({
    selector: 'app-header',
    templateUrl: './header.component.html',
})
export class HeaderComponent implements OnInit, OnDestroy {

    public loading: boolean = true;
    public username: MGPOptional<string> = MGPOptional.empty();

    public faCog: IconDefinition = faCog;
    public faSpinner: IconDefinition = faSpinner;

    private userSubscription: Subscription;
    private currentGameSubscription: Subscription;

    public showMenu: boolean = false;

    public currentGame: MGPOptional<CurrentGame> = MGPOptional.empty();

    public constructor(public router: Router,
                       public connectedUserService: ConnectedUserService,
                       public currentGameService: CurrentGameService,
                       public userService: UserService)
    {
    }
    public ngOnInit(): void {
        this.userSubscription = this.connectedUserService.subscribeToUser((user: AuthUser) => {
            this.loading = false;
            if (user.username.isPresent()) {
                this.username = user.username;
            } else {
                this.username = user.email;
            }});
        this.currentGameSubscription =
            this.currentGameService.subscribeToCurrentGame((currentGame: MGPOptional<CurrentGame>) => {
                this.currentGame = currentGame;
            });
    }
    public async logout(): Promise<void> {
        await this.connectedUserService.disconnect();
        await this.router.navigate(['/']);
    }
    public async navigateToPart(): Promise<boolean> {
        return this.router.navigate(['/play', this.currentGame.get().typeGame, this.currentGame.get().id]);
    }
    public ngOnDestroy(): void {
        this.userSubscription.unsubscribe();
        this.currentGameSubscription.unsubscribe();
    }
}
