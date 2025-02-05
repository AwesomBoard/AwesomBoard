import { Coord } from 'src/app/jscaip/Coord';
import { Player } from 'src/app/jscaip/Player';
import { Set, MGPMap } from '@everyboard/lib';
import { SixState } from './SixState';
import { SixMove } from './SixMove';
import { SixMoveGenerator } from './SixMoveGenerator';
import { SixHeuristic } from './SixHeuristic';
import { CoordSet } from 'src/app/jscaip/CoordSet';
import { AlignmentStatus, BoardInfo } from 'src/app/jscaip/AI/AlignmentHeuristic';

export class SixFilteredMoveGenerator extends SixMoveGenerator {

    private readonly heuristic: SixHeuristic = new SixHeuristic();

    protected override getTranslations(state: SixState, legalLandings: Coord[]): SixMove[] {
        const safelyMovablePieceOrFirstOne: CoordSet = this.getSafelyMovablePieceOrFirstOne(state);
        return this.getTranslationsFrom(state, safelyMovablePieceOrFirstOne, legalLandings);
    }

    private getSafelyMovablePieceOrFirstOne(state: SixState): CoordSet {
        const allPieces: MGPMap<Player, Set<Coord>> = state.getPieces().reverse();
        const currentPlayer: Player = state.getCurrentPlayer();
        const playerPieces: Set<Coord> = allPieces.get(currentPlayer).get();
        const firstPiece: Coord = playerPieces.getAnyElement().get();

        const safePieces: Coord[] = [];
        for (const playerPiece of playerPieces) {
            if (this.isPieceBlockingAVictory(state, playerPiece) === false) {
                safePieces.push(playerPiece);
            }
        }
        if (safePieces.length === 0) {
            return new CoordSet([firstPiece]);
        } else {
            return new CoordSet(safePieces);
        }
    }

    private isPieceBlockingAVictory(state: SixState, playerPiece: Coord): boolean {
        const hypotheticalState: SixState = state.switchPiece(playerPiece);

        const fakeDropMove: SixMove = SixMove.ofDrop(playerPiece);
        this.heuristic.startSearchingVictorySources();
        while (this.heuristic.hasNextVictorySource()) {
            this.heuristic.currentVictorySource = this.heuristic.getNextVictorySource();
            const boardInfo: BoardInfo = this.heuristic.searchVictoryOnly(this.heuristic.currentVictorySource,
                                                                          fakeDropMove,
                                                                          hypotheticalState);
            if (boardInfo.status === AlignmentStatus.VICTORY) {
                return true;
            }
        }
        return false;
    }

}
