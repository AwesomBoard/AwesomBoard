import { TutorialStep } from 'src/app/components/wrapper-components/tutorial-game-wrapper/TutorialStep';
import { MancalaMove } from './MancalaMove';
import { MancalaState } from './MancalaState';

export class MancalaTutorial {

    public static SOWING: (solutionMove: MancalaMove) => TutorialStep =
        (solutionMove: MancalaMove) => TutorialStep.fromMove(
            $localize`Sowing`,
            $localize`The main move in mancala games is sowing, let's see how seeds are sown. As you're playing Dark, the 6 houses on the bottom are yours.<br/><br>Click on the rightmost bottom house to sow the seeds it contains: they will be sown clockwise, one seed per house.<br/><br/>Click on the rightmost house!`,
            MancalaState.getInitialState(),
            [solutionMove],
            $localize`Look at the 4 houses that follow clockwise the one you picked, they now contain 5 seeds. This is how seeds are sown: one by one from the house next to the one they come from, clockwise.`,
            $localize`Failed. Choose the rightmost house on the bottom.`,
        );
}
