import { MGPOptional, MGPValidation, Utils } from '@everyboard/lib';
import { Move } from 'src/app/jscaip/Move';
import { GameNode } from 'src/app/jscaip/AI/GameNode';
import { GameState } from 'src/app/jscaip/state/GameState';

export type Click = string;

export type TutorialPredicate = (move: Move, previousState: GameState, resultingState: GameState) => MGPValidation;

export abstract class TutorialStep {

    public static fromMove(title: string,
                           instruction: string,
                           state: GameState,
                           acceptedMoves: ReadonlyArray<Move>,
                           successMessage: string,
                           failureMessage: string)
    : TutorialStep
    {
        return new TutorialStepMove(title, instruction, state, acceptedMoves, successMessage, failureMessage);
    }

    public static forClick(title: string,
                           instruction: string,
                           state: GameState,
                           acceptedClicks: ReadonlyArray<string>,
                           successMessage: string,
                           failureMessage: string)
    : TutorialStep
    {
        return new TutorialStepClick(title, instruction, state, acceptedClicks, successMessage, failureMessage);
    }

    public static anyMove(title: string,
                          instruction: string,
                          state: GameState,
                          solutionMove: Move,
                          successMessage: string)
    : TutorialStep
    {
        return new TutorialStepAnyMove(title, instruction, state, solutionMove, successMessage);
    }

    public static fromPredicate(title: string,
                                instruction: string,
                                state: GameState,
                                solutionMove: Move,
                                predicate: TutorialPredicate,
                                successMessage: string)
    : TutorialStep
    {
        return new TutorialStepPredicate(title, instruction, state, solutionMove, predicate, successMessage);
    }

    public static informational(title: string,
                                instruction: string,
                                state: GameState)
    : TutorialStep
    {
        return new TutorialStepInformational(title, instruction, state);
    }

    public previousMove: MGPOptional<Move> = MGPOptional.empty();
    public parent: MGPOptional<GameNode<Move, GameState>> = MGPOptional.empty();

    protected constructor(public title: string,
                          public instruction: string,
                          public state: GameState) {
    }

    public isMove(): this is TutorialStepMove {
        return false;
    }

    public isAnyMove(): this is TutorialStepAnyMove {
        return false;
    }

    public isClick(): this is TutorialStepClick {
        return false;
    }

    public isPredicate(): this is TutorialStepPredicate {
        return false;
    }

    public isInformation(): this is TutorialStepInformational {
        return false;
    }

    public hasSolution(): this is TutorialStepWithSolution {
        return false;
    }

    public withPreviousMove(previousMove: Move, previousState?: GameState): this {
        this.previousMove = MGPOptional.of(previousMove);
        if (previousState != null) {
            this.parent = MGPOptional.of(new GameNode(previousState));
        }
        return this;
    }

}

export abstract class TutorialStepWithSolution extends TutorialStep {

    public constructor(title: string,
                       instruction: string,
                       state: GameState,
                       private readonly successMessage: string)
    {
        super(title, instruction, state);
    }

    public override hasSolution(): this is TutorialStepWithSolution {
        return true;
    }

    public abstract getSolution(): Move | Click;

    public getSuccessMessage(): string {
        return this.successMessage;
    }

}

export class TutorialStepMove extends TutorialStepWithSolution {

    public constructor(title: string,
                       instruction: string,
                       state: GameState,
                       public readonly acceptedMoves: ReadonlyArray<Move>,
                       successMessage: string,
                       private readonly failureMessage: string)
    {
        super(title, instruction, state, successMessage);
        Utils.assert(acceptedMoves.length > 0, 'TutorialStepMove: At least one accepted move should be provided, otherwise use TutorialStepInformational');
    }

    public override isMove(): this is TutorialStepMove {
        return true;
    }

    public getSolution(): Move | Click {
        return this.acceptedMoves[0];
    }

    public getFailureMessage(): string {
        return this.failureMessage;
    }

}

export class TutorialStepAnyMove extends TutorialStepWithSolution {

    public constructor(title: string,
                       instruction: string,
                       state: GameState,
                       private readonly solutionMove: Move,
                       successMessage: string) {
        super(title, instruction, state, successMessage);
    }

    public getSolution(): Move | Click {
        return this.solutionMove;
    }

    public override isAnyMove(): this is TutorialStepAnyMove {
        return true;
    }

}

export class TutorialStepClick extends TutorialStepWithSolution {

    public constructor(title: string,
                       instruction: string,
                       state: GameState,
                       public readonly acceptedClicks: ReadonlyArray<string>,
                       successMessage: string,
                       private readonly failureMessage: string)
    {
        super(title, instruction, state, successMessage);
    }

    public override isClick(): this is TutorialStepClick {
        return true;
    }

    public getSolution(): Move | Click {
        return this.acceptedClicks[0];
    }

    public getFailureMessage(): string {
        return this.failureMessage;
    }

}

export class TutorialStepPredicate extends TutorialStepWithSolution {

    public constructor(title: string,
                       instruction: string,
                       state: GameState,
                       private readonly solutionMove: Move,
                       public readonly predicate: TutorialPredicate,
                       successMessage: string)
    {
        super(title, instruction, state, successMessage);
    }

    public getSolution(): Move | Click {
        return this.solutionMove;
    }

    public override isPredicate(): this is TutorialStepPredicate {
        return true;
    }

}

export class TutorialStepInformational extends TutorialStep {

    public override isInformation(): this is TutorialStepInformational {
        return true;
    }

}

export abstract class Tutorial {
    public abstract tutorial: TutorialStep[];
}
