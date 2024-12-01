import { EncapsuleState } from './EncapsuleState';
import { MGPFallible, MGPOptional } from '@everyboard/lib';
import { Coord } from 'src/app/jscaip/Coord';
import { Player } from 'src/app/jscaip/Player';
import { EncapsuleMove } from './EncapsuleMove';
import { EncapsuleRules, EncapsuleNode, EncapsuleLegalityInformation, EncapsuleConfig } from './EncapsuleRules';
import { MoveGenerator } from 'src/app/jscaip/AI/AI';
import { EncapsulePiece } from './EncapsulePiece';

export class EncapsuleMoveGenerator extends MoveGenerator<EncapsuleMove, EncapsuleState, EncapsuleConfig> {

    public override getListMoves(node: EncapsuleNode, _config: MGPOptional<EncapsuleConfig>): EncapsuleMove[] {
        const moves: EncapsuleMove[] = [];
        const state: EncapsuleState = node.gameState;
        const currentPlayer: Player = state.getCurrentPlayer();
        const puttablePieces: number[] = state.getRemainingPiecesOfPlayer(currentPlayer).getKeyList();
        const width: number = state.getWidth();
        const height: number = state.getHeight();
        for (const coordAndContent of state.getCoordsAndContents()) {
            const coord: Coord = coordAndContent.coord;
            // each drop
            for (const pieceSize of puttablePieces) {
                const piece: EncapsulePiece = EncapsulePiece.ofSizeAndPlayer(pieceSize, currentPlayer);
                const move: EncapsuleMove = EncapsuleMove.ofDrop(piece, coord);
                const status: MGPFallible<EncapsuleLegalityInformation> = EncapsuleRules.get().isLegal(move, state);
                if (status.isSuccess()) {
                    moves.push(move);
                }
            }
            if (coordAndContent.content.belongsTo(currentPlayer)) {
                for (let ly: number = 0; ly < height; ly++) {
                    for (let lx: number = 0; lx < width; lx++) {
                        const landingCoord: Coord = new Coord(lx, ly);
                        if (landingCoord.equals(coord) === false) {
                            const newMove: EncapsuleMove = EncapsuleMove.ofMove(coord, landingCoord);
                            const status: MGPFallible<EncapsuleLegalityInformation> =
                                EncapsuleRules.get().isLegal(newMove, state);
                            if (status.isSuccess()) {
                                moves.push(newMove);
                            }
                        }
                    }
                }
            }
        }
        return moves;
    }
}
