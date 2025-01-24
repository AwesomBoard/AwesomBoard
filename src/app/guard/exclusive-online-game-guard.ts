import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router';

import { Subscription } from 'rxjs';

import { CurrentGame } from '../domain/User';
import { CurrentGameService } from '../services/CurrentGameService';
import { MGPOptional } from '@everyboard/lib';

@Injectable({
    providedIn: 'root',
})
export class ExclusiveOnlineGameGuard {

    protected currentGameSubscription: MGPOptional<Subscription> = MGPOptional.empty();

    public constructor(private readonly currentGameService: CurrentGameService,
                       private readonly router: Router)
    {
    }
    public async canActivate(route: ActivatedRouteSnapshot): Promise<boolean | UrlTree> {
        const currentGame: MGPOptional<CurrentGame> = await this.currentGameService.getCurrentGame();
        if (currentGame.isAbsent()) {
            return true;
        }
        const part: CurrentGame = currentGame.get();
        if (route.params.id === part.id) {
            return true;
        }
        return this.router.parseUrl('/play/' + part.gameName + '/' + part.id);
    }
}
