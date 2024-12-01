import { MGPValidator, MGPValidators } from 'src/app/utils/MGPValidator';

import { ConfigDescriptionType, DefaultConfigDescription, EmptyRulesConfig, NamedRulesConfig, RulesConfig } from 'src/app/jscaip/RulesConfigUtil';
import { Set, Utils } from '@everyboard/lib';
import { GobanConfig } from 'src/app/jscaip/GobanConfig';
import { Localized } from 'src/app/utils/LocaleUtils';

export class RulesConfigDescriptionLocalizable {

    public static readonly CUSTOM: () => string = (): string => $localize`Custom`;

    public static readonly WIDTH: () => string = (): string => $localize`Width`;

    public static readonly HEIGHT: () => string = (): string => $localize`Height`;

    public static readonly SIZE: () => string = (): string => $localize`Size`;

    public static readonly ALIGNMENT_SIZE: () => string = () => $localize`Number of aligned pieces needed to win`;

    public static readonly NUMBER_OF_DROPS: () => string = () => $localize`Number of pieces dropped per turn`;

}

export class ConfigLine {

    protected constructor(public readonly value: ConfigDescriptionType,
                          public readonly title: Localized,
                          public readonly validator?: MGPValidator)
    {
    }
}

export class NumberConfig extends ConfigLine {

    public constructor(value: number,
                       title: Localized,
                       validator: MGPValidator)
    {
        super(value, title, validator);
    }

}

export class BooleanConfig extends ConfigLine {

    public constructor(value: boolean, title: Localized)
    {
        super(value, title);
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

    public getValidator(fieldName: string): MGPValidator {
        Utils.assert(fieldName in this.defaultConfigDescription.config, fieldName + ' is not a validator!');
        return this.defaultConfigDescription.config[fieldName].validator as MGPValidator;
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
