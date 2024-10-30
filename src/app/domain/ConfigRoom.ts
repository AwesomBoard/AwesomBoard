import { FirestoreDocument } from '../dao/FirestoreDAO';
import { Utils } from '@everyboard/lib';
import { MinimalUser } from './MinimalUser';
import { RulesConfig } from '../jscaip/RulesConfigUtil';

// On top of these fields, a config room has a subcollection of candidates, which are MinimalUsers
export type ConfigRoom = {
    readonly creator: MinimalUser;
    readonly chosenOpponent: MinimalUser | null;
    readonly partStatus: IPartStatus;

    readonly firstPlayer: IFirstPlayer;
    readonly partType: IPartType;
    readonly maximalMoveDuration: number;
    readonly totalPartDuration: number;
    readonly rulesConfig: RulesConfig;
};

export type ConfigRoomDocument = FirestoreDocument<ConfigRoom>;

export type IFirstPlayer = 'CREATOR' | 'RANDOM' | 'CHOSEN_PLAYER';

export class FirstPlayer {

    private constructor(public value: IFirstPlayer) {}

    public static readonly CREATOR: FirstPlayer = new FirstPlayer('CREATOR');

    public static readonly RANDOM: FirstPlayer = new FirstPlayer('RANDOM');

    public static readonly CHOSEN_PLAYER: FirstPlayer = new FirstPlayer('CHOSEN_PLAYER');

    public static of(value: string): FirstPlayer {
        switch (value) {
            case 'CREATOR': return FirstPlayer.CREATOR;
            case 'RANDOM': return FirstPlayer.RANDOM;
            default:
                Utils.assert(value === 'CHOSEN_PLAYER', 'Invalid value for FirstPlayer: ' + value + '.');
                return FirstPlayer.CHOSEN_PLAYER;
        }
    }
}
export type IPartType = 'STANDARD' | 'BLITZ' | 'CUSTOM';

export class PartType {
    private constructor(public value: IPartType) {}

    public static readonly STANDARD: PartType = new PartType('STANDARD');

    public static readonly BLITZ: PartType = new PartType('BLITZ');

    public static readonly CUSTOM: PartType = new PartType('CUSTOM');

    public static NORMAL_MOVE_DURATION: number = 2 * 60;
    public static NORMAL_PART_DURATION: number = 30 * 60;
    public static BLITZ_MOVE_DURATION: number = 30;
    public static BLITZ_PART_DURATION: number = 15 * 60;

    public static of(value: string): PartType {
        switch (value) {
            case 'STANDARD': return PartType.STANDARD;
            case 'BLITZ': return PartType.BLITZ;
            case 'CUSTOM': return PartType.CUSTOM;
            default: throw new Error('Invalid part type: ' + value + '.');
        }
    }
}

export type IPartStatus = number;

export class PartStatus {
    private constructor(public value: IPartStatus) {}
    // part created, no ChosenOpponent => waiting for acceptable candidate
    public static PART_CREATED: PartStatus = new PartStatus(0);
    // part created, ChosenOpponent selected, config proposed by the creator
    // => waiting the config room to accept them
    public static CONFIG_PROPOSED: PartStatus = new PartStatus(2);
    // part created, ChosenOpponent selected, config proposed by the created, accepted by the config room
    // => part started
    public static PART_STARTED: PartStatus = new PartStatus(3);

    public static PART_FINISHED: PartStatus = new PartStatus(4);
}
