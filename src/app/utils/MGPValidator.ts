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
                return MGPValidation.failure($localize`${ value } is too small, the minimum is ${ min }`);
            } else if (max < value) {
                return MGPValidation.failure($localize`${ value } is too big, the maximum is ${ max }`);
            } else {
                return MGPValidation.SUCCESS;
            }
        };
    }
}
