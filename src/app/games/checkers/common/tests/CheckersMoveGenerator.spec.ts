/* eslint-disable max-lines-per-function */
import { MGPOptional } from '@everyboard/lib';
import { CheckersMove } from '../CheckersMove';
import { CheckersMoveGenerator } from '../CheckersMoveGenerator';
import { AbstractCheckersRules, CheckersConfig, CheckersNode } from '../AbstractCheckersRules';
import { CheckersPiece, CheckersStack, CheckersState } from '../CheckersState';
import { InternationalCheckersRules } from '../../international-checkers/InternationalCheckersRules';
import { LascaRules } from '../../lasca/LascaRules';
import { Coord } from 'src/app/jscaip/Coord';

const u: CheckersStack = new CheckersStack([CheckersPiece.ZERO]);
const v: CheckersStack = new CheckersStack([CheckersPiece.ONE]);
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
                [u, _, u, _, X, _, u],
                [_, _, _, u, _, _, _],
                [u, _, u, _, u, _, _],
                [_, _, _, _, _, _, _],
                [v, _, v, _, _, _, v],
                [_, v, _, v, _, _, _],
                [v, _, v, _, v, _, v],
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
            [_, _, v, _, _, _, _],
            [_, u, _, u, _, _, _],
            [_, _, _, _, _, _, _],
            [_, _, _, _, _, u, _],
            [_, _, _, _, _, _, _],
        ], 1);
        const node: CheckersNode = new CheckersNode(state);

        // When listing the moves
        const moves: CheckersMove[] = moveGenerator.getListMoves(node, defaultConfig);

        // Then it should return the list of captures
        expect(moves.length).toBe(1);
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
            [_, _, v, _, _, _, _],
            [_, u, _, u, _, _, _],
            [_, _, _, _, _, _, _],
            [_, _, _, _, _, u, _],
            [_, _, _, _, _, _, _],
        ], 1);
        const node: CheckersNode = new CheckersNode(state);

        // When listing the moves
        const moves: CheckersMove[] = moveGenerator.getListMoves(node, defaultConfig);

        // Then it should return the list of captures
        expect(moves.length).toBe(2);
    });

});
