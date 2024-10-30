import { AfterViewInit, ChangeDetectorRef, Component, Input, OnChanges, SimpleChanges, ViewChild, ViewContainerRef } from '@angular/core';
import { MGPOptional, MGPValidation, Utils } from '@everyboard/lib';
import { GameWrapper } from '../../wrapper-components/GameWrapper';
import { ActivatedRoute, Router } from '@angular/router';
import { ConnectedUserService } from 'src/app/services/ConnectedUserService';
import { MessageDisplayer } from 'src/app/services/MessageDisplayer';
import { Move } from 'src/app/jscaip/Move';
import { PlayerOrNone } from 'src/app/jscaip/Player';
import { TutorialGameWrapperMessages } from '../tutorial-game-wrapper/tutorial-game-wrapper.component';
import { AbstractNode } from 'src/app/jscaip/AI/GameNode';

export type DemoNodeInfo = {
    name: string, // The name of the game
    node: AbstractNode, // The demo node
    click: MGPOptional<string>, // An element to click
}

@Component({
    selector: 'app-demo-card',
    template: `<div class="is-fullheight"><div #board></div></div>`,
})
export class DemoCardWrapperComponent extends GameWrapper<string> implements AfterViewInit, OnChanges {

    @Input() public demoNodeInfo: DemoNodeInfo;

    @ViewChild('board', { read: ViewContainerRef })
    public override boardRef: ViewContainerRef | null = null;

    private gameComponentIsSetup: boolean = false;

    public constructor(activatedRoute: ActivatedRoute,
                       connectedUserService: ConnectedUserService,
                       router: Router,
                       messageDisplayer: MessageDisplayer,
                       private readonly cdr: ChangeDetectorRef)
    {
        super(activatedRoute, connectedUserService, router, messageDisplayer);
    }

    public async ngAfterViewInit(): Promise<void> {
        window.setTimeout(async() => {
            await this.createMatchingGameComponent();
            this.gameComponent.node = this.demoNodeInfo.node;
            // The component needs to be interactive in order to show all possible stylistic elements
            await this.setInteractive(true);
            // The board needs to be updated to render the changed node, setRole will do it
            await this.setRole(this.gameComponent.getCurrentPlayer());
            // Need to detect changes before potentially clicking,
            // and otherwise we'll get an angular exception in our tests
            this.cdr.detectChanges();
            // We perform a click if necessary
            if (this.demoNodeInfo.click.isPresent()) {
                const element: Element = Utils.getNonNullable(document.querySelector(this.demoNodeInfo.click.get()));
                element.dispatchEvent(new Event('click'));
                // Update the view after the click
                this.cdr.detectChanges();
            }
            this.gameComponentIsSetup = true;
            await this.setRole(PlayerOrNone.NONE);
        }, 1);
    }

    public async ngOnChanges(_changes: SimpleChanges): Promise<void> {
        // This function is triggered when the parent component modifies the @Input of this one
        // And also it is called on creation, then, this.gameComponent is not set yet
        if (this.gameComponent != null) {
            // When it is, we want to manually update the board with the new infos and display them
            this.gameComponent.node = this.demoNodeInfo.node;
            await this.gameComponent.updateBoardAndRedraw(false);
        }
    }

    protected override getGameUrlName(): string {
        // Unlike all other BaseWrapperComponent those will share one page: everyboard.org/demo
        // Hence we cannot read the name of the game via the URL
        return this.demoNodeInfo.name;
    }

    public async onLegalUserMove(_move: Move, _scores?: [number, number] | undefined): Promise<void> {
        Utils.assert(false, 'DemoCardWrapper should not call applyLegalMove, as it does no move');
    }

    public override getPlayer(): string {
        // Note, this code is never reached, as getPlayer only get called by GameWrapper when needed
        // and it is only needed in GameWrapper.canUserPlay (that is overriden here)
        // and in getBoardHighlight, unused in demo cards.
        return 'no-player';
    }

    public override async canUserPlay(_clickedElementName: string): Promise<MGPValidation> {
        if (this.gameComponentIsSetup) {
            // This is when some user try to click on a demo
            return MGPValidation.failure(TutorialGameWrapperMessages.THIS_IS_A_DEMO());
        } else {
            // This click is done by ourselves, to set up the game component for the demo
            return MGPValidation.SUCCESS;
        }
    }

}
