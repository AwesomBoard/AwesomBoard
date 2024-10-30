import { MGPOptional, Utils } from '@everyboard/lib';
import { Heuristic } from './Minimax';
import { EmptyRulesConfig, RulesConfig } from '../RulesConfigUtil';
import { BoardValue } from './BoardValue';
import { Coord } from '../Coord';
import { Move } from '../Move';
import { GameState } from '../state/GameState';
import { Player } from '../Player';

/**
 * Represents possible alignment configurations
 **/
export class AlignmentStatus {

    // There's no particular alignment
    public static NOTHING: AlignmentStatus = new AlignmentStatus('NOTHING');

    // The player could win at this turn
    public static PRE_VICTORY: AlignmentStatus = new AlignmentStatus('PRE_VICTORY');

    // The game is finished with a victory
    public static VICTORY: AlignmentStatus = new AlignmentStatus('VICTORY');

    private constructor(public readonly name: string) {}

    // Convert to a board value (only for heuristics, will not consider victories)
    public toBoardValue(turn: number): BoardValue {
        if (this === AlignmentStatus.NOTHING) {
            return BoardValue.of(0);
        } else {
            Utils.assert(this === AlignmentStatus.PRE_VICTORY, 'alignment status can only be pre-victory or default');
            const player: Player = Player.of(turn % 2);
            return BoardValue.of(player.getPreVictory());
        }
    }

}

export interface BoardInfo {
    status: AlignmentStatus,
    victory: MGPOptional<Coord[]>,
    preVictory: MGPOptional<Coord>,
    sum: number,
}

export abstract class AlignmentHeuristic<M extends Move,
                                         S extends GameState,
                                         V,
                                         C extends RulesConfig = EmptyRulesConfig>
    extends Heuristic<M, S, BoardValue, C>
{

    public calculateBoardValue(move: M, state: S): BoardInfo {
        this.startSearchingVictorySources();
        const boardInfo: BoardInfo = {
            status: AlignmentStatus.NOTHING,
            victory: MGPOptional.empty(),
            preVictory: MGPOptional.empty(),
            sum: 0,
        };
        while (this.hasNextVictorySource()) {
            const victorySource: V = this.getNextVictorySource();
            let newBoardInfo: BoardInfo;
            if (boardInfo.status === AlignmentStatus.PRE_VICTORY) {
                newBoardInfo = this.searchVictoryOnly(victorySource, move, state);
            } else {
                newBoardInfo = this.getBoardInfo(victorySource, move, state, boardInfo);
            }
            if (newBoardInfo.status === AlignmentStatus.VICTORY) {
                return newBoardInfo;
            }
            boardInfo.status = newBoardInfo.status;
            boardInfo.sum = boardInfo.sum + newBoardInfo.sum;
            if (boardInfo.preVictory.isAbsent()) {
                boardInfo.preVictory = newBoardInfo.preVictory;
            }
        }
        return boardInfo;
    }

    public abstract startSearchingVictorySources(): void;

    public abstract hasNextVictorySource(): boolean;

    public abstract getNextVictorySource(): V;

    public abstract searchVictoryOnly(victorySource: V, move: M, state: S): BoardInfo;

    public abstract getBoardInfo(victorySource: V, move: M, state: S, boardInfo: BoardInfo): BoardInfo;
}
