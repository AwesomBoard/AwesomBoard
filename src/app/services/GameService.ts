import { Injectable } from '@angular/core';
import { MGPValidation, MGPOptional, JSONValue, Utils, MGPFallible } from '@everyboard/lib';
import { PartDAO } from '../dao/PartDAO';
import { Part } from '../domain/Part';
import { Subscription } from 'rxjs';
import { MinimalUser } from '../domain/MinimalUser';
import { FirestoreTime } from '../domain/Time';
import { BackendService } from './BackendService';
import { Player, PlayerOrNone } from '../jscaip/Player';
import { PlayerNumberMap } from '../jscaip/PlayerMap';
import { Debug } from '../utils/Debug';
import { ConnectedUserService } from './ConnectedUserService';

export interface StartingPartConfig extends Partial<Part> {
    playerZero: MinimalUser,
    playerZeroElo: number,
    playerOne: MinimalUser,
    turn: number,
    beginning?: FirestoreTime,
}

@Injectable({
    providedIn: 'root',
})
@Debug.log
export class GameService extends BackendService {

    public constructor(protected readonly partDAO: PartDAO,
                       connectedUserService: ConnectedUserService)
    {
        super(connectedUserService);
    }

    public subscribeToChanges(partId: string, callback: (part: MGPOptional<Part>) => void): Subscription {
        return this.partDAO.subscribeToChanges(partId, callback);
    }

    /** Create a game, its config room and chat. Return the id of the created game. */
    public async createGame(gameName: string): Promise<string> {
        const result: MGPFallible<JSONValue> =
            await this.performRequestWithJSONResponse('POST', `game?gameName=${gameName}`);
        this.assertSuccess(result);
        // eslint-disable-next-line dot-notation
        return Utils.getNonNullable(Utils.getNonNullable(result.get())['id']) as string;
    }

    /** Retrieve the name of the game with the given id. If there is no corresponding game, returns an empty option. */
    public async getGameName(gameId: string): Promise<MGPOptional<string>> {
        const result: MGPFallible<JSONValue> =
            await this.performRequestWithJSONResponse('GET', `game/${gameId}?onlyGameName`);
        if (result.isSuccess()) {
            // eslint-disable-next-line dot-notation
            const gameName: string = Utils.getNonNullable(Utils.getNonNullable(result.get())['gameName']) as string;
            return MGPOptional.of(gameName);
        } else {
            return MGPOptional.empty();
        }
    }

    /** Get a full game description */
    public async getExistingGame(gameId: string): Promise<Part> {
        const result: MGPFallible<JSONValue> = await this.performRequestWithJSONResponse('GET', `game/${gameId}`);
        this.assertSuccess(result);
        return result.get() as Part;
    }

    /** Delete a game */
    public async deleteGame(gameId: string): Promise<void> {
        const result: MGPFallible<Response> = await this.performRequest('DELETE', `game/${gameId}`);
        this.assertSuccess(result);
    }

    /** Perform a specific game action and asserts that it has succeeded */
    private async gameAction(gameId: string, action: string): Promise<void> {
        const endpoint: string = `game/${gameId}?action=${action}`;
        const result: MGPFallible<Response> = await this.performRequest('POST', endpoint);
        this.assertSuccess(result);
    }

    /** Accept a game config */
    public async acceptConfig(gameId: string): Promise<void> {
        const endpoint: string = `config-room/${gameId}?action=accept`;
        const result: MGPFallible<Response> = await this.performRequest('POST', endpoint);
        this.assertSuccess(result);
    }

    /** Give the current player resignation in a game */
    public async resign(gameId: string): Promise<void> {
        return this.gameAction(gameId, 'resign');
    }

    /** Notify the timeout of a player in a game */
    public async notifyTimeout(gameId: string, winner: MinimalUser, loser: MinimalUser): Promise<void> {
        const winnerURLEncoded: string = encodeURIComponent(JSON.stringify(winner));
        const loserURLEncoded: string = encodeURIComponent(JSON.stringify(loser));
        const endpoint: string = `game/${gameId}?action=notifyTimeout&winner=${winnerURLEncoded}&loser=${loserURLEncoded}`;
        const result: MGPFallible<Response> = await this.performRequest('POST', endpoint);
        this.assertSuccess(result);
    }

    /** Propose a draw to the opponent */
    public async proposeDraw(gameId: string): Promise<void> {
        return this.gameAction(gameId, 'proposeDraw');
    }

    /** Accept the draw request of the opponent */
    public async acceptDraw(gameId: string): Promise<void> {
        return this.gameAction(gameId, 'acceptDraw');
    }

    /** Refuse a draw request from the opponent */
    public async refuseDraw(gameId: string): Promise<void> {
        return this.gameAction(gameId, 'refuseDraw');
    }

    /** Propose a rematch to the opponent */
    public async proposeRematch(gameId: string): Promise<void> {
        return this.gameAction(gameId, 'proposeRematch');
    }

    /** Accept a rematch request from the opponent */
    public async acceptRematch(gameId: string): Promise<void> {
        return this.gameAction(gameId, 'acceptRematch');
    }

    /** Reject a rematch request from the opponent */
    public async rejectRematch(gameId: string): Promise<void> {
        return this.gameAction(gameId, 'rejectRematch');
    }

    /** Ask to take back one of our moves */
    public async askTakeBack(gameId: string): Promise<void> {
        return this.gameAction(gameId, 'askTakeBack');
    }

    /** Accept that opponent takes back a move */
    public async acceptTakeBack(gameId: string): Promise<void> {
        return this.gameAction(gameId, 'acceptTakeBack');
    }

    /** Refuse that opponent takes back a move */
    public async refuseTakeBack(gameId: string): Promise<void> {
        return this.gameAction(gameId, 'refuseTakeBack');
    }

    /** Add global time to the opponent */
    public async addGlobalTime(gameId: string): Promise<void> {
        return this.gameAction(gameId, 'addGlobalTime');
    }

    /** Add turn time to the opponent */
    public async addTurnTime(gameId: string): Promise<void> {
        return this.gameAction(gameId, 'addTurnTime');
    }

    /** Play a move */
    public async addMove(gameId: string,
                         move: JSONValue,
                         scores: MGPOptional<PlayerNumberMap>)
    : Promise<void>
    {
        const moveURLEncoded: string = encodeURIComponent(JSON.stringify(move));
        let endpoint: string = `game/${gameId}?action=move&move=${moveURLEncoded}`;
        if (scores.isPresent()) {
            const score0: number = scores.get().get(Player.ZERO);
            const score1: number = scores.get().get(Player.ONE);
            endpoint += `&score0=${score0}&score1=${score1}`;
        }
        const result: MGPFallible<Response> = await this.performRequest('POST', endpoint);
        this.assertSuccess(result);
    }

    /** Play a final move */
    public async addMoveAndEndGame(gameId: string,
                                   move: JSONValue,
                                   scores: MGPOptional<PlayerNumberMap>,
                                   winner: PlayerOrNone)
    : Promise<void>
    {
        const moveURLEncoded: string = encodeURIComponent(JSON.stringify(move));
        let endpoint: string = `game/${gameId}?action=moveAndEnd&move=${moveURLEncoded}`;
        if (scores.isPresent()) {
            const score0: number = scores.get().get(Player.ZERO);
            const score1: number = scores.get().get(Player.ONE);
            endpoint += `&score0=${score0}&score1=${score1}`;
        }
        if (winner.isPlayer()) {
            endpoint += `&winner=${winner.getValue()}`;
        }
        const result: MGPFallible<Response> = await this.performRequest('POST', endpoint);
        this.assertSuccess(result);
    }

    public async getGameValidity(gameId: string, gameName: string): Promise<MGPValidation> {
        const realGameName: MGPOptional<string> = await this.getGameName(gameId);
        if (realGameName.isAbsent()) {
            return MGPValidation.failure($localize`This game does not exist!`);
        } else if (realGameName.get() !== gameName) {
            return MGPValidation.failure($localize`This is the wrong game type!`);
        } else {
            return MGPValidation.SUCCESS;
        }
    }

}
