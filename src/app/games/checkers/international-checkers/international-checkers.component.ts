import { ChangeDetectorRef, Component } from '@angular/core';
import { MessageDisplayer } from 'src/app/services/MessageDisplayer';
import { InternationalCheckersRules } from './InternationalCheckersRules';
import { CheckersComponent } from '../common/checkers.component';

@Component({
    selector: 'app-international-checkers',
    templateUrl: '../common/checkers.component.html',
    styleUrls: ['../../../components/game-components/game-component/game-component.scss'],
})
export class InternationalCheckersComponent extends CheckersComponent<InternationalCheckersRules> {

    public constructor(messageDisplayer: MessageDisplayer, cdr: ChangeDetectorRef) {
        super(messageDisplayer, cdr);
        this.setRulesAndNode('InternationalCheckers');
        this.setEverything();
    }

}
