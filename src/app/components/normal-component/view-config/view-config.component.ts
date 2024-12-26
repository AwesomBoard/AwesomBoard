import { Component, Input } from '@angular/core';
import { faCog, IconDefinition } from '@fortawesome/free-solid-svg-icons';

import { MGPOptional } from '@everyboard/lib';

import { RulesConfig } from 'src/app/jscaip/RulesConfigUtil';
import { RulesConfigDescription } from '../../wrapper-components/rules-configuration/RulesConfigDescription';

@Component({
    selector: 'app-view-config',
    templateUrl: './view-config.html',
})
export class ViewConfigComponent {

    @Input() rulesConfig: MGPOptional<RulesConfig>;
    @Input() rulesConfigDescription: MGPOptional<RulesConfigDescription<RulesConfig>>;
    @Input() gameName: string;

    public faCog: IconDefinition = faCog;
    public viewConfig: boolean = false;

    public openConfig(): void {
        this.viewConfig = true;
    }

    public closeConfig(): void {
        this.viewConfig = false;
    }

}
