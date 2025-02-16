import { Minimax } from 'src/app/jscaip/AI/Minimax';
import { SquarzMoveGenerator } from './SquarzMoveGenerator';
import { SquarzMove } from './SquarzMove';
import { SquarzState } from './SquarzState';
import { SquarzConfig, SquarzRules } from './SquarzRules';
import { SquarzHeuristic } from './SquarzHeuristic';

export class SquarzMinimax extends Minimax<SquarzMove, SquarzState, SquarzConfig> {

    public constructor() {
        const rules: SquarzRules = SquarzRules.get();
        super('Score', rules, new SquarzHeuristic(), new SquarzMoveGenerator(rules));
    }
}
