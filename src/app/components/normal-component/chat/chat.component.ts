import { Component, Input, OnDestroy, ElementRef, ViewChild, OnInit, AfterViewChecked } from '@angular/core';
import { ChatService } from '../../../services/ChatService';
import { Message, MessageDocument } from '../../../domain/Message';
import { ConnectedUserService } from 'src/app/services/ConnectedUserService';
import { faReply, IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { FirestoreCollectionObserver } from 'src/app/dao/FirestoreCollectionObserver';
import { MinimalUser } from 'src/app/domain/MinimalUser';
import { Subscription } from 'rxjs';
import { Debug } from 'src/app/utils/Debug';
import { Utils } from '@everyboard/lib';

@Component({
    selector: 'app-chat',
    templateUrl: './chat.component.html',
})
@Debug.log
export class ChatComponent implements OnInit, AfterViewChecked, OnDestroy {

    @Input() public chatId!: string;
    @Input() public turn?: number;
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

    private chatSubscription!: Subscription; // initialized in ngOnInit

    @ViewChild('chatDiv')
    private readonly chatDiv: ElementRef<HTMLElement>;

    public constructor(private readonly chatService: ChatService,
                       private readonly connectedUserService: ConnectedUserService)
    {
    }
    public ngOnInit(): void {
        Utils.assert(this.chatId != null && this.chatId !== '', 'No chat to join mentionned');
        this.loadChatContent();
    }
    public ngAfterViewChecked(): void {
        this.scrollToBottomIfNeeded();
    }
    public loadChatContent(): void {
        const updateMessages: (messages: MessageDocument[]) => void = (messages: MessageDocument[]) => {
            this.updateMessages(messages.flatMap((doc: MessageDocument) => {
                if (doc.data.postedTime == null) {
                    // This is a local update that does not contain the time yet, ignore it
                    return [];
                }
                return [doc.data];
            }));
        };
        const callback: FirestoreCollectionObserver<Message> = new FirestoreCollectionObserver(
            updateMessages,
            updateMessages,
            () => {
                // We don't care about deleted messages
            });
        this.chatSubscription = this.chatService.subscribeToMessages(this.chatId, callback);
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
        const sender: MinimalUser = this.connectedUserService.user.get().toMinimalUser();
        await this.chatService.sendMessage(this.chatId, sender, content, this.turn);
    }
    public ngOnDestroy(): void {
        this.chatSubscription.unsubscribe();
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
