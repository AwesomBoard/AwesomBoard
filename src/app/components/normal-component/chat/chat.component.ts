import { Component, Input, ElementRef, ViewChild, OnInit, AfterViewChecked, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { faReply, IconDefinition } from '@fortawesome/free-solid-svg-icons';

import { Utils } from '@everyboard/lib';

import { ChatService } from '../../../services/ChatService';
import { Message } from '../../../domain/Message';
import { Debug } from 'src/app/utils/Debug';

@Component({
    selector: 'app-chat',
    templateUrl: './chat.component.html',
})
@Debug.log
export class ChatComponent implements OnInit, AfterViewChecked, OnDestroy {

    @Input() public chatId!: string;
    public userMessage: string = '';

    public connected: boolean = false;
    public chat: Message[] = [];
    public readMessages: number = 0;
    public unreadMessagesText: string = '';
    public showUnreadMessagesButton: boolean = false;
    public visible: boolean = true;

    public faReply: IconDefinition = faReply;

    private isNearBottom: boolean = true;
    private notYetScrolled: boolean = true;

    @ViewChild('chatDiv')
    private readonly chatDiv: ElementRef<HTMLElement>;

    private chatSubscription!: Subscription;

    public constructor(private readonly chatService: ChatService) {
    }

    public ngOnInit(): void {
        Utils.assert(this.chatId != null && this.chatId !== '', 'No chat to join mentionned');
        this.loadChatContent();
    }

    private loadChatContent(): void {
        this.chatSubscription = this.chatService.subscribeToMessages((message: Message) => {
            this.updateMessages([message]);
        });
    }

    public ngOnDestroy(): void {
        this.chatSubscription.unsubscribe();
    }

    public ngAfterViewChecked(): void {
        this.scrollToBottomIfNeeded();
    }

    public updateMessages(newMessages: Message[]): void {
        this.chat = this.chat.concat(newMessages);
        const nbMessages: number = this.chat.length;
        if (this.visible && this.isNearBottom) {
            this.readMessages = nbMessages;
            this.updateUnreadMessagesText(0);
            this.scrollToBottom();
        } else {
            this.updateUnreadMessagesText(nbMessages - this.readMessages);
        }
    }

    private updateUnreadMessagesText(unreadMessages: number): void {
        if (this.visible && this.isNearBottom === false) {
            this.showUnreadMessagesButton = true;
        } else {
            this.showUnreadMessagesButton = false;
        }

        if (unreadMessages === 0) {
            this.unreadMessagesText = $localize`no new message`;
            this.showUnreadMessagesButton = false;
        } else if (unreadMessages === 1) {
            this.unreadMessagesText = $localize`1 new message`;
        } else {
            this.unreadMessagesText = $localize`${unreadMessages} new messages`;
        }
    }

    private scrollToBottomIfNeeded(): void {
        if (this.visible) {
            if (this.isNearBottom || this.notYetScrolled) {
                this.scrollToBottom();
            }
        }
    }

    public updateCurrentScrollPosition(): void {
        const threshold: number = 10;
        const position: number = this.chatDiv.nativeElement.scrollTop + this.chatDiv.nativeElement.offsetHeight;
        const height: number = this.chatDiv.nativeElement.scrollHeight;
        this.isNearBottom = position > height - threshold;
    }

    public scrollToBottom(): void {
        if (this.chatDiv == null) {
            return;
        }
        this.updateUnreadMessagesText(0);
        this.scrollTo(this.chatDiv.nativeElement.scrollHeight);
        this.notYetScrolled = false;
    }

    public scrollTo(position: number): void {
        this.chatDiv.nativeElement.scroll({
            top: position,
            left: 0,
            behavior: 'smooth',
        });
    }

    public async sendMessage(): Promise<void> {
        const content: string = this.userMessage;
        this.userMessage = ''; // clears it first to seem more responsive
        await this.chatService.sendMessage(content);
    }

    public switchChatVisibility(): void {
        if (this.visible) {
            this.visible = false;
        } else {
            this.visible = true;
            this.updateUnreadMessagesText(0);
            this.scrollToBottom();
            this.readMessages = this.chat.length;
        }
    }
}
