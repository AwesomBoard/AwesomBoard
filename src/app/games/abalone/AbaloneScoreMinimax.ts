import { Minimax } from 'src/app/jscaip/AI/Minimax';
import { AbaloneMove } from './AbaloneMove';
import { AbaloneMoveGenerator } from './AbaloneMoveGenerator';
import { AbaloneConfig, AbaloneLegalityInformation, AbaloneRules } from './AbaloneRules';
import { AbaloneScoreHeuristic } from './AbaloneScoreHeuristic';
import { AbaloneState } from './AbaloneState';

export class AbaloneScoreMinimax
    extends Minimax<AbaloneMove, AbaloneState, AbaloneConfig, AbaloneLegalityInformation> {

    public constructor() {
        super($localize`Score`,
              AbaloneRules.get(),
              new AbaloneScoreHeuristic(),
              new AbaloneMoveGenerator());
    }

}
