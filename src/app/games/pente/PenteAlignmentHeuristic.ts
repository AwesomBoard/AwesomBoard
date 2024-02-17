import { BoardValue } from 'src/app/jscaip/AI/BoardValue';
import { Heuristic } from 'src/app/jscaip/AI/Minimax';
import { PenteMove } from './PenteMove';
import { PenteNode, PenteRules } from './PenteRules';
import { PenteState } from './PenteState';
import { MGPOptional } from 'src/app/utils/MGPOptional';
import { PenteConfig } from './PenteConfig';

export class PenteAlignmentHeuristic extends Heuristic<PenteMove, PenteState, BoardValue, PenteConfig> {

    public getBoardValue(node: PenteNode, config: MGPOptional<PenteConfig>): BoardValue {
        return PenteRules
            .get()
            .getHelper(config)
            .getBoardValue(node.gameState);
    }

}
