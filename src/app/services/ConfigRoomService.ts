import { Injectable } from '@angular/core';
import { FirstPlayer, ConfigRoom, PartStatus, PartType } from '../domain/ConfigRoom';
import { ConfigRoomDAO } from '../dao/ConfigRoomDAO';
import { FirestoreJSONObject, MGPFallible, MGPOptional, MGPValidation, Utils } from '@everyboard/lib';
import { Subscription } from 'rxjs';
import { MinimalUser } from '../domain/MinimalUser';
import { FirestoreCollectionObserver } from '../dao/FirestoreCollectionObserver';
import { FirestoreDocument, IFirestoreDAO } from '../dao/FirestoreDAO';
import { RulesConfig } from '../jscaip/RulesConfigUtil';
import { BackendService, WebSocketManagerService } from './BackendService';
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
    public subscribeToChanges(gameId: string, callback: (doc: MGPOptional<ConfigRoom>) => void): Subscription {
        return this.configRoomDAO.subscribeToChanges(gameId, callback);
    }

    public subscribeToCandidates(gameId: string, callback: (candidates: MinimalUser[]) => void): Subscription {
        let candidates: MinimalUser[] = [];
        const observer: FirestoreCollectionObserver<MinimalUser> = new FirestoreCollectionObserver(
            (created: FirestoreDocument<MinimalUser>[]) => {
                for (const candidate of created) {
                    candidates.push(candidate.data);
                }
                callback(candidates);
            },
            (modified: FirestoreDocument<MinimalUser>[]) => {
                // This should never happen, but we can still update the candidates list just in case
                for (const modifiedCandidate of modified) {
                    candidates = candidates.map((candidate: MinimalUser) => {
                        if (candidate.id === modifiedCandidate.data.id) {
                            return modifiedCandidate.data;
                        } else {
                            return candidate;
                        }
                    });
                }
                callback(candidates);
            },
            (deleted: FirestoreDocument<MinimalUser>[]) => {
                for (const deletedCandidate of deleted) {
                    candidates = candidates.filter((candidate: MinimalUser) =>
                        candidate.id !== deletedCandidate.data.id);
                }
                callback(candidates);
            });
        const subCollection: IFirestoreDAO<FirestoreJSONObject> =
            this.configRoomDAO.subCollectionDAO(gameId, 'candidates');
        return subCollection.observingWhere([], observer);
    }

    /** Join a game */
    public async joinGame(gameId: string): Promise<void> {
        return this.webSocketManager.send(['Join', { gameId }]);
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
