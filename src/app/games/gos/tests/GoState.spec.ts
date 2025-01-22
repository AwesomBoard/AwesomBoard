/* eslint-disable max-lines-per-function */
import { MGPOptional } from '@everyboard/lib';
import { Player } from 'src/app/jscaip/Player';
import { GoState } from '../GoState';
import { GoPiece } from '../GoPiece';
import { PlayerNumberMap } from 'src/app/jscaip/PlayerMap';
import { GoConfig, GoRules } from '../go/GoRules';
import { GoPhase } from '../GoPhase';

const O: GoPiece = GoPiece.DARK;
const _: GoPiece = GoPiece.EMPTY;

describe('GoPiece', () => {

    describe('toString', () => {

        it('should be defined for all pieces', () => {
            expect(GoPiece.DARK.toString()).toBe('GoPiece.DARK');
            expect(GoPiece.LIGHT.toString()).toBe('GoPiece.LIGHT');
            expect(GoPiece.EMPTY.toString()).toBe('GoPiece.EMPTY');
            expect(GoPiece.DEAD_DARK.toString()).toBe('GoPiece.DEAD_DARK');
            expect(GoPiece.DEAD_LIGHT.toString()).toBe('GoPiece.DEAD_LIGHT');
            expect(GoPiece.DARK_TERRITORY.toString()).toBe('GoPiece.DARK_TERRITORY');
            expect(GoPiece.LIGHT_TERRITORY.toString()).toBe('GoPiece.LIGHT_TERRITORY');
        });

    });

    describe('ofPlayer', () => {

        it('should map correctly the normal player', () => {
            expect(GoPiece.ofPlayer(Player.ZERO)).toBe(GoPiece.DARK);
            expect(GoPiece.ofPlayer(Player.ONE)).toBe(GoPiece.LIGHT);
        });

    });

});

describe('GoState for Go', () => {

    describe('getInitialState', () => {

        it('should put the first two handicaps in opposite corner', () => {
            // Given a config with a 19x19 board and a handicap of two
            const customConfig: MGPOptional<GoConfig> = MGPOptional.of({ width: 19, height: 19, handicap: 2 });

            // When creating an initialState with it
            const state: GoState = GoRules.get().getInitialState(customConfig);

            // Then the board should have handicaps in opposite corners
            const expectedBoard: GoPiece[][] = [
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, O, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, O, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            ];
            const expectedState: GoState = new GoState(expectedBoard,
                                                       PlayerNumberMap.of(0, 0),
                                                       1,
                                                       MGPOptional.empty(),
                                                       GoPhase.PLAYING);
            expect(expectedState).toEqual(state);
        });

        it('should put the first four handicaps in corner', () => {
            // Given a custom with a 19x19 board and a handicap of four
            const customConfig: MGPOptional<GoConfig> = MGPOptional.of({ width: 19, height: 19, handicap: 4 });

            // When creating an initialState with it
            const state: GoState = GoRules.get().getInitialState(customConfig);

            // Then the board should have handicaps in opposite corners
            const expectedBoard: GoPiece[][] = [
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, O, _, _, _, _, _, _, _, _, _, _, _, O, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, O, _, _, _, _, _, _, _, _, _, _, _, O, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            ];
            const expectedState: GoState = new GoState(expectedBoard,
                                                       PlayerNumberMap.of(0, 0),
                                                       1,
                                                       MGPOptional.empty(),
                                                       GoPhase.PLAYING);
            expect(expectedState).toEqual(state);
        });

        it('should put the fifth handicap in tengen', () => {
            // Given a custom with a 19x19 board and a handicap of five
            const customConfig: MGPOptional<GoConfig> = MGPOptional.of({ width: 19, height: 19, handicap: 5 });

            // When creating an initialState with it
            const state: GoState = GoRules.get().getInitialState(customConfig);

            // Then the board should have handicaps in opposite corners
            const expectedBoard: GoPiece[][] = [
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, O, _, _, _, _, _, _, _, _, _, _, _, O, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, O, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, O, _, _, _, _, _, _, _, _, _, _, _, O, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            ];
            const expectedState: GoState = new GoState(expectedBoard,
                                                       PlayerNumberMap.of(0, 0),
                                                       1,
                                                       MGPOptional.empty(),
                                                       GoPhase.PLAYING);
            expect(expectedState).toEqual(state);
        });

        it('should put the sixth to ninth handicaps in "edge hoshis"', () => {
            // Given a custom with a 19x19 board and a handicap of 9
            const customConfig: MGPOptional<GoConfig> = MGPOptional.of({ width: 19, height: 19, handicap: 9 });

            // When creating an initialState with it
            const state: GoState = GoRules.get().getInitialState(customConfig);

            // Then the board should have handicaps in opposite corners
            const expectedBoard: GoPiece[][] = [
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, O, _, _, _, _, _, O, _, _, _, _, _, O, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, O, _, _, _, _, _, O, _, _, _, _, _, O, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, O, _, _, _, _, _, O, _, _, _, _, _, O, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            ];
            const expectedState: GoState = new GoState(expectedBoard,
                                                       PlayerNumberMap.of(0, 0),
                                                       1,
                                                       MGPOptional.empty(),
                                                       GoPhase.PLAYING);
            expect(expectedState).toEqual(state);
        });

    });

});
