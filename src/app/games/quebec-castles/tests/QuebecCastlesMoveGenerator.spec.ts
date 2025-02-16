/* eslint-disable max-lines-per-function */
import { MGPOptional } from '@everyboard/lib';

import { QuebecCastlesMove } from '../QuebecCastlesMove';
import { QuebecCastlesMoveGenerator } from '../QuebecCastlesMoveGenerator';
import { QuebecCastlesConfig, QuebecCastlesNode, QuebecCastlesRules } from '../QuebecCastlesRules';
import { QuebecCastlesState } from '../QuebecCastlesState';
import { PlayerOrNone } from 'src/app/jscaip/Player';
import { Coord } from 'src/app/jscaip/Coord';
import { PlayerMap } from 'src/app/jscaip/PlayerMap';

const _: PlayerOrNone = PlayerOrNone.NONE;
const O: PlayerOrNone = PlayerOrNone.ZERO;
const X: PlayerOrNone = PlayerOrNone.ONE;
const defaultThrones: PlayerMap<MGPOptional<Coord>> = PlayerMap.ofValues(
    MGPOptional.of(new Coord(8, 8)),
    MGPOptional.of(new Coord(0, 0)),
);

/**
 * These are the tests for the move generator.
 * We want to test that it gives us the expected moves.
 * Typically, this can be done by checking the number of moves available on the first turn of a game.
 */
fdescribe('QuebecCastlesMoveGenerator', () => {

    let moveGenerator: QuebecCastlesMoveGenerator;
    const defaultConfig: MGPOptional<QuebecCastlesConfig> = QuebecCastlesRules.get().getDefaultRulesConfig();

    beforeEach(() => {
        moveGenerator = new QuebecCastlesMoveGenerator();
    });

    it('should have all drop options at first turn', () => {
        // Given an initial node
        const initialState: QuebecCastlesState = QuebecCastlesRules.get().getInitialState(defaultConfig);
        const node: QuebecCastlesNode = new QuebecCastlesNode(initialState);

        // When listing the moves
        const moves: QuebecCastlesMove[] = moveGenerator.getListMoves(node, defaultConfig);

        // Then there should be this 1 choice by available space in territory
        expect(moves.length).toBe(15);
    });

    it('should have all drop options at second turn', () => {
        // Given an initial node
        const initialState: QuebecCastlesState =
            QuebecCastlesRules.get().getInitialState(defaultConfig).incrementTurn();
        const node: QuebecCastlesNode = new QuebecCastlesNode(initialState);

        // When listing the moves
        const moves: QuebecCastlesMove[] = moveGenerator.getListMoves(node, defaultConfig);

        // Then there should be one move by available space
        expect(moves.length).toBe(19);
    });

    describe('Drop phase', () => {

        describe('Custom Config', () => {

            describe('drop piece by piece', () => {

                const customConfig: MGPOptional<QuebecCastlesConfig> = MGPOptional.of({
                    ...defaultConfig.get(),
                    dropPieceByPiece: true,
                    dropPieceYourself: true,
                    defender: 3,
                    invader: 5,
                });

                it('should allow putting soldier in first turn', () => {
                    // Given a node in drop phase (hence a custom config)
                    const state: QuebecCastlesState = new QuebecCastlesState([
                        [_, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, O, _],
                        [_, _, _, _, _, _, _, _, _],
                    ], 1, defaultThrones);
                    const node: QuebecCastlesNode = new QuebecCastlesNode(state);

                    // When listing the moves
                    const moves: QuebecCastlesMove[] = moveGenerator.getListMoves(node, customConfig);

                    // Then there should be this many moves
                    expect(moves.length).toBe(14);
                });

            });

            describe('drop by batch', () => {

                const customConfig: MGPOptional<QuebecCastlesConfig> = MGPOptional.of({
                    ...defaultConfig.get(),
                    dropPieceByPiece: false,
                    dropPieceYourself: true,
                    defender: 3,
                    invader: 5,
                });

                it('should drop like default config does', () => {
                    // Given a first turn in drop-by-batch config
                    const node: QuebecCastlesNode = QuebecCastlesRules.get().getInitialNode(customConfig);

                    // When listing the moves
                    const moves: QuebecCastlesMove[] = moveGenerator.getListMoves(node, customConfig);

                    // Then there should be only one move, dropping 3 pieces
                    expect(moves.length).toBe(1);
                    const coords: Coord[] = [new Coord(7, 8), new Coord(8, 7), new Coord(7, 7)];
                    const expectedMove: QuebecCastlesMove = QuebecCastlesMove.drop(coords);
                    expect(moves[0]).toEqual(expectedMove);
                });

            });

        });

    });

});
