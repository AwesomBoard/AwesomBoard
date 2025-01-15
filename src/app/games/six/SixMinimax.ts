import { Minimax } from 'src/app/jscaip/AI/Minimax';
import { SixMove } from './SixMove';
import { SixState } from './SixState';
import { SixConfig, SixLegalityInformation, SixRules } from './SixRules';
import { SixHeuristic } from './SixHeuristic';
import { SixFilteredMoveGenerator } from './SixFilteredMoveGenerator';

export class SixMinimax extends Minimax<SixMove, SixState, SixConfig, SixLegalityInformation> {

    public constructor() {
        super($localize`Minimax`,
              SixRules.get(),
              new SixHeuristic(),
              new SixFilteredMoveGenerator(),
        );
    }

}
