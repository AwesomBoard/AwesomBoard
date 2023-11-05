/* eslint-disable max-lines-per-function */
import { fakeAsync } from '@angular/core/testing';
import { DebugElement } from '@angular/core';
import { RulesConfigurationComponent } from './rules-configuration.component';
import { ActivatedRouteStub, SimpleComponentTestUtils } from 'src/app/utils/tests/TestUtils.spec';
import { ErrorLoggerService } from 'src/app/services/ErrorLoggerService';
import { MGPOptional } from 'src/app/utils/MGPOptional';
import { RulesConfig } from 'src/app/jscaip/RulesConfigUtil';
import { RulesUtils } from 'src/app/jscaip/tests/RulesUtils.spec';
import { Utils } from 'src/app/utils/utils';
import { KamisadoState } from 'src/app/games/kamisado/KamisadoState';
import { MGPValidators } from 'src/app/utils/MGPValidator';
import { RulesConfigDescription } from './RulesConfigDescription';

describe('RulesConfigurationComponent', () => {

    let testUtils: SimpleComponentTestUtils<RulesConfigurationComponent>;

    let component: RulesConfigurationComponent;

    async function chooseConfig(configIndex: number): Promise<void> {
        const selectAI: HTMLSelectElement = testUtils.findElement('#ruleSelect').nativeElement;
        selectAI.value = selectAI.options[configIndex].value;
        selectAI.dispatchEvent(new Event('change'));
        testUtils.detectChanges();
        await testUtils.whenStable();
    }

    beforeEach(async() => {
        const activatedRoute: ActivatedRouteStub = new ActivatedRouteStub('whatever-game');
        testUtils = await SimpleComponentTestUtils.create(RulesConfigurationComponent, activatedRoute);
        component = testUtils.getComponent();
        const stateProvider: (_: RulesConfig) => KamisadoState = (_: RulesConfig) => {
            return KamisadoState.getInitialState();
        };
        component.stateProvider = MGPOptional.of(stateProvider); // A game needing no config
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    const secondConfig: RulesConfig = { nombre: 42, canailleDeBoule: 42 };

    const rulesConfigDescriptionWithNumber: RulesConfigDescription =
        new RulesConfigDescription(
            {
                name: (): string => 'the_default_config_name',
                config: {
                    nombre: 5,
                    canailleDeBoule: 12,
                },
            },
            {
                nombre: (): string => 'nombre',
                canailleDeBoule: (): string => 'canaille',
            }, [{
                name: (): string => 'the_other_config_name',
                config: secondConfig,
            }], {
                nombre: MGPValidators.range(1, 99),
                canailleDeBoule: MGPValidators.range(1, 99),
            },
        );

    const rulesConfigDescriptionWithBooleans: RulesConfigDescription = new RulesConfigDescription(
        {
            name: (): string => 'config name',
            config: {
                booleen: false,
                truth: false,
            },
        },
        {
            booleen: (): string => 'booleen',
            truth: (): string => 'veritasserum',
        },
    );

    describe('creator behavior', () => {

        beforeEach(() => {
            component.userIsCreator = true;
            component.rulesConfigDescription = rulesConfigDescriptionWithNumber;
        });

        it('should  display enabled rules select', fakeAsync(async() => {
            // Given a component created for non-creator
            // When displaying it
            // Then rulesSelect should not be present
            testUtils.expectElementToExist('#ruleSelect');
            testUtils.expectElementToBeEnabled('#ruleSelect');
        }));

        it('should display default config', fakeAsync(async() => {
            // Given any component

            // When displaying it
            testUtils.detectChanges();

            // Then default values should be displayed
            testUtils.expectElementToExist('#the_default_config_name_values');
        }));

        it('should not throw when stateProvider is missing due to unexisting game', fakeAsync(async() => {
            // Given any component from creator point of view
            component.stateProvider = MGPOptional.empty();

            // When displaying it
            testUtils.detectChanges();

            // Then the app-demo-card should simply not be there
            testUtils.expectElementNotToExist('#demoCard');
        }));

        it('should allow to change to another standard config', fakeAsync(async() => {
            // Given any component
            // And a config with two standard config (the default and the other)
            testUtils.detectChanges();
            spyOn(component.updateCallback, 'emit').and.callThrough();

            // When changing the chosen config
            await chooseConfig(1);
            expect(component.updateCallback.emit).toHaveBeenCalledOnceWith(MGPOptional.of(secondConfig));
        }));

        it('should immediately emit on initialisation when no config to fill', fakeAsync(async() => {
            // Given a rules config component provided with an empty configuration
            component.rulesConfigDescription = RulesConfigDescription.DEFAULT;
            spyOn(component.updateCallback, 'emit').and.callThrough();

            // When initializing
            testUtils.detectChanges();

            // Then the callback should have emit {}
            const expectedValue: MGPOptional<RulesConfig> = MGPOptional.of({});
            expect(component.updateCallback.emit).toHaveBeenCalledOnceWith(expectedValue);
        }));

        it('should immediately emit on initialisation because default config is valid', fakeAsync(async() => {
            // Given a rules config component provided with an empty configuration
            spyOn(component.updateCallback, 'emit').and.callThrough();

            // When initializing
            testUtils.detectChanges();

            // Then the callback should have been emitted
            const expectedValue: MGPOptional<RulesConfig> = MGPOptional.of({ // The default config
                nombre: 5,
                canailleDeBoule: 12,
            });
            expect(component.updateCallback.emit).toHaveBeenCalledOnceWith(expectedValue);
        }));

        describe('modifying custom configuration', () => {

            it('should throw when editing non-custom config', fakeAsync(async() => {
                // Given a component for creator where we're not editing "Custom"
                spyOn(ErrorLoggerService, 'logError').and.resolveTo();
                testUtils.detectChanges();

                // When modifying a value
                component.rulesConfigForm.get('nombre')?.setValue(80);

                // Then it should throw
                const error: string = 'Only Customifiable config should be modified!';
                expect(ErrorLoggerService.logError).toHaveBeenCalledOnceWith('RulesConfiguration', error);
            }));

            describe('number config', () => {

                beforeEach(fakeAsync(async() => {
                    component.rulesConfigDescription = rulesConfigDescriptionWithNumber;
                    await chooseConfig(2); // Choosing the customisable config
                }));

                it('should propose a number input when given a config of type number', fakeAsync(async() => {
                    // Given a component loaded with a config description having a number

                    // When rendering component
                    testUtils.detectChanges();
                    // Then there should be a number configurator
                    testUtils.expectElementToExist('#nombre_config');
                }));

                it('should emit new value when changing value', fakeAsync(async() => {
                    // Given a component loaded with a config description
                    testUtils.detectChanges();

                    // When modifying config
                    spyOn(component.updateCallback, 'emit').and.callThrough();
                    component.rulesConfigForm.get('nombre')?.setValue(80);

                    // Then the resulting value should be updated
                    const expectedValue: MGPOptional<RulesConfig> = MGPOptional.of({ nombre: 80, canailleDeBoule: 12 });
                    expect(component.updateCallback.emit).toHaveBeenCalledOnceWith(expectedValue);
                }));

                it('should emit default value of the non modified fields when modifying another field', fakeAsync(async() => {
                    // Given a component loaded with a config description
                    testUtils.detectChanges();

                    // When modifying another config
                    spyOn(component.updateCallback, 'emit').and.callThrough();
                    component.rulesConfigForm.get('canailleDeBoule')?.setValue(80);

                    // Then the resulting value should be the default, for the unmodified one
                    const expectedValue: MGPOptional<RulesConfig> = MGPOptional.of({ nombre: 5, canailleDeBoule: 80 });
                    expect(component.updateCallback.emit).toHaveBeenCalledOnceWith(expectedValue);
                }));

                it('should emit an empty optional when applying invalid change', fakeAsync(async() => {
                    // Given a component loaded with a config description that has a validator
                    testUtils.detectChanges();

                    // When modifying config to zero or negative
                    spyOn(component.updateCallback, 'emit').and.callThrough();
                    component.rulesConfigForm.get('nombre')?.setValue(0);

                    // Then the resulting value should not have been emitted
                    expect(component.updateCallback.emit).toHaveBeenCalledOnceWith(MGPOptional.empty());
                }));

                describe('MGPValidators.range', () => {

                    it('should display custom validation error when making the value too small', fakeAsync(async() => {
                        // Given a component loaded with a config description that has a validator
                        testUtils.detectChanges();

                        // When modifying config to zero or negative
                        component.rulesConfigForm.get('nombre')?.setValue(0);

                        // Then the resulting value should not have been emitted
                        expect(testUtils.findElement('#nombre_number_config_error').nativeElement.innerHTML).toEqual('0 is too small, the minimum is 1');
                    }));

                    it('should display custom validation error when making the value too big', fakeAsync(async() => {
                        // Given a component loaded with a config description that has a validator
                        testUtils.detectChanges();

                        // When modifying config to 100 or more
                        component.rulesConfigForm.get('nombre')?.setValue(100);

                        // Then the resulting value should not have been emitted
                        expect(testUtils.findElement('#nombre_number_config_error').nativeElement.innerHTML).toEqual('100 is too big, the maximum is 99');
                    }));

                    it('should display custom validation error when erasing value', fakeAsync(async() => {
                        // Given a component loaded with a config description that has a validator
                        testUtils.detectChanges();

                        // When erasing value
                        component.rulesConfigForm.get('nombre')?.setValue(null);

                        // Then the resulting value should not have been emitted
                        expect(testUtils.findElement('#nombre_number_config_error').nativeElement.innerHTML).toEqual('This value is mandatory');
                    }));

                });

            });

            describe('boolean config', () => {

                beforeEach(fakeAsync(async() => {
                    component.rulesConfigDescription = rulesConfigDescriptionWithBooleans;
                    await chooseConfig(1); // Choosing the customisable config
                }));

                it('should propose a boolean input when given a config of type boolean', fakeAsync(async() => {
                    // Given a component loaded with a config description having a boolean

                    // When rendering component
                    testUtils.detectChanges();
                    // Then there should be a number configurator
                    testUtils.expectElementToExist('#booleen_config');
                }));

                it('should emit new value when changing value', fakeAsync(async() => {
                    // Given a component loaded with a config description
                    testUtils.detectChanges();

                    // When modifying config
                    spyOn(component.updateCallback, 'emit').and.callThrough();
                    component.rulesConfigForm.get('booleen')?.setValue(false);

                    // Then the resulting value should be updated
                    const expectedValue: MGPOptional<RulesConfig> = MGPOptional.of({ booleen: false, truth: false });
                    expect(component.updateCallback.emit).toHaveBeenCalledOnceWith(expectedValue);
                }));

                it('should emit default value of the non modified fields when modifying another field', fakeAsync(async() => {
                    // Given a component loaded with a config description
                    testUtils.detectChanges();

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

    describe('non-creator behavior', () => {

        beforeEach(() => {
            component.userIsCreator = false;
            component.rulesConfigDescription = RulesConfigDescription.DEFAULT;
            component.rulesConfigToDisplay = {}; // Mandatory even if it's a configless game
        });

        it('should display disabled rules select', fakeAsync(async() => {
            // Given a component created for non-creator
            // When displaying it
            testUtils.detectChanges();

            // Then rulesSelect should not be present
            testUtils.expectElementToExist('#ruleSelect');
            testUtils.expectElementToBeDisabled('#ruleSelect');
        }));

        it('should immediately emit on initialisation when no config to fill', fakeAsync(async() => {
            // Given a rules config component provided with an empty configuration
            spyOn(component.updateCallback, 'emit').and.callThrough();

            // When initializing
            testUtils.detectChanges();

            // Then the callback should have emit {}
            const expectedValue: MGPOptional<RulesConfig> = MGPOptional.of({});
            expect(component.updateCallback.emit).toHaveBeenCalledOnceWith(expectedValue);
        }));

        describe('modifying custom configuration', () => {

            it('should throw at creation if rulesConfigToDisplay is missing', fakeAsync(async() => {
                // Given a component intended for passive user with no config to display
                component.rulesConfigToDisplay = undefined;

                RulesUtils.expectToThrowAndLog(() => {
                    // When rendering it
                    testUtils.detectChanges();
                    // Then it should throw
                }, 'Config should be provided to non-creator in RulesConfigurationComponent');
            }));

            describe('number config', () => {

                beforeEach(() => {
                    component.rulesConfigToDisplay = {
                        nombre: 5,
                        canailleDeBoule: 12,
                    };
                    component.rulesConfigDescription = rulesConfigDescriptionWithNumber;
                });

                it('should propose a disabled number input when given a config of type number', fakeAsync(async() => {
                    // Given a component loaded with a config description having a number

                    // When rendering component
                    testUtils.detectChanges();
                    // Then there should be a fieldset, but disabled
                    testUtils.expectElementToBeDisabled('#nombre_number_config_input');
                }));

                it('should not trigger update callback when changing value and throw', () => {
                    // Given a component loaded with a config description having a number filled
                    spyOn(ErrorLoggerService, 'logError').and.resolveTo();
                    const error: string = 'Only creator should be able to modify rules config';
                    testUtils.detectChanges();
                    spyOn(component.updateCallback, 'emit').and.callThrough();

                    // When modifying config
                    // (technically impossible but setValue don't need the HTML possibility to do it)
                    // And unit testing that this should not be doable is actually more future proof)
                    component.rulesConfigForm.get('nombre')?.setValue(80);
                    // Then there should have been no emission, but an error
                    expect(ErrorLoggerService.logError).toHaveBeenCalledOnceWith('RulesConfiguration', error);
                    expect(component.updateCallback.emit).not.toHaveBeenCalled();
                });

            });

            describe('boolean config', () => {

                beforeEach(() => {
                    component.rulesConfigToDisplay = {
                        booleen: true,
                        truth: true,
                    };
                    component.rulesConfigDescription = rulesConfigDescriptionWithBooleans;
                });

                it('should display value of the rulesConfigToDisplay, not of the default config', fakeAsync(async() => {
                    // Given a board board on which the config 'booleen' is by default checked
                    // but has been changed and is hence unchecked in the config to display
                    // Also testing the opposite for the config 'truth()
                    const defaultConfig: RulesConfig = component.rulesConfigDescription.getDefaultConfig().config;
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

                it('should propose a disabled boolean input when given a config of type number', fakeAsync(async() => {
                    // Given a component loaded with a config description having a number

                    // When rendering component
                    testUtils.detectChanges();
                    // Then there should be a fieldset, but disabled
                    testUtils.expectElementToBeDisabled('#booleen_boolean_config_input');
                }));

                it('should not trigger update callback when changing value and throw', () => {
                    // Given a component loaded with a config description having a number filled
                    spyOn(ErrorLoggerService, 'logError').and.resolveTo();
                    const error: string = 'Only creator should be able to modify rules config';
                    testUtils.detectChanges();
                    spyOn(component.updateCallback, 'emit').and.callThrough();

                    // When modifying config
                    // (technically impossible but setValue don't need the HTML possibility to do it)
                    // And unit testing that this should not be doable is actually more future proof)
                    component.rulesConfigForm.get('booleen')?.setValue(false);
                    // Then there should have been no emission, but an error
                    expect(ErrorLoggerService.logError).toHaveBeenCalledOnceWith('RulesConfiguration', error);
                    expect(component.updateCallback.emit).not.toHaveBeenCalled();
                });

            });

        });

    });

});
