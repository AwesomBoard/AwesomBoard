import { Tutorial, TutorialStep } from 'src/app/components/wrapper-components/tutorial-game-wrapper/TutorialStep';
import { MancalaState } from '../commons/MancalaState';
import { KalahMove } from './KalahMove';
import { MancalaDistribution } from '../commons/MancalaMove';
import { MGPValidation } from 'src/app/utils/MGPValidation';

export class KalahTutorial extends Tutorial {
    public tutorial: TutorialStep[] = [
        TutorialStep.informational(
            $localize`Kalah`,
            $localize`Kalah is a game of distribution (sowing) and capture. It belongs to the a family of game named Mancala. But unlike most version of Mancalas, this one has been created in America in 1940 by William Julius Champion Jr. Like the classic international version named Awalé, the board is made of 2 row of 6 houses, containing each 4 seeds.`,
            MancalaState.getInitialState(),
        ),
        TutorialStep.fromMove(
            $localize`Sowing`,
            $localize`The mains move in mancala games is sowing, let's see how seeds are sown. The spaces in mancalas are called the houses. As you're playing Dark, the 6 houses on the bottom are yours.<br/><br>Click on the righter bottom houses to sow the seeds it contains: they will be sown clockwise, one seed per house.`,
            MancalaState.getInitialState(),
            [KalahMove.of(MancalaDistribution.FIVE)],
            $localize`Look at the 4 houses that follow clockwise the one you picked, they now contain 5 seeds. This is how seeds are sown: one by one from the house next to the one they come from, clockwise.`,
            $localize`Failed. Choose the righter house on the bottom.`,
        ),
        TutorialStep.fromMove( // TODO: add fromClick again cause needed here to explain soon why finishing in the Kalah don't finalize the move
            $localize`The Kalah (1/2)`,
            $localize`The house on the extreme left and right, unaligned to the others, are the kalah, yours on the left, the opponent's on the right. When sowing, before passing from your last house to the first of the opponent, you must drop one seed in your kalah. But you won't have to drop seed in your opponent's kalah. When you make a capture, your seeds are put in your kalah.<br/><br/>You're playing Dark. Make a move that pass threw your kalah then feed opponent's houses.`,
            MancalaState.getInitialState(),
            [
                KalahMove.of(MancalaDistribution.ZERO),
                KalahMove.of(MancalaDistribution.ONE),
                KalahMove.of(MancalaDistribution.TWO),
            ],
            $localize`As you see, three houses have been fed in addition to your kalah.`,
            $localize`Failed. Choose the three lefter house on the bottom.`,
        ),
        TutorialStep.fromPredicate(
            $localize`The Kalah (2/2)`,
            $localize`When ending in the Kalah, you are allowed to distribute again.<br/><br/>You're playing Dark, play the house that end up in the Kalah then do a second move!`,
            MancalaState.getInitialState(),
            KalahMove.of(MancalaDistribution.THREE, [MancalaDistribution.ONE]),
            (move: KalahMove, _previous: MancalaState, _result: MancalaState) => {
                if (move.subMoves.length === 1) {
                    return MGPValidation.failure($localize`This move only distributed one house, do one distribution that end in the Kalah then a second one!`);
                } else {
                    return MGPValidation.SUCCESS;
                }
            },
            $localize`Congratulations!`,
        ),
        // 5. Capture
        TutorialStep.fromPredicate(
            $localize`Capture`,
            $localize`When the last seed of a distribution end up in one of your empty houses, if the house over it is filled, then you capture both houses. On this board, such a move is possible.<br/><br/>You're playing Dark, do a capture!`,
            new MancalaState([
                [0, 4, 4, 4, 4, 4],
                [0, 2, 0, 2, 4, 0],
            ], 4, [0, 0]), // TODO: show solution in tutorial should animate
            KalahMove.of(MancalaDistribution.ONE, [MancalaDistribution.ZERO, MancalaDistribution.THREE]),
            (move: KalahMove, state: MancalaState, resultingState: MancalaState) => {
                if (resultingState.getPieceAtXY(1, 0) === 0) {
                    return MGPValidation.SUCCESS;
                } else {
                    return MGPValidation.failure('You did not capture, try again!');
                }
            },
            $localize`Congrats!`,
        ),
        // 6. Here: you can starve !
        TutorialStep.fromMove(
            $localize`End Game`,
            $localize`At any moment, when one player have more than 24 seeds in their kalah, they win. That can happend before the board is emptied, but, there is also a second way. When, at teh beginning of your turn, you don't have any seed in your house, the game is over and your opponent takes all the remaining seeds from his house, which automatically leads to the opponent's victory. Here, the opponent's just gave you their last seed, if you manage not to distribute any seeds in their houses, you win.<br/><br/>You're playing Dark, win!`,
            new MancalaState([
                [0, 0, 0, 0, 0, 0],
                [0, 3, 0, 1, 0, 1],
            ], 0, [22, 23]),
            [
                KalahMove.of(MancalaDistribution.THREE),
                KalahMove.of(MancalaDistribution.FIVE),
            ],
            $localize`Congratulations, you won!`,
            $localize`Failed, you gave the opponent a seed! Try again.`),
    ];
}
// TODO: make it throw when you create a game without minimax !