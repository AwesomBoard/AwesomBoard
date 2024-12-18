/* eslint-disable max-lines-per-function */
import { MGPFallible } from '../MGPFallible';
import { MGPValidation, MGPValidationTestUtils } from '../MGPValidation';

describe('MGPValidation', () => {

    it('should throw when asking MGPValidation.SUCCESS.getReason()', () => {
        const expectedError: string = 'Cannot get failure reason from a success';
        expect(() => MGPValidation.SUCCESS.getReason()).toThrowError(expectedError);
    });

    describe('ofFallible', () => {
        it('should return MGPValidation.SUCCESS when given a success', () => {
            // Given a successful MGPFallible
            const fallible: MGPFallible<number> = MGPFallible.success(42);

            // When converting it to a MGPValidation
            const validation: MGPValidation = MGPValidation.ofFallible(fallible);

            // Then it should be MGPValidation.SUCCESS
            expect(validation).toBe(MGPValidation.SUCCESS);
        });

        it('should return a failure when given a failed fallible', () => {
            const fallible: MGPFallible<number> = MGPFallible.failure('I am a failure!');
            const validation: MGPValidation = MGPValidation.ofFallible(fallible);
            expect(validation).toEqual(MGPValidation.failure('I am a failure!'));
        });
    });

    describe('failure', () => {
        it('should construct a failure', () => {
            expect(MGPValidation.failure('error').isFailure()).toBeTrue();
        });
    });

});

describe('MGPValidationTestUtils', () => {
    it('should validate success with expectToBeSuccess', () => {
        MGPValidationTestUtils.expectToBeSuccess(MGPValidation.SUCCESS);
    });

    it('should validate success with expectToBeSuccess and a context', () => {
        MGPValidationTestUtils.expectToBeSuccess(MGPValidation.SUCCESS, 'this should be a success');
    });

    it('should validate failure with expectToBeFailure', () => {
        const failure: MGPValidation = MGPValidation.failure('I am a failure!');
        MGPValidationTestUtils.expectToBeFailure(failure, 'I am a failure!');
    });

});
