import { Injectable } from '@angular/core';
import { JSONValue } from '@everyboard/lib';
import { GameEvent, Game } from '../domain/Part';
import { Subscription } from 'rxjs';
import { WebSocketManagerService, WebSocketMessage } from './BackendService';
import { Debug } from '../utils/Debug';
import { Player, PlayerOrNone } from '../jscaip/Player';

@Injectable({
    providedIn: 'root',
})
@Debug.log
export class GameService {

    public constructor(private readonly webSocketManager: WebSocketManagerService) {
    }

    public async subscribeTo(gameId: string,
                             gameUpdate: (game: Game) => void,
                             gameEvent: (event: GameEvent) => void)
    : Promise<Subscription> {
        const gameUpdateSubscription: Subscription =
            this.webSocketManager.setCallback('GameUpdate', (message: WebSocketMessage): void => {
                gameUpdate(message.getArgument('game'));
            });
        const gameEventSubscription: Subscription =
            this.webSocketManager.setCallback('GameEvent', (message: WebSocketMessage): void => {
                gameEvent(message.getArgument('event'));
            });
        const gameSubscription: Subscription = await this.webSocketManager.subscribeTo(gameId);
        return new Subscription(() => {
            gameSubscription.unsubscribe();
            gameUpdateSubscription.unsubscribe();
            gameEventSubscription.unsubscribe();
        });
    }

    /** Create a game. Return the id of the created game. */
    public async createGame(gameName: string): Promise<string> {
        const response: WebSocketMessage =
            await this.webSocketManager.sendAndWaitForReply(['Create', { gameName }], 'GameCreated');
        return response.getArgument('gameId');
    }

    /** Perform a specific game action and asserts that it has succeeded */
    private async gameAction(action: JSONValue): Promise<void> {
        return this.webSocketManager.send(action);
    }

    /** Give the current player resignation in a game */
    public async resign(): Promise<void> {
        return this.gameAction(['Resign']);
    }

    /** Notify the timeout of a player in a game */
    public async notifyTimeout(winner: Player): Promise<void> {
        return this.gameAction(['NotifyTimeout', { winner: winner.getValue() }]);
    }

    private async propose(proposition: 'TakeBack' | 'Draw' | 'Rematch'): Promise<void> {
        return this.gameAction(['Propose', { proposition }]);
    }

    private async accept(proposition: 'TakeBack' | 'Draw' | 'Rematch'): Promise<void> {
        return this.gameAction(['Accept', { proposition }]);
    }

    private async reject(proposition: 'TakeBack' | 'Draw' | 'Rematch'): Promise<void> {
        return this.gameAction(['Reject', { proposition }]);
    }

    /** Propose a draw to the opponent */
    public async proposeDraw(): Promise<void> {
        return this.propose('Draw');
    }

    /** Accept the draw request of the opponent */
    public async acceptDraw(): Promise<void> {
        return this.accept('Draw');
    }

    /** Refuse a draw request from the opponent */
    public async refuseDraw(): Promise<void> {
        return this.reject('Draw');
    }

    /** Propose a rematch to the opponent */
    public async proposeRematch(): Promise<void> {
        return this.propose('Rematch');
    }

    /** Accept a rematch request from the opponent */
    public async acceptRematch(): Promise<void> {
        return this.accept('Rematch');
    }

    /** Reject a rematch request from the opponent */
    public async rejectRematch(): Promise<void> {
        return this.reject('Rematch');
    }

    /** Ask to take back one of our moves */
    public async askTakeBack(): Promise<void> {
        return this.propose('TakeBack');
    }

    /** Accept that opponent takes back a move */
    public async acceptTakeBack(): Promise<void> {
        return this.accept('TakeBack');
    }

    /** Refuse that opponent takes back a move */
    public async refuseTakeBack(): Promise<void> {
        return this.reject('TakeBack');
    }

    /** Add global time to the opponent */
    public async addGlobalTime(): Promise<void> {
        return this.gameAction(['AddTime', { kind: ['Global'] }]);
    }

    /** Add turn time to the opponent */
    public async addTurnTime(): Promise<void> {
        return this.gameAction(['AddTime', { kind: ['Turn'] }]);
    }

    /** Play a move */
    public async addMove(move: JSONValue): Promise<void> {
        return this.gameAction(['Move', { move }]);
    }

    /** End the game after a move */
    public async endGame(winner: PlayerOrNone): Promise<void>
    {
        return this.gameAction(['EndGame', { winner: winner.getValue() }]);
    }

}
