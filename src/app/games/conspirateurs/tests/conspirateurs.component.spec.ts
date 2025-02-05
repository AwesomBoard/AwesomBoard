/* eslint-disable max-lines-per-function */
import { fakeAsync } from '@angular/core/testing';
import { Coord } from 'src/app/jscaip/Coord';
import { PlayerOrNone } from 'src/app/jscaip/Player';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { ComponentTestUtils } from 'src/app/utils/tests/TestUtils.spec';
import { ConspirateursComponent } from '../conspirateurs.component';
import { ConspirateursFailure } from '../ConspirateursFailure';
import { ConspirateursMove, ConspirateursMoveDrop, ConspirateursMoveJump, ConspirateursMoveSimple } from '../ConspirateursMove';
import { ConspirateursState } from '../ConspirateursState';

describe('ConspirateursComponent', () => {
    const _: PlayerOrNone = PlayerOrNone.NONE;
    const O: PlayerOrNone = PlayerOrNone.ZERO;
    const X: PlayerOrNone = PlayerOrNone.ONE;

    let testUtils: ComponentTestUtils<ConspirateursComponent>;

    beforeEach(fakeAsync(async() => {
        testUtils = await ComponentTestUtils.forGame<ConspirateursComponent>('Conspirateurs');
    }));

    it('should create', () => {
        testUtils.expectToBeCreated();
    });

    describe('drop phase', () => {

        it('should allow drops at the beginning of the game with a simple click', fakeAsync(async() => {
            // Given the initial state
            // When clicking in the central zone
            // Then a drop should be made
            const move: ConspirateursMove = ConspirateursMoveDrop.of(new Coord(7, 7));
            await testUtils.expectMoveSuccess('#click_7_7', move);
        }));

        it('should forbid dropping outside of the central zone', fakeAsync(async() => {
            // Given the initial state
            // When clicking out of the central zone
            // Then an error should be shown
            const move: ConspirateursMove = ConspirateursMoveDrop.of(new Coord(0, 0));
            await testUtils.expectMoveFailure('#click_0_0', ConspirateursFailure.MUST_DROP_IN_CENTRAL_ZONE(), move);
        }));

        it('should display the number of remaining pieces (even turn)', fakeAsync(async() => {
            // Given the initial state
            // When it is displayed
            // Then both players should have 20 remaining pieces (0 to 19)
            testUtils.expectElementToExist('#sidePiece_0_19');
            testUtils.expectElementToExist('#sidePiece_1_19');
        }));

        it('should display the number of remaining pieces (odd turn)', fakeAsync(async() => {
            // Given a state in the drop phase at turn 1
            const state: ConspirateursState = new ConspirateursState([
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, O, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            ], 1);

            // When it is displayed
            await testUtils.setupState(state);

            // Then player 0 Should have 19 pieces (0 to 18) and player 1 should have 20 (0 to 19)
            testUtils.expectElementNotToExist('#sidePiece_0_19');
            testUtils.expectElementToExist('#sidePiece_0_18');
            testUtils.expectElementToExist('#sidePiece_1_19');
        }));

        it('should highlight last drop', fakeAsync(async() => {
            // Given a board with a last-drop
            const move: ConspirateursMove = ConspirateursMoveDrop.of(new Coord(7, 7));
            await testUtils.expectMoveSuccess('#click_7_7', move);

            // When rendering it
            // Then last drop should be displayed
            testUtils.expectElementToHaveClasses('#space_7_7', ['base', 'moved-fill']);
            testUtils.expectElementToHaveClasses('#piece_7_7', ['base', 'player0-fill']);
        }));

    });

    describe('move phase', () => {

        beforeEach(async() => {
            // Given a state after the drop phase
            const state: ConspirateursState = new ConspirateursState([
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, X, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, X, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, O, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, X, _, O, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            ], 40);
            await testUtils.setupState(state, { previousMove: ConspirateursMoveDrop.of(new Coord(5, 5)) });
        });

        it('should cancel jump when clicking on another piece of the player', fakeAsync(async() => {
            // Given a jump being in construction
            await testUtils.expectClickSuccess('#click_5_4');
            await testUtils.expectClickSuccess('#click_5_2');

            // When clicking on another piece of the current player
            await testUtils.expectClickSuccess('#click_7_5');

            // Then the new piece should be selected
            testUtils.expectElementToHaveClasses('#piece_7_5', ['base', 'player0-fill', 'selected-stroke']);
        }));

        it('should show correctly piece style during move', fakeAsync(async() => {
            // Given a move on which a piece is selected
            await testUtils.expectClickSuccess('#click_5_4');

            // When doing the first part of the multi-jump move
            await testUtils.expectClickSuccess('#click_5_2');

            // Then the landing coord should be displayed all nicely
            testUtils.expectElementToHaveClasses('#piece_5_2', ['base', 'player0-fill', 'selected-stroke']);
        }));

        it('should not allow selecting an empty space', fakeAsync(async() => {
            // Given a state after the drop phase
            // When clicking on an empty space
            // Then it should fail
            await testUtils.expectClickFailure('#click_0_0', RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_EMPTY());
        }));

        it('should forbid selecting a piece of the opponent', fakeAsync(async() => {
            // Given a state after the drop phase
            // When clicking on a piece of the opponent
            // Then it should fail
            await testUtils.expectClickFailure('#click_5_5', RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_OPPONENT());
        }));

        it('should allow performing a simple move by clicking on a piece and then on its destination', fakeAsync(async() => {
            // Given a player piece that is selected
            await testUtils.expectClickSuccess('#click_5_4');

            // When clicking on its destination
            // Then the simple move should be performed
            const move: ConspirateursMoveSimple = ConspirateursMoveSimple.from(new Coord(5, 4), new Coord(4, 4)).get();
            await testUtils.expectMoveSuccess('#click_4_4', move);
        }));

        it('should display last move (simple move)', fakeAsync(async() => {
            // Given a board with a simple move possible
            await testUtils.expectClickSuccess('#click_5_4');
            const move: ConspirateursMoveSimple = ConspirateursMoveSimple.from(new Coord(5, 4), new Coord(4, 4)).get();

            // When doing simple move
            await testUtils.expectMoveSuccess('#click_4_4', move);

            // Then it should be highlighted
            testUtils.expectElementToHaveClasses('#space_5_4', ['base', 'moved-fill']);
            testUtils.expectElementToHaveClasses('#space_4_4', ['base', 'moved-fill']);
        }));

        it('should forbid illegal simple moves', fakeAsync(async() => {
            // Given a player piece that is selected
            await testUtils.expectClickSuccess('#click_5_4');

            // When clicking on an illegal destination
            // Then the move should be illegal
            const move: ConspirateursMoveSimple = ConspirateursMoveSimple.from(new Coord(5, 4), new Coord(5, 3)).get();
            await testUtils.expectMoveFailure('#click_5_3', RulesFailure.MUST_LAND_ON_EMPTY_SPACE(), move);
        }));

        it('should allow performing a jump in two clicks if this is the only choice', fakeAsync(async() => {
            // Given a state after the drop phase
            // When clicking on a player piece and then on a jump destination
            await testUtils.expectClickSuccess('#click_5_4');

            // Then the jump should be directly performed
            const move: ConspirateursMoveJump = ConspirateursMoveJump.from([new Coord(5, 4), new Coord(5, 6)]).get();
            await testUtils.expectMoveSuccess('#click_5_6', move);
        }));

        it('should allow performing multiple jumps', fakeAsync(async() => {
            // Given a state after the drop phase
            // When clicking on a piece and then on all jump steps up to the final one
            await testUtils.expectClickSuccess('#click_5_4');
            await testUtils.expectClickSuccess('#click_5_2');

            // Then the jump should be performed
            const move: ConspirateursMoveJump =
                ConspirateursMoveJump.from([new Coord(5, 4), new Coord(5, 2), new Coord(7, 2)]).get();
            await testUtils.expectMoveSuccess('#click_7_2', move);
        }));

        it('should show last move after move is finished', fakeAsync(async() => {
            // Given a state after the drop phase
            // When doing move
            await testUtils.expectClickSuccess('#click_5_4');
            await testUtils.expectClickSuccess('#click_5_2');
            const move: ConspirateursMoveJump =
                ConspirateursMoveJump.from([new Coord(5, 4), new Coord(5, 2), new Coord(7, 2)]).get();
            await testUtils.expectMoveSuccess('#click_7_2', move);

            // Then last move should be displyed
            testUtils.expectElementToExist('#lastJump');
        }));

        it('should hide last move when doing a click (jump)', fakeAsync(async() => {
            // Given a board in move phase with a last move (jump)
            await testUtils.expectClickSuccess('#click_5_4');
            await testUtils.expectClickSuccess('#click_5_2');
            const move: ConspirateursMoveJump =
                ConspirateursMoveJump.from([new Coord(5, 4), new Coord(5, 2), new Coord(7, 2)]).get();
            await testUtils.expectMoveSuccess('#click_7_2', move);

            // When starting a new move
            await testUtils.expectClickSuccess('#click_5_5');

            // Then last move should be hidden
            testUtils.expectElementNotToExist('#lastJump');
            testUtils.expectElementNotToExist('#piece_5_4');
            testUtils.expectElementToHaveClasses('#space_5_4', ['base']);
            testUtils.expectElementNotToExist('#piece_5_2');
            testUtils.expectElementToHaveClasses('#space_5_2', ['base']);
        }));

        it('should hide last move when doing a click (drop)', fakeAsync(async() => {
            // Given a board in move phase with a last move (drop)
            // When starting a new move
            await testUtils.expectClickSuccess('#click_5_4');

            // Then last move should not be "moved-fill"
            testUtils.expectElementToHaveClasses('#space_5_5', ['base']);
        }));

        it('should hide last move when doing a click (single step)', fakeAsync(async() => {
            // Given a board in move phase with a last move (single step)
            await testUtils.expectClickSuccess('#click_5_4');
            const move: ConspirateursMoveSimple = ConspirateursMoveSimple.from(new Coord(5, 4), new Coord(4, 4)).get();
            await testUtils.expectMoveSuccess('#click_4_4', move);

            // When doing a click
            await testUtils.expectClickSuccess('#click_5_5');

            // Then last move should no longer be highlighted
            testUtils.expectElementToHaveClasses('#space_5_4', ['base']);
            testUtils.expectElementToHaveClasses('#space_4_4', ['base']);
        }));

        it('should allow stopping a jump early by clicking twice on the destination', fakeAsync(async() => {
            // Given a state after the drop phase
            // When clicking on the desired jump steps and then a second time on the final step
            await testUtils.expectClickSuccess('#click_5_4');
            await testUtils.expectClickSuccess('#click_5_2');

            // Then the jump should be performed
            const move: ConspirateursMoveJump = ConspirateursMoveJump.from([new Coord(5, 4), new Coord(5, 2)]).get();
            await testUtils.expectMoveSuccess('#click_5_2', move);
        }));

        it('should forbid creation of invalid jumps', fakeAsync(async() => {
            // Given a selected piece
            await testUtils.expectClickSuccess('#click_5_4');
            // When clicking on an invalid jump target
            // Then it should fail
            await testUtils.expectClickFailure('#click_5_8', ConspirateursFailure.INVALID_JUMP());
        }));

        it('should forbid creation of invalid jumps with multiple steps', fakeAsync(async() => {
            // Given a jump being constructed
            await testUtils.expectClickSuccess('#click_5_4');
            await testUtils.expectClickSuccess('#click_5_2');
            // When clicking on an invalid jump target
            // Then it should fail
            await testUtils.expectClickFailure('#click_2_2', ConspirateursFailure.INVALID_JUMP());
        }));

        it('should forbid creation of illegal jumps with multiple steps', fakeAsync(async() => {
            // Given a jump being constructed
            await testUtils.expectClickSuccess('#click_5_4');
            await testUtils.expectClickSuccess('#click_5_2');

            // When clicking on an invalid jump target
            // Then it should fail
            await testUtils.expectClickFailure('#click_5_0', ConspirateursFailure.MUST_JUMP_OVER_PIECES());
            // And the state should go back to normal
            testUtils.expectElementToHaveClasses('#piece_5_4', ['base', 'player0-fill']);
            testUtils.expectElementToHaveClasses('#space_5_4', ['base']);
        }));

        it('should not display any remaining piece', fakeAsync(async() => {
            // Given a state after the drop phase
            // When displaying it
            // Then there should be no side pieces
            testUtils.expectElementNotToExist('#sidePiece_0_0');
            testUtils.expectElementNotToExist('#sidePiece_1_0');
        }));

        it('should deselect piece when clicking a second time on it', fakeAsync(async() => {
            // Given a board on which a piece is selected
            await testUtils.expectClickSuccess('#click_5_4');
            testUtils.expectElementToHaveClass('#piece_5_4', 'selected-stroke');

            // When clicking on it again
            await testUtils.expectClickFailure('#click_5_4');

            // Then it should no longer be selected
            testUtils.expectElementNotToHaveClass('#piece_5_4', 'selected-stroke');
        }));

        it('should display ongoing move', fakeAsync(async() => {
            // Given a state in move phase
            // When starting a long move
            await testUtils.expectClickSuccess('#click_5_4');
            await testUtils.expectClickSuccess('#click_5_2');

            // Then left space should be emptied and highlighted
            testUtils.expectElementToHaveClasses('#space_5_4', ['base', 'moved-fill']);
            testUtils.expectElementNotToExist('#piece_5_4');
            // And landing space filled and highlighted
            testUtils.expectElementToHaveClasses('#space_5_2', ['base', 'moved-fill']);
            testUtils.expectElementToHaveClasses('#piece_5_2', ['base', 'selected-stroke', 'player0-fill']);
        }));

    });

    it('should highlight shelters of victorious pieces upon victory', fakeAsync(async() => {
        // Given a state where player 1 has sheltered all of its pieces
        const state: ConspirateursState = new ConspirateursState([
            [X, X, _, X, _, X, _, X, X, X, _, X, _, X, _, X, X],
            [X, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [X, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [X, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [X, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [X, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [X, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [X, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [X, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [X, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [O, O, _, _, _, _, _, _, _, _, _, _, _, _, _, _, O],
        ], 60);

        // When the state is displayed
        await testUtils.setupState(state);

        // Then its pieces should be highlighted
        testUtils.expectElementToHaveClass('#space_0_0', 'victory-fill');
        testUtils.expectElementToHaveClass('#piece_0_0', 'victory-stroke');
        // And the opponent should not be
        testUtils.expectElementNotToHaveClass('#space_16_16', 'victory-fill');
    }));

    it('should highlight shelters of everyone before victory', fakeAsync(async() => {
        // Given a state where player 0 and 1 have pieces in shelters
        const state: ConspirateursState = new ConspirateursState([
            [X, X, _, X, _, X, _, X, X, X, _, X, _, X, _, X, X],
            [X, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [X, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, X, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, X, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [X, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [X, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [X, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [X, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [X, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            [O, O, _, _, _, _, _, _, _, _, _, _, _, _, _, _, O],
        ], 60);

        // When the state is displayed
        await testUtils.setupState(state);

        // Then player zero pieces should not be highlighted
        testUtils.expectElementToHaveClass('#space_0_0', 'victory-fill');
        // And player one too
        testUtils.expectElementToHaveClass('#space_16_16', 'victory-fill');
    }));

    describe('score', () => {
        it('should show 0 protected pieces when there are none', fakeAsync(async() => {
            // Given the initial state
            // When displaying it
            // Then it should show a score of 0
            testUtils.expectTextToBe('#score-0', '0 protected pieces');
            testUtils.expectTextToBe('#score-1', '0 protected pieces');
        }));
        it('should show protected piece when there are', fakeAsync(async() => {
            // Given a state with two protected pieces for player 0 and one protected piece for player 1
            const state: ConspirateursState = new ConspirateursState([
                [X, O, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [O, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
            ], 40);
            await testUtils.setupState(state);
            // When displaying it
            // Then it should show a score of 2 for player 0 and 1 for player 1
            testUtils.expectTextToBe('#score-0', '2 protected pieces');
            testUtils.expectTextToBe('#score-1', '1 protected piece');
        }));
    });


});
