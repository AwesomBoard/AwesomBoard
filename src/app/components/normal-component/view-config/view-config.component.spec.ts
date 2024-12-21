/* eslint-disable max-lines-per-function */
import { ActivatedRouteStub, SimpleComponentTestUtils } from 'src/app/utils/tests/TestUtils.spec';
import { ViewConfigComponent } from './view-config.component';
import { RulesConfig } from 'src/app/jscaip/RulesConfigUtil';
import { NumberConfig, RulesConfigDescription } from '../../wrapper-components/rules-configuration/RulesConfigDescription';
import { MGPValidators } from 'src/app/utils/MGPValidator';
import { MGPOptional } from '@everyboard/lib';
import { fakeAsync } from '@angular/core/testing';
import { RulesConfigurationComponent } from '../../wrapper-components/rules-configuration/rules-configuration.component';

describe('ViewConfigComponent', () => {

    let testUtils: SimpleComponentTestUtils<ViewConfigComponent>;

    let component: ViewConfigComponent;

    const rulesConfigDescription: RulesConfigDescription<RulesConfig> =
        new RulesConfigDescription(
            {
                name: (): string => 'default',
                config: {
                    size: new NumberConfig(5, () => 'size', MGPValidators.range(1, 99)),
                },
            }, []);

    const defaultConfig: RulesConfig = { size: 5 };
    const customConfig: RulesConfig = { size: 42 };

    beforeEach(async() => {
        const activatedRoute: ActivatedRouteStub = new ActivatedRouteStub('whatever-game');
        testUtils = await SimpleComponentTestUtils.create(ViewConfigComponent, activatedRoute);
        component = testUtils.getComponent();
        component.rulesConfigDescription = MGPOptional.of(rulesConfigDescription);
        component.gameName = 'whatever-game';
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should show config when clicking on "view config" (default config)', fakeAsync(async() => {
        // Given a game with default config
        component.rulesConfig = MGPOptional.of(defaultConfig);
        testUtils.expectElementNotToExist('#rules-config-component');
        // When clicking on "view config" button
        await testUtils.clickElement('#show-config');
        // Then it should show rules config, with the default config selected
        testUtils.expectElementToExist('#rules-config-component');
        const rulesConfigurationComponent: RulesConfigurationComponent =
            testUtils.findElementByDirective(RulesConfigurationComponent).componentInstance;
        expect(rulesConfigurationComponent.rulesConfigToDisplay).toEqual(defaultConfig);
    }));

    it('should hide config when clicking on close button', fakeAsync(async() => {
        // Given a game with config shown
        component.rulesConfig = MGPOptional.of(defaultConfig);
        testUtils.expectElementNotToExist('#rules-config-component');
        await testUtils.clickElement('#show-config');
        testUtils.expectElementToExist('#rules-config-component');
        // When clicking on "close config" button
        await testUtils.clickElement('#close-config');
        // Then it should close rules config
        testUtils.expectElementNotToExist('#rules-config-component');
    }));

    it('should show config when clicking on "view config" (custom config)', fakeAsync(async() => {
        // Given a game with custom config
        component.rulesConfig = MGPOptional.of(customConfig);
        // When clicking on "view config" button
        await testUtils.clickElement('#show-config');
        // Then it should rules config, with the custom config selected
        const rulesConfigurationComponent: RulesConfigurationComponent =
            testUtils.findElementByDirective(RulesConfigurationComponent).componentInstance;
        expect(rulesConfigurationComponent.rulesConfigToDisplay).toEqual(customConfig);
    }));
});
