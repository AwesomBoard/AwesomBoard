import { ChangeDetectorRef, Component } from '@angular/core';
import { MessageDisplayer } from 'src/app/services/MessageDisplayer';
import { LascaRules } from './LascaRules';
import { CheckersComponent } from '../common/checkers.component';
import { ScoreName } from 'src/app/components/game-components/game-component/GameComponent';

@Component({
    selector: 'app-lasca',
    templateUrl: '../common/checkers.component.html',
    styleUrls: ['../../../components/game-components/game-component/game-component.scss'],
})
export class LascaComponent extends CheckersComponent<LascaRules> {

    public constructor(messageDisplayer: MessageDisplayer, cdr: ChangeDetectorRef) {
        super(messageDisplayer, cdr);
        this.setRulesAndNode('Lasca');
    }

    public override getScoreName(): ScoreName {
        return ScoreName.STACKS_UNDER_CONTROL;
    }


}
