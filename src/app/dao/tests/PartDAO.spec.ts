// eslint-disable-next-line max-lines-per-function
import { setupEmulators } from 'src/app/utils/tests/TestUtils.spec';
import { TestBed } from '@angular/core/testing';
import { PartDAO } from '../PartDAO';

describe('PartDAO', () => {

    let partDAO: PartDAO;

    beforeEach(async() => {
        await setupEmulators();
        partDAO = TestBed.inject(PartDAO);
    });

    it('should be created', () => {
        expect(partDAO).toBeTruthy();
    });

});
