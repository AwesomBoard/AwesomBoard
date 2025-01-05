import { Injectable } from '@angular/core';

import { MGPValidation, JSONValue, Utils } from '@everyboard/lib';

import { Localized } from '../utils/LocaleUtils';
import { Debug } from '../utils/Debug';
import { ConnectedUserService } from './ConnectedUserService';
import { Message } from '../domain/Message';
import { BackendService, WebSocketManagerService } from './BackendService';

export class ChatMessages {
    public static readonly CANNOT_SEND_MESSAGE: Localized = () => $localize`You're not allowed to send a message here.`;

    public static readonly FORBIDDEN_MESSAGE: Localized = () => $localize`This message is forbidden.`;
}

@Injectable({
    providedIn: 'root',
})
@Debug.log
export class ChatService extends BackendService {

    public constructor(private readonly webSocketManager: WebSocketManagerService,
                       connectedUserService: ConnectedUserService) {
        super(connectedUserService);
    }

    public async addMessage(message: string): Promise<void> {
        await this.webSocketManager.send(['ChatSend', { message }]);
    }

    public subscribeToMessages(callback: (message: Message) => void): void {
        // Make a new subscription to receive new messages
        this.webSocketManager.setCallback('ChatMessage', (data: JSONValue): void => {
            callback(Utils.getNonNullable(data)['message'] as Message);
        });
    }

    public async sendMessage(content: string): Promise<MGPValidation> {
        await this.addMessage(content);
        return MGPValidation.SUCCESS;
    }
}
