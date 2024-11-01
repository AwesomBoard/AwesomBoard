import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { ConfigDescriptionType, NamedRulesConfig, RulesConfig } from 'src/app/jscaip/RulesConfigUtil';
import { MGPOptional, MGPValidation, Utils } from '@everyboard/lib';
import { RulesConfigDescription } from './RulesConfigDescription';
import { BaseWrapperComponent } from '../BaseWrapperComponent';

type ConfigFormJSON = {
    [member: string]: FormControl<ConfigDescriptionType>;
}

@Component({
    selector: 'app-rules-configuration',
    templateUrl: './rules-configuration.component.html',
})
export class RulesConfigurationComponent extends BaseWrapperComponent implements OnInit {

    @Input() rulesConfigDescriptionOptional: MGPOptional<RulesConfigDescription<RulesConfig>>;
    public rulesConfigDescription: RulesConfigDescription<RulesConfig>;

    // Only needed for the non-creator
    @Input() rulesConfigToDisplay?: RulesConfig;

    // Whether this config can be edited or not
    @Input() editable: boolean;

    /**
     * notify that the config has been updated
     * if the optional is empty, the last update was invalid
     * we do want to emit something when the current config is invalid,
     * so that the parent component knows that the situation is not ok
     */
    @Output() updateCallback: EventEmitter<MGPOptional<RulesConfig>> = new EventEmitter<MGPOptional<RulesConfig>>();

    public rulesConfigForm: FormGroup = new FormGroup({});

    public urlName: string; // set in onInit

    private chosenConfigName: string = '';

    public constructor(activatedRoute: ActivatedRoute)
    {
        super(activatedRoute);
    }

    private checkInputs(): void {
        if (this.editable === false) {
            Utils.assert(this.rulesConfigToDisplay !== undefined, 'Config should be provided if RulesConfigurationComponent is not editable');
        }
    }

    public getChosenConfigName(): string {
        return this.chosenConfigName;
    }

    public ngOnInit(): void {
        this.checkInputs();
        this.urlName = this.getGameUrlName();
        if (this.isCustomisable()) {
            const defaultConfig: NamedRulesConfig<RulesConfig> = this.rulesConfigDescription.getDefaultConfig();
            this.setChosenConfig(defaultConfig.name());
        } else {
            return this.updateCallback.emit(MGPOptional.of({}));
        }
    }

    private generateForm(config: RulesConfig, configurable: boolean): void {
        const group: ConfigFormJSON = {};

        Object.keys(config).forEach((parameterName: string) => {
            const value: ConfigDescriptionType =
                this.getRulesConfigDescriptionValue(parameterName,
                                                    config[parameterName]);

            group[parameterName] = this.getFormControl(value, configurable);
        });
        this.rulesConfigForm = new FormGroup(group);
    }

    private getRulesConfigDescriptionValue(name: string, defaultValue: ConfigDescriptionType): ConfigDescriptionType {
        if (this.editable) {
            return defaultValue;
        } else {
            const configuration: RulesConfig = Utils.getNonNullable(this.rulesConfigToDisplay);
            return configuration[name];
        }
    }

    private getFormControl(value: ConfigDescriptionType, configurable: boolean): FormControl {
        const formControl: FormControl = new FormControl(value);
        if (configurable === false) {
            formControl.disable();
        }
        formControl.valueChanges.subscribe(() => {
            this.onUpdate();
        });
        return formControl;
    }

    private onUpdate(): void {
        // Note: we may receive updates just because the form has changed from "editable" to "non editable"
        // (e.g., due to proposing to the opponent or clicking on "changing configuration").
        const rulesConfig: RulesConfig = {};
        const parameterNames: string[] = this.rulesConfigDescription.getFields();
        for (const parameterName of parameterNames) {
            if (this.isValid(parameterName)) {
                rulesConfig[parameterName] = this.rulesConfigForm.controls[parameterName].value;
            } else {
                // This informs the parent component that an invalid update has been done
                this.updateCallback.emit(MGPOptional.empty());
                return; // In order not to send update when form is invalid
            }
        }
        this.updateCallback.emit(MGPOptional.of(rulesConfig));
    }

    public isNumber(field: string): boolean {
        const config: RulesConfig = this.rulesConfigDescription.getDefaultConfig().config;
        const value: ConfigDescriptionType = config[field];
        return typeof value === 'number';
    }

    public isBoolean(field: string): boolean {
        const config: RulesConfig = this.rulesConfigDescription.getDefaultConfig().config;
        const value: ConfigDescriptionType = config[field];
        return typeof value === 'boolean';
    }

    public isValid(field: string): boolean {
        const config: RulesConfig = this.rulesConfigDescription.getDefaultConfig().config;
        const value: ConfigDescriptionType = config[field];
        if (typeof value === 'number') {
            const fieldValue: number = this.rulesConfigForm.controls[field].value;
            const validity: MGPValidation = this.rulesConfigDescription.getValidator(field)(fieldValue);
            return validity.isSuccess();
        } else {
            Utils.expectToBe(typeof value, 'boolean');
            // Angular makes those controls invalid when they are booleans, not sure why
            return true; // So we return true because they are always valid
        }
    }

    public getErrorMessage(field: string): string {
        const fieldValue: number | null = this.rulesConfigForm.controls[field].value;
        const validity: MGPValidation = this.rulesConfigDescription.getValidator(field)(fieldValue);
        return validity.getReason();
    }

    public getFields(): string[] {
        return this.rulesConfigDescription.getFields();
    }

    public onChange(event: Event): void {
        const select: HTMLSelectElement = event.target as HTMLSelectElement;
        this.setChosenConfig(select.value);
    }

    private setChosenConfig(configName: string): void {
        this.chosenConfigName = configName;
        let config: RulesConfig;
        if (this.chosenConfigName === 'Custom') {
            config = this.rulesConfigDescription.getDefaultConfig().config;
            this.generateForm(config, this.editable);
        } else {
            config = this.rulesConfigDescription.getConfig(this.chosenConfigName);
            this.generateForm(config, false);
            // Emit the config directly because standard config are always legal
            this.updateCallback.emit(MGPOptional.of(config));
        }
    }

    public isCustomisable(): boolean {
        if (this.rulesConfigDescriptionOptional.isAbsent()) {
            // This game has no configurability, so no need to show  this component
            return false;
        } else {
            Utils.assert(this.rulesConfigDescriptionOptional.get().getFields().length > 0,
                         'If rulesConfigDescriptionOptional is present it should have fields !');
            this.rulesConfigDescription = this.rulesConfigDescriptionOptional.get();
            return true;
        }
    }

    public setEditable(editable: boolean): void {
        this.editable = editable;
        if (this.editable && this.chosenConfigName === 'Custom') {
            this.rulesConfigForm.enable();
        } else {
            this.rulesConfigForm.disable();
        }
    }

}
