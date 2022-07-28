import { AuthUser } from '../services/ConnectedUserService';
import { MGPOptional } from '../utils/MGPOptional';
import { MinimalUser } from './MinimalUser';
import { User } from './User';

export class UserMocks {

    public static readonly USER_WITHOUT_EMAIL: AuthUser = new AuthUser('jeanlinconnu8012',
                                                                       MGPOptional.empty(),
                                                                       MGPOptional.empty(),
                                                                       false);

    public static readonly CONNECTED_UNVERIFIED: AuthUser = new AuthUser('jeanjaja123',
                                                                         MGPOptional.of('jean@jaja.europe'),
                                                                         MGPOptional.of('Jean Jaja'),
                                                                         false);

    public static readonly CONNECTED_AUTH_USER: AuthUser = new AuthUser('creator-user-doc-id',
                                                                        MGPOptional.of('cre@tor'),
                                                                        MGPOptional.of('creator'),
                                                                        true);

    public static readonly OPPONENT_AUTH_USER: AuthUser = new AuthUser('firstCandidateUserDocId',
                                                                       MGPOptional.of('opp@nante'),
                                                                       MGPOptional.of('firstCandidate'),
                                                                       true);

    public static readonly OTHER_OPPONENT_AUTH_USER: AuthUser = new AuthUser('whoever88',
                                                                             MGPOptional.of('forgotten@everywhere'),
                                                                             MGPOptional.of('ForeverAlone'),
                                                                             true);

    public static readonly CANDIDATE_AUTH_USER: AuthUser = new AuthUser('candidateDocId',
                                                                        MGPOptional.of('candi@ate'),
                                                                        MGPOptional.of('Candid_Hate'),
                                                                        true);

    public static readonly CREATOR_AUTH_USER: AuthUser = UserMocks.CONNECTED_AUTH_USER;

    public static readonly CREATOR: User = {
        username: UserMocks.CREATOR_AUTH_USER.username.get(),
        state: 'online',
        verified: true,
        last_changed: { seconds: 123, nanoseconds: 456000000 },
    };
    public static readonly CONNECTED: User = {
        username: UserMocks.CONNECTED_AUTH_USER.username.get(),
        state: 'online',
        verified: true,
    };
    public static readonly OPPONENT: User = {
        username: UserMocks.OPPONENT_AUTH_USER.username.get(),
        state: 'online',
        verified: true,
        last_changed: { seconds: 124, nanoseconds: 456000000 },
    };
    public static readonly CREATOR_MINIMAL_USER: MinimalUser = UserMocks.CREATOR_AUTH_USER.toMinimalUser();

    public static readonly CONNECTED_MINIMAL_USER: MinimalUser = UserMocks.CONNECTED_AUTH_USER.toMinimalUser();

    public static readonly OPPONENT_MINIMAL_USER: MinimalUser = UserMocks.OPPONENT_AUTH_USER.toMinimalUser();

    public static readonly CANDIDATE_MINIMAL_USER: MinimalUser = UserMocks.CANDIDATE_AUTH_USER.toMinimalUser();

    public static readonly OTHER_OPPONENT_MINIMAL_USER: MinimalUser =
        UserMocks.OTHER_OPPONENT_AUTH_USER.toMinimalUser();
}
