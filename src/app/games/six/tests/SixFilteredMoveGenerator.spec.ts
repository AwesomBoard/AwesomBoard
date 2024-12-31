/* eslint-disable max-lines-per-function */
import { MGPOptional } from '@everyboard/lib';

import { Coord } from 'src/app/jscaip/Coord';
import { Player, PlayerOrNone } from 'src/app/jscaip/Player';
import { SixState } from '../SixState';
import { SixMove } from '../SixMove';
import { Table } from 'src/app/jscaip/TableUtils';
import { SixConfig, SixNode, SixRules } from '../SixRules';
import { SixFilteredMoveGenerator } from '../SixFilteredMoveGenerator';

const O: PlayerOrNone = Player.ZERO;
const X: PlayerOrNone = Player.ONE;
const _: PlayerOrNone = PlayerOrNone.NONE;

describe('SixFilteredMoveGenerator', () => {

    let moveGenerator: SixFilteredMoveGenerator;
    const defaultConfig: MGPOptional<SixConfig> = SixRules.get().getDefaultRulesConfig();

    beforeEach(() => {
        moveGenerator = new SixFilteredMoveGenerator();
    });

    it(`should propose only one starting piece when all pieces are blocking an opponent's victory (lines)`, () => {
        // Given an initial board where all pieces are blocked but there is a forcing move
        const board: Table<PlayerOrNone> = [
            [_, _, _, O, O, O, _],
            [O, X, X, X, X, X, _],
            [O, X, X, X, X, X, O],
            [_, O, O, O, _, _, _],
        ];
        const state: SixState = SixState.ofRepresentation(board, 40);
        const node: SixNode = new SixNode(state);

        // When listing the moves
        const choices: SixMove[] = moveGenerator.getListMoves(node, defaultConfig);

        // Then there should be only one starting piece
        const startingCoord: Coord = choices[0].start.get();
        expect(choices.every((move: SixMove) => move.start.equalsValue(startingCoord))).toBeTrue();
    });

    it(`should propose only one starting piece when all pieces are blocking an opponent's victory (triangle)`, () => {
        // Given an initial board where all pieces are blocked but there is a forcing move
        const board: Table<PlayerOrNone> = [
            [_, X, X, _],
            [_, O, X, O],
            [X, X, X, _],
        ];
        const state: SixState = SixState.ofRepresentation(board, 40);
        const node: SixNode = new SixNode(state);

        // When listing the moves
        const choices: SixMove[] = moveGenerator.getListMoves(node, defaultConfig);

        // Then there should be only one starting piece
        const startingCoord: Coord = choices[0].start.get();
        expect(choices.every((move: SixMove) => move.start.equalsValue(startingCoord))).toBeTrue();
    });

    it(`should propose only one starting piece when all pieces are blocking an opponent's victory (circle)`, () => {
        // Given an initial board where all pieces are blocked but there is a forcing move
        const board: Table<PlayerOrNone> = [
            [_, X, X, _],
            [O, _, X, _],
            [X, X, O, _],
        ];
        const state: SixState = SixState.ofRepresentation(board, 40);
        const node: SixNode = new SixNode(state);

        // When listing the moves
        const choices: SixMove[] = moveGenerator.getListMoves(node, defaultConfig);

        // Then there should be only one starting piece
        const startingCoord: Coord = choices[0].start.get();
        expect(choices.every((move: SixMove) => move.start.equalsValue(startingCoord))).toBeTrue();
    });

    it('should give all possible drops in phase 1', () => {
        // Given a game state in phase 1
        const state: SixState = SixState.ofRepresentation([
            [O],
        ], 1);
        const node: SixNode = new SixNode(state);

        // When listing the moves
        const listMoves: SixMove[] = moveGenerator.getListMoves(node, defaultConfig);

        // Then the list should have all the possible drops and only them
        expect(listMoves.every((move: SixMove) => move.isDrop())).toBeTrue();
        expect(listMoves.length).toBe(6); // One for each neighbors
    });

    it('should pass possible movement when Phase 2', () => {
        // Given a game state in phase 2
        const state: SixState = SixState.ofRepresentation([
            [O, O, O, X, X, X],
            [O, O, O, X, X, X],
        ], 42);
        const node: SixNode = new SixNode(state);

        // When listing the moves
        const listMoves: SixMove[] = moveGenerator.getListMoves(node, defaultConfig);

        // Then the list should have all the possible moves and only them
        expect(listMoves.every((move: SixMove) => move.isDrop())).toBeFalse();
    });

    it('should include cutting move as well', () => {
        // Given a game state in phase 2
        const state: SixState = SixState.ofRepresentation([
            [O, O, X, O, X, X, O, X, _],
            [X, X, O, X, _, O, X, O, O],
        ], 43);
        const node: SixNode = new SixNode(state);

        // When listing the moves
        const listMoves: SixMove[] = moveGenerator.getListMoves(node, defaultConfig);

        // Then the list should have all the possible moves and only them
        const cuttingMove: SixMove = SixMove.ofCut(new Coord(4, 0), new Coord(8, 0), new Coord(0, 0));
        expect(listMoves.some((move: SixMove) => move.equals(cuttingMove))).toBeTrue();
    });

    describe('Custom Config', () => {

        it('should pass possible movement when Phase 2', () => {
            // Given a game state in phase 2
            // And in custom config
            const state: SixState = SixState.ofRepresentation([
                [O, O, O, X, X, X],
                [O, O, O, X, X, X],
            ], 22);
            const node: SixNode = new SixNode(state);
            const customCOnfig: MGPOptional<SixConfig> = MGPOptional.of({
                ...defaultConfig.get(),
                piecesPerPlayer: 10,
            });

            // When listing the moves
            const listMoves: SixMove[] = moveGenerator.getListMoves(node, customCOnfig);

            // Then the list should have all the possible moves and only them
            expect(listMoves.every((move: SixMove) => move.isDrop())).toBeFalse();
        });

    });

});
