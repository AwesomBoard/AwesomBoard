import { MGPOptional } from '@everyboard/lib';
import { QuartoState } from './QuartoState';
import { QuartoMove } from './QuartoMove';
import { QuartoPiece } from './QuartoPiece';
import { QuartoConfig, QuartoNode } from './QuartoRules';
import { MoveGenerator } from 'src/app/jscaip/AI/AI';

export class QuartoMoveGenerator extends MoveGenerator<QuartoMove, QuartoState, QuartoConfig> {

    public override getListMoves(node: QuartoNode, _config: MGPOptional<QuartoConfig>): QuartoMove[] {
        const listMoves: QuartoMove[] = [];

        const state: QuartoState = node.gameState;

        const board: QuartoPiece[][] = state.getCopiedBoard();
        const pawns: Array<QuartoPiece> = state.getRemainingPieces();
        const inHand: QuartoPiece = state.pieceInHand;

        let nextBoard: QuartoPiece[][];

        for (let y: number = 0; y < 4; y++) {
            for (let x: number = 0; x < 4; x++) {
                if (board[y][x] === QuartoPiece.EMPTY) {
                    nextBoard = state.getCopiedBoard();
                    nextBoard[y][x] = inHand; // the piece we have in hand is put in (x, y)
                    if (state.turn === 15) {
                        const move: QuartoMove = new QuartoMove(x, y, QuartoPiece.EMPTY);
                        listMoves.push(move);
                        return listMoves;
                    }
                    // For each empty square
                    for (const remainingPiece of pawns) { // the piece we will give
                        const move: QuartoMove = new QuartoMove(x, y, remainingPiece); // this is the move
                        listMoves.push(move);
                    }
                }
            }
        }
        return listMoves;
    }
}
