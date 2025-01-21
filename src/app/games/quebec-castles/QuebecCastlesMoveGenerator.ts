import { MGPOptional } from '@everyboard/lib';

import { MoveGenerator } from 'src/app/jscaip/AI/AI';
import { QuebecCastlesDrop, QuebecCastlesMove } from './QuebecCastlesMove';
import { QuebecCastlesConfig, QuebecCastlesNode, QuebecCastlesRules } from './QuebecCastlesRules';
import { QuebecCastlesState } from './QuebecCastlesState';
import { Player, PlayerOrNone } from 'src/app/jscaip/Player';

export class QuebecCastlesMoveGenerator extends MoveGenerator<QuebecCastlesMove,
                                                              QuebecCastlesState,
                                                              QuebecCastlesConfig>
{

    public override getListMoves(node: QuebecCastlesNode, optionalConfig: MGPOptional<QuebecCastlesConfig>)
    : QuebecCastlesMove[]
    {
        const state: QuebecCastlesState = node.gameState;
        const config: QuebecCastlesConfig = optionalConfig.get();
        if (QuebecCastlesRules.get().isDropPhase(state, config)) {
            return this.getDropMoves(state, config);
        } else {
            return this.getNormalMoves(state, config);
        }
    }
    // TODO: if available space === number of soldier to put --> autofill
    // TODO: show droppable territory else
    public getDropMoves(state: QuebecCastlesState, config: QuebecCastlesConfig): QuebecCastlesMove[] {
        const player: Player = state.getCurrentPlayer();
        const moves: QuebecCastlesMove[] = [];
        for (const dropCoord of QuebecCastlesRules.get().getLegalDropCoords(player, config)) {
            const piece: PlayerOrNone = state.getPieceAt(dropCoord);
            if (piece.isNone() && state.thrones.get(player).equalsValue(dropCoord) === false) {
                moves.push(new QuebecCastlesDrop([dropCoord]));
            }
        }
        return moves;
    }

    public getNormalMoves(state: QuebecCastlesState, config: QuebecCastlesConfig): QuebecCastlesMove[] {
        const player: Player = state.getCurrentPlayer();
        const moves: QuebecCastlesMove[] = [];
        for (const coordAndContent of state.getCoordsAndContents()) {
            if (coordAndContent.content.equals(player)) {
                const movesForCoord: QuebecCastlesMove[] =
                    QuebecCastlesRules.get().getPossibleMoveFor(coordAndContent.coord, state);
                moves.push(...movesForCoord);
            }
        }
        return moves;
    }
}
