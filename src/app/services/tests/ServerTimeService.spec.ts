/* eslint-disable max-lines-per-function */
import { TestBed, fakeAsync } from '@angular/core/testing';
import { ConnectedUserServiceMock } from './ConnectedUserService.spec';
import { AppModule } from 'src/app/app.module';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ConnectedUserService } from '../ConnectedUserService';
import { endpoint, expectedParams } from './BackendService.spec';
import { ServerTimeService } from '../ServerTimeService';

describe('BackendService', () => {
    let serverTimeService: ServerTimeService;

    beforeEach(async() => {
        await TestBed.configureTestingModule({
            imports: [
                AppModule,
            ],
            schemas: [CUSTOM_ELEMENTS_SCHEMA],
            providers: [
                { provide: ConnectedUserService, useClass: ConnectedUserServiceMock },
            ],
        }).compileComponents();
        serverTimeService = TestBed.inject(ServerTimeService);
    });

    describe('getServerTime', () => {
        it('should fetch the expected resource', fakeAsync(async() => {
            // Given a game
            const response: Response = Response.json({ time: 42 });
            spyOn(window, 'fetch').and.resolveTo(response);
            // When fetching the server time
            const time: number = await serverTimeService.getServerTimeInMs();
            // Then it should fetch the expected resource and return the time
            expect(window.fetch).toHaveBeenCalledOnceWith(endpoint('/time'), expectedParams('GET'));
            expect(time).toEqual(42);
        }));

    });

});
