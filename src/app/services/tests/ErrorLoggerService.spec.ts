/* eslint-disable max-lines-per-function */
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { FirestoreDocument } from 'src/app/dao/FirestoreDAO';
import { JSONValue, MGPOptional } from '@everyboard/lib';
import { ErrorLoggerService } from '../ErrorLoggerService';
import { RouterTestingModule } from '@angular/router/testing';
import { serverTimestamp } from 'firebase/firestore';
import { ErrorDAO, MGPError } from 'src/app/dao/ErrorDAO';
import { ErrorDAOMock } from 'src/app/dao/tests/ErrorDAOMock.spec';
import { MessageDisplayer } from '../MessageDisplayer';
import { BlankComponent } from 'src/app/utils/tests/TestUtils.spec';

describe('ErrorLoggerService', () => {

    let errorLoggerService: ErrorLoggerService;
    let errorDAO: ErrorDAO;
    let messageDisplayer: MessageDisplayer;

    beforeEach(fakeAsync(async() => {
        await TestBed.configureTestingModule({
            imports: [
                RouterTestingModule.withRoutes([
                    { path: '**', component: BlankComponent },
                ]),
            ],
            schemas: [CUSTOM_ELEMENTS_SCHEMA],
            providers: [
                { provide: ErrorDAO, useClass: ErrorDAOMock },
            ],
        }).compileComponents();
        errorLoggerService = TestBed.inject(ErrorLoggerService);
        errorDAO = TestBed.inject(ErrorDAO);
        messageDisplayer = TestBed.inject(MessageDisplayer);
        spyOn(messageDisplayer, 'criticalMessage').and.returnValue();
    }));
    it('should create', fakeAsync(async() => {
        expect(errorLoggerService).toBeTruthy();
    }));
    it('should throw instead of logging the error when not initialized', () => {
        // Given a non-initialized error logger service
        // eslint-disable-next-line dot-notation
        ErrorLoggerService['singleton'] = MGPOptional.empty();
        // When logging an error
        // Then it throws instead
        expect(() => ErrorLoggerService.logError('component', 'error')).toThrowError('component: error (extra data: undefined)');
    });
    it('should display a message to let the user know something unusual happened', fakeAsync(async() => {
        // Given an error
        const component: string = 'Some component';
        const message: string = 'Some error';

        // When logging it
        ErrorLoggerService.logError(component, message);

        // Then a message has been shown to the user
        expect(messageDisplayer.criticalMessage).toHaveBeenCalledOnceWith(`An unexpected error was encountered. We have logged it and will try to fix its cause as soon as possible.`);
    }));
    it('should add new error to the DB', fakeAsync(async() => {
        // Given an error in a component which has not already been encountered
        const component: string = 'Some component';
        const message: string = 'my new error message';
        const data: JSONValue = { foo: 'bar' };
        spyOn(errorDAO, 'create').and.callThrough();

        // When logging it
        ErrorLoggerService.logError(component, message, data);
        tick(0);

        // Then the error is stored in the DAO with all expected fields
        const expectedError: MGPError = {
            component,
            route: '/',
            message,
            data,
            firstEncounter: serverTimestamp(),
            lastEncounter: serverTimestamp(),
            occurences: 1,
        };
        expect(errorDAO.create).toHaveBeenCalledOnceWith(expectedError);
    }));
    it('should not include data field of an error if it is not provided', fakeAsync(async() => {
        // Given an error in a component which has not already been encountered
        const component: string = 'Some component';
        const message: string = 'my new error message';
        spyOn(errorDAO, 'create').and.callThrough();

        // When logging it
        ErrorLoggerService.logError(component, message);
        tick(0);

        // Then the error is stored in the DAO with all expected fields
        const expectedError: MGPError = {
            component,
            route: '/',
            message,
            firstEncounter: serverTimestamp(),
            lastEncounter: serverTimestamp(),
            occurences: 1,
        };
        expect(errorDAO.create).toHaveBeenCalledOnceWith(expectedError);
    }));
    it('should increment count of already encountered errors', fakeAsync(async() => {
        spyOn(errorDAO, 'update').and.callThrough();
        // Given an error in a component which has already been encountered
        const component: string = 'Some component';
        const message: string = 'my new error message';
        const data: JSONValue = { foo: 'bar' };
        ErrorLoggerService.logError(component, message, data);
        tick(1000);
        const errors: FirestoreDocument<MGPError>[] = await errorLoggerService.findErrors(component, '/', message, data);
        expect(errors.length).toBe(1);
        const id: string = errors[0].id;

        // When logging it a second time
        ErrorLoggerService.logError(component, message, data);
        tick(0);

        // Then the error is updated in the DAO with all expected fields
        const update: Partial<MGPError> = {
            lastEncounter: serverTimestamp(),
            occurences: 2,
        };
        expect(errorDAO.update).toHaveBeenCalledOnceWith(id, update);
    }));
    describe('findErrors', () => {
        it('should return the empty list if there is no matching error', async() => {
            // Given no matching error
            // When looking for matching errors
            const errors: FirestoreDocument<MGPError>[] = await errorLoggerService.findErrors('test', '', 'dummy message');
            // Then no matching error should be found
            expect(errors.length).toBe(0);
        });
        it('should find a corresponding error if there is one (with attached data)', async() => {
            // Given an already encountered error
            const error: MGPError = {
                component: 'foo',
                route: '',
                message: 'some error',
                data: { 'foo': 'bar' },
                firstEncounter: serverTimestamp(),
                lastEncounter: serverTimestamp(),
                occurences: 1,
            };
            const errorId: string = await errorDAO.create(error);
            // When looking for matching errors
            const errors: FirestoreDocument<MGPError>[] =
                await errorLoggerService.findErrors(error.component, error.route, error.message, error.data);
            // Then we should find the matching error
            expect(errors.length).toBe(1);
            expect(errors[0].id).toBe(errorId);
        });
        it('should find a corresponding error if there is one (without attached data)', async() => {
            // Given an already encountered error (without data)
            const error: MGPError = {
                component: 'foo',
                route: '',
                message: 'some error',
                firstEncounter: serverTimestamp(),
                lastEncounter: serverTimestamp(),
                occurences: 1,
            };
            const errorId: string = await errorDAO.create(error);
            // When looking for matching errors (without data)
            const errors: FirestoreDocument<MGPError>[] =
                await errorLoggerService.findErrors(error.component, error.route, error.message);
            // Then we should find the matching error
            expect(errors.length).toBe(1);
            expect(errors[0].id).toEqual(errorId);
        });
    });

});
