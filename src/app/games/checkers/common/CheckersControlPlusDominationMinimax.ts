import { Minimax } from 'src/app/jscaip/AI/Minimax';
import { CheckersMove } from './CheckersMove';
import { CheckersMoveGenerator } from './CheckersMoveGenerator';
import { AbstractCheckersRules, CheckersConfig } from './AbstractCheckersRules';
import { CheckersControlPlusDominationHeuristic } from './CheckersControlPlusDominationHeuristic';
import { CheckersState } from './CheckersState';

export class CheckersControlPlusDominationMinimax extends Minimax<CheckersMove, CheckersState, CheckersConfig> {

    public constructor(rules: AbstractCheckersRules) {
        super($localize`Control and Domination`,
              rules,
              new CheckersControlPlusDominationHeuristic(rules),
              new CheckersMoveGenerator(rules),
        );
    }

}
