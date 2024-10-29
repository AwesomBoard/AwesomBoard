import { MoveGenerator } from 'src/app/jscaip/AI/AI';
import { Coord } from 'src/app/jscaip/Coord';
import { Player } from 'src/app/jscaip/Player';
import { DiamMove, DiamMoveDrop, DiamMoveShift } from './DiamMove';
import { DiamPiece } from './DiamPiece';
import { DiamNode, DiamRules } from './DiamRules';
import { DiamState } from './DiamState';
import { NoConfig } from 'src/app/jscaip/RulesConfigUtil';

export class DiamMoveGenerator extends MoveGenerator<DiamMove, DiamState> {

    public override getListMoves(node: DiamNode, _config: NoConfig): DiamMove[] {
        const state: DiamState = node.gameState;
        const drops: DiamMove[] = this.getListDrops(state);
        const shifts: DiamMove[] = this.getListShifts(state);
        return drops.concat(shifts);
    }
    private getListShifts(state: DiamState): DiamMoveShift[] {
        const shifts: DiamMoveShift[] = [];
        const shiftSources: Coord[] = this.getShiftSources(state);
        for (const shiftSource of shiftSources) {
            for (const shift of [new DiamMoveShift(shiftSource, 'clockwise'), new DiamMoveShift(shiftSource, 'counterclockwise')]) {
                if (DiamRules.get().shiftHeightValidity(shift, state).isSuccess()) {
                    shifts.push(shift);
                }
            }
        }
        return shifts;
    }
    private getListDrops(state: DiamState): DiamMoveDrop[] {
        const remainingPieces: DiamPiece[] = this.getRemainingPiecesForCurrentPlayer(state);
        const drops: DiamMoveDrop[] = [];
        for (let x: number = 0; x < DiamState.WIDTH; x++) {
            for (const piece of remainingPieces) {
                const drop: DiamMoveDrop = new DiamMoveDrop(x, piece);
                if (DiamRules.get().dropHeightValidity(drop, state).isSuccess()) {
                    drops.push(drop);
                }
            }
        }
        return drops;
    }
    private getRemainingPiecesForCurrentPlayer(state: DiamState): DiamPiece[] {
        const pieces: DiamPiece[] = [];
        for (const piece of DiamPiece.PLAYER_PIECES) {
            if (this.currentPlayerCanDropPiece(state, piece)) {
                pieces.push(piece);
            }
        }
        return pieces;
    }
    private currentPlayerCanDropPiece(state: DiamState, piece: DiamPiece): boolean {
        return state.getCurrentPlayer() === piece.owner &&
               state.getRemainingPiecesOf(piece) > 0;
    }
    private getShiftSources(state: DiamState): Coord[] {
        const sources: Coord[] = [];
        const player: Player = state.getCurrentPlayer();
        for (let y: number = 0; y < DiamState.HEIGHT; y++) {
            for (let x: number = 0; x < DiamState.WIDTH; x++) {
                if (state.getPieceAtXY(x, y).owner === player) {
                    sources.push(new Coord(x, y));
                }
            }
        }
        return sources;
    }
}
