/* eslint-disable max-lines-per-function */
import { TestBed } from '@angular/core/testing';
import { Part, MGPResult } from 'src/app/domain/Part';
import { PartMocks } from 'src/app/domain/PartMocks.spec';
import { Player } from 'src/app/jscaip/Player';
import { createConnectedUser, createUnverifiedUser, signOut, reconnectUser } from 'src/app/services/tests/ConnectedUserService.spec';
import { expectPermissionToBeDenied, setupEmulators } from 'src/app/utils/tests/TestUtils.spec';
import { FirestoreCollectionObserver } from '../FirestoreCollectionObserver';
import { PartDAO } from '../PartDAO';
import { UserDAO } from '../UserDAO';
import { serverTimestamp } from 'firebase/firestore';
import { Request } from 'src/app/domain/Request';
import { MGPOptional } from 'src/app/utils/MGPOptional';
import { JoinerDAO } from '../JoinerDAO';
import { MinimalUser } from 'src/app/domain/MinimalUser';
import { JoinerMocks } from 'src/app/domain/JoinerMocks.spec';
import { Time } from 'src/app/domain/Time';
import { UserMocks } from 'src/app/domain/UserMocks.spec';
import { Joiner, PartStatus } from 'src/app/domain/Joiner';

describe('PartDAO', () => {

    let partDAO: PartDAO;
    let userDAO: UserDAO;
    let joinerDAO: JoinerDAO;

    const CREATOR_EMAIL: string = UserMocks.CREATOR_AUTH_USER.email.get();
    const CREATOR_NAME: string = UserMocks.CREATOR_AUTH_USER.username.get();

    const CANDIDATE_EMAIL: string = UserMocks.CANDIDATE_AUTH_USER.email.get();
    const CANDIDATE_NAME: string = UserMocks.CANDIDATE_AUTH_USER.username.get();

    const MALICIOUS_EMAIL: string = 'm@licio.us';
    const MALICIOUS_NAME: string = 'malicious';


    beforeEach(async() => {
        await setupEmulators();
        partDAO = TestBed.inject(PartDAO);
        userDAO = TestBed.inject(UserDAO);
        joinerDAO = TestBed.inject(JoinerDAO);
    });
    it('should be created', () => {
        expect(partDAO).toBeTruthy();
    });
    describe('observeActiveParts', () => {
        it('should call observingWhere with the right condition', () => {
            const callback: FirestoreCollectionObserver<Part> = new FirestoreCollectionObserver<Part>(
                () => void { },
                () => void { },
                () => void { },
            );
            spyOn(partDAO, 'observingWhere');
            partDAO.observeActiveParts(callback);
            expect(partDAO.observingWhere).toHaveBeenCalledWith([['result', '==', MGPResult.UNACHIEVED.value]], callback);
        });
    });
    describe('updateAndBumpIndex', () => {
        it('Should delegate to update and bump index', async() => {
            // Given a PartDAO and an update to make to the part
            spyOn(partDAO, 'update').and.resolveTo();
            const update: Partial<Part> = {
                turn: 42,
            };

            // When calling updateAndBumpIndex
            await partDAO.updateAndBumpIndex('partId', Player.ZERO, 73, update);

            // Then update should have been called with lastUpdate infos added to it
            const expectedUpdate: Partial<Part> = {
                lastUpdate: {
                    index: 74,
                    player: Player.ZERO.value,
                },
                turn: 42,
            };
            expect(partDAO.update).toHaveBeenCalledOnceWith('partId', expectedUpdate);
        });
    });
    describe('userHasActivePart', () => {
        const part: Part = {
            lastUpdate: {
                index: 0,
                player: 0,
            },
            typeGame: 'P4',
            playerZero: UserMocks.CREATOR_MINIMAL_USER,
            turn: 0,
            result: MGPResult.UNACHIEVED.value,
            listMoves: [],
        };
        let creator: MinimalUser;
        beforeEach(async() => {
            // These tests need a logged in user to create documents
            creator = await createConnectedUser(CREATOR_EMAIL, CREATOR_NAME);
        });
        it('should return true when user has an active part as player zero', async() => {
            // Given a part where user is player zero
            await partDAO.create({ ...part, playerZero: creator });
            // When checking if the user has an active part
            const result: boolean = await partDAO.userHasActivePart(creator);
            // Then it should return true
            expect(result).toBeTrue();
        });
        it('should return true when user has an active part as player one', async() => {
            // Given a part where user is player zero
            await partDAO.create({ ...part, playerOne: creator });
            // When checking if the user has an active part
            const result: boolean = await partDAO.userHasActivePart(creator);
            // Then it should return true
            expect(result).toBeTrue();
        });
        it('should return false when the user has no active part', async() => {
            // Given no part where the user is active
            // When checking if the user has an active part
            const result: boolean = await partDAO.userHasActivePart(creator);
            // Then it should return false
            expect(result).toBeFalse();

        });
        afterEach(async() => {
            await signOut();
        });
    });
    describe('for verified user', () => {
        it('should allow creating a part', async() => {
            // Given a verified user
            const creator: MinimalUser = await createConnectedUser(CREATOR_EMAIL, CREATOR_NAME);
            // When creating a part
            const result: Promise<string> = partDAO.create({ ...PartMocks.INITIAL, playerZero: creator });
            // Then it should succeed
            await expectAsync(result).toBeResolved();
        });
        it('should allow reading parts', async() => {
            // Given a part and a verified user
            const creator: MinimalUser = await createConnectedUser(CREATOR_EMAIL, CREATOR_NAME);
            const part: Part = { ...PartMocks.INITIAL, playerZero: creator };
            const partId: string = await partDAO.create(part);
            await signOut();

            await createConnectedUser(MALICIOUS_EMAIL, MALICIOUS_NAME);
            // When reading the part
            const result: Promise<MGPOptional<Part>> = partDAO.read(partId);
            // Then it should succeed
            await expectAsync(result).toBeResolvedTo(MGPOptional.of(part));
        });
        it('should forbid non-player to change fields', async() => {
            // Given a part, and a user who is not playing in this game
            const creator: MinimalUser = await createConnectedUser(CREATOR_EMAIL, CREATOR_NAME);
            const partId: string = await partDAO.create({ ...PartMocks.INITIAL, playerZero: creator });
            await signOut();
            await createConnectedUser(MALICIOUS_EMAIL, MALICIOUS_NAME);

            const updates: Partial<Part>[] = [
                { lastUpdate: { index: 1, player: 0 } },
                { turn: 42 },
                { result: 3 },
                { listMoves: [{ a: 1 }] },
                { lastUpdateTime: serverTimestamp() },
                { remainingMsForZero: 42 },
                { remainingMsForOne: 42 },
                { winner: 'me!' },
                { loser: 'you' },
                { scorePlayerZero: 42 },
                { scorePlayerOne: 42 },
                { request: Request.rematchProposed(Player.ZERO) },
            ];
            for (const update of updates) {
                // When trying to change the field
                const result: Promise<void> = partDAO.update(partId, update);
                // Then it should fail
                await expectPermissionToBeDenied(result);
            }
        });
        it('should forbid deleting part even if owner is not observing anymore', async() => {
            // Given a part with its owner not observing this part
            const creator: MinimalUser = await createConnectedUser(CREATOR_EMAIL, CREATOR_NAME);
            const partId: string = await partDAO.create({ ...PartMocks.INITIAL, playerZero: creator });
            await joinerDAO.set(partId, { ...JoinerMocks.INITIAL, creator });
            // eslint-disable-next-line camelcase
            const last_changed: Time = { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 };
            await userDAO.update(creator.id, { observedPart: null, last_changed });
            await signOut();

            // and given another user
            await createConnectedUser(MALICIOUS_EMAIL, MALICIOUS_NAME);

            // When the other user deletes the part
            const result: Promise<void> = partDAO.delete(partId);

            // Then it should fail
            await expectPermissionToBeDenied(result);
        });
        it('should allow deleting non-started part if owner has timed out', async() => {
            // Given a non-started part with its owner who has timed out
            const creator: MinimalUser = await createConnectedUser(CREATOR_EMAIL, CREATOR_NAME);
            const partId: string = await partDAO.create({ ...PartMocks.INITIAL, playerZero: creator });
            await joinerDAO.set(partId, { ...JoinerMocks.INITIAL, creator });
            // eslint-disable-next-line camelcase
            const last_changed: Time = { seconds: 0, nanoseconds: 0 }; // owner is stuck in 1970
            // eslint-disable-next-line camelcase
            await userDAO.update(creator.id, { observedPart: partId, last_changed });
            await signOut();

            // and given another user
            await createConnectedUser(CANDIDATE_EMAIL, CANDIDATE_NAME);

            // When the other user deletes the part
            const result: Promise<void> = partDAO.delete(partId);

            // Then it should succeed
            await expectAsync(result).toBeResolvedTo();
        });
        it('should forbid deleting a non-started part if owner is still observing it and has not timed out', async() => {
            // Given a part with its owner
            const creator: MinimalUser = await createConnectedUser(CREATOR_EMAIL, CREATOR_NAME);
            const partId: string = await partDAO.create({ ...PartMocks.INITIAL, playerZero: creator });
            await joinerDAO.set(partId, { ...JoinerMocks.INITIAL, creator });
            // eslint-disable-next-line camelcase
            const last_changed: Time = { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 };
            await userDAO.update(creator.id, { observedPart: partId, last_changed });
            await signOut();

            // and given another user
            await createConnectedUser(MALICIOUS_EMAIL, MALICIOUS_NAME);

            // When the other user deletes the part
            const result: Promise<void> = partDAO.delete(partId);

            // Then it should fail
            await expectPermissionToBeDenied(result);
        });
        it('should allow starting a part when chosen as opponent', async() => {
            // Given a part, an accepted config, and a user who is the chosen opponent in the joiner
            // Creator creates the joiner
            const creator: MinimalUser = await createConnectedUser(CREATOR_EMAIL, CREATOR_NAME);
            const part: Part = { ...PartMocks.INITIAL, playerZero: creator };
            const partId: string = await partDAO.create(part);
            await joinerDAO.set(partId, { ...JoinerMocks.INITIAL, creator });
            await signOut();

            // A candidate adds themself to the candidates list
            const candidate: MinimalUser = await createConnectedUser(CANDIDATE_EMAIL, CANDIDATE_NAME);
            await expectAsync(joinerDAO.addCandidate(partId, candidate)).toBeResolvedTo();
            await signOut();

            // The creator then selects candidates as the chosen opponent and proposes the config
            await reconnectUser(CREATOR_EMAIL);
            const update: Partial<Joiner> = {
                chosenOpponent: candidate,
                partStatus: PartStatus.CONFIG_PROPOSED.value,
            };
            await expectAsync(joinerDAO.update(partId, update)).toBeResolvedTo();
            await signOut();

            // And the candidate accepts the config
            await reconnectUser(CANDIDATE_EMAIL);
            await joinerDAO.update(partId, { partStatus: PartStatus.PART_STARTED.value });

            // When chosen opponents updates the part document
            const result: Promise<void> = partDAO.updateAndBumpIndex(partId,
                                                                     Player.ONE,
                                                                     part.lastUpdate.index,
                                                                     {
                                                                         playerZero: UserMocks.CREATOR_MINIMAL_USER,
                                                                         playerOne: UserMocks.CANDIDATE_MINIMAL_USER,
                                                                         turn: 0,
                                                                         beginning: serverTimestamp(),
                                                                         remainingMsForZero: 1000,
                                                                         remainingMsForOne: 1000,
                                                                     });

            // Then it should succeed
            await expectAsync(result).toBeResolvedTo();
        });
    });
    describe('for unverified user', () => {
        it('should forbid creating a part', async() => {
            // Given a non-verified user
            const creator: MinimalUser = await createUnverifiedUser(MALICIOUS_EMAIL, MALICIOUS_NAME);
            // When creating a part
            const result: Promise<string> = partDAO.create({ ...PartMocks.INITIAL, playerZero: creator });
            // Then it should fail
            await expectPermissionToBeDenied(result);
        });
        it('should forbid reading parts', async() => {
            // Given a part and a non-verified user
            const creator: MinimalUser = await createConnectedUser(CREATOR_EMAIL, CREATOR_NAME);
            const partId: string = await partDAO.create({ ...PartMocks.INITIAL, playerZero: creator });
            await signOut();

            await createUnverifiedUser(MALICIOUS_EMAIL, MALICIOUS_NAME);
            // When reading the part
            const result: Promise<MGPOptional<Part>> = partDAO.read(partId);
            // Then it should fail
            await expectPermissionToBeDenied(result);
        });
    });
    describe('for creator', () => {
        it('should forbid creator to change playerZero/playerOne/beginning once a part has started', async() => {
            // Given a part that has started (i.e., beginning is set), and a player (here creator)
            const creator: MinimalUser = await createConnectedUser(CREATOR_EMAIL, CREATOR_NAME);
            const partId: string = await partDAO.create({
                ...PartMocks.INITIAL,
                beginning: serverTimestamp(),
                playerZero: creator,
                playerOne: UserMocks.OPPONENT_MINIMAL_USER,
            });

            const updates: Partial<Part>[] = [
                { playerZero: UserMocks.OPPONENT_MINIMAL_USER },
                { playerOne: creator },
                { beginning: serverTimestamp() },
            ];
            for (const update of updates) {
                // When trying to change the field
                const result: Promise<void> =
                    partDAO.updateAndBumpIndex(partId, Player.ZERO, PartMocks.INITIAL.lastUpdate.index, update);
                // Then it should fail
                await expectPermissionToBeDenied(result);
            }
        });
        it('should allow deleting part if it has not started', async() => {
            // Given a non-started part and its owner (as defined in the joiner)
            const creator: MinimalUser = await createConnectedUser(CREATOR_EMAIL, CREATOR_NAME);
            const partId: string = await partDAO.create({ ...PartMocks.INITIAL, playerZero: creator });
            await joinerDAO.set(partId, { ...JoinerMocks.INITIAL, creator });

            // When deleting the part
            const result: Promise<void> = partDAO.delete(partId);

            // Then it should succeed
            await expectAsync(result).toBeResolvedTo();
        });
        it('should forbid deleting part after it has started', async() => {
            // Given a started part and its owner (as defined in the joiner)
            const creator: MinimalUser = await createConnectedUser(CREATOR_EMAIL, CREATOR_NAME);
            const partId: string = await partDAO.create({
                ...PartMocks.INITIAL,
                playerZero: creator,
                beginning: serverTimestamp(),
            });
            await joinerDAO.set(partId, { ...JoinerMocks.INITIAL, creator });

            // When deleting the part
            const result: Promise<void> = partDAO.delete(partId);

            // Then it should fail
            await expectPermissionToBeDenied(result);
        });
    });
    describe('for player', () => {
        it('should forbid player to change typeGame', async() => {
            // Given a part and a player (here, creator)
            const playerZero: MinimalUser = await createConnectedUser(CREATOR_EMAIL, CREATOR_NAME);
            const partId: string = await partDAO.create({ ...PartMocks.INITIAL, playerZero });

            // When trying to change the game type
            const result: Promise<void> = partDAO.updateAndBumpIndex(partId, Player.ZERO, PartMocks.INITIAL.lastUpdate.index, { typeGame: 'P4' });
            // Then it should fail
            await expectPermissionToBeDenied(result);
        });
        it('should allow to increment turn and decrement it for take backs', async() => {
            // Given a player (here, creator)
            const playerZero: MinimalUser = await createConnectedUser(CREATOR_EMAIL, CREATOR_NAME);

            const turnDeltas: number[] = [
                +1, // move
                -1, // take back
                -2, // take back when it was our turn again
            ];
            for (const turnDelta of turnDeltas) {
                // Given a part in the middle of being played
                const partId: string = await partDAO.create({ ...PartMocks.STARTING, playerZero });
                // need to increase the turn sufficiently for take backs
                await partDAO.updateAndBumpIndex(partId, Player.ZERO, 1, { turn: 1 });
                await partDAO.updateAndBumpIndex(partId, Player.ZERO, 2, { turn: 2 });
                // When updating turns with a legitimate increase/decrease
                const turn: number = 2 + turnDelta;
                const result: Promise<void> = partDAO.updateAndBumpIndex(partId, Player.ZERO, 3, { turn });
                // Then it should succeed
                await expectAsync(result).toBeResolvedTo();
            }
        });
        it('should forbid to increment or decrement the turn too much', async() => {
            // Given a player (here, creator)
            const playerZero: MinimalUser = await createConnectedUser(CREATOR_EMAIL, CREATOR_NAME);

            const turnDeltas: number[] = [
                +2,
                -3,
            ];
            for (const turnDelta of turnDeltas) {
                // Given a part in the middle of being played
                const partId: string = await partDAO.create({ ...PartMocks.STARTING, playerZero });
                // need to increase the turn sufficiently for take backs
                await partDAO.updateAndBumpIndex(partId, Player.ZERO, 1, { turn: 1 });
                await partDAO.updateAndBumpIndex(partId, Player.ZERO, 2, { turn: 2 });
                await partDAO.updateAndBumpIndex(partId, Player.ZERO, 3, { turn: 3 });
                // When updating turns with an illegal increase/decrease
                const turn: number = 3 + turnDelta;
                const result: Promise<void> = partDAO.updateAndBumpIndex(partId, Player.ZERO, 4, { turn });
                // Then it should fail
                await expectPermissionToBeDenied(result);
            }
        });
        it('should allow updates to lastUpdate if it is a +1 increment and matches the player', async() => {
            // Given a part and a player (here, creator)
            const playerZero: MinimalUser = await createConnectedUser(CREATOR_EMAIL, CREATOR_NAME);
            const partId: string = await partDAO.create({ ...PartMocks.STARTING, playerZero });

            // When updating lastUpdate as expected
            const result: Promise<void> =
                    partDAO.updateAndBumpIndex(partId, Player.ZERO, PartMocks.STARTING.lastUpdate.index, { });

            // Then it should succeed
            await expectAsync(result).toBeResolvedTo();
        });
        it('should forbid updates to lastUpdate if it increments more than once', async() => {
            // Given a part and a player (here, creator)
            const playerZero: MinimalUser = await createConnectedUser(CREATOR_EMAIL, CREATOR_NAME);
            const partId: string = await partDAO.create({ ...PartMocks.STARTING, playerZero });

            // When incrementing the index of lastUpdate too much
            const result: Promise<void> =
                    partDAO.updateAndBumpIndex(partId, Player.ZERO, PartMocks.STARTING.lastUpdate.index + 1, { });

            // Then it should fail
            await expectPermissionToBeDenied(result);
        });
        it('should forbid updates to lastUpdate for another user', async() => {
            // Given a part and a player (here, creator)
            const playerZero: MinimalUser = await createConnectedUser(CREATOR_EMAIL, CREATOR_NAME);
            const partId: string = await partDAO.create({ ...PartMocks.STARTING, playerZero });

            // When providing the wrong player in lastUpdate
            const result: Promise<void> =
                    partDAO.updateAndBumpIndex(partId, Player.ONE, PartMocks.STARTING.lastUpdate.index, { });

            // Then it should fail
            await expectPermissionToBeDenied(result);
        });
    });
});
