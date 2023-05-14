import { Tutorial, TutorialStep } from 'src/app/components/wrapper-components/tutorial-game-wrapper/TutorialStep';
import { ConnectSixState } from './ConnectSixState';
import { ConnectSixDrops, ConnectSixFirstMove } from './ConnectSixMove';
import { Coord } from 'src/app/jscaip/Coord';
import { PlayerOrNone } from 'src/app/jscaip/Player';

const _: PlayerOrNone = PlayerOrNone.NONE;
const O: PlayerOrNone = PlayerOrNone.ZERO;
const X: PlayerOrNone = PlayerOrNone.ONE;

export class ConnectSixTutorial extends Tutorial {

    public tutorial: TutorialStep[] = [
        TutorialStep.informational(
            $localize`Goal of the game & board`,
            $localize`Connect Six is played on a 19*19 board, on which stone are put on the intersections. The aim of the game is to align 6 of your pieces.`,
            ConnectSixState.getInitialState(),
        ),
        // First turn: you must place only one
        TutorialStep.anyMove(
            $localize`First turn`,
            $localize`On the first turn, the first player plays only one piece.<br/><br/>You're playing Dark, place your first piece.`,
            ConnectSixState.getInitialState(),
            ConnectSixFirstMove.from(new Coord(9, 9)),
            $localize`Congratulation`,
        ),
        // Next turn: you must place six, try to win
        TutorialStep.anyMove(
            $localize`Next turns`,
            $localize`On the next turns, the player plays only two pieces.<br/><br/>You're playing Light, do the winning move.`,
            new ConnectSixState([
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, X, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, O, _, X, O, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, O, O, _, _, X, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, X, O, O, O, O, X, _, _, _, _, _, _],
                [_, _, _, _, _, _, X, O, O, O, O, X, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, X, _, X, O, X, X, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, O, X, O, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, X, _, X, _, O, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, X, X, _, X, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, X, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, O, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            ], 20),
            ConnectSixDrops.from(new Coord(4, 11), new Coord(5, 10)).get(),
            $localize`Congratulation`,
        ),
    ];
}
