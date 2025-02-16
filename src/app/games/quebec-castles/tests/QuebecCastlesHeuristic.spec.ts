import { MGPOptional } from '@everyboard/lib';

import { HeuristicUtils } from 'src/app/jscaip/AI/tests/HeuristicUtils.spec';
import { QuebecCastlesHeuristic } from '../QuebecCastlesHeuristic';
import { QuebecCastlesState } from '../QuebecCastlesState';
import { Player } from 'src/app/jscaip/Player';
import { QuebecCastlesConfig, QuebecCastlesRules } from '../QuebecCastlesRules';
import { PlayerMap } from 'src/app/jscaip/PlayerMap';
import { Coord } from 'src/app/jscaip/Coord';

/**
 * These are the tests for the heuristic.
 * We want to test that it gives some value on some boards, or rather that it assigns higher values to a board
 * compared to another one.
 * We can rely on HeuristicUtils' functions to achieve this.
 */
fdescribe('QuebecCastlesHeuristic', () => {

    let heuristic: QuebecCastlesHeuristic;
    const defaultConfig: MGPOptional<QuebecCastlesConfig> = QuebecCastlesRules.get().getDefaultRulesConfig();

    beforeEach(() => {
        heuristic = new QuebecCastlesHeuristic();
    });

    it('should have some board value', () => {
        /**
         * To test board values, most of the time you want to rely on
         * `HeuristicUtils.expectSecondStateToBeBetterThanFirstFor`.
         * You can include last moves when needed (here there are set to MGPOptional.empty())
         */
        const weakState: QuebecCastlesState = QuebecCastlesRules.get().getInitialState(defaultConfig);
        const thrones: PlayerMap<MGPOptional<Coord>> = PlayerMap.ofValues(MGPOptional.empty(), MGPOptional.empty());
        const strongState: QuebecCastlesState = new QuebecCastlesState([], 42, thrones);
        HeuristicUtils.expectSecondStateToBeBetterThanFirstFor(heuristic,
                                                               weakState, MGPOptional.empty(),
                                                               strongState, MGPOptional.empty(),
                                                               Player.ONE,
                                                               defaultConfig);
    });

});
