/* eslint-disable max-lines-per-function */
import { ActivesPartsService } from '../ActivesPartsService';
import { PartDAO } from 'src/app/dao/PartDAO';
import { fakeAsync, TestBed } from '@angular/core/testing';
import { setupEmulators } from 'src/app/utils/tests/TestUtils.spec';

describe('ActivesPartsService', () => {

    let service: ActivesPartsService;

    let dao: PartDAO;

    beforeEach(async() => {
        await setupEmulators();
        dao = TestBed.inject(PartDAO);
        service = new ActivesPartsService(dao);
    });
    it('should create', () => {
        expect(service).toBeTruthy();
    });
    describe('hasActiveParts', () => {
        it('should return true when user is playerZero in a game', fakeAsync(async() => {
            // Given a partDAO including an active part whose playerZero is our user
            spyOn(service, 'getActiveParts').and.returnValue([{
                id: 'joinerIdOrWhatever',
                doc: {
                    lastUpdate: {
                        index: 0,
                        player: 0,
                    },
                    listMoves: [],
                    playerZero: 'creator',
                    playerOne: 'firstCandidate',
                    result: 5,
                    turn: 0,
                    typeGame: 'P4',
                },
            }]);

            // when asking hasActivePart('our user')
            const hasUserActiveParts: boolean = service.hasActivePart('creator');

            // then we should learn that yes, he has some
            expect(hasUserActiveParts).toBeTrue();
        }));
        it('should return true when user is playerOne in a game', () => {
            // Given a partDAO including an active part whose playerZero is our user
            spyOn(service, 'getActiveParts').and.returnValue([{
                id: 'joinerIdOrWhatever',
                doc: {
                    lastUpdate: {
                        index: 0,
                        player: 0,
                    },
                    listMoves: [],
                    playerZero: 'firstCandidate',
                    playerOne: 'creator',
                    result: 5,
                    turn: 0,
                    typeGame: 'P4',
                },
            }]);

            // when asking hasActivePart('our user')
            const hasUserActiveParts: boolean = service.hasActivePart('creator');

            // then we should learn that yes, he has some
            expect(hasUserActiveParts).toBeTrue();
        });
        it('should return false when user is not in a game', () => {
            // Given a partDAO including an active part whose playerZero is our user
            spyOn(service, 'getActiveParts').and.returnValue([{
                id: 'joinerIdOrWhatever',
                doc: {
                    lastUpdate: {
                        index: 0,
                        player: 0,
                    },
                    listMoves: [],
                    playerZero: 'jeanRoger',
                    playerOne: 'Charles Du Pied',
                    result: 5,
                    turn: 0,
                    typeGame: 'P4',
                },
            }]);

            // when asking hasActivePart('our user')
            const hasUserActiveParts: boolean = service.hasActivePart('creator');

            // then we should learn that yes, he has some
            expect(hasUserActiveParts).toBeFalse();
        });
    });
    afterEach(() => {
        service.ngOnDestroy();
    });
});
