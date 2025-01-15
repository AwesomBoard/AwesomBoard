import { MGPValidation, Utils } from '@everyboard/lib';

import { DvonnMove } from 'src/app/games/dvonn/DvonnMove';
import { DvonnState } from 'src/app/games/dvonn/DvonnState';
import { Coord } from 'src/app/jscaip/Coord';
import { Tutorial, TutorialStep } from 'src/app/components/wrapper-components/tutorial-game-wrapper/TutorialStep';
import { DvonnPieceStack } from 'src/app/games/dvonn/DvonnPieceStack';
import { Player } from 'src/app/jscaip/Player';
import { DvonnRules } from './DvonnRules';
import { TutorialStepMessage } from 'src/app/components/wrapper-components/tutorial-game-wrapper/TutorialStepMessage';

const __: DvonnPieceStack = DvonnPieceStack.EMPTY;
const NN: DvonnPieceStack = DvonnPieceStack.UNREACHABLE;
const SO: DvonnPieceStack = DvonnPieceStack.SOURCE;
const O1: DvonnPieceStack = DvonnPieceStack.PLAYER_ZERO;
const X1: DvonnPieceStack = DvonnPieceStack.PLAYER_ONE;
const O2: DvonnPieceStack = new DvonnPieceStack(Player.ZERO, 2, false);
const X2: DvonnPieceStack = new DvonnPieceStack(Player.ONE, 2, false);
const O4: DvonnPieceStack = new DvonnPieceStack(Player.ZERO, 4, false);
const X4: DvonnPieceStack = new DvonnPieceStack(Player.ONE, 4, false);

export class DvonnTutorial extends Tutorial {

    public tutorial: TutorialStep[] = [
        TutorialStep.anyMove(
            $localize`Moving`,
            $localize`At Dvonn, each hexagonal space contains a stack of pieces.
        If no number is indicated on a stack, it means that it only contains one piece.
        The number written on a stack indicates the number of pieces within that stack, hence the number of points its owner gets.
        The owner of a stack is the one that has a piece at the top of the stack.
        Only the owner of a stack can move it.
        A stack cannot be moved if it is surrounded by 6 other stacks.
        A stack is moved by as many spaces as there are pieces within, in a straight line, and it should land on an occupied space.
        This line cannot move along the vertex of two neighboring spaces, as would a vertical move.
        Therefore, there are six possible directions.
        The player with dark pieces starts.<br/><br/>
        You're playing Dark, click on a stack and move it by one space.`,
            DvonnRules.get().getInitialState(),
            DvonnMove.from(new Coord(2, 0), new Coord(3, 0)).get(),
            TutorialStepMessage.CONGRATULATIONS(),
        ),
        TutorialStep.fromPredicate(
            $localize`Disconnection`,
            $localize`Pieces with a lightning strike are called "sources".
        When a stack is not directly nor indirectly connected to a source, it is removed from the board.<br/><br/>
        You're playing Dark, try to disconnect the stack of 4 pieces from your opponent. There are two ways of doing that, one is better than the other: try to find that one!`,
            new DvonnState([
                [NN, NN, X1, SO, __, __, __, __, __, __, __],
                [NN, __, O1, __, __, __, __, __, __, __, __],
                [__, __, X4, __, __, __, __, X1, SO, __, __],
                [__, __, __, __, __, __, __, __, __, __, NN],
                [__, __, __, __, __, __, __, __, __, NN, NN],
            ], 0, false),
            DvonnMove.from(new Coord(2, 1), new Coord(2, 0)).get(),
            (move: DvonnMove, _previous: DvonnState, _result: DvonnState) => {
                if (move.getEnd().equals(new Coord(3, 0))) {
                    return MGPValidation.failure($localize`You have successfully disconnected the stack of 4 pieces of your opponent, but on the next move your opponent will be able to move on your new stack, and to win the game! There exists a better outcome of this situation, try to find it.`);
                } else {
                    Utils.assert(move.getEnd().equals(new Coord(2, 0)), 'player made an impossible move'); // this is the only valid move remaining
                    return MGPValidation.SUCCESS;
                }
            },
            $localize`Nice, you have disconnected 4 pieces of your opponent, and your new stack cannot be reached by your opponent!
        Your opponent therefore lost 5 points: 4 from the disconnected stack, and one from the stack on which you moved.
        Disconnected stacks will not be visible at the next turn.`,
        ),
        TutorialStep.fromPredicate(
            $localize`Moving on a source`,
            $localize`You are allowed to move your stacks on any other stack.
        This means that you can take control of a source by moving one of your stack on top of it.
        This way, you know that this stack may never be disconnected, as it contains a source.<br/><br/>
        You're playing Dark and you can take control of a source, do it!`,
            new DvonnState([
                [NN, NN, SO, X1, __, __, __, __, __, __, __],
                [NN, O1, O1, __, __, __, __, __, __, __, __],
                [__, X1, O1, X1, __, __, O1, X2, SO, __, __],
                [__, __, X1, __, __, __, __, __, __, __, NN],
                [__, __, __, __, __, __, __, __, __, NN, NN],
            ], 0, false),
            DvonnMove.from(new Coord(2, 1), new Coord(2, 0)).get(),
            (move: DvonnMove, _previous: DvonnState, _result: DvonnState) => {
                if (move.getEnd().equals(new Coord(2, 0))) {
                    return MGPValidation.SUCCESS;
                } else {
                    return MGPValidation.failure($localize`You have not taken possession of a source, try again.`);
                }
            },
            $localize`Congratulations! However, note that your opponent could later take possession of one of your stack that contains a source, so watch out when you take control of sources!`,
        ),
        TutorialStep.informational(
            $localize`Passing`,
            $localize`It can happen that you have no possible move to make.
        If this is the case, and if your opponent can still move, you must pass your turn.<br/><br/>
        This is a situation that occurs here for Dark.`,
            new DvonnState([
                [NN, NN, SO, __, __, __, __, __, __, __, __],
                [NN, __, O2, __, __, __, __, __, __, __, __],
                [__, __, X2, __, __, __, __, X2, SO, O4, __],
                [__, __, __, __, __, __, __, __, __, __, NN],
                [__, __, __, __, __, __, __, __, __, NN, NN],
            ], 0, false),
        ),
        TutorialStep.fromMove(
            TutorialStepMessage.END_OF_THE_GAME(),
            $localize`When no more move is possible for both players, the game ends and the player with the most points wins.<br/><br/>You're playing Dark, make your last move.`,
            new DvonnState([
                [NN, NN, SO, __, __, __, __, __, __, __, __],
                [NN, __, O1, __, __, __, __, __, __, __, __],
                [__, __, __, __, __, __, __, __, SO, O4, __],
                [__, __, __, __, __, __, __, __, __, __, NN],
                [__, __, __, __, __, __, __, __, __, NN, NN],
            ], 0, false),
            [DvonnMove.from(new Coord(2, 1), new Coord(2, 0)).get()],
            $localize`Congratulations, you won 6 - 0!`,
            $localize`Bad idea, by moving on the source you would have won a point.`,
        ),
    ];
}
