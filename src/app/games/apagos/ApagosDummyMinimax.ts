import { Minimax } from 'src/app/jscaip/Minimax';
import { BoardValue } from 'src/app/jscaip/BoardValue';
import { PlayerOrNone } from 'src/app/jscaip/Player';
import { GameStatus } from 'src/app/jscaip/Rules';
import { ApagosMove } from './ApagosMove';
import { ApagosNode, ApagosRules } from './ApagosRules';
import { ApagosState } from './ApagosState';

export class ApagosDummyMinimax extends Minimax<ApagosMove, ApagosState> {

    public getListMoves(node: ApagosNode): ApagosMove[] {
        const state: ApagosState = node.gameState;
        function isLegal(move: ApagosMove): boolean {
            return ApagosRules.get().isLegal(move, state).isSuccess();
        }
        return ApagosMove.ALL_MOVES.filter(isLegal);
    }
    public getBoardValue(node: ApagosNode): BoardValue {
        const gameStatus: GameStatus = ApagosRules.get().getGameStatus(node);
        if (gameStatus.isEndGame) {
            return BoardValue.fromWinner(gameStatus.winner);
        }
        const levelThreeDominant: PlayerOrNone = node.gameState.board[3].getDominatingPlayer();
        if (levelThreeDominant.isPlayer()) {
            return new BoardValue(levelThreeDominant.getScoreModifier());
        } else {
            return new BoardValue(0);
        }
    }
}
