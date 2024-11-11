import { MGPOptional } from '@everyboard/lib';
import { MoveGenerator } from 'src/app/jscaip/AI/AI';
import { CheckersMove } from './CheckersMove';
import { AbstractCheckersRules, CheckersConfig, CheckersNode } from './AbstractCheckersRules';
import { CheckersState } from './CheckersState';

export class CheckersMoveGenerator extends MoveGenerator<CheckersMove, CheckersState, CheckersConfig> {

    public constructor(private readonly rules: AbstractCheckersRules) {
        super();
    }

    public override getListMoves(node: CheckersNode, config: MGPOptional<CheckersConfig>): CheckersMove[] {
        const captures: CheckersMove[] = this.rules.getLegalCaptures(node.gameState, config.get());
        if (captures.length > 0) {
            return captures;
        } else {
            return this.rules.getSteps(node.gameState, config.get());
        }
    }

}
