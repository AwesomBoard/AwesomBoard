import { DummyHeuristic, Minimax } from 'src/app/jscaip/AI/Minimax';
import { EncapsuleMove } from './EncapsuleMove';
import { EncapsuleMoveGenerator } from './EncapsuleMoveGenerator';
import { EncapsuleConfig, EncapsuleLegalityInformation, EncapsuleRules } from './EncapsuleRules';
import { EncapsuleState } from './EncapsuleState';

export class EncapsuleDummyMinimax
    extends Minimax<EncapsuleMove, EncapsuleState, EncapsuleConfig, EncapsuleLegalityInformation> {

    public constructor() {
        super($localize`Dummy`,
              EncapsuleRules.get(),
              new DummyHeuristic(),
              new EncapsuleMoveGenerator());
    }

}
