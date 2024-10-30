import { JSONValue, MGPOptional, Utils } from '@everyboard/lib';
import { FirestoreTime } from './Time';
import { MinimalUser } from './MinimalUser';
import { FirestoreDocument } from '../dao/FirestoreDAO';
import { GameInfo } from '../components/normal-component/pick-game/pick-game.component';

export type Part = {
    readonly typeGame: string; // the type of game
    readonly playerZero: MinimalUser; // the first player
    readonly playerZeroElo: number; // the elo of the first player at the beginning of the game
    readonly turn: number; // -1 means the part has not started, 0 is the initial turn
    readonly result: IMGPResult;

    readonly playerOne?: MinimalUser; // the second player
    readonly beginning?: FirestoreTime; // beginning of the part
    readonly winner?: MinimalUser;
    readonly loser?: MinimalUser;
    readonly scorePlayerZero?: number;
    readonly scorePlayerOne?: number;

    // Extra fields as sub-collections:
    // events: subcollection of GameEvent
}

type EventType = 'Move' | 'Request' | 'Reply' | 'Action';

export type GameEventBase = {
    readonly eventType: EventType;
    readonly time: number;
    readonly user: MinimalUser;
}

export type GameEventMove = GameEventBase & {
    readonly eventType: 'Move';
    readonly move: JSONValue;
}

// The StartGame action is a dummy action to ensure that at least one event occurs at game start.
// This is required because the clock logic relies on at least one event happening at the start of the game.
export type Action = 'AddTurnTime' | 'AddGlobalTime' | 'StartGame' | 'EndGame';

export type GameEventAction = GameEventBase & {
    readonly eventType: 'Action';
    readonly action: Action;
}

export type RequestType = 'Draw' | 'Rematch' | 'TakeBack';

export type GameEventRequest = GameEventBase & {
    readonly eventType: 'Request';
    readonly requestType: RequestType;
}

export type Reply = 'Accept' | 'Reject';

export type GameEventReply = GameEventBase & {
    readonly eventType: 'Reply';
    readonly reply: Reply;
    readonly requestType: RequestType;
    readonly data?: JSONValue;
}

export type GameEvent = GameEventReply | GameEventRequest | GameEventAction | GameEventMove;

export class MGPResult {

    public static readonly HARD_DRAW: MGPResult = new MGPResult(0);
    public static readonly RESIGN: MGPResult = new MGPResult(1);
    public static readonly VICTORY: MGPResult = new MGPResult(3);
    public static readonly TIMEOUT: MGPResult = new MGPResult(4);
    public static readonly UNACHIEVED: MGPResult = new MGPResult(5);
    public static readonly AGREED_DRAW_BY_ZERO: MGPResult = new MGPResult(6);
    public static readonly AGREED_DRAW_BY_ONE: MGPResult = new MGPResult(7);
    public static readonly PRE_FINISHED: MGPResult = new MGPResult(8);

    private constructor(public readonly value: IMGPResult) {}

}

export class PartDocument implements FirestoreDocument<Part> {

    public constructor(public readonly id: string,
                       public data: Part) {
    }

    public getTurn(): number {
        return this.data.turn;
    }

    public getGameName(): string {
        return GameInfo.getByUrlName(this.data.typeGame).get().name;
    }

    public isHardDraw(): boolean {
        return this.data.result === MGPResult.HARD_DRAW.value;
    }

    public isAgreedDraw(): boolean {
        return this.data.result === MGPResult.AGREED_DRAW_BY_ZERO.value ||
               this.data.result === MGPResult.AGREED_DRAW_BY_ONE.value;
    }

    public getDrawAccepter(): MinimalUser {
        if (this.data.result === MGPResult.AGREED_DRAW_BY_ZERO.value) {
            return this.data.playerZero;
        } else {
            Utils.assert(this.data.result === MGPResult.AGREED_DRAW_BY_ONE.value, 'should not access getDrawAccepter when no draw accepted!');
            return Utils.getNonNullable(this.data.playerOne);
        }
    }

    public isWin(): boolean {
        return this.data.result === MGPResult.VICTORY.value;
    }

    public isTimeout(): boolean {
        return this.data.result === MGPResult.TIMEOUT.value;
    }

    public isResign(): boolean {
        return this.data.result === MGPResult.RESIGN.value;
    }

    public getWinner(): MGPOptional<MinimalUser> {
        return MGPOptional.ofNullable(this.data.winner);
    }

    public getLoser(): MGPOptional<MinimalUser> {
        return MGPOptional.ofNullable(this.data.loser);
    }

    public getPlayerZeroFloorElo(): number {
        return Math.floor(this.data.playerZeroElo);
    }

}

export type IMGPResult = number;
