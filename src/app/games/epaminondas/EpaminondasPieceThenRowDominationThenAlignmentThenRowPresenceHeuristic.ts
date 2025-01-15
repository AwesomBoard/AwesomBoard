import { Coord } from 'src/app/jscaip/Coord';
import { Ordinal } from 'src/app/jscaip/Ordinal';
import { Player, PlayerOrNone } from 'src/app/jscaip/Player';
import { BoardValue } from 'src/app/jscaip/AI/BoardValue';
import { EpaminondasConfig, EpaminondasNode } from './EpaminondasRules';
import { MGPOptional } from '@everyboard/lib';
import { EpaminondasHeuristic } from './EpaminondasHeuristic';
import { PlayerNumberMap } from 'src/app/jscaip/PlayerMap';

export class EpaminondasPieceThenRowDominationThenAlignmentThenRowPresenceHeuristic extends EpaminondasHeuristic {

    public getBoardValue(node: EpaminondasNode, _config: MGPOptional<EpaminondasConfig>): BoardValue {
        const width: number = node.gameState.getWidth();
        const height: number = node.gameState.getHeight();
        let pieces: number = 0;
        let alignement: number = 0;
        let rowDomination: number = 0;
        let presence: number = 0;
        for (let y: number = 0; y < height; y++) {
            let row: number = 0;
            const wasPresent: PlayerNumberMap = PlayerNumberMap.of(0, 0);
            for (let x: number = 0; x < width; x++) {
                const coord: Coord = new Coord(x, y);
                const player: PlayerOrNone = node.gameState.getPieceAt(coord);
                if (player.isPlayer()) {
                    const mod: number = player.getScoreModifier();
                    pieces += mod;
                    wasPresent.put(player, mod);
                    row += mod;
                    for (const dir of [Ordinal.UP_LEFT, Ordinal.UP, Ordinal.UP_RIGHT]) {
                        let neighbor: Coord = coord.getNext(dir, 1);
                        while (node.gameState.hasPieceAt(neighbor, player)) {
                            alignement += mod;
                            neighbor = neighbor.getNext(dir, 1);
                        }
                    }
                }
            }
            if (row !== 0) {
                rowDomination += Math.abs(row) / row;
            }
            presence += wasPresent.get(Player.ZERO) + wasPresent.get(Player.ONE);
        }
        return BoardValue.multiMetric([
            pieces,
            rowDomination,
            alignement,
            presence,
        ]);
    }

}
