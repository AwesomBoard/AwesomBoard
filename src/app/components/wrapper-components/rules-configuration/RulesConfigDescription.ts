import { MGPValidation, Set, Utils } from '@everyboard/lib';

import { MGPValidator, MGPValidators } from 'src/app/utils/MGPValidator';
import { ConfigDescriptionType, DefaultConfigDescription, EmptyRulesConfig, NamedRulesConfig, RulesConfig } from 'src/app/jscaip/RulesConfigUtil';
import { GobanConfig } from 'src/app/jscaip/GobanConfig';
import { Localized } from 'src/app/utils/LocaleUtils';

export class RulesConfigDescriptionLocalizable {

    public static readonly CUSTOM: () => string = (): string => $localize`Custom`;

    public static readonly WIDTH: () => string = (): string => $localize`Width`;

    public static readonly HEIGHT: () => string = (): string => $localize`Height`;

    public static readonly SIZE: () => string = (): string => $localize`Size`;

    public static readonly ALIGNMENT_SIZE: () => string = () => $localize`Number of aligned pieces needed to win`;

    public static readonly NUMBER_OF_DROPS: () => string = () => $localize`Number of pieces dropped per turn`;

    public static readonly NUMBER_OF_EMPTY_ROWS: () => string = () => $localize`Number of empty rows`;

    public static readonly NUMBER_OF_PIECES_ROWS: () => string = () => $localize`Number of pieces rows`;

}

export abstract class ConfigLine {

    protected constructor(public readonly value: ConfigDescriptionType,
                          public readonly title: Localized)
    {
    }

    // Should check if the value is valid
    public abstract checkValidity(value: unknown): MGPValidation;

}

export class NumberConfig extends ConfigLine {

    public constructor(value: number,
                       title: Localized,
                       private readonly validator: MGPValidator)
    {
        super(value, title);
    }

    public checkValidity(value: unknown): MGPValidation {
        Utils.assert(typeof value === 'number', 'NumberConfig expects a number value');
        return this.validator(value);
    }

}

export class BooleanConfig extends ConfigLine {

    public constructor(value: boolean, title: Localized)
    {
        super(value, title);
    }

    public checkValidity(value: unknown): MGPValidation {
        Utils.assert(typeof value === 'boolean', 'BooleanConfig expects a boolean value');
        return MGPValidation.SUCCESS;
    }

}

export class RulesConfigDescription<R extends RulesConfig = EmptyRulesConfig> {

    private readonly defaultConfig: NamedRulesConfig<R>;

    public constructor(public readonly defaultConfigDescription: DefaultConfigDescription<R>,
                       public readonly nonDefaultStandardConfigs: NamedRulesConfig<R>[] = [])
    {
        const config: R = {} as R;
        for (const field of this.getFields()) {
            config[field as keyof R] = defaultConfigDescription.config[field].value as R[keyof R];
        }
        this.defaultConfig = {
            name: defaultConfigDescription.name,
            config,
        };
        const defaultKeys: Set<string> = new Set(Object.keys(defaultConfigDescription.config));
        for (const otherStandardConfig of nonDefaultStandardConfigs) {
            const key: Set<string> = new Set(Object.keys(otherStandardConfig.config));
            Utils.assert(key.equals(defaultKeys), `Field missing in ${ otherStandardConfig.name() } config!`);
        }
    }

    public getStandardConfigs(): NamedRulesConfig<R>[] {
        return [this.defaultConfig].concat(this.nonDefaultStandardConfigs);
    }

    public getDefaultConfig(): NamedRulesConfig<R> {
        return this.defaultConfig;
    }

    public getFields(): string[] {
        return Object.keys(this.defaultConfigDescription.config);
    }

    public getNonDefaultStandardConfigs(): NamedRulesConfig<R>[] {
        return this.nonDefaultStandardConfigs;
    }

    public getI18nName(field: string): string {
        return this.defaultConfigDescription.config[field].title();
    }

    public getConfig(configName: string): R {
        const rulesConfig: NamedRulesConfig<R> = this.getStandardConfigs()
            .filter((v: NamedRulesConfig<R>) => v.name() === configName)[0];
        return rulesConfig.config;
    }

    public isValid(fieldName: string, value: unknown): boolean {
        if (value == null) {
            // no value was provided, it is invalid
            return false;
        }
        const configLine: ConfigLine = this.defaultConfigDescription.config[fieldName];
        if (configLine == null) {
            // this does not match an element from the config, it is invalid
            return false;
        }
        return configLine.checkValidity(value).isSuccess();
    }

    public getValidityError(fieldName: string, value: unknown): string {
        if (value === null) {
            return $localize`This value is mandatory`;
        }
        return this.defaultConfigDescription.config[fieldName].checkValidity(value).getReason();
    }

}

export class RulesConfigDescriptions {

    public static readonly GOBAN: RulesConfigDescription<GobanConfig> = new RulesConfigDescription<GobanConfig>({
        name: (): string => $localize`Default`,
        config: {
            width: new NumberConfig(19, RulesConfigDescriptionLocalizable.WIDTH, MGPValidators.range(1, 99)),
            height: new NumberConfig(19, RulesConfigDescriptionLocalizable.HEIGHT, MGPValidators.range(1, 99)),
        },
    });

}
