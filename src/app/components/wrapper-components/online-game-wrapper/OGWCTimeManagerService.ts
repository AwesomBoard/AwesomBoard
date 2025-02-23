import { Injectable } from '@angular/core';
import { MGPOptional, Utils } from '@everyboard/lib';

import { GameEventMove, GameEventAction, Game } from '../../../domain/Part';
import { CountDownComponent } from '../../normal-component/count-down/count-down.component';
import { ConfigRoom } from 'src/app/domain/ConfigRoom';
import { Player } from 'src/app/jscaip/Player';
import { MinimalUser } from 'src/app/domain/MinimalUser';
import { PlayerNumberMap } from 'src/app/jscaip/PlayerMap';

/**
 * The time manager manages clocks of each player.
 * There are two main scenarios to consider:
 *   1. we join at the beginning of a game, or
 *   2. we join mid-game.
 * On top of that, it is important to remember that time can be added to a player.
 */
@Injectable({
    providedIn: 'root',
})
export class OGWCTimeManagerService {

    // The turn clocks of each player
    private turnClocks: [CountDownComponent, CountDownComponent]; // Initialized by setClocks
    // The global clocks of each player
    private globalClocks: [CountDownComponent, CountDownComponent]; // Initialized by setClocks
    // All clocks managed by this time manager
    private allClocks: CountDownComponent[]; // Initialized by setClocks
    // The configRoom, which is set when starting the game. We need it to know the maximal game and move durations.
    private configRoom: MGPOptional<ConfigRoom> = MGPOptional.empty();

    // The players, as we need to map between minimal users and player values
    private players: MGPOptional<MinimalUser>[] = [MGPOptional.empty(), MGPOptional.empty()];
    // The global time taken by each player since the beginning of the part
    private readonly takenGlobalTime: PlayerNumberMap = PlayerNumberMap.of(0, 0);

    // The global time added to each player
    private readonly extraGlobalTime: PlayerNumberMap = PlayerNumberMap.of(0, 0);

    // The turn time available for each player. Distinct from the clocks so it stays constant within a turn
    private readonly availableTurnTime: PlayerNumberMap = PlayerNumberMap.of(0, 0);

    // The time at which the current move started
    private lastMoveStartMs: MGPOptional<number> = MGPOptional.empty();

    // Whether we are synchronized with the server, i.e., we received all events of the past
    private synchronized: boolean = false;

    // Whether the game is finished
    private gameEnd: boolean = false;

    public setClocks(turnClocks: [CountDownComponent, CountDownComponent],
                     globalClocks: [CountDownComponent, CountDownComponent])
    : void
    {
        this.turnClocks = turnClocks;
        this.globalClocks = globalClocks;
        this.allClocks = turnClocks.concat(globalClocks);
    }

    // At the beginning of a game, set up clocks and remember when the game started
    public onGameStart(configRoom: ConfigRoom, game: Game, players: MGPOptional<MinimalUser>[]): void {
        console.log('onGameStart')
        this.configRoom = MGPOptional.of(configRoom);
        this.players = players;
        this.lastMoveStartMs = MGPOptional.of(game.beginning);
        for (const player of Player.PLAYERS) {
            // We need to initialize the service's data
            // Otherwise if we go to another page and come back, the service stays alive and the data is off
            this.takenGlobalTime.put(player, 0);
            this.extraGlobalTime.put(player, 0);
            this.availableTurnTime.put(player, this.getMoveDurationInMs());
            // And we setup the clocks
            this.globalClocks[player.getValue()].setDuration(this.getPartDurationInMs());
            this.turnClocks[player.getValue()].setDuration(this.getMoveDurationInMs());
        }
        // We want the clocks to be paused, as we will only activate the required ones
        for (const clock of this.allClocks) {
            clock.start();
            clock.pause();
        }
    }

    private getPartDurationInMs(): number {
        return this.configRoom.get().totalPartDuration * 1000;
    }

    private getMoveDurationInMs(): number {
        return this.configRoom.get().maximalMoveDuration * 1000;
    }

    public onReceivedAction(currentPlayer: Player, action: GameEventAction): void {
        console.log(action)
        this.beforeEvent();
        switch (action.action) {
            case 'AddTurnTime':
                this.addTurnTime(this.playerOfMinimalUser(action.user));
                break;
            case 'AddGlobalTime':
                this.addGlobalTime(this.playerOfMinimalUser(action.user));
                break;
            case 'EndGame':
                this.onGameEnd();
                break;
            default:
                Utils.expectToBe(action.action, 'Sync');
                this.onSync();
                break;
        }
        this.afterEvent(currentPlayer, action.time);
    }

    public playerOfMinimalUser(user: MinimalUser): Player {
        console.log({user, playerZero: this.players[0], playerOne: this.players[1]})
        if (this.players[0].equalsValue(user)) {
            return Player.ZERO;
        } else {
            Utils.assert(this.players[1].equalsValue(user), 'MinimalUser should match a player');
            return Player.ONE;
        }
    }

    public onReceivedMove(move: GameEventMove): void {
        this.beforeEvent();
        const player: Player = this.playerOfMinimalUser(move.user);

        const moveTimeMs: number = move.time;
        const takenMoveTimeMs: number = this.getMsElapsedSinceLastMoveStart(moveTimeMs);
        this.lastMoveStartMs = MGPOptional.of(moveTimeMs);
        this.takenGlobalTime.add(player, takenMoveTimeMs);
        this.availableTurnTime.add(player, - takenMoveTimeMs);

        // Now is the time to update the other player's clock
        // They may get updated through later action such as time additions
        const nextPlayer: Player = player.getOpponent();
        this.availableTurnTime.put(nextPlayer, this.getMoveDurationInMs());
        const nextPlayerTakenGlobalTime: number = this.takenGlobalTime.get(nextPlayer);
        const nextPlayerAdaptedGlobalTime: number = this.getPartDurationInMs() - nextPlayerTakenGlobalTime;
        this.globalClocks[nextPlayer.getValue()].changeDuration(nextPlayerAdaptedGlobalTime);
        this.afterEvent(nextPlayer, move.time);
    }

    private getMsElapsedSinceLastMoveStart(moveTimeMs: number): number {
        return moveTimeMs - this.lastMoveStartMs.get();
    }

    // Stops all clocks that are running
    public onGameEnd(): void {
        this.gameEnd = true;
        for (const clock of this.allClocks) {
            if (clock.isStarted()) {
                clock.stop();
            }
        }
        // Finally, we update the clocks to make sure we show the correct time
        this.updateClocks();
    }

    // Called when we are becoming in sync with the server
    public onSync(): void {
        this.synchronized = true;
    }

    // Pause all clocks before receiving events
    private beforeEvent(): void {
        this.pauseAllClocks();
    }
    // Continue the current player clock after receiving events
    private afterEvent(currentPlayer: Player, currentTimeMs: number): void {
        if (this.synchronized === false) {
            // We'll wait until we are synchronized to do anything
            return;
        }
        this.updateClocks();
        if (this.gameEnd === false) {
            // The drift is how long has passed since the last event occurred
            // It can be only a few ms, or a much longer time in case we join mid-game
            const driftMs: number = this.getMsElapsedSinceLastMoveStart(currentTimeMs);
            // We need to subtract the time to take the drift into account
            this.turnClocks[currentPlayer.getValue()].subtract(driftMs);
            this.globalClocks[currentPlayer.getValue()].subtract(driftMs);
            this.resumeClocks(currentPlayer);
        }
    }

    // Resumes the clocks of player. Public for testing purposes only.
    public resumeClocks(player: Player): void {
        this.turnClocks[player.getValue()].resume();
        this.globalClocks[player.getValue()].resume();
    }

    // Add turn time to the opponent of a player
    private addTurnTime(player: Player): void {
        const secondsToAdd: number = 30;
        this.availableTurnTime.add(player.getOpponent(), secondsToAdd * 1000);
    }

    // Add time to the global clock of the opponent of a player
    private addGlobalTime(player: Player): void {
        const secondsToAdd: number = 5 * 60;
        this.extraGlobalTime.add(player.getOpponent(), secondsToAdd * 1000);
    }

    // Update clocks with the available time
    private updateClocks(): void {
        console.log('updateClocks')
        for (const player of Player.PLAYERS) {
            this.turnClocks[player.getValue()].changeDuration(this.availableTurnTime.get(player));
            const playerTakenGlobalTime: number = this.takenGlobalTime.get(player);
            const globalTime: number =
                this.getPartDurationInMs() + this.extraGlobalTime.get(player) - playerTakenGlobalTime;
            this.globalClocks[player.getValue()].changeDuration(globalTime);
        }
    }

    // Pauses all clocks that are running
    private pauseAllClocks(): void {
        for (const clock of this.allClocks) {
            if (clock.isIdle() === false) {
                clock.pause();
            }
        }
    }
}
