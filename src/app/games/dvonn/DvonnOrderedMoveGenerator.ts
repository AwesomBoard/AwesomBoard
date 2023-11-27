import { DvonnState } from './DvonnState';
import { DvonnNode } from './DvonnRules';
import { DvonnPieceStack } from './DvonnPieceStack';
import { Player } from 'src/app/jscaip/Player';
import { DvonnMove } from './DvonnMove';
import { ArrayUtils, Utils } from '@everyboard/lib';
import { DvonnMoveGenerator } from './DvonnMoveGenerator';

export class DvonnOrderedMoveGenerator extends DvonnMoveGenerator {

    public override getListMoves(node: DvonnNode): DvonnMove[] {
        const state: DvonnState = node.gameState;
        const moves: DvonnMove[] = super.getListMoves(node);

        // Sort the moves by the size of pieces that they add to the player
        const opponent: Player = state.getCurrentOpponent();
        ArrayUtils.sortByDescending(moves, (move: DvonnMove): number => {
            // We can't have DvonnMove.PASS here, because it would be the single move of the list
            Utils.assert(move !== DvonnMove.PASS, 'Cannot sort with DvonnMove.PASS');

            const stack: DvonnPieceStack = state.getPieceAt(move.getEnd());
            const opponentPieces: number = stack.belongsTo(opponent) ? stack.getSize() : 0;
            return opponentPieces;
        });
        return moves;
    }
}
