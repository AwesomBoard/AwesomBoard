import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { MGPMap, MGPOptional, MGPValidation } from '@everyboard/lib';

import { ActiveConfigRoomsService } from 'src/app/services/ActiveConfigRoomsService';
import { CurrentGame } from 'src/app/domain/User';
import { CurrentGameService } from 'src/app/services/CurrentGameService';
import { MessageDisplayer } from 'src/app/services/MessageDisplayer';
import { Debug } from 'src/app/utils/Debug';
import { WebSocketManagerService } from 'src/app/services/BackendService';
import { ConfigRoom, PartStatus } from 'src/app/domain/ConfigRoom';
import { GameInfo } from '../pick-game/pick-game.component';

type Tab = 'games' | 'create' | 'chat';

type WithId<T> = {
    id : string;
    data: T;
};

@Component({
    selector: 'app-lobby',
    templateUrl: './lobby.component.html',
})
@Debug.log
export class LobbyComponent implements OnInit, OnDestroy {

    private activeConfigRooms: MGPMap<string, ConfigRoom> = new MGPMap();

    private activeConfigRoomsSubscription!: Subscription; // initialized in ngOnInit
    private currentGameSubscription!: Subscription; // initialized in ngOnInit
    private lobbySubscription!: Subscription; // initialized in ngOnInit

    public currentTab: Tab = 'games';
    public createTabClasses: string[] = [];

    public constructor(public readonly router: Router,
                       public readonly messageDisplayer: MessageDisplayer,
                       private readonly activeConfigRoomsService: ActiveConfigRoomsService,
                       private readonly currentGameService: CurrentGameService,
                       private readonly webSocketManager: WebSocketManagerService)
    {
    }

    public async ngOnInit(): Promise<void> {
        this.activeConfigRoomsSubscription = this.activeConfigRoomsService.subscribe(
            (rooms: MGPMap<string, ConfigRoom>) => {
                this.activeConfigRooms = rooms;
            });
        this.currentGameSubscription = this.currentGameService.subscribeToCurrentGame(
            (observed: MGPOptional<CurrentGame>) => {
                this.createTabClasses = [];
                if (observed.isPresent()) {
                    this.createTabClasses = ['disabled-tab'];
                }
            });

        this.lobbySubscription = await this.webSocketManager.subscribeToLobby();
    }

    public async ngOnDestroy(): Promise<void> {
        this.lobbySubscription.unsubscribe();
        this.activeConfigRoomsSubscription.unsubscribe();
        this.currentGameSubscription.unsubscribe();
    }

    public getActiveConfigRooms(): WithId<ConfigRoom>[] {
        // TODO: either generalize this pattern in library code (if it appears again), or don't use mgpmap in activeConfigRoomService?
        const all: WithId<ConfigRoom>[] = [];
        for (const [id, data] of this.activeConfigRooms) {
            all.push({ id, data });
        }
        return all;
    }

    public getGameName(configRoom: ConfigRoom): string {
        return GameInfo.getByUrlName(configRoom.gameName).get().name;
    }

    public getCreatorLine(configRoom: ConfigRoom): string {
        return `${configRoom.creator.name} (${Math.floor(configRoom.creatorElo)})`;
    }

    public async joinGame(configRoom: WithId<ConfigRoom>): Promise<void> {
        const gameId: string = configRoom.id;
        const gameName: string = configRoom.data.gameName;
        const gameStarted: boolean = configRoom.data.partStatus >= PartStatus.PART_STARTED.value;
        const canUserJoin: MGPValidation = this.currentGameService.canUserJoin(gameId, gameStarted);
        if (canUserJoin.isSuccess()) {
            await this.router.navigate(['/play', gameName, gameId]);
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

    public getVisibility(tab: Tab): string {
        if (this.currentTab === tab) {
            return '';
        } else {
            return 'is-hidden';
        }
    }

}
