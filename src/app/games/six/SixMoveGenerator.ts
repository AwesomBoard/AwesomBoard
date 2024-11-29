import { Coord } from 'src/app/jscaip/Coord';
import { Player } from 'src/app/jscaip/Player';
import { MGPMap, MGPOptional, Set } from '@everyboard/lib';
import { SixState } from './SixState';
import { SixMove } from './SixMove';
import { SixConfig, SixNode, SixRules } from './SixRules';
import { Debug } from 'src/app/utils/Debug';
import { MoveGenerator } from 'src/app/jscaip/AI/AI';
import { CoordSet } from 'src/app/jscaip/CoordSet';

@Debug.log
export class SixMoveGenerator extends MoveGenerator<SixMove, SixState, SixConfig> {

    public override getListMoves(node: SixNode, config: MGPOptional<SixConfig>): SixMove[] {
        const legalLandings: Coord[] = SixRules.getLegalLandings(node.gameState);
        const totalPieceDroppable: number = 2 * config.get().piecePerPlayer;
        if (node.gameState.turn < totalPieceDroppable) {
            return this.getListDrops(legalLandings);
        } else {
            return this.getMovements(node.gameState, legalLandings);
        }
    }
    protected getMovements(state: SixState, legalLandings: Coord[]): SixMove[] {
        const allPieces: MGPMap<Player, Set<Coord>> = state.getPieces().reverse();
        const currentPlayer: Player = state.getCurrentPlayer();
        const playerPieces: Set<Coord> = allPieces.get(currentPlayer).get();
        return this.getMovementsFrom(state, playerPieces, legalLandings);
    }
    protected getMovementsFrom(state: SixState, starts: Set<Coord>, landings: Coord[]): SixMove[] {
        const deplacements: SixMove[] = [];
        for (const start of starts) {
            for (const landing of landings) {
                const move: SixMove = SixMove.ofMovement(start, landing);
                if (state.isCoordConnected(landing, MGPOptional.of(start))) {
                    const stateAfterMove: SixState = state.movePiece(move);
                    const groupsAfterMove: Set<CoordSet> = stateAfterMove.getGroups();
                    if (SixRules.isSplit(groupsAfterMove)) {
                        const largestGroups: Set<CoordSet> =
                            SixRules.getLargestGroups(groupsAfterMove);
                        if (largestGroups.size() === 1) {
                            deplacements.push(SixMove.ofMovement(start, landing));
                        } else {
                            for (const group of largestGroups) {
                                const subGroup: Coord = group.getAnyElement().get();
                                const cut: SixMove = SixMove.ofCut(start, landing, subGroup);
                                deplacements.push(cut);
                            }
                        }
                    } else {
                        deplacements.push(move);
                    }
                }
            }
        }
        return deplacements;
    }
    private getListDrops(legalLandings: Coord[]): SixMove[] {
        const drops: SixMove[] = [];
        for (const landing of legalLandings) {
            const drop: SixMove = SixMove.ofDrop(landing);
            drops.push(drop);
        }
        return drops;
    }
}
