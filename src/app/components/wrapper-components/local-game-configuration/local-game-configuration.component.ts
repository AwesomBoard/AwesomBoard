import { ChangeDetectorRef, Component } from '@angular/core';

import { MGPOptional, Utils } from '@everyboard/lib';

import { BaseWrapperComponent } from '../BaseWrapperComponent';
import { DemoNodeInfo } from '../demo-card-wrapper/demo-card-wrapper.component';
import { ConfigDescriptionType, RulesConfig } from 'src/app/jscaip/RulesConfigUtil';
import { ActivatedRoute, Router } from '@angular/router';
import { GameState } from 'src/app/jscaip/state/GameState';
import { AbstractNode, GameNode } from 'src/app/jscaip/AI/GameNode';


/**
 * This component appears when we start a local game.
 * Its role is to setup the configuration, possibly letting the user choose the config if the game allows it.
 * When the config is selected, we switch to LocalGameWrapper.
 * If the game is not configurable, we directly switch to LocalGameWrapper.
 */
@Component({
    selector: 'app-local-game-configuration',
    templateUrl: './local-game-configuration.component.html',
})
export class LocalGameConfigurationComponent extends BaseWrapperComponent {

    public configDemo: DemoNodeInfo;

    public rulesConfig: MGPOptional<RulesConfig> = MGPOptional.empty();

    public constructor(activatedRoute: ActivatedRoute,
                       private readonly router: Router,
                       private readonly cdr: ChangeDetectorRef)
    {
        super(activatedRoute);
    }

    private setConfigDemo(config: RulesConfig): void {
        const stateProvider: MGPOptional<(config: MGPOptional<RulesConfig>) => GameState> = this.getStateProvider();
        if (stateProvider.isPresent()) {
            const node: AbstractNode = new GameNode(stateProvider.get()(MGPOptional.of(config)));
            this.configDemo = {
                click: MGPOptional.empty(),
                name: this.getGameUrlName(),
                node,
            };
            this.cdr.detectChanges();
        }
    }

    public getConfigDemo(): DemoNodeInfo {
        return this.configDemo;
    }

    public async updateConfig(rulesConfig: MGPOptional<RulesConfig>): Promise<void> {
        this.rulesConfig = rulesConfig;
        // If there is no config for this game, then rulesConfig value will be {}
        Utils.assert(rulesConfig.isPresent(), 'There should always be a config. Configless games have {}');
        this.setConfigDemo(rulesConfig.get());
        if (Object.keys(rulesConfig.get()).length === 0) {
            // There is nothing to configure for this game, start it!
            await this.startGame();
        }
    }

    public async startGame(): Promise<boolean> {
        Utils.assert(this.rulesConfig.isPresent(), 'Cannot start the game without having chosen a config');
        const rulesConfig: RulesConfig = this.rulesConfig.get();
        if (Object.keys(rulesConfig).length === 0) {
            // game without config, start it
            return this.router.navigate(['/local', this.getGameUrlName()]);
        }
        const defaultConfig: RulesConfig = this.getRulesConfigDescription().get().getDefaultConfig().config;
        if (JSON.stringify(rulesConfig) === JSON.stringify(defaultConfig)) {
            // This is the default config, no need to specify it in the parameters
            return this.router.navigate(['/local', this.getGameUrlName()]);
        } else {
            const queryParams: { [key: string]: string } =
                Object.fromEntries(Object.entries(rulesConfig)
                    .map((configElement: [string, ConfigDescriptionType]) => {
                        return [configElement[0], JSON.stringify(configElement[1])];
                    }));
            return this.router.navigate(['/local', this.getGameUrlName()], { queryParams: queryParams });
        }
    }

}
