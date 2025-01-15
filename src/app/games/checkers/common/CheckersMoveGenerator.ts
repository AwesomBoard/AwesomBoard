import { ArrayUtils, MGPOptional } from '@everyboard/lib';

import { MoveGenerator } from 'src/app/jscaip/AI/AI';
import { CheckersMove } from './CheckersMove';
import { AbstractCheckersRules, CheckersConfig, CheckersNode } from './AbstractCheckersRules';
import { CheckersState } from './CheckersState';

export class CheckersMoveGenerator extends MoveGenerator<CheckersMove, CheckersState, CheckersConfig> {

    public constructor(private readonly rules: AbstractCheckersRules) {
        super();
    }

    public override getListMoves(node: CheckersNode, config: MGPOptional<CheckersConfig>): CheckersMove[] {
        const captures: CheckersMove[] = this.getLegalCaptures(node.gameState, config.get());
        if (captures.length > 0) {
            return captures;
        } else {
            return this.rules.getSteps(node.gameState, config.get());
        }
    }

    public getLegalCaptures(state: CheckersState, config: CheckersConfig): CheckersMove[] {
        const possibleCaptures: CheckersMove[] = this.rules.getCompleteCaptures(state, config);
        if (config.mustMakeMaximalCapture) {
            return ArrayUtils.maximumsBy(possibleCaptures, (m: CheckersMove) => m.coords.size());
        } else {
            return possibleCaptures;
        }
    }

}
