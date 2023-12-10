import { BoardValue } from '../AI/BoardValue';
import { MGPOptional } from 'src/app/utils/MGPOptional';
import { GameState } from '../GameState';
import { Move } from '../Move';
import { Heuristic } from '../AI/Minimax';
import { Player } from '../Player';
import { GameNode } from '../AI/GameNode';
import { EmptyRulesConfig, RulesConfig } from '../RulesConfigUtil';
import { ArrayUtils } from 'src/app/utils/ArrayUtils';

export class HeuristicUtils {

    public static expectSecondStateToBeBetterThanFirstFor<M extends Move,
                                                          S extends GameState,
                                                          C extends RulesConfig = EmptyRulesConfig>(
        heuristic: Heuristic<M, S, BoardValue, C>,
        weakState: S,
        weakMove: MGPOptional<M>,
        strongState: S,
        strongMove: MGPOptional<M>,
        player: Player,
        config: MGPOptional<C>)
    : void
    {
        const weakNode: GameNode<M, S, C> = new GameNode(weakState, undefined, weakMove);
        const weakValue: readonly number[] = heuristic.getBoardValue(weakNode, config).value;
        const strongNode: GameNode<M, S, C> = new GameNode(strongState, undefined, strongMove);
        const strongValue: readonly number[] = heuristic.getBoardValue(strongNode, config).value;
        if (player === Player.ZERO) {
            expect(ArrayUtils.isInferior(strongValue, weakValue)).toBeTrue();
        } else {
            expect(ArrayUtils.isInferior(weakValue, strongValue)).toBeTrue();
        }
    }

    public static expectStateToBePreVictory<M extends Move, S extends GameState, C extends RulesConfig>(
        state: S,
        previousMove: M,
        player: Player,
        heuristics: Heuristic<M, S, BoardValue, C>[],
        config: MGPOptional<C>)
    : void
    {
        for (const heuristic of heuristics) {
            const node: GameNode<M, S, C> = new GameNode(state, MGPOptional.empty(), MGPOptional.of(previousMove));
            const value: number = heuristic.getBoardValue(node, config).value[0];
            const expectedValue: number = player.getPreVictory();
            expect(BoardValue.isPreVictory(value)).toBeTrue();
            expect(value).toBe(expectedValue);
        }
    }
    public static expectStatesToBeOfEqualValue<M extends Move, S extends GameState, C extends RulesConfig>(
        heuristic: Heuristic<M, S, BoardValue, C>,
        leftState: S,
        rightState: S,
        config: MGPOptional<C>)
    : void {
        const leftNode: GameNode<M, S, C> = new GameNode(leftState);
        const leftValue: number = heuristic.getBoardValue(leftNode, config).value[0];
        const rightNode: GameNode<M, S, C> = new GameNode(rightState);
        const rightValue: number = heuristic.getBoardValue(rightNode, config).value[0];
        expect(leftValue).withContext('both value should be equal').toEqual(rightValue);
    }

}
