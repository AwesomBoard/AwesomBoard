import { GameStateWithTable } from 'src/app/jscaip/state/GameStateWithTable';
import { Table, TableUtils } from 'src/app/jscaip/TableUtils';
import { Player } from 'src/app/jscaip/Player';
import { PlayerNumberMap } from 'src/app/jscaip/PlayerMap';
import { Coord } from 'src/app/jscaip/Coord';

export class MancalaState extends GameStateWithTable<number> {

    public static of(state: MancalaState, board: Table<number>): MancalaState {
        return new MancalaState(board,
                                state.turn,
                                state.getScoresCopy());
    }

    public constructor(b: Table<number>,
                       turn: number,
                       public readonly scores: PlayerNumberMap)
    {
        super(b, turn);
    }

    public setPieceAt(coord: Coord, value: number): MancalaState {
        return GameStateWithTable.setPieceAt(this,
                                             coord,
                                             value,
                                             MancalaState.of);
    }

    public feedStore(player: Player): MancalaState {
        const newScore: PlayerNumberMap = this.getScoresCopy();
        newScore.add(player, 1);
        return new MancalaState(this.getCopiedBoard(),
                                this.turn,
                                newScore);
    }

    public feed(coord: Coord): MancalaState { // TODO FOR REVIEW: genre là par exemple, feed(coord) seems fine as hell
        return this.addPieceAt(coord, 1); // TODO FOR REVIEW: et là en l'absence de addPiece(x, y) addPiece is super fine je dirais
        // TODO FOR REVIEW: pour moi le "at" est surtout pour distinguer atXY du At au lieu davoir blabla et blablaAt
        // TODO FOR REVIEW: ouais d'ailleurs en fait on a getBlablaAt(coord) et getBlablaAtXY(x, y) donc mmh...
    }

    public addPieceAt(coord: Coord, value: number): MancalaState {
        const previousValue: number = this.getPieceAt(coord);
        return this.setPieceAt(coord, previousValue + value);
    }

    public getTotalRemainingSeeds(): number {
        return TableUtils.sum(this.board);
    }

    public getScoresCopy(): PlayerNumberMap {
        return this.scores.getCopy();
    }

    /**
     * @param player the player that'll win point
     * @param coord the coord that'll get empty
     * @returns the resulting state in which 'player' emptied 'coord' to win all its seeds as point
     */
    public capture(player: Player, coord: Coord): MancalaState {
        const capturedSeeds: number = this.getPieceAt(coord);
        const newScores: PlayerNumberMap = this.getScoresCopy();
        newScores.add(player, capturedSeeds);
        const result: MancalaState = new MancalaState(this.getCopiedBoard(),
                                                      this.turn,
                                                      newScores);
        return result.setPieceAt(coord, 0);
    }

    public equals(other: MancalaState): boolean {
        if (TableUtils.equals(this.board, other.board) === false) return false;
        if (this.scores.equals(other.scores) === false) return false;
        return this.turn === other.turn;
    }

    public getCurrentPlayerY(): number {
        return this.getCurrentOpponent().getValue();
    }

    public getOpponentY(): number {
        return this.getCurrentPlayer().getValue();
    }

}
