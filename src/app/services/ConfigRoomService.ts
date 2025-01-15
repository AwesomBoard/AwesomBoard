import { Injectable } from '@angular/core';
import { Subscription } from 'rxjs';

import { MGPOptional } from '@everyboard/lib';

import { FirstPlayer, ConfigRoom, PartStatus, PartType } from '../domain/ConfigRoom';
import { MinimalUser } from '../domain/MinimalUser';
import { RulesConfig } from '../jscaip/RulesConfigUtil';
import { WebSocketManagerService, WebSocketMessage } from './BackendService';
import { Debug } from '../utils/Debug';
import { Localized } from '../utils/LocaleUtils';

export class ConfigRoomServiceFailure {
    public static readonly GAME_DOES_NOT_EXIST: Localized = () => $localize`This game does not exist!`;
}

@Injectable({
    providedIn: 'root',
})
@Debug.log
export class ConfigRoomService {

    public constructor(private readonly webSocketManager: WebSocketManagerService)
    {
    }

    public subscribeToChanges(configRoomUpdate: (configRoom: ConfigRoom) => void,
                              candidateJoined: (candidate: MinimalUser) => void,
                              candidateLeft: (candidate: MinimalUser) => void)
    : Subscription
    {
        console.log('ConfigRoomService: subscribeToChanges');
        const configRoomSubscription: Subscription =
            this.webSocketManager.setCallback('ConfigRoomUpdate', (message: WebSocketMessage): void => {
                configRoomUpdate(message.getArgument('configRoom'));
            });
        const candidateJoinedSubscription: Subscription =
            this.webSocketManager.setCallback('CandidateJoined', (message: WebSocketMessage): void => {
                candidateJoined(message.getArgument('candidate'));
            });
        const candidateLeftSubscription: Subscription =
            this.webSocketManager.setCallback('CandidateLeft', (message: WebSocketMessage): void => {
                candidateLeft(message.getArgument('candidate'));
            });
        return new Subscription(() => {
            configRoomSubscription.unsubscribe();
            candidateJoinedSubscription.unsubscribe();
            candidateLeftSubscription.unsubscribe();
        });
    }

    /** Join a game */
    public async joinGame(gameId: string): Promise<void> {
        await this.webSocketManager.send(['Subscribe', { gameId }]);
    }

    public async leave(): Promise<void> {
        await this.webSocketManager.send(['Unsubscribe']);
    }

    /** Propose a config to the opponent */
    public async proposeConfig(partType: PartType,
                               maximalMoveDuration: number,
                               firstPlayer: FirstPlayer,
                               totalPartDuration: number,
                               rulesConfig: MGPOptional<RulesConfig>)
    : Promise<void>
    {
        const config: Partial<ConfigRoom> = {
            partType: partType.value,
            maximalMoveDuration,
            totalPartDuration,
            firstPlayer: firstPlayer.value,
            rulesConfig: rulesConfig.getOrElse({}),
        };
        await this.webSocketManager.send(['ProposeConfig', { config }]);
    }

    /** Select an opponent */
    public async selectOpponent(opponent: MinimalUser): Promise<void> {
        await this.webSocketManager.send(['SelectOpponent', { opponent }]);
    }

    /** Review a config proposed to the opponent */
    public async reviewConfig(): Promise<void> {
        await this.webSocketManager.send(['ReviewConfig']);
    }

    /** Accept a game config */
    public async acceptConfig(): Promise<void> {
        await this.webSocketManager.send(['AcceptConfig']);
    }


}
