/* eslint-disable max-lines-per-function */
import { Player } from 'src/app/jscaip/Player';
import { MGPOptional } from '@everyboard/lib';
import { CheckersPiece, CheckersStack, CheckersState } from '../CheckersState';
import { AbstractCheckersRules, CheckersConfig } from '../AbstractCheckersRules';
import { CheckersControlPlusDominationHeuristic } from '../CheckersControlPlusDominationHeuristic';
import { HeuristicUtils } from 'src/app/jscaip/AI/tests/HeuristicUtils.spec';
import { InternationalCheckersRules } from '../../international-checkers/InternationalCheckersRules';
import { LascaRules } from '../../lasca/LascaRules';

const O: CheckersStack = new CheckersStack([CheckersPiece.ZERO]);
const X: CheckersStack = new CheckersStack([CheckersPiece.ONE]);
const _: CheckersStack = CheckersStack.EMPTY;

const rules: AbstractCheckersRules[] = [
    InternationalCheckersRules.get(),
    LascaRules.get(),
];

for (const rule of rules) {

    describe('CheckersControlAndDominationHeuristic for ' + rule.constructor.name, () => {

        const defaultConfig: MGPOptional<CheckersConfig> = rule.getDefaultRulesConfig();

        let heuristic: CheckersControlPlusDominationHeuristic;

        beforeEach(() => {
            heuristic = new CheckersControlPlusDominationHeuristic(rule);
        });

        it('should not count the immobilized stacks', () => {
            // Given two boards with the exact same stacks, one having blocked stacks
            const immobilizedState: CheckersState = CheckersState.of([
                [X, _, _, _, _, _, _],
                [_, O, _, _, _, _, _],
                [_, _, O, _, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, _, X, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
            ], 0);
            const mobileState: CheckersState = CheckersState.of([
                [X, _, _, _, _, _, _],
                [_, _, _, O, _, _, _],
                [_, _, O, _, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, _, X, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
            ], 0);

            // When comparing them
            // Then the one with mobile stacks should be considered better
            HeuristicUtils.expectSecondStateToBeBetterThanFirstFor(heuristic,
                                                                   immobilizedState,
                                                                   MGPOptional.empty(),
                                                                   mobileState,
                                                                   MGPOptional.empty(),
                                                                   Player.ONE,
                                                                   defaultConfig);
        });

        it('should count the potential mobility as primary board value', () => {
            // Given two boards with the same stacks, one with a unique forced capture, the other without
            const forcedState: CheckersState = CheckersState.of([
                [X, _, _, _, _, _, _],
                [_, O, _, _, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, _, X, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
            ], 0); // O has 1 stack, X has 2
            const freeState: CheckersState = CheckersState.of([
                [X, _, _, _, _, _, _],
                [_, _, _, O, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, _, X, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
            ], 0); // O has 1 stack, X has 2

            // When comparing them
            // Then the two should be of equal value:
            //     the number of non-blocked stacks times the number of piece (which is 11)
            HeuristicUtils.expectStatesToBeOfEqualValue(heuristic, forcedState, freeState, defaultConfig);
        });

        it('should count the dominating piece as secondary board value (at equal potential mobility)', () => {
            // Given two boards with the same potential mobility, one with more "dominant pieces" than the other
            // (dominant = that is of the same color as the commander)
            const d: CheckersStack = new CheckersStack([CheckersPiece.ONE, CheckersPiece.ZERO, CheckersPiece.ZERO]);
            const dominatedState: CheckersState = CheckersState.of([
                [d, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, O, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
            ], 0);
            const D: CheckersStack = new CheckersStack([CheckersPiece.ONE, CheckersPiece.ONE, CheckersPiece.ONE]);
            const dominatingState: CheckersState = CheckersState.of([
                [D, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, O, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
            ], 0);

            // When comparing them
            // Then the one with more dominant pieces should be prefered
            HeuristicUtils.expectSecondStateToBeBetterThanFirstFor(heuristic,
                                                                   dominatedState,
                                                                   MGPOptional.empty(),
                                                                   dominatingState,
                                                                   MGPOptional.empty(),
                                                                   Player.ONE,
                                                                   defaultConfig);
        });

    });

}
