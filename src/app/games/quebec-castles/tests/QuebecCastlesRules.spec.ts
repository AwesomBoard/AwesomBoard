/* eslint-disable max-lines-per-function */
import { MGPOptional } from '@everyboard/lib';

import { RulesUtils } from 'src/app/jscaip/tests/RulesUtils.spec';
import { QuebecCastlesDrop, QuebecCastlesMove } from '../QuebecCastlesMove';
import { QuebecCastlesConfig, QuebecCastlesFailure, QuebecCastlesRules } from '../QuebecCastlesRules';
import { QuebecCastlesState } from '../QuebecCastlesState';
import { Coord } from 'src/app/jscaip/Coord';
import { PlayerMap } from 'src/app/jscaip/PlayerMap';
import { Player, PlayerOrNone } from 'src/app/jscaip/Player';

const _: PlayerOrNone = PlayerOrNone.NONE;
const O: PlayerOrNone = PlayerOrNone.ONE;
const X: PlayerOrNone = PlayerOrNone.ZERO; // TODO: order

fdescribe('QuebecCastlesRules', () => {

    let rules: QuebecCastlesRules;
    const defaultConfig: MGPOptional<QuebecCastlesConfig> = QuebecCastlesRules.get().getDefaultRulesConfig();

    const emptyThrones: PlayerMap<MGPOptional<Coord>> = PlayerMap.ofValues(MGPOptional.empty(), MGPOptional.empty());
    emptyThrones.makeImmutable();
    const defaultThrones: PlayerMap<MGPOptional<Coord>> = PlayerMap.ofValues(
        MGPOptional.of(new Coord(0, 0)),
        MGPOptional.of(new Coord(9, 9)),
    );

    function drop(coords: Coord[]): QuebecCastlesMove {
        return new QuebecCastlesDrop(coords);
    }

    beforeEach(() => {
        // This is the rules instance that we will test
        rules = QuebecCastlesRules.get();
    });

    describe('King Placement', () => {

        it('shoud have the thrones placed by default', () => {
            // Given a board in default config
            const state: QuebecCastlesState = rules.getInitialState(defaultConfig);

            // When checking the thrones coord
            const zeroThrone: MGPOptional<Coord> = state.thrones.get(Player.ZERO);
            const oneThrone: MGPOptional<Coord> = state.thrones.get(Player.ONE);

            // Then they should be upper left and lower right corner
            const maxX: number = state.getWidth() - 1;
            const maxY: number = state.getHeight() - 1;
            expect(zeroThrone).toEqual(MGPOptional.of(new Coord(maxX, maxY)));
            expect(oneThrone).toEqual(MGPOptional.of(new Coord(0, 0)));
        });

        describe('Custom Config', () => {

            it('should allow player to drop its throne when mentionned in config', () => {
                // Given
                // When
                // Then
            });

            it('should refuse placing thrones outside territory', () => {
                // Given
                // When
                // Then
            });

        });

    });

    describe('Piece Dropping', () => {

        it('should refuse putting soldier outside territory (Player.ZERO)', () => {
            // Given the initial state
            const state: QuebecCastlesState = rules.getInitialState(defaultConfig);

            // When dropping piece outside of territory
            const move: QuebecCastlesMove = drop([new Coord(2, 2)]);

            // Then the move should be illegal
            const reason: string = QuebecCastlesFailure.MUST_DROP_IN_YOUR_TERRITORY();
            RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
        });

        it('should refuse putting soldier outside territory (Player.ONE)', () => {
            // Given the second turn
            const state: QuebecCastlesState = new QuebecCastlesState([
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
            ], 1, defaultThrones);

            // When dropping piece outside of territory
            const move: QuebecCastlesMove = drop([new Coord(7, 7)]);

            // Then the move should be illegal
            const reason: string = QuebecCastlesFailure.MUST_DROP_IN_YOUR_TERRITORY();
            RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
        });

        it('should refuse putting soldier on another soldier', () => {
            // Given
            // When
            // Then
        });

        it('should refuse putting soldier on throne', () => {
            // Given
            // When
            // Then
        });

        it('should allow first player (defender) to drop all its soldier at once', () => {
            // Given
            // When
            // Then
        });

        it('should forbid player to drop less soldier', () => {
            // Given
            // When
            // Then
        });

        it('should forbid player to drop more soldier', () => {
            // Given
            // When
            // Then
        });

        it('should allow second player (invader) to drop all its soldier at once', () => {
            // Given
            // When
            // Then
        });

        describe('Custom Config', () => {

            describe('piece by piece = true', () => {

                it('should allow putting soldier in first turn', () => {
                    // Given
                    // When
                    // Then
                });

                it('should allow player to drop all its remaining soldier once opponent is out of soldier to drop', () => {
                    // Given
                    // When
                    // Then
                });

            });

            describe('isRhombic = true', () => {

                it('should have 5 pieces in two lines', () => {
                    // Given a custom config with 5 pieces to drop
                    const customConfig: MGPOptional<QuebecCastlesConfig> = MGPOptional.of({
                        ...defaultConfig.get(),
                        linesForTerritory: 2,
                        defender: 5,
                        invader: 5,
                    });

                    // When generating initial state
                    const state: QuebecCastlesState = rules.getInitialState(customConfig);

                    // Then it should have piece filled in corners
                    const expectedState: QuebecCastlesState = new QuebecCastlesState([
                        [_, O, O, _, _, _, _, _, _, _],
                        [O, O, _, _, _, _, _, _, _, _],
                        [O, _, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, _, X],
                        [_, _, _, _, _, _, _, _, X, X],
                        [_, _, _, _, _, _, _, X, X, _],
                    ], 1, defaultThrones);
                    expect(expectedState).toEqual(state);
                });

            });

        });

    });

    describe('Normal Move', () => {

        it('should forbid moving opponent piece', () => {
            // Given
            // When
            // Then
        });

        it('should forbid moving emtpy coord', () => {
            // Given
            // When
            // Then
        });

        it('should forbid landing on your own pieces', () => {
            // Given
            // When
            // Then
        });

        it('should forbid starting outside of board', () => {
            // Given
            // When
            // Then
        });

        it('should forbid landing outside of board', () => {
            // Given
            // When
            // Then
        });

        it('should forbid landing on your own throne', () => {
            // Given
            // When
            // Then
        });

        describe('Invader move', () => {

            it('should forbid move that are not orthogonal', () => {
                // Given
                // When
                // Then
            });

            it('should forbid move that are not a double step', () => {
                // Given
                // When
                // Then
            });

            it('should forbid move jumping over a coord', () => {
                // Given
                // When
                // Then
            });

        });

        describe('Defender move', () => {

            it('should forbid move that are not a single step', () => {
                // Given
                // When
                // Then
            });

        });

    });

    describe('Custom Config', () => {

        it('Should fill the board from the corner when rhombic-option is on', () => {
            // Given
            // When
            // Then
        });

    });

});
