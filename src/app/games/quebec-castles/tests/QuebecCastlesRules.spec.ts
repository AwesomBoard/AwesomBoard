/* eslint-disable max-lines-per-function */
import { MGPOptional } from '@everyboard/lib';

import { RulesUtils } from 'src/app/jscaip/tests/RulesUtils.spec';
import { QuebecCastlesMove } from '../QuebecCastlesMove';
import { QuebecCastlesConfig, QuebecCastlesFailure, QuebecCastlesNode, QuebecCastlesRules } from '../QuebecCastlesRules';
import { QuebecCastlesState } from '../QuebecCastlesState';
import { Coord, CoordFailure } from 'src/app/jscaip/Coord';
import { PlayerMap } from 'src/app/jscaip/PlayerMap';
import { Player, PlayerOrNone } from 'src/app/jscaip/Player';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { DirectionFailure } from 'src/app/jscaip/Direction';

const _: PlayerOrNone = PlayerOrNone.NONE;
const O: PlayerOrNone = PlayerOrNone.ZERO;
const X: PlayerOrNone = PlayerOrNone.ONE;

fdescribe('QuebecCastlesRules', () => {

    let rules: QuebecCastlesRules;
    const defaultConfig: MGPOptional<QuebecCastlesConfig> = QuebecCastlesRules.get().getDefaultRulesConfig();

    const emptyThrones: PlayerMap<MGPOptional<Coord>> = PlayerMap.ofValues(MGPOptional.empty(), MGPOptional.empty());
    emptyThrones.makeImmutable();
    const defaultThrones: PlayerMap<MGPOptional<Coord>> = PlayerMap.ofValues(
        MGPOptional.of(new Coord(8, 8)),
        MGPOptional.of(new Coord(0, 0)),
    );
    defaultThrones.makeImmutable();

    beforeEach(() => {
        // This is the rules instance that we will test
        rules = QuebecCastlesRules.get();
    });

    describe('Throne Placement', () => {

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
                // Given a custom config were throne are to be place yourself
                const customConfig: MGPOptional<QuebecCastlesConfig> = MGPOptional.of({
                    ...defaultConfig.get(),
                    placeThroneYourself: true,
                    dropPieceYourself: true,
                });
                const state: QuebecCastlesState = rules.getInitialState(customConfig);

                // When dropping throne
                const throne: Coord = new Coord(7, 7);
                const move: QuebecCastlesMove = QuebecCastlesMove.drop([throne]);

                // Then the move should succeed
                const thrones: PlayerMap<MGPOptional<Coord>> =
                PlayerMap.ofValues(MGPOptional.of(throne), MGPOptional.empty());
                const expectedState: QuebecCastlesState = new QuebecCastlesState([
                    [_, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, _],
                ], 1, thrones);
                RulesUtils.expectMoveSuccess(rules, state, move, expectedState, customConfig);
            });

            it('should refuse placing thrones outside territory', () => {
                // Given a custom config were throne are to be place yourself
                const customConfig: MGPOptional<QuebecCastlesConfig> = MGPOptional.of({
                    ...defaultConfig.get(),
                    placeThroneYourself: true,
                    dropPieceYourself: true,
                });
                const state: QuebecCastlesState = rules.getInitialState(customConfig);

                // When dropping throne outside of territory
                const throne: Coord = new Coord(5, 6);
                const move: QuebecCastlesMove = QuebecCastlesMove.drop([throne]);

                // Then it should be illegal
                const reason: string = QuebecCastlesFailure.MUST_DROP_IN_YOUR_TERRITORY();
                RulesUtils.expectMoveFailure(rules, state, move, reason, customConfig);
            });

            it('should refuse multiple dropping instead of one throne', () => {
                // Given a board with config "drop piece by piece"
                const customConfig: MGPOptional<QuebecCastlesConfig> = MGPOptional.of({
                    ...defaultConfig.get(),
                    placeThroneYourself: true,
                    dropPieceYourself: true,
                });
                const state: QuebecCastlesState = rules.getInitialState(customConfig);

                // When dropping several pieces
                const move: QuebecCastlesMove = QuebecCastlesMove.drop([new Coord(7, 7), new Coord(6, 6)]);

                // Then it should be illegal
                const reason: string = QuebecCastlesFailure.PLACE_ONLY_ONE_TRONE();
                RulesUtils.expectMoveFailure(rules, state, move, reason, customConfig);
            });

        });

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

                it('should refuse any move', () => {
                    // Given state in drop phase with possible move
                    const state: QuebecCastlesState = new QuebecCastlesState([
                        [_, _, _, _, _, _, _, _, _],
                        [_, O, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, X, _],
                    ], 2, defaultThrones);

                    // When doing a move while still in drop phase
                    const move: QuebecCastlesMove = QuebecCastlesMove.translation(new Coord(1, 1), new Coord(2, 2));

                    // Then it should be illegal
                    const reason: string = QuebecCastlesFailure.CANNOT_MOVE_IN_DROP_PHASE();
                    RulesUtils.expectMoveFailure(rules, state, move, reason, customConfig);
                });

                it('should refuse putting soldier out of board', () => {
                    // Given the initial state
                    const state: QuebecCastlesState = rules.getInitialState(customConfig);

                    // When dropping piece outside of territory
                    const outOfRange: Coord = new Coord(-2, -2);
                    const move: QuebecCastlesMove = QuebecCastlesMove.drop([outOfRange]);

                    // Then the move should be illegal
                    const reason: string = CoordFailure.OUT_OF_RANGE(outOfRange);
                    RulesUtils.expectMoveFailure(rules, state, move, reason, customConfig);
                });

                it('should refuse putting soldier outside territory (Player.ZERO)', () => {
                    // Given the initial state
                    const state: QuebecCastlesState = rules.getInitialState(customConfig);

                    // When dropping piece outside of territory
                    const move: QuebecCastlesMove = QuebecCastlesMove.drop([new Coord(2, 2)]);

                    // Then the move should be illegal
                    const reason: string = QuebecCastlesFailure.MUST_DROP_IN_YOUR_TERRITORY();
                    RulesUtils.expectMoveFailure(rules, state, move, reason, customConfig);
                });

                it('should allow putting soldier in first turn', () => {
                    // Given the initial state
                    const state: QuebecCastlesState = rules.getInitialState(customConfig);

                    // When dropping piece inside of territory
                    const move: QuebecCastlesMove = QuebecCastlesMove.drop([new Coord(7, 7)]);

                    // Then the move should succeed
                    const expectedState: QuebecCastlesState = new QuebecCastlesState([
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
                    RulesUtils.expectMoveSuccess(rules, state, move, expectedState, customConfig);
                });

                it('should allow player to drop all its remaining soldier once opponent is out of soldier to drop', () => {
                    // Given a board on which current player is the only one that has piece to drop
                    // and a drop piece by piece config
                    const state: QuebecCastlesState = new QuebecCastlesState([
                        [_, X, _, _, _, _, _, _, _],
                        [X, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, O, O],
                        [_, _, _, _, _, _, _, O, _],
                    ], 5, defaultThrones);

                    // When dropping all its remaining piece at once
                    const coords: Coord[] = [new Coord(0, 2), new Coord(2, 0), new Coord(2, 2)];
                    const move: QuebecCastlesMove = QuebecCastlesMove.drop(coords);

                    // Then the move should succeed
                    const expectedState: QuebecCastlesState = new QuebecCastlesState([
                        [_, X, X, _, _, _, _, _, _],
                        [X, _, _, _, _, _, _, _, _],
                        [X, _, X, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, O, O],
                        [_, _, _, _, _, _, _, O, _],
                    ], 6, defaultThrones);
                    RulesUtils.expectMoveSuccess(rules, state, move, expectedState, customConfig);
                });

                it('should forbid player to drop less than all its remaining soldier once opponent is out of soldier to drop', () => {
                    // Given a board on which current player is the only one that has piece to drop
                    // and a drop piece by piece config
                    const state: QuebecCastlesState = new QuebecCastlesState([
                        [_, X, _, _, _, _, _, _, _],
                        [X, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, O, O],
                        [_, _, _, _, _, _, _, O, _],
                    ], 5, defaultThrones);

                    // When dropping less than the awaited number of piece
                    const move: QuebecCastlesMove = QuebecCastlesMove.drop([new Coord(0, 2)]);

                    // Then the move should be illegal
                    const reason: string = QuebecCastlesFailure.MUST_DROP_ALL_YOUR_REMAINING_PIECES();
                    RulesUtils.expectMoveFailure(rules, state, move, reason, customConfig);
                });

                it('should forbid player to drop more than all its remaining soldier once opponent is out of soldier to drop', () => {
                    // Given a board on which current player is the only one that has piece to drop
                    // and a drop piece by piece config
                    const state: QuebecCastlesState = new QuebecCastlesState([
                        [_, X, _, _, _, _, _, _, _],
                        [X, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, O, O],
                        [_, _, _, _, _, _, _, O, _],
                    ], 5, defaultThrones);

                    // When dropping more than the awaited number of piece
                    const coords: Coord[] = [new Coord(0, 2), new Coord(2, 0), new Coord(2, 2), new Coord(1, 1)];
                    const move: QuebecCastlesMove = QuebecCastlesMove.drop(coords);

                    // Then the move should be illegal
                    const reason: string = QuebecCastlesFailure.MUST_DROP_ALL_YOUR_REMAINING_PIECES();
                    RulesUtils.expectMoveFailure(rules, state, move, reason, customConfig);
                });

                it('should refuse putting soldier on another soldier', () => {
                    // Given a state with "piece by piece" with piece already dropped
                    const coord: Coord = new Coord(7, 7);
                    const state: QuebecCastlesState = rules
                        .getInitialState(customConfig)
                        .setPieceAt(coord, Player.ZERO);

                    // When dropping on the same coord again
                    const move: QuebecCastlesMove = QuebecCastlesMove.drop([coord]);

                    // Then it should be illegal
                    const reason: string = RulesFailure.MUST_CLICK_ON_EMPTY_SPACE();
                    RulesUtils.expectMoveFailure(rules, state, move, reason, customConfig);
                });

                it('should refuse dropping soldier on throne', () => {
                    // Given a state with "piece by piece"
                    const state: QuebecCastlesState = rules.getInitialState(customConfig);

                    // When dropping on the same coord again
                    const move: QuebecCastlesMove = QuebecCastlesMove.drop([state.thrones.get(Player.ZERO).get()]);

                    // Then it should be illegal
                    const reason: string = QuebecCastlesFailure.CANNOT_LAND_IN_YOUR_TRONE();
                    RulesUtils.expectMoveFailure(rules, state, move, reason, customConfig);
                });

                it('should refuse multiple dropping', () => {
                    // Given a board with config "drop piece by piece"
                    const state: QuebecCastlesState = rules.getInitialState(customConfig);

                    // When dropping several pieces
                    const move: QuebecCastlesMove = QuebecCastlesMove.drop([new Coord(7, 7), new Coord(6, 6)]);

                    // Then it should be illegal
                    const reason: string = QuebecCastlesFailure.MUST_DROP_ONE_BY_ONE();
                    RulesUtils.expectMoveFailure(rules, state, move, reason, customConfig);
                });

            });

            describe('drop by batch', () => {

                const customConfig: MGPOptional<QuebecCastlesConfig> = MGPOptional.of({
                    ...defaultConfig.get(),
                    dropPieceYourself: true,
                    defender: 2,
                    invader: 2,
                });

                it('should refuse putting soldier outside territory (Player.ZERO)', () => {
                    // Given the second turn and a config where you drop yourself
                    const state: QuebecCastlesState = rules.getInitialState(customConfig);

                    // When dropping piece outside of territory
                    const move: QuebecCastlesMove = QuebecCastlesMove.drop([new Coord(5, 6), new Coord(7, 7)]);

                    // Then the move should be illegal
                    const reason: string = QuebecCastlesFailure.MUST_DROP_IN_YOUR_TERRITORY();
                    RulesUtils.expectMoveFailure(rules, state, move, reason, customConfig);
                });

                it('should refuse putting soldier outside territory (Player.ONE)', () => {
                    // Given the second turn and a config where you drop yourself
                    const state: QuebecCastlesState = new QuebecCastlesState([
                        [_, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, _],
                    ], 1, defaultThrones);

                    // When dropping piece outside of territory
                    const move: QuebecCastlesMove = QuebecCastlesMove.drop([new Coord(1, 1), new Coord(3, 2)]);

                    // Then the move should be illegal
                    const reason: string = QuebecCastlesFailure.MUST_DROP_IN_YOUR_TERRITORY();
                    RulesUtils.expectMoveFailure(rules, state, move, reason, customConfig);
                });

                it('should allow first player (defender) to drop all its soldier at once', () => {
                    // Given a custom config where you have to drop yourself
                    const state: QuebecCastlesState = rules.getInitialState(customConfig);

                    // When dropping all your pieces
                    const drops: Coord[] = [new Coord(8, 7), new Coord(7, 8)];
                    const move: QuebecCastlesMove = QuebecCastlesMove.drop(drops);

                    // Then the move should succeed and the pieces dropped
                    const expectedState: QuebecCastlesState = new QuebecCastlesState([
                        [_, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, O],
                        [_, _, _, _, _, _, _, O, _],
                    ], 1, defaultThrones);
                    RulesUtils.expectMoveSuccess(rules, state, move, expectedState, customConfig);
                });

                it('should forbid player to drop less soldier', () => {
                    // Given a custom config where you have to drop yourself
                    const state: QuebecCastlesState = rules.getInitialState(customConfig);

                    // When dropping less than all your pieces
                    const drops: Coord[] = [new Coord(7, 7)];
                    const move: QuebecCastlesMove = QuebecCastlesMove.drop(drops);

                    // Then the move should be illegal
                    const reason: string = QuebecCastlesFailure.MUST_DROP_ALL_YOUR_PIECES();
                    RulesUtils.expectMoveFailure(rules, state, move, reason, customConfig);
                });

                it('should forbid player to drop duplicate coord', () => {
                    // Given a custom config where you have to drop yourself
                    const state: QuebecCastlesState = rules.getInitialState(customConfig);

                    // When dropping twice the same coord
                    const drops: Coord[] = [new Coord(7, 7), new Coord(7, 7)];
                    const move: QuebecCastlesMove = QuebecCastlesMove.drop(drops);

                    // Then the move should be illegal
                    const reason: string = QuebecCastlesFailure.MUST_DROP_ALL_YOUR_PIECES();
                    RulesUtils.expectMoveFailure(rules, state, move, reason, customConfig);
                });

                it('should forbid player to drop more soldier', () => {
                    // Given a custom config where you have to drop yourself
                    const state: QuebecCastlesState = rules.getInitialState(customConfig);

                    // When dropping more than all your pieces
                    const drops: Coord[] = [new Coord(7, 7), new Coord(8, 7), new Coord(7, 8)];
                    const move: QuebecCastlesMove = QuebecCastlesMove.drop(drops);

                    // Then the move should be illegal
                    const reason: string = QuebecCastlesFailure.CANNOT_DROP_THAT_MUCH();
                    RulesUtils.expectMoveFailure(rules, state, move, reason, customConfig);
                });

                it('should allow second player (invader) to drop all its soldier at once', () => {
                    // Given a custom config where you have to drop yourself
                    const state: QuebecCastlesState = new QuebecCastlesState([
                        [_, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, O],
                        [_, _, _, _, _, _, _, O, _],
                    ], 1, defaultThrones);

                    // When dropping all your pieces
                    const drops: Coord[] = [new Coord(0, 1), new Coord(1, 0)];
                    const move: QuebecCastlesMove = QuebecCastlesMove.drop(drops);

                    // Then the move should succeed and the pieces dropped
                    const expectedState: QuebecCastlesState = new QuebecCastlesState([
                        [_, X, _, _, _, _, _, _, _],
                        [X, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, O],
                        [_, _, _, _, _, _, _, O, _],
                    ], 2, defaultThrones);
                    RulesUtils.expectMoveSuccess(rules, state, move, expectedState, customConfig);
                });

            });

            describe('isRhombic = false', () => {

                it('should refuse putting soldier outside territory (Player.ZERO)', () => {
                    // Given the initial state
                    const customConfig: MGPOptional<QuebecCastlesConfig> = MGPOptional.of({
                        ...defaultConfig.get(),
                        dropPieceByPiece: true,
                        dropPieceYourself: true,
                        isRhombic: false,
                    });
                    const state: QuebecCastlesState = rules.getInitialState(customConfig);

                    // When dropping piece outside of territory
                    const move: QuebecCastlesMove = QuebecCastlesMove.drop([new Coord(2, 2)]);

                    // Then the move should be illegal
                    const reason: string = QuebecCastlesFailure.MUST_DROP_IN_YOUR_TERRITORY();
                    RulesUtils.expectMoveFailure(rules, state, move, reason, customConfig);
                });

            });

            describe('defender & invader', () => {

                it('should have 5 pieces in two lines', () => {
                    // Given a custom config with 5 pieces to drop
                    const customConfig: MGPOptional<QuebecCastlesConfig> = MGPOptional.of({
                        ...defaultConfig.get(),
                        defender: 5,
                        invader: 5,
                    });

                    // When generating initial state
                    const state: QuebecCastlesState = rules.getInitialState(customConfig);

                    // Then it should have piece filled in corners
                    const expectedState: QuebecCastlesState = new QuebecCastlesState([
                        [_, X, X, _, _, _, _, _, _],
                        [X, X, _, _, _, _, _, _, _],
                        [X, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, _],
                        [_, _, _, _, _, _, _, _, O],
                        [_, _, _, _, _, _, _, O, O],
                        [_, _, _, _, _, _, O, O, _],
                    ], 0, defaultThrones);
                    expect(expectedState).toEqual(state);
                });

            });

        });

    });

    describe('Move Phase', () => {

        it('should forbid any dropping', () => {
            // Given initial state
            const state: QuebecCastlesState = rules.getInitialState(defaultConfig);

            // When dropping (even inside territory)
            const move: QuebecCastlesMove = QuebecCastlesMove.drop([new Coord(5, 7)]);

            // Then it should be illegal
            const reason: string = QuebecCastlesFailure.CANNOT_DROP_IN_MOVE_PHASE();
            RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
        });

        it('should forbid moving opponent piece', () => {
            // Given any state
            const state: QuebecCastlesState = rules.getInitialState(defaultConfig);

            // When trying to move opponent piece
            const move: QuebecCastlesMove = QuebecCastlesMove.translation(new Coord(2, 2), new Coord(4, 4));

            // Then it should be illegal
            const reason: string = RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_OPPONENT();
            RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
        });

        it('should forbid moving emtpy coord', () => {
            // Given any state
            const state: QuebecCastlesState = rules.getInitialState(defaultConfig);

            // When trying to move empty coord
            const move: QuebecCastlesMove = QuebecCastlesMove.translation(new Coord(3, 3), new Coord(4, 4));

            // Then it should be illegal
            const reason: string = RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_EMPTY();
            RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
        });

        it('should forbid landing on your own pieces', () => {
            // Given any state
            const state: QuebecCastlesState = rules.getInitialState(defaultConfig);

            // When trying to land on your own piece
            const move: QuebecCastlesMove = QuebecCastlesMove.translation(new Coord(6, 8), new Coord(6, 7));

            // Then it should be illegal
            const reason: string = RulesFailure.CANNOT_SELF_CAPTURE();
            RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
        });

        it('should forbid starting outside of board', () => {
            // Given any state
            const state: QuebecCastlesState = rules.getInitialState(defaultConfig);

            // When trying to start a move out of board
            const outOfRange: Coord = new Coord(-2, -2);
            const move: QuebecCastlesMove = QuebecCastlesMove.translation(outOfRange, new Coord(0, 0));

            // Then it should be illegal
            const reason: string = CoordFailure.OUT_OF_RANGE(outOfRange);
            RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
        });

        it('should forbid landing outside of board', () => {
            // Given any state
            const state: QuebecCastlesState = rules.getInitialState(defaultConfig);

            // When trying to land on outside the board
            const outOfRange: Coord = new Coord(6, 10);
            const move: QuebecCastlesMove = QuebecCastlesMove.translation(new Coord(6, 8), outOfRange);

            // Then it should be illegal
            const reason: string = CoordFailure.OUT_OF_RANGE(outOfRange);
            RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
        });

        it('should forbid landing on your own throne', () => {
            // Given any state
            const state: QuebecCastlesState = rules.getInitialState(defaultConfig);

            // When trying to land on outside the board
            const move: QuebecCastlesMove = QuebecCastlesMove.translation(new Coord(7, 7), new Coord(8, 8));

            // Then it should be illegal
            const reason: string = QuebecCastlesFailure.CANNOT_LAND_IN_YOUR_TRONE();
            RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
        });

        describe('Invader move', () => {

            it('should forbid move that are not orthogonal', () => {
                // Given any state
                const state: QuebecCastlesState = rules.getInitialState(defaultConfig).incrementTurn();

                // When trying to do an horse move
                const move: QuebecCastlesMove = QuebecCastlesMove.translation(new Coord(2, 2), new Coord(4, 3));

                // Then it should be illegal
                const reason: string = DirectionFailure.DIRECTION_MUST_BE_LINEAR();
                RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
            });

            it('should forbid single step', () => {
                // Given any state
                const state: QuebecCastlesState = rules.getInitialState(defaultConfig).incrementTurn();

                // When trying to land on outside the board
                const move: QuebecCastlesMove = QuebecCastlesMove.translation(new Coord(2, 2), new Coord(3, 3));

                // Then it should be illegal
                const reason: string = QuebecCastlesFailure.INVALID_INVADER_DISTANCE(1);
                RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
            });

            it('should forbid longer step', () => {
                // Given any state
                const state: QuebecCastlesState = rules.getInitialState(defaultConfig).incrementTurn();

                // When trying to land on outside the board
                const move: QuebecCastlesMove = QuebecCastlesMove.translation(new Coord(2, 2), new Coord(5, 5));

                // Then it should be illegal
                const reason: string = QuebecCastlesFailure.INVALID_INVADER_DISTANCE(3);
                RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
            });

            it('should forbid move jumping over a coord', () => {
                // Given any state
                const state: QuebecCastlesState = rules.getInitialState(defaultConfig).incrementTurn();

                // When trying to jump over a piece
                const move: QuebecCastlesMove = QuebecCastlesMove.translation(new Coord(1, 1), new Coord(3, 3));

                // Then it should be illegal
                const reason: string = RulesFailure.SOMETHING_IN_THE_WAY();
                RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
            });

            it('should allow standard jump', () => {
                // Given any state
                const state: QuebecCastlesState = rules.getInitialState(defaultConfig).incrementTurn();

                // When trying normal jump
                const move: QuebecCastlesMove = QuebecCastlesMove.translation(new Coord(2, 2), new Coord(4, 4));

                // Then the move should succeed
                const expectedState: QuebecCastlesState = new QuebecCastlesState([
                    [_, X, X, X, X, _, _, _, _],
                    [X, X, X, X, _, _, _, _, _],
                    [X, X, _, _, _, _, _, _, _],
                    [X, X, _, _, _, _, _, _, _],
                    [X, _, _, _, X, _, _, _, _],
                    [_, _, _, _, _, _, _, _, O],
                    [_, _, _, _, _, _, _, O, O],
                    [_, _, _, _, _, _, O, O, O],
                    [_, _, _, _, _, O, O, O, _],
                ], 2, defaultThrones);
                RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
            });

        });

        describe('Defender move', () => {

            it('should forbid move that are not a single step', () => {
                // Given any state
                const state: QuebecCastlesState = rules.getInitialState(defaultConfig);

                // When trying to land on outside the board
                const move: QuebecCastlesMove = QuebecCastlesMove.translation(new Coord(7, 7), new Coord(5, 5));

                // Then it should be illegal
                const reason: string = QuebecCastlesFailure.INVALID_DEFENDER_DISTANCE(2);
                RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
            });

            it('should allow single step', () => {
                // Given any state
                const state: QuebecCastlesState = rules.getInitialState(defaultConfig);

                // When trying normal jump
                const move: QuebecCastlesMove = QuebecCastlesMove.translation(new Coord(6, 7), new Coord(6, 6));

                // Then the move should succeed
                const expectedState: QuebecCastlesState = new QuebecCastlesState([
                    [_, X, X, X, X, _, _, _, _],
                    [X, X, X, X, _, _, _, _, _],
                    [X, X, X, _, _, _, _, _, _],
                    [X, X, _, _, _, _, _, _, _],
                    [X, _, _, _, _, _, _, _, _],
                    [_, _, _, _, _, _, _, _, O],
                    [_, _, _, _, _, _, O, O, O],
                    [_, _, _, _, _, _, _, O, O],
                    [_, _, _, _, _, O, O, O, _],
                ], 1, defaultThrones);
                RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
            });

        });

    });

    describe('getGameStatus', () => {

        it('should recognize invader victory (throne taken)', () => {
            // Given any state where invader has stepped on the defender throne
            const state: QuebecCastlesState = new QuebecCastlesState([
                [_, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _],
                [_, _, _, O, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, X],
            ], 10, defaultThrones);

            // When evaluating its value
            // Then it should be a victory
            const node: QuebecCastlesNode = new QuebecCastlesNode(state);
            RulesUtils.expectToBeVictoryFor(rules, node, Player.ONE, defaultConfig);
        });

        it('should recognize defender victory (throne taken)', () => {
            // Given any state where invader has stepped on the defender throne
            const state: QuebecCastlesState = new QuebecCastlesState([
                [O, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _],
                [_, _, _, _, X, _, _, _, _],
                [_, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _],
            ], 10, defaultThrones);

            // When evaluating its value
            // Then it should be a victory
            const node: QuebecCastlesNode = new QuebecCastlesNode(state);
            RulesUtils.expectToBeVictoryFor(rules, node, Player.ZERO, defaultConfig);
        });

        it('should recognize invader victory (capture)', () => {
            // Given any state where invader has capture all defender
            const state: QuebecCastlesState = new QuebecCastlesState([
                [_, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, X, _, _],
                [_, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _],
            ], 10, defaultThrones);

            // When evaluating its value
            // Then it should be a victory
            const node: QuebecCastlesNode = new QuebecCastlesNode(state);
            RulesUtils.expectToBeVictoryFor(rules, node, Player.ONE, defaultConfig);
        });

        it('should recognize defender victory (capture)', () => {
            // Given any state where defender has captured all invader
            const state: QuebecCastlesState = new QuebecCastlesState([
                [_, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _],
                [_, _, _, O, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _],
            ], 10, defaultThrones);

            // When evaluating its value
            // Then it should be a victory
            const node: QuebecCastlesNode = new QuebecCastlesNode(state);
            RulesUtils.expectToBeVictoryFor(rules, node, Player.ZERO, defaultConfig);
        });

        it('should recognize draw', () => {
            // Given any state
            const state: QuebecCastlesState = rules.getInitialState(defaultConfig);

            // When evaluating its value
            // Then it should be a victory
            const node: QuebecCastlesNode = new QuebecCastlesNode(state);
            RulesUtils.expectToBeOngoing(rules, node, defaultConfig);
        });

        it('should recognize draw (in drop phase)', () => {
            // Given any state in drop phase for player for Player.ONE
            const customConfig: MGPOptional<QuebecCastlesConfig> = MGPOptional.of({
                ...defaultConfig.get(),
                defender: 3,
                dropPieceByPiece: false, dropPieceYourself: true,
            });
            const state: QuebecCastlesState = new QuebecCastlesState([
                [_, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, O, O],
                [_, _, _, _, _, _, _, O, _],
            ], 1, defaultThrones);

            // When evaluating its value
            // Then it should be a victory
            const node: QuebecCastlesNode = new QuebecCastlesNode(state);
            RulesUtils.expectToBeOngoing(rules, node, customConfig);
        });

    });

    describe('custom config', () => {

        it('should fill board for rectangular version', () => {
            // Given a rectangular config
            const customConfig: MGPOptional<QuebecCastlesConfig> = MGPOptional.of({
                ...defaultConfig.get(),
                isRhombic: false,
            });

            // When displaying initial board
            const state: QuebecCastlesState = rules.getInitialState(customConfig);

            // Then it should look like this
            const expectedState: QuebecCastlesState = new QuebecCastlesState([
                [_, X, X, X, X, X, X, X, X],
                [_, X, X, X, _, X, X, X, _],
                [_, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _],
                [_, _, _, _, O, _, _, _, _],
                [O, O, O, O, O, O, O, O, _],
            ], 0, defaultThrones);
            expect(state).toEqual(expectedState);
        });

    });

    describe('linesForTerritory', () => {

        it('');

    });

});
