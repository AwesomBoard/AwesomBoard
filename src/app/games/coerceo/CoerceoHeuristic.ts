import { Coord } from 'src/app/jscaip/Coord';
import { FourStatePiece } from 'src/app/jscaip/FourStatePiece';
import { Player } from 'src/app/jscaip/Player';
import { MGPMap } from '@everyboard/lib';
import { CoerceoMove } from './CoerceoMove';
import { CoerceoState } from './CoerceoState';
import { CoordSet } from 'src/app/jscaip/CoordSet';
import { PlayerMetricHeuristic } from 'src/app/jscaip/AI/Minimax';
import { PlayerNumberTable } from 'src/app/jscaip/PlayerNumberTable';
import { CoerceoConfig } from './CoerceoRules';

export abstract class CoerceoHeuristic extends PlayerMetricHeuristic<CoerceoMove, CoerceoState, CoerceoConfig> {

    public getPiecesMap(state: CoerceoState): MGPMap<Player, CoordSet> {
        const map: MGPMap<Player, CoordSet> = new MGPMap();
        const zeroPieces: Coord[] = [];
        const onePieces: Coord[] = [];
        for (const coordAndContent of state.getCoordsAndContents()) {
            const coord: Coord = coordAndContent.coord;
            const piece: FourStatePiece = state.getPieceAt(coord);
            if (piece === FourStatePiece.ZERO) {
                zeroPieces.push(coord);
            } else if (piece === FourStatePiece.ONE) {
                onePieces.push(coord);
            }
        }
        map.set(Player.ZERO, new CoordSet(zeroPieces));
        map.set(Player.ONE, new CoordSet(onePieces));
        return map;
    }

    protected getPiecesFreedomScore(state: CoerceoState): [number, number] {
        const piecesByFreedom: PlayerNumberTable = state.getPiecesByFreedom();
        return [
            this.getPlayerPiecesScore(piecesByFreedom.get(Player.ZERO).get()),
            this.getPlayerPiecesScore(piecesByFreedom.get(Player.ONE).get()),
        ];
    }

    private getPlayerPiecesScore(piecesScores: readonly number[]): number {
        // Since having exactly one freedom left is less advantageous, as more dangerous
        const capturableScore: number = 1;
        const safeScore: number = 3;
        return (safeScore * piecesScores[0]) +
            (capturableScore * piecesScores[1]) +
            (safeScore * piecesScores[2]) +
            (safeScore * piecesScores[3]);
    }

}
