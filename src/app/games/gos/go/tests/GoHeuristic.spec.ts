/* eslint-disable max-lines-per-function */
import { MGPOptional } from '@everyboard/lib';
import { Table } from 'src/app/jscaip/TableUtils';
import { GoState } from '../../GoState';
import { GoPiece } from '../../GoPiece';
import { HeuristicUtils } from 'src/app/jscaip/AI/tests/HeuristicUtils.spec';
import { Player } from 'src/app/jscaip/Player';
import { PlayerNumberMap } from 'src/app/jscaip/PlayerMap';
import { GoConfig, GoRules } from '../GoRules';
import { GoHeuristic } from '../GoHeuristic';
import { GoPhase } from '../../GoPhase';

const X: GoPiece = GoPiece.LIGHT;
const O: GoPiece = GoPiece.DARK;
const _: GoPiece = GoPiece.EMPTY;

describe('GoHeuristic', () => {

    let heuristic: GoHeuristic;
    const defaultConfig: MGPOptional<GoConfig> = GoRules.get().getDefaultRulesConfig();

    beforeEach(() => {
        heuristic = new GoHeuristic();
    });

    it('should prefer a larger territory', () => {
        // Given a board with more territory for Player.ZERO than for Player.ONE
        const strongBoard: Table<GoPiece> = [
            [_, _, O, X, _],
            [_, _, O, X, _],
            [_, _, O, X, _],
            [_, _, O, X, _],
            [_, _, O, X, _],
        ];
        const strongState: GoState =
            new GoState(strongBoard, PlayerNumberMap.of(10, 1), 0, MGPOptional.empty(), GoPhase.PLAYING);
        const weakBoard: Table<GoPiece> = [
            [_, O, X, _, _],
            [_, O, X, _, _],
            [_, O, X, _, _],
            [_, O, X, _, _],
            [_, O, X, _, _],
        ];
        const weakState: GoState =
            new GoState(weakBoard, PlayerNumberMap.of(10, 1), 0, MGPOptional.empty(), GoPhase.PLAYING);

        // When computing their value
        // Then it should prefer having a larger territory
        HeuristicUtils.expectSecondStateToBeBetterThanFirstFor(heuristic,
                                                               weakState, MGPOptional.empty(),
                                                               strongState, MGPOptional.empty(),
                                                               Player.ZERO,
                                                               defaultConfig);
    });

    it('should count killed piece as two points', () => {
        const u: GoPiece = GoPiece.DEAD_DARK;
        // Given two boards with the same territory, but one with a dead opponent piece
        const strongBoard: Table<GoPiece> = [
            [_, _, O, X, u],
            [_, _, O, X, X],
            [_, _, O, X, _],
            [_, _, O, X, _],
            [_, _, O, X, _],
        ];
        const strongState: GoState =
            new GoState(strongBoard, PlayerNumberMap.of(10, 1), 0, MGPOptional.empty(), GoPhase.PLAYING);
        const weakBoard: Table<GoPiece> = [
            [_, _, O, X, _],
            [_, _, O, X, _],
            [_, _, O, X, _],
            [_, _, O, X, _],
            [_, _, O, X, _],
        ];
        const weakState: GoState =
            new GoState(weakBoard, PlayerNumberMap.of(10, 1), 0, MGPOptional.empty(), GoPhase.PLAYING);
        // When computing their value
        // Then it should assign the same value for both
        HeuristicUtils.expectStatesToBeOfEqualValue(heuristic, weakState, strongState, defaultConfig);
    });

});
