import { Heuristic, HeuristicBounds } from 'src/app/jscaip/AI/Minimax';
import { BoardValue } from 'src/app/jscaip/AI/BoardValue';
import { P4Move } from './P4Move';
import { P4State } from './P4State';
import { P4Config, P4Node, P4Rules } from './P4Rules';
import { Coord } from 'src/app/jscaip/Coord';
import { MGPOptional } from '@everyboard/lib';

export class P4Heuristic extends Heuristic<P4Move, P4State, BoardValue, P4Config> {

    public getBoardValue(node: P4Node, _config: MGPOptional<P4Config>): BoardValue {
        const state: P4State = node.gameState;
        let score: number = 0;
        for (let x: number = 0; x < state.getWidth(); x++) {
            // for every column, starting from the bottom of each column
            for (let y: number = state.getHeight() - 1; y !== -1 && state.board[y][x].isPlayer(); y--) {
                // while we haven't reached the top or an empty space
                const squareScore: number = P4Rules.get().P4_HELPER.getSquareScore(state, new Coord(x, y));
                score += squareScore;
            }
        }
        return BoardValue.of(score);
    }

    // When there exists a minimal/maximal value for a heuristic, it is useful to know it.
    public override getBounds(config: MGPOptional<P4Config>): MGPOptional<HeuristicBounds<BoardValue>> {
        // Experimentally, we hardly find a board with value >20 on a regular board.
        // So we'll count 1 per square
        const max: number = config.get().width * config.get().height;
        return MGPOptional.of({
            player0Max: BoardValue.ofSingle(max, 0),
            player1Max: BoardValue.ofSingle(0, max),
        });
    }

}
