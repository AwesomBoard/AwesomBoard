import { Injectable } from '@angular/core';
import { Subscription } from 'rxjs';

import { JSONValue, MGPFallible, MGPOptional, Utils } from '@everyboard/lib';

import { FirstPlayer, ConfigRoom, PartStatus, PartType } from '../domain/ConfigRoom';
import { ConfigRoomDAO } from '../dao/ConfigRoomDAO';
import { MinimalUser } from '../domain/MinimalUser';
import { RulesConfig } from '../jscaip/RulesConfigUtil';
import { BackendService, WebSocketManagerService, WebSocketMessage } from './BackendService';
import { Debug } from '../utils/Debug';
import { ConnectedUserService } from './ConnectedUserService';
import { Localized } from '../utils/LocaleUtils';

export class ConfigRoomServiceFailure {
    public static readonly GAME_DOES_NOT_EXIST: Localized = () => $localize`This game does not exist!`;
}

@Injectable({
    providedIn: 'root',
})
@Debug.log
export class ConfigRoomService extends BackendService {

    public constructor(protected readonly configRoomDAO: ConfigRoomDAO,
                       connectedUserService: ConnectedUserService,
                       private readonly webSocketManager: WebSocketManagerService)
    {
        super(connectedUserService);
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

    /** Remove a candidate from a config room (it can be ourselves or someone else) */
    public async removeCandidate(gameId: string, candidateId: string): Promise<void> {
        const endpoint: string = `config-room/${gameId}/candidates/${candidateId}`;
        const result: MGPFallible<Response> = await this.performRequest('DELETE', endpoint);
        this.assertSuccess(result);
    }

    /** Propose a config to the opponent */
    public async proposeConfig(gameId: string,
                               partType: PartType,
                               maximalMoveDuration: number,
                               firstPlayer: FirstPlayer,
                               totalPartDuration: number,
                               rulesConfig: MGPOptional<RulesConfig>)
    : Promise<void>
    {
        const config: Partial<ConfigRoom> = {
            partStatus: PartStatus.CONFIG_PROPOSED.value,
            partType: partType.value,
            maximalMoveDuration,
            totalPartDuration,
            firstPlayer: firstPlayer.value,
            rulesConfig: rulesConfig.getOrElse({}),
        };
        const configEncoded: string = encodeURIComponent(JSON.stringify(config));
        const endpoint: string = `config-room/${gameId}?action=propose&config=${configEncoded}`;
        const result: MGPFallible<Response> = await this.performRequest('POST', endpoint);
        this.assertSuccess(result);
    }

    /** Select an opponent */
    public async selectOpponent(gameId: string, opponent: MinimalUser): Promise<void> {
        const opponentEncoded: string = encodeURIComponent(JSON.stringify(opponent));
        const endpoint: string = `config-room/${gameId}?action=selectOpponent&opponent=${opponentEncoded}`;
        const result: MGPFallible<Response> = await this.performRequest('POST', endpoint);
        this.assertSuccess(result);
    }

    /** Review a config proposed to the opponent */
    public async reviewConfig(gameId: string): Promise<void> {
        const endpoint: string = `config-room/${gameId}?action=review`;
        const result: MGPFallible<Response> = await this.performRequest('POST', endpoint);
        this.assertSuccess(result);
    }

    /** Review a config proposed to the opponent, who just left */
    public async reviewConfigAndRemoveChosenOpponent(gameId: string): Promise<void> {
        const endpoint: string = `config-room/${gameId}?action=reviewConfigAndRemoveOpponent`;
        const result: MGPFallible<Response> = await this.performRequest('POST', endpoint);
        this.assertSuccess(result);
    }

}
