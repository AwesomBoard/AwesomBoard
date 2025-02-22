/* eslint-disable no-multi-spaces */
import { MGPOptional, Utils } from '@everyboard/lib';
import { GameInfo } from '../components/normal-component/pick-game/pick-game.component';
import { ConfigLine } from '../components/wrapper-components/rules-configuration/RulesConfigDescription';
import { Localized } from '../utils/LocaleUtils';

export type ConfigDescriptionType = number | boolean;

export type NamedRulesConfig<R extends RulesConfig = EmptyRulesConfig> = {
    config: R;
    name: Localized;
};

export type DefaultConfigDescription<R extends RulesConfig = EmptyRulesConfig> = {
    name: Localized,
    config: Record<keyof R, ConfigLine>,
}

export type RulesConfig = {
    [member: string]: ConfigDescriptionType;
}

export type EmptyRulesConfig = Record<string, never>;

export type NoConfig = MGPOptional<EmptyRulesConfig>;

export class RulesConfigUtils {

    /**
     * Returns the default config for that game. The game should exist.
     * It can be MGPOptional.empty() in case there is no configurability for this game.
     */
    public static getGameDefaultConfig<C extends RulesConfig>(gameName: string): MGPOptional<C> {
        const gameInfos: MGPOptional<GameInfo> = GameInfo.getByUrlName(gameName);
        // Utils.assert(gameInfos.isPresent(), `getGameDefaultConfig called with unexisting game: ${gameName}`);
        return gameInfos.get().getRulesConfig() as MGPOptional<C>;
    }

}
