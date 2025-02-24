import { Injectable } from '@angular/core';

import { JSONValue, MGPMap } from '@everyboard/lib';

import { Subscription } from 'rxjs';
import { WebSocketManagerService, WebSocketMessage } from './BackendService';
import { ConfigRoom } from '../domain/ConfigRoom';

@Injectable({
    providedIn: 'root',
})
/*
 * This service handles games that a player can join or observe, and is used by
 * the lobby. You must start observing when you need to observe parts, and stop
 * observing when you're done.
 */
export class ActiveConfigRoomsService {

    public constructor(private readonly webSocketManager: WebSocketManagerService) {
    }

    public subscribe(callback: (rooms: MGPMap<string, ConfigRoom>) => void): Subscription {
        const activeRooms: MGPMap<string, ConfigRoom> = new MGPMap();
        const updateSubscription: Subscription =
            this.webSocketManager.setCallback('ConfigRoomUpdate', (message: WebSocketMessage): void => {
                activeRooms.set(message.getArgument('gameId'), message.getArgument('configRoom'));
                callback(activeRooms);
            });
        const deleteSubscription: Subscription =
            this.webSocketManager.setCallback('ConfigRoomDeleted', (message: WebSocketMessage): void => {
                activeRooms.delete(message.getArgument('gameId'));
                callback(activeRooms);
            });
        return new Subscription(() => {
            updateSubscription.unsubscribe();
            deleteSubscription.unsubscribe();
        });
    }
}
