/* eslint-disable max-lines-per-function */
import { TestBed } from '@angular/core/testing';
import { ChatDAO } from '../ChatDAO';
import { MGPOptional } from '@everyboard/lib';
import * as FireAuth from '@firebase/auth';
import { serverTimestamp } from 'firebase/firestore';
import { Message, MessageDocument } from 'src/app/domain/Message';
import { MinimalUser } from 'src/app/domain/MinimalUser';
import { IFirestoreDAO } from '../FirestoreDAO';
import { FirestoreCollectionObserver } from '../FirestoreCollectionObserver';
import { createConnectedUser } from 'src/app/services/tests/ConnectedUserService.spec';
import { ChatService } from 'src/app/services/ChatService';
import { Subscription } from 'rxjs';
import { expectPermissionToBeDenied, setupEmulators } from 'src/app/utils/tests/TestUtils.spec';
import { Chat } from 'src/app/domain/Chat';

describe('ChatDAO', () => {

    let chatDAO: ChatDAO;
    let chatService: ChatService;

    function signOut(): Promise<void> {
        return FireAuth.getAuth().signOut();
    }
    beforeEach(async() => {
        await setupEmulators();
        chatDAO = TestBed.inject(ChatDAO);
        chatService = TestBed.inject(ChatService);
    });
    it('should be created', () => {
        expect(chatDAO).toBeTruthy();
    });
    describe('subscribeToMessages', () => {
        it('should rely on observingWhere of messages DAO and sort by postedTime', () => {
            // Given a chat DAO
            const messagesDAO: IFirestoreDAO<Message> = chatDAO.subCollectionDAO('chatId', 'messages');
            spyOn(messagesDAO, 'observingWhere').and.returnValue(new Subscription());
            // When calling subscribeToMessages
            const callback: FirestoreCollectionObserver<Message> =
                new FirestoreCollectionObserver<Message>(() => {}, () => {}, () => {});
            chatService.subscribeToMessages('chatId', callback);
            // Then it should call observingWhere and sort by postedTime
            expect(messagesDAO.observingWhere).toHaveBeenCalledOnceWith([], callback, 'postedTime');
        });
    });

    describe('on any chat', () => {
        let myUser: MinimalUser;
        let myMessageId: string;
        let otherUser: MinimalUser;
        let otherMessageId: string;
        beforeEach(async() => {
            // Given a user
            otherUser = await createConnectedUser('foo@bar.com', 'other-user');
            // and a chat (here the lobby, but this could be any chat)
            await chatDAO.set('lobby', {});
            // with a message from another user
            const message: Message = {
                content: 'hullo there',
                sender: otherUser,
                postedTime: serverTimestamp(),
            };
            otherMessageId = await chatService.addMessage('lobby', message);
            await signOut();
            // and a message from the current user, who is able to add messages
            myUser = await createConnectedUser('bar@bar.com', 'user');
            myMessageId = await chatService.addMessage('lobby', { ...message, sender: myUser });
        });
        // In practice, no one can create a chat, but this is not something we can test.
        // We can't test it because we have allowed chat creation *only* in the tests, to enable
        // the creation and test of games under play in the emulator (which require a chat).
        it('should forbid disconnected users to read a chat', async() => {
            // Given a disconnected user
            await signOut();
            // When trying to read a chat
            const chatRead: Promise<MGPOptional<Chat>> = chatDAO.read('lobby');
            // Then it fails
            await expectPermissionToBeDenied(chatRead);
        });
        it('should forbid a user to post a message as another user', async() => {
            // When posting a message as another user
            const message: Message = {
                content: 'hello',
                sender: otherUser,
                postedTime: serverTimestamp(),
            };
            const result: Promise<string> = chatService.addMessage('lobby', message);
            // Then it fails
            await expectPermissionToBeDenied(result);
        });
        it('should forbid a user to post a message with the wrong username', async() => {
            // When posting a message with a different username
            const message: Message = {
                content: 'hello',
                sender: { id: myUser.id, name: 'not-my-username!' },
                postedTime: serverTimestamp(),
            };
            const result: Promise<string> = chatService.addMessage('lobby', message);
            // Then it fails
            await expectPermissionToBeDenied(result);
        });
        it('should allow user to delete one of its messages', async() => {
            // When deleting one of the current user's message
            const result: Promise<void> = chatDAO.subCollectionDAO('lobby', 'messages').delete(myMessageId);
            // Then it succeeds and the message is removed
            await expectAsync(result).toBeResolvedTo();
            const allMessages: MessageDocument[] = await chatService.getLastMessages('lobby', 5);
            expect(allMessages.length).toBe(1); // Only 1 of the original message remains
        });
        it('should forbid a user to delete a message of another user', async() => {
            // When deleting the message of another user
            const result: Promise<void> = chatDAO.subCollectionDAO('lobby', 'messages').delete(otherMessageId);
            // Then it fails
            await expectPermissionToBeDenied(result);
        });
        it('should allow a user to change one of its messages', async() => {
            // When updating one of the current user's message
            const result: Promise<void> = chatDAO.subCollectionDAO('lobby', 'messages').update(myMessageId, { content: 'hullo' });
            // Then it succeeds and the message is updated
            await expectAsync(result).toBeResolvedTo();
            const message: MGPOptional<Message> = await chatDAO.subCollectionDAO<Message>('lobby', 'messages').read(myMessageId);
            expect(message.get().content).toBe('hullo');
        });
        it('should forbid a user to change the sender of a message', async() => {
            // When updating one of the current user's message and changing its sender
            const result: Promise<void> = chatDAO.subCollectionDAO('lobby', 'messages').update(myMessageId, { sender: 'bli' });
            // Then it fails
            await expectPermissionToBeDenied(result);
        });
        it('should forbid a user to change a message of another user', async() => {
            // When updating the message of another user
            const result: Promise<void> = chatDAO.subCollectionDAO('lobby', 'messages').update(otherMessageId, { content: 'hullo' });
            // Then it fails
            await expectPermissionToBeDenied(result);
        });
    });
    describe('on the lobby chat', () => {
        it('should allow a verified user to create the lobby chat', async() => {
            // Given a verified user
            await createConnectedUser('foo@bar.com', 'foo');
            // When creating the 'lobby' chat
            const chatCreation: Promise<void> = chatDAO.set('lobby', {});
            // Then it succeeds
            await expectAsync(chatCreation).toBeResolvedTo();
            await signOut();
        });
        it('should forbid a disconnected user to create the lobby chat', async() => {
            // Given a disconnected user
            await signOut();
            // When creating the 'lobby' chat
            const chatCreation: Promise<void> = chatDAO.set('lobby', {});
            // Then it fails
            await expectPermissionToBeDenied(chatCreation);
        });
        it('should allow a verified user to post a message on the lobby chat', async() => {
            // Given a verified user
            const myUser: MinimalUser = await createConnectedUser('foo@bar.com', 'myself');
            // When posting in the lobby chat
            const message: Message = {
                content: 'hello',
                sender: myUser,
                postedTime: serverTimestamp(),
            };
            const result: Promise<string> = chatService.addMessage('lobby', message);
            // Then it succeeds and the message has been added to the chat
            await expectAsync(result).toBeResolved();
            const allMessages: MessageDocument[] = await chatService.getLastMessages('lobby', 5);
            expect(allMessages.length).toBe(1);
            await signOut();
        });
        it('should forbid a disconnected user to post a message on the lobby chat', async() => {
            // Given a disconnected user
            // When posting in the lobby chat
            const someUser: MinimalUser = {
                name: 'someone',
                id: 'some-id',
            };
            const message: Message = {
                content: 'hello',
                sender: someUser,
                postedTime: serverTimestamp(),
            };
            const result: Promise<string> = chatService.addMessage('lobby', message);
            // Then it fails
            await expectPermissionToBeDenied(result);
        });
    });

});
