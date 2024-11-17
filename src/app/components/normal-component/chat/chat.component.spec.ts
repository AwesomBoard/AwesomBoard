/* eslint-disable max-lines-per-function */
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { ChatComponent } from './chat.component';
import { ChatService } from 'src/app/services/ChatService';
import { ChatDAO } from 'src/app/dao/ChatDAO';
import { DebugElement } from '@angular/core';

import { prepareUnsubscribeCheck, SimpleComponentTestUtils } from 'src/app/utils/tests/TestUtils.spec';
import { Message } from 'src/app/domain/Message';
import { serverTimestamp } from 'firebase/firestore';
import { UserMocks } from 'src/app/domain/UserMocks.spec';
import { MinimalUser } from 'src/app/domain/MinimalUser';
import { ConnectedUserServiceMock } from 'src/app/services/tests/ConnectedUserService.spec';
import { UserDAO } from 'src/app/dao/UserDAO';

describe('ChatComponent', () => {

    let testUtils: SimpleComponentTestUtils<ChatComponent>;

    let component: ChatComponent;

    let chatService: ChatService;

    let chatDAO: ChatDAO;

    const MSG: Message = {
        sender: { name: 'foo', id: 'fooId' },
        content: 'hello',
        currentTurn: 0,
        postedTime: serverTimestamp(),
    };
    async function addMessages(chatId: string, n: number): Promise<void> {
        for (let i: number = 0; i < n; i++) {
            await chatService.addMessage(chatId, MSG);
        }
    }

    beforeEach(fakeAsync(async() => {
        testUtils = await SimpleComponentTestUtils.create(ChatComponent);
        component = testUtils.getComponent();
        component.chatId = 'fauxChat';
        component.turn = 2;
        chatService = TestBed.inject(ChatService);
        chatDAO = TestBed.inject(ChatDAO);
        await chatDAO.set('fauxChat', {});
    }));
    it('should create', fakeAsync(async() => {
        // wait for the chat to be initialized (without it, ngOnInit will not be called)
        testUtils.detectChanges();
        expect(component).toBeTruthy();
    }));
    describe('connected chat', () => {
        it('should display message content and sender name', fakeAsync(async() => {
            // Given a user that is connected
            ConnectedUserServiceMock.setUser(UserMocks.CONNECTED_AUTH_USER);
            testUtils.detectChanges();

            // When displaying a chat that contains a message
            await addMessages('fauxChat', 1);
            testUtils.detectChanges();

            // Then we should see the sender name and the message content
            const sender: DebugElement = testUtils.findElement('.chat-sender');
            expect(sender.nativeElement.innerText).toEqual(MSG.sender.name + ' : ');
            const message: DebugElement = testUtils.findElement('.chat-message');
            expect(message.nativeElement.innerText).toEqual(MSG.content);
        }));
        it('should propose to hide chat when chat is visible, and work', fakeAsync(async() => {
            // Given a user that is connected
            ConnectedUserServiceMock.setUser(UserMocks.CONNECTED_AUTH_USER);
            testUtils.detectChanges();
            let switchButton: DebugElement = testUtils.findElement('#switchChatVisibilityButton');
            const chat: DebugElement = testUtils.findElement('#chatForm');
            expect(switchButton.nativeElement.innerText).toEqual('Hide chat'.toUpperCase());
            expect(chat).withContext('Chat should be visible on init').toBeTruthy();

            // When switching the chat visibility
            await testUtils.clickElement('#switchChatVisibilityButton');
            testUtils.detectChanges();

            switchButton = testUtils.findElement('#switchChatVisibilityButton');
            // Then the chat is not visible and the button changes its text
            expect(switchButton.nativeElement.innerText).toEqual('Show chat (no new message)'.toUpperCase());
            testUtils.expectElementNotToExist('#chatDiv');
            testUtils.expectElementNotToExist('#chatForm');
        }));

        it('should propose to show chat when chat is hidden, and work', fakeAsync(async() => {
            ConnectedUserServiceMock.setUser(UserMocks.CONNECTED_AUTH_USER);
            testUtils.detectChanges();
            await testUtils.clickElement('#switchChatVisibilityButton');
            testUtils.detectChanges();

            // Given that the chat is hidden
            let switchButton: DebugElement = testUtils.findElement('#switchChatVisibilityButton');
            expect(switchButton.nativeElement.innerText).toEqual('Show chat (no new message)'.toUpperCase());
            testUtils.expectElementNotToExist('#chatForm');

            // When showing the chat
            await testUtils.clickElement('#switchChatVisibilityButton');
            testUtils.detectChanges();

            // Then the chat is shown
            switchButton = testUtils.findElement('#switchChatVisibilityButton');
            expect(switchButton.nativeElement.innerText).toEqual('Hide chat'.toUpperCase());
            testUtils.expectElementToExist('#chatForm');
        }));
        it('should show how many messages where sent since you hid the chat', fakeAsync(async() => {
            // Given a hidden chat with no message
            ConnectedUserServiceMock.setUser(UserMocks.CONNECTED_AUTH_USER);
            testUtils.detectChanges();
            await testUtils.clickElement('#switchChatVisibilityButton');
            testUtils.detectChanges();
            let switchButton: DebugElement = testUtils.findElement('#switchChatVisibilityButton');
            expect(switchButton.nativeElement.innerText).toEqual('Show chat (no new message)'.toUpperCase());

            // When new messages are received
            await addMessages('fauxChat', 3);
            testUtils.detectChanges();

            // Then the button shows how many new messages there are
            switchButton = testUtils.findElement('#switchChatVisibilityButton');
            expect(switchButton.nativeElement.innerText).toEqual('Show chat (3 new messages)'.toUpperCase());
        }));
        it('should scroll to the bottom on load', fakeAsync(async() => {
            // Given a visible chat with multiple messages
            ConnectedUserServiceMock.setUser(UserMocks.CONNECTED_AUTH_USER);
            spyOn(component, 'scrollTo').and.callThrough();
            await addMessages('fauxChat', 100);

            // When the chat is initialized
            testUtils.detectChanges();

            const chatDiv: DebugElement = testUtils.findElement('#chatDiv');
            expect(component.scrollTo).toHaveBeenCalledWith(chatDiv.nativeElement.scrollHeight);
        }));
        it('should not scroll down upon new messages if the user scrolled up, but show an indicator', fakeAsync(async() => {
            const SCROLL: number = 200;
            // Given a visible chat with multiple messages, that has been scrolled up
            ConnectedUserServiceMock.setUser(UserMocks.CONNECTED_AUTH_USER);
            testUtils.detectChanges();
            await addMessages('fauxChat', 100);
            testUtils.detectChanges();

            const chatDiv: DebugElement = testUtils.findElement('#chatDiv');
            chatDiv.nativeElement.scroll({ top: SCROLL, left: 0, behavior: 'auto' }); // user scrolled up in the chat
            chatDiv.nativeElement.dispatchEvent(new Event('scroll'));
            testUtils.detectChanges();

            // When a new message is received
            await addMessages('fauxChat', 1);
            testUtils.detectChanges();

            // Then the scroll value did not change
            expect(chatDiv.nativeElement.scrollTop).toBe(SCROLL);
            // and the indicator shows that there is a new message
            const indicator: DebugElement = testUtils.findElement('#scrollToBottomIndicator');
            expect(indicator.nativeElement.innerHTML).toEqual('1 new message ↓');
        }));
        it('should scroll to bottom when clicking on the new message indicator', fakeAsync(async() => {
            // Given a visible chat with the indicator
            ConnectedUserServiceMock.setUser(UserMocks.CONNECTED_AUTH_USER);
            testUtils.detectChanges();
            await addMessages('fauxChat', 100);
            testUtils.detectChanges();

            const chatDiv: DebugElement = testUtils.findElement('#chatDiv');
            chatDiv.nativeElement.scroll({ top: 0, left: 0, behavior: 'auto' }); // user scrolled up in the chat
            chatDiv.nativeElement.dispatchEvent(new Event('scroll'));
            testUtils.detectChanges();

            await addMessages('fauxChat', 1); // new message has been received
            testUtils.detectChanges();

            // When the indicator is clicked
            spyOn(component, 'scrollToBottom').and.callThrough();
            await testUtils.clickElement('#scrollToBottomIndicator');
            testUtils.detectChanges();

            // Then the view is scrolled to the bottom
            expect(component.scrollToBottom).toHaveBeenCalledOnceWith();
            // and the indicator has disappeared
            testUtils.expectElementNotToExist('#scrollToBottomIndicator');
        }));
        it('should reset new messages count once messages have been read', fakeAsync(async() => {
            // Given a hidden chat with one unseen message
            ConnectedUserServiceMock.setUser(UserMocks.CONNECTED_AUTH_USER);
            testUtils.detectChanges();
            await testUtils.clickElement('#switchChatVisibilityButton');
            testUtils.detectChanges();
            const sender: MinimalUser = {
                name: 'roger',
                id: 'rogerId',
            };
            await chatService.addMessage('fauxChat', { sender, content: 'Saluuuut', currentTurn: 0, postedTime: serverTimestamp() });
            testUtils.detectChanges();
            let switchButton: DebugElement = testUtils.findElement('#switchChatVisibilityButton');
            expect(switchButton.nativeElement.innerText).toEqual('Show chat (1 new message)'.toUpperCase());

            // When the chat is shown and then hidden again
            await testUtils.clickElement('#switchChatVisibilityButton');
            testUtils.detectChanges();
            await testUtils.clickElement('#switchChatVisibilityButton');
            testUtils.detectChanges();

            // Then the button text is updated
            switchButton = testUtils.findElement('#switchChatVisibilityButton');
            expect(switchButton.nativeElement.innerText).toEqual('Show chat (no new message)'.toUpperCase());
        }));
        it('should send messages using the chat service', fakeAsync(async() => {
            spyOn(chatService, 'sendMessage').and.callThrough();
            // Given a chat
            ConnectedUserServiceMock.setUser(UserMocks.CONNECTED_AUTH_USER);
            testUtils.detectChanges();

            // When the form is filled and the send button clicked
            const messageInput: DebugElement = testUtils.findElement('#message');
            messageInput.nativeElement.value = 'hello';
            messageInput.nativeElement.dispatchEvent(new Event('input'));

            await testUtils.clickElement('#send');
            testUtils.detectChanges();

            // Then the message is sent
            const user: MinimalUser = UserMocks.CONNECTED_MINIMAL_USER;
            expect(chatService.sendMessage).toHaveBeenCalledWith('fauxChat', user, 'hello', 2);
            // and the form is cleared
            expect(messageInput.nativeElement.value).toBe('');
        }));
        it('should scroll to bottom when sending a message', fakeAsync(async() => {
            // Given a chat with many messages
            ConnectedUserServiceMock.setUser(UserMocks.CONNECTED_AUTH_USER);
            await addMessages('fauxChat', 100);
            testUtils.detectChanges();
            spyOn(component, 'scrollTo').and.callThrough();

            // When a message is sent
            component.userMessage = 'hello there';
            testUtils.detectChanges();
            await component.sendMessage();
            testUtils.detectChanges();

            // Then we scroll to the bottom
            const chatDiv: DebugElement = testUtils.findElement('#chatDiv');
            expect(component.scrollTo).toHaveBeenCalledWith(chatDiv.nativeElement.scrollHeight);
        }));
        it('should not loadChatContent when user is online, then updated but still online', fakeAsync(async() => {
            // Given a chat component
            const userDAO: UserDAO = TestBed.inject(UserDAO);
            await userDAO.set(UserMocks.CREATOR_MINIMAL_USER.id, UserMocks.CREATOR);
            tick(0);
            ConnectedUserServiceMock.setUser(UserMocks.CREATOR_AUTH_USER, true);
            testUtils.detectChanges();

            // When the user's lastUpdateTime is updated
            spyOn(component, 'loadChatContent').and.callThrough();
            ConnectedUserServiceMock.setUser(UserMocks.CREATOR_AUTH_USER, true);
            tick(0);

            // Then loadChatContent should not have been called
            expect(component.loadChatContent).not.toHaveBeenCalled();
        }));
        it('should not do anything when a message is deleted', fakeAsync(async() => {
            // Given a chat with some messages
            ConnectedUserServiceMock.setUser(UserMocks.CONNECTED_AUTH_USER);
            const messageId: string = await chatService.addMessage('fauxChat', MSG);
            testUtils.detectChanges();

            // When a message is deleted
            await chatDAO.subCollectionDAO('fauxChat', 'messages').delete(messageId);

            // Then no error must have been encountered
            expect(() => testUtils.detectChanges()).not.toThrowError();
        }));
        it('should unsubscribe from the chat when destroying component', fakeAsync(async() => {
            // Given a chat
            const expectUnsubscribeToHaveBeenCalled: () => void = prepareUnsubscribeCheck(chatService, 'subscribeToMessages');
            testUtils.detectChanges();

            // When it is destroyed
            component.ngOnDestroy();

            // Then it should have unsubscribed from active users
            expectUnsubscribeToHaveBeenCalled();
        }));
        afterEach(fakeAsync(async() => {
            component.ngOnDestroy();
        }));
    });
});
