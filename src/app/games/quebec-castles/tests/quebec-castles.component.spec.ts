/* eslint-disable max-lines-per-function */
import { fakeAsync } from '@angular/core/testing';

import { ComponentTestUtils } from 'src/app/utils/tests/TestUtils.spec';
import { QuebecCastlesComponent } from '../quebec-castles.component';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { MGPOptional } from 'lib/dist';
import { QuebecCastlesConfig, QuebecCastlesRules } from '../QuebecCastlesRules';

fdescribe('QuebecCastlesComponent', () => {

    let testUtils: ComponentTestUtils<QuebecCastlesComponent>;
    const rules: QuebecCastlesRules = QuebecCastlesRules.get();
    const defaultConfig: MGPOptional<QuebecCastlesConfig> = rules.getDefaultRulesConfig();

    beforeEach(fakeAsync(async() => {
        // This `testUtils` will be used throughout the test suites as a matcher for various test conditions
        testUtils = await ComponentTestUtils.forGame<QuebecCastlesComponent>('QuebecCastles');
    }));

    it('should create', () => {
        // This test is done in all games to ensure that their initialization works as expected
        testUtils.expectToBeCreated();
    });

    it('should highlight first dropped piece', fakeAsync(async() => {
        // Given any board in move phase
        // When clicking on a piece of current player
        await testUtils.expectClickSuccess('#click-7-7');
        // Then first coord should be selected
        testUtils.expectElementToHaveClass('#piece-7-7', 'selected-stroke');
    }));

    it('should not select opponent piece', fakeAsync(async() => {
        // Given any board in move phase
        // When clicking on an opponent piece
        await testUtils.expectClickFailure('#click-2-2', RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_OPPONENT());
        // Then opponent piece should not be selected
        testUtils.expectElementNotToHaveClass('#piece-2-2', 'selected-stroke');
    }));

    it('should deselect when clicking on same piece again', fakeAsync(async() => {
        // Given any board with a selected piece
        await testUtils.expectClickSuccess('#click-7-7');
        // When clicking on the piece again
        await testUtils.expectClickSuccess('#click-7-7');
        // Then the piece should no longer be selected
        testUtils.expectElementNotToHaveClass('#piece-7-7', 'selected-stroke');
    }));

    describe('custom config', () => {

        describe('drop yourself = true', () => {

            it('should allow dropping a second piece', fakeAsync(async() => {
                // Given any board with a dropped piece
                const customConfig: MGPOptional<QuebecCastlesConfig> = MGPOptional.of({
                    ...defaultConfig.get(),
                    dropPieceYourself: true,
                });
                await testUtils.setupState(rules.getInitialState(customConfig), { config: customConfig });
                await testUtils.expectClickSuccess('#click-7-7');
                // When dropping another one
                await testUtils.expectClickSuccess('#click-6-6');
                // Then the other piece should be dropped
                testUtils.expectElementToHaveClasses('#piece-7-7', ['base', 'player0-fill', 'selected-stroke']);
                testUtils.expectElementToHaveClasses('#piece-6-6', ['base', 'player0-fill', 'selected-stroke']);
            }));

            it('should show validation button when last piece is dropped', fakeAsync(async() => {
                // Given any board in drop phase with only one piece left to drop
                const customConfig: MGPOptional<QuebecCastlesConfig> = MGPOptional.of({
                    ...defaultConfig.get(),
                    dropPieceYourself: true,
                    defender: 3,
                });
                await testUtils.setupState(rules.getInitialState(customConfig), { config: customConfig });
                await testUtils.expectClickSuccess('#click-7-7');
                await testUtils.expectClickSuccess('#click-6-6');
                // When dropping the last one
                await testUtils.expectClickSuccess('#click-5-5');
                // Then the validation button should be visible
                testUtils.expectElementToHaveClass('#piece-7-7', 'selected-stroke');
            }));

        });

    });

});
