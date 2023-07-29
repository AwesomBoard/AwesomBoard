import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { display } from 'src/app/utils/utils';
import { ActivePartsService } from 'src/app/services/ActivePartsService';
import { PartDocument } from 'src/app/domain/Part';
import { CurrentGame } from 'src/app/domain/User';
import { CurrentGameService } from 'src/app/services/CurrentGameService';
import { MGPOptional } from 'src/app/utils/MGPOptional';
import { MessageDisplayer } from 'src/app/services/MessageDisplayer';
import { MGPValidation } from 'src/app/utils/MGPValidation';
import { Subscription } from 'rxjs';

type Tab = 'games' | 'create' | 'chat';

@Component({
    selector: 'app-lobby',
    templateUrl: './lobby.component.html',
})
export class LobbyComponent implements OnInit, OnDestroy {

    public static VERBOSE: boolean = false;

    public activeParts: PartDocument[] = [];

    private activePartsSubscription!: Subscription; // initialized in ngOnInit
    private currentGameSubscription!: Subscription; // initialized in ngOnInit

    public currentTab: Tab = 'games';
    public createTabClasses: string[] = [];

    public constructor(public readonly router: Router,
                       public readonly messageDisplayer: MessageDisplayer,
                       private readonly activePartsService: ActivePartsService,
                       private readonly currentGameService: CurrentGameService)
    {
    }
    public ngOnInit(): void {
        display(LobbyComponent.VERBOSE, 'lobbyComponent.ngOnInit');
        this.activePartsSubscription = this.activePartsService.subscribeToActiveParts(
            (activeParts: PartDocument[]) => {
                this.activeParts = activeParts;
            });
        this.currentGameSubscription = this.currentGameService.subscribeToCurrentGame(
            (observed: MGPOptional<CurrentGame>) => {
                this.createTabClasses = [];
                if (observed.isPresent()) {
                    this.createTabClasses = ['disabled-tab'];
                }
            });
    }
    public ngOnDestroy(): void {
        display(LobbyComponent.VERBOSE, 'lobbyComponent.ngOnDestroy');
        this.activePartsSubscription.unsubscribe();
        this.currentGameSubscription.unsubscribe();
    }
    public async joinGame(part: PartDocument): Promise<void> {
        const partId: string = part.id;
        const typeGame: string = part.data.typeGame;
        const gameStarted: boolean = part.data.beginning != null;
        const canUserJoin: MGPValidation = this.currentGameService.canUserJoin(partId, gameStarted);
        if (canUserJoin.isSuccess()) {
            await this.router.navigate(['/play', typeGame, partId]);
        } else {
            this.messageDisplayer.criticalMessage(canUserJoin.getReason());
        }
    }
    public selectTab(tab: Tab): void {
        if (tab ==='create') {
            const canUserCreate: MGPValidation = this.currentGameService.canUserCreate();
            if (canUserCreate.isSuccess()) {
                this.currentTab = tab;
            } else {
                this.messageDisplayer.criticalMessage(canUserCreate.getReason());
            }
        } else {
            this.currentTab = tab;
        }
    }
}
