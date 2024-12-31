import { Injectable } from '@angular/core';

import { MGPValidation, JSONValue } from '@everyboard/lib';

import { ChatDAO } from '../dao/ChatDAO';
import { Subscription } from 'rxjs';
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

    public constructor(private readonly chatDAO: ChatDAO,
                       private readonly webSocketManager: WebSocketManagerService,
                       connectedUserService: ConnectedUserService) {
        super(connectedUserService);
    }

    public async addMessage(chatId: string, message: string): Promise<void> {
        await this.webSocketManager.send({ type: 'ChatSend', data: message });
    }
    public async subscribeToMessages(chatId: string, callback: (message: Message) => void)
    : Promise<Subscription>
    {
        await this.webSocketManager.send({ type: 'Subscribe', data: chatId });
        this.webSocketManager.setCallback(async(type: string, data: JSONValue) => {
            if (type === "ChatMessage") {
                callback(data as Message);
            }
        });
        return new Subscription(async() => this.webSocketManager.send({ type: 'Unsubscribe', data: null }));
    }
    public async sendMessage(chatId: string, content: string)
    : Promise<MGPValidation>
    {
        await this.addMessage(chatId, content);
        return MGPValidation.SUCCESS;
    }
}
