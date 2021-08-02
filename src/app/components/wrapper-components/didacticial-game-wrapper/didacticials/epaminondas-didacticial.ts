import { EpaminondasMove } from 'src/app/games/epaminondas/EpaminondasMove';
import { EpaminondasPartSlice } from 'src/app/games/epaminondas/EpaminondasPartSlice';
import { Direction } from 'src/app/jscaip/Direction';
import { Player } from 'src/app/jscaip/Player';
import { MGPValidation } from 'src/app/utils/MGPValidation';
import { DidacticialStep } from '../DidacticialStep';

const _: number = Player.NONE.value;
const O: number = Player.ZERO.value;
const X: number = Player.ONE.value;
export const epaminondasTutorial: DidacticialStep[] = [
    DidacticialStep.informational(
        $localize`Initial board`,
        $localize`This is the initial board.
        The top line is the starting line of Light.
        The bottom line is the starting line of Dark.`,
        EpaminondasPartSlice.getInitialSlice(),
    ),
    DidacticialStep.informational(
        $localize`Goal of the game (1/2)`,
        $localize`After multiple moves, if at the end of its turn, a player has more piece on the opponent's starting line
        than the number of pieces the opponent has on the player's starting line, the player wins.
        Here, it's Dark turn to play: Dark has therefore won.`,
        new EpaminondasPartSlice([
            [_, _, _, _, _, O, _, _, X, X, X, X, X, X],
            [_, _, _, _, _, O, _, _, _, _, _, _, X, X],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, X, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, O, O, O, O, _, _, _],
        ], 0),
    ),
    DidacticialStep.informational(
        $localize`Goal of the game (2/2)`,
        $localize`Here, it is Light's turn.
        Light wins because they have two pieces on Dark's starting line, and Dark only has one on Light's starting line.`,
        new EpaminondasPartSlice([
            [_, _, _, _, _, O, _, _, _, _, X, X, X, X],
            [_, _, _, _, _, O, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, X, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, X, X, _, _, _, O, O, _, O, O, O, O],
        ], 1),
    ),
    DidacticialStep.fromPredicate(
        $localize`Moving a piece`,
        $localize`Here is the starting board. Dark plays first.
        Let's start with moving a single piece:
        <ol>
            <li>Click on a piece.</li>
            <li>Click on a empty neighbouring square.</li>
        </ol>`,
        EpaminondasPartSlice.getInitialSlice(),
        new EpaminondasMove(0, 10, 1, 1, Direction.UP),
        (move: EpaminondasMove, state: EpaminondasPartSlice) => {
            if (move.movedPieces === 1) {
                return MGPValidation.SUCCESS;
            } else {
                return MGPValidation.failure($localize`Congratulations, you are in advance. But this is not the exercise here, try again.`);
            }
        },
        $localize`This is how you move a single piece.`,
    ),
    DidacticialStep.fromPredicate(
        $localize`Moving a phalanx`,
        $localize`Let us now see how to move multiple pieces along a line, which is called a phalanx :
        <ol>
            <li>Click on the first piece of the phalanx.</li>
            <li>Click on the last piece of the phalanx.</li>
            <li>Click on one of the squares highlighted in yellow; you can move your phalax up to a distance equal to its length.</li>
        </ol><br/>
        Move a phalanx!`,
        EpaminondasPartSlice.getInitialSlice(),
        new EpaminondasMove(0, 11, 2, 1, Direction.UP),
        (move: EpaminondasMove, _: EpaminondasPartSlice) => {
            if (move.movedPieces > 1) {
                return MGPValidation.SUCCESS;
            } else {
                return MGPValidation.failure($localize`Failed! You moved only one piece.`);
            }
        },
        $localize`Congratulations!
        The moved pieces can be horizontally, vertically, or diagonally aligned.
        The move should be made along this axis, forward or backwards.
        There can be no opponent nor holes in the phalanx.`,
    ),
    DidacticialStep.fromMove(
        $localize`Capture`,
        $localize`In order to capture pieces of the opponent:
        <ol>
            <li>It must be aligned with the phalanx you are moving.</li>
            <li>It must be strictly shorter than your phalanx.</li>
            <li>The first piece of your phalanx should land on the first piece of the opponent's phalanx that you want to capture.</li>
        </ol><br/>
        Capture a phalanx.`,
        new EpaminondasPartSlice([
            [_, _, _, _, _, _, _, _, X, X, X, X, X, X],
            [_, _, _, X, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, X, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, O, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, O, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, O, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, X, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, O, O, O, O, O, O, O],
        ], 0),
        [new EpaminondasMove(3, 7, 3, 3, Direction.UP)],
        $localize`Congratulations, you made it!.`,
        $localize`Failed, you have not captured the phalanx.`,
    ),
];
