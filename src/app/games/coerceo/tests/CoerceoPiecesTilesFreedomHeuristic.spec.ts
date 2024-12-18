/* eslint-disable max-lines-per-function */
import { MGPOptional } from '@everyboard/lib';
import { CoerceoPiecesTilesFreedomHeuristic } from '../CoerceoPiecesTilesFreedomHeuristic';
import { CoerceoConfig, CoerceoRules } from '../CoerceoRules';
import { FourStatePiece } from 'src/app/jscaip/FourStatePiece';
import { Table } from 'src/app/jscaip/TableUtils';
import { CoerceoState } from '../CoerceoState';
import { PlayerNumberMap } from 'src/app/jscaip/PlayerMap';
import { HeuristicUtils } from 'src/app/jscaip/AI/tests/HeuristicUtils.spec';
import { Player } from 'src/app/jscaip/Player';

describe('CoerceoPiecesTilesFreedomHeuristic', () => {

    let heuristic: CoerceoPiecesTilesFreedomHeuristic;
    const defaultConfig: MGPOptional<CoerceoConfig> = CoerceoRules.get().getDefaultRulesConfig();

    const _: FourStatePiece = FourStatePiece.EMPTY;
    const N: FourStatePiece = FourStatePiece.UNREACHABLE;
    const O: FourStatePiece = FourStatePiece.ZERO;
    const X: FourStatePiece = FourStatePiece.ONE;

    beforeEach(() => {
        heuristic = new CoerceoPiecesTilesFreedomHeuristic();
    });

    it('should prefer board with more pieces', () => {
        // Given a board with lesser piece than another one
        const weakBoard: Table<FourStatePiece> = [
            [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
            [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
            [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
            [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
            [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
            [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
            [N, N, N, N, N, N, _, X, _, N, N, N, N, N, N],
            [N, N, N, N, N, N, _, _, _, N, N, N, N, N, N],
            [N, N, N, N, N, N, O, _, _, N, N, N, N, N, N],
            [N, N, N, N, N, N, _, O, _, N, N, N, N, N, N],
        ];
        const weakState: CoerceoState =
            new CoerceoState(weakBoard, 1, PlayerNumberMap.of(0, 0), PlayerNumberMap.of(0, 0));
        const strongBoard: Table<FourStatePiece> = [
            [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
            [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
            [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
            [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
            [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
            [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
            [N, N, N, N, N, N, _, X, _, N, N, N, N, N, N],
            [N, N, N, N, N, N, _, _, _, N, N, N, N, N, N],
            [N, N, N, N, N, N, _, _, _, N, N, N, N, N, N],
            [N, N, N, N, N, N, _, O, _, N, N, N, N, N, N],
        ];
        const strongState: CoerceoState =
            new CoerceoState(strongBoard, 1, PlayerNumberMap.of(0, 0), PlayerNumberMap.of(0, 1));
        // When comparing them
        // Then the one with more piece of Player.ONE should be deemed better for Player.ONE
        HeuristicUtils.expectSecondStateToBeBetterThanFirstFor(heuristic,
                                                               weakState, MGPOptional.empty(),
                                                               strongState, MGPOptional.empty(),
                                                               Player.ONE,
                                                               defaultConfig);
    });

});
