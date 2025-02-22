/* eslint-disable max-lines-per-function */
import { fakeAsync } from '@angular/core/testing';

import { MGPOptional } from '@everyboard/lib';

import { P4Component } from '../p4.component';
import { P4Rules, P4Config } from 'src/app/games/p4/P4Rules';
import { P4Move } from 'src/app/games/p4/P4Move';
import { ComponentTestUtils } from 'src/app/utils/tests/TestUtils.spec';
import { PlayerOrNone } from 'src/app/jscaip/Player';
import { P4State } from '../P4State';
import { Table } from 'src/app/jscaip/TableUtils';

describe('P4Component', () => {

    let testUtils: ComponentTestUtils<P4Component>;
    const defaultConfig: MGPOptional<P4Config> = P4Rules.get().getDefaultRulesConfig();

    const _: PlayerOrNone = PlayerOrNone.NONE;
    const O: PlayerOrNone = PlayerOrNone.ZERO;

    beforeEach(fakeAsync(async() => {
        testUtils = await ComponentTestUtils.forGame<P4Component>('P4');
    }));

    it('should create', () => {
        testUtils.expectToBeCreated();
    });

    it('should accept simple move', fakeAsync(async() => {
        const move: P4Move = P4Move.of(3);
        await testUtils.expectMoveSuccess('#click-3-0', move);
    }));

    it('should highlight victory', fakeAsync(async() => {
        // Given a board with a victory
        const board: Table<PlayerOrNone> = [
            [_, _, _, _, _, _, _],
            [_, _, _, _, _, _, _],
            [_, _, _, O, _, _, _],
            [_, _, _, O, _, _, _],
            [_, _, _, O, _, _, _],
            [_, _, _, O, _, _, _],
        ];
        const state: P4State = new P4State(board, 0);

        // When rendering the board
        await testUtils.setupState(state);

        // Then victorious coords should be shown
        testUtils.expectElementToHaveClass('#victory-coord-3-2', 'victory-stroke');
        testUtils.expectElementToHaveClass('#victory-coord-3-3', 'victory-stroke');
        testUtils.expectElementToHaveClass('#victory-coord-3-4', 'victory-stroke');
        testUtils.expectElementToHaveClass('#victory-coord-3-5', 'victory-stroke');
    }));

    describe('custom config', () => {
        // The following tests are mostly there to ensure that the config is properly loaded

        it('should allow moves in extra board positions', fakeAsync(async() => {
            // Given a P4 config with extra board positions
            const config: MGPOptional<P4Config> = MGPOptional.of({
                ...defaultConfig.get(),
                width: 10,
                height: 10,
            });
            const state: P4State = P4Rules.get().getInitialState(config);
            await testUtils.setupState(state, { config });

            // When playing in the new positions
            const move: P4Move = P4Move.of(9);

            // Then the move should succeed
            await testUtils.expectMoveSuccess('#click-9-0', move);
        }));

        it('should disallow moves outside of board', fakeAsync(async() => {
            // Given a P4 config with a small board
            const config: MGPOptional<P4Config> = MGPOptional.of({
                ...defaultConfig.get(),
                width: 4,
                height: 4,
            });
            const state: P4State = P4Rules.get().getInitialState(config);
            await testUtils.setupState(state, { config });

            // Then invalid moves (that are valid on the default board) should not be available
            testUtils.expectElementNotToExist('#click-5-0');
        }));
    });
});
