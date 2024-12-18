/* eslint-disable max-lines-per-function */
import { fakeAsync, TestBed } from '@angular/core/testing';
import { ConfigRoomService, ConfigRoomServiceFailure } from '../ConfigRoomService';
import { ConfigRoomDAO } from 'src/app/dao/ConfigRoomDAO';
import { ConfigRoomDAOMock } from 'src/app/dao/tests/ConfigRoomDAOMock.spec';
import { ConfigRoomMocks } from 'src/app/domain/ConfigRoomMocks.spec';
import { JSONValue, MGPOptional, MGPValidation } from '@everyboard/lib';
import { UserMocks } from 'src/app/domain/UserMocks.spec';
import { MinimalUser } from 'src/app/domain/MinimalUser';
import { ConnectedUserService } from '../ConnectedUserService';
import { ConnectedUserServiceMock } from './ConnectedUserService.spec';
import { RouterTestingModule } from '@angular/router/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { IFirestoreDAO } from 'src/app/dao/FirestoreDAO';
import { FirstPlayer, PartStatus, PartType } from 'src/app/domain/ConfigRoom';
import { RulesConfig } from 'src/app/jscaip/RulesConfigUtil';
import { BlankComponent } from 'src/app/utils/tests/TestUtils.spec';

describe('ConfigRoomService', () => {

    function expectedParams(method: 'POST' | 'GET' | 'DELETE'): object {
        return {
            method,
            headers: {
                Authorization: 'Bearer idToken',
            },
        };
    }

    function endpoint(path: string): string {
        return 'http://localhost:8081' + path;
    }


    let configRoomDAO: ConfigRoomDAO;
    let configRoomService: ConfigRoomService;

    beforeEach(fakeAsync(async() => {
        await TestBed.configureTestingModule({
            imports: [
                RouterTestingModule.withRoutes([
                    { path: '**', component: BlankComponent },
                ]),
                BrowserAnimationsModule,
            ],
            providers: [
                { provide: ConnectedUserService, useClass: ConnectedUserServiceMock },
                { provide: ConfigRoomDAO, useClass: ConfigRoomDAOMock },

            ],
        }).compileComponents();
        configRoomDAO = TestBed.inject(ConfigRoomDAO);
        configRoomService = TestBed.inject(ConfigRoomService);
    }));

    it('should create', fakeAsync(() => {
        expect(configRoomService).toBeTruthy();
    }));

    describe('joinGame', () => {

        it('should POST to the expected resource', fakeAsync(async() => {
            // Given a game
            const response: Response = Response.json({}, { status: 200 });
            spyOn(window, 'fetch').and.resolveTo(response);
            const gameId: string = 'game-id';
            // When joining it
            const result: MGPValidation = await configRoomService.joinGame(gameId);
            // Then it should post on the expected resource
            const expectedEndpoint: string = endpoint(`/config-room/${gameId}/candidates`);
            expect(window.fetch).toHaveBeenCalledOnceWith(expectedEndpoint, expectedParams('POST'));
            expect(result).toEqual(MGPValidation.SUCCESS);
        }));

        it('should fail if the game does not exist', fakeAsync(async() => {
            // Given no game
            const response: Response = Response.json({ reason: 'not_found' }, { status: 404 });
            spyOn(window, 'fetch').and.resolveTo(response);
            const gameId: string = 'game-id';
            // When joining it
            const result: MGPValidation = await configRoomService.joinGame(gameId);
            // Then it should post on the expected resource
            const expectedEndpoint: string = endpoint(`/config-room/${gameId}/candidates`);
            expect(window.fetch).toHaveBeenCalledOnceWith(expectedEndpoint, expectedParams('POST'));
            expect(result).toEqual(MGPValidation.failure(ConfigRoomServiceFailure.GAME_DOES_NOT_EXIST()));
        }));

    });

    describe('removeCandidate', () => {

        it('should DELETE the expected resource', fakeAsync(async() => {
            // Given a game with a candidate
            const response: Response = Response.json({}, { status: 200 });
            spyOn(window, 'fetch').and.resolveTo(response);
            const gameId: string = 'game-id';
            const candidateId: string = 'candidate-id';
            // When removing the candidate
            await configRoomService.removeCandidate(gameId, candidateId);
            // Then it should delete the resource
            const expectedEndpoint: string = endpoint(`/config-room/${gameId}/candidates/${candidateId}`);
            expect(window.fetch).toHaveBeenCalledOnceWith(expectedEndpoint, expectedParams('DELETE'));
        }));

    });

    describe('proposeConfig', () => {

        it('should POST on the expected resource', fakeAsync(async() => {
            // Given a game
            const response: Response = Response.json({}, { status: 200 });
            spyOn(window, 'fetch').and.resolveTo(response);
            const gameId: string = 'game-id';
            // When proposing config
            const partType: PartType = PartType.BLITZ;
            const maximalMoveDuration: number = 30;
            const totalPartDuration: number = 480;
            const firstPlayer: FirstPlayer = FirstPlayer.CREATOR;
            const rulesConfig: MGPOptional<RulesConfig> = MGPOptional.empty();
            await configRoomService.proposeConfig(gameId,
                                                  partType,
                                                  maximalMoveDuration,
                                                  firstPlayer,
                                                  totalPartDuration,
                                                  rulesConfig);
            // Then it should post on the expected resource
            const jsonConfig: JSONValue = {
                partStatus: PartStatus.CONFIG_PROPOSED.value,
                partType: partType.value,
                maximalMoveDuration,
                totalPartDuration,
                firstPlayer: firstPlayer.value,
                rulesConfig: {},
            };
            const config: string = encodeURIComponent(JSON.stringify(jsonConfig));
            const expectedEndpoint: string = endpoint(`/config-room/${gameId}?action=propose&config=${config}`);
            expect(window.fetch).toHaveBeenCalledOnceWith(expectedEndpoint, expectedParams('POST'));
        }));

    });

    describe('selectOpponent', () => {

        it('should POST on the expected resource', fakeAsync(async() => {
            // Given a game
            const response: Response = Response.json({}, { status: 200 });
            spyOn(window, 'fetch').and.resolveTo(response);
            const gameId: string = 'game-id';
            // When selecting an opponent
            const opponent: MinimalUser = UserMocks.OPPONENT_MINIMAL_USER;
            await configRoomService.selectOpponent(gameId, opponent);
            // Then it should post on the expected resource
            const opponentStr: string = encodeURIComponent(JSON.stringify(opponent));
            const expectedEndpoint: string = endpoint(`/config-room/${gameId}?action=selectOpponent&opponent=${opponentStr}`);
            expect(window.fetch).toHaveBeenCalledOnceWith(expectedEndpoint, expectedParams('POST'));
        }));

    });

    describe('reviewConfig', () => {

        it('should POST on the expected resource', fakeAsync(async() => {
            // Given a game
            const response: Response = Response.json({}, { status: 200 });
            spyOn(window, 'fetch').and.resolveTo(response);
            const gameId: string = 'game-id';
            // When reviewing config
            await configRoomService.reviewConfig(gameId);
            // Then it should post on the expected resource
            const expectedEndpoint: string = endpoint(`/config-room/${gameId}?action=review`);
            expect(window.fetch).toHaveBeenCalledOnceWith(expectedEndpoint, expectedParams('POST'));
        }));

    });

    describe('reviewConfigAndRemoveChosenOpponent', () => {

        it('should POST on the expected resource', fakeAsync(async() => {
            // Given a game
            const response: Response = Response.json({}, { status: 200 });
            spyOn(window, 'fetch').and.resolveTo(response);
            const gameId: string = 'game-id';
            // When reviewing config
            await configRoomService.reviewConfigAndRemoveChosenOpponent(gameId);
            // Then it should post on the expected resource
            const expectedEndpoint: string = endpoint(`/config-room/${gameId}?action=reviewConfigAndRemoveOpponent`);
            expect(window.fetch).toHaveBeenCalledOnceWith(expectedEndpoint, expectedParams('POST'));
        }));

    });

    describe('subscribeToCandidates', () => {

        let candidates: MinimalUser[] = [];
        let candidatesDAO: IFirestoreDAO<MinimalUser>;

        beforeEach(fakeAsync(async() => {
            // Given a configRoom for which we are observing the candidates
            await configRoomDAO.set('configRoomId', ConfigRoomMocks.getInitial(MGPOptional.empty()));
            configRoomService.subscribeToChanges('configRoomId', () => {});
            configRoomService.subscribeToCandidates('configRoomId', (newCandidates: MinimalUser[]) => {
                candidates = newCandidates;
            });
            candidatesDAO = configRoomDAO.subCollectionDAO('configRoomId', 'candidates');
        }));

        it('should see new candidates appear', fakeAsync(async() => {
            // When a candidate is added
            await candidatesDAO.set(UserMocks.CANDIDATE_MINIMAL_USER.id, UserMocks.CANDIDATE_MINIMAL_USER);
            // Then the candidate has been seen
            expect(candidates).toEqual([UserMocks.CANDIDATE_MINIMAL_USER]);
        }));

        it('should see removed candidates disappear', fakeAsync(async() => {
            // and given an existing candidate
            await candidatesDAO.set(UserMocks.CANDIDATE_MINIMAL_USER.id, UserMocks.CANDIDATE_MINIMAL_USER);
            // When a candidate is removed
            await candidatesDAO.delete(UserMocks.CANDIDATE_MINIMAL_USER.id);
            // Then the candidate has been seen
            expect(candidates).toEqual([]);
        }));

        it('should see modified candidates correctly modified', fakeAsync(async() => {
            // and given some existing candidates
            await candidatesDAO.set(UserMocks.CANDIDATE_MINIMAL_USER.id, UserMocks.CANDIDATE_MINIMAL_USER);
            await candidatesDAO.set(UserMocks.OPPONENT_MINIMAL_USER.id, UserMocks.OPPONENT_MINIMAL_USER);

            // When a candidate is modified
            // (This should never happen in practice, but we still want the correct behavior just in case)
            await configRoomDAO.subCollectionDAO('configRoomId', 'candidates').update(UserMocks.CANDIDATE_MINIMAL_USER.id, { name: 'foo' });
            expect(candidates).toEqual([{ ...UserMocks.CANDIDATE_MINIMAL_USER, name: 'foo' }, UserMocks.OPPONENT_MINIMAL_USER]);

        }));

    });

});
