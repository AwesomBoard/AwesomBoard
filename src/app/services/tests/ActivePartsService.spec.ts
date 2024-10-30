/* eslint-disable max-lines-per-function */
import { ActivePartsService } from '../ActivePartsService';
import { PartDAO } from 'src/app/dao/PartDAO';
import { fakeAsync, TestBed } from '@angular/core/testing';
import { MGPResult, Part, PartDocument } from 'src/app/domain/Part';
import { PartDAOMock } from 'src/app/dao/tests/PartDAOMock.spec';
import { Utils } from '@everyboard/lib';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FirestoreCollectionObserver } from 'src/app/dao/FirestoreCollectionObserver';
import { UserMocks } from 'src/app/domain/UserMocks.spec';
import { Subscription } from 'rxjs';
import { FirestoreCondition } from 'src/app/dao/FirestoreDAO';

describe('ActivePartsService', () => {

    let activePartsService: ActivePartsService;

    let partDAO: PartDAO;

    const part: Part = {
        playerZero: UserMocks.CREATOR_MINIMAL_USER,
        playerZeroElo: 0,
        playerOne: UserMocks.OPPONENT_MINIMAL_USER,
        result: 5,
        turn: 0,
        typeGame: 'P4',
    };

    beforeEach(fakeAsync(async() => {
        await TestBed.configureTestingModule({
            imports: [],
            schemas: [CUSTOM_ELEMENTS_SCHEMA],
            providers: [
                { provide: PartDAO, useClass: PartDAOMock },
            ],
        }).compileComponents();
        partDAO = TestBed.inject(PartDAO);
        activePartsService = TestBed.inject(ActivePartsService);
    }));

    it('should create', () => {
        expect(activePartsService).toBeTruthy();
    });

    describe('subscribeToActiveParts', () => {

        it('should notify about new parts', fakeAsync(async() => {
            // Given a service where we are observing active parts
            let seenActiveParts: PartDocument[] = [];
            const activePartsSubscription: Subscription = activePartsService.subscribeToActiveParts(
                (activeParts: PartDocument[]) => {
                    seenActiveParts = activeParts;
                });

            // When a new part is added
            await partDAO.create(part);

            // Then the new part should have been observed
            expect(seenActiveParts.length).toBe(1);
            expect(seenActiveParts[0].data).toEqual(part);
            // And it should really be a PartDocument, not just a FirestoreDocument<Part>
            // hence, it has methods such as getGameName()
            expect(seenActiveParts[0].getGameName).toBeDefined();

            activePartsSubscription.unsubscribe();
        }));

        it('should not notify about new parts when we unsubscribe', fakeAsync(async() => {
            // Given a service where we were observing active parts, but have unsubscribed
            let seenActiveParts: PartDocument[] = [];
            const activePartsSubscription: Subscription = activePartsService.subscribeToActiveParts(
                (activeParts: PartDocument[]) => {
                    seenActiveParts = activeParts;
                });
            activePartsSubscription.unsubscribe();

            // When a new part is added
            await partDAO.create(part);

            // Then the new part should not have been observed
            expect(seenActiveParts.length).toBe(0);
        }));

        it('should notify about deleted parts', fakeAsync(async() => {
            // Given that we are observing active parts, and there is already one part
            const partId: string = await partDAO.create(part);
            let seenActiveParts: PartDocument[] = [];
            const activePartsSubscription: Subscription = activePartsService.subscribeToActiveParts(
                (activeParts: PartDocument[]) => {
                    seenActiveParts = activeParts;
                });

            // When an existing part is deleted
            await partDAO.delete(partId);

            // Then the deleted part should not be considered as an active part
            expect(seenActiveParts.length).toBe(0);

            activePartsSubscription.unsubscribe();
        }));

        it('should preserve non-deleted upon a deletion', fakeAsync(async() => {
            // Given a service observing active parts, and there are already multiple parts
            const partToBeDeleted: string = await partDAO.create(part);
            const partThatWillRemain: string = await partDAO.create(part);
            let seenActiveParts: PartDocument[] = [];
            const activePartsSubscription: Subscription = activePartsService.subscribeToActiveParts(
                (activeParts: PartDocument[]) => {
                    seenActiveParts = activeParts;
                });

            // When one existing part is deleted
            await partDAO.delete(partToBeDeleted);

            // Then only the non-deleted part should remain
            expect(seenActiveParts.length).toBe(1);
            expect(seenActiveParts[0].id).toBe(partThatWillRemain);

            activePartsSubscription.unsubscribe();
        }));

        it('should update when a part is modified', fakeAsync(async() => {
            // Given that we are observing active parts, and there is already one part
            const partId: string = await partDAO.create(part);
            let seenActiveParts: PartDocument[] = [];
            const activePartsSubscription: Subscription = activePartsService.subscribeToActiveParts(
                (activeParts: PartDocument[]) => {
                    seenActiveParts = activeParts;
                });

            // When an existing part is updated
            await partDAO.update(partId, { turn: 1 });

            // Then the new part should have been observed
            expect(seenActiveParts.length).toBe(1);
            expect(Utils.getNonNullable(seenActiveParts[0].data).turn).toBe(1);

            activePartsSubscription.unsubscribe();
        }));

        it('should update only the modified part', fakeAsync(async() => {
            // Given that we are observing active parts, and there is already one part
            const partToBeModified: string = await partDAO.create(part);
            const partThatWontChange: string = await partDAO.create(part);
            let seenActiveParts: PartDocument[] = [];
            const activePartsSubscription: Subscription = activePartsService.subscribeToActiveParts(
                (activeParts: PartDocument[]) => {
                    seenActiveParts = activeParts;
                });

            // When an existing part is updated
            await partDAO.update(partToBeModified, { turn: 1 });

            // Then the part should have been updated
            expect(seenActiveParts.length).toBe(2);
            const newPart1: PartDocument = Utils.getNonNullable(seenActiveParts.find((p: PartDocument) =>
                p.id === partToBeModified));
            const newPart2: PartDocument = Utils.getNonNullable(seenActiveParts.find((p: PartDocument) =>
                p.id === partThatWontChange));
            expect(Utils.getNonNullable(newPart1.data).turn).toBe(1);
            // and the other one should still be there and still be the same
            expect(Utils.getNonNullable(newPart2.data).turn).toBe(0);

            activePartsSubscription.unsubscribe();
        }));

        it('should call observingWhere with the right condition', () => {
            // Given an ActivePartsService
            spyOn(partDAO, 'observingWhere').and.callFake(
                (query: FirestoreCondition[], callback: FirestoreCollectionObserver<Part>): Subscription => {
                    const expectedParameters: FirestoreCondition[] = [
                        ['result', '==', MGPResult.UNACHIEVED.value],
                    ];
                    expect(query).toEqual(expectedParameters);
                    return new Subscription();
                });

            // When subscribing to the active users
            const subscription: Subscription = activePartsService.subscribeToActiveParts(() => {});
            // Then it should call observingWhere from the DAO with the right parameters
            expect(partDAO.observingWhere).toHaveBeenCalledTimes(1);
            subscription.unsubscribe();
        });

        it('should not duplicate parts when we subscribe a second time', fakeAsync(async() => {
            // Given an active part service where we subscribed in the past
            await partDAO.create(part);
            let seenActiveParts: PartDocument[] = [];
            let activePartsSubscription: Subscription = activePartsService.subscribeToActiveParts(
                (activeParts: PartDocument[]) => {
                    seenActiveParts = activeParts;
                });
            activePartsSubscription.unsubscribe();

            // When subscribing a second time
            activePartsSubscription = activePartsService.subscribeToActiveParts(
                (activeParts: PartDocument[]) => {
                    seenActiveParts = activeParts;
                });

            // Then there should be exactly one part seen
            expect(seenActiveParts.length).toBe(1);
            activePartsSubscription.unsubscribe();
        }));

    });

});
