/* eslint-disable max-lines-per-function */
import { MGPOptional } from '@everyboard/lib';

import { RulesConfig } from '../jscaip/RulesConfigUtil';
import { FirstPlayer, ConfigRoom, PartStatus, PartType } from './ConfigRoom';
import { UserMocks } from './UserMocks.spec';

export class ConfigRoomMocks {

    public static getInitial(rulesConfig: MGPOptional<RulesConfig>): ConfigRoom {
        return {
            creator: UserMocks.CREATOR_MINIMAL_USER,
            chosenOpponent: null,
            // We don't want the first player to be random here, to minimize non-deterministic tests
            firstPlayer: FirstPlayer.CREATOR.value,
            partType: PartType.STANDARD.value,
            partStatus: PartStatus.PART_CREATED.value,
            maximalMoveDuration: PartType.NORMAL_MOVE_DURATION,
            totalPartDuration: PartType.NORMAL_PART_DURATION,
            rulesConfig: rulesConfig.getOrElse({}),
        };
    }

    public static getInitialRandom(rulesConfig: MGPOptional<RulesConfig>): ConfigRoom {
        return {
            ...ConfigRoomMocks.getInitial(rulesConfig),
            firstPlayer: FirstPlayer.RANDOM.value,
        };
    }

    public static withChosenOpponent(rulesConfig: MGPOptional<RulesConfig>): ConfigRoom {
        return {
            ...ConfigRoomMocks.getInitial(rulesConfig),
            chosenOpponent: UserMocks.OPPONENT_MINIMAL_USER,
        };
    }

    public static withAnotherChosenOpponent(rulesConfig: MGPOptional<RulesConfig>): ConfigRoom {
        return {
            ...ConfigRoomMocks.getInitial(rulesConfig),
            chosenOpponent: UserMocks.OTHER_OPPONENT_MINIMAL_USER,
        };
    }

    public static withProposedConfig(rulesConfig: MGPOptional<RulesConfig>): ConfigRoom {
        return {
            ...ConfigRoomMocks.getInitial(rulesConfig),
            chosenOpponent: UserMocks.OPPONENT_MINIMAL_USER,
            partStatus: PartStatus.CONFIG_PROPOSED.value,
        };
    }

    public static withAcceptedConfig(rulesConfig: MGPOptional<RulesConfig>): ConfigRoom {
        return {
            ...ConfigRoomMocks.getInitial(rulesConfig),
            chosenOpponent: UserMocks.OPPONENT_MINIMAL_USER,
            partStatus: PartStatus.PART_STARTED.value,
        };
    }

}
