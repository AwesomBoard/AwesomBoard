/* eslint-disable max-lines-per-function */
import { Coord } from 'src/app/jscaip/Coord';
import { Player, PlayerOrNone } from 'src/app/jscaip/Player';
import { HeuristicUtils } from 'src/app/jscaip/AI/tests/HeuristicUtils.spec';
import { SixState } from '../SixState';
import { SixMove } from '../SixMove';
import { MGPOptional } from '@everyboard/lib';
import { Table } from 'src/app/jscaip/TableUtils';
import { SixConfig, SixNode, SixRules } from '../SixRules';
import { BoardValue } from 'src/app/jscaip/AI/BoardValue';
import { SixHeuristic } from '../SixHeuristic';

const O: PlayerOrNone = Player.ZERO;
const X: PlayerOrNone = Player.ONE;
const _: PlayerOrNone = PlayerOrNone.NONE;

describe('SixHeuristic', () => {

    let heuristic: SixHeuristic;
    const defaultConfig: MGPOptional<SixConfig> = SixRules.get().getDefaultRulesConfig();

    beforeEach(() => {
        heuristic = new SixHeuristic();
    });

    describe('pre-victories', () => {

        it('should only count one preVictory when one coord is a forcing move for two lines', () => {
            // Given a node with two pre-victories
            const board: Table<PlayerOrNone> = [
                [_, _, X, _, _, X],
                [_, _, O, _, O, _],
                [_, _, O, O, _, _],
                [_, _, O, _, _, O],
                [_, O, O, _, O, X],
                [O, _, O, O, X, X],
            ];
            const state: SixState = SixState.ofRepresentation(board, 9);
            const move: SixMove = SixMove.ofDrop(new Coord(2, 3));
            const node: SixNode = new SixNode(state, MGPOptional.empty(), MGPOptional.of(move));

            // When evaluation its value
            const boardValue: BoardValue = heuristic.getBoardValue(node, defaultConfig);

            // Then that value should be a pre-victory
            expect(boardValue.metrics).toEqual([Player.ZERO.getPreVictory()]);
        });

        it('should know that 5 pieces aligned with two empty extension mean PRE_VICTORY', () => {
            const state: SixState = SixState.ofRepresentation([
                [X, X, X, X, X],
            ], 2);
            const previousMove: SixMove = SixMove.ofDrop(new Coord(0, 0));
            HeuristicUtils.expectStateToBePreVictory(state, previousMove, Player.ONE, [heuristic], defaultConfig);
        });

        it('should know that full-bowtie aligned with two empty extension mean PRE_VICTORY', () => {
            const state: SixState = SixState.ofRepresentation([
                [_, O, O, O],
                [O, O, O, X],
                [O, X, X, X],
                [O, X, X, _],

            ], 2);
            const previousMove: SixMove = SixMove.ofDrop(new Coord(2, 2));
            HeuristicUtils.expectStateToBePreVictory(state, previousMove, Player.ONE, [heuristic], defaultConfig);
        });

    });

    describe('4 pieces aligned is better than 3 pieces aligned', () => {

        it('should be true with lines', () => {
            const move: SixMove = SixMove.ofDrop(new Coord(1, 1));
            const weakerState: SixState = SixState.ofRepresentation([
                [O, O, _, _, _],
                [X, X, X, _, _],
                [O, O, _, _, _],
            ], 7);
            const strongerState: SixState = SixState.ofRepresentation([
                [O, O, _, _, _],
                [X, X, X, X, _],
                [O, O, _, _, _],
            ], 7);
            HeuristicUtils.expectSecondStateToBeBetterThanFirstFor(heuristic,
                                                                   weakerState, MGPOptional.of(move),
                                                                   strongerState, MGPOptional.of(move),
                                                                   Player.ONE,
                                                                   defaultConfig);
        });

        it('should be true with triangle', () => {
            const move: SixMove = SixMove.ofDrop(new Coord(1, 3));
            const weakerState: SixState = SixState.ofRepresentation([
                [_, _, _],
                [X, _, _],
                [X, _, O],
                [X, O, _],
            ], 7);
            const strongerState: SixState = SixState.ofRepresentation([
                [_, _, _],
                [X, _, X],
                [X, _, O],
                [X, O, _],
            ], 7);
            HeuristicUtils.expectSecondStateToBeBetterThanFirstFor(heuristic,
                                                                   weakerState, MGPOptional.of(move),
                                                                   strongerState, MGPOptional.of(move),
                                                                   Player.ONE,
                                                                   defaultConfig);
        });

        it('should be true with circle', () => {
            const move: SixMove = SixMove.ofDrop(new Coord(2, 1));
            const weakerState: SixState = SixState.ofRepresentation([
                [_, X, X],
                [_, O, X],
                [_, _, _],
            ], 7);
            const strongerState: SixState = SixState.ofRepresentation([
                [_, X, X],
                [_, O, X],
                [_, X, _],
            ], 7);
            HeuristicUtils.expectSecondStateToBeBetterThanFirstFor(heuristic,
                                                                   weakerState, MGPOptional.of(move),
                                                                   strongerState, MGPOptional.of(move),
                                                                   Player.ONE,
                                                                   defaultConfig);
        });

    });

    describe('4 pieces aligned with two spaces should be better than 4 aligned with two opponents', () => {

        it('should be true with lines', () => {
            const move: SixMove = SixMove.ofDrop(new Coord(1, 1));
            const weakerState: SixState = SixState.ofRepresentation([
                [O, O, O, O, O, O],
                [O, X, X, X, X, O],
                [O, O, O, O, O, O],
            ], 7);
            const strongerState: SixState = SixState.ofRepresentation([
                [O, O, O, O, O, O],
                [_, X, X, X, X, _],
                [O, O, O, O, O, O],
            ], 7);
            HeuristicUtils.expectSecondStateToBeBetterThanFirstFor(heuristic,
                                                                   weakerState, MGPOptional.of(move),
                                                                   strongerState, MGPOptional.of(move),
                                                                   Player.ONE,
                                                                   defaultConfig);
        });

    });

    it('Score after 40th turn should be a subtraction of the number of piece', () => {
        const state: SixState = SixState.ofRepresentation([
            [X, X, X, X, O, O, O, O, O],
            [X, X, X, X, O, O, O, O, O],
        ], 40);
        const move: SixMove = SixMove.ofDrop(new Coord(1, 1));
        const node: SixNode = new SixNode(state, MGPOptional.empty(), MGPOptional.of(move));
        expect(heuristic.getBoardValue(node, defaultConfig).metrics).toEqual([2 * Player.ZERO.getScoreModifier()]);
    });

    describe('Custom Config', () => {

        it('score after N-th turn should be a substraction of the number of piece', () => {
            // Given a board in second phase
            // and a config with shorter phase
            const state: SixState = SixState.ofRepresentation([
                [X, X, X, X, O, O, O, O, O],
                [X, X, X, X, O, O, O, O, O],
            ], 20);
            const customConfig: MGPOptional<SixConfig> = MGPOptional.of({
                ...defaultConfig.get(),
                piecesPerPlayer: 10,
            });
            const move: SixMove = SixMove.ofDrop(new Coord(1, 1));
            const node: SixNode = new SixNode(state, MGPOptional.empty(), MGPOptional.of(move));

            // When evaluating its board value
            const boardValue: BoardValue = heuristic.getBoardValue(node, customConfig);

            // Then it should be the difference of pieces between two player
            expect(boardValue.metrics).toEqual([2 * Player.ZERO.getScoreModifier()]);
        });

    });

});
