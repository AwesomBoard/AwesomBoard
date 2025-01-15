/* eslint-disable max-lines-per-function */
import { FirestoreDAOMock } from './FirestoreDAOMock.spec';
import { MGPMap, MGPOptional, ObservableSubject } from '@everyboard/lib';

import { Chat, ChatDocument } from 'src/app/domain/Chat';
import { MessageDocument } from 'src/app/domain/Message';
import { Debug } from 'src/app/utils/Debug';

type ChatOS = ObservableSubject<MGPOptional<ChatDocument>>;

type MessageOS = ObservableSubject<MGPOptional<MessageDocument>>;

@Debug.log
export class ChatDAOMock extends FirestoreDAOMock<Chat> {

    private static chatDB: MGPMap<string, ChatOS>;

    public static messagesDB: MGPMap<string, MGPMap<string, MessageOS>>;

    public constructor() {
        super('ChatDAOMock');
    }
    public getStaticDB(): MGPMap<string, ChatOS> {
        return ChatDAOMock.chatDB;
    }
    public resetStaticDB(): void {
        ChatDAOMock.chatDB = new MGPMap();
    }
}
