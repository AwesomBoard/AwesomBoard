/* eslint-disable max-lines-per-function */
import { serverTimestamp } from 'firebase/firestore';
import { MGPResult, Part } from './Part';
import { UserMocks } from './UserMocks.spec';

export class PartMocks {

    public static readonly INITIAL: Part = {
        typeGame: 'Quarto',
        playerZero: UserMocks.CREATOR_MINIMAL_USER,
        playerZeroElo: 0,
        turn: -1,
        result: MGPResult.UNACHIEVED.value,
    };

    public static readonly OTHER_UNSTARTED: Part = {
        typeGame: 'Quarto',
        playerZero: { id: 'not-creator-id', name: 'not_creator' },
        playerZeroElo: 0,
        turn: -1,
        result: MGPResult.UNACHIEVED.value,
    };

    public static readonly STARTED: Part = {
        typeGame: 'Quarto',
        playerZero: UserMocks.CREATOR_MINIMAL_USER,
        playerZeroElo: 0,
        turn: 0,
        result: MGPResult.UNACHIEVED.value,
        playerOne: UserMocks.OPPONENT_MINIMAL_USER,
        beginning: serverTimestamp(),
    };

    public static readonly OTHER_STARTED: Part = {
        typeGame: 'Quarto',
        playerZero: UserMocks.OTHER_CREATOR_MINIMAL_USER,
        playerZeroElo: 0,
        turn: 0,
        result: MGPResult.UNACHIEVED.value,
        playerOne: UserMocks.OTHER_OPPONENT_MINIMAL_USER,
        beginning: serverTimestamp(),
    };

    public static readonly FINISHED: Part = {
        typeGame: 'Quarto',
        playerZero: UserMocks.OPPONENT_MINIMAL_USER,
        playerZeroElo: 0,
        playerOne: UserMocks.CREATOR_MINIMAL_USER,
        result: MGPResult.VICTORY.value,
        turn: 2,
        beginning: serverTimestamp(),
        loser: UserMocks.CREATOR_MINIMAL_USER,
        winner: UserMocks.OPPONENT_MINIMAL_USER,
    };
}
