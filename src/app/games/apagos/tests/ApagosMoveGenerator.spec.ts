/* eslint-disable max-lines-per-function */
import { ApagosMove } from '../ApagosMove';
import { ApagosMoveGenerator } from '../ApagosMoveGenerator';
import { ApagosNode, ApagosRules } from '../ApagosRules';
import { ApagosState } from '../ApagosState';
import { NoConfig } from 'src/app/jscaip/RulesConfigUtil';

describe('ApagosMoveGenerator', () => {

    let moveGenerator: ApagosMoveGenerator;
    const defaultConfig: NoConfig = ApagosRules.get().getDefaultRulesConfig();

    beforeEach(() => {
        moveGenerator = new ApagosMoveGenerator();
    });

    it('should have all 8 drop as possible move at first turn', () => {
        // Given initial node
        const initialState: ApagosState = ApagosRules.get().getInitialState();
        const node: ApagosNode = new ApagosNode(initialState);

        // When listing the moves
        const moves: ApagosMove[] = moveGenerator.getListMoves(node, defaultConfig);

        // Then there should be 8 drops
        expect(moves.length).toBe(8);
        const isThereTransfer: boolean = moves.some((move: ApagosMove) => move.isDrop() === false);
        expect(isThereTransfer).toBeFalse();
    });

});
