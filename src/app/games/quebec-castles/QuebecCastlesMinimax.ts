import { Minimax } from 'src/app/jscaip/AI/Minimax';
import { QuebecCastlesMoveGenerator } from './QuebecCastlesMoveGenerator';
import { QuebecCastlesMove } from './QuebecCastlesMove';
import { QuebecCastlesState } from './QuebecCastlesState';
import { QuebecCastlesConfig, QuebecCastlesRules } from './QuebecCastlesRules';
import { QuebecCastlesHeuristic } from './QuebecCastlesHeuristic';

/**
 * This is the minimax AI.
 * You can plug in the heuristic and move generator.
 */
export class QuebecCastlesMinimax extends Minimax<QuebecCastlesMove, QuebecCastlesState, QuebecCastlesConfig> {

    public constructor() {
        super('Dummy',
              QuebecCastlesRules.get(),
              new QuebecCastlesHeuristic(),
              new QuebecCastlesMoveGenerator(),
        );
        this.random = true; // TODO FOR REVIEW: sang de baise en jaaj, why is it not done more ? on change que dans la classe mère hahahah
    }
}
