import { FirestoreDocument } from '../dao/FirestoreDAO';
import { MinimalUser } from './MinimalUser';
import { FirestoreTime } from './Time';

export type UserRoleInPart = 'Player' | 'Observer' | 'Creator' | 'ChosenOpponent' | 'Candidate';

// The "current game" is the only game in which a user can be at any point in time.
// The user can be a player in the game (in which case the opponent field is set)
// or they can be an observer. The role field indicates this.
export type CurrentGame = {
    id: string,
    typeGame: string,
    opponent?: MinimalUser | null,
    role: UserRoleInPart,
};

export type User = {
    username?: string; // may not be set initially for google users
    lastUpdateTime?: FirestoreTime,
    verified: boolean,
    // The current game in which the user is. It is null if there is no current game.
    currentGame?: CurrentGame | null,

    // Extra fields as sub-collections:
    // elos: subcollection of EloInfo (elos)
};

export type UserDocument = FirestoreDocument<User>;
