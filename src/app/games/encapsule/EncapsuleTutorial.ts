import { EncapsuleMove } from 'src/app/games/encapsule/EncapsuleMove';
import { EncapsulePiece } from 'src/app/games/encapsule/EncapsulePiece';
import { EncapsuleSpace, EncapsuleState } from 'src/app/games/encapsule/EncapsuleState';
import { Coord } from 'src/app/jscaip/Coord';
import { Player, PlayerOrNone } from 'src/app/jscaip/Player';
import { MGPValidation } from 'src/app/utils/MGPValidation';
import { Tutorial, TutorialStep } from '../../components/wrapper-components/tutorial-game-wrapper/TutorialStep';
import { EncapsuleRules } from './EncapsuleRules';
import { TutorialStepFailure } from 'src/app/components/wrapper-components/tutorial-game-wrapper/TutorialStepFailure';

const _: EncapsuleSpace = new EncapsuleSpace(PlayerOrNone.NONE, PlayerOrNone.NONE, PlayerOrNone.NONE);
const s: EncapsuleSpace = new EncapsuleSpace(Player.ZERO, PlayerOrNone.NONE, PlayerOrNone.NONE);
const m: EncapsuleSpace = new EncapsuleSpace(PlayerOrNone.NONE, Player.ZERO, PlayerOrNone.NONE);
const b: EncapsuleSpace = new EncapsuleSpace(PlayerOrNone.NONE, PlayerOrNone.NONE, Player.ZERO);
const S: EncapsuleSpace = new EncapsuleSpace(Player.ONE, PlayerOrNone.NONE, PlayerOrNone.NONE);
const B: EncapsuleSpace = new EncapsuleSpace(PlayerOrNone.NONE, PlayerOrNone.NONE, Player.ONE);

const Sm: EncapsuleSpace = new EncapsuleSpace(Player.ONE, Player.ZERO, PlayerOrNone.NONE);
const sm: EncapsuleSpace = new EncapsuleSpace(Player.ZERO, Player.ZERO, PlayerOrNone.NONE);

export class EncapsuleTutorial extends Tutorial {

    public tutorial: TutorialStep[] = [
        TutorialStep.informational(
            $localize`Goal of the game`,
            $localize`The goal of Encapsule is to align three of your pieces.
        Here, we have a victory of the dark player.`,
            new EncapsuleState([
                [s, S, B],
                [_, m, _],
                [_, _, b],
            ], 0, [
                EncapsulePiece.SMALL_DARK, EncapsulePiece.MEDIUM_DARK, EncapsulePiece.BIG_DARK,
                EncapsulePiece.SMALL_LIGHT, EncapsulePiece.MEDIUM_LIGHT, EncapsulePiece.MEDIUM_LIGHT,
                EncapsulePiece.BIG_LIGHT,
            ])),
        TutorialStep.anyMove(
            $localize`Putting a piece`,
            $localize`This is the initial board.<br/><br/>
        You're playing Dark. Pick one of your piece on the side of the board and put it on the board.`,
            EncapsuleRules.get().getInitialState(),
            EncapsuleMove.ofDrop(EncapsulePiece.SMALL_DARK, new Coord(1, 1)),
            TutorialStepFailure.CONGRATULATIONS()),
        TutorialStep.fromMove(
            $localize`Moving`,
            $localize`Another possible action is to move one of your pieces that is already on the board.<br/><br/>
        You're playing Dark, click on your piece already on the board and then on any empty square of the board.`,
            new EncapsuleState([
                [s, B, _],
                [_, _, _],
                [_, _, _],
            ], 0, []),
            [
                EncapsuleMove.ofMove(new Coord(0, 0), new Coord(2, 0)),
                EncapsuleMove.ofMove(new Coord(0, 0), new Coord(0, 1)),
                EncapsuleMove.ofMove(new Coord(0, 0), new Coord(1, 1)),
                EncapsuleMove.ofMove(new Coord(0, 0), new Coord(2, 1)),
                EncapsuleMove.ofMove(new Coord(0, 0), new Coord(0, 2)),
                EncapsuleMove.ofMove(new Coord(0, 0), new Coord(1, 2)),
                EncapsuleMove.ofMove(new Coord(0, 0), new Coord(2, 2)),
            ],
            TutorialStepFailure.CONGRATULATIONS(),
            TutorialStepFailure.FAILED_TRY_AGAIN(),
        ),
        TutorialStep.fromPredicate(
            $localize`Particularity`,
            $localize`At Encapsule, pieces encapsulate each other.
        It is therefore possible to have up to three pieces per square!
        However, only the biggest piece of each square counts:
        you cannot win with a piece that is "hidden" by a bigger piece.
        Similarly, you cannot move a piece if it is encapsulated by a bigger piece.
        Finally, you cannot encapsulate a piece with a smaller piece.
        Here, Dark can win now in various ways.<br/><br/>
        You're playing Dark, try to win by making a move, and not by putting a new piece on the board.`,
            new EncapsuleState([
                [Sm, _, S],
                [sm, B, B],
                [_, _, _],
            ], 0, [
                EncapsulePiece.MEDIUM_DARK, EncapsulePiece.BIG_DARK,
                EncapsulePiece.MEDIUM_LIGHT, EncapsulePiece.MEDIUM_LIGHT,
            ]),
            EncapsuleMove.ofMove(new Coord(0, 1), new Coord(0, 2)),
            (move: EncapsuleMove, _previous: EncapsuleState, _result: EncapsuleState) => {
                const isCorrectLandingCoord: boolean = move.landingCoord.equals(new Coord(0, 2));
                if (isCorrectLandingCoord) {
                    if (move.isDropping()) {
                        return MGPValidation.failure($localize`You won, but the exercise is to win while moving a piece!`);
                    } else if (move.startingCoord.equalsValue(new Coord(0, 1))) {
                        return MGPValidation.SUCCESS;
                    }
                }
                return MGPValidation.failure(TutorialStepFailure.FAILED_TRY_AGAIN());
            },
            TutorialStepFailure.CONGRATULATIONS()),
    ];
}
