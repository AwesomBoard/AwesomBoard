import { Injectable } from '@angular/core';
import { Observable, Subscription } from 'rxjs';

import { PartDAO } from '../../dao/part/PartDAO';

import { ICurrentPart, ICurrentPartId, MGPResult, PICurrentPart } from '../../domain/icurrentpart';
import { FirstPlayer, IJoiner } from '../../domain/ijoiner';

import { JoinerService } from '../joiner/JoinerService';
import { ActivesPartsService } from '../actives-parts/ActivesPartsService';
import { ChatService } from '../chat/ChatService';
import { IChat } from '../../domain/ichat';
import { IMGPRequest, RequestCode } from '../../domain/request';
import { ArrayUtils } from 'src/app/utils/collection-lib/array-utils/ArrayUtils';
import { Player } from 'src/app/jscaip/player/Player';
import { MGPValidation } from 'src/app/utils/mgp-validation/MGPValidation';
import { display, JSONValue } from 'src/app/utils/utils/utils';

@Injectable({
    providedIn: 'root',
})
export class GameService {
    public static VERBOSE: boolean = false;

    private followedPartId: string;

    private followedPartObs: Observable<ICurrentPartId>;

    private followedPartSub: Subscription;

    constructor(private partDao: PartDAO,
                private activesPartsService: ActivesPartsService,
                public joinerService: JoinerService,
                private chatService: ChatService) {
        display(GameService.VERBOSE, 'GameService.constructor');
    }
    // on Server Component

    public async getPartValidity(partId: string, gameType: string): Promise<MGPValidation> {
        const part: ICurrentPart = await this.partDao.read(partId);
        if (part == null) {
            return MGPValidation.failure('UNEXISTANT_PART');
        }
        if (part.typeGame === gameType) {
            return MGPValidation.SUCCESS;
        } else {
            return MGPValidation.failure('WRONG_GAME_TYPE');
        }
    }
    protected createPart(creatorName: string, typeGame: string, chosenPlayer: string): Promise<string> {
        display(GameService.VERBOSE,
                'GameService.createPart(' + creatorName + ', ' + typeGame + ', ' + chosenPlayer + ')');

        const newPart: ICurrentPart = {
            listMoves: [],
            playerZero: creatorName,
            playerOne: chosenPlayer,
            result: MGPResult.UNACHIEVED.toInterface(),
            turn: -1,
            typeGame,
        };
        return this.partDao.create(newPart);
    }
    protected createChat(chatId: string): Promise<void> {
        display(GameService.VERBOSE, 'GameService.createChat(' + chatId + ')');

        const newChat: IChat = {
            status: 'not implemented',
            messages: [],
        };
        return this.chatService.set(chatId, newChat);
    }
    public async createGame(creatorName: string, typeGame: string, chosenPlayer: string): Promise<string> {
        display(GameService.VERBOSE, 'GameService.createGame(' + creatorName + ', ' + typeGame + ')');

        const gameId: string = await this.createPart(creatorName, typeGame, chosenPlayer) as string;
        await this.joinerService.createInitialJoiner(creatorName, gameId);
        await this.createChat(gameId); // TODO asynchronous
        return gameId;
    }
    public getActivesPartsObs(): Observable<ICurrentPartId[]> {
        // TODO: désabonnements de sûreté aux autres abonnements activesParts
        display(GameService.VERBOSE, 'GameService.getActivesPartsObs');

        this.activesPartsService.startObserving();
        return this.activesPartsService.activesPartsObs;
    }
    public unSubFromActivesPartsObs(): void {
        display(GameService.VERBOSE, 'GameService.unSubFromActivesPartsObs()');

        this.activesPartsService.stopObserving();
    }
    // on Part Creation Component

    private startGameWithConfig(partId: string, joiner: IJoiner): Promise<void> {
        display(GameService.VERBOSE, 'GameService.startGameWithConfig(' + partId + ', ' + JSON.stringify(joiner));

        let whoStarts: FirstPlayer = FirstPlayer.of(joiner.firstPlayer);
        if (whoStarts === FirstPlayer.RANDOM) {
            if (Math.random() < 0.5) {
                whoStarts = FirstPlayer.CREATOR;
            } else {
                whoStarts = FirstPlayer.CHOSEN_PLAYER;
            }
        }
        let playerZero: string;
        let playerOne: string;
        if (whoStarts === FirstPlayer.CREATOR) {
            playerZero = joiner.creator;
            playerOne = joiner.chosenPlayer;
        } else {
            playerZero = joiner.chosenPlayer;
            playerOne = joiner.creator;
        }
        const modification: PICurrentPart = {
            playerZero,
            playerOne,
            turn: 0,
            beginning: Date.now(),
        };
        return this.partDao.update(partId, modification);
    }
    public async deletePart(partId: string): Promise<void> {
        display(GameService.VERBOSE, 'GameService.deletePart(' + partId + ')');

        if (partId == null) {
            throw new Error('Can\'t delete id for partId = null');
        }
        return this.partDao.delete(partId);
    }
    public async acceptConfig(partId: string, joiner: IJoiner): Promise<void> {
        display(GameService.VERBOSE, { gameService_acceptConfig: { partId, joiner } });

        await this.joinerService.acceptConfig();
        return this.startGameWithConfig(partId, joiner);
    }
    // on OnlineGame Component

    public startObserving(partId: string, callback: (iPart: ICurrentPartId) => void): void {
        if (this.followedPartId == null) {
            display(GameService.VERBOSE, '[start watching part ' + partId);

            this.followedPartId = partId;
            this.followedPartObs = this.partDao.getObsById(partId);
            this.followedPartSub = this.followedPartObs
                .subscribe((onFullFilled: ICurrentPartId) => callback(onFullFilled));
        } else {
            throw new Error('GameService.startObserving should not be called while already observing a game');
        }
    }
    public resign(partId: string, winner: string): Promise<void> {
        return this.partDao.update(partId, {
            winner: winner,
            result: MGPResult.RESIGN.toInterface(),
            request: null,
        }); // resign
    }
    public notifyTimeout(partId: string, winner: string): Promise<void> {
        return this.partDao.update(partId, {
            winner: winner,
            result: MGPResult.TIMEOUT.toInterface(),
            request: null, // TODO: check line use
        });
    }
    public proposeRematch(partId: string, observerRole: 0 | 1): Promise<void> {
        const code: RequestCode =
            observerRole === 0 ? RequestCode.ZERO_PROPOSED_REMATCH : RequestCode.ONE_PROPOSED_REMATCH;
        return this.partDao.update(partId, code.toInterface());
    }
    public async acceptRematch(part: ICurrentPartId): Promise<void> {
        display(GameService.VERBOSE, 'GameService.acceptRematch(' + JSON.stringify(part) + ')');

        const iJoiner: IJoiner = await this.joinerService.readJoinerById(part.id);
        const rematchId: string = await this.createGame(iJoiner.creator, part.doc.typeGame, iJoiner.chosenPlayer);
        let firstPlayer: FirstPlayer;
        if (part.doc.playerZero === iJoiner.creator) {
            firstPlayer = FirstPlayer.CHOSEN_PLAYER; // so he won't start this one
        } else {
            firstPlayer = FirstPlayer.CREATOR;
        }
        const newJoiner: IJoiner = {
            candidatesNames: iJoiner.candidatesNames,
            creator: iJoiner.creator,
            chosenPlayer: iJoiner.chosenPlayer,
            firstPlayer: firstPlayer.value,
            partStatus: 3, // already started
            maximalMoveDuration: iJoiner.maximalMoveDuration,
            totalPartDuration: iJoiner.totalPartDuration,
        };
        await this.joinerService.updateJoinerById(rematchId, newJoiner);
        return this.partDao.update(part.id, { request: {
            code: RequestCode.REMATCH_ACCEPTED.toInterface().code,
            partId: rematchId,
            typeGame: part.doc.typeGame,
        } });
    }
    public async updateDBBoard(
        partId: string,
        encodedMove: JSONValue,
        scorePlayerZero: number,
        scorePlayerOne: number,
        notifyDraw?: boolean,
        winner?: string,
    ): Promise<void> {
        display(GameService.VERBOSE, { gameService_updateDBBoard: {
            partId, encodedMove, scorePlayerZero, scorePlayerOne, notifyDraw, winner } });

        const part: ICurrentPart = await this.partDao.read(partId); // TODO: optimise this
        const turn: number = part.turn + 1;
        const listMoves: JSONValue[] = ArrayUtils.copyImmutableArray(part.listMoves);
        listMoves[listMoves.length] = encodedMove;
        const update: PICurrentPart = {
            listMoves,
            turn,
            scorePlayerZero, // TODO: make optional
            scorePlayerOne, // TODO: make optional
            request: null,
        };
        if (winner != null) {
            update.winner = winner;
            update.result = MGPResult.VICTORY.toInterface();
        } else if (notifyDraw) {
            update.result = MGPResult.DRAW.toInterface();
        }
        return await this.partDao.update(partId, update);
    }
    public askTakeBack(partId: string, observerRole: Player): Promise<void> {
        let code: RequestCode;
        if (observerRole === Player.ZERO) code = RequestCode.ZERO_ASKED_TAKE_BACK;
        else if (observerRole === Player.ONE) code = RequestCode.ONE_ASKED_TAKE_BACK;
        else throw new Error('Illegal for observer to make request');
        return this.partDao.update(partId, { request: code.toInterface() });
    }
    public async acceptTakeBack(id: string, part: ICurrentPart, observerRole: Player): Promise<void> {
        let code: RequestCode;
        if (observerRole === Player.ZERO) {
            if (part.request.code === RequestCode.ZERO_ASKED_TAKE_BACK.toInterface().code) {
                throw new Error('Illegal to accept your own request.');
            }
            code = RequestCode.ZERO_ACCEPTED_TAKE_BACK;
        } else if (observerRole === Player.ONE) {
            if (part.request.code === RequestCode.ONE_ASKED_TAKE_BACK.toInterface().code) {
                throw new Error('Illegal to accept your own request.');
            }
            code = RequestCode.ONE_ACCEPTED_TAKE_BACK;
        } else {
            throw new Error('Illegal for observer to make request');
        }
        let listMoves: number[] = part.listMoves.slice(0, part.listMoves.length - 1);
        if (listMoves.length % 2 === observerRole.value) {
            // Deleting a second move
            listMoves = listMoves.slice(0, listMoves.length - 1);
        }
        return await this.partDao.update(id, {
            request: code.toInterface(),
            listMoves,
            turn: listMoves.length,
        });
    }
    public refuseTakeBack(id: string, observerRole: Player): Promise<void> {
        let request: IMGPRequest;
        if (observerRole === Player.ZERO) {
            request = RequestCode.ZERO_REFUSED_TAKE_BACK.toInterface();
        } else if (observerRole === Player.ONE) {
            request = RequestCode.ONE_REFUSED_TAKE_BACK.toInterface();
        } else {
            throw new Error('Illegal for observer to make request');
        }
        return this.partDao.update(id, {
            request,
        });
    }
    public stopObserving(): void {
        display(GameService.VERBOSE, 'GameService.stopObserving();');

        if (this.followedPartId == null) {
            throw new Error('!!! GameService.stopObserving: we already stop watching doc');
        } else {
            display(GameService.VERBOSE, 'stopped watching joiner ' + this.followedPartId + ']');

            this.followedPartId = null;
            this.followedPartSub.unsubscribe();
            this.followedPartObs = null;
        }
    }
}
