import { MGPValidation } from '@everyboard/lib';

export type MGPValidator = (v: unknown) => MGPValidation;

export class MGPValidators {

    public static range(min: number, max: number): MGPValidator {
        return (value: number) => {
            if (value < min) {
                return MGPValidation.failure($localize`${ value } is too small, the minimum is ${ min }`);
            } else if (max < value) {
                return MGPValidation.failure($localize`${ value } is too big, the maximum is ${ max }`);
            } else {
                return MGPValidation.SUCCESS;
            }
        };
    }
}
