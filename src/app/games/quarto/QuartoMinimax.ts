import { Minimax } from 'src/app/jscaip/AI/Minimax';
import { QuartoMove } from './QuartoMove';
import { QuartoMoveGenerator } from './QuartoMoveGenerator';
import { QuartoConfig, QuartoRules } from './QuartoRules';
import { QuartoHeuristic } from './QuartoHeuristic';
import { QuartoState } from './QuartoState';

export class QuartoMinimax extends Minimax<QuartoMove, QuartoState, QuartoConfig> {

    public constructor() {
        super($localize`Minimax`,
              QuartoRules.get(),
              new QuartoHeuristic(),
              new QuartoMoveGenerator());
    }

}
