import { ActivatedRoute } from '@angular/router';
import { MGPOptional, Utils } from '@everyboard/lib';
import { BaseComponent } from '../BaseComponent';
import { GameInfo } from '../normal-component/pick-game/pick-game.component';

export abstract class BaseWrapperComponent extends BaseComponent {

    public constructor(public readonly activatedRoute: ActivatedRoute) {
        super();
    }

    protected getGameUrlName(): string {
        return Utils.getNonNullable(this.activatedRoute.snapshot.paramMap.get('compo'));
    }

    protected getGameName(): MGPOptional<string> {
        // May be empty if the game does not actually exist
        return GameInfo.getByUrlName(this.getGameUrlName()).map((info: GameInfo) => info.name);
    }

}
