import { MGPValidation } from '@everyboard/lib';
import { EmptyRulesConfig, RulesConfig } from '../jscaip/RulesConfigUtil';

export type MGPValidator<R extends RulesConfig = EmptyRulesConfig> = (v: number | null, config: R) => MGPValidation;

export class MGPValidators {

    public static range<R extends RulesConfig = EmptyRulesConfig>(min: number, max: number): MGPValidator<R> {
        return (value: number | null, config: R) => {
            if (value == null) {
                return MGPValidation.failure($localize`This value is mandatory`);
            }
            if (value < min) {
                return MGPValidation.failure(MGPValidatorsFailure.VALUE_IS_TOO_SMALL(value, min));
            } else if (max < value) {
                return MGPValidation.failure(MGPValidatorsFailure.VALUE_IS_TOO_HIGH(value, min));
            } else {
                return MGPValidation.SUCCESS;
            }
        };
    }
}

export class MGPValidatorsFailure {

    public static readonly VALUE_IS_TOO_SMALL: (value: number, minimum: number) => string = (v: number, m: number) => $localize`${ v } is too small, the minimum is ${ m }`;

    public static readonly VALUE_IS_TOO_HIGH: (value: number, maximum: number) => string = (v: number, m: number) => $localize`${ v } is too big, the maximum is ${ m }`;
}
