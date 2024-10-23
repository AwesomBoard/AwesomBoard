import { MGPOptional, MGPValidation } from '@everyboard/lib';
import { Tutorial, TutorialStep } from 'src/app/components/wrapper-components/tutorial-game-wrapper/TutorialStep';
import { Coord } from 'src/app/jscaip/Coord';
import { CheckersMove } from '../common/CheckersMove';
import { CheckersPiece, CheckersStack, CheckersState } from '../common/CheckersState';
import { CheckersConfig } from '../common/AbstractCheckersRules';
import { TutorialStepMessage } from 'src/app/components/wrapper-components/tutorial-game-wrapper/TutorialStepMessage';
import { InternationalCheckersRules } from './InternationalCheckersRules';

const U: CheckersStack = new CheckersStack([CheckersPiece.ZERO]);
const O: CheckersStack = new CheckersStack([CheckersPiece.ZERO_PROMOTED]);
const V: CheckersStack = new CheckersStack([CheckersPiece.ONE]);
const _: CheckersStack = CheckersStack.EMPTY;
const defaultConfig: MGPOptional<CheckersConfig> = InternationalCheckersRules.get().getDefaultRulesConfig();

// TODO: check: why some tutorial (Checkers by example) are "hard to click"

export class InternationalCheckersTutorial extends Tutorial {
    public tutorial: TutorialStep[] = [
        TutorialStep.informational(
            TutorialStepMessage.OBJECT_OF_THE_GAME(),
            $localize`The goal of checkers is to render the opponent unable to move, either by capturing all his pieces, either by blocking them.`,
            InternationalCheckersRules.get().getInitialState(defaultConfig),
        ),
        TutorialStep.anyMove(
            $localize`Steps`,
            $localize`A simple step is made by one diagonal move forward, left or right. Click on the chosen piece, then on its landing square.<br/><br/>You are playing Dark, do the first move.`,
            InternationalCheckersRules.get().getInitialState(defaultConfig),
            CheckersMove.fromStep(new Coord(6, 6), new Coord(5, 5)),
            TutorialStepMessage.CONGRATULATIONS(),
        ),
        TutorialStep.anyMove(
            $localize`Captures`,
            $localize`A capture happens when you jump diagonally over an opponent piece to land right behind it. You have to capture when you can. It is the case here, so click on the piece that must capture, and then on its landing square.<br/><br/>You're playing Dark, go ahead.`,
            CheckersState.of([
                [V, _, V, _, V, _, V, _, V, _],
                [_, V, _, V, _, V, _, V, _, V],
                [V, _, V, _, V, _, V, _, V, _],
                [_, V, _, V, _, V, _, _, _, V],
                [_, _, _, _, _, _, _, _, V, _],
                [_, _, _, _, _, _, _, _, _, U],
                [U, _, U, _, U, _, U, _, _, _],
                [_, U, _, U, _, U, _, U, _, U],
                [U, _, U, _, U, _, U, _, U, _],
                [_, U, _, U, _, U, _, U, _, U],
            ], 4),
            CheckersMove.fromCapture([new Coord(9, 5), new Coord(7, 3)]).get(),
            TutorialStepMessage.CONGRATULATIONS(),
        ).withPreviousMove(CheckersMove.fromStep(new Coord(7, 3), new Coord(8, 4))),
        TutorialStep.anyMove(
            $localize`Backward captures`,
            $localize`A capture can also be done backward<br/><br/>You're playing Dark, you have to do one capture backward, go ahead.`,
            CheckersState.of([
                [V, _, V, _, V, _, V, _, V, _],
                [_, V, _, V, _, V, _, V, _, V],
                [V, _, V, _, _, _, V, _, V, _],
                [_, V, _, _, _, V, _, _, _, V],
                [_, _, _, _, _, _, _, _, _, _],
                [_, U, _, _, _, _, _, _, _, U],
                [U, _, _, _, U, _, _, _, V, _],
                [_, U, _, U, _, U, _, _, _, _],
                [U, _, U, _, U, _, U, _, U, _],
                [_, U, _, U, _, U, _, U, _, U],
            ], 2),
            CheckersMove.fromCapture([new Coord(9, 5), new Coord(7, 7)]).get(),
            TutorialStepMessage.CONGRATULATIONS(),
        ),
        TutorialStep.anyMove(
            $localize`Multiple captures`,
            $localize`If, after the beginning of your capture, the piece that you just moved can capture another piece, it has to capture until it can no longer capture. To do so, you must then click again on the next landing square. Note that, you cannot jump twice over the same coord.<br/><br/>You are playing Dark, a double capture is possible, go ahead.`,
            CheckersState.of([
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, V, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, V, _, _, _],
                [_, _, _, _, _, U, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
            ], 2),
            CheckersMove.fromCapture([new Coord(5, 5), new Coord(7, 3), new Coord(5, 1)]).get(),
            TutorialStepMessage.CONGRATULATIONS(),
        ),
        TutorialStep.anyMove(
            $localize`Maximal captures`,
            $localize`If at some turn you have several capture choice, you have to capture the maximal number of pieces.<br/><br/>You are playing Dark, two captures are possible, go ahead.`,
            CheckersState.of([
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, V, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, V, _, V, _, _, _],
                [_, _, _, _, _, U, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
            ], 2),
            CheckersMove.fromCapture([new Coord(5, 5), new Coord(7, 3), new Coord(5, 1)]).get(),
            TutorialStepMessage.CONGRATULATIONS(),
        ),
        TutorialStep.fromMove(
            $localize`Promotion`,
            $localize`When a piece reaches the last line, it is promoted and becomes a queen, and gains abilities that will be explained in next step! One of your piece could be promoted now.<br/><br/>You're playing Dark. Do it.`,
            CheckersState.of([
                [_, _, _, _, _, _, _, _, _, V],
                [_, _, _, _, _, _, U, _, V, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, U, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
            ], 2),
            [
                CheckersMove.fromStep(new Coord(6, 1), new Coord(5, 0)),
                CheckersMove.fromStep(new Coord(6, 1), new Coord(7, 0)),
            ],
            TutorialStepMessage.CONGRATULATIONS(),
            $localize`You did not choose the correct piece, and got no promotion.`,
        ),
        TutorialStep.fromPredicate(
            $localize`Queen move`,
            $localize`Queens can move forward like the others, and capture backward like the others. But they can also move backward without capturing. They are also able to do what we call "flying". This means doing longer steps, without jumping any piece to move, or by jumping exactly one opponent piece to capture it, then land wherever is wanting in the same line.<br/><br/>You're playing Dark, move your queen!`,
            CheckersState.of([
                [_, _, _, _, _, _, _, O, _, V],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, V, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, U, _, _, U, _, U, _, U],
            ], 2),
            CheckersMove.fromStep(new Coord(7, 0), new Coord(0, 7)),
            (move: CheckersMove, _ps: CheckersState, _rs: CheckersState) => {
                if (move.getStartingCoord().equals(new Coord(7, 0))) {
                    return MGPValidation.SUCCESS;
                } else {
                    return MGPValidation.failure($localize`You did not move your queen.`);
                }
            },
            TutorialStepMessage.CONGRATULATIONS(),
        ),
        TutorialStep.anyMove(
            $localize`Jump rule`,
            $localize`When you do a multiple jump, you cannot jump twice over neither the same piece nor the same empty space.<br/>Here you have to apply all the different capturing rules: backward, maximal, flying, and of course not jumping twice over the same coord.<br/><br/>You are playing Dark, go ahead.`,
            new CheckersState([
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, V, _, _, _, _],
                [_, _, _, _, _, _, V, _, V, _],
                [_, _, _, _, _, _, _, _, _, O],
                [_, _, _, _, V, _, V, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
            ], 20),
            CheckersMove.fromCapture([
                new Coord(9, 7),
                new Coord(6, 4),
                new Coord(3, 7),
                new Coord(5, 9),
                new Coord(7, 7),
            ]).get(),
            TutorialStepMessage.CONGRATULATIONS_YOU_WON(),
        ),
    ];
}
