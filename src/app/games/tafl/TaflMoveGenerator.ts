import { TaflNode, TaflRules } from './TaflRules';
import { TaflState } from './TaflState';
import { TaflMove } from './TaflMove';
import { Player } from 'src/app/jscaip/Player';
import { ArrayUtils, MGPOptional } from '@everyboard/lib';
import { Coord } from 'src/app/jscaip/Coord';
import { Debug } from 'src/app/utils/Debug';
import { MoveGenerator } from 'src/app/jscaip/AI/AI';
import { TaflConfig } from './TaflConfig';

@Debug.log
export class TaflMoveGenerator<M extends TaflMove> extends MoveGenerator<M, TaflState, TaflConfig> {

    public constructor(private readonly rules: TaflRules<M>) {
        super();
    }

    public override getListMoves(node: TaflNode<M>, config: MGPOptional<TaflConfig>): M[] {
        const state: TaflState = node.gameState;
        const currentPlayer: Player = state.getCurrentPlayer();
        const listMoves: M[] = this.rules.getPlayerListMoves(currentPlayer, state, config.get());
        return this.orderMoves(state, listMoves, config.get());
    }

    public orderMoves(state: TaflState, listMoves: M[], config: TaflConfig): M[] {
        const king: Coord = this.rules.getKingCoord(state).get();
        const invader: Player = this.rules.getInvader(config);
        if (state.getCurrentPlayer() === invader) { // Invader
            ArrayUtils.sortByDescending(listMoves, (move: TaflMove) => {
                return - move.getEnd().getOrthogonalDistance(king);
            });
        } else {
            ArrayUtils.sortByDescending(listMoves, (move: TaflMove) => {
                if (move.getStart().equals(king)) {
                    if (state.isExternalThrone(move.getEnd()) === true) {
                        return 2;
                    } else {
                        return 1;
                    }
                } else {
                    return 0;
                }
            });
        }
        return listMoves;
    }

}
