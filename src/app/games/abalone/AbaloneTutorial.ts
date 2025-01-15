import { MGPValidation } from '@everyboard/lib';

import { Tutorial, TutorialStep } from 'src/app/components/wrapper-components/tutorial-game-wrapper/TutorialStep';
import { Coord } from 'src/app/jscaip/Coord';
import { FourStatePiece } from 'src/app/jscaip/FourStatePiece';
import { HexaDirection } from 'src/app/jscaip/HexaDirection';
import { AbaloneState } from './AbaloneState';
import { AbaloneMove } from './AbaloneMove';
import { AbaloneRules } from './AbaloneRules';
import { TutorialStepMessage } from 'src/app/components/wrapper-components/tutorial-game-wrapper/TutorialStepMessage';

const _: FourStatePiece = FourStatePiece.EMPTY;
const N: FourStatePiece = FourStatePiece.UNREACHABLE;
const O: FourStatePiece = FourStatePiece.ZERO;
const X: FourStatePiece = FourStatePiece.ONE;

export class AbaloneTutorial extends Tutorial {

    public tutorial: TutorialStep[] = [
        TutorialStep.informational(
            TutorialStepMessage.INITIAL_BOARD_AND_OBJECT_OF_THE_GAME(),
            $localize`At Abalone, the object of the game is to be the first player to push 6 opponent's pieces out of the board. Let us see how!`,
            AbaloneRules.get().getInitialState(),
        ),
        TutorialStep.anyMove(
            $localize`Moving a piece`,
            $localize`At each turn, move one, two, or three pieces either along their line, or on their side. For your moves you can therefore choose between up to 6 directions. The pieces you move must be aligned and consecutive, and the move should land on an empty space (except to push, we will see that later). To make a move, click on one of your pieces, then click on an arrow to choose the move direction.<br/><br/> You're playing Dark, make any move!`,
            AbaloneRules.get().getInitialState(),
            AbaloneMove.ofSingleCoord(new Coord(2, 6), HexaDirection.UP),
            TutorialStepMessage.CONGRATULATIONS(),
        ),
        TutorialStep.fromMove(
            $localize`Pushing`,
            $localize`To push one opponent piece, you must move at least two of your pieces. To push two opponent pieces, you must move three of your pieces. If one of your pieces is in the way, it will be impossible to push. You cannot move more than three pieces.<br/><br/> Only one push toward the right is possible here, find it. (You're playing Dark).`,
            new AbaloneState([
                [N, N, N, N, _, O, O, X, X],
                [N, N, N, _, _, _, _, _, _],
                [N, N, _, O, O, O, X, O, _],
                [N, _, _, _, _, _, _, _, _],
                [_, _, _, _, O, O, O, X, X],
                [_, _, _, _, _, _, _, _, N],
                [_, _, _, _, O, X, _, N, N],
                [_, _, _, O, _, _, N, N, N],
                [_, _, O, _, _, N, N, N, N],
            ], 0),
            [AbaloneMove.ofSingleCoord(new Coord(4, 4), HexaDirection.RIGHT)],
            TutorialStepMessage.CONGRATULATIONS(),
            TutorialStepMessage.FAILED_TRY_AGAIN(),
        ),
        TutorialStep.fromPredicate(
            TutorialStepMessage.TRANSLATIONS(),
            $localize`To translate a group of pieces, first select the first piece, then the last piece, and finally click on one of the four lateral directions in which the group can move without touching opponent pieces.<br/><br/>Go ahead, translate some pieces.`,
            AbaloneRules.get().getInitialState(),
            AbaloneMove.ofDoubleCoord(new Coord(2, 6), new Coord(4, 6), HexaDirection.UP),
            (move: AbaloneMove, _ps: AbaloneState, _rs: AbaloneState) => {
                if (move.isTranslation()) {
                    return MGPValidation.SUCCESS;
                } else {
                    return MGPValidation.failure($localize`This is not a translation, this is a "pushing move", try a translation.`);
                }
            },
            $localize`Congratulations! You know everything you need to start a game!`,
        ),
        TutorialStep.informational(
            TutorialStepMessage.RULES_CONFIGURATION(),
            $localize`You will see when creating a game that you can configure two things.<br/><ul><li>First, the number of captures needed to win. The default is 6, changing it will help changing the game's duration if wanted.</li><li>Last, the maximum size of a moved group. The default is 3 but if you want a more chaotic and fun game, you could increase that limit and play a more powerful alternative version of the game!</li></ul>`,
            AbaloneRules.get().getInitialState(),
        ),
    ];
}
