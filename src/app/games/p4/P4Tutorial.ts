import { P4Move } from 'src/app/games/p4/P4Move';
import { P4State, p4Config } from 'src/app/games/p4/P4State';
import { Tutorial, TutorialStep } from 'src/app/components/wrapper-components/tutorial-game-wrapper/TutorialStep';
import { PlayerOrNone } from 'src/app/jscaip/Player';

const _: PlayerOrNone = PlayerOrNone.NONE;
const O: PlayerOrNone = PlayerOrNone.ZERO;
const X: PlayerOrNone = PlayerOrNone.ONE;

export class P4Tutorial extends Tutorial {

    public tutorial: TutorialStep[] = [
        TutorialStep.informational(
            $localize`Goal of the game`,
            $localize`The board at Four in a Row is made of 7 columns and 6 rows, and it is initially empty.
        The first player plays Dark, the second plays Light.
        The goal is to be the first to align 4 of its pieces (horizontally, vertically, or diagonally).`,
            P4State.getInitialState(p4Config),
        ),
        TutorialStep.anyMove(
            $localize`Dropping a piece`,
            $localize`Click on any space in any column.`,
            P4State.getInitialState(p4Config),
            P4Move.of(3),
            $localize`As you can see, the piece falls at the bottom of the column.`,
        ),
        TutorialStep.fromMove(
            $localize`Victory`,
            $localize`You're playing Dark.
        Place your piece so that you create a horizontal alignment of 4 of your pieces.`,
            new P4State([
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, X, _, _, _],
                [_, _, _, X, _, _, _],
                [_, _, O, O, O, X, _],
            ], 0),
            [P4Move.of(1)],
            $localize`You won!`,
            $localize`Failed, you have not aligned 4 pieces and missed an opportunity to win.`,
        ),
        TutorialStep.fromMove(
            $localize`Other victory`,
            $localize`You can also align 4 pieces diagonally or vertically.`,
            new P4State([
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, O, X, _, _],
                [_, _, O, O, X, _, _],
                [_, O, X, O, O, _, _],
            ], 0),
            [
                P4Move.of(3),
                P4Move.of(4),
            ],
            $localize`You won!`,
            $localize`Failed, you have not aligned 4 pieces and missed an opportunity to win.`,
        ),
    ];
}
