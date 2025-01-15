import { MGPOptional } from '@everyboard/lib';

import { RulesConfigDescription } from './RulesConfigDescription';
import { GameInfo } from '../../normal-component/pick-game/pick-game.component';
import { DefaultConfigDescription, RulesConfig } from 'src/app/jscaip/RulesConfigUtil';

describe(`RulesConfigDescriptions`, () => {

    for (const gameInfo of GameInfo.getAllGames()) {

        const rulesConfigDescription: MGPOptional<RulesConfigDescription<RulesConfig>> =
            gameInfo.rules.getRulesConfigDescription();

        if (rulesConfigDescription.isPresent()) {

            it(`should have internationalized fields of ${ gameInfo.urlName }`, () => {
                for (const field of rulesConfigDescription.get().getFields()) {
                    const defaultConfigDescription: DefaultConfigDescription =
                        rulesConfigDescription.get().defaultConfigDescription;
                    expect(defaultConfigDescription.config[field].title().length).toBeGreaterThan(0);
                }
            });

            it(`should have an internationalized name for each standard config of ${ gameInfo.urlName }`, () => {
                for (const standardConfig of rulesConfigDescription.get().getStandardConfigs()) {
                    expect(standardConfig.name().length).toBeGreaterThan(0);
                }
            });

        }

    }

});
