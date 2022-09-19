/* eslint-disable max-lines-per-function */
import { SiamComponent } from '../siam.component';
import { SiamMove } from 'src/app/games/siam/SiamMove';
import { Orthogonal } from 'src/app/jscaip/Direction';
import { MGPOptional } from 'src/app/utils/MGPOptional';
import { SiamPiece } from 'src/app/games/siam/SiamPiece';
import { Table } from 'src/app/utils/ArrayUtils';
import { SiamState } from 'src/app/games/siam/SiamState';
import { ComponentTestUtils } from 'src/app/utils/tests/TestUtils.spec';
import { fakeAsync } from '@angular/core/testing';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { Player } from 'src/app/jscaip/Player';
import { Coord } from 'src/app/jscaip/Coord';

fdescribe('SiamComponent', () => {

    let testUtils: ComponentTestUtils<SiamComponent>;

    const _: SiamPiece = SiamPiece.EMPTY;
    const M: SiamPiece = SiamPiece.MOUNTAIN;
    const U: SiamPiece = SiamPiece.LIGHT_UP;
    const u: SiamPiece = SiamPiece.DARK_UP;

    async function expectMoveToBeLegal(player: Player, move: SiamMove): Promise<void> {
        if (move.isInsertion()) {
            await testUtils.expectClickSuccess('#piece_' + player.value + '_0');
            const target: Coord = move.coord.getNext(move.direction.get());
            await testUtils.expectClickSuccess('#square_' + target.x + '_' + target.y);
            const orientation: string = move.landingOrientation.toString();
            return testUtils.expectMoveSuccess('#orientation_' + orientation, move);
        } else {
            await testUtils.expectClickSuccess('#square_' + move.coord.x + '_' + move.coord.y);
            const target: Coord = move.direction.isPresent() ? move.coord.getNext(move.direction.get()) : move.coord;
            await testUtils.expectClickSuccess('#square_' + target.x + '_' + target.y);
            const landingOrientation: string = move.landingOrientation.toString();
            return testUtils.expectMoveSuccess('#orientation_' + landingOrientation, move);
        }
    }
    beforeEach(fakeAsync(async() => {
        testUtils = await ComponentTestUtils.forGame<SiamComponent>('Siam');
    }));
    it('should create', () => {
        testUtils.expectToBeCreated();
    });
    it('should accept insertion at first turn', fakeAsync(async() => {
        // Given the initial state
        // When inserting a piece
        await testUtils.expectClickSuccess('#piece_0_0');
        await testUtils.expectClickSuccess('#square_2_0');
        const move: SiamMove = SiamMove.of(2, -1, MGPOptional.of(Orthogonal.DOWN), Orthogonal.DOWN).get();
        // Then it should succeed
        await testUtils.expectMoveSuccess('#orientation_DOWN', move);
    }));
    it('should forbid to select opponent pieces for insertion', fakeAsync(async() => {
        // Given the initial state
        // When trying to select an opponent's piece for insertion
        // Then it should fail
        await testUtils.expectClickFailure('#piece_1_0', RulesFailure.MUST_CHOOSE_PLAYER_PIECE());
    }));
    it('should forbid to select opponent pieces for move', fakeAsync(async() => {
        // Given a state with a piece of the opponent
        const board: Table<SiamPiece> = [
            [_, _, _, _, _],
            [_, _, _, _, _],
            [_, M, M, M, _],
            [_, _, _, _, _],
            [_, _, _, _, u],
        ];
        const state: SiamState = new SiamState(board, 0);
        testUtils.setupState(state);

        // When trying to select the opponent's piece
        // Then it should fail
        await testUtils.expectClickFailure('#square_4_4', RulesFailure.MUST_CHOOSE_PLAYER_PIECE());
    }));
    it('should allow rotation', fakeAsync(async() => {
        // Given a state with one piece
        const board: Table<SiamPiece> = [
            [U, _, _, _, _],
            [_, _, _, _, _],
            [_, M, M, M, _],
            [_, _, _, _, _],
            [_, _, _, _, _],
        ];
        const state: SiamState = new SiamState(board, 0);
        testUtils.setupState(state);

        // When performing a rotation
        // Then it should succeed
        const move: SiamMove = SiamMove.of(0, 0, MGPOptional.empty(), Orthogonal.DOWN).get();
        await expectMoveToBeLegal(Player.ZERO, move);
    }));
    it('should allow normal move', fakeAsync(async() => {
        // Given a state with a piece
        const board: Table<SiamPiece> = [
            [_, _, _, _, _],
            [_, _, _, _, _],
            [_, M, M, M, _],
            [_, _, _, _, _],
            [_, _, _, _, U],
        ];
        const state: SiamState = new SiamState(board, 0);
        testUtils.setupState(state);

        // When moving forward
        // Then it should succeed
        const move: SiamMove = SiamMove.of(4, 4, MGPOptional.of(Orthogonal.LEFT), Orthogonal.LEFT).get();
        await expectMoveToBeLegal(Player.ZERO, move);
    }));
    it('should highlight all moved pieces upon move', fakeAsync(async() => {
        // Given a state with a piece
        const board: Table<SiamPiece> = [
            [_, _, _, _, _],
            [_, _, _, _, _],
            [_, M, M, M, _],
            [_, _, _, _, _],
            [_, _, _, _, U],
        ];
        const state: SiamState = new SiamState(board, 0);
        testUtils.setupState(state);

        // When performing a move
        const move: SiamMove = SiamMove.of(5, 4, MGPOptional.of(Orthogonal.LEFT), Orthogonal.LEFT).get();
        await expectMoveToBeLegal(Player.ZERO, move);

        // Then the moved piece and departed square should be highlighted
        testUtils.expectElementToHaveClasses('#square_4_4', ['base', 'moved']);
        testUtils.expectElementToHaveClasses('#square_3_4', ['base', 'moved']);
        testUtils.expectElementToHaveClasses('#square_2_4', ['base']);
    }));
    it('should decide exit orientation automatically', fakeAsync(async() => {
        // Given a board with a piece next to the border
        const board: Table<SiamPiece> = [
            [_, _, _, _, _],
            [_, _, _, _, _],
            [_, M, M, M, _],
            [_, _, _, _, _],
            [_, _, _, _, U],
        ];
        const state: SiamState = new SiamState(board, 0);
        testUtils.setupState(state);

        // When making the piece exit the board
        // The the orientation of the piece does not have to be chosen
        await testUtils.expectClickSuccess('#square_4_4');
        const move: SiamMove = SiamMove.of(4, 4, MGPOptional.of(Orthogonal.DOWN), Orthogonal.DOWN).get();
        await testUtils.expectMoveSuccess('#square_4_5', move);
    }));
    it('should toast when clicking as first click on an empty square', fakeAsync(async() => {
        // Given the initial board
        // When clicking on an empty piece
        // Then a toast should say it's forbidden
        const reason: string = RulesFailure.MUST_CHOOSE_PLAYER_PIECE();
        await testUtils.expectClickFailure('#square_2_1', reason);
    }));
    it('should cancel move when player clicks on the board instead of an orientation arrow', fakeAsync(async() => {
        // Given that the player must select an orientation arrow
        await testUtils.expectClickSuccess('#piece_0_0');
        await testUtils.expectClickSuccess('#square_0_0');
        spyOn(testUtils.getComponent(), 'cancelMoveAttempt').and.callThrough();
        // When clicking somewhere else on the board
        await testUtils.expectClickSuccess('#square_2_2');
        // Then it should cancel the move
        expect(testUtils.getComponent().cancelMoveAttempt).toHaveBeenCalledOnceWith();
    }));
    it('should cancel move when player selects an invalid target for insertion (empty)', fakeAsync(async() => {
        // Given that the player must select the target for a move
        await testUtils.expectClickSuccess('#piece_0_0');
        // When the player clicks on an empty target which would result in an impossible move
        spyOn(testUtils.getComponent(), 'cancelMoveAttempt').and.callThrough();
        await testUtils.expectClickSuccess('#square_1_1');
        // Then the move should be canceled
        expect(testUtils.getComponent().cancelMoveAttempt).toHaveBeenCalledOnceWith();
    }));
    it('should cancel move when player selects an invalid target for insertion (mountain)', fakeAsync(async() => {
        // Given that the player must select the target for a move
        await testUtils.expectClickSuccess('#piece_0_0');
        // When the player clicks on an empty target which would result in an impossible move
        spyOn(testUtils.getComponent(), 'cancelMoveAttempt').and.callThrough();
        await testUtils.expectClickSuccess('#square_2_2');
        // Then the move should be canceled
        expect(testUtils.getComponent().cancelMoveAttempt).toHaveBeenCalledOnceWith();
    }));
    it('should select the other piece when player selects another piece instead of a target', fakeAsync(async() => {
        // Given a state with a piece, and the player being in the middle of creating a move
        const board: Table<SiamPiece> = [
            [_, _, _, _, _],
            [_, _, _, _, _],
            [_, M, M, M, _],
            [_, _, _, _, _],
            [_, _, _, _, U],
        ];
        const state: SiamState = new SiamState(board, 0);
        testUtils.setupState(state);
        await testUtils.expectClickSuccess('#piece_0_0');

        // When the player clicks on the piece on the board
        await testUtils.expectClickSuccess('#square_4_4');

        // Then a new move should be in creation and the player can finish the move
        await testUtils.expectClickSuccess('#square_4_3');
        const move: SiamMove = SiamMove.of(4, 4, MGPOptional.of(Orthogonal.UP), Orthogonal.UP).get();
        await testUtils.expectMoveSuccess('#orientation_UP', move);
    }));

});
