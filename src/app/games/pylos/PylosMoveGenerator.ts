import { PylosCoord } from './PylosCoord';
import { PylosMove } from './PylosMove';
import { PylosState } from './PylosState';
import { PylosNode, PylosRules } from './PylosRules';
import { Set } from '@everyboard/lib';
import { MoveGenerator } from 'src/app/jscaip/AI/AI';
import { NoConfig } from 'src/app/jscaip/RulesConfigUtil';

export class PylosMoveGenerator extends MoveGenerator<PylosMove, PylosState> {

    public override getListMoves(node: PylosNode, _config: NoConfig): PylosMove[] {
        const state: PylosState = node.gameState;
        const result: PylosMove[] = [];
        const stateInfo: { freeToMove: PylosCoord[]; landable: PylosCoord[]; } = PylosRules.getStateInfo(state);
        const climbings: PylosMove[] = PylosRules.getClimbingMoves(stateInfo);
        const drops: PylosMove[] = PylosRules.getDropMoves(stateInfo);
        const moves: PylosMove[] = climbings.concat(drops);
        for (const move of moves) {
            const postMoveState: PylosState = state.applyLegalMove(move, false);
            let possibleCaptures: Set<Set<PylosCoord>> = new Set();
            if (PylosRules.canCapture(postMoveState, move.landingCoord)) {
                possibleCaptures = PylosRules.getPossibleCaptures(postMoveState);
            } else {
                result.push(move);
            }
            for (const possiblesCapture of possibleCaptures) {
                const newMove: PylosMove = PylosMove.changeCapture(move, possiblesCapture.toList());
                result.push(newMove);
            }
        }
        return result;
    }
}
