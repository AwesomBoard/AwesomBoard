import { Injectable } from '@angular/core';
import { faBackwardStep, faFlag, faRepeat, IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { MGPOptional, Utils, Set } from '@everyboard/lib';

import { MinimalUser } from 'src/app/domain/MinimalUser';
import { GameEventReply, GameEventRequest, RequestType } from 'src/app/domain/Part';
import { ConnectedUserService } from 'src/app/services/ConnectedUserService';
import { Localized } from 'src/app/utils/LocaleUtils';

export interface RequestInfo {
    requestType: RequestType,
    textForRequest: Localized,
    textForReply: Localized,
    name: Localized,
    icon: IconDefinition,
}

/**
 * The request manager manages the requests and replies.
 * It keeps state about whether a current request has been sent or is waiting for a reply.
 */
@Injectable({
    providedIn: 'root',
})
export class OGWCRequestManagerService {

    public static requestInfos: Record<RequestType, RequestInfo> = {
        'TakeBack': {
            requestType: 'TakeBack',
            textForRequest: () => $localize`Ask to take back one move`,
            textForReply: () => $localize`Your opponent is asking for a take back.`,
            name: () => $localize`take back`,
            icon: faBackwardStep,
        },
        'Draw': {
            requestType: 'Draw',
            textForRequest: () => $localize`Propose a draw`,
            textForReply: () => $localize`Your opponent is proposing a draw.`,
            name: () => $localize`draw`,
            icon: faFlag,
        },
        'Rematch': {
            requestType: `Rematch`,
            textForRequest: () => $localize`Propose a rematch`,
            textForReply: () => $localize`Your opponent is proposing a rematch.`,
            name: () => $localize`rematch`,
            icon: faRepeat,
        },
    };

    private requestAwaitingReply: MGPOptional<GameEventRequest> = MGPOptional.empty();
    private lastDeniedRequest: MGPOptional<RequestType> = MGPOptional.empty();
    private forbiddenRequests: Set<RequestType> = new Set();

    public constructor(private readonly connectedUserService: ConnectedUserService) {
    }

    public onGameStart(): void {
        // Upon game start, clear out requests
        this.requestAwaitingReply = MGPOptional.empty();
        this.lastDeniedRequest = MGPOptional.empty();
        this.forbiddenRequests = new Set();
    }
    public onReceivedMove(): void {
        // Upon a new turn, the player can again request anything
        this.forbiddenRequests = new Set();
        this.lastDeniedRequest = MGPOptional.empty();
    }
    public onReceivedRequest(request: GameEventRequest): void {
        Utils.assert(this.requestAwaitingReply.isAbsent(), 'Should not receive two requests in a row!');
        this.requestAwaitingReply = MGPOptional.of(request);
    }
    /**
     * Called when a reply is received.
     * @returns true if the request has been accepted and must be handled by the OGWC
     */
    public async onReceivedReply(reply: GameEventReply): Promise<boolean> {
        console.log('onReceivedReply: ' + JSON.stringify(reply));
        this.requestAwaitingReply = MGPOptional.empty();
        if (reply.accept) {
            // The request has been accepted by the opponent, we give it back to OGWC
            return true;
        } else {
            // When one of our requests is rejected, we cannot make this request until the next turn
            const user: MinimalUser = this.connectedUserService.user.get().toMinimalUser();
            if (reply.user.id !== user.id) {
                // Opponent denied our request
                this.lastDeniedRequest = MGPOptional.of(reply.requestType);
                this.forbiddenRequests = this.forbiddenRequests.addElement(reply.requestType);
            }
            return false;
        }
    }
    public canMakeRequest(request: RequestType): boolean {
        // If a request is awaiting a reply, no other request can be made until replied
        if (this.requestAwaitingReply.isPresent()) return false;
        // If the request is forbidden, we cannot make it
        if (this.forbiddenRequests.contains(request)) return false;
        return true;
    }
    public getUnrespondedRequestFrom(user: MinimalUser): MGPOptional<RequestType> {
        // Different from canMakeRequest, as we can play if our requests have not been answered for example.
        if (this.requestAwaitingReply.isPresent() && this.requestAwaitingReply.get().user.id === user.id) {
            return MGPOptional.of(this.requestAwaitingReply.get().requestType);
        } else {
            return MGPOptional.empty();
        }
    }
    public getCurrentRequest(): MGPOptional<GameEventRequest> {
        return this.requestAwaitingReply;
    }
    public deniedRequest(): MGPOptional<RequestType> {
        return this.lastDeniedRequest;
    }
}
