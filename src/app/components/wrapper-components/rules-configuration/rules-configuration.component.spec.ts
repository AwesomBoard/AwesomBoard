/* eslint-disable max-lines-per-function */
import { fakeAsync } from '@angular/core/testing';
import { DebugElement } from '@angular/core';
import { RulesConfigurationComponent } from './rules-configuration.component';
import { ActivatedRouteStub, SimpleComponentTestUtils } from 'src/app/utils/tests/TestUtils.spec';
import { MGPOptional, Utils, TestUtils } from '@everyboard/lib';
import { RulesConfig } from 'src/app/jscaip/RulesConfigUtil';
import { MGPValidators } from 'src/app/utils/MGPValidator';
import { RulesConfigDescription, NumberConfig, BooleanConfig } from './RulesConfigDescription';

describe('RulesConfigurationComponent', () => {

    let testUtils: SimpleComponentTestUtils<RulesConfigurationComponent>;

    let component: RulesConfigurationComponent;

    async function chooseConfig(configIndex: number): Promise<void> {
        const selectAI: HTMLSelectElement = testUtils.findElement('#ruleSelect').nativeElement;
        selectAI.value = selectAI.options[configIndex].value;
        selectAI.dispatchEvent(new Event('change'));
        testUtils.detectChanges();
    }

    beforeEach(async() => {
        const activatedRoute: ActivatedRouteStub = new ActivatedRouteStub('whatever-game');
        testUtils = await SimpleComponentTestUtils.create(RulesConfigurationComponent, activatedRoute);
        component = testUtils.getComponent();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    const secondConfig: RulesConfig = { nombre: 42, canailleDeBoule: 42 };

    const rulesConfigDescriptionWithNumber: RulesConfigDescription<RulesConfig> =
        new RulesConfigDescription(
            {
                name: (): string => 'the_default_config_name',
                config: {
                    nombre: new NumberConfig(5, () => 'nombre', MGPValidators.range(1, 99)),
                    canailleDeBoule: new NumberConfig(12, () => 'canaille', MGPValidators.range(1, 99)),
                },
            }, [{
                name: (): string => 'the_other_config_name',
                config: secondConfig,
            }],
        );

    const rulesConfigDescriptionWithBooleans: RulesConfigDescription<RulesConfig> = new RulesConfigDescription(
        {
            name: (): string => 'config name',
            config: {
                booleen: new BooleanConfig(false, () => 'booleen'),
                truth: new BooleanConfig(false, () => 'veritaserum'),
            },
        },
    );

    describe('editable behavior', () => {
        beforeEach(fakeAsync(async() => {
            // Given an editable component
            component.editable = true;
        }));

        it('should display enabled rules select', fakeAsync(async() => {
            // Given an editable component with a config
            component.rulesConfigDescriptionOptional = MGPOptional.of(rulesConfigDescriptionWithNumber);

            // When displaying it

            // Then the rule selection form element should be enabled
            testUtils.expectElementToExist('#ruleSelect');
            testUtils.expectElementToBeEnabled('#ruleSelect');
        }));

        it('should display default config', fakeAsync(async() => {
            // Given an editable component with a config
            component.rulesConfigDescriptionOptional = MGPOptional.of(rulesConfigDescriptionWithNumber);

            // When displaying it

            // Then default values should be displayed
            testUtils.expectElementToExist('#the_default_config_name_values');
        }));

        it('should allow to change to another standard config', fakeAsync(async() => {
            // Given an editable component with a config
            component.rulesConfigDescriptionOptional = MGPOptional.of(rulesConfigDescriptionWithNumber);

            // Given a game with two standard config (the default and the other)
            testUtils.detectChanges();
            spyOn(component.updateCallback, 'emit').and.callThrough();

            // When changing the chosen config
            await chooseConfig(1);
            expect(component.updateCallback.emit).toHaveBeenCalledOnceWith(MGPOptional.of(secondConfig));
        }));

        it('should immediately emit on initialization when there is no config to fill', fakeAsync(async() => {
            // Given an editable rules config component provided with no configuration
            component.rulesConfigDescriptionOptional = MGPOptional.empty();
            spyOn(component.updateCallback, 'emit').and.callThrough();

            // When initializing
            testUtils.detectChanges();

            // Then the callback should have emit {}
            const expectedValue: MGPOptional<RulesConfig> = MGPOptional.of({});
            expect(component.updateCallback.emit).toHaveBeenCalledOnceWith(expectedValue);
        }));

        it('should immediately emit on initialization when there is a config because default config is valid', fakeAsync(async() => {
            // Given a rules config component provided with an empty configuration
            component.rulesConfigDescriptionOptional = MGPOptional.of(rulesConfigDescriptionWithNumber);
            spyOn(component.updateCallback, 'emit').and.callThrough();

            // When initializing
            testUtils.detectChanges();

            // Then the callback should have been called with the default config
            const expectedValue: MGPOptional<RulesConfig> = MGPOptional.of({
                nombre: 5,
                canailleDeBoule: 12,
            });
            expect(component.updateCallback.emit).toHaveBeenCalledOnceWith(expectedValue);
        }));

        describe('modifying custom configuration', () => {

            describe('number config', () => {

                it('should propose a number input when given a config of type number', fakeAsync(async() => {
                    // Given a chosen customizable config
                    component.rulesConfigDescriptionOptional = MGPOptional.of(rulesConfigDescriptionWithNumber);
                    await chooseConfig(2);

                    // When rendering component
                    testUtils.detectChanges();

                    // Then there should be a number configurator
                    testUtils.expectElementToExist('#nombre_config');
                }));

                it('should emit new config when changing value', fakeAsync(async() => {
                    // Given a chosen customizable config
                    component.rulesConfigDescriptionOptional = MGPOptional.of(rulesConfigDescriptionWithNumber);
                    await chooseConfig(2);
                    testUtils.detectChanges();

                    // When modifying config
                    spyOn(component.updateCallback, 'emit').and.callThrough();
                    component.rulesConfigForm.get('nombre')?.setValue(80);

                    // Then the resulting value should be updated
                    const expectedValue: MGPOptional<RulesConfig> = MGPOptional.of({ nombre: 80, canailleDeBoule: 12 });
                    expect(component.updateCallback.emit).toHaveBeenCalledOnceWith(expectedValue);
                }));

                it('should emit default value of the non modified fields when modifying another field', fakeAsync(async() => {
                    // Given a chosen customizable config
                    component.rulesConfigDescriptionOptional = MGPOptional.of(rulesConfigDescriptionWithNumber);
                    await chooseConfig(2);
                    testUtils.detectChanges();

                    // When modifying another config
                    spyOn(component.updateCallback, 'emit').and.callThrough();
                    component.rulesConfigForm.get('canailleDeBoule')?.setValue(80);

                    // Then the resulting value should be the default, for the unmodified one
                    const expectedValue: MGPOptional<RulesConfig> = MGPOptional.of({ nombre: 5, canailleDeBoule: 80 });
                    expect(component.updateCallback.emit).toHaveBeenCalledOnceWith(expectedValue);
                }));

                it('should emit an empty optional when applying invalid change', fakeAsync(async() => {
                    // Given a chosen customizable config
                    component.rulesConfigDescriptionOptional = MGPOptional.of(rulesConfigDescriptionWithNumber);
                    await chooseConfig(2);
                    testUtils.detectChanges();

                    // When modifying config to zero or negative
                    spyOn(component.updateCallback, 'emit').and.callThrough();
                    component.rulesConfigForm.get('nombre')?.setValue(0);

                    // Then an optional should have been emitted to inform parent that child is failing math class !
                    expect(component.updateCallback.emit).toHaveBeenCalledOnceWith(MGPOptional.empty());
                }));

                describe('MGPValidators.range', () => {

                    it('should display custom validation error when making the value too small', fakeAsync(async() => {
                        // Given a chosen customizable config
                        component.rulesConfigDescriptionOptional = MGPOptional.of(rulesConfigDescriptionWithNumber);
                        await chooseConfig(2);
                        testUtils.detectChanges();

                        // When modifying config to below the validator lower bound
                        spyOn(component.updateCallback, 'emit').and.callThrough();
                        component.rulesConfigForm.get('nombre')?.setValue(0);

                        // Then error reason should have been displayed
                        expect(testUtils.findElement('#nombre-error').nativeElement.innerHTML).toEqual('0 is too small, the minimum is 1');
                        // and the component should have emitted an empty optional
                        expect(component.updateCallback.emit).toHaveBeenCalledOnceWith(MGPOptional.empty());
                    }));

                    it('should display custom validation error when making the value too big', fakeAsync(async() => {
                        // Given a chosen customizable config
                        component.rulesConfigDescriptionOptional = MGPOptional.of(rulesConfigDescriptionWithNumber);
                        await chooseConfig(2);
                        testUtils.detectChanges();

                        // When modifying config to above the validator upper bound
                        spyOn(component.updateCallback, 'emit').and.callThrough();
                        component.rulesConfigForm.get('nombre')?.setValue(100);

                        // Then error reason should have been displayed
                        expect(testUtils.findElement('#nombre-error').nativeElement.innerHTML).toEqual('100 is too big, the maximum is 99');
                        // and the component should have emitted an empty optional
                        expect(component.updateCallback.emit).toHaveBeenCalledOnceWith(MGPOptional.empty());
                    }));

                    it('should display custom validation error when erasing value', fakeAsync(async() => {
                        // Given a chosen customizable config
                        component.rulesConfigDescriptionOptional = MGPOptional.of(rulesConfigDescriptionWithNumber);
                        await chooseConfig(2);
                        testUtils.detectChanges();

                        // When erasing value
                        spyOn(component.updateCallback, 'emit').and.callThrough();
                        component.rulesConfigForm.get('nombre')?.setValue(null);

                        // Then error reason should have been displayed
                        expect(testUtils.findElement('#nombre-error').nativeElement.innerHTML).toEqual('This value is mandatory');
                        // and the component should have emitted an empty optional
                        expect(component.updateCallback.emit).toHaveBeenCalledOnceWith(MGPOptional.empty());
                    }));

                });

            });

            describe('boolean config', () => {

                it('should propose a boolean input when given a config of type boolean', fakeAsync(async() => {
                    // Given an editable component with a boolean config option
                    component.rulesConfigDescriptionOptional = MGPOptional.of(rulesConfigDescriptionWithBooleans);
                    await chooseConfig(1);

                    // When rendering component
                    testUtils.detectChanges();

                    // Then there should be a number configurator
                    testUtils.expectElementToExist('#booleen_config');
                }));

                it('should emit new value when changing value', fakeAsync(async() => {
                    // Given an editable component with a boolean config option
                    component.rulesConfigDescriptionOptional = MGPOptional.of(rulesConfigDescriptionWithBooleans);
                    await chooseConfig(1);
                    testUtils.detectChanges();

                    // When modifying config
                    spyOn(component.updateCallback, 'emit').and.callThrough();
                    component.rulesConfigForm.get('booleen')?.setValue(false);

                    // Then the resulting value should be updated
                    const expectedValue: MGPOptional<RulesConfig> = MGPOptional.of({ booleen: false, truth: false });
                    expect(component.updateCallback.emit).toHaveBeenCalledOnceWith(expectedValue);
                }));

                it('should emit default value of the non modified fields when modifying another field', fakeAsync(async() => {
                    // Given an editable component with a boolean config option
                    component.rulesConfigDescriptionOptional = MGPOptional.of(rulesConfigDescriptionWithBooleans);
                    await chooseConfig(1);

                    // When modifying another config
                    spyOn(component.updateCallback, 'emit').and.callThrough();
                    component.rulesConfigForm.get('truth')?.setValue(true);

                    // Then the resulting value should be the default, from the unmodified one
                    const expectedValue: MGPOptional<RulesConfig> = MGPOptional.of({ booleen: false, truth: true });
                    expect(component.updateCallback.emit).toHaveBeenCalledOnceWith(expectedValue);
                }));

            });

        });

    });

    describe('non-editable behavior', () => {

        beforeEach(() => {
            // Given a component in non-editable mode
            component.editable = false;
            // rulesConfigToDisplay is mandatory even if it's a configless game
            component.rulesConfigToDisplay = rulesConfigDescriptionWithNumber.getDefaultConfig().config;
        });

        it('should display options in a disabled style', fakeAsync(async() => {
            // Given a component with some config
            component.rulesConfigDescriptionOptional = MGPOptional.of(rulesConfigDescriptionWithNumber);

            // When displaying it
            testUtils.detectChanges();

            // Then rulesSelect should not be present
            testUtils.expectElementToExist('#ruleSelect');
            testUtils.expectElementToBeDisabled('#ruleSelect');
        }));

        it('should immediately emit on initialization when no config to fill', fakeAsync(async() => {
            // Given a rules config component provided with an empty configuration
            component.rulesConfigDescriptionOptional = MGPOptional.empty();
            spyOn(component.updateCallback, 'emit').and.callThrough();

            // When initializing
            testUtils.detectChanges();

            // Then the callback should have emit {}
            const expectedValue: MGPOptional<RulesConfig> = MGPOptional.of({});
            expect(component.updateCallback.emit).toHaveBeenCalledOnceWith(expectedValue);
        }));

        describe('modifying custom configuration', () => {

            it('should throw at initialization if rulesConfigToDisplay is missing', fakeAsync(async() => {
                // Given a component intended for non-creator user with no config to display
                component.rulesConfigDescriptionOptional = MGPOptional.of(rulesConfigDescriptionWithNumber);
                component.rulesConfigToDisplay = undefined;

                TestUtils.expectToThrowAndLog(() => {
                    // When rendering it
                    testUtils.detectChanges();
                    // Then it should throw
                }, 'Config should be provided if RulesConfigurationComponent is not editable');
            }));

            describe('number config', () => {

                it('should propose a disabled number input', fakeAsync(async() => {
                    // Given a component loaded with a config description having a number
                    component.rulesConfigToDisplay = {
                        nombre: 5,
                        canailleDeBoule: 12,
                    };
                    component.rulesConfigDescriptionOptional = MGPOptional.of(rulesConfigDescriptionWithNumber);

                    // When rendering component
                    testUtils.detectChanges();

                    // Then there should be a fieldset, but disabled
                    testUtils.expectElementToBeDisabled('#nombre_number_config_input');
                }));


            });

            describe('boolean config', () => {

                it('should display value of the rulesConfigToDisplay, not of the default config', fakeAsync(async() => {
                    // Given a board board on which the config 'booleen' is by default checked
                    // but has been changed and is hence unchecked in the config to display
                    // Also testing the opposite for the config 'truth'
                    component.rulesConfigToDisplay = {
                        booleen: true,
                        truth: true,
                    };
                    component.rulesConfigDescriptionOptional = MGPOptional.of(rulesConfigDescriptionWithBooleans);
                    const defaultConfig: RulesConfig =
                        component.rulesConfigDescriptionOptional.get().getDefaultConfig().config;
                    const configToDisplay: RulesConfig = Utils.getNonNullable(component.rulesConfigToDisplay);
                    // eslint-disable-next-line dot-notation
                    expect(configToDisplay['booleen']).toBeTrue();
                    // eslint-disable-next-line dot-notation
                    expect(configToDisplay['truth']).toBeTrue();
                    // eslint-disable-next-line dot-notation
                    expect(defaultConfig['booleen']).toBeFalse();
                    // eslint-disable-next-line dot-notation
                    expect(defaultConfig['truth']).toBeFalse();

                    // When displaying it
                    testUtils.detectChanges();

                    // Then the field should be checked if and only if rulesConfigToDisplay is true
                    const elementBooleen: DebugElement = testUtils.findElement('#booleen_boolean_config_input');
                    expect(elementBooleen.nativeElement.checked).toBeTrue();
                    const elementTruth: DebugElement = testUtils.findElement('#truth_boolean_config_input');
                    expect(elementTruth.nativeElement.checked).toBeTrue();
                }));

                it('should propose a disabled boolean input', fakeAsync(async() => {
                    // Given a component loaded with a config description having a number
                    component.rulesConfigToDisplay = {
                        booleen: true,
                        truth: true,
                    };
                    component.rulesConfigDescriptionOptional = MGPOptional.of(rulesConfigDescriptionWithBooleans);

                    // When rendering component
                    testUtils.detectChanges();

                    // Then there should be a fieldset, but disabled
                    testUtils.expectElementToBeDisabled('#booleen_boolean_config_input');
                }));

            });

        });

    });

    it('should be able switch from editable to non-editable', fakeAsync(async() => {
        // Given an editable component with some custom config
        component.editable = true;
        component.rulesConfigDescriptionOptional = MGPOptional.of(rulesConfigDescriptionWithNumber);
        component.rulesConfigToDisplay = rulesConfigDescriptionWithNumber.getDefaultConfig().config;
        await chooseConfig(2);

        // When switching to non-editable
        component.setEditable(false);

        // Then it should disable the fields
        testUtils.expectElementToBeDisabled('#nombre_number_config_input');
    }));

    it('should be able to switch from non-editable to editable', fakeAsync(async() => {
        // Given a non-editable component with some custom config
        component.editable = false;
        component.rulesConfigDescriptionOptional = MGPOptional.of(rulesConfigDescriptionWithNumber);
        component.rulesConfigToDisplay = rulesConfigDescriptionWithNumber.getDefaultConfig().config;
        await chooseConfig(2);

        // When switching to editable
        component.setEditable(true);

        // Then it should enable the fields
        testUtils.expectElementToBeEnabled('#nombre_number_config_input');
    }));

    it('should do nothing when switching from non-editable to non-editable', fakeAsync(async() => {
        // Given a non-editable component with some custom config
        component.editable = false;
        component.rulesConfigDescriptionOptional = MGPOptional.of(rulesConfigDescriptionWithNumber);
        component.rulesConfigToDisplay = rulesConfigDescriptionWithNumber.getDefaultConfig().config;
        await chooseConfig(2);

        // When switching to non-editable
        component.setEditable(false);

        // Then the fields remain disabled
        testUtils.expectElementToBeDisabled('#nombre_number_config_input');
    }));

});
