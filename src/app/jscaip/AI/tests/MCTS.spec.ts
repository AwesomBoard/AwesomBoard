/* eslint-disable max-lines-per-function */
import { MGPOptional } from '@everyboard/lib';
import { QuartoMove } from 'src/app/games/quarto/QuartoMove';
import { QuartoMoveGenerator } from 'src/app/games/quarto/QuartoMoveGenerator';
import { QuartoPiece } from 'src/app/games/quarto/QuartoPiece';
import { QuartoConfig, QuartoNode, QuartoRules } from 'src/app/games/quarto/QuartoRules';
import { QuartoState } from 'src/app/games/quarto/QuartoState';
import { Table } from 'src/app/jscaip/TableUtils';
import { AITimeLimitOptions } from '../AI';
import { Coord } from '../../Coord';
import { MCTS } from '../MCTS';
import { MancalaNode } from 'src/app/games/mancala/common/MancalaRules';
import { AwaleMoveGenerator } from 'src/app/games/mancala/awale/AwaleMoveGenerator';
import { AwaleRules } from 'src/app/games/mancala/awale/AwaleRules';
import { MancalaState } from 'src/app/games/mancala/common/MancalaState';
import { MancalaConfig } from 'src/app/games/mancala/common/MancalaConfig';
import { MancalaMove } from 'src/app/games/mancala/common/MancalaMove';

describe('MCTS', () => {

    let mcts: MCTS<QuartoMove, QuartoState, QuartoConfig>;
    const mctsOptions: AITimeLimitOptions = { name: '200ms', maxSeconds: 0.2 };
    const defaultConfig: MGPOptional<QuartoConfig> = QuartoRules.get().getDefaultRulesConfig();

    beforeEach(() => {
        mcts = new MCTS('MCTS', new QuartoMoveGenerator(), QuartoRules.get());
    });

    it('should choose possible victory over definite defeat', () => {
        // Given a board that could be a win for opponent in their next moves
        const board: Table<QuartoPiece> = [
            [QuartoPiece.AAAA, QuartoPiece.AAAB, QuartoPiece.AABB, QuartoPiece.EMPTY],
            [QuartoPiece.EMPTY, QuartoPiece.EMPTY, QuartoPiece.EMPTY, QuartoPiece.EMPTY],
            [QuartoPiece.EMPTY, QuartoPiece.EMPTY, QuartoPiece.EMPTY, QuartoPiece.EMPTY],
            [QuartoPiece.EMPTY, QuartoPiece.EMPTY, QuartoPiece.EMPTY, QuartoPiece.EMPTY],
        ];
        const state: QuartoState = new QuartoState(board, 14, QuartoPiece.BBAA);
        const node: QuartoNode = new QuartoNode(state);

        // When computing the best move
        const move: QuartoMove = mcts.chooseNextMove(node, mctsOptions, defaultConfig);
        // Then it should not give the win to the opponent
        if (move.coord.equals(new Coord(3, 0))) {
            // MCTS blocked the opponent's only possible win
            expect(true).toBe(true);
        } else {
            // MCTS gave the opponent a piece with which they cannot win
            expect(move.piece).not.toBe(QuartoPiece.AABA);
        }
    });

    it('should know how to win multiple turns in advance', () => {
        // Given a board where we have to make a choice between definitely losing or possibly winning,
        // but multiple turns in advance
        const board: Table<QuartoPiece> = [
            [QuartoPiece.AAAA, QuartoPiece.AAAB, QuartoPiece.AABA, QuartoPiece.EMPTY],
            [QuartoPiece.BABB, QuartoPiece.BAAB, QuartoPiece.ABAA, QuartoPiece.BBAB],
            [QuartoPiece.ABBA, QuartoPiece.BBAA, QuartoPiece.BABA, QuartoPiece.EMPTY],
            [QuartoPiece.AABB, QuartoPiece.ABBB, QuartoPiece.EMPTY, QuartoPiece.EMPTY],
        ];
        const state: QuartoState = new QuartoState(board, 12, QuartoPiece.BBBB);
        const node: QuartoNode = new QuartoNode(state);
        // When computing the best move
        const move: QuartoMove = mcts.chooseNextMove(node, mctsOptions, defaultConfig);
        // Then it should choose the move that leads to the wins
        expect(move).toEqual(new QuartoMove(3, 0, QuartoPiece.ABAB));
    });

    it('should not fail on games that are too long', () => {
        // Given a MCTS for a game that has a tendency to give long random games
        const otherMcts: MCTS<MancalaMove, MancalaState, MancalaConfig> = new MCTS('MCTS', new AwaleMoveGenerator(), AwaleRules.get());
        otherMcts.maxGameLength = 10; // Limit it heavily to ensure we will exhaust the limit (for coverage)
        // When searching for the best move
        const beforeSearch: number = Date.now();
        const config: MGPOptional<MancalaConfig> = AwaleRules.get().getDefaultRulesConfig();
        const node: MancalaNode = AwaleRules.get().getInitialNode(config);
        const move: MancalaMove = otherMcts.chooseNextMove(node, mctsOptions, config);
        // Then it should find one and not get stuck infinitely
        expect(move).toBeTruthy();
        // Add 10% to allow for iterations to finish
        expect(Date.now() - beforeSearch).toBeLessThan(1000 * (mctsOptions.maxSeconds + 0.1));
    });

    it('should choose a move even with very little time', () => {
        // This test is there for coverage as well, to check that having unexplored moves does not break MCTS
        // Given 1ms allowed for MCTS
        const noTimeOptions: AITimeLimitOptions = { name: '1ms', maxSeconds: 0.001 };
        // When searching for a move
        const node: QuartoNode = QuartoRules.get().getInitialNode(defaultConfig);
        const move: QuartoMove = mcts.chooseNextMove(node, noTimeOptions, defaultConfig);
        // Then it should have selected a move
        expect(move).toBeTruthy();
    });


});
