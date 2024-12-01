import { EncapsuleMove } from 'src/app/games/encapsule/EncapsuleMove';
import { EncapsulePiece } from 'src/app/games/encapsule/EncapsulePiece';
import { EncapsuleRemainingPieces, EncapsuleSizeToNumberMap, EncapsuleSpace, EncapsuleState } from 'src/app/games/encapsule/EncapsuleState';
import { Coord } from 'src/app/jscaip/Coord';
import { Player } from 'src/app/jscaip/Player';
import { MGPOptional, MGPValidation } from '@everyboard/lib';
import { Tutorial, TutorialStep } from '../../components/wrapper-components/tutorial-game-wrapper/TutorialStep';
import { EncapsuleConfig, EncapsuleRules } from './EncapsuleRules';
import { TutorialStepMessage } from 'src/app/components/wrapper-components/tutorial-game-wrapper/TutorialStepMessage';
import { PlayerMap } from 'src/app/jscaip/PlayerMap';


const _: EncapsuleSpace = EncapsuleSpace.EMPTY;
const smallDark: EncapsulePiece = EncapsulePiece.ofSizeAndPlayer(1, Player.ZERO);
const mediumDark: EncapsulePiece = EncapsulePiece.ofSizeAndPlayer(2, Player.ZERO);
const bigDark: EncapsulePiece = EncapsulePiece.ofSizeAndPlayer(3, Player.ZERO);
const smallLight: EncapsulePiece = EncapsulePiece.ofSizeAndPlayer(1, Player.ONE);
const bigLight: EncapsulePiece = EncapsulePiece.ofSizeAndPlayer(3, Player.ONE);
const s: EncapsuleSpace = _.put(smallDark);
const m: EncapsuleSpace = _.put(mediumDark);
const b: EncapsuleSpace = _.put(bigDark);
const S: EncapsuleSpace = _.put(smallLight);
const B: EncapsuleSpace = _.put(bigLight);

const Sm: EncapsuleSpace = _.put(smallLight).put(mediumDark);
const sm: EncapsuleSpace = _.put(smallDark).put(mediumDark);
const defaultConfig: MGPOptional<EncapsuleConfig> = EncapsuleRules.get().getDefaultRulesConfig();
const noMorePieces: EncapsuleRemainingPieces =
    PlayerMap.ofValues(new EncapsuleSizeToNumberMap(), new EncapsuleSizeToNumberMap());

export class EncapsuleTutorial extends Tutorial {

    public tutorial: TutorialStep[] = [
        TutorialStep.informational(
            TutorialStepMessage.OBJECT_OF_THE_GAME(),
            $localize`The goal of Encapsule is to align three of your pieces. Here, Dark wins.`,
            new EncapsuleState(
                [
                    [s, S, B],
                    [_, m, _],
                    [_, _, b],
                ],
                0,
                EncapsuleRules.get().getEncapsulePieceMapFrom([1, 1, 1], [1, 2, 1]),
                3,
            )),
        TutorialStep.anyMove(
            $localize`Putting a piece`,
            $localize`This is the initial board.<br/><br/>
        You're playing Dark. Pick one of your piece on the side of the board and put it on the board.`,
            EncapsuleRules.get().getInitialState(defaultConfig),
            EncapsuleMove.ofDrop(smallDark, new Coord(1, 1)),
            TutorialStepMessage.CONGRATULATIONS()),
        TutorialStep.fromMove(
            $localize`Moving`,
            $localize`Another possible action is to move one of your pieces that is already on the board.<br/><br/>
        You're playing Dark, click on your piece already on the board and then on any empty square of the board.`,
            new EncapsuleState([
                [s, B, _],
                [_, _, _],
                [_, _, _],
            ], 0, noMorePieces, 3),
            [
                EncapsuleMove.ofMove(new Coord(0, 0), new Coord(2, 0)),
                EncapsuleMove.ofMove(new Coord(0, 0), new Coord(0, 1)),
                EncapsuleMove.ofMove(new Coord(0, 0), new Coord(1, 1)),
                EncapsuleMove.ofMove(new Coord(0, 0), new Coord(2, 1)),
                EncapsuleMove.ofMove(new Coord(0, 0), new Coord(0, 2)),
                EncapsuleMove.ofMove(new Coord(0, 0), new Coord(1, 2)),
                EncapsuleMove.ofMove(new Coord(0, 0), new Coord(2, 2)),
            ],
            TutorialStepMessage.CONGRATULATIONS(),
            TutorialStepMessage.FAILED_TRY_AGAIN(),
        ),
        TutorialStep.fromPredicate(
            $localize`Particularity`,
            $localize`At Encapsule, pieces encapsulate each other. It is therefore possible to have up to three pieces per square! However, only the biggest piece of each square counts: you cannot win with a piece that is "hidden" by a bigger piece. Similarly, you cannot move a piece if it is encapsulated by a bigger piece. Finally, you cannot encapsulate a piece with a smaller piece. Here, Dark can win now in various ways.<br/><br/> You're playing Dark, try to win by making a move, and not by putting a new piece on the board.`,
            new EncapsuleState(
                [
                    [Sm, _, S],
                    [sm, B, B],
                    [_, _, _],
                ],
                0,
                EncapsuleRules.get().getEncapsulePieceMapFrom([0, 1, 1], [0, 2, 0]),
                3,
            ),
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
                return MGPValidation.failure(TutorialStepMessage.FAILED_TRY_AGAIN());
            },
            TutorialStepMessage.CONGRATULATIONS(),
        ),
    ];
}
