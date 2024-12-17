import { Injectable } from '@angular/core';
import { ChatDAO } from '../dao/ChatDAO';
import { Message, MessageDocument } from '../domain/Message';
import { MGPValidation } from '@everyboard/lib';
import { Subscription } from 'rxjs';
import { serverTimestamp } from 'firebase/firestore';
import { FirestoreCollectionObserver } from '../dao/FirestoreCollectionObserver';
import { MinimalUser } from '../domain/MinimalUser';
import { Localized } from '../utils/LocaleUtils';
import { Debug } from '../utils/Debug';
import { BackendService, WebSocketManagerService } from './BackendService';
import { ConnectedUserService } from './ConnectedUserService';

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

    public async addMessage(chatId: string, message: Message): Promise<string> {
        // return this.chatDAO.subCollectionDAO(chatId, 'messages').create(message);
        console.log('trying to send')
        await this.webSocketManager.send({ type: 'chat', chatId, message });
        return 'TODO';
    }
    public async getLastMessages(chatId: string, limit: number): Promise<MessageDocument[]> {
        const ordering: string = 'postedTime';
        return this.chatDAO.subCollectionDAO<Message>(chatId, 'messages').findWhere([], ordering, limit);
    }
    public subscribeToMessages(chatId: string, callback: FirestoreCollectionObserver<Message>): Subscription {
        return this.chatDAO.subCollectionDAO<Message>(chatId, 'messages').observingWhere([], callback, 'postedTime');
    }
    public async sendMessage(chatId: string, sender: MinimalUser, content: string, currentTurn?: number)
    : Promise<MGPValidation>
    {
        if (this.userCanSendMessage(sender.name, chatId) === false) {
            return MGPValidation.failure(ChatMessages.CANNOT_SEND_MESSAGE());
        }
        if (this.isForbiddenMessage(content)) {
            return MGPValidation.failure(ChatMessages.FORBIDDEN_MESSAGE());
        }
        const newMessage: Message = {
            content,
            sender,
            postedTime: serverTimestamp(),
            currentTurn,
        };
        await this.addMessage(chatId, newMessage);
        return MGPValidation.SUCCESS;
    }
    private userCanSendMessage(userName: string, _chatId: string): boolean {
        return userName !== ''; // In practice, no user can have this username. This may be extended to other reasons in the future.
    }
    private isForbiddenMessage(message: string): boolean {
        return (message === '');
    }
}
