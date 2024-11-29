/* eslint-disable max-lines-per-function */
import { Coord } from 'src/app/jscaip/Coord';
import { Player, PlayerOrNone } from 'src/app/jscaip/Player';
import { Table } from 'src/app/jscaip/TableUtils';
import { SixState } from '../SixState';
import { SixMove } from '../SixMove';
import { SixFailure } from '../SixFailure';
import { SixConfig, SixNode, SixRules } from '../SixRules';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { RulesUtils } from 'src/app/jscaip/tests/RulesUtils.spec';
import { MGPOptional } from '@everyboard/lib';
import { Vector } from 'src/app/jscaip/Vector';

describe('SixRules', () => {

    let rules: SixRules;
    const defaultConfig: MGPOptional<SixConfig> = SixRules.get().getDefaultRulesConfig();

    const _: PlayerOrNone = PlayerOrNone.NONE;
    const O: PlayerOrNone = Player.ZERO;
    const X: PlayerOrNone = Player.ONE;

    beforeEach(() => {
        rules = SixRules.get();
    });

    describe('dropping', () => {

        it('should forbid landing/dropping on existing piece (drop)', () => {
            // Given a board in Phase 1 with pieces
            const board: Table<PlayerOrNone> = [
                [_, _, O],
                [_, X, _],
                [X, O, _],
            ];
            const state: SixState = SixState.ofRepresentation(board, 4);

            // When dropping a piece on another
            const move: SixMove = SixMove.ofDrop(new Coord(1, 1));

            // Then the move should be illegal
            const reason: string = RulesFailure.MUST_LAND_ON_EMPTY_SPACE();
            RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
        });

        it('should forbid landing/dropping on existing piece (movement)', () => {
            // Given a board in Phase 1 with pieces
            const board: Table<PlayerOrNone> = [
                [X, _, O],
                [_, X, _],
                [_, O, _],
            ];
            const state: SixState = SixState.ofRepresentation(board, 42);

            // When dropping a piece on another
            const move: SixMove = SixMove.ofMovement(new Coord(0, 0), new Coord(1, 1));

            // Then the move should be illegal
            const reason: string = RulesFailure.MUST_LAND_ON_EMPTY_SPACE();
            RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
        });

        it('should forbid drop after 40th turn', () => {
            // Given a [fake] 40th turn board
            const board: Table<PlayerOrNone> = [
                [_, _, O],
                [_, X, _],
                [X, O, _],
            ]; // Fake 40th turn, since there are not 42 stones on the board
            const state: SixState = SixState.ofRepresentation(board, 40);

            // When dropping on a legal landing coord
            const move: SixMove = SixMove.ofDrop(new Coord(0, 1));

            // Then the move should be illegal
            const reason: string = SixFailure.CAN_NO_LONGER_DROP();
            RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
        });

        it('should allow drop outside the current range', () => {
            // Given a board in a certain range (2 by 2 when put in a square)
            const board: Table<PlayerOrNone> = [
                [O],
                [X],
            ];
            const state: SixState = SixState.ofRepresentation(board, 0);

            // When playing on a coord that is outside of the representation board
            const move: SixMove = SixMove.ofDrop(new Coord(-1, 1));

            // Then the move should succeed
            const expectedBoard: Table<PlayerOrNone> = [
                [_, O],
                [O, X],
            ];
            const expectedState: SixState = SixState.ofRepresentation(expectedBoard, 1, new Vector(-1, 0));
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
        });

        it('should forbid dropping coord to be not connected to any piece', () => {
            // Given a board
            const board: Table<PlayerOrNone> = [
                [_, _, O],
                [_, _, O],
                [X, X, O],
            ];
            const state: SixState = SixState.ofRepresentation(board, 5);

            // When dropping a piece on a coord neighbor to no pieces
            const move: SixMove = SixMove.ofDrop(new Coord(0, 0));

            // Then the move should be illegal
            const reason: string = SixFailure.MUST_DROP_NEXT_TO_OTHER_PIECE();
            RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
        });

    });

    describe('Deplacement', () => {

        it('should forbid movement before 40th turn', () => {
            // Given a board in phase 1
            const board: Table<PlayerOrNone> = [
                [_, _, O],
                [_, X, _],
                [X, O, _],
            ];
            const state: SixState = SixState.ofRepresentation(board, 0);

            // When doing a movement
            const move: SixMove = SixMove.ofMovement(new Coord(1, 2), new Coord(3, 0));

            // Then the move should be illegal
            const reason: string = SixFailure.CANNOT_DO_DEPLACEMENT_YET();
            RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
        });

        it('should forbid moving opponent piece', () => {
            // Given a board in Phase 2 with pieces
            const board: Table<PlayerOrNone> = [
                [_, _, O],
                [_, X, _],
                [X, O, _],
            ];
            const state: SixState = SixState.ofRepresentation(board, 42);

            // When trying to move an opponent piece
            const move: SixMove = SixMove.ofMovement(new Coord(0, 2), new Coord(2, 1));

            // Then the move should be illegal
            const reason: string = RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_OPPONENT();
            RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
        });

        it('should forbid moving empty piece', () => {
            // Given a board in second phase
            const board: Table<PlayerOrNone> = [
                [_, _, O],
                [_, X, _],
                [X, O, _],
            ];
            const state: SixState = SixState.ofRepresentation(board, 42);

            // When trying to move empty piece
            const move: SixMove = SixMove.ofMovement(new Coord(0, 0), new Coord(2, 1));

            // Then the move should be illegal
            const reason: string = RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_EMPTY();
            RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
        });

        it('should refuse dropping piece where its only neighbor is herself last turn', () => {
            // Given a board in phase 2
            const board: Table<PlayerOrNone> = [
                [_, _, O],
                [_, X, _],
                [X, O, _],
            ];
            const state: SixState = SixState.ofRepresentation(board, 42);

            // When moving a piece on a space that only that piece neighbored
            const move: SixMove = SixMove.ofMovement(new Coord(1, 2), new Coord(2, 2));

            // Then the move should be illegal
            const reason: string = SixFailure.MUST_DROP_NEXT_TO_OTHER_PIECE();
            RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
        });

    });

    describe('Deconnection', () => {

        it('should deconnect smaller group automatically', () => {
            // Given a board where two pieces could be disconnected
            const board: Table<PlayerOrNone> = [
                [X, X, O, _, _],
                [X, X, O, _, _],
                [_, X, O, _, _],
                [_, X, O, _, X],
                [_, X, O, O, X],
            ];
            const state: SixState = SixState.ofRepresentation(board, 42);

            // When disconnecting them
            const move: SixMove = SixMove.ofMovement(new Coord(3, 4), new Coord(3, 0));

            // Then the small group should be removed from the board
            const expectedBoard: Table<PlayerOrNone> = [
                [X, X, O, O],
                [X, X, O, _],
                [_, X, O, _],
                [_, X, O, _],
                [_, X, O, _],
            ];
            const expectedState: SixState = SixState.ofRepresentation(expectedBoard, 43);
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
        });

        it('should refuse deconnection of same sized group when no group is mentionned in move', () => {
            // Given a board where a equal cut is possible
            const board: Table<PlayerOrNone> = [
                [X, X, _, O, _],
                [X, X, _, O, _],
                [_, X, O, O, _],
                [_, X, _, O, _],
                [_, X, _, O, O],
            ];
            const state: SixState = SixState.ofRepresentation(board, 42);

            // When doing that move without choosing which half to keep
            const move: SixMove = SixMove.ofMovement(new Coord(2, 2), new Coord(4, 3));

            // Then the move should be illegal
            const reason: string = SixFailure.MUST_CUT();
            RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
        });

        it('should refuse deconnection of different sized group with group mentionned in move', () => {
            // Given a board with a cut possible
            const board: Table<PlayerOrNone> = [
                [X, X, _, _, _],
                [X, X, _, _, _],
                [_, X, O, O, _],
                [_, X, _, O, _],
                [_, X, _, O, O],
            ];
            const state: SixState = SixState.ofRepresentation(board, 42);

            // When doing that cut but mentionning a group to keep
            const move: SixMove = SixMove.ofCut(new Coord(2, 2), new Coord(4, 3), new Coord(0, 0));

            // Then the move should be illegal
            const reason: string = SixFailure.CANNOT_CHOOSE_TO_KEEP();
            RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
        });

        it('should refuse deconnection where captured coord is empty', () => {
            // Given a board with an equal cut possible
            const board: Table<PlayerOrNone> = [
                [X, X, _, O, _],
                [X, X, _, O, _],
                [_, X, O, O, _],
                [_, X, _, O, O],
                [_, X, _, O, _],
            ];
            const state: SixState = SixState.ofRepresentation(board, 42);

            // When doing it and mentionning empty space to keep
            const move: SixMove = SixMove.ofCut(new Coord(2, 2), new Coord(4, 4), new Coord(4, 0));

            // Then the move should be illegal
            const reason: string = SixFailure.CANNOT_KEEP_EMPTY_COORD();
            RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
        });

        it('should refuse deconnection where captured coord is in a smaller group', () => {
            // Given a board with three group split, one of them beeing too small to be chosen
            const board: Table<PlayerOrNone> = [
                [_, X, X, _],
                [_, X, X, _],
                [_, _, O, O],
                [X, X, _, _],
                [X, X, _, _],
            ];
            const state: SixState = SixState.ofRepresentation(board, 42);

            // When choosing that small group
            const move: SixMove = SixMove.ofCut(new Coord(2, 2), new Coord(4, 2), new Coord(4, 2));

            // Then the move should be illegal
            const reason: string = SixFailure.MUST_CAPTURE_BIGGEST_GROUPS();
            RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
        });

    });

    describe('victories', () => {

        describe('Shape Victories', () => {

            it('should consider winner player who align 6 pieces (playing on border)', () => {
                // Given a board in pre-victory
                const board: Table<PlayerOrNone> = [
                    [O, _, _, _, _],
                    [O, _, _, _, O],
                    [O, _, _, O, X],
                    [O, _, O, X, _],
                    [O, O, X, X, _],
                    [_, X, _, _, _],
                ];
                const state: SixState = SixState.ofRepresentation(board, 10);

                // When expanding it
                const move: SixMove = SixMove.ofDrop(new Coord(0, 5));

                // Then the winner should be player zero
                const expectedBoard: Table<PlayerOrNone> = [
                    [O, _, _, _, _],
                    [O, _, _, _, O],
                    [O, _, _, O, X],
                    [O, _, O, X, _],
                    [O, O, X, X, _],
                    [O, X, _, _, _],
                ];
                const expectedState: SixState =
                    SixState.ofRepresentation(expectedBoard, 11);
                RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
                const node: SixNode = new SixNode(expectedState, MGPOptional.empty(), MGPOptional.of(move));
                RulesUtils.expectToBeVictoryFor(rules, node, Player.ZERO, defaultConfig);
            });

            it('should consider winner player who align 6 pieces (playing in the middle)', () => {
                // Given a board where player zero is about to win
                const board: Table<PlayerOrNone> = [
                    [_, _, _, _, _, O],
                    [_, _, _, _, O, X],
                    [_, _, _, O, X, _],
                    [_, _, _, X, X, _],
                    [_, O, X, _, _, _],
                    [O, O, _, _, _, _],
                ];
                const state: SixState = SixState.ofRepresentation(board, 10);

                // When playing the winning move
                const move: SixMove = SixMove.ofDrop(new Coord(2, 3));

                // Then the bord should be a victory
                const expectedBoard: Table<PlayerOrNone> = [
                    [_, _, _, _, _, O],
                    [_, _, _, _, O, X],
                    [_, _, _, O, X, _],
                    [_, _, O, X, X, _],
                    [_, O, X, _, _, _],
                    [O, O, _, _, _, _],
                ];
                const expectedState: SixState = SixState.ofRepresentation(expectedBoard, 11);
                RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
                const node: SixNode = new SixNode(expectedState, MGPOptional.empty(), MGPOptional.of(move));
                RulesUtils.expectToBeVictoryFor(rules, node, Player.ZERO, defaultConfig);
            });

            it('should consider winner player who draw a circle/hexagon of his pieces', () => {
                // Given a board close to be a victory
                const board: Table<PlayerOrNone> = [
                    [_, _, _, _, X],
                    [O, _, _, X, _],
                    [O, _, _, X, _],
                    [O, X, _, X, O],
                    [X, X, X, _, _],
                    [_, _, O, X, _],
                ];
                const state: SixState = SixState.ofRepresentation(board, 9);

                // When creating a winning hexagon/circle
                const move: SixMove = SixMove.ofDrop(new Coord(2, 2));

                // Then board should be a victory
                const expectedBoard: Table<PlayerOrNone> = [
                    [_, _, _, _, X],
                    [O, _, _, X, _],
                    [O, _, X, X, _],
                    [O, X, _, X, O],
                    [X, X, X, _, _],
                    [_, _, O, X, _],
                ];
                const expectedState: SixState = SixState.ofRepresentation(expectedBoard, 10);
                RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
                const node: SixNode = new SixNode(expectedState, MGPOptional.empty(), MGPOptional.of(move));
                RulesUtils.expectToBeVictoryFor(rules, node, Player.ONE, defaultConfig);
            });

            it('should consider winner player who draw a triangle of his pieces (corner drop)', () => {
                // Given a bboard about to have a triangle victory
                const board: Table<PlayerOrNone> = [
                    [O, X, _, X, _],
                    [O, _, _, _, _],
                    [O, _, X, X, O],
                    [O, X, X, X, _],
                    [O, O, _, X, _],
                ];
                const state: SixState = SixState.ofRepresentation(board, 11);

                // When placing the last piece of the triangle
                const move: SixMove = SixMove.ofDrop(new Coord(3, 1));

                // Then the board should be a victory
                const expectedBoard: Table<PlayerOrNone> = [
                    [O, X, _, X, _],
                    [O, _, _, X, _],
                    [O, _, X, X, O],
                    [O, X, X, X, _],
                    [O, O, _, X, _],
                ];
                const expectedState: SixState = SixState.ofRepresentation(expectedBoard, 12);
                RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
                const node: SixNode = new SixNode(expectedState, MGPOptional.empty(), MGPOptional.of(move));
                RulesUtils.expectToBeVictoryFor(rules, node, Player.ONE, defaultConfig);
            });

            it('should consider winner player who draw a triangle of his pieces (edge drop)', () => {
                // Given a board where a triangle is about to be created
                const board: Table<PlayerOrNone> = [
                    [O, _, _, _, X],
                    [O, X, _, X, _],
                    [O, _, _, X, O],
                    [O, X, X, X, _],
                    [X, O, _, _, _],
                ];
                const state: SixState = SixState.ofRepresentation(board, 11);

                // When playing on the last empty edge of the triangle
                const move: SixMove = SixMove.ofDrop(new Coord(2, 2));

                // Then the move should succeed and the game should be over
                const expectedBoard: Table<PlayerOrNone> = [
                    [O, _, _, _, X],
                    [O, X, _, X, _],
                    [O, _, X, X, O],
                    [O, X, X, X, _],
                    [X, O, _, _, _],
                ];
                const expectedState: SixState = SixState.ofRepresentation(expectedBoard, 12);
                RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
                const node: SixNode = new SixNode(expectedState, MGPOptional.empty(), MGPOptional.of(move));
                RulesUtils.expectToBeVictoryFor(rules, node, Player.ONE, defaultConfig);
            });

            it('should consider winner player who draw a circle/hexagon of his pieces (coverage remix)', () => {
                // Given a board with a hexagon about to be created
                const board: Table<PlayerOrNone> = [
                    [O, _, _, _, _],
                    [O, _, _, X, _],
                    [O, X, _, X, O],
                    [O, X, X, _, _],
                    [_, _, O, X, _],
                ];
                const state: SixState = SixState.ofRepresentation(board, 9);

                // When completing it
                const move: SixMove = SixMove.ofDrop(new Coord(2, 1));

                // Then the move should be a victory
                const expectedBoard: Table<PlayerOrNone> = [
                    [O, _, _, _, _],
                    [O, _, X, X, _],
                    [O, X, _, X, O],
                    [O, X, X, _, _],
                    [_, _, O, X, _],
                ];
                const expectedState: SixState = SixState.ofRepresentation(expectedBoard, 10);
                RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
                const node: SixNode = new SixNode(expectedState, MGPOptional.empty(), MGPOptional.of(move));
                RulesUtils.expectToBeVictoryFor(rules, node, Player.ONE, defaultConfig);
            });

        });

        describe('Disconnection Victories', () => {

            it('should consider loser PLAYER.ZERO when he drop below 6 pieces on phase two', () => {
                // Given a board in phase two
                const board: Table<PlayerOrNone> = [
                    [O, O, X, _, _],
                    [_, O, X, _, _],
                    [_, O, X, _, _],
                    [_, O, X, _, O],
                    [_, _, X, X, O],
                ];
                const state: SixState = SixState.ofRepresentation(board, 43);

                // When making the opponent pass below 6 pieces
                const move: SixMove = SixMove.ofMovement(new Coord(3, 4), new Coord(3, 0));

                // Then the move should be a victory
                const expectedBoard: Table<PlayerOrNone> = [
                    [O, O, X, X],
                    [_, O, X, _],
                    [_, O, X, _],
                    [_, O, X, _],
                    [_, _, X, _],
                ];
                const expectedState: SixState = SixState.ofRepresentation(expectedBoard, 44);
                RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
                const node: SixNode = new SixNode(expectedState, MGPOptional.empty(), MGPOptional.of(move));
                RulesUtils.expectToBeVictoryFor(rules, node, Player.ONE, defaultConfig);
            });

            it('should consider loser PLAYER.ONE when he drop below 6 pieces on phase two', () => {
                // Given a board in phase 2
                const board: Table<PlayerOrNone> = [
                    [X, X, O, _, _],
                    [_, X, O, _, _],
                    [_, X, O, _, _],
                    [_, X, O, _, X],
                    [_, _, O, O, X],
                ];
                const state: SixState = SixState.ofRepresentation(board, 42);

                // When making the opponent drop below 5 pieces
                const move: SixMove = SixMove.ofMovement(new Coord(3, 4), new Coord(3, 0));

                // Then the move should be a victory
                const expectedBoard: Table<PlayerOrNone> = [
                    [X, X, O, O],
                    [_, X, O, _],
                    [_, X, O, _],
                    [_, X, O, _],
                    [_, _, O, _],
                ];
                const expectedState: SixState = SixState.ofRepresentation(expectedBoard, 43);
                RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
                const node: SixNode = new SixNode(expectedState, MGPOptional.empty(), MGPOptional.of(move));
                RulesUtils.expectToBeVictoryFor(rules, node, Player.ZERO, defaultConfig);
            });

            it('should consider winner Player who has more pieces than opponent and both have less than 6 (Player.ZERO)', () => {
                // Given a board in phase 2
                const board: Table<PlayerOrNone> = [
                    [_, _, _, _, _, O, X, X],
                    [O, O, O, O, O, _, _, O],
                    [_, _, _, _, X, _, _, _],
                    [_, _, X, X, X, _, _, _],
                ];
                const state: SixState = SixState.ofRepresentation(board, 40);

                // When making both player drop below 6 pieces
                const move: SixMove = SixMove.ofMovement(new Coord(4, 1), new Coord(-1, 1));

                // Then the one with the more pieces remaining win
                const expectedBoard: Table<PlayerOrNone> = [
                    [O, O, O, O, O],
                ];
                const expectedState: SixState = SixState.ofRepresentation(expectedBoard, 41, new Vector(-1, 1));
                RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
                const node: SixNode = new SixNode(expectedState, MGPOptional.empty(), MGPOptional.of(move));
                RulesUtils.expectToBeVictoryFor(rules, node, Player.ZERO, defaultConfig);
            });

            it('should consider winner Player who has more pieces than opponent and both have less than 6 (Player.ONE)', () => {
                // Given a board in phase 2
                const board: Table<PlayerOrNone> = [
                    [_, _, _, _, _, X, O],
                    [X, X, X, X, O, _, _],
                    [X, _, _, _, O, _, _],
                    [_, _, _, O, O, _, _],
                ];
                const state: SixState = SixState.ofRepresentation(board, 42);

                // When dropping both player below 6 pieces
                const move: SixMove = SixMove.ofMovement(new Coord(4, 1), new Coord(6, 1));

                // Then the player with the more piece win
                const expectedBoard: Table<PlayerOrNone> = [
                    [X, X, X, X],
                    [X, _, _, _],
                ];
                const expectedState: SixState = SixState.ofRepresentation(expectedBoard, 43, new Vector(0, 1));
                RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
                const node: SixNode = new SixNode(expectedState, MGPOptional.empty(), MGPOptional.of(move));
                RulesUtils.expectToBeVictoryFor(rules, node, Player.ONE, defaultConfig);
            });

        });

    });

    describe('custom config', () => {

        it('should recognize victory when dropping bellow 6 pieces in shorter game', () => {
            // Given a custom config where you need to drop less pieces to reach second phase
            const customConfig: MGPOptional<SixConfig> = MGPOptional.of({
                ...defaultConfig.get(),
                piecePerPlayer: 5,
            });
            // And a state in phase two
            const board: Table<PlayerOrNone> = [
                [O, O, X, _, _],
                [_, O, X, _, _],
                [_, O, X, _, _],
                [_, O, X, _, _],
                [_, _, X, X, O],
            ];
            const state: SixState = SixState.ofRepresentation(board, 21);

            // When making the opponent pass below 6 pieces
            const move: SixMove = SixMove.ofMovement(new Coord(3, 4), new Coord(3, 0));

            // Then the move should be a victory
            const expectedBoard: Table<PlayerOrNone> = [
                [O, O, X, X],
                [_, O, X, _],
                [_, O, X, _],
                [_, O, X, _],
                [_, _, X, _],
            ];
            const expectedState: SixState = SixState.ofRepresentation(expectedBoard, 22);
            RulesUtils.expectMoveSuccess(rules, state, move, expectedState, customConfig);
            const node: SixNode = new SixNode(expectedState, MGPOptional.empty(), MGPOptional.of(move));
            RulesUtils.expectToBeVictoryFor(rules, node, Player.ONE, customConfig);
        });

    });

});
