/* eslint-disable max-lines-per-function */
import { PlayerOrNone } from 'src/app/jscaip/Player';
import { SquarzMove } from '../SquarzMove';
import { SquarzMoveGenerator } from '../SquarzMoveGenerator';
import { SquarzConfig, SquarzNode, SquarzRules } from '../SquarzRules';
import { SquarzState } from '../SquarzState';
import { MGPOptional } from '@everyboard/lib';

describe('SquarzMoveGenerator', () => {

    const _: PlayerOrNone = PlayerOrNone.NONE;
    const O: PlayerOrNone = PlayerOrNone.ZERO;
    const X: PlayerOrNone = PlayerOrNone.ONE;

    let moveGenerator: SquarzMoveGenerator;
    const defaultConfig: MGPOptional<SquarzConfig> = SquarzRules.get().getDefaultRulesConfig();

    beforeEach(() => {
        const rules: SquarzRules = SquarzRules.get();
        moveGenerator = new SquarzMoveGenerator(rules);
    });

    it('should have all move options', () => {
        // Given an initial node
        const initialState: SquarzState = SquarzRules.get().getInitialState(defaultConfig);
        const node: SquarzNode = new SquarzNode(initialState);

        // When listing the moves
        const moves: SquarzMove[] = moveGenerator.getListMoves(node, defaultConfig);

        // Then there should be 16 moves (6 duplications, 10 jumps)
        expect(moves.length).toBe(16);
    });

    it('should have all jump options', () => {
        // Given state
        const state: SquarzState = new SquarzState([
            [X, X, X, X, X, X, X, X],
            [X, X, X, X, X, X, X, O],
            [O, O, O, O, O, O, O, O],
            [O, O, O, O, O, O, O, O],
            [O, O, X, X, O, X, O, O],
            [O, X, X, X, O, X, X, X],
            [O, X, O, X, X, X, _, X],
            [O, X, O, X, X, X, X, X],
        ], 100);
        const node: SquarzNode = new SquarzNode(state);

        // When listing the moves
        const moves: SquarzMove[] = moveGenerator.getListMoves(node, defaultConfig);

        // Then there should be 4 moves (all jumps)
        expect(moves.length).toBe(4);
    });

    it('should have only one duplication by landing space', () => {
        // Given any board where several duplication are possible for one same landing coord
        const state: SquarzState = new SquarzState([
            [O, O, O, X, X, O, O, O],
            [O, _, O, X, X, O, _, O],
            [O, O, O, X, X, O, O, O],
            [X, X, X, X, X, X, X, X],
            [X, X, X, X, X, X, X, X],
            [O, O, O, X, X, O, O, O],
            [O, _, O, X, X, O, _, O],
            [O, O, O, X, X, O, O, O],
        ], 100);
        const node: SquarzNode = new SquarzNode(state);

        // When listing the moves
        const moves: SquarzMove[] = moveGenerator.getListMoves(node, defaultConfig);

        // Then there should be only one duplication by landing coord
        expect(moves.length).toBe(4);
    });

});
