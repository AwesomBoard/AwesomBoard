import { Minimax } from 'src/app/jscaip/AI/Minimax';
import { CheckersMove } from './CheckersMove';
import { CheckersState } from '../common/CheckersState';
import { AbstractCheckersRules, CheckersConfig } from './AbstractCheckersRules';
import { MoveGenerator } from 'src/app/jscaip/AI/AI';
import { CheckersScoreHeuristic } from './CheckersScoreHeuristic';

export class CheckersScoreMinimax extends Minimax<CheckersMove, CheckersState, CheckersConfig> {

    public constructor(rules: AbstractCheckersRules,
                       moveGenerator: MoveGenerator<CheckersMove, CheckersState, CheckersConfig>)
    {
        super($localize`Score`,
              rules,
              new CheckersScoreHeuristic(),
              moveGenerator,
        );
    }
}
