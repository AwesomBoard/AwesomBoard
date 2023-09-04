import { Table } from 'src/app/utils/ArrayUtils';
import { TaflPawn } from '../TaflPawn';
import { TaflState } from '../TaflState';

export class BrandhubState extends TaflState {

    public static getInitialState(): BrandhubState {
        const _: TaflPawn = TaflPawn.UNOCCUPIED;
        const x: TaflPawn = TaflPawn.PLAYER_ZERO_PAWN;
        const i: TaflPawn = TaflPawn.PLAYER_ONE_PAWN;
        const A: TaflPawn = TaflPawn.PLAYER_ONE_KING;
        const board: Table<TaflPawn> = [
            [_, _, _, x, _, _, _],
            [_, _, _, x, _, _, _],
            [_, _, _, i, _, _, _],
            [x, x, i, A, i, x, x],
            [_, _, _, i, _, _, _],
            [_, _, _, x, _, _, _],
            [_, _, _, x, _, _, _],
        ];
        return new BrandhubState(board, 0);
    }
    public of(board: Table<TaflPawn>, turn: number): this {
        return new BrandhubState(board, turn) as this;
    }
}
