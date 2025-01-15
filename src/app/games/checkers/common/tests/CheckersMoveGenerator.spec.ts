/* eslint-disable max-lines-per-function */
import { MGPOptional } from '@everyboard/lib';
import { CheckersMove } from '../CheckersMove';
import { CheckersMoveGenerator } from '../CheckersMoveGenerator';
import { AbstractCheckersRules, CheckersConfig, CheckersNode } from '../AbstractCheckersRules';
import { CheckersPiece, CheckersStack, CheckersState } from '../CheckersState';
import { InternationalCheckersRules } from '../../international-checkers/InternationalCheckersRules';
import { LascaRules } from '../../lasca/LascaRules';
import { Coord } from 'src/app/jscaip/Coord';

const U: CheckersStack = new CheckersStack([CheckersPiece.ZERO]);
const V: CheckersStack = new CheckersStack([CheckersPiece.ONE]);
const O: CheckersStack = new CheckersStack([CheckersPiece.ZERO_PROMOTED]);
const X: CheckersStack = new CheckersStack([CheckersPiece.ONE_PROMOTED]);
const _: CheckersStack = CheckersStack.EMPTY;

const rules: AbstractCheckersRules[] = [
    InternationalCheckersRules.get(),
    LascaRules.get(),
];

for (const rule of rules) {

    describe('CheckersMoveGenerator for ' + rule.constructor.name, () => {

        let moveGenerator: CheckersMoveGenerator;
        const defaultConfig: MGPOptional<CheckersConfig> = rule.getDefaultRulesConfig();

        beforeEach(() => {
            moveGenerator = new CheckersMoveGenerator(rule);
        });

        it('should return full list of steps when no capture must be done', () => {
            // Given a state where only steps can be made
            const state: CheckersState = rule.getInitialState(defaultConfig);
            const node: CheckersNode = new CheckersNode(state);

            // When listing the moves
            const moves: CheckersMove[] = moveGenerator.getListMoves(node, defaultConfig);

            // Then it should return the list of steps
            expect(moves.every((move: CheckersMove) => rule.isMoveStep(move))).toBe(true);
        });

        it('should not suggest invalid move (not jumping twice the same coord)', () => {
            // Given a state where current player could be tempted to do illegal capture
            const customConfig: MGPOptional<CheckersConfig> = MGPOptional.of({
                ...rule.getDefaultRulesConfig().get(),
                frisianCaptureAllowed: true,
                promotedPiecesCanFly: true,
                mustMakeMaximalCapture: true,
            });
            const state: CheckersState = CheckersState.of([
                [U, _, U, _, X, _, U],
                [_, _, _, U, _, _, _],
                [U, _, U, _, U, _, _],
                [_, _, _, _, _, _, _],
                [V, _, V, _, _, _, V],
                [_, V, _, V, _, _, _],
                [V, _, V, _, V, _, V],
            ], 1);
            const node: CheckersNode = new CheckersNode(state);

            // When listing the moves
            const moves: CheckersMove[] = moveGenerator.getListMoves(node, customConfig);

            // Then it should return the list of captures
            expect(moves.length).toBe(1);
            const captures: Coord[] = [
                new Coord(4, 0),
                new Coord(4, 4),
                new Coord(1, 1),
            ];
            expect(moves[0]).toEqual(CheckersMove.fromCapture(captures).get());
        });

    });

}

describe('CheckersMoveGenerator for International Checkers', () => {

    let moveGenerator: CheckersMoveGenerator;
    const defaultConfig: MGPOptional<CheckersConfig> = InternationalCheckersRules.get().getDefaultRulesConfig();

    beforeEach(() => {
        moveGenerator = new CheckersMoveGenerator(InternationalCheckersRules.get());
    });

    it('should only include majoritary capture from list move', () => {
        // Given a state where current player should capture
        const state: CheckersState = CheckersState.of([
            [_, _, _, _, _, _, _],
            [_, _, _, _, _, _, _],
            [_, _, V, _, _, _, _],
            [_, U, _, U, _, _, _],
            [_, _, _, _, _, _, _],
            [_, _, _, _, _, U, _],
            [_, _, _, _, _, _, _],
        ], 1);
        const node: CheckersNode = new CheckersNode(state);

        // When listing the moves
        const moves: CheckersMove[] = moveGenerator.getListMoves(node, defaultConfig);

        // Then it should return the list of captures
        expect(moves.length).toBe(1);
    });

    describe('getLegalCaptures', () => {

        it('should forbid to pass over the same coord several times', () => {
            // Given a board with only one possible capture
            const state: CheckersState = new CheckersState([
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, V, _, _, _, _],
                [_, _, _, _, _, _, V, _, V, _],
                [_, _, _, _, _, _, _, _, _, O],
                [_, _, _, _, V, _, V, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
            ], 20);

            // When checking the legal list of captures
            const legalCaptures: CheckersMove[] = moveGenerator.getLegalCaptures(state, defaultConfig.get());

            // Then it should be this one, the bigger not to fly over same coord twice
            const coords: Coord[] = [
                new Coord(9, 7),
                new Coord(6, 4),
                new Coord(3, 7),
                new Coord(5, 9),
                new Coord(7, 7),
            ];
            const move: CheckersMove = CheckersMove.fromCapture(coords).get();
            expect(legalCaptures).toEqual([move]);
        });

    });
});

describe('CheckersMoveGenerator for Lasca', () => {

    let moveGenerator: CheckersMoveGenerator;
    const defaultConfig: MGPOptional<CheckersConfig> = LascaRules.get().getDefaultRulesConfig();

    beforeEach(() => {
        moveGenerator = new CheckersMoveGenerator(LascaRules.get());
    });

    it('should include minoritary capture from list move', () => {
        // Given a state where current player should capture
        const state: CheckersState = CheckersState.of([
            [_, _, _, _, _, _, _],
            [_, _, _, _, _, _, _],
            [_, _, V, _, _, _, _],
            [_, U, _, U, _, _, _],
            [_, _, _, _, _, _, _],
            [_, _, _, _, _, U, _],
            [_, _, _, _, _, _, _],
        ], 1);
        const node: CheckersNode = new CheckersNode(state);

        // When listing the moves
        const moves: CheckersMove[] = moveGenerator.getListMoves(node, defaultConfig);

        // Then it should return the list of captures
        expect(moves.length).toBe(2);
    });

    describe('getLegalCaptures', () => {

        it('should forbid to pass over the same coord several times', () => {
            // Given a board with only one possible capture
            const state: CheckersState = new CheckersState([
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, V, _, V, _],
                [_, _, _, _, _, _, O],
                [_, _, _, V, _, V, _],
                [_, _, _, _, _, _, _],
            ], 20);

            // When checking the legal list of captures
            const legalCaptures: CheckersMove[] = moveGenerator.getLegalCaptures(state, defaultConfig.get());

            // Then it should be this one, the bigger not to fly over same coord twice
            const coordsClockwise: Coord[] = [
                new Coord(6, 4),
                new Coord(4, 2),
                new Coord(2, 4),
                new Coord(4, 6),
            ];
            const moveClockwise: CheckersMove = CheckersMove.fromCapture(coordsClockwise).get();
            const coordsCounterClockwise: Coord[] = [
                new Coord(6, 4),
                new Coord(4, 6),
                new Coord(2, 4),
                new Coord(4, 2),
            ];
            const moveCounterClockwise: CheckersMove = CheckersMove.fromCapture(coordsCounterClockwise).get();
            expect(legalCaptures).toEqual([moveClockwise, moveCounterClockwise]);
        });

    });

});
