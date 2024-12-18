import { setupEmulators } from 'src/app/utils/tests/TestUtils.spec';
import { TestBed } from '@angular/core/testing';
import { ConfigRoomDAO } from '../ConfigRoomDAO';

describe('ConfigRoomDAO', () => {

    let configRoomDAO: ConfigRoomDAO;

    beforeEach(async() => {
        await setupEmulators();
        configRoomDAO = TestBed.inject(ConfigRoomDAO);
    });
    it('should be created', () => {
        expect(configRoomDAO).toBeTruthy();
    });

});
