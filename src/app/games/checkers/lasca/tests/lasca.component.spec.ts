/* eslint-disable max-lines-per-function */
import { fakeAsync } from '@angular/core/testing';
import { MGPOptional } from '@everyboard/lib';
import { Coord } from 'src/app/jscaip/Coord';
import { ComponentTestUtils } from 'src/app/utils/tests/TestUtils.spec';
import { LascaComponent } from '../lasca.component';
import { CheckersFailure } from '../../common/CheckersFailure';
import { CheckersMove } from '../../common/CheckersMove';
import { CheckersPiece, CheckersStack, CheckersState } from '../../common/CheckersState';
import { CheckersConfig } from '../../common/AbstractCheckersRules';
import { LascaRules } from '../LascaRules';
import { PlayerMap, PlayerNumberMap } from 'src/app/jscaip/PlayerMap';
import { DirectionFailure } from 'src/app/jscaip/Direction';
import { CheckersComponentTestEntries, DoCheckersTests } from '../../common/tests/CheckersTest.spec';

const zero: CheckersPiece = CheckersPiece.ZERO;
const zeroPromoted: CheckersPiece = CheckersPiece.ZERO_PROMOTED;
const one: CheckersPiece = CheckersPiece.ONE;

const _O: CheckersStack = new CheckersStack([zeroPromoted]);
const _U: CheckersStack = new CheckersStack([zero]);
const _V: CheckersStack = new CheckersStack([one]);
const UV: CheckersStack = new CheckersStack([zero, one]);
const __: CheckersStack = CheckersStack.EMPTY;

const lascaEntries: CheckersComponentTestEntries<LascaComponent, LascaRules> = {
    gameName: 'Lasca',
    component: LascaComponent,
    firstPlayerCoords: [
        new Coord(0, 4),
        new Coord(2, 4),
        new Coord(4, 4),
        new Coord(6, 4),
    ],
    firstPlayerSecondClicks: [new Coord(1, 3)],
    promotedPieceOrientedState: CheckersState.of([
        [__, __, __, __, __, __, __],
        [__, __, __, __, __, __, __],
        [__, __, _O, __, __, __, __],
        [__, __, __, __, __, __, __],
        [__, __, __, __, __, __, __],
        [__, __, __, __, __, __, __],
        [__, __, __, __, __, __, __],
    ], 10),
    promotedPieceCoord: new Coord(2, 2),
    promotedLandings: [
        new Coord(1, 1),
        new Coord(3, 1),
        new Coord(3, 3),
        new Coord(1, 3),
    ],
    stateWithForcedCapture: CheckersState.of([
        [_V, __, _V, __, _V, __, _V],
        [__, _V, __, _V, __, _V, __],
        [_V, __, _V, __, _V, __, _V],
        [__, _U, __, __, __, __, __],
        [_U, __, __, __, _U, __, _U],
        [__, _U, __, _U, __, _U, __],
        [_U, __, _U, __, _U, __, _U],
    ], 1),
    forcedToMove: new Coord(0, 2),
    unmovable: new Coord(0, 6),
    secondMove: CheckersMove.fromCapture([new Coord(2, 2), new Coord(0, 4)]).get(),
    stateWithInvalidVerticalMove: CheckersState.of([
        [_V, __, _V, __, _V, __, _V],
        [__, _V, __, _V, __, _V, __],
        [__, __, __, __, __, __, __],
        [__, __, __, __, __, __, __],
        [__, __, __, __, __, __, __],
        [__, _U, __, _U, __, _U, __],
        [_U, __, _U, __, _U, __, _U],
    ], 1),
    invalidStepperCoord: new Coord(1, 1),
    stateWithSimpleCapture: CheckersState.of([
        [_V, __, _V, __, _V, __, _V],
        [__, _V, __, _V, __, _V, __],
        [_V, __, _V, __, _V, __, _V],
        [__, UV, __, __, __, __, __],
        [__, __, _U, __, _U, __, _U],
        [__, __, __, _U, __, _U, __],
        [_U, __, __, __, _U, __, _U],
    ], 1),
    simpleCapture: CheckersMove.fromCapture([new Coord(2, 2), new Coord(0, 4)]).get(),
    stateWithPromotion: CheckersState.of([
        [__, __, __, __, _V, __, _V],
        [__, _U, __, __, __, __, __],
        [__, __, __, __, __, __, __],
        [__, __, __, __, __, __, __],
        [__, __, __, __, __, __, __],
        [__, __, __, __, __, __, __],
        [_U, __, _U, __, _U, __, _U],
    ], 0),
    promotion: CheckersMove.fromStep(new Coord(1, 1), new Coord(0, 0)),
    stateWithComplexeCapture: CheckersState.of([
        [__, __, __, __, __, __, __],
        [__, __, __, __, __, __, __],
        [__, __, _V, __, __, __, __],
        [__, _U, __, _U, __, __, __],
        [__, __, __, __, __, __, __],
        [__, __, __, __, __, _U, __],
        [__, __, __, __, __, __, __],
    ], 1),
    complexeCapture: CheckersMove.fromCapture([new Coord(2, 2), new Coord(4, 4), new Coord(6, 6)]).get(),
    stateWithInvalidCapture: CheckersState.of([
        [__, __, __, __, __, __, __],
        [__, __, __, __, __, __, __],
        [__, __, _V, __, __, __, __],
        [__, _V, __, _U, __, __, __],
        [__, __, __, __, __, __, __],
        [__, __, __, __, __, _U, __],
        [__, __, __, __, __, __, __],
    ], 1),
    invalidCapture: CheckersMove.fromCapture([new Coord(2, 2), new Coord(0, 4)]).get(),
    invalidThirdMove: [new Coord(2, 4), new Coord(4, 3)],
};

DoCheckersTests(lascaEntries);

describe('LascaComponent', () => {

    const defaultConfig: MGPOptional<CheckersConfig> = LascaRules.get().getDefaultRulesConfig();

    let testUtils: ComponentTestUtils<LascaComponent>;

    beforeEach(fakeAsync(async() => {
        testUtils = await ComponentTestUtils.forGame<LascaComponent>('Lasca');
    }));

    it('should create', () => {
        testUtils.expectToBeCreated();
    });

    describe('second click', () => {

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
