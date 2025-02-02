/* eslint-disable max-lines-per-function */
import { fakeAsync } from '@angular/core/testing';
import { MGPOptional } from '@everyboard/lib';
import { Coord } from 'src/app/jscaip/Coord';
import { ComponentTestUtils } from 'src/app/utils/tests/TestUtils.spec';
import { InternationalCheckersComponent } from '../international-checkers.component';
import { CheckersMove } from '../../common/CheckersMove';
import { CheckersPiece, CheckersStack, CheckersState } from '../../common/CheckersState';
import { CheckersConfig } from '../../common/AbstractCheckersRules';
import { InternationalCheckersRules } from '../InternationalCheckersRules';
import { PlayerMap, PlayerNumberMap } from 'src/app/jscaip/PlayerMap';
import { DirectionFailure } from 'src/app/jscaip/Direction';
import { CheckersComponentTestEntries, DoCheckersTests } from '../../common/tests/CheckersTest.spec';

const zero: CheckersPiece = CheckersPiece.ZERO;
const one: CheckersPiece = CheckersPiece.ONE;

const U: CheckersStack = new CheckersStack([zero]);
const O: CheckersStack = new CheckersStack([CheckersPiece.ZERO_PROMOTED]);
const V: CheckersStack = new CheckersStack([one]);
const _: CheckersStack = CheckersStack.EMPTY;

type InternationalCheckersComponentTestEntries = CheckersComponentTestEntries<InternationalCheckersComponent,
                                                                              InternationalCheckersRules>;

const internationalCheckersEntries: InternationalCheckersComponentTestEntries = {
    gameName: 'InternationalCheckers',
    component: InternationalCheckersComponent,
    firstPlayerCoords: [
        new Coord(1, 6),
        new Coord(3, 6),
        new Coord(5, 6),
        new Coord(7, 6),
        new Coord(9, 6),
    ],
    firstPlayerSecondClicks: [new Coord(0, 5), new Coord(2, 5)],
    promotedPieceOrientedState: CheckersState.of([
        [_, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, O, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _],
        [V, _, _, _, _, _, _, _, _, _],
    ], 10),
    promotedPieceCoord: new Coord(5, 5),
    promotedLandings: [
        new Coord(0, 0),
        new Coord(1, 1),
        new Coord(2, 2),
        new Coord(3, 3),
        new Coord(4, 4),
        new Coord(6, 6),
        new Coord(7, 7),
        new Coord(8, 8),
        new Coord(9, 9),

        new Coord(9, 1),
        new Coord(8, 2),
        new Coord(7, 3),
        new Coord(6, 4),

        new Coord(4, 6),
        new Coord(3, 7),
        new Coord(2, 8),
        new Coord(1, 9),
    ],
    stateWithForcedCapture: CheckersState.of([
        [_, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _],
        [V, _, _, _, _, _, _, _, _, _],
        [_, O, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _],
        [_, V, _, V, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _],
    ], 1),
    forcedToMove: new Coord(0, 2),
    unmovable: new Coord(0, 7),
    secondMove: CheckersMove.fromStep(new Coord(0, 3), new Coord(1, 4)),
    stateWithInvalidVerticalMove: CheckersState.of([
        [_, V, _, V, _, V, _, V, _, V],
        [V, _, V, _, V, _, V, _, V, _],
        [_, V, _, V, _, V, _, V, _, V],
        [V, _, V, _, V, _, V, _, V, _],
        [_, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _],
        [_, U, _, U, _, U, _, U, _, U],
        [U, _, U, _, U, _, U, _, U, _],
        [_, U, _, U, _, U, _, U, _, U],
        [U, _, U, _, U, _, U, _, U, _],
    ], 1),
    invalidStepperCoord: new Coord(0, 3),
    stateWithSimpleCapture: CheckersState.of([
        [_, V, _, V, _, V, _, V, _, V],
        [V, _, V, _, V, _, V, _, V, _],
        [_, V, _, V, _, V, _, V, _, V],
        [_, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _],
        [V, _, _, _, _, _, _, _, _, _],
        [_, U, _, _, _, U, _, U, _, U],
        [_, _, _, _, _, _, _, _, _, _],
        [_, U, _, U, _, U, _, U, _, U],
        [U, _, U, _, U, _, U, _, U, _],
    ], 1),
    simpleCapture: CheckersMove.fromCapture([new Coord(0, 5), new Coord(2, 7)]).get(),
    stateWithPromotion: CheckersState.of([
        [_, _, _, _, V, _, V],
        [_, U, _, _, _, _, _],
        [_, _, _, _, _, _, _],
        [_, _, _, _, _, _, _],
        [_, _, _, _, _, _, _],
        [_, _, _, _, _, _, _],
        [U, _, U, _, U, _, U],
    ], 0),
    promotion: CheckersMove.fromStep(new Coord(1, 1), new Coord(0, 0)),
    stateWithComplexeCapture: CheckersState.of([
        [_, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _],
        [_, _, V, _, _, _, _, _, _, _],
        [_, U, _, U, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, U, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _],
    ], 1),
    complexeCapture: CheckersMove.fromCapture([new Coord(2, 2), new Coord(4, 4), new Coord(6, 6)]).get(),
    stateWithInvalidCapture: CheckersState.of([
        [_, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _],
        [_, _, V, _, _, _, _, _, _, _],
        [_, V, _, U, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, U, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _, _],
    ], 1),
    invalidCapture: CheckersMove.fromCapture([new Coord(2, 2), new Coord(0, 4)]).get(),
    invalidThirdMove: [new Coord(3, 6), new Coord(5, 5)],
};

DoCheckersTests(internationalCheckersEntries);

describe('InternationalCheckersComponent', () => {

    const defaultConfig: MGPOptional<CheckersConfig> = InternationalCheckersRules.get().getDefaultRulesConfig();

    let testUtils: ComponentTestUtils<InternationalCheckersComponent>;

    beforeEach(fakeAsync(async() => {
        testUtils = await ComponentTestUtils.forGame<InternationalCheckersComponent>('InternationalCheckers');
    }));

    it('should create', () => {
        testUtils.expectToBeCreated();
    });

    describe('second click', () => {

        it('should only highlight captured piece when doing flying capture with king', fakeAsync(async() => {
            // Given a board with a selected king and a possible capture
            const state: CheckersState = CheckersState.of([
                [_, _, _, _, _, _, _, _, _, _],
                [_, O, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, V, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
            ], 0);
            await testUtils.setupState(state);
            await testUtils.expectClickSuccess('#coord-1-1');

            // When doing a capture
            const move: CheckersMove = CheckersMove.fromCapture([new Coord(1, 1), new Coord(5, 5)]).get();
            await testUtils.expectMoveSuccess('#coord-5-5', move);

            // Then only captured space should be captured-fill
            testUtils.expectElementToHaveClass('#square-4-4', 'captured-fill');
            testUtils.expectElementNotToHaveClass('#square-1-1', 'captured-fill');
            testUtils.expectElementNotToHaveClass('#square-2-2', 'captured-fill');
            testUtils.expectElementNotToHaveClass('#square-3-3', 'captured-fill');
            testUtils.expectElementNotToHaveClass('#square-5-5', 'captured-fill');
            // But they should be moved-fill (except the captured)
            testUtils.expectElementNotToHaveClass('#square-4-4', 'moved-fill');
            testUtils.expectElementToHaveClass('#square-1-1', 'moved-fill');
            testUtils.expectElementToHaveClass('#square-2-2', 'moved-fill');
            testUtils.expectElementToHaveClass('#square-3-3', 'moved-fill');
            testUtils.expectElementToHaveClass('#square-5-5', 'moved-fill');
        }));

        it('should allow doing flying capture with king with close-landing', fakeAsync(async() => {
            // Given a board with a selected king and a possible capture
            const state: CheckersState = CheckersState.of([
                [_, _, _, _, _, _, _, _, _, _],
                [_, V, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, O, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
            ], 0);
            await testUtils.setupState(state);
            await testUtils.expectClickSuccess('#coord-4-4');

            // When doing a capture
            const move: CheckersMove = CheckersMove.fromCapture([new Coord(4, 4), new Coord(0, 0)]).get();

            // Then it should be a success
            await testUtils.expectMoveSuccess('#coord-0-0', move);
        }));

        it('should allow doing flying multiple-capture with king with far-landing', fakeAsync(async() => {
            // Given a board with a selected king and a possible multiple-capture
            const state: CheckersState = CheckersState.of([
                [_, _, _, _, _, _, _, _, _, _],
                [_, V, _, _, _, _, _, _, _, _],
                [_, _, _, _, V, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, V, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, O, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
            ], 0);
            await testUtils.setupState(state);
            await testUtils.expectClickSuccess('#coord-6-6');
            await testUtils.expectClickSuccess('#coord-2-2');

            // When doing a capture
            const captures: Coord[] = [new Coord(6, 6), new Coord(2, 2), new Coord(0, 0)];
            const move: CheckersMove = CheckersMove.fromCapture(captures).get();

            // Then it should be a success
            await testUtils.expectMoveSuccess('#coord-0-0', move);
        }));

        it('should allow long step forward for king', fakeAsync(async() => {
            // Given any board with a king selected
            const state: CheckersState = CheckersState.of([
                [V, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, O],
            ], 0);
            await testUtils.setupState(state);
            await testUtils.expectClickSuccess('#coord-9-9');

            // When doing the second click
            // Then it should succeed
            const move: CheckersMove = CheckersMove.fromStep(new Coord(9, 9), new Coord(5, 5));
            await testUtils.expectMoveSuccess('#coord-5-5', move);
        }));

    });

    describe('design', () => {

        it('should not show minoritary capture options', fakeAsync(async() => {
            // Given a board with a illegal minoritary option
            const state: CheckersState = CheckersState.of([
                [_, _, _, _, _, _, _, _, _, _],
                [_, V, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, V, _, _, _, V, _, _],
                [_, _, _, _, U, _, U, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
            ], 0);

            // When displaying the board
            await testUtils.setupState(state);

            // Then the majoritary capturer should be highlighted and the minortary capturer should not
            testUtils.expectElementToHaveClass('#clickable-highlight-4-4', 'clickable-stroke');
            testUtils.expectElementNotToExist('#clickable-highlight-6-4');
        }));

        it('should show score as the number of remaining piece', fakeAsync(async() => {
            // Given a board where there is a different number of remaining piece
            const state: CheckersState = CheckersState.of([
                [_, _, _, _, _, _, _, _, _, _],
                [_, V, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, V, _, _, _, V, _, _],
                [_, _, _, _, U, _, U, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
            ], 0);

            // When rendering state
            await testUtils.setupState(state);

            // Then the score should be displayed
            const score: PlayerNumberMap = PlayerNumberMap.of(2, 3);
            const scoreOptional: MGPOptional<PlayerMap<number>> = MGPOptional.of(score);
            expect(testUtils.getGameComponent().scores).toEqual(scoreOptional);
        }));

    });

    describe('multiple capture', () => {

        it('should perform capture when no more piece can be captured', fakeAsync(async() => {
            // Given a board on which a piece is selected and already captured
            const state: CheckersState = CheckersState.of([
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, V, _, _, _, _, _, _, _],
                [_, U, _, U, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, U, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
            ], 1);
            await testUtils.setupState(state);
            await testUtils.expectClickSuccess('#coord-2-2');
            await testUtils.expectClickSuccess('#coord-4-4');

            // When doing the last capture
            const captures: Coord[] = [new Coord(2, 2), new Coord(4, 4), new Coord(6, 6)];
            const move: CheckersMove = CheckersMove.fromCapture(captures).get();

            // Then the move should be finalized
            await testUtils.expectMoveSuccess('#coord-6-6', move);
            // Then the stack of captured pieces should not exist
            testUtils.expectElementToExist('#square-6-6-piece-0');
            testUtils.expectElementNotToExist('#square-6-6-piece-1');
        }));

        it('should cancel move when trying non-ordinal move mid-capture', fakeAsync(async() => {
            // Given a board on which a piece is selected and already captured
            const state: CheckersState = CheckersState.of([
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, V, _, _, _, _, _, _, _],
                [_, U, _, U, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, U, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _],
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
            testUtils.expectElementToHaveClass('#clickable-highlight-1-6', 'clickable-stroke');
            testUtils.expectElementToHaveClass('#clickable-highlight-3-6', 'clickable-stroke');
            testUtils.expectElementToHaveClass('#clickable-highlight-5-6', 'clickable-stroke');
            testUtils.expectElementToHaveClass('#clickable-highlight-7-6', 'clickable-stroke');
            testUtils.expectElementToHaveClass('#clickable-highlight-9-6', 'clickable-stroke');
        }));

        it('should not show possible selections for opponent', fakeAsync(async() => {
            // Given a state
            const state: CheckersState = InternationalCheckersRules.get().getInitialState(defaultConfig);

            // When it is not interactive
            testUtils.getGameComponent().setInteractive(false);
            await testUtils.setupState(state);

            // Then it should not show possible selections
            testUtils.expectElementNotToExist('.clickable-stroke');
        }));

    });

    describe('custom config', () => {

        it('Should allow forward frisian-capture when config allows it', fakeAsync(async() => {
            // Given a board where a frisian capture is possible
            const alternateConfig: MGPOptional<CheckersConfig> = MGPOptional.of({
                ...defaultConfig.get(),
                frisianCaptureAllowed: true,
            });
            const state: CheckersState = CheckersState.of([
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
                [_, U, _, V, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, U, _, _, _],
                [_, _, _, _, _, _, _],
            ], 2);
            await testUtils.setupState(state, { config: alternateConfig });
            await testUtils.expectClickSuccess('#coord-3-5');

            // When doing the move
            // Then it should succeed
            const move: CheckersMove = CheckersMove.fromCapture([new Coord(3, 5), new Coord(3, 1)]).get();
            await testUtils.expectMoveSuccess('#coord-3-1', move);
        }));

    });

});
