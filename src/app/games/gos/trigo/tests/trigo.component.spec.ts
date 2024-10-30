/* eslint-disable max-lines-per-function */
import { fakeAsync } from '@angular/core/testing';
import { MGPOptional } from '@everyboard/lib';
import { TrigoComponent } from '../trigo.component';
import { GoMove } from 'src/app/games/gos/GoMove';
import { GoState } from 'src/app/games/gos/GoState';
import { GoPiece } from '../../GoPiece';
import { Table } from 'src/app/jscaip/TableUtils';
import { ComponentTestUtils } from 'src/app/utils/tests/TestUtils.spec';
import { PlayerNumberMap } from 'src/app/jscaip/PlayerMap';
import { Coord } from 'src/app/jscaip/Coord';

describe('TrigoComponent', () => {

    let testUtils: ComponentTestUtils<TrigoComponent>;

    const _: GoPiece = GoPiece.EMPTY;
    const O: GoPiece = GoPiece.DARK;
    const N: GoPiece = GoPiece.UNREACHABLE;
    const X: GoPiece = GoPiece.LIGHT;
    const k: GoPiece = GoPiece.DEAD_LIGHT;
    const w: GoPiece = GoPiece.LIGHT_TERRITORY;
    const b: GoPiece = GoPiece.DARK_TERRITORY;

    beforeEach(fakeAsync(async() => {
        testUtils = await ComponentTestUtils.forGame<TrigoComponent>('Trigo');
    }));

    it('should create', () => {
        testUtils.expectToBeCreated();
    });

    it('should allow to pass twice, then use "pass" as the method to "accept"', fakeAsync(async() => {
        await testUtils.expectPassSuccess(GoMove.PASS); // Passed
        await testUtils.expectPassSuccess(GoMove.PASS); // Counting
        await testUtils.expectPassSuccess(GoMove.ACCEPT); // Accept
        await testUtils.expectPassSuccess(GoMove.ACCEPT); // Finished
        testUtils.expectPassToBeForbidden();
    }));

    it('should show captures', fakeAsync(async() => {
        // Given a board with a possible capture
        const board: Table<GoPiece> = [
            [N, N, N, N, O, N, N, N, N],
            [N, N, N, _, _, _, N, N, N],
            [N, N, _, _, _, _, _, N, N],
            [N, _, _, _, _, _, _, _, N],
            [_, _, _, _, _, _, _, _, _],
        ];
        const state: GoState = new GoState(board, PlayerNumberMap.of(0, 0), 1, MGPOptional.empty(), 'PLAYING');
        await testUtils.setupState(state, { config: MGPOptional.of({ size: 5 }) });

        const move: GoMove = new GoMove(4, 1);
        await testUtils.expectMoveSuccess('#click-4-1', move);
        testUtils.expectElementToHaveClass('#polygon-4-0', 'captured-fill');
    }));

    it('should allow simple clicks', fakeAsync(async() => {
        const move: GoMove = new GoMove(4, 4);
        await testUtils.expectMoveSuccess('#click-4-4', move);
        const secondMove: GoMove = new GoMove(3, 3);
        await testUtils.expectMoveSuccess('#click-3-3', secondMove);
    }));

    it('should show territory and dead', fakeAsync(async() => {
        // Given a board in counting phase with dead and territory
        const board: Table<GoPiece> = [
            [N, N, N, N, b, N, N, N, N],
            [N, N, N, _, O, _, N, N, N],
            [N, N, _, _, _, _, _, N, N],
            [N, b, O, _, _, _, _, X, N],
            [k, b, b, O, _, _, X, w, w],
        ];
        const state: GoState =
            new GoState(board, PlayerNumberMap.of(2, 4), 3, MGPOptional.empty(), 'COUNTING');

        // When rendering it
        await testUtils.setupState(state, { config: MGPOptional.of({ size: 5 }) });

        // Then it should render the dead
        testUtils.expectElementToExist('#dead-0-4');
        testUtils.expectElementToExist('#territory-1-4');
        testUtils.expectElementToExist('#territory-2-4');
    }));

    it('should show ko coord (downward)', fakeAsync(async() => {
        // Given a board with a ko
        const board: Table<GoPiece> = [
            [N, N, N, N, _, N, N, N, N],
            [N, N, N, _, O, _, N, N, N],
            [N, N, _, _, _, _, _, N, N],
            [N, O, _, _, _, _, _, _, N],
            [O, _, O, _, _, _, _, X, _],
        ];
        const state: GoState =
            new GoState(board, PlayerNumberMap.of(2, 1), 3, MGPOptional.of(new Coord(1, 4)), 'PLAYING');

        // When rendering it
        await testUtils.setupState(state, { config: MGPOptional.of({ size: 5 }) });

        // Then it should render the ko
        testUtils.expectElementToExist('#ko-1-4');
    }));

    it('should show ko coord (updward)', fakeAsync(async() => {
        // Given a board with a ko
        const board: Table<GoPiece> = [
            [N, N, N, N, O, N, N, N, N],
            [N, N, N, _, O, _, N, N, N],
            [N, N, _, _, O, _, _, N, N],
            [N, _, _, _, _, X, X, _, N],
            [_, _, _, O, _, O, X, _, _],
        ];
        const state: GoState =
            new GoState(board, PlayerNumberMap.of(2, 1), 11, MGPOptional.of(new Coord(4, 4)), 'PLAYING');

        // When rendering it
        await testUtils.setupState(state, { config: MGPOptional.of({ size: 5 }) });

        // Then it should render the ko
        testUtils.expectElementToExist('#ko-4-4');
    }));

});
