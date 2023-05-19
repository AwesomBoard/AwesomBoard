/* eslint-disable max-lines-per-function */
import { P4Move } from 'src/app/games/p4/P4Move';
import { MGPNode } from '../MGPNode';
import { GameStatus, Rules } from '../Rules';
import { GameStateWithTable } from '../GameStateWithTable';
import { MGPOptional } from 'src/app/utils/MGPOptional';
import { MGPValidation } from '../../utils/MGPValidation';
import { Player } from '../Player';


class MyAbstractState extends GameStateWithTable<number> {

    public static getInitialState(): MyAbstractState {
        return new MyAbstractState([[]], 0);
    }
}

class AbstractNode extends MGPNode<Rules<P4Move, MyAbstractState>, P4Move, MyAbstractState> {}

class AbstractRules extends Rules<P4Move, MyAbstractState> {

    public applyLegalMove(move: P4Move, state: MyAbstractState, _legality: void): MyAbstractState {
        const board: readonly number[] = state.board[0];
        return new MyAbstractState([board.concat([move.x])], state.turn + 1);
    }
    public isLegal(move: P4Move, state: MyAbstractState): MGPValidation {
        return MGPValidation.SUCCESS;
    }
    public getGameStatus(node: AbstractNode): GameStatus {
        return GameStatus.ONGOING;
    }
}

describe('GameStatus', () => {
    it('should be convertible to BoardValue', () => {
        expect(GameStatus.ZERO_WON.toBoardValue().value).toBe(Player.ZERO.getVictoryValue());
        expect(GameStatus.ONE_WON.toBoardValue().value).toBe(Player.ONE.getVictoryValue());
        expect(GameStatus.DRAW.toBoardValue().value).toBe(0);
        expect(GameStatus.ONGOING.toBoardValue().value).toBe(0);
    });
});

describe('Rules', () => {

    let rules: AbstractRules;

    beforeEach(() => {
        rules = new AbstractRules(MyAbstractState);
    });
    it('should create child to already calculated node which did not include this legal child yet', () => {
        // Given a node with sons
        spyOn(rules.node, 'hasMoves').and.returnValue(true);
        spyOn(rules.node, 'getSonByMove').and.returnValue(MGPOptional.empty());

        // When choosing another one
        const wasLegal: boolean = rules.choose(P4Move.ZERO);

        // he should be created and chosen
        expect(wasLegal).toBeTrue();
        expect(rules.node.gameState.turn).toBe(1);
    });
    it('should allow dev to go back to specific starting board based on encodedMoveList', () => {
        // Given an initial list of encoded moves and an initial state
        const initialState: MyAbstractState = MyAbstractState.getInitialState();
        const encodedMoveList: number[] = [0, 1, 2, 3];

        // When calling applyMoves
        const state: MyAbstractState = rules.applyMoves(encodedMoveList, initialState, P4Move.encoder.decodeMove);

        // Then last move should be the last one encoded and state should be adapted
        expect(state.board).toEqual([encodedMoveList]);
        expect(state.turn).toBe(4);
    });
});
