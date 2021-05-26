import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { GameService } from 'src/app/services/GameService';
import { GameInfo } from '../pick-game/pick-game.component';

@Component({
    selector: 'app-welcome',
    templateUrl: './welcome.component.html',
})
export class WelcomeComponent {
    public readonly games: GameInfo[] = GameInfo.ALL_GAMES;

    public constructor(private gameService: GameService,
                       private router: Router) {
    }
    public async createGame(game: string): Promise<boolean> {
        return this.gameService.createGameAndRedirectOrShowError(game);
    }
    public createLocalGame(game: string): void {
        this.router.navigate(['/local/' + game]);
    }
    public createDidacticial(game: string): void {
        this.router.navigate(['/didacticial/' + game]);
    }
}
