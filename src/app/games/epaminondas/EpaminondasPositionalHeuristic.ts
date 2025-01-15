import { Coord } from 'src/app/jscaip/Coord';
import { Ordinal } from 'src/app/jscaip/Ordinal';
import { Heuristic } from 'src/app/jscaip/AI/Minimax';
import { BoardValue } from 'src/app/jscaip/AI/BoardValue';
import { Player } from 'src/app/jscaip/Player';
import { EpaminondasMove } from './EpaminondasMove';
import { EpaminondasState } from './EpaminondasState';
import { EpaminondasConfig, EpaminondasNode } from './EpaminondasRules';
import { MGPOptional } from '@everyboard/lib';

export class EpaminondasPositionalHeuristic
    extends Heuristic<EpaminondasMove, EpaminondasState, BoardValue, EpaminondasConfig>
{

    public getBoardValue(node: EpaminondasNode, _config: MGPOptional<EpaminondasConfig>): BoardValue {
        return BoardValue.of(this.getPieceCountThenSupportThenAdvancement(node.gameState));
    }

    private getPieceCountThenSupportThenAdvancement(state: EpaminondasState): number {
        const width: number = state.getWidth();
        const height: number = state.getHeight();
        const MAX_ADVANCEMENT_SCORE_TOTAL: number = 28 * width;
        const SCORE_BY_ALIGNMENT: number = MAX_ADVANCEMENT_SCORE_TOTAL + 1; // OLDLY 13
        const MAX_NUMBER_OF_ALIGNMENT: number = (24*16) + (4*15);
        const SCORE_BY_PIECE: number = (MAX_NUMBER_OF_ALIGNMENT * SCORE_BY_ALIGNMENT) + 1; // OLDLY 25*13
        let total: number = 0;
        for (const coordAndContent of state.getPlayerCoordsAndContent()) {
            const coord: Coord = coordAndContent.coord;
            const player: Player = coordAndContent.content;
            let avancement: number; // between 0 and 11
            let dirs: Ordinal[];
            if (player === Player.ZERO) {
                avancement = height - coord.y;
                dirs = [Ordinal.UP_LEFT, Ordinal.UP, Ordinal.UP_RIGHT];
            } else {
                avancement = coord.y + 1;
                dirs = [Ordinal.DOWN_LEFT, Ordinal.DOWN, Ordinal.DOWN_RIGHT];
            }
            const mod: number = player.getScoreModifier();
            total += avancement * mod;
            total += SCORE_BY_PIECE * mod;
            for (const dir of dirs) {
                let neighbor: Coord = coord.getNext(dir, 1);
                while (state.hasPieceAt(neighbor, player)) {
                    total += mod * SCORE_BY_ALIGNMENT;
                    neighbor = neighbor.getNext(dir, 1);
                }
            }
        }
        return total;
    }

}
