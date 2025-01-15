import { MGPOptional } from 'lib/dist';
import { Coord } from 'src/app/jscaip/Coord';
import { Player, PlayerOrNone } from 'src/app/jscaip/Player';
import { PlayerMap } from 'src/app/jscaip/PlayerMap';
import { GameStateWithTable } from 'src/app/jscaip/state/GameStateWithTable';
import { PlayerOrNoneGameStateWithTable } from 'src/app/jscaip/state/PlayerOrNoneGameStateWithTable';
import { Table } from 'src/app/jscaip/TableUtils';

export class QuebecCastlesState extends PlayerOrNoneGameStateWithTable {

    public static of(oldState: QuebecCastlesState, newBoard: Table<PlayerOrNone>): QuebecCastlesState {
        return new QuebecCastlesState(newBoard, oldState.turn, oldState.thrones);
    }

    public constructor(board: Table<PlayerOrNone>,
                       turn: number,
                       public readonly thrones: PlayerMap<MGPOptional<Coord>>)
    {
        super(board, turn);
        this.thrones.makeImmutable();
    }

    public incrementTurn(): QuebecCastlesState {
        return new QuebecCastlesState(this.getCopiedBoard(), this.turn + 1, this.thrones);
    }

    public setPieceAt(coord: Coord, value: PlayerOrNone): QuebecCastlesState {
        return GameStateWithTable.setPieceAt(this,
                                             coord,
                                             value,
                                             QuebecCastlesState.of);
    }

    public isThroneAt(coord: Coord): boolean {
        const throneZero: MGPOptional<Coord> = this.thrones.get(Player.ZERO);
        const throneOne: MGPOptional<Coord> = this.thrones.get(Player.ONE);
        return throneZero.equalsValue(coord) ||
               throneOne.equalsValue(coord);
    }

}
