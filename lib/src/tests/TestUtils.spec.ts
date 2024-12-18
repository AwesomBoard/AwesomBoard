/* eslint-disable max-lines-per-function */
import { Utils } from '../Utils';
import { TestUtils } from '../TestUtils';

describe('TestUtils', () => {
    describe('expectToThrowAndLog', () => {
        it('should work with multiple invocations', () => {
            TestUtils.expectToThrowAndLog(() => Utils.assert(false, 'failure'),
                                          'failure');
            TestUtils.expectToThrowAndLog(() => Utils.assert(false, 'failure'),
                                          'failure');
        });
    });

});
