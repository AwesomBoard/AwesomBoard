import {
    AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef,
    Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GameWrapper } from 'src/app/components/wrapper-components/GameWrapper';
import { AbstractNode, MGPNode } from 'src/app/jscaip/MGPNode';
import { Move } from 'src/app/jscaip/Move';
import { ConnectedUserService } from 'src/app/services/ConnectedUserService';
import { display, Utils } from 'src/app/utils/utils';
import { assert } from 'src/app/utils/assert';
import { Click, TutorialStep, TutorialStepClick, TutorialStepMove, TutorialStepWithSolution } from './TutorialStep';
import { MGPValidation } from 'src/app/utils/MGPValidation';
import { TutorialFailure } from './TutorialFailure';
import { GameState } from 'src/app/jscaip/GameState';
import { MGPOptional } from 'src/app/utils/MGPOptional';
import { MessageDisplayer } from 'src/app/services/MessageDisplayer';
import { Player } from 'src/app/jscaip/Player';

type TutorialPlayer = 'tutorial-player';
@Component({
    selector: 'app-tutorial-game-wrapper',
    templateUrl: './tutorial-game-wrapper.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TutorialGameWrapperComponent extends GameWrapper<TutorialPlayer> implements AfterViewInit {

    public static override VERBOSE: boolean = false;

    public COMPLETED_TUTORIAL_MESSAGE: string = $localize`Congratulations, you completed the tutorial.`;

    public steps: TutorialStep[] = [];
    public successfulSteps: number = 0;
    public stepIndex: number = -1;
    public currentMessage: string = ''; // Initially empty, will always be set once tutorial has started
    public currentReason: MGPOptional<string> = MGPOptional.empty();
    public moveAttemptMade: boolean = false;
    public stepFinished: boolean[] = [];
    public tutorialOver: boolean = false;

    constructor(actRoute: ActivatedRoute,
                router: Router,
                messageDisplayer: MessageDisplayer,
                public cdr: ChangeDetectorRef,
                connectedUserService: ConnectedUserService)
    {
        super(actRoute, connectedUserService, router, messageDisplayer);
        display(TutorialGameWrapperComponent.VERBOSE, 'TutorialGameWrapperComponent.constructor');
        this.role = Player.ZERO; // The user is playing, not observing
    }
    public getNumberOfSteps(): number {
        return this.steps.length;
    }
    public getCurrentStepTitle(): string {
        if (this.steps.length > 0) {
            return this.steps[this.stepIndex].title;
        } else {
            return '';
        }
    }
    public async ngAfterViewInit(): Promise<void> {
        display(TutorialGameWrapperComponent.VERBOSE, 'TutorialGameWrapperComponent.ngAfterViewInit');
        const createdSuccessfully: boolean = await this.afterViewInit();
        if (createdSuccessfully) {
            await this.start();
        }
    }
    public async start(): Promise<void> {
        const tutorial: TutorialStep[] = this.gameComponent.tutorial;
        await this.startTutorial(tutorial);
    }
    public async startTutorial(tutorial: TutorialStep[]): Promise<void> {
        display(TutorialGameWrapperComponent.VERBOSE,
                { tutorialGameWrapperComponent_startTutorial: { tutorial } });
        this.steps = tutorial;
        this.tutorialOver = false;
        this.stepFinished = this.getCompletionArray();
        this.successfulSteps = 0;
        await this.showStep(0);
    }
    private getCompletionArray(): boolean[] {
        return this.steps.map(() => {
            return false;
        });
    }
    public async changeStep(event: Event): Promise<void> {
        const target: HTMLSelectElement = event.target as HTMLSelectElement;
        await this.showStep(Number.parseInt(target.value, 10));
    }
    private async showStep(stepIndex: number): Promise<void> {
        display(TutorialGameWrapperComponent.VERBOSE, 'tutorialGameWrapperComponent.showStep(' + stepIndex + ')');
        this.moveAttemptMade = false;
        this.stepFinished[stepIndex] = false;
        this.updateSuccessCount();
        this.stepIndex = stepIndex;
        const currentStep: TutorialStep = this.steps[this.stepIndex];
        this.currentMessage = currentStep.instruction;
        this.currentReason = MGPOptional.empty();
        this.gameComponent.node = new MGPNode(currentStep.state,
                                              MGPOptional.empty(),
                                              currentStep.previousMove);
        // Set role will update view with updateBoardAndShowLastMove
        await this.setRole(this.gameComponent.getCurrentPlayer());
        this.cdr.detectChanges();
    }
    public async onLegalUserMove(move: Move): Promise<void> {
        display(TutorialGameWrapperComponent.VERBOSE, { tutorialGameWrapper_onLegalUserMove: { move } });
        const currentStep: TutorialStep = this.steps[this.stepIndex];
        const node: MGPOptional<AbstractNode> = this.gameComponent.rules.choose(this.gameComponent.node, move);
        assert(node.isPresent(), 'It should be impossible to call onLegalUserMove with an illegal move');
        this.gameComponent.node = node.get();
        display(TutorialGameWrapperComponent.VERBOSE, 'tutorialGameWrapper.onLegalUserMove: legal move');
        await this.updateBoardAndShowLastMove(false);
        this.moveAttemptMade = true;
        if (currentStep.isPredicate()) {
            const previousState: GameState = this.gameComponent.getPreviousState();
            const resultingState: GameState = this.gameComponent.getState();
            const moveValidity: MGPValidation =
                Utils.getNonNullable(currentStep.predicate)(move, previousState, resultingState);
            if (moveValidity.isSuccess()) {
                this.showStepSuccess(currentStep.getSuccessMessage());
            } else {
                this.currentReason = MGPOptional.of(moveValidity.getReason());
            }
        } else if (currentStep.isAnyMove()) {
            display(TutorialGameWrapperComponent.VERBOSE, 'tutorialGameWrapper.onLegalUserMove: awaited move!');
            this.showStepSuccess(currentStep.getSuccessMessage());
        } else {
            assert(currentStep.isMove(), 'cannot reach here with a click step');
            const currentStepMove: TutorialStepMove = currentStep as TutorialStepMove;
            if (currentStepMove.acceptedMoves.some((m: Move) => m.equals(move))) {
                display(TutorialGameWrapperComponent.VERBOSE, 'tutorialGameWrapper.onLegalUserMove: awaited move!');
                this.showStepSuccess(currentStepMove.getSuccessMessage());
            } else {
                display(TutorialGameWrapperComponent.VERBOSE,
                        'tutorialGameWrapper.onLegalUserMove: not the move that was awaited.');
                this.currentReason = MGPOptional.of(currentStepMove.getFailureMessage());
            }
        }
        // We don't cover the click case here, it is covered in onUserClick
        this.cdr.detectChanges();
    }
    public async retry(): Promise<void> {
        display(TutorialGameWrapperComponent.VERBOSE, 'tutorialGameWrapper.retry');
        this.moveAttemptMade = false;
        await this.showStep(this.stepIndex);
    }
    public override async canUserPlay(elementName: string): Promise<MGPValidation> {
        display(TutorialGameWrapperComponent.VERBOSE, 'tutorialGameWrapper.canUserPlay(' + elementName + ')');
        this.currentReason = MGPOptional.empty();
        if (this.stepFinished[this.stepIndex] || this.moveAttemptMade) {
            return MGPValidation.failure(TutorialFailure.STEP_FINISHED());
        }
        const currentStep: TutorialStep = this.steps[this.stepIndex];
        if (currentStep.isClick()) {
            await this.updateBoardAndShowLastMove(false);
            this.moveAttemptMade = true;
            if (Utils.getNonNullable(currentStep.acceptedClicks).some((m: string) => m === elementName)) {
                this.showStepSuccess(currentStep.getSuccessMessage());
            } else {
                this.currentMessage = currentStep.getFailureMessage();
            }
            return MGPValidation.SUCCESS;
        } else if (currentStep.isMove() || currentStep.isPredicate() || currentStep.isAnyMove()) {
            window.setTimeout(() => {
                this.cdr.detectChanges();
            }, 10);
            return MGPValidation.SUCCESS;
        } else {
            return MGPValidation.failure(TutorialFailure.INFORMATIONAL_STEP());
        }
    }
    public async onCancelMove(reason?: string): Promise<void> {
        display(TutorialGameWrapperComponent.VERBOSE,
                'tutorialGameWrapperComponent.onCancelMove(' + reason + ')');
        if (reason !== undefined) {
            this.currentReason = MGPOptional.of(reason);
        }
        this.cdr.detectChanges();
    }
    private showStepSuccess(successMessage: string): void {
        display(TutorialGameWrapperComponent.VERBOSE, 'tutorialGameWrapperComponent.showStepSuccess()');
        this.currentMessage = successMessage;
        this.stepFinished[this.stepIndex] = true;
        this.updateSuccessCount();
    }
    private updateSuccessCount(): void {
        let count: number = 0;
        for (const stepSuccess of this.stepFinished) {
            if (stepSuccess) {
                count++;
            }
        }
        this.successfulSteps = count;
    }
    public async next(): Promise<void> {
        if (this.steps[this.stepIndex].isInformation()) {
            this.stepFinished[this.stepIndex] = true;
            this.updateSuccessCount();
        }
        if (this.stepFinished.length === this.successfulSteps) {
            this.currentMessage = this.COMPLETED_TUTORIAL_MESSAGE;
            this.tutorialOver = true;
        } else {
            let indexUndone: number = (this.stepIndex + 1) % this.steps.length;
            while (this.stepFinished[indexUndone] === true) {
                indexUndone = (indexUndone + 1) % this.steps.length;
            }
            await this.showStep(indexUndone);
        }
    }
    public async showSolution(): Promise<void> {
        display(TutorialGameWrapperComponent.VERBOSE, 'tutorialGameWrapper.showSolution()');
        const step: TutorialStep = this.steps[this.stepIndex];
        assert(step.hasSolution(), 'step must have solution');
        const solutionStep: TutorialStepWithSolution | TutorialStepClick =
            step as TutorialStepWithSolution | TutorialStepClick;
        const solution: Move | Click = solutionStep.getSolution();
        if (solution instanceof Move) {
            await this.showStep(this.stepIndex);
            this.gameComponent.node = this.gameComponent.rules.choose(this.gameComponent.node, solution).get();
            await this.updateBoardAndShowLastMove(false);
        } else {
            await this.showStep(this.stepIndex);
            const element: HTMLElement = window.document.querySelector(solution) as HTMLElement;
            element.dispatchEvent(new Event('click'));
        }
        this.currentMessage = solutionStep.getSuccessMessage();
        this.moveAttemptMade = true;
        this.cdr.detectChanges();
    }
    public async playLocally(): Promise<void> {
        const game: string = Utils.getNonNullable(this.actRoute.snapshot.paramMap.get('compo'));
        await this.router.navigate(['/local', game]);
    }
    public async createGame(): Promise<void> {
        const game: string = Utils.getNonNullable(this.actRoute.snapshot.paramMap.get('compo'));
        await this.router.navigate(['/play', game]);
    }
    public getPlayer(): TutorialPlayer {
        return 'tutorial-player';
    }
}
