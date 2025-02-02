/* eslint-disable max-lines-per-function */
import { fakeAsync } from '@angular/core/testing';

import { ActivatedRouteStub, ComponentTestUtils, SimpleComponentTestUtils } from 'src/app/utils/tests/TestUtils.spec';
import { QuebecCastlesComponent } from '../quebec-castles.component';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { MGPOptional } from 'lib/dist';
import { QuebecCastlesConfig, QuebecCastlesFailure, QuebecCastlesRules } from '../QuebecCastlesRules';
import { QuebecCastlesMove } from '../QuebecCastlesMove';
import { Coord } from 'src/app/jscaip/Coord';
import { QuebecCastlesState } from '../QuebecCastlesState';
import { RulesConfigurationComponent } from 'src/app/components/wrapper-components/rules-configuration/rules-configuration.component';
import { DebugElement } from '@angular/core';

describe('QuebecCastlesComponent', () => {

    let testUtils: ComponentTestUtils<QuebecCastlesComponent>;
    const rules: QuebecCastlesRules = QuebecCastlesRules.get();
    const defaultConfig: MGPOptional<QuebecCastlesConfig> = rules.getDefaultRulesConfig();

    beforeEach(fakeAsync(async() => {
        // This `testUtils` will be used throughout the test suites as a matcher for various test conditions
        testUtils = await ComponentTestUtils.forGame<QuebecCastlesComponent>('QuebecCastles');
    }));

    it('should highlight first selected piece', fakeAsync(async() => {
        // Given any board in move phase
        // When clicking on a piece of current player
        await testUtils.expectClickSuccess('#square-7-7');
        // Then first coord should be selected
        testUtils.expectElementToHaveClass('#piece-7-7', 'selected-stroke');
    }));

    it('should should apply move on second click', fakeAsync(async() => {
        // Given any board in move phase where a piece is selected
        await testUtils.expectClickSuccess('#square-7-7');

        // When clicking on a case next to it
        // Then the move should be legal
        const move: QuebecCastlesMove = QuebecCastlesMove.translation(new Coord(7, 7), new Coord(6, 6));
        await testUtils.expectMoveSuccess('#square-6-6', move);
    }));

    it('should not select opponent piece', fakeAsync(async() => {
        // Given any board in move phase
        // When clicking on an opponent piece
        await testUtils.expectClickFailure('#square-2-2', RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_OPPONENT());
        // Then opponent piece should not be selected
        testUtils.expectElementNotToHaveClass('#piece-2-2', 'selected-stroke');
    }));

    it('should deselect when clicking on same piece again', fakeAsync(async() => {
        // Given any board with a selected piece
        await testUtils.expectClickSuccess('#square-7-7');
        // When clicking on the piece again
        await testUtils.expectClickSuccess('#square-7-7');
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
                await testUtils.expectClickSuccess('#square-7-7');
                // When dropping another one
                await testUtils.expectClickSuccess('#square-6-6');
                // Then the other piece should be dropped
                testUtils.expectElementToHaveClasses('#piece-7-7', ['base', 'player0-fill', 'selected-stroke']);
                testUtils.expectElementToHaveClasses('#piece-6-6', ['base', 'player0-fill', 'selected-stroke']);
            }));

            it('should deselect piece when clicking a second time', fakeAsync(async() => {
                // Given any board on which a piece is already dropped
                const customConfig: MGPOptional<QuebecCastlesConfig> = MGPOptional.of({
                    ...defaultConfig.get(),
                    dropPieceYourself: true,
                });
                await testUtils.setupState(rules.getInitialState(customConfig), { config: customConfig });
                await testUtils.expectClickSuccess('#square-7-7');

                // When clicking on it again
                // Then the other piece should be dropped
                await testUtils.expectClickSuccess('#square-7-7');
            }));

            it('should show validation button when last piece is dropped', fakeAsync(async() => {
                // Given any board in drop phase with only one piece left to drop
                const customConfig: MGPOptional<QuebecCastlesConfig> = MGPOptional.of({
                    ...defaultConfig.get(),
                    dropPieceYourself: true,
                    defender: 3,
                });
                await testUtils.setupState(rules.getInitialState(customConfig), { config: customConfig });
                await testUtils.expectClickSuccess('#square-7-7');
                await testUtils.expectClickSuccess('#square-6-6');
                // When dropping the last one
                await testUtils.expectClickSuccess('#square-5-5');
                // Then the validation button should be visible
                testUtils.expectElementToHaveClass('#piece-7-7', 'selected-stroke');
            }));

            it('should allow validating drop when there is enough', fakeAsync(async() => {
                // Given a board in drop phase, with all drop done but one
                const customConfig: MGPOptional<QuebecCastlesConfig> = MGPOptional.of({
                    ...defaultConfig.get(),
                    dropPieceYourself: true,
                    defender: 3,
                });
                await testUtils.setupState(rules.getInitialState(customConfig), { config: customConfig });
                await testUtils.expectClickSuccess('#square-7-8');
                await testUtils.expectClickSuccess('#square-6-8');

                // When dropping last piece
                await testUtils.expectClickSuccess('#square-5-8');

                // Then the validator should be clickable
                testUtils.expectElementNotToHaveClass('#drop-validator', 'semi-transparent');
            }));

            it('should show last dropped after all dropped', fakeAsync(async() => {
                // Given a board on which all piece has been dropped
                const customConfig: MGPOptional<QuebecCastlesConfig> = MGPOptional.of({
                    ...defaultConfig.get(),
                    dropPieceYourself: true,
                    defender: 3,
                });
                await testUtils.setupState(rules.getInitialState(customConfig), { config: customConfig });
                await testUtils.expectClickSuccess('#square-7-8');
                await testUtils.expectClickSuccess('#square-6-8');
                await testUtils.expectClickSuccess('#square-5-8');

                // When validating the drop
                const coords: Coord[] = [new Coord(7, 8), new Coord(6, 8), new Coord(5, 8)];
                const move: QuebecCastlesMove = QuebecCastlesMove.drop(coords);
                await testUtils.expectMoveSuccess('#drop-validator', move);

                // Then the dropped should be marked as last-moved
                testUtils.expectElementToHaveClasses('#square-7-8', ['base', 'moved-fill']);
                testUtils.expectElementToHaveClasses('#square-6-8', ['base', 'moved-fill']);
                testUtils.expectElementToHaveClasses('#square-5-8', ['base', 'moved-fill']);
                testUtils.expectElementToHaveClasses('#piece-7-8', ['base', 'player0-fill']);
                testUtils.expectElementToHaveClasses('#piece-6-8', ['base', 'player0-fill']);
                testUtils.expectElementToHaveClasses('#piece-5-8', ['base', 'player0-fill']);
            }));

            it('should display last drop for player one', fakeAsync(async() => {
                // Given a board on which all piece has been dropped for Player.ONE
                const customConfig: MGPOptional<QuebecCastlesConfig> = MGPOptional.of({
                    ...defaultConfig.get(),
                    dropPieceYourself: true,
                    defender: 3,
                    invader: 3,
                });
                const initialState: QuebecCastlesState = rules.getInitialState(customConfig).incrementTurn();
                await testUtils.setupState(initialState, { config: customConfig });
                await testUtils.expectClickSuccess('#square-1-1');
                await testUtils.expectClickSuccess('#square-2-1');
                await testUtils.expectClickSuccess('#square-1-2');

                // // When validating the drop
                const coords: Coord[] = [new Coord(1, 1), new Coord(2, 1), new Coord(1, 2)];
                const move: QuebecCastlesMove = QuebecCastlesMove.drop(coords);
                await testUtils.expectMoveSuccess('#drop-validator', move);

                // // Then the dropped should be marked as last-moved
                testUtils.expectElementToHaveClasses('#square-1-1', ['base', 'moved-fill']);
                testUtils.expectElementToHaveClasses('#square-2-1', ['base', 'moved-fill']);
                testUtils.expectElementToHaveClasses('#square-1-2', ['base', 'moved-fill']);
                testUtils.expectElementToHaveClasses('#piece-1-1', ['base', 'player1-fill']);
                testUtils.expectElementToHaveClasses('#piece-2-1', ['base', 'player1-fill']);
                testUtils.expectElementToHaveClasses('#piece-1-2', ['base', 'player1-fill']);
            }));

            it('should allow second player to drop after a first drop has been done', fakeAsync(async() => {
                // Given any board with a dropped piece
                const customConfig: MGPOptional<QuebecCastlesConfig> = MGPOptional.of({
                    ...defaultConfig.get(),
                    dropPieceYourself: true,
                });
                await testUtils.setupState(rules.getInitialState(customConfig), { config: customConfig });
                await testUtils.expectClickSuccess('#square-7-7');
                // When dropping another one
                await testUtils.expectClickSuccess('#square-6-6');
                // Then the other piece should be dropped
                testUtils.expectElementToHaveClasses('#piece-7-7', ['base', 'player0-fill', 'selected-stroke']);
                testUtils.expectElementToHaveClasses('#piece-6-6', ['base', 'player0-fill', 'selected-stroke']);
            }));

        });

        describe('drop yourself = true & drop piece by piece = true', () => {

            it('should drop single piece', fakeAsync(async() => {
                // Given any drop in a "drop yourself & piece by piece"
                const customConfig: MGPOptional<QuebecCastlesConfig> = MGPOptional.of({
                    ...defaultConfig.get(),
                    dropPieceYourself: true,
                    dropPieceByPiece: true,
                });
                await testUtils.setupState(rules.getInitialState(customConfig), { config: customConfig });

                // When doing single click
                // Then it should drop
                const move: QuebecCastlesMove = QuebecCastlesMove.drop([new Coord(7, 7)]);
                await testUtils.expectMoveSuccess('#square-7-7', move);
            }));

        });

    });

});

describe('QuebecCastles Custom Configs', () => {

    let testUtils: SimpleComponentTestUtils<RulesConfigurationComponent>;
    let component: RulesConfigurationComponent;
    const rules: QuebecCastlesRules = QuebecCastlesRules.get();
    const defaultConfig: MGPOptional<QuebecCastlesConfig> = rules.getDefaultRulesConfig();

    async function setCustomConfigTags(tags: { [key : string]: number | boolean }): Promise<void> {
        await testUtils.chooseConfig('Custom');
        testUtils.detectChanges();
        for (const key of Object.keys(tags)) {
            const value: number | boolean = tags[key];
            component.rulesConfigForm.get(key)?.setValue(value);
        }
    }

    function expectElementToHaveError(configLine: string, error: string): void {
        const fakeElement: DebugElement = testUtils.findElement(`#${ configLine }-error`);
        const content: string = fakeElement.nativeElement.innerText;
        expect(content).toBe(error);
    }

    beforeEach(async() => {
        const activatedRoute: ActivatedRouteStub = new ActivatedRouteStub('whatever-game');
        testUtils = await SimpleComponentTestUtils.create(RulesConfigurationComponent, activatedRoute);
        component = testUtils.getComponent();
        component.rulesConfigDescriptionOptional = rules.getRulesConfigDescription();
        component.editable = true;
    });

    it('should forbid config with too little room for pieces', fakeAsync(async() => {
        // Given a config with too little room for defender piece
        const customConfig: QuebecCastlesConfig = {
            ...defaultConfig.get(),
            defender: 15, // There won't be enough room for that many pieces
        };

        // When setting up that invalid config
        await setCustomConfigTags(customConfig);

        // Then there should be an error eh!
        const error: string = QuebecCastlesFailure.CANNOT_PUT_THAT_MUCH_PIECE_IN_THERE(14, 4);
        expectElementToHaveError('defender', error);
    }));

    it('should forbid config where player line cross the middle of the board (rhombic)', fakeAsync(async() => {
        // Given a config with too much lines for territory
        const customConfig: QuebecCastlesConfig = {
            ...defaultConfig.get(),
            linesForTerritory: 8,
        };

        // When setting up that invalid config
        await setCustomConfigTags(customConfig);

        // Then there should be an error eh!
        const error: string = QuebecCastlesFailure.TOO_MUCH_LINES_FOR_TERRITORY();
        expectElementToHaveError('linesForTerritory', error);
    }));

    it('should forbid config where player line cross the middle of the board (rectangular)', fakeAsync(async() => {
        // Given a config with too much lines for territory (rectangular board)
        const customConfig: QuebecCastlesConfig = {
            ...defaultConfig.get(),
            linesForTerritory: 5,
            isRhombic: false,
        };

        // When setting up that invalid config
        await setCustomConfigTags(customConfig);

        // Then there should be an error eh!
        const error: string = QuebecCastlesFailure.TOO_MUCH_LINES_FOR_TERRITORY();
        expectElementToHaveError('linesForTerritory', error);
    }));


});
