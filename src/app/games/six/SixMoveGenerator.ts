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

    public constructor(private readonly rules: SixRules) {
        super();
    }

    public override getListMoves(node: SixNode, config: MGPOptional<SixConfig>): SixMove[] {
        const legalLandings: Coord[] = this.rules.getLegalLandings(node.gameState);
        const totalDroppablePieces: number = 2 * config.get().piecesPerPlayer;
        if (node.gameState.turn < totalDroppablePieces) {
            return this.getListDrops(legalLandings);
        } else {
            return this.getTranslations(node.gameState, legalLandings);
        }
    }

    protected getTranslations(state: SixState, legalLandings: Coord[]): SixMove[] {
        const allPieces: MGPMap<Player, Set<Coord>> = state.getPieces().reverse();
        const currentPlayer: Player = state.getCurrentPlayer();
        const playerPieces: Set<Coord> = allPieces.get(currentPlayer).get();
        return this.getTranslationsFrom(state, playerPieces, legalLandings);
    }

    protected getTranslationsFrom(state: SixState, starts: Set<Coord>, landings: Coord[]): SixMove[] {
        const translations: SixMove[] = [];
        for (const start of starts) {
            for (const landing of landings) {
                const move: SixMove = SixMove.ofTranslation(start, landing);
                if (state.isCoordConnected(landing, MGPOptional.of(start))) {
                    const stateAfterMove: SixState = state.movePiece(move);
                    const groupsAfterMove: Set<CoordSet> = stateAfterMove.getGroups();
                    if (this.rules.isSplit(groupsAfterMove)) {
                        const largestGroups: Set<CoordSet> = this.rules.getLargestGroups(groupsAfterMove);
                        if (largestGroups.size() === 1) {
                            translations.push(SixMove.ofTranslation(start, landing));
                        } else {
                            for (const group of largestGroups) {
                                const subGroup: Coord = group.getAnyElement().get();
                                const cut: SixMove = SixMove.ofCut(start, landing, subGroup);
                                translations.push(cut);
                            }
                        }
                    } else {
                        translations.push(move);
                    }
                }
            }
        }
        return translations;
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
