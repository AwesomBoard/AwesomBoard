import { MGPOptional } from '@everyboard/lib';

import { Player } from 'src/app/jscaip/Player';
import { CheckersControlHeuristic } from './CheckersControlHeuristic';
import { CheckersConfig, CheckersNode } from './AbstractCheckersRules';
import { CheckersStack, CheckersState } from './CheckersState';
import { PlayerNumberTable } from 'src/app/jscaip/PlayerNumberTable';

export class CheckersControlPlusDominationHeuristic extends CheckersControlHeuristic {

    public override getMetrics(node: CheckersNode, config: MGPOptional<CheckersConfig>): PlayerNumberTable {
        const controlValue: PlayerNumberTable = this.getControlScore(node, config.get());
        const dominatingPiecesCount: PlayerNumberTable = this.getDominatedPieceScore(node);
        return controlValue.concat(dominatingPiecesCount);
    }

    private getDominatedPieceScore(node: CheckersNode): PlayerNumberTable {
        const dominatedPieces: PlayerNumberTable = PlayerNumberTable.of([0], [0]);
        const state: CheckersState = node.gameState;
        const width: number = state.getWidth();
        const height: number = state.getHeight();
        for (let y: number = 0; y < height; y++) {
            for (let x: number = 0; x < width; x++) {
                const square: CheckersStack = state.getPieceAtXY(x, y);
                if (square.getStackSize() > 0) {
                    const stackSize: number = square.getStackSize();
                    let pieceIndex: number = 0;
                    const commander: Player = square.getCommander().player;
                    while (pieceIndex < stackSize && square.get(pieceIndex).player === commander) {
                        pieceIndex++;
                    }
                    dominatedPieces.add(commander, 0, pieceIndex);
                }
            }
        }
        return dominatedPieces;
    }

}
