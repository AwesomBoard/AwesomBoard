import { fakeAsync } from '@angular/core/testing';

import { ComponentTestUtils } from 'src/app/utils/tests/TestUtils.spec';
import { QuebecCastlesComponent } from '../quebec-castles.component';

describe('QuebecCastlesComponent', () => {

    let testUtils: ComponentTestUtils<QuebecCastlesComponent>;

    beforeEach(fakeAsync(async() => {
        // This `testUtils` will be used throughout the test suites as a matcher for various test conditions
        testUtils = await ComponentTestUtils.forGame<QuebecCastlesComponent>('QuebecCastles');
    }));

    it('should create', () => {
        // This test is done in all games to ensure that their initialization works as expected
        testUtils.expectToBeCreated();
    });

});
