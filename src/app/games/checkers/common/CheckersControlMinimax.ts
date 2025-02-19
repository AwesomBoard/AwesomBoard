import { Minimax } from 'src/app/jscaip/AI/Minimax';
import { CheckersMove } from './CheckersMove';
import { CheckersMoveGenerator } from './CheckersMoveGenerator';
import { AbstractCheckersRules, CheckersConfig } from './AbstractCheckersRules';
import { CheckersControlHeuristic } from './CheckersControlHeuristic';
import { CheckersState } from './CheckersState';

export class CheckersControlMinimax extends Minimax<CheckersMove, CheckersState, CheckersConfig> {

    public constructor(rules: AbstractCheckersRules) {
        super($localize`Control`,
              rules,
              new CheckersControlHeuristic(rules),
              new CheckersMoveGenerator(rules),
        );
    }

}
