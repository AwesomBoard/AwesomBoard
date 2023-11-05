/* eslint-disable max-lines-per-function */
import { Table } from 'src/app/utils/ArrayUtils';
import { QuartoMove } from '../QuartoMove';
import { QuartoMoveGenerator } from '../QuartoMoveGenerator';
import { QuartoPiece } from '../QuartoPiece';
import { QuartoNode } from '../QuartoRules';
import { QuartoState } from '../QuartoState';

describe('QuartoMoveGenerator', () => {

    let moveGenerator: QuartoMoveGenerator;

    beforeEach(() => {
        moveGenerator = new QuartoMoveGenerator();
    });
    it('should only propose one move at last turn', () => {
        // Given a board at the last turn
        const board: Table<QuartoPiece> = [
            [QuartoPiece.AABB, QuartoPiece.AAAB, QuartoPiece.ABBA, QuartoPiece.BBAA],
            [QuartoPiece.BBAB, QuartoPiece.BAAA, QuartoPiece.BBBA, QuartoPiece.ABBB],
            [QuartoPiece.BABA, QuartoPiece.BBBB, QuartoPiece.ABAA, QuartoPiece.AABA],
            [QuartoPiece.AAAA, QuartoPiece.ABAB, QuartoPiece.BABB, QuartoPiece.EMPTY],
        ];
        const state: QuartoState = new QuartoState(board, 15, QuartoPiece.BAAB);
        const node: QuartoNode = new QuartoNode(state);
        const move: QuartoMove = new QuartoMove(3, 3, QuartoPiece.EMPTY);

        // When listing the moves
        const possibleMoves: QuartoMove[] = moveGenerator.getListMoves(node);

        // Then only one move should be listed
        expect(possibleMoves.length).toBe(1);
        expect(possibleMoves[0]).toEqual(move);
    });
});
