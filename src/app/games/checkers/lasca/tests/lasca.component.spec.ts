/* eslint-disable max-lines-per-function */
import { fakeAsync } from '@angular/core/testing';
import { MGPOptional } from '@everyboard/lib';
import { Coord } from 'src/app/jscaip/Coord';
import { Player } from 'src/app/jscaip/Player';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { ComponentTestUtils } from 'src/app/utils/tests/TestUtils.spec';
import { LascaComponent } from '../lasca.component';
import { CheckersFailure } from '../../common/CheckersFailure';
import { CheckersMove } from '../../common/CheckersMove';
import { CheckersPiece, CheckersStack, CheckersState } from '../../common/CheckersState';
import { CheckersConfig } from '../../common/AbstractCheckersRules';
import { LascaRules } from '../LascaRules';
import { PlayerMap, PlayerNumberMap } from 'src/app/jscaip/PlayerMap';
import { DirectionFailure } from 'src/app/jscaip/Direction';

fdescribe('LascaComponent', () => {

    const zero: CheckersPiece = CheckersPiece.ZERO;
    const one: CheckersPiece = CheckersPiece.ONE;

    const _U: CheckersStack = new CheckersStack([zero]);
    const _V: CheckersStack = new CheckersStack([one]);
    const UV: CheckersStack = new CheckersStack([zero, one]);
    const __: CheckersStack = CheckersStack.EMPTY;
    const defaultConfig: MGPOptional<CheckersConfig> = LascaRules.get().getDefaultRulesConfig();

    let testUtils: ComponentTestUtils<LascaComponent>;

    beforeEach(fakeAsync(async() => {
        testUtils = await ComponentTestUtils.forGame<LascaComponent>('Lasca');
    }));

    it('should create', () => {
        testUtils.expectToBeCreated();
    });

    describe('first click', () => {

        it('should highlight possible step-landing after selecting piece', fakeAsync(async() => {
            // Given any board where steps are possible (initial board)
            // When selecting a piece
            await testUtils.expectClickSuccess('#coord-4-4');

            // Then its landing coord should be landable
            testUtils.expectElementToHaveClass('#clickable-highlight-3-3', 'clickable-stroke');
            testUtils.expectElementToHaveClass('#clickable-highlight-5-3', 'clickable-stroke');
            // But the other second step should not be
            testUtils.expectElementNotToExist('#clickable-highlight-1-3');
        }));

        it('should highlight piece that can move this turn (when forced capture)', fakeAsync(async() => {
            // Given a board where current player have 3 "mobile" pieces but one must capture
            const state: CheckersState = CheckersState.of([
                [_V, __, _V, __, _V, __, _V],
                [__, _V, __, _V, __, _V, __],
                [_V, __, _V, __, _V, __, _V],
                [__, _U, __, __, __, __, __],
                [_U, __, __, __, _U, __, _U],
                [__, _U, __, _U, __, _U, __],
                [_U, __, _U, __, _U, __, _U],
            ], 1);

            // When displaying the board
            await testUtils.setupState(state);

            // Then only the one that must capture must be "clickable-stroke"
            testUtils.expectElementToHaveClass('#clickable-highlight-0-2', 'clickable-stroke');
            testUtils.expectElementNotToExist('#clickable-highlight-2-2');
            testUtils.expectElementNotToExist('#clickable-highlight-4-2');
            testUtils.expectElementNotToExist('#clickable-highlight-6-2');
        }));

        it(`should forbid clicking on opponent's pieces`, fakeAsync(async() => {
            // Given any board
            // When clicking on the opponent's piece
            // Then it should fail
            const reason: string = RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_OPPONENT();
            await testUtils.expectClickFailure('#coord-0-0', reason);
        }));

        it('should forbid clicking on empty square', fakeAsync(async() => {
            // Given any board
            // When clicking on an empty square
            // Then it should fail
            const reason: string = RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_EMPTY();
            await testUtils.expectClickFailure('#coord-1-0', reason);
        }));

        it('should forbid clicking on an unmovable stack', fakeAsync(async() => {
            // Given any board
            // When clicking a piece that could not move
            // Then it should fail
            await testUtils.expectClickFailure('#coord-5-5', CheckersFailure.THIS_PIECE_CANNOT_MOVE());
        }));

        it('should show clicked stack as selected', fakeAsync(async() => {
            // Given any board
            // When clicking on one of your pieces
            await testUtils.expectClickSuccess('#coord-4-4');

            // Then it should show the clicked piece as 'selected'
            testUtils.expectElementToHaveClass('#square-4-4-piece-0', 'selected-stroke');
        }));

        it('should hide last move when selecting stack', fakeAsync(async() => {
            // Given a board with a last move
            const previousState: CheckersState = LascaRules.get().getInitialState(defaultConfig);
            const previousMove: CheckersMove = CheckersMove.fromStep(new Coord(2, 4), new Coord(3, 3));
            const state: CheckersState = CheckersState.of([
                [_V, __, _V, __, _V, __, _V],
                [__, _V, __, _V, __, _V, __],
                [_V, __, _V, __, _V, __, _V],
                [__, __, __, _U, __, __, __],
                [_U, __, __, __, _U, __, _U],
                [__, _U, __, _U, __, _U, __],
                [_U, __, _U, __, _U, __, _U],
            ], 1);
            await testUtils.setupState(state, { previousState, previousMove });

            // When selecting stack
            await testUtils.expectClickSuccess('#coord-4-2');

            // Then start and end coord of last move should not be highlighted
            testUtils.expectElementNotToHaveClass('#square-2-4', 'moved-fill');
            testUtils.expectElementNotToHaveClass('#square-3-3', 'moved-fill');
        }));

    });

    describe('second click', () => {

        it('should fail when clicking on opponent', fakeAsync(async() => {
            // Given any board with a selected piece
            await testUtils.expectClickSuccess('#coord-4-4');

            // When clicking on an opponent
            // Then it should fail
            const reason: string = RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_OPPONENT();
            await testUtils.expectClickFailure('#coord-2-2', reason);
        }));

        it('should fail when doing impossible click (non ordinal direction)', fakeAsync(async() => {
            // Given any board with a selected piece
            await testUtils.expectClickSuccess('#coord-4-4');

            // When clicking on an empty square in (+2; +1) of selected piece
            // Then it should fail
            const reason: string = DirectionFailure.DIRECTION_MUST_BE_LINEAR();
            await testUtils.expectClickFailure('#coord-6-5', reason);
        }));

        it('should fail when doing impossible click (ordinal direction)', fakeAsync(async() => {
            // Given any board with a selected piece
            const state: CheckersState = CheckersState.of([
                [_V, __, _V, __, _V, __, _V],
                [__, _V, __, _V, __, _V, __],
                [_V, __, _V, __, _V, __, _V],
                [__, __, __, __, __, __, __],
                [__, __, __, __, __, __, __],
                [__, _U, __, _U, __, _U, __],
                [_U, __, _U, __, _U, __, _U],
            ], 0);
            await testUtils.setupState(state);
            await testUtils.expectClickSuccess('#coord-5-5');

            // When clicking on an empty square in (+0; -2) of selected piece
            // Then it should fail
            const reason: string = CheckersFailure.CANNOT_DO_ORTHOGONAL_MOVE();
            await testUtils.expectClickFailure('#coord-5-3', reason);
        }));

        it('should deselect piece when clicking a second time on it', fakeAsync(async() => {
            // Given any board with a selected piece
            await testUtils.expectClickSuccess('#coord-4-4');
            testUtils.expectElementToHaveClass('#square-4-4-piece-0', 'selected-stroke');

            // When clicking on the selected piece again
            await testUtils.expectClickFailure('#coord-4-4');

            // Then the piece should no longer be selected
            testUtils.expectElementNotToHaveClass('#square-4-4-piece-0', 'selected-stroke');
        }));

        it('should show possible first-selection again when deselecting piece', fakeAsync(async() => {
            // Given any board with a selected piece
            await testUtils.expectClickSuccess('#coord-4-4');
            testUtils.expectElementToHaveClass('#square-4-4-piece-0', 'selected-stroke');

            // When clicking on the selected piece again
            await testUtils.expectClickFailure('#coord-4-4');

            // Then the possible first choices should be shown again
            testUtils.expectElementToHaveClass('#clickable-highlight-0-4', 'clickable-stroke');
            testUtils.expectElementToHaveClass('#clickable-highlight-2-4', 'clickable-stroke');
            testUtils.expectElementToHaveClass('#clickable-highlight-4-4', 'clickable-stroke');
            testUtils.expectElementToHaveClass('#clickable-highlight-6-4', 'clickable-stroke');
        }));

        it('should change selected piece when clicking on another one of your pieces', fakeAsync(async() => {
            // Given any board with a selected piece
            await testUtils.expectClickSuccess('#coord-4-4');

            // When clicking on another piece
            await testUtils.expectClickSuccess('#coord-2-4');

            // Then it should deselect the previous and select the new
            testUtils.expectElementNotToHaveClass('#square-4-4-piece-0', 'selected-stroke');
            testUtils.expectElementToHaveClass('#square-2-4-piece-0', 'selected-stroke');
        }));

        it('should allow simple step', fakeAsync(async() => {
            // Given any board on which a step could be done and with a selected piece
            await testUtils.expectClickSuccess('#coord-4-4');

            // When doing a step
            const move: CheckersMove = CheckersMove.fromStep(new Coord(4, 4), new Coord(3, 3));

            // Then it should succeed
            await testUtils.expectMoveSuccess('#coord-3-3', move);
        }));

        it('should show left square after single step', fakeAsync(async() => {
            // Given any board on which a step could be done and with a selected piece
            await testUtils.expectClickSuccess('#coord-4-4');

            // When doing simple step
            const move: CheckersMove = CheckersMove.fromStep(new Coord(4, 4), new Coord(3, 3));
            await testUtils.expectMoveSuccess('#coord-3-3', move);

            // Then left square and landed square should be showed as moved
            testUtils.expectElementToHaveClass('#square-4-4', 'moved-fill');
            testUtils.expectElementToHaveClass('#square-3-3', 'moved-fill');
        }));

        it('should allow simple capture', fakeAsync(async() => {
            // Given a board with a selected piece and a possible capture
            const state: CheckersState = CheckersState.of([
                [_V, __, _V, __, _V, __, _V],
                [__, _V, __, _V, __, _V, __],
                [_V, __, _V, __, _V, __, _V],
                [__, UV, __, __, __, __, __],
                [__, __, _U, __, _U, __, _U],
                [__, __, __, _U, __, _U, __],
                [_U, __, __, __, _U, __, _U],
            ], 1);
            await testUtils.setupState(state);
            await testUtils.expectClickSuccess('#coord-2-2');

            // When doing a capture
            const move: CheckersMove = CheckersMove.fromCapture([new Coord(2, 2), new Coord(0, 4)]).get();

            // Then it should be a success
            await testUtils.expectMoveSuccess('#coord-0-4', move);
        }));

        it(`should have a promotion's symbol on the piece that just got promoted`, fakeAsync(async() => {
            // Given any board with a selected soldier about to become promoted
            const state: CheckersState = CheckersState.of([
                [__, __, __, __, _V, __, _V],
                [__, UV, __, __, __, __, __],
                [__, __, __, __, __, __, __],
                [__, __, __, __, __, __, __],
                [__, __, __, __, __, __, __],
                [__, __, __, __, __, __, __],
                [_U, __, _U, __, _U, __, _U],
            ], 0);
            await testUtils.setupState(state);
            await testUtils.expectClickSuccess('#coord-1-1');

            // When doing the promoting-move
            const move: CheckersMove = CheckersMove.fromStep(new Coord(1, 1), new Coord(0, 0));
            await testUtils.expectMoveSuccess('#coord-0-0', move);

            // Then the officier-logo should be on the piece
            testUtils.expectElementToExist('#square-0-0-piece-1-promoted-symbol');
        }));

        it('should highlight next possible capture and show the captured piece as captured already', fakeAsync(async() => {
            // Given any board with a selected piece that could do a multiple capture
            const state: CheckersState = CheckersState.of([
                [__, __, __, __, __, __, __],
                [__, __, __, __, __, __, __],
                [__, __, _V, __, __, __, __],
                [__, _U, __, _U, __, __, __],
                [__, __, __, __, __, __, __],
                [__, __, __, __, __, _U, __],
                [__, __, __, __, __, __, __],
            ], 1);
            await testUtils.setupState(state);
            await testUtils.expectClickSuccess('#coord-2-2');

            // When doing the first capture
            await testUtils.expectClickSuccess('#coord-4-4');

            // Then it should already be shown as captured
            testUtils.expectElementToHaveClass('#square-3-3', 'captured-fill');
            // And the next possibles ones displayed
            testUtils.expectElementToHaveClass('#clickable-highlight-6-6', 'clickable-stroke');
        }));

        it('should cancel capturing a piece you cannot capture', fakeAsync(async() => {
            // Given a board on which an illegal capture could be made
            const state: CheckersState = CheckersState.of([
                [__, __, __, __, __, __, __],
                [__, __, __, __, __, __, __],
                [__, __, _V, __, __, __, __],
                [__, _V, __, _U, __, __, __],
                [__, __, __, __, __, __, __],
                [__, __, __, __, __, _U, __],
                [__, __, __, __, __, __, __],
            ], 1);
            await testUtils.setupState(state);
            await testUtils.expectClickSuccess('#coord-2-2');

            // When doing that illegal capture
            // Then it should fail
            await testUtils.expectClickFailure('#coord-0-4', RulesFailure.CANNOT_SELF_CAPTURE());
        }));

        it('should forbid long step for normal piece (2 step)', fakeAsync(async() => {
            // Given any board where the selected piece could do a long jump
            const state: CheckersState = CheckersState.of([
                [_V, __, __, __, __, __, __],
                [__, __, __, __, __, __, __],
                [__, __, __, __, __, __, __],
                [__, __, __, __, __, __, __],
                [__, __, __, __, __, __, __],
                [__, __, __, __, __, __, __],
                [__, __, __, __, __, __, _U],
            ], 0);
            await testUtils.setupState(state);
            await testUtils.expectClickSuccess('#coord-6-6');

            // When trying doing a two step jump with a normal piece
            const move: CheckersMove = CheckersMove.fromStep(new Coord(6, 6), new Coord(4, 4));

            // Then it should fail
            const reason: string = CheckersFailure.NO_PIECE_CAN_DO_LONG_JUMP();
            await testUtils.expectMoveFailure('#coord-4-4', reason, move);
        }));

    });

    describe('experience as second player (reversed board)', () => {

        it('should have first player on top', fakeAsync(async() => {
            // Given a board that has been reversed
            testUtils.getGameComponent().setPointOfView(Player.ONE);

            // When displaying it
            // We need to force the updateBoard to trigger the redrawing of the board
            await testUtils.getGameComponent().updateBoard(false);
            testUtils.detectChanges();

            // Then the square at (2, 2) should be coord (4, 4)
            testUtils.expectTranslationYToBe('#coord-4-4', 200);
            testUtils.expectTranslationYToBe('#coord-2-2', 400);
        }));

        it('should not duplicate highlight when doing incorrect second click', fakeAsync(async() => {
            // Given a board where you are player two and a moving piece has been selected
            await testUtils.expectClickSuccess('#coord-2-4');
            const move: CheckersMove = CheckersMove.fromStep(new Coord(2, 4), new Coord(1, 3));
            await testUtils.expectMoveSuccess('#coord-1-3', move); // First move is set
            await testUtils.getWrapper().setRole(Player.ONE); // changing role
            await testUtils.expectClickSuccess('#coord-0-2'); // Making the first click

            // When clicking on an invalid landing piece
            await testUtils.expectClickFailure('#coord-1-4', DirectionFailure.DIRECTION_MUST_BE_LINEAR());

            // Then the highlight should be at the expected place only, not at their symmetric point
            testUtils.expectElementToHaveClass('#clickable-highlight-0-2', 'clickable-stroke');
            testUtils.expectElementNotToExist('#clickable-highlight-6-4');
        }));

        it('should show last move reversed', fakeAsync(async() => {
            // Given a board with a last move
            await testUtils.expectClickSuccess('#coord-4-4');
            const move: CheckersMove = CheckersMove.fromStep(new Coord(4, 4), new Coord(3, 3));
            await testUtils.expectMoveSuccess('#coord-3-3', move);

            // When reversing the board view
            await testUtils.getWrapper().setRole(Player.ONE);

            // Then the last move should be shown at the expected place
            testUtils.expectTranslationYToBe('#coord-2-2', 400);
        }));
    });

    describe('multiple capture', () => {

        it('should perform capture when no more piece can be captured', fakeAsync(async() => {
            // Given a board on which a piece is selected and already captured
            const state: CheckersState = CheckersState.of([
                [__, __, __, __, __, __, __],
                [__, __, __, __, __, __, __],
                [__, __, _V, __, __, __, __],
                [__, _U, __, _U, __, __, __],
                [__, __, __, __, __, __, __],
                [__, __, __, __, __, _U, __],
                [__, __, __, __, __, __, __],
            ], 3);
            await testUtils.setupState(state);
            await testUtils.expectClickSuccess('#coord-2-2');
            await testUtils.expectClickSuccess('#coord-4-4');

            // When doing the last capture
            const captures: Coord[] = [new Coord(2, 2), new Coord(4, 4), new Coord(6, 6)];
            const move: CheckersMove = CheckersMove.fromCapture(captures).get();

            // Then the move should be finalized
            await testUtils.expectMoveSuccess('#coord-6-6', move);
            // Then a stack of three piece should exist
            testUtils.expectElementToExist('#square-6-6-piece-0');
            testUtils.expectElementToExist('#square-6-6-piece-1');
            testUtils.expectElementToExist('#square-6-6-piece-2');
        }));

        it('should cancel move when trying non-ordinal move mid-capture', fakeAsync(async() => {
            // Given a board on which a piece is selected and already captured
            const state: CheckersState = CheckersState.of([
                [__, __, __, __, __, __, __],
                [__, __, __, __, __, __, __],
                [__, __, _V, __, __, __, __],
                [__, _U, __, _U, __, __, __],
                [__, __, __, __, __, __, __],
                [__, __, __, __, __, _U, __],
                [__, __, __, __, __, __, __],
            ], 1);
            await testUtils.setupState(state);
            await testUtils.expectClickSuccess('#coord-2-2');
            await testUtils.expectClickSuccess('#coord-4-4');

            // When doing the last click that make an illegal step
            const reason: string = DirectionFailure.DIRECTION_MUST_BE_LINEAR();
            await testUtils.expectClickFailure('#coord-6-5', reason);

            // Then the move should be cancelled and stack should be back in place
            testUtils.expectElementNotToExist('#square-4-4-piece-0');
        }));

    });

    describe('interactivity', () => {

        it('should show possible selections when interactive', fakeAsync(async() => {
            // Given a state
            // When it is interactive
            testUtils.getGameComponent().setInteractive(true);
            // Then it should show possible selections
            testUtils.expectElementToHaveClass('#clickable-highlight-0-4', 'clickable-stroke');
            testUtils.expectElementToHaveClass('#clickable-highlight-2-4', 'clickable-stroke');
            testUtils.expectElementToHaveClass('#clickable-highlight-4-4', 'clickable-stroke');
            testUtils.expectElementToHaveClass('#clickable-highlight-6-4', 'clickable-stroke');
        }));

        it('should not show possible selections for opponent', fakeAsync(async() => {
            // Given a state
            const state: CheckersState = LascaRules.get().getInitialState(defaultConfig);

            // When it is not interactive
            testUtils.getGameComponent().setInteractive(false);
            await testUtils.setupState(state);

            // Then it should not show possible selections
            testUtils.expectElementNotToExist('.clickable-stroke');
        }));

    });

    describe('design', () => {

        it('should show score as the number of remaining piece', fakeAsync(async() => {
            // Given a board where there is a different number of remaining piece
            const state: CheckersState = CheckersState.of([
                [_V, __, __, __, __, __, __],
                [__, __, __, __, __, __, __],
                [__, __, _V, __, __, __, _V],
                [__, __, __, _U, __, _U, __],
                [__, __, __, __, __, __, __],
                [__, __, __, __, __, __, __],
                [__, __, __, __, __, __, __],
            ], 0);

            // When rendering state
            await testUtils.setupState(state);

            // Then the score should be displayed
            const score: PlayerNumberMap = PlayerNumberMap.of(2, 3);
            const scoreOptional: MGPOptional<PlayerMap<number>> = MGPOptional.of(score);
            expect(testUtils.getGameComponent().scores).toEqual(scoreOptional);
        }));

    });

    describe('Custom configs', () => {
        it('should fail when doing invalid frisian capture', fakeAsync(async() => {
            // Given any board with a selected piece that could do a frisian capture
            const customConfig: MGPOptional<CheckersConfig> = MGPOptional.of({
                ...defaultConfig.get(),
                frisianCaptureAllowed: true,
            });
            const state: CheckersState = CheckersState.of([
                [__, __, __, __, __, __, __],
                [__, __, __, __, __, __, __],
                [_V, __, _U, __, __, __, __],
                [__, __, __, __, __, __, __],
                [__, __, __, __, __, __, __],
                [__, __, __, __, __, __, __],
                [__, __, __, __, __, __, __],
            ], 1);
            await testUtils.setupState(state, { config: customConfig });
            await testUtils.expectClickSuccess('#coord-0-2');

            // When clicking on an empty square in (+3; 0) of selected piece
            // Then it should fail
            const reason: string = CheckersFailure.FRISIAN_CAPTURE_MUST_BE_EVEN();
            await testUtils.expectClickFailure('#coord-3-2', reason);
        }));

    });

});
