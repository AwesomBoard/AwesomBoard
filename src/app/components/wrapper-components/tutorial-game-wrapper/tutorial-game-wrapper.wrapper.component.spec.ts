/* eslint-disable max-lines-per-function */
import { TutorialGameWrapperComponent, TutorialGameWrapperMessages } from './tutorial-game-wrapper.component';
import { TutorialStep } from './TutorialStep';
import { QuartoMove } from 'src/app/games/quarto/QuartoMove';
import { QuartoState } from 'src/app/games/quarto/QuartoState';
import { QuartoPiece } from 'src/app/games/quarto/QuartoPiece';
import { ComponentTestUtils, expectValidRouting } from 'src/app/utils/tests/TestUtils.spec';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { QuartoComponent } from '../../../games/quarto/quarto.component';
import { Comparable, MGPFallible, MGPOptional, MGPValidation } from '@everyboard/lib';
import { TutorialFailure } from './TutorialFailure';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { Router } from '@angular/router';
import { LocalGameWrapperComponent } from '../local-game-wrapper/local-game-wrapper.component';
import { OnlineGameCreationComponent } from '../../normal-component/online-game-creation/online-game-creation.component';
import { GameWrapperMessages } from '../GameWrapper';
import { NotFoundComponent } from '../../normal-component/not-found/not-found.component';
import { AbstractGameComponent } from '../../game-components/game-component/GameComponent';
import { Player } from 'src/app/jscaip/Player';
import { RulesConfig, RulesConfigUtils } from 'src/app/jscaip/RulesConfigUtil';
import { QuartoConfig, QuartoRules } from 'src/app/games/quarto/QuartoRules';
import { TutorialStepMessage } from './TutorialStepMessage';

describe('TutorialGameWrapperComponent for non-existing game', () => {
    it('should redirect to /notFound', fakeAsync(async() => {
        // Given a game wrapper for a game that does not exist
        const testUtils: ComponentTestUtils<AbstractGameComponent> = await ComponentTestUtils.basic('invalid-game', true);
        testUtils.prepareFixture(TutorialGameWrapperComponent);
        const router: Router = TestBed.inject(Router);
        spyOn(router, 'navigate').and.resolveTo();

        // When loading the wrapper
        testUtils.detectChanges();
        tick(0);

        // Then it goes to /notFound with the expected error message
        expectValidRouting(
            router,
            ['/notFound', GameWrapperMessages.NO_MATCHING_GAME('invalid-game')],
            NotFoundComponent,
            { skipLocationChange: true },
        );
    }));
});

describe('TutorialGameWrapperComponent (wrapper)', () => {

    let testUtils: ComponentTestUtils<QuartoComponent, Comparable>;
    let wrapper: TutorialGameWrapperComponent;
    const defaultConfig: MGPOptional<QuartoConfig> = QuartoRules.get().getDefaultRulesConfig();

    beforeEach(fakeAsync(async() => {
        testUtils =
            await ComponentTestUtils.forGameWithWrapper<QuartoComponent, Comparable>('Quarto', TutorialGameWrapperComponent);
        wrapper = testUtils.getWrapper() as TutorialGameWrapperComponent;
    }));

    describe('Common behavior', () => {

        // ///////////////////////// Before ///////////////////////////////////////

        it('should create', () => {
            testUtils.expectToBeCreated();
        });

        it('should show informations below/beside the board', fakeAsync(async() => {
            // Given a certain TutorialStep
            const state: QuartoState = new QuartoState([
                [QuartoPiece.AAAA, QuartoPiece.AAAA, QuartoPiece.AAAA, QuartoPiece.AAAA],
                [QuartoPiece.AAAA, QuartoPiece.AAAB, QuartoPiece.AABA, QuartoPiece.AABB],
                [QuartoPiece.AAAA, QuartoPiece.AAAB, QuartoPiece.AABA, QuartoPiece.AABB],
                [QuartoPiece.AAAA, QuartoPiece.AAAB, QuartoPiece.AABA, QuartoPiece.AABB],
            ], 0, QuartoPiece.BBAA);
            const tutorial: TutorialStep[] = [
                TutorialStep.forClick(
                    'title',
                    'instruction',
                    state,
                    ['#click_0_0'],
                    TutorialStepMessage.CONGRATULATIONS(),
                    'Perdu.',
                ),
            ];
            // When starting tutorial
            await wrapper.startTutorial(tutorial);

            // expect to see step instruction on component
            const expectedMessage: string = 'instruction';
            const currentMessage: string = testUtils.findElement('#currentMessage').nativeElement.innerHTML;
            expect(currentMessage).toBe(expectedMessage);
            const actualState: QuartoState = testUtils.getGameComponent().getState();
            expect(actualState).toEqual(state);
        }));

        it('should show previousMove when set', fakeAsync(async() => {
            // Given a certain TutorialStep with previousMove set and no previousState
            const tutorialPreviousMove: QuartoMove = new QuartoMove(0, 0, QuartoPiece.BBBB);
            const tutorialState: QuartoState = new QuartoState([
                [QuartoPiece.AAAA, QuartoPiece.EMPTY, QuartoPiece.EMPTY, QuartoPiece.EMPTY],
                [QuartoPiece.EMPTY, QuartoPiece.EMPTY, QuartoPiece.EMPTY, QuartoPiece.EMPTY],
                [QuartoPiece.EMPTY, QuartoPiece.EMPTY, QuartoPiece.EMPTY, QuartoPiece.EMPTY],
                [QuartoPiece.EMPTY, QuartoPiece.EMPTY, QuartoPiece.EMPTY, QuartoPiece.EMPTY],
            ], 1, QuartoPiece.BBBB);
            const tutorial: TutorialStep[] = [
                TutorialStep.forClick(
                    'title',
                    'instruction',
                    tutorialState,
                    ['#click_0_0'],
                    TutorialStepMessage.CONGRATULATIONS(),
                    'Perdu.',
                ).withPreviousMove(tutorialPreviousMove),
            ];

            // When starting tutorial
            await wrapper.startTutorial(tutorial);

            // expect to see previous move but no parent to the node
            const componentPreviousMove: QuartoMove = wrapper.gameComponent.node.previousMove.get() as QuartoMove;
            expect(componentPreviousMove).toEqual(tutorialPreviousMove);
            expect(wrapper.gameComponent.node.parent.isAbsent()).toBeTrue();
        }));

        it('should show title of the steps, the selected one in bold', fakeAsync(async() => {
            // Given a TutorialStep with 3 steps
            const tutorial: TutorialStep[] = [
                TutorialStep.informational(
                    'title 0',
                    'instruction',
                    QuartoRules.get().getInitialState(defaultConfig),
                ),
                TutorialStep.informational(
                    'title 1',
                    'instruction',
                    QuartoRules.get().getInitialState(defaultConfig),
                ),
                TutorialStep.informational(
                    'title 2',
                    'instruction',
                    QuartoRules.get().getInitialState(defaultConfig),
                ),
            ];
            // When page rendered
            await wrapper.startTutorial(tutorial);

            // expect to see three "li" with step title
            let expectedTitle: string = 'title 0';
            let currentTitle: string = testUtils.findElement('#step_0').nativeElement.innerHTML;
            expect(currentTitle).toBe(expectedTitle);
            expectedTitle = 'title 1';
            currentTitle = testUtils.findElement('#step_1').nativeElement.innerHTML;
            expect(currentTitle).toBe(expectedTitle);
        }));

        it('should call setRole according to the current player (player zero)', fakeAsync(async() => {
            // Given a tutorial a step for player zero
            const statePlayerZero: QuartoState = QuartoRules.get().getInitialState(defaultConfig);
            const tutorial: TutorialStep[] = [
                TutorialStep.informational(
                    'title 0',
                    'instruction 0',
                    statePlayerZero,
                ),
            ];
            spyOn(wrapper, 'setRole').and.callThrough();

            // When rendering the page
            await wrapper.startTutorial(tutorial);

            // Then it should call setRole with playerZero
            expect(wrapper.setRole).toHaveBeenCalledOnceWith(Player.ZERO);
        }));

        it('should call setRole according to the current player (player one)', fakeAsync(async() => {
            // Given a tutorial a step for player one
            const statePlayerOne: QuartoState = new QuartoState([
                [QuartoPiece.AAAA, QuartoPiece.EMPTY, QuartoPiece.EMPTY, QuartoPiece.EMPTY],
                [QuartoPiece.EMPTY, QuartoPiece.EMPTY, QuartoPiece.EMPTY, QuartoPiece.EMPTY],
                [QuartoPiece.EMPTY, QuartoPiece.EMPTY, QuartoPiece.EMPTY, QuartoPiece.EMPTY],
                [QuartoPiece.EMPTY, QuartoPiece.EMPTY, QuartoPiece.EMPTY, QuartoPiece.EMPTY],
            ], 1, QuartoPiece.BBBB);

            const tutorial: TutorialStep[] = [
                TutorialStep.informational(
                    'title 0',
                    'instruction 0',
                    statePlayerOne,
                ),
            ];
            spyOn(wrapper, 'setRole').and.callThrough();

            // When rendering the page
            await wrapper.startTutorial(tutorial);

            // Then it should call setRole with playerOne
            expect(wrapper.setRole).toHaveBeenCalledOnceWith(Player.ONE);
        }));

        // ///////////////////////// ATTEMPTING ///////////////////////////////////

        it('should go to specific step when clicking on it', fakeAsync(async() => {
            // Given a TutorialStep with 3 steps
            const tutorial: TutorialStep[] = [
                TutorialStep.informational(
                    'title 0',
                    'instruction 0',
                    QuartoRules.get().getInitialState(defaultConfig),
                ),
                TutorialStep.informational(
                    'title 1',
                    'instruction 1',
                    QuartoRules.get().getInitialState(defaultConfig),
                ),
                TutorialStep.informational(
                    'title 2',
                    'instruction 2',
                    QuartoRules.get().getInitialState(defaultConfig),
                ),
            ];
            await wrapper.startTutorial(tutorial);

            // When selecting a step
            const stepSelection: HTMLSelectElement = testUtils.findElement('#steps').nativeElement;
            stepSelection.value = stepSelection.options[2].value;
            stepSelection.dispatchEvent(new Event('change'));
            testUtils.detectChanges();

            // expect to have the step 2 shown
            const expectedMessage: string = 'instruction 2';
            const currentMessage: string = testUtils.findElement('#currentMessage').nativeElement.innerHTML;
            expect(currentMessage).toBe(expectedMessage);
        }));

        // ///////////////////// Retry ///////////////////////////////////////////////////////////////////

        it('should start step again after clicking "retry" on step failure', fakeAsync(async() => {
            // Given any TutorialStep where an invalid move has been done
            const tutorial: TutorialStep[] = [
                TutorialStep.fromMove(
                    'title',
                    'instruction',
                    QuartoRules.get().getInitialState(defaultConfig),
                    [new QuartoMove(0, 0, QuartoPiece.BBBB)],
                    TutorialStepMessage.CONGRATULATIONS(),
                    'Perdu.',
                ),
            ];
            await wrapper.startTutorial(tutorial);
            await testUtils.expectClickSuccess('#click-piece-8');
            const move: QuartoMove = new QuartoMove(1, 1, QuartoPiece.BAAA);
            await testUtils.expectMoveSuccess('#click-coord-1-1', move);

            // When clicking retry
            await testUtils.clickElement('#retryButton');

            // expect to see steps instruction message on component and board restarted
            const currentMessage: string =
                testUtils.findElement('#currentMessage').nativeElement.innerHTML;
            expect(currentMessage).toBe('instruction');
            expect(testUtils.getGameComponent().getState())
                .toEqual(QuartoRules.get().getInitialState(defaultConfig));
        }));

        it('should start step again after clicking "retry" on step success', fakeAsync(async() => {
            // Given any TutorialStep
            const tutorial: TutorialStep[] = [
                TutorialStep.fromMove(
                    'title',
                    'instruction',
                    QuartoRules.get().getInitialState(defaultConfig),
                    [new QuartoMove(0, 0, QuartoPiece.BBBB)],
                    TutorialStepMessage.CONGRATULATIONS(),
                    'Perdu.',
                ),
            ];
            await wrapper.startTutorial(tutorial);
            // When doing another move, then clicking retry
            await testUtils.expectClickSuccess('#click-piece-15');
            const move: QuartoMove = new QuartoMove(0, 0, QuartoPiece.BBBB);
            await testUtils.expectMoveSuccess('#click-coord-0-0', move);
            await testUtils.clickElement('#retryButton');

            // expect to see steps instruction message on component and board restarted
            const currentMessage: string =
                testUtils.findElement('#currentMessage').nativeElement.innerHTML;
            expect(currentMessage).toBe('instruction');
            expect(testUtils.getGameComponent().getState())
                .toEqual(QuartoRules.get().getInitialState(defaultConfig));
        }));

        it('should forbid clicking again on the board after success', fakeAsync(async() => {
            // Given a TutorialStep on which a valid move has been done.
            const tutorial: TutorialStep[] = [
                TutorialStep.fromMove(
                    'title',
                    'Put your piece in a corner and give the opposite one.',
                    QuartoRules.get().getInitialState(defaultConfig),
                    [
                        new QuartoMove(0, 0, QuartoPiece.BBBB),
                        new QuartoMove(0, 3, QuartoPiece.BBBB),
                        new QuartoMove(3, 3, QuartoPiece.BBBB),
                        new QuartoMove(3, 0, QuartoPiece.BBBB),
                    ],
                    TutorialStepMessage.CONGRATULATIONS(),
                    'Perdu.',
                ),
            ];
            await wrapper.startTutorial(tutorial);

            await testUtils.expectClickSuccess('#click-coord-0-0');
            const move: QuartoMove = new QuartoMove(0, 0, QuartoPiece.BBBB);
            await testUtils.expectMoveSuccess('#click-piece-15', move);

            // When clicking again
            await testUtils.expectClickForbidden('#click-coord-2-2', TutorialFailure.STEP_FINISHED());

            // expect to see still the steps success message on component
            const expectedMessage: string = TutorialStepMessage.CONGRATULATIONS();
            const currentMessage: string =
                testUtils.findElement('#currentMessage').nativeElement.innerHTML;
            expect(currentMessage).toBe(expectedMessage);
        }));

        it('should allow clicking again after restarting succeeded steps', fakeAsync(async() => {
            // Given any TutorialStep whose step has been succeeded and restarted
            wrapper.steps = [
                TutorialStep.forClick(
                    'title',
                    'instruction',
                    QuartoRules.get().getInitialState(defaultConfig),
                    ['#click-piece-15'],
                    TutorialStepMessage.CONGRATULATIONS(),
                    'Perdu.',
                ),
            ];
            await testUtils.expectClickSuccess('#click-piece-15');
            await testUtils.clickElement('#retryButton');

            // When trying again
            await testUtils.expectClickSuccess('#click-piece-15');

            // expect to see success message again
            const currentMessage: string =
                testUtils.findElement('#currentMessage').nativeElement.innerHTML;
            expect(currentMessage).toBe(TutorialStepMessage.CONGRATULATIONS());
            expect(testUtils.getGameComponent().getState())
                .toEqual(QuartoRules.get().getInitialState(defaultConfig));
        }));

        // /////////////////////// Next /////////////////////////////////////////////////////////

        it('should allow to skip step', fakeAsync(async() => {
            // Given a TutorialStep with one click
            wrapper.steps = [
                TutorialStep.forClick(
                    'title',
                    'Explanation Explanation Explanation.',
                    QuartoRules.get().getInitialState(defaultConfig),
                    ['choose-coord-0-0'],
                    TutorialStepMessage.CONGRATULATIONS(),
                    'Perdu.',
                ),
                TutorialStep.forClick(
                    'title',
                    'Following Following Following.',
                    QuartoRules.get().getInitialState(defaultConfig),
                    ['#click-coord-0-0'],
                    'Fini.',
                    'Reperdu.',
                ),
            ];
            // When clicking "Skip"
            await testUtils.clickElement('#nextButton');

            // expect to see next step on component
            const expectedMessage: string = 'Following Following Following.';
            const currentMessage: string =
                testUtils.findElement('#currentMessage').nativeElement.innerHTML;
            expect(currentMessage).toBe(expectedMessage);
            expect(wrapper.stepFinished[0]).toBeFalse();
        }));

        it('should move to the next unfinished step when next step is finished', fakeAsync(async() => {
            // Given a tutorial on which the two first steps have been skipped
            const tutorial: TutorialStep[] = [
                TutorialStep.forClick(
                    'title 0',
                    'instruction 0',
                    QuartoRules.get().getInitialState(defaultConfig),
                    ['#click-coord-0-0'],
                    TutorialStepMessage.CONGRATULATIONS(),
                    'Perdu.',
                ),
                TutorialStep.forClick(
                    'title 1',
                    'instruction 1',
                    QuartoRules.get().getInitialState(defaultConfig),
                    ['#click-coord-1-1'],
                    TutorialStepMessage.CONGRATULATIONS(),
                    'Perdu.',
                ),
                TutorialStep.forClick(
                    'title 2',
                    'instruction 2',
                    QuartoRules.get().getInitialState(defaultConfig),
                    ['#click-coord-2-2'],
                    TutorialStepMessage.CONGRATULATIONS(),
                    'Perdu.',
                ),
            ];
            await wrapper.startTutorial(tutorial);
            await testUtils.clickElement('#nextButton');
            await testUtils.clickElement('#nextButton');
            await testUtils.expectClickSuccess('#click-coord-2-2');

            // When clicking next
            await testUtils.clickElement('#nextButton');

            // expect to be back at first step
            const expectedMessage: string = 'instruction 0';
            const currentMessage: string =
                testUtils.findElement('#currentMessage').nativeElement.innerHTML;
            expect(currentMessage).toBe(expectedMessage);
        }));

        it('should move to the first unfinished step when all next steps are finished', fakeAsync(async() => {
            // Given a tutorial on which the middle steps have been skipped
            const tutorial: TutorialStep[] = [
                TutorialStep.forClick(
                    'title 0',
                    'instruction 0',
                    QuartoRules.get().getInitialState(defaultConfig),
                    ['#click-coord-0-0'],
                    TutorialStepMessage.CONGRATULATIONS(),
                    'Perdu.',
                ),
                TutorialStep.forClick(
                    'title 1',
                    'instruction 1',
                    QuartoRules.get().getInitialState(defaultConfig),
                    ['#click-coord-1-1'],
                    TutorialStepMessage.CONGRATULATIONS(),
                    'Perdu.',
                ),
                TutorialStep.forClick(
                    'title 2',
                    'instruction 2',
                    QuartoRules.get().getInitialState(defaultConfig),
                    ['#click-coord-2-2'],
                    TutorialStepMessage.CONGRATULATIONS(),
                    'Perdu.',
                ),
            ];
            await wrapper.startTutorial(tutorial);
            await testUtils.clickElement('#nextButton'); // Go to 1
            await testUtils.expectClickSuccess('#click-coord-1-1'); // Do 1
            await testUtils.clickElement('#nextButton'); // Go to 2
            await testUtils.clickElement('#nextButton'); // Go to 0

            // When clicking next
            await testUtils.clickElement('#nextButton'); // Should go to 2

            // expect to be back at first step
            const expectedMessage: string = 'instruction 2';
            const currentMessage: string =
                testUtils.findElement('#currentMessage').nativeElement.innerHTML;
            expect(currentMessage).toBe(expectedMessage);
        }));

        it('should show congratulation and play buttons at the end of the tutorial, hide next button', fakeAsync(async() => {
            // Given a TutorialStep whose last step has been done
            const tutorial: TutorialStep[] = [
                TutorialStep.forClick(
                    'title 0',
                    'instruction 0',
                    QuartoRules.get().getInitialState(defaultConfig),
                    ['#click-coord-0-0'],
                    TutorialStepMessage.CONGRATULATIONS(),
                    'Perdu.',
                ),
            ];
            await wrapper.startTutorial(tutorial);
            await testUtils.expectClickSuccess('#click-coord-0-0');

            // When clicking next button
            await testUtils.clickElement('#nextButton');

            // expect to see end tutorial congratulations
            const expectedMessage: string = TutorialGameWrapperMessages.COMPLETED_TUTORIAL_MESSAGE();
            const currentMessage: string =
                testUtils.findElement('#currentMessage').nativeElement.innerHTML;
            expect(wrapper.successfulSteps).toBe(1);
            expect(currentMessage).toBe(expectedMessage);
            // expect next button to be hidden
            testUtils.expectElementNotToExist('#nextButton');
            // expect retry button to be hidden
            testUtils.expectElementNotToExist('#retryButton');
            // expect restart button to be here
            await testUtils.clickElement('#restartButton');
            expect(wrapper.successfulSteps).toBe(0);
        }));

        it('should allow to restart the whole tutorial when finished', fakeAsync(async() => {
            // Given a finished tutorial
            await wrapper.startTutorial([
                TutorialStep.informational(
                    'title 0',
                    'instruction 0',
                    QuartoRules.get().getInitialState(defaultConfig),
                ),
            ]);
            await testUtils.clickElement('#nextButton');

            // When clicking restart
            await testUtils.clickElement('#restartButton');

            // expect to be back on first step
            const currentMessage: string =
                testUtils.findElement('#currentMessage').nativeElement.innerHTML;
            expect(currentMessage).toBe(wrapper.steps[0].instruction);
            expect(wrapper.stepFinished.every((v: boolean) => v === false)).toBeTrue();
            expect(wrapper.stepIndex).toEqual(0);
        }));

        it('should redirect to local game when asking for it when finished', fakeAsync(async() => {
            const router: Router = TestBed.inject(Router);
            // Given a finish tutorial
            await wrapper.startTutorial([
                TutorialStep.informational(
                    'title 0',
                    'instruction 0',
                    QuartoRules.get().getInitialState(defaultConfig),
                ),
            ]);
            testUtils.expectElementNotToExist('#playLocallyButton');
            await testUtils.clickElement('#nextButton');

            // When clicking play locally
            spyOn(router, 'navigate').and.resolveTo(true);
            await testUtils.clickElement('#playLocallyButton');

            // expect navigator to have been called
            expectValidRouting(router, ['/local', 'Quarto'], LocalGameWrapperComponent);
        }));

        it('should redirect to online game when asking for it when finished and user is online', fakeAsync(async() => {
            // Given a finish tutorial
            await wrapper.startTutorial([
                TutorialStep.informational(
                    'title 0',
                    'instruction 0',
                    QuartoRules.get().getInitialState(defaultConfig),
                ),
            ]);
            testUtils.expectElementNotToExist('#playOnlineButton');
            await testUtils.clickElement('#nextButton');

            // When clicking play locally
            const router: Router = TestBed.inject(Router);
            spyOn(router, 'navigate').and.resolveTo();
            await testUtils.clickElement('#playOnlineButton');

            // expect navigator to have been called
            expectValidRouting(router, ['/play', 'Quarto'], OnlineGameCreationComponent);
        }));

    });

    describe('TutorialStep expecting specific moves', () => {

        it('should show highlight of first click on multiclick game component', fakeAsync(async() => {
            // Given a TutorialStep with several moves
            const tutorial: TutorialStep[] = [
                TutorialStep.fromMove(
                    'title',
                    'Put your piece in a corner and give the opposite one.',
                    QuartoRules.get().getInitialState(defaultConfig),
                    [
                        new QuartoMove(0, 0, QuartoPiece.BBBB),
                        new QuartoMove(0, 3, QuartoPiece.BBBB),
                        new QuartoMove(3, 3, QuartoPiece.BBBB),
                        new QuartoMove(3, 0, QuartoPiece.BBBB),
                    ],
                    TutorialStepMessage.CONGRATULATIONS(),
                    'Perdu.',
                ),
            ];
            await wrapper.startTutorial(tutorial);

            // When doing that move
            await testUtils.expectClickSuccess('#click-coord-3-3');
            tick(11);

            // expect highlight to be present
            testUtils.expectElementToExist('#dropped-piece-highlight');
        }));

        it('should show success message after step success', fakeAsync(async() => {
            // Given a TutorialStep with several moves
            const tutorial: TutorialStep[] = [
                TutorialStep.fromMove(
                    'title',
                    'Put your piece in a corner and give the opposite one.',
                    QuartoRules.get().getInitialState(defaultConfig),
                    [
                        new QuartoMove(0, 0, QuartoPiece.BBBB),
                        new QuartoMove(0, 3, QuartoPiece.BBBB),
                        new QuartoMove(3, 3, QuartoPiece.BBBB),
                        new QuartoMove(3, 0, QuartoPiece.BBBB),
                    ],
                    TutorialStepMessage.CONGRATULATIONS(),
                    'Perdu.',
                ),
            ];
            await wrapper.startTutorial(tutorial);

            // When doing that move
            await testUtils.expectClickSuccess('#click-coord-0-0');
            const move: QuartoMove = new QuartoMove(0, 0, QuartoPiece.BBBB);
            await testUtils.expectMoveSuccess('#click-piece-15', move);

            // expect to see steps success message on component
            const expectedMessage: string = TutorialStepMessage.CONGRATULATIONS();
            const currentMessage: string =
                testUtils.findElement('#currentMessage').nativeElement.innerHTML;
            expect(currentMessage).toBe(expectedMessage);
        }));

        it('should show failure message after step failure', fakeAsync(async() => {
            // Given a TutorialStep with several move
            const tutorial: TutorialStep[] = [
                TutorialStep.fromMove(
                    'title',
                    'Put your piece in a corner and give the opposite one.',
                    QuartoRules.get().getInitialState(defaultConfig),
                    [
                        new QuartoMove(0, 0, QuartoPiece.BBBB),
                        new QuartoMove(0, 3, QuartoPiece.BBBB),
                        new QuartoMove(3, 3, QuartoPiece.BBBB),
                        new QuartoMove(3, 0, QuartoPiece.BBBB),
                    ],
                    TutorialStepMessage.CONGRATULATIONS(),
                    'Perdu.',
                ),
            ];
            await wrapper.startTutorial(tutorial);

            // When doing another move
            await testUtils.expectClickSuccess('#click-coord-1-1');
            const move: QuartoMove = new QuartoMove(1, 1, QuartoPiece.BBBB);
            await testUtils.expectMoveSuccess('#click-piece-15', move);

            // expect to see steps success message on component
            const expectedReason: string = 'Perdu.';
            const currentReason: string =
                testUtils.findElement('#currentReason').nativeElement.innerHTML;
            expect(currentReason).toBe(expectedReason);
        }));

        it('When illegal move is done, toast message should be shown and restart not needed', fakeAsync(async() => {
            // Given tutorial awaiting any move, but mocking rules to make it mark a move illegal
            const tutorial: TutorialStep[] = [
                TutorialStep.anyMove(
                    'title',
                    'instruction',
                    QuartoRules.get().getInitialState(defaultConfig),
                    new QuartoMove(0, 0, QuartoPiece.BABA),
                    TutorialStepMessage.CONGRATULATIONS(),
                ),
            ];
            await wrapper.startTutorial(tutorial);

            // When doing a (virtually) illegal move
            const error: string = 'some error message...';
            spyOn(wrapper.gameComponent.rules, 'isLegal').and.returnValue(MGPFallible.failure(error));
            await testUtils.expectClickSuccess('#click-coord-0-0');
            const move: QuartoMove = new QuartoMove(0, 0, QuartoPiece.BBBB);
            await testUtils.expectMoveFailure('#click-piece-15', error, move);

            // expect to see message error
            const expectedReason: string = error;
            const currentReason: string =
                testUtils.findElement('#currentReason').nativeElement.innerHTML;
            expect(currentReason).toBe(expectedReason);
        }));

        it('When illegal click is tried, toast message should be shown and restart not needed', fakeAsync(async() => {
            // Given a TutorialStep on which illegal move has been tried
            const tutorial: TutorialStep[] = [
                TutorialStep.fromMove(
                    'title 0',
                    'instruction 0.',
                    new QuartoState([
                        [QuartoPiece.AAAA, QuartoPiece.EMPTY, QuartoPiece.EMPTY, QuartoPiece.EMPTY],
                        [QuartoPiece.EMPTY, QuartoPiece.EMPTY, QuartoPiece.EMPTY, QuartoPiece.EMPTY],
                        [QuartoPiece.EMPTY, QuartoPiece.EMPTY, QuartoPiece.EMPTY, QuartoPiece.EMPTY],
                        [QuartoPiece.EMPTY, QuartoPiece.EMPTY, QuartoPiece.EMPTY, QuartoPiece.EMPTY],
                    ], 0, QuartoPiece.ABBA),
                    [new QuartoMove(3, 3, QuartoPiece.BBBB)],
                    TutorialStepMessage.CONGRATULATIONS(),
                    'Perdu.',
                ),
            ];
            await wrapper.startTutorial(tutorial);
            await testUtils.expectClickFailure('#click-coord-0-0', RulesFailure.MUST_CLICK_ON_EMPTY_SPACE());

            // expect to see cancelMove reason as message
            const expectedMessage: string = 'instruction 0.';
            const currentMessage: string =
                testUtils.findElement('#currentMessage').nativeElement.innerHTML;
            expect(currentMessage).toBe(expectedMessage);
            const currentReason: string =
                testUtils.findElement('#currentReason').nativeElement.innerHTML;
            expect(currentReason).toBe(RulesFailure.MUST_CLICK_ON_EMPTY_SPACE());
            // expect click to be still possible
            const chooseCoordLegality: MGPValidation = await testUtils.getComponent().canUserPlay('#click-coord-0-0');
            expect(chooseCoordLegality.isSuccess()).toBeTrue();
        }));

        it('should not show error if cancelMove is called with no specified reason', fakeAsync(async() => {
            // Given a tutorial awaiting a move
            const tutorial: TutorialStep[] = [
                TutorialStep.anyMove(
                    'title',
                    'instruction',
                    QuartoRules.get().getInitialState(defaultConfig),
                    new QuartoMove(0, 0, QuartoPiece.BABA),
                    TutorialStepMessage.CONGRATULATIONS(),
                ),
            ];
            await wrapper.startTutorial(tutorial);

            // When cancelMove is called with no specified reason
            await wrapper.gameComponent.cancelMove();

            // Then no error is shown
            testUtils.expectElementNotToExist('#currentReason');
        }));

        it('should propose to see the solution when move attempt done', fakeAsync(async() => {
            // Given a tutorial awaiting a specific move
            const awaitedMove: QuartoMove = new QuartoMove(3, 3, QuartoPiece.BBAA);
            const stepInitialTurn: number = 0;
            const tutorial: TutorialStep[] = [
                TutorialStep.fromMove(
                    'title 0',
                    'instruction 0.',
                    new QuartoState([
                        [QuartoPiece.AAAA, QuartoPiece.EMPTY, QuartoPiece.EMPTY, QuartoPiece.EMPTY],
                        [QuartoPiece.EMPTY, QuartoPiece.EMPTY, QuartoPiece.EMPTY, QuartoPiece.EMPTY],
                        [QuartoPiece.EMPTY, QuartoPiece.EMPTY, QuartoPiece.EMPTY, QuartoPiece.EMPTY],
                        [QuartoPiece.EMPTY, QuartoPiece.EMPTY, QuartoPiece.EMPTY, QuartoPiece.EMPTY],
                    ], stepInitialTurn, QuartoPiece.ABBA),
                    [awaitedMove],
                    TutorialStepMessage.CONGRATULATIONS(),
                    'Perdu.',
                ),
            ];
            await wrapper.startTutorial(tutorial);
            testUtils.expectElementNotToExist('#showSolutionButton');

            // When doing a move that is not awaited
            await testUtils.expectClickSuccess('#click-coord-1-1');
            const move: QuartoMove = new QuartoMove(1, 1, QuartoPiece.BAAA);
            await testUtils.expectMoveSuccess('#click-piece-8', move);

            // Then it should have failed
            expect(wrapper.moveAttemptMade).toBeTrue();
            expect(wrapper.stepFinished[wrapper.stepIndex]).toBeFalse();
            // And we shoud now have the option to see solution
            testUtils.expectElementToExist('#showSolutionButton');
        }));

        it('should show solution when asking for it after failure', fakeAsync(async() => {
            // Given a tutorial on which a non-awaited move has been done
            const awaitedMove: QuartoMove = new QuartoMove(3, 3, QuartoPiece.BBAA);
            const stepInitialTurn: number = 0;
            const tutorial: TutorialStep[] = [
                TutorialStep.fromMove(
                    'title 0',
                    'instruction 0.',
                    new QuartoState([
                        [QuartoPiece.AAAA, QuartoPiece.EMPTY, QuartoPiece.EMPTY, QuartoPiece.EMPTY],
                        [QuartoPiece.EMPTY, QuartoPiece.EMPTY, QuartoPiece.EMPTY, QuartoPiece.EMPTY],
                        [QuartoPiece.EMPTY, QuartoPiece.EMPTY, QuartoPiece.EMPTY, QuartoPiece.EMPTY],
                        [QuartoPiece.EMPTY, QuartoPiece.EMPTY, QuartoPiece.EMPTY, QuartoPiece.EMPTY],
                    ], stepInitialTurn, QuartoPiece.ABBA),
                    [awaitedMove],
                    TutorialStepMessage.CONGRATULATIONS(),
                    'Perdu.',
                ),
            ];
            await wrapper.startTutorial(tutorial);
            await testUtils.expectClickSuccess('#click-coord-1-1');
            const move: QuartoMove = new QuartoMove(1, 1, QuartoPiece.BAAA);
            await testUtils.expectMoveSuccess('#click-piece-8', move);

            // When clicking "Show Solution"
            spyOn(testUtils.getGameComponent(), 'updateBoard').and.callThrough();
            await testUtils.clickElement('#showSolutionButton', 0);

            // Then the first awaited move should have been done
            expect(testUtils.getGameComponent().node.previousMove.get()).toEqual(awaitedMove);
            expect(testUtils.getGameComponent().getTurn()).toEqual(stepInitialTurn + 1);
            // and 'solution' message to be shown
            const currentMessage: string = testUtils.findElement('#currentMessage').nativeElement.innerHTML;
            expect(currentMessage).toBe(TutorialStepMessage.CONGRATULATIONS());
            // and step not to be considered a success
            expect(wrapper.stepFinished[wrapper.stepIndex]).toBeFalse();
            // And the move done should have triggered the animation
            expect(testUtils.getGameComponent().updateBoard).toHaveBeenCalledWith(true);
        }));

        it('should hide last move after click', fakeAsync(async() => {
            // Given a TutorialStep for specific move
            const tutorial: TutorialStep[] = [
                TutorialStep.fromMove(
                    'title',
                    'Put your piece in a corner and give the opposite one.',
                    QuartoRules.get().getInitialState(defaultConfig),
                    [
                        new QuartoMove(0, 0, QuartoPiece.BBBB),
                        new QuartoMove(0, 3, QuartoPiece.BBBB),
                        new QuartoMove(3, 3, QuartoPiece.BBBB),
                        new QuartoMove(3, 0, QuartoPiece.BBBB),
                    ],
                    TutorialStepMessage.CONGRATULATIONS(),
                    'Perdu.',
                ),
            ];
            await wrapper.startTutorial(tutorial);
            const gameComponent: AbstractGameComponent = testUtils.getGameComponent();
            spyOn(gameComponent, 'hideLastMove').and.callThrough();

            // When doing that move
            await testUtils.expectClickSuccess('#click-coord-0-0');

            // Then hideLastMove should have been called
            expect(gameComponent.hideLastMove).toHaveBeenCalledOnceWith();
        }));

    });

    describe('TutorialStep expecting any move', () => {

        it('should consider any move legal when step is anyMove', fakeAsync(async() => {
            // Given tutorial step of type "anyMove"
            const tutorial: TutorialStep[] = [
                TutorialStep.anyMove(
                    'title',
                    'instruction',
                    QuartoRules.get().getInitialState(defaultConfig),
                    new QuartoMove(0, 0, QuartoPiece.BABA),
                    TutorialStepMessage.CONGRATULATIONS(),
                ),
            ];
            await wrapper.startTutorial(tutorial);

            // When doing any move
            await testUtils.expectClickSuccess('#click-coord-0-0');
            const move: QuartoMove = new QuartoMove(0, 0, QuartoPiece.BBBB);
            await testUtils.expectMoveSuccess('#click-piece-15', move);

            // expect to see steps success message on component
            const expectedMessage: string = TutorialStepMessage.CONGRATULATIONS();
            const currentMessage: string =
                testUtils.findElement('#currentMessage').nativeElement.innerHTML;
            expect(currentMessage).toBe(expectedMessage);
        }));

        it('should hide last move after click', fakeAsync(async() => {
            // Given tutorial step of type "anyMove"
            const tutorial: TutorialStep[] = [
                TutorialStep.anyMove(
                    'title',
                    'instruction',
                    QuartoRules.get().getInitialState(defaultConfig),
                    new QuartoMove(0, 0, QuartoPiece.BABA),
                    TutorialStepMessage.CONGRATULATIONS(),
                ),
            ];
            await wrapper.startTutorial(tutorial);
            const gameComponent: AbstractGameComponent = testUtils.getGameComponent();
            spyOn(gameComponent, 'hideLastMove').and.callThrough();

            // When doing that move
            await testUtils.expectClickSuccess('#click-coord-0-0');

            // Then hideLastMove should have been called
            expect(gameComponent.hideLastMove).toHaveBeenCalledOnceWith();
        }));

    });

    describe('TutorialStep expecting a click', () => {

        it('should show success message after step success (one of several clicks)', fakeAsync(async() => {
            // Given a TutorialStep with several clicks
            const tutorial: TutorialStep[] = [
                TutorialStep.forClick(
                    'title',
                    'Click on (0, 0) or (3, 3)',
                    QuartoRules.get().getInitialState(defaultConfig),
                    ['#click-coord-0-0', '#click-coord-3-3'],
                    TutorialStepMessage.CONGRATULATIONS(),
                    'Perdu.',
                ),
            ];
            await wrapper.startTutorial(tutorial);

            // When doing one of those clicks
            await testUtils.expectClickSuccess('#click-coord-0-0');

            // expect to see steps success message on component
            const expectedMessage: string = TutorialStepMessage.CONGRATULATIONS();
            const currentMessage: string =
                testUtils.findElement('#currentMessage').nativeElement.innerHTML;
            expect(currentMessage).toBe(expectedMessage);
        }));

        it('should hide last move after click', fakeAsync(async() => {
            // Given a TutorialStep with several clicks
            const tutorial: TutorialStep[] = [
                TutorialStep.forClick(
                    'title',
                    'Click on (0, 0) or (3, 3)',
                    QuartoRules.get().getInitialState(defaultConfig),
                    ['#click-coord-0-0', '#click-coord-3-3'],
                    TutorialStepMessage.CONGRATULATIONS(),
                    'Perdu.',
                ),
            ];
            await wrapper.startTutorial(tutorial);
            const gameComponent: AbstractGameComponent = testUtils.getGameComponent();
            spyOn(gameComponent, 'hideLastMove').and.callThrough();

            // When click for the first time
            await testUtils.expectClickSuccess('#click-coord-0-0');

            // Then hideLastMove should have been called
            expect(gameComponent.hideLastMove).toHaveBeenCalledOnceWith();
        }));

        it('should show failure message after step failure (one of several clicks)', fakeAsync(async() => {
            // Given a TutorialStep with several clicks
            const tutorial: TutorialStep[] = [
                TutorialStep.forClick(
                    'title',
                    'Click on (0, 0) or (3, 3)',
                    QuartoRules.get().getInitialState(defaultConfig),
                    ['#click-coord-0-0', '#click-coord-3-3'],
                    TutorialStepMessage.CONGRATULATIONS(),
                    'Perdu.',
                ),
            ];
            await wrapper.startTutorial(tutorial);

            // When doing another move
            await testUtils.expectClickSuccess('#click-coord-1-1');

            // expect to see steps success message on component
            const expectedMessage: string = 'Perdu.';
            const currentMessage: string =
                testUtils.findElement('#currentMessage').nativeElement.innerHTML;
            expect(currentMessage).toBe(expectedMessage);
        }));

        it('should show restart button (with possibility of seeing solution) when unwanted click with no move is done', fakeAsync(async() => {
            // Given a TutorialStep with possible invalid clicks
            const tutorial: TutorialStep[] = [
                TutorialStep.forClick(
                    'title 0',
                    'instruction 0.',
                    new QuartoState([
                        [QuartoPiece.AAAA, QuartoPiece.EMPTY, QuartoPiece.EMPTY, QuartoPiece.EMPTY],
                        [QuartoPiece.EMPTY, QuartoPiece.EMPTY, QuartoPiece.EMPTY, QuartoPiece.EMPTY],
                        [QuartoPiece.EMPTY, QuartoPiece.EMPTY, QuartoPiece.EMPTY, QuartoPiece.EMPTY],
                        [QuartoPiece.EMPTY, QuartoPiece.EMPTY, QuartoPiece.EMPTY, QuartoPiece.EMPTY],
                    ], 0, QuartoPiece.ABBA),
                    ['#click-coord-3-3'],
                    TutorialStepMessage.CONGRATULATIONS(),
                    'Perdu.',
                ),
            ];
            await wrapper.startTutorial(tutorial);

            // When doing invalid click
            await testUtils.expectClickFailure('#click-coord-0-0', RulesFailure.MUST_CLICK_ON_EMPTY_SPACE());

            // Then the failure reason should be shown
            const expectedMessage: string = 'Perdu.';
            const currentMessage: string =
                testUtils.findElement('#currentMessage').nativeElement.innerHTML;
            expect(currentMessage).toBe(expectedMessage);
            const currentReason: string =
                testUtils.findElement('#currentReason').nativeElement.innerHTML;
            expect(currentReason).toBe(RulesFailure.MUST_CLICK_ON_EMPTY_SPACE());
            // And then solution button should be shown too
            testUtils.expectElementToExist('#showSolutionButton');
        }));

        it('should show solution when asking for it', fakeAsync(async() => {
            // Given a TutorialStep for clicks, for which the user clicked wrongly
            const tutorial: TutorialStep[] = [
                TutorialStep.forClick(
                    'title',
                    'Click on (0, 0)',
                    QuartoRules.get().getInitialState(defaultConfig),
                    ['#click-coord-0-0'],
                    'Bravo !',
                    'Perdu.',
                ),
            ];
            await wrapper.startTutorial(tutorial);
            // This click is legal, however it is not the one expected by the tutorial!
            await testUtils.expectClickSuccess('#click-coord-1-1');

            // When clicking on 'see solution'
            await testUtils.clickElement('#showSolutionButton');
            tick(0);

            // Then the actual click is performed and the solution message is shown
            testUtils.expectElementToExist('#dropped-piece-highlight');
            const expectedMessage: string = 'Bravo !';
            const currentMessage: string =
                testUtils.findElement('#currentMessage').nativeElement.innerHTML;
            expect(currentMessage).toBe(expectedMessage);
        }));

        it('should not throw for click leading to move', fakeAsync(async() => {
            // Given a TutorialStep with several clicks
            const tutorial: TutorialStep[] = [
                TutorialStep.forClick(
                    'title',
                    'do that only choice you have, in one click',
                    new QuartoState([
                        [QuartoPiece.AABB, QuartoPiece.AAAB, QuartoPiece.ABBA, QuartoPiece.BBAA],
                        [QuartoPiece.BBAB, QuartoPiece.BAAA, QuartoPiece.BBBA, QuartoPiece.ABBB],
                        [QuartoPiece.BABA, QuartoPiece.BBBB, QuartoPiece.ABAA, QuartoPiece.AABA],
                        [QuartoPiece.AAAA, QuartoPiece.ABAB, QuartoPiece.BABB, QuartoPiece.EMPTY],
                    ], 15, QuartoPiece.BAAB),
                    ['#click-coord-3-3'],
                    TutorialStepMessage.CONGRATULATIONS(),
                    'Perdu.',
                ),
            ];
            await wrapper.startTutorial(tutorial);

            // When doing that move
            const move: QuartoMove = new QuartoMove(3, 3, QuartoPiece.EMPTY);
            await testUtils.expectMoveSuccess('#click-coord-3-3', move);

            // expect to see steps success message on component
            const expectedMessage: string = TutorialStepMessage.CONGRATULATIONS();
            const currentMessage: string =
                testUtils.findElement('#currentMessage').nativeElement.innerHTML;
            expect(currentMessage).toBe(expectedMessage);
        }));
    });

    describe('Informational TutorialStep', () => {

        it('should forbid clicking on the board', fakeAsync(async() => {
            // Given a TutorialStep on which nothing is awaited
            const tutorial: TutorialStep[] = [
                TutorialStep.informational(
                    'title 0',
                    'instruction 0',
                    QuartoRules.get().getInitialState(defaultConfig),
                ),
            ];
            await wrapper.startTutorial(tutorial);

            // When clicking
            await testUtils.expectClickForbidden('#click-coord-2-2', TutorialFailure.INFORMATIONAL_STEP());

            // expect to see still the steps success message on component
            const expectedMessage: string = 'instruction 0';
            const currentMessage: string = testUtils.findElement('#currentMessage').nativeElement.innerHTML;
            expect(currentMessage).toBe(expectedMessage);
        }));

        it('should mark step as finished when skipped', fakeAsync(async() => {
            // Given a TutorialStep with no action to do
            const tutorial: TutorialStep[] = [
                TutorialStep.informational(
                    'title',
                    'Explanation Explanation Explanation.',
                    QuartoRules.get().getInitialState(defaultConfig),
                ),
                TutorialStep.informational(
                    'title',
                    'Suite suite.',
                    QuartoRules.get().getInitialState(defaultConfig),
                ),
            ];
            await wrapper.startTutorial(tutorial);
            // When clicking "Next Button"
            const nextButtonMessage: string =
                testUtils.findElement('#nextButton').nativeElement.textContent;
            expect(nextButtonMessage).toBe('Ok');
            await testUtils.clickElement('#nextButton');

            // expect to see next step on component
            const expectedMessage: string = 'Suite suite.';
            const currentMessage: string =
                testUtils.findElement('#currentMessage').nativeElement.innerHTML;
            expect(currentMessage).toBe(expectedMessage);
            expect(wrapper.stepFinished[0]).toBeTrue();
        }));

    });

    describe('TutorialStep expecting a predicate', () => {

        it('should display MGPValidation.reason when predicate return a failure', fakeAsync(async() => {
            // Given a TutorialStep that always fail
            const tutorial: TutorialStep[] = [
                TutorialStep.fromPredicate(
                    'title',
                    'You shall not pass',
                    QuartoRules.get().getInitialState(defaultConfig),
                    new QuartoMove(1, 1, QuartoPiece.BAAB),
                    (_move: QuartoMove, _resultingState: QuartoState) => {
                        return MGPValidation.failure('chocolatine');
                    },
                    TutorialStepMessage.CONGRATULATIONS(),
                ),
            ];
            await wrapper.startTutorial(tutorial);

            // When doing a move
            await testUtils.expectClickSuccess('#click-coord-0-0');
            const move: QuartoMove = new QuartoMove(0, 0, QuartoPiece.BBBB);
            await testUtils.expectMoveSuccess('#click-piece-15', move);

            // expect to see steps success message on component
            const expectedReason: string = 'chocolatine';
            const currentReason: string =
                testUtils.findElement('#currentReason').nativeElement.innerHTML;
            expect(currentReason).toBe(expectedReason);
        }));

        it('should display successMessage when predicate return MGPValidation.SUCCESS', fakeAsync(async() => {
            // Given a TutorialStep of predicate
            const tutorial: TutorialStep[] = [
                TutorialStep.fromPredicate(
                    'title',
                    'No matter what you do, it will be success!',
                    QuartoRules.get().getInitialState(defaultConfig),
                    new QuartoMove(1, 1, QuartoPiece.BAAB),
                    (_move: QuartoMove, _resultingState: QuartoState) => {
                        return MGPValidation.SUCCESS;
                    },
                    TutorialStepMessage.CONGRATULATIONS(),
                ),
            ];
            await wrapper.startTutorial(tutorial);

            // When doing a move
            await testUtils.expectClickSuccess('#click-coord-0-0');
            const move: QuartoMove = new QuartoMove(0, 0, QuartoPiece.BBBB);
            await testUtils.expectMoveSuccess('#click-piece-15', move);

            // expect to see steps success message on component
            const expectedMessage: string = TutorialStepMessage.CONGRATULATIONS();
            const currentMessage: string =
                testUtils.findElement('#currentMessage').nativeElement.innerHTML;
            expect(currentMessage).toBe(expectedMessage);
        }));

        it('should hide last move after click', fakeAsync(async() => {
            // Given a TutorialStep of predicate
            const tutorial: TutorialStep[] = [
                TutorialStep.fromPredicate(
                    'title',
                    'No matter what you do, it will be success!',
                    QuartoRules.get().getInitialState(defaultConfig),
                    new QuartoMove(1, 1, QuartoPiece.BAAB),
                    (_move: QuartoMove, _resultingState: QuartoState) => {
                        return MGPValidation.SUCCESS;
                    },
                    TutorialStepMessage.CONGRATULATIONS(),
                ),
            ];
            await wrapper.startTutorial(tutorial);
            const gameComponent: AbstractGameComponent = testUtils.getGameComponent();
            spyOn(gameComponent, 'hideLastMove').and.callThrough();

            // When clicking for the first time
            await testUtils.expectClickSuccess('#click-coord-0-0');

            // Then hideLastMove should have been called
            expect(gameComponent.hideLastMove).toHaveBeenCalledOnceWith();
        }));

    });

    describe('showSolution', () => {

        it('should work with Tutorial step other than "list of moves"', fakeAsync(async() => {
            // Given a TutorialStep on which we failed to success
            const solutionMove: QuartoMove = new QuartoMove(1, 1, QuartoPiece.BAAB);
            const tutorial: TutorialStep[] = [
                TutorialStep.fromPredicate(
                    'title',
                    'You will have to ask me for solution anyway',
                    QuartoRules.get().getInitialState(defaultConfig),
                    solutionMove,
                    (_move: QuartoMove, _resultingState: QuartoState) => {
                        return MGPValidation.failure('what did I say ?');
                    },
                    TutorialStepMessage.CONGRATULATIONS(),
                ),
            ];
            await wrapper.startTutorial(tutorial);
            await testUtils.expectClickSuccess('#click-coord-0-0');
            const proposedMove: QuartoMove = new QuartoMove(0, 0, QuartoPiece.BBBB);
            await testUtils.expectMoveSuccess('#click-piece-15', proposedMove);

            // When clicking "Show Solution"
            await testUtils.clickElement('#showSolutionButton');
            tick(0);

            // Expect the step proposed move to have been done
            expect(testUtils.getGameComponent().node.previousMove.get()).toEqual(solutionMove);
            expect(testUtils.getGameComponent().getTurn()).toEqual(1);
            // expect 'solution' message to be shown
            const currentMessage: string = testUtils.findElement('#currentMessage').nativeElement.innerHTML;
            expect(currentMessage).toBe(TutorialStepMessage.CONGRATULATIONS());
            // expect step not to be considered a success
            expect(wrapper.stepFinished[wrapper.stepIndex]).toBeFalse();
        }));

    });

    describe('getConfig', () => {

        it('should provide initial default config to game component', fakeAsync(async() => {
            // Given any tutorial for a game that has a specific default config
            const defaultRulesConfig: MGPOptional<RulesConfig> =
                MGPOptional.of({ mais_quelles_belles_chaussettes: 42 });
            spyOn(RulesConfigUtils, 'getGameDefaultConfig').and.returnValue(defaultRulesConfig);

            // When calling getConfig
            const actualDefaultRulesConfig: MGPOptional<RulesConfig> = await testUtils.getComponent().getConfig();

            // Then the return should be the default game config
            expect(actualDefaultRulesConfig).toBe(defaultRulesConfig);
        }));

    });

});
