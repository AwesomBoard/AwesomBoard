import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MGPOptional, MGPValidation, Utils } from '@everyboard/lib';

import { ConnectedUserService, AuthUser } from 'src/app/services/ConnectedUserService';
import { GameService } from 'src/app/services/GameService';
import { MessageDisplayer } from 'src/app/services/MessageDisplayer';
import { GameInfo } from '../pick-game/pick-game.component';
import { GameWrapperMessages } from '../../wrapper-components/GameWrapper';
import { CurrentGameService } from 'src/app/services/CurrentGameService';

@Component({
    selector: 'app-online-game-creation',
    template: '<p i18n>Creating online game, please wait, it should not take long.</p>',
})
export class OnlineGameCreationComponent implements OnInit {

    public constructor(private readonly route: ActivatedRoute,
                       private readonly router: Router,
                       private readonly connectedUserService: ConnectedUserService,
                       private readonly currentGameService: CurrentGameService,
                       private readonly messageDisplayer: MessageDisplayer,
                       private readonly gameService: GameService)
    {
    }

    public async ngOnInit(): Promise<void> {
        await this.createGameAndRedirectOrShowError(this.extractGameFromURL());
    }

    private extractGameFromURL(): string {
        return Utils.getNonNullable(this.route.snapshot.paramMap.get('compo'));
    }

    private async createGameAndRedirectOrShowError(game: string): Promise<boolean> {
        const authUser: AuthUser = this.connectedUserService.user.get();
        Utils.assert(authUser.isConnected(), 'User must be connected and have a username to reach this page');
        if (this.gameExists(game) === false) {
            await this.router.navigate(['/notFound', GameWrapperMessages.NO_MATCHING_GAME(game)], { skipLocationChange: true });
            return false;
        }
        const canCreateOnlineGame: MGPValidation = this.currentGameService.canUserCreate();
        if (canCreateOnlineGame.isSuccess()) {
            const gameId: string = await this.gameService.createGame(game);
            await this.router.navigate(['/play', game, gameId]);
            return true;
        } else {
            this.messageDisplayer.infoMessage(canCreateOnlineGame.getReason());
            await this.router.navigate(['/lobby']);
            return false;
        }
    }

    private gameExists(gameName: string): boolean {
        const optionalGameInfo: MGPOptional<GameInfo> = GameInfo.getByUrlName(gameName);
        return optionalGameInfo.isPresent();
    }

}
