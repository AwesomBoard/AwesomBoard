/* eslint-disable max-lines-per-function */
import { fakeAsync } from '@angular/core/testing';
import { MGPOptional } from '@everyboard/lib';
import { GoComponent } from '../go.component';
import { GoMove } from 'src/app/games/gos/GoMove';
import { GoState } from 'src/app/games/gos/GoState';
import { GoPiece } from '../../GoPiece';
import { TableUtils, Table } from 'src/app/jscaip/TableUtils';
import { Coord } from 'src/app/jscaip/Coord';
import { ComponentTestUtils } from 'src/app/utils/tests/TestUtils.spec';
import { PlayerNumberMap } from 'src/app/jscaip/PlayerMap';
import { GoConfig, GoRules } from '../GoRules';
import { GoPhase } from '../../GoPhase';

describe('GoComponent', () => {

    let testUtils: ComponentTestUtils<GoComponent>;

    const _: GoPiece = GoPiece.EMPTY;
    const O: GoPiece = GoPiece.DARK;
    const X: GoPiece = GoPiece.LIGHT;

    beforeEach(fakeAsync(async() => {
        testUtils = await ComponentTestUtils.forGame<GoComponent>('Go');
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
        const board: Table<GoPiece> = [
            [O, X, _, _, _],
            [_, _, _, _, _],
            [_, _, _, _, _],
            [_, _, _, _, _],
            [_, _, _, _, _],
        ];
        const state: GoState = new GoState(board, PlayerNumberMap.of(0, 0), 1, MGPOptional.empty(), GoPhase.PLAYING);
        await testUtils.setupState(state);

        const move: GoMove = new GoMove(0, 1);
        await testUtils.expectMoveSuccess('#click-0-1', move);
        const goComponent: GoComponent = testUtils.getGameComponent();
        expect(goComponent.captures).toEqual([new Coord(0, 0)]);
    }));

    it('should allow simple clicks', fakeAsync(async() => {
        const move: GoMove = new GoMove(1, 1);
        await testUtils.expectMoveSuccess('#click-1-1', move);
        const secondMove: GoMove = new GoMove(2, 2);
        await testUtils.expectMoveSuccess('#click-2-2', secondMove);
    }));

    it('should show ko coord', fakeAsync(async() => {
        // Given a board in counting phase with dead and territory
        const board: Table<GoPiece> = [
            [_, X, O, _, _],
            [X, O, _, _, _],
            [_, _, _, _, _],
            [_, _, _, _, _],
            [_, _, _, _, _],
        ];
        const state: GoState =
            new GoState(board, PlayerNumberMap.of(2, 1), 3, MGPOptional.of(new Coord(0, 0)), GoPhase.COUNTING);

        // When rendering it
        await testUtils.setupState(state, { config: MGPOptional.of({ size: 5 }) });

        // Then it should render the dead
        testUtils.expectElementToExist('#ko-0-0');
    }));


    describe('hoshi', () => {

        it('should be in (3, 3) and other centraly symmetrical coords for 19x19 board', fakeAsync(async() => {
            // Given a 19x19 board
            const board: Table<GoPiece> = TableUtils.create(19, 19, GoPiece.EMPTY);
            const state: GoState =
                new GoState(board, PlayerNumberMap.of(0, 0), 0, MGPOptional.empty(), GoPhase.PLAYING);

            // When displaying it
            await testUtils.setupState(state);

            // Then it should have hoshi in (3, 3) and (cx, 3) and the 4 central symmetric ones
            testUtils.expectElementToExist('#hoshi-3-3'); // Left Up
            testUtils.expectElementToExist('#hoshi-9-3'); // Middle Up
            testUtils.expectElementToExist('#hoshi-15-3'); // Right Up
            testUtils.expectElementToExist('#hoshi-15-9'); // Right Middle
            testUtils.expectElementToExist('#hoshi-15-15'); // Right Down
            testUtils.expectElementToExist('#hoshi-9-15'); // Middle Down
            testUtils.expectElementToExist('#hoshi-3-15'); // Left Down
            testUtils.expectElementToExist('#hoshi-3-9'); // Left Middle
        }));

        it('should be in (3, 3) and other centraly symmetrical coords for 13x13 board', fakeAsync(async() => {
            // Given a 13x13 board
            const customConfig: MGPOptional<GoConfig> = MGPOptional.of({ handicap: 0, height: 13, width: 13 });
            const state: GoState = GoRules.get().getInitialState(customConfig);

            // When displaying it
            await testUtils.setupState(state, { config: customConfig });

            // Then it should have hoshi in (3, 3) and the 4 central symmetric ones
            testUtils.expectElementToExist('#hoshi-3-3'); // Left Up
            testUtils.expectElementToExist('#hoshi-9-3'); // Right Up
            testUtils.expectElementToExist('#hoshi-9-9'); // Right Down
            testUtils.expectElementToExist('#hoshi-3-9'); // Left Down
            // And the (cx, 3) and the 4 other one
            testUtils.expectElementToExist('#hoshi-6-3'); // Middle Up
            testUtils.expectElementToExist('#hoshi-9-6'); // Right Middle
            testUtils.expectElementToExist('#hoshi-6-9'); // Middle Down
            testUtils.expectElementToExist('#hoshi-3-6'); // Left Middle
        }));

        it('should be in (2, 2) and other centraly symmetrical coords for 9x9 board', fakeAsync(async() => {
            // Given a 9x9 board
            const customConfig: MGPOptional<GoConfig> = MGPOptional.of({ handicap: 0, height: 9, width: 9 });
            const state: GoState = GoRules.get().getInitialState(customConfig);

            // When displaying it
            await testUtils.setupState(state, { config: customConfig });

            // Then it should have hoshi in (2, 2) and (cx, 2) and the 4 central symmetric ones
            testUtils.expectElementToExist('#hoshi-2-2'); // Left Up
            testUtils.expectElementToExist('#hoshi-6-2'); // Right Up
            testUtils.expectElementToExist('#hoshi-6-6'); // Right Down
            testUtils.expectElementToExist('#hoshi-2-6'); // Left Down
            // And the (3, cx) one should not be there
            testUtils.expectElementNotToExist('#hoshi-4-2'); // Middle Up
            testUtils.expectElementNotToExist('#hoshi-4-6'); // Middle Down
            testUtils.expectElementNotToExist('#hoshi-6-4'); // Right Middle
            testUtils.expectElementNotToExist('#hoshi-2-4'); // Left Middle
        }));

        it('should have a tengen when board has an odd width and height', fakeAsync(async() => {
            // Given a (odd x odd) board
            const customConfig: MGPOptional<GoConfig> = MGPOptional.of({ handicap: 0, height: 9, width: 9 });
            const state: GoState = GoRules.get().getInitialState(customConfig);

            // When displaying it
            await testUtils.setupState(state);

            // Then it should have a tengen in (4, 4)
            testUtils.expectElementToExist('#hoshi-4-4'); // middle middle
        }));

        it('should not have a tengen when board has an even width and height', fakeAsync(async() => {
            // Given a (even x even) board
            const customConfig: MGPOptional<GoConfig> = MGPOptional.of({ handicap: 0, height: 10, width: 10 });
            const state: GoState = GoRules.get().getInitialState(customConfig);

            // When displaying it
            await testUtils.setupState(state);

            // Then it should not have a tengen
            testUtils.expectElementNotToExist('#hoshi-4-4'); // upper left potential tengen
            testUtils.expectElementNotToExist('#hoshi-4-5'); // down left potential tengen
            testUtils.expectElementNotToExist('#hoshi-5-5'); // down right potential tengen
            testUtils.expectElementNotToExist('#hoshi-5-4'); // upper right potentiel tengen
        }));

    });

});
