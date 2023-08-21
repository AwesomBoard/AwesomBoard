import { AfterViewInit, ChangeDetectorRef, Component, Input, ViewChild, ViewContainerRef } from '@angular/core';
import { AbstractNode } from 'src/app/jscaip/MGPNode';
import { Utils } from 'src/app/utils/utils';
import { MGPOptional } from 'src/app/utils/MGPOptional';
import { GameWrapper } from '../../wrapper-components/GameWrapper';
import { ActivatedRoute, Router } from '@angular/router';
import { ConnectedUserService } from 'src/app/services/ConnectedUserService';
import { MessageDisplayer } from 'src/app/services/MessageDisplayer';
import { Move } from 'src/app/jscaip/Move';
import { GameInfo } from '../../normal-component/pick-game/pick-game.component';
import { GameConfig } from 'src/app/jscaip/ConfigUtil';

export type DemoNodeInfo = {
    name: string, // The name of the game
    node: AbstractNode, // The demo node
    click: MGPOptional<string>, // An element to click
}

@Component({
    selector: 'app-demo-card',
    template: `<div #board></div>`,
})
export class DemoCardWrapperComponent extends GameWrapper<string> implements AfterViewInit {

    @Input() public demoNodeInfo: DemoNodeInfo;

    @ViewChild('board', { read: ViewContainerRef })

    public override boardRef: ViewContainerRef | null = null;

    public constructor(actRoute: ActivatedRoute,
                       connectedUserService: ConnectedUserService,
                       router: Router,
                       messageDisplayer: MessageDisplayer,
                       private readonly cdr: ChangeDetectorRef)
    {
        super(actRoute, connectedUserService, router, messageDisplayer);
    }

    protected override getGameName(): string {
        return this.demoNodeInfo.name;
    }
    public async ngAfterViewInit(): Promise<void> {
        setTimeout(async() => {
            await this.afterViewInit();
            this.gameComponent.node = this.demoNodeInfo.node;
            // The board needs to be updated to render the changed node, setRole will do it
            this.setRole(this.gameComponent.getCurrentPlayer());
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
        }, 1);
    }
    public async onLegalUserMove(move: Move, scores?: [number, number] | undefined): Promise<void> {
        return;
    }
    public getPlayer(): string {
        return 'no-player';
    }
    public onCancelMove(_reason?: string | undefined): void {
        return;
    }
    public getConfig(): GameConfig {
        const gameURL: string = this.getGameName();
        const game: GameInfo = GameInfo.ALL_GAMES().filter((gameInfo: GameInfo) => gameInfo.urlName === gameURL)[0];
        return {}; // TODO: do it !
    }
}
