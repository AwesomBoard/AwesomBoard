import { AfterViewInit, ChangeDetectorRef, Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GameWrapper } from 'src/app/components/wrapper-components/GameWrapper';
import { AbstractNode, GameNode } from 'src/app/jscaip/AI/GameNode';
import { Move } from 'src/app/jscaip/Move';
import { ConnectedUserService } from 'src/app/services/ConnectedUserService';
import { MGPFallible, MGPOptional, MGPValidation, Utils } from '@everyboard/lib';
import { Click, TutorialStep, TutorialStepClick, TutorialStepMove, TutorialStepWithSolution } from './TutorialStep';
import { TutorialFailure } from './TutorialFailure';
import { GameState } from 'src/app/jscaip/state/GameState';
import { MessageDisplayer } from 'src/app/services/MessageDisplayer';
import { RulesConfig } from 'src/app/jscaip/RulesConfigUtil';
import { Localized } from 'src/app/utils/LocaleUtils';
import { Debug } from 'src/app/utils/Debug';

export class TutorialGameWrapperMessages {

    public static readonly COMPLETED_TUTORIAL_MESSAGE: Localized = () => $localize`Congratulations, you completed the tutorial.`;

    public static readonly THIS_IS_A_DEMO: Localized = () => $localize`You cannot click, this is a demo.`;
}

type TutorialPlayer = 'tutorial-player';

@Component({
    selector: 'app-tutorial-game-wrapper',
    templateUrl: './tutorial-game-wrapper.component.html',
})
@Debug.log
export class TutorialGameWrapperComponent extends GameWrapper<TutorialPlayer> implements AfterViewInit {

    public steps: TutorialStep[] = [];
    public successfulSteps: number = 0;
    public stepIndex: number = -1;
    public currentMessage: string = ''; // Initially empty, will always be set once tutorial has started
    public currentReason: MGPOptional<string> = MGPOptional.empty();
    public moveAttemptMade: boolean = false;
    public stepFinished: boolean[] = [];
    public tutorialOver: boolean = false;

    public constructor(activatedRoute: ActivatedRoute,
                       router: Router,
                       messageDisplayer: MessageDisplayer,
                       public cdr: ChangeDetectorRef,
                       connectedUserService: ConnectedUserService)
    {
        super(activatedRoute, connectedUserService, router, messageDisplayer);
    }

    public override async canUserPlay(elementName: string): Promise<MGPValidation> {
        this.currentReason = MGPOptional.empty();
        if (this.stepFinished[this.stepIndex] || this.moveAttemptMade) {
            return MGPValidation.failure(TutorialFailure.STEP_FINISHED());
        }
        const currentStep: TutorialStep = this.steps[this.stepIndex];
        if (currentStep.isClick()) {
            this.gameComponent.hideLastMove();
            this.moveAttemptMade = true;
            if (Utils.getNonNullable(currentStep.acceptedClicks).some((m: string) => m === elementName)) {
                this.showStepSuccess(currentStep.getSuccessMessage());
            } else {
                this.currentMessage = currentStep.getFailureMessage();
            }
            return MGPValidation.SUCCESS;
        } else if (currentStep.isMove() || currentStep.isPredicate() || currentStep.isAnyMove()) {
            this.gameComponent.hideLastMove();
            return MGPValidation.SUCCESS;
        } else {
            return MGPValidation.failure(TutorialFailure.INFORMATIONAL_STEP());
        }
    }

    public override async onCancelMove(reason?: string): Promise<void> {
        await super.onCancelMove(reason);
        if (reason !== undefined) {
            this.currentReason = MGPOptional.of(reason);
        }
        this.cdr.detectChanges();
    }

    public override async onLegalUserMove(move: Move): Promise<void> {
        const currentStep: TutorialStep = this.steps[this.stepIndex];
        const config: MGPOptional<RulesConfig> = await this.getConfig();
        const node: MGPFallible<AbstractNode> = this.gameComponent.rules.choose(this.gameComponent.node, move, config);
        Utils.assert(node.isSuccess(), 'It should be impossible to call onLegalUserMove with an illegal move, but got ' + node.getReasonOr(''));
        this.gameComponent.node = node.get();

        await this.showNewMove(false);
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
            Debug.display('TutorialGameWrapperComponent', 'onLegalUserMove', 'awaited move!');
            this.showStepSuccess(currentStep.getSuccessMessage());
        } else if (currentStep.isMove()) {
            const currentStepMove: TutorialStepMove = currentStep;
            if (currentStepMove.acceptedMoves.some((m: Move) => m.equals(move))) {
                Debug.display('TutorialGameWrapperComponent', 'onLegalUserMove', 'awaited move!');
                this.showStepSuccess(currentStepMove.getSuccessMessage());
            } else {
                Debug.display('TutorialGameWrapperComponent', 'onLegalUserMove', 'not the move that was awaited.');
                this.currentReason = MGPOptional.of(currentStepMove.getFailureMessage());
            }
        } else {
            // No need to do anything there, canUserPlay did it
            Utils.assert(currentStep.isClick(), 'Here, we should have a click');
        }
        // We don't cover the click case here, it is covered in canUserPlay
        this.cdr.detectChanges();
    }

    public override getPlayer(): TutorialPlayer {
        return 'tutorial-player';
    }

    public async ngAfterViewInit(): Promise<void> {
        const createdSuccessfully: boolean = await this.createMatchingGameComponent();
        if (createdSuccessfully) {
            await this.start();
        }
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

    public async start(): Promise<void> {
        const tutorial: TutorialStep[] = this.gameComponent.tutorial;
        await this.startTutorial(tutorial);
    }

    public async startTutorial(tutorial: TutorialStep[]): Promise<void> {
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
        this.moveAttemptMade = false;
        this.stepFinished[stepIndex] = false;
        this.updateSuccessCount();
        this.stepIndex = stepIndex;
        const currentStep: TutorialStep = this.steps[this.stepIndex];
        this.currentMessage = currentStep.instruction;
        this.currentReason = MGPOptional.empty();
        this.gameComponent.node = new GameNode(currentStep.state,
                                               currentStep.parent,
                                               currentStep.previousMove);
        // Set role will update view with showCurrentState
        await this.setRole(this.gameComponent.getCurrentPlayer());
        // All steps but informational ones are interactive
        await this.setInteractive(currentStep.isInformation() === false);
        this.cdr.detectChanges();
    }

    public async retry(): Promise<void> {
        this.moveAttemptMade = false;
        await this.showStep(this.stepIndex);
    }

    private showStepSuccess(successMessage: string): void {
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
            this.currentMessage = TutorialGameWrapperMessages.COMPLETED_TUTORIAL_MESSAGE();
            this.tutorialOver = true;
        } else {
            let indexUndone: number = (this.stepIndex + 1) % this.steps.length;
            while (this.stepFinished[indexUndone]) {
                indexUndone = (indexUndone + 1) % this.steps.length;
            }
            await this.showStep(indexUndone);
        }
    }

    public async showSolution(): Promise<void> {
        const step: TutorialStep = this.steps[this.stepIndex];
        Utils.assert(step.hasSolution(), 'step must have solution');
        const solutionStep: TutorialStepWithSolution | TutorialStepClick =
            step as TutorialStepWithSolution | TutorialStepClick;
        const solution: Move | Click = solutionStep.getSolution();
        const config: MGPOptional<RulesConfig> = await this.getConfig();
        if (solution instanceof Move) {
            await this.showStep(this.stepIndex);
            this.gameComponent.node = this.gameComponent.rules.choose(this.gameComponent.node, solution, config).get();
            await this.showCurrentState(true);
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
        const urlName: string = this.getGameUrlName();
        await this.router.navigate(['/local', urlName]);
    }

    public async createGame(): Promise<void> {
        const urlName: string = this.getGameUrlName();
        await this.router.navigate(['/play', urlName]);
    }

}
