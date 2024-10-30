import { TutorialStep } from 'src/app/components/wrapper-components/tutorial-game-wrapper/TutorialStep';
import { MancalaDistribution, MancalaMove } from './MancalaMove';
import { MancalaState } from './MancalaState';
import { Utils } from '@everyboard/lib';
import { Localized } from 'src/app/utils/LocaleUtils';

export class MancalaTutorial {

    public static intro(gameName: string, state: MancalaState): TutorialStep {
        return TutorialStep.informational(
            gameName,
            $localize`${gameName} is a Mancala. Mancala is the name of a family of board games that dates back at least to the third century. Mancalas are games of distribution (sowing) and capture. Their goal is to capture the most seeds. The spaces in Mancalas are called the houses. The ones on the extreme left and right are called the stores, they contain the seeds that each player captured. As you are playing Dark, the 6 houses on the bottom are yours.`,
            state,
        );
    }

    public static sowing(state: MancalaState): TutorialStep {
        const initialHouseContent: number = state.getPieceAtXY(5, 1);
        Utils.assert(initialHouseContent === 4, '(5, 1) should contain 4 seed');
        return TutorialStep.fromMove(
            $localize`Sowing`,
            $localize`The main move in Mancala games is sowing, let's see how seeds are sown. As you are playing Dark, the 6 houses on the bottom are yours.<br/><br/>When you sow a house, the seeds it contains are sown clockwise, one seed per house.<br/><br/>Click on the rightmost house!`,
            state,
            [MancalaMove.of(MancalaDistribution.of(5))],
            $localize`Look at the 4 houses that follow clockwise the one you picked, they now contain one more seed. This is how seeds are sown: one by one from the house next to the one they come from, clockwise.`,
            $localize`Failed. Choose the rightmost house on the bottom.`,
        );
    }

    public static YOU_DID_NOT_CAPTURE_ANY_SEEDS: Localized = () => $localize`Failed. You did not capture anything. Try again.`;
}
