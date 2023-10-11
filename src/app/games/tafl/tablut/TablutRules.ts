import { GameNode } from 'src/app/jscaip/GameNode';
import { tablutConfig } from './tablutConfig';
import { TablutMove } from './TablutMove';
import { TablutState } from './TablutState';
import { TaflRules } from '../TaflRules';
import { MGPOptional } from 'src/app/utils/MGPOptional';
import { TaflPawn } from '../TaflPawn';
import { Table } from 'src/app/utils/ArrayUtils';

export class TablutNode extends GameNode<TablutMove, TablutState> {}

export class TablutRules extends TaflRules<TablutMove, TablutState> {

    private static singleton: MGPOptional<TablutRules> = MGPOptional.empty();

    public static get(): TablutRules {
        if (TablutRules.singleton.isAbsent()) {
            TablutRules.singleton = MGPOptional.of(new TablutRules());
        }
        return TablutRules.singleton.get();
    }

    private constructor() {
        super(tablutConfig, TablutMove.from);
    }

    public getInitialState(): TablutState {
        const _: TaflPawn = TaflPawn.UNOCCUPIED;
        const O: TaflPawn = TaflPawn.INVADERS;
        const X: TaflPawn = TaflPawn.DEFENDERS;
        const A: TaflPawn = TaflPawn.PLAYER_ONE_KING;
        const board: Table<TaflPawn> = [
            [_, _, _, O, O, O, _, _, _],
            [_, _, _, _, O, _, _, _, _],
            [_, _, _, _, X, _, _, _, _],
            [O, _, _, _, X, _, _, _, O],
            [O, O, X, X, A, X, X, O, O],
            [O, _, _, _, X, _, _, _, O],
            [_, _, _, _, X, _, _, _, _],
            [_, _, _, _, O, _, _, _, _],
            [_, _, _, O, O, O, _, _, _],
        ];

        return new TablutState(board, 0);
    }
}
