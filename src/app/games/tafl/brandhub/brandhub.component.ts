import { Component } from '@angular/core';
import { BrandhubMove } from 'src/app/games/tafl/brandhub/BrandhubMove';
import { BrandhubRules } from './BrandhubRules';
import { MessageDisplayer } from 'src/app/services/MessageDisplayer';
import { TaflComponent } from '../tafl.component';
import { BrandhubTutorial } from './BrandhubTutorial';
import { TaflState } from '../TaflState';

@Component({
    selector: 'app-brandhub',
    templateUrl: '../tafl.component.html',
    styleUrls: ['../../../components/game-components/game-component/game-component.scss'],
})
export class BrandhubComponent extends TaflComponent<BrandhubRules, BrandhubMove, TaflState> {

    public constructor(messageDisplayer: MessageDisplayer) {
        super(messageDisplayer, BrandhubMove.from);
        this.rules = BrandhubRules.get();
        this.node = this.rules.getInitialNode();
        this.availableAIs = this.createAIs();
        this.encoder = BrandhubMove.encoder;
        this.tutorial = new BrandhubTutorial().tutorial;
    }
}
