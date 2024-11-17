import { Tutorial, TutorialStep } from 'src/app/components/wrapper-components/tutorial-game-wrapper/TutorialStep';
import { DiaballikPiece, DiaballikState } from './DiaballikState';
import { DiaballikMove, DiaballikBallPass, DiaballikTranslation } from './DiaballikMove';
import { Coord } from 'src/app/jscaip/Coord';
import { MGPOptional } from '@everyboard/lib';
import { DiaballikRules } from './DiaballikRules';
import { TutorialStepMessage } from 'src/app/components/wrapper-components/tutorial-game-wrapper/TutorialStepMessage';

const O: DiaballikPiece = DiaballikPiece.ZERO;
const Ȯ: DiaballikPiece = DiaballikPiece.ZERO_WITH_BALL;
const X: DiaballikPiece = DiaballikPiece.ONE;
const Ẋ: DiaballikPiece = DiaballikPiece.ONE_WITH_BALL;
const _: DiaballikPiece = DiaballikPiece.NONE;

export class DiaballikTutorial extends Tutorial {
    public tutorial: TutorialStep[] = [
        TutorialStep.informational(
            TutorialStepMessage.OBJECT_OF_THE_GAME(),
            $localize`The goal of Diaballik is to bring your ball, represented by the small circle, into the home line of the opponent (i.e, its starting position). The ball is currently being held by your center piece.`,
            DiaballikRules.get().getInitialState(),
        ),
        TutorialStep.fromMove(
            TutorialStepMessage.TRANSLATIONS(),
            $localize`During a turn, you are allowed up to three actions, including at most two translations. A translation is an orthogonal step of any piece that does not hold the ball.<br/><br/>Move your leftmost piece by one step. Once you are done, click on the green button that will appear on the bottom right of the board to indicate that you are done with your turn.`,
            DiaballikRules.get().getInitialState(),
            [new DiaballikMove(DiaballikTranslation.from(new Coord(0, 6), new Coord(0, 5)).get(),
                               MGPOptional.empty(),
                               MGPOptional.empty())],
            TutorialStepMessage.CONGRATULATIONS(),
            TutorialStepMessage.FAILED_TRY_AGAIN(),
        ),
        TutorialStep.fromMove(
            $localize`Pass`,
            $localize`Another action that you are allowed to do at most once per turn is a pass. You can pass the ball by clicking on the piece that holds the ball, then on another one of your piece that can receive it. A pass must be made in a straight line along an unobstructed path.<br/><br/>Here, playing Dark, you can make two moves and a pass to win the game, do it!`,
            new DiaballikState([
                [X, X, X, Ẋ, _, X, X],
                [_, _, _, O, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
                [Ȯ, _, _, X, _, _, _],
                [_, _, _, _, _, _, _],
                [_, O, O, _, O, O, O],
            ], 0),
            [new DiaballikMove(DiaballikTranslation.from(new Coord(3, 1), new Coord(4, 1)).get(),
                               MGPOptional.of(DiaballikTranslation.from(new Coord(4, 1), new Coord(4, 0)).get()),
                               MGPOptional.of(DiaballikBallPass.from(new Coord(0, 4), new Coord(4, 0)).get()))],
            TutorialStepMessage.CONGRATULATIONS(),
            TutorialStepMessage.FAILED_TRY_AGAIN(),
        ),
        TutorialStep.fromMove(
            $localize`Blocking the opponent`,
            $localize`There is a special anti-game rule. If a player forms a contiguous line, with one piece in each column, they block the opponent from reaching their home line. If the opponent is in contact with three pieces in this case, they win instantaneously.<br/><br/>Here, playing Light, your opponent is blocking you and you already have two pieces in contact with their line. If you can connect a third piece, you win. Do it!`,
            new DiaballikState([
                [X, X, X, _, _, _, _],
                [X, _, _, _, _, _, Ẋ],
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
                [O, X, _, _, _, _, _],
                [_, O, _, X, _, _, _],
                [_, _, O, Ȯ, O, O, O],
            ], 1),
            [new DiaballikMove(DiaballikTranslation.from(new Coord(0, 1), new Coord(0, 2)).get(),
                               MGPOptional.of(DiaballikTranslation.from(new Coord(0, 2), new Coord(0, 3)).get()),
                               MGPOptional.empty())],
            TutorialStepMessage.CONGRATULATIONS(),
            TutorialStepMessage.FAILED_TRY_AGAIN(),
        ),
    ];
}
