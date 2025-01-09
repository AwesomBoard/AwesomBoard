/* eslint-disable max-lines-per-function */
import { Type } from '@angular/core';
import { fakeAsync } from '@angular/core/testing';
import { Encoder, EncoderTestUtils, MGPOptional } from '@everyboard/lib';

import { Coord } from 'src/app/jscaip/Coord';
import { ComponentTestUtils } from 'src/app/utils/tests/TestUtils.spec';
import { RulesConfigUtils } from 'src/app/jscaip/RulesConfigUtil';
import { CheckersComponent } from '../checkers.component';
import { AbstractCheckersRules, CheckersConfig, CheckersNode } from '../AbstractCheckersRules';
import { CheckersMove } from '../CheckersMove';
import { CheckersMoveGenerator } from '../CheckersMoveGenerator';
import { CheckersStack, CheckersState } from '../CheckersState';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { Player } from 'src/app/jscaip/Player';
import { CheckersFailure } from '../CheckersFailure';
import { Direction, DirectionFailure } from 'src/app/jscaip/Direction';
import { Localized } from 'src/app/utils/LocaleUtils';

export class CheckersComponentTestEntries<C extends CheckersComponent<R>,
                                          R extends AbstractCheckersRules>
{
    component: Type<C>; // InternationalCheckersComponent, LascaComponent, etc
    gameName: string; // 'InternationalCheckers', 'Lasca', etc

    // All the first possible clicks
    // Put the lefter one first so that it.next(new Coord(2, -1)) is a empty coord
    firstPlayerCoords: Coord[];
    // after clicking on firstPlayerCoords[0], firstPlayerSecondClick are a valids second clicks
    firstPlayerSecondClicks: Coord[];

    // a state on which the promoted piece can do many moves
    promotedPieceOrientedState: CheckersState;
    // The coordinates of the promoted piece on promotedPieceOrientedState
    promotedPieceCoord: Coord;
    // The coordinates on which the promoted piece can land
    promotedLandings: Coord[];

    stateWithForcedCapture: CheckersState;
    forcedToMove: Coord;

    // Coord of a piece that cannot move at first turn
    unmovable: Coord;

    // Move that Player.ONE can do after firstPlayerCoord[0] then firstPlayerSecondClics[0] has been done
    secondMove: CheckersMove;

    // A state on which a vertical step of 2 would be possible, if it was legal
    stateWithInvalidVerticalMove: CheckersState;
    // The coord of the piece able to move (0, 2), of Player.ONE on stateWithInvalidVerticalMove
    invalidStepperCoord: Coord;

    // A state on which a simple capture is possible
    stateWithSimpleCapture: CheckersState;
    simpleCapture: CheckersMove;

    // A state on which a promotion is possible
    stateWithPromotion: CheckersState;
    promotion: CheckersMove;

    // A state on which a complexe capture is possible
    stateWithComplexeCapture: CheckersState;
    complexeCapture: CheckersMove;

    // A state on which an invalid capture is possible
    stateWithInvalidCapture: CheckersState;
    invalidCapture: CheckersMove;

    // A move that can be done after secondMove but that is not orthogonal (described as two coords)
    invalidThirdMove: [Coord, Coord];
}

export function DoCheckersTests<C extends CheckersComponent<R>,
                                R extends AbstractCheckersRules>(
    entries: CheckersComponentTestEntries<C, R>)
    : void
{

    let testUtils: ComponentTestUtils<C>;

    const defaultConfig: MGPOptional<CheckersConfig> = RulesConfigUtils.getGameDefaultConfig(entries.gameName);

    describe(entries.gameName + ' component generic tests', () => {

        beforeEach(fakeAsync(async() => {
            testUtils = await ComponentTestUtils.forGame<C>(entries.gameName);
        }));

        it('should create', () => {
            testUtils.expectToBeCreated();
        });

        async function clickOnOpponentPieceAndFail(): Promise<void> {
            const state: CheckersState = testUtils.getGameComponent().getState();
            const reason: string = RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_OPPONENT();
            for (const coord of state.allCoords()) {
                const stack: CheckersStack = state.getPieceAt(coord);
                if (stack.isOccupied() && stack.getCommander().player === Player.ONE) {
                    await testUtils.expectClickFailure(`#coord-${ coord.x }-${ coord.y }`, reason);
                    break;
                }
            }
        }

        function expectCoordsToBeTheOnlyClickable(state: CheckersState, coords: Coord[]): void {
            state.forEachCoord((coord: Coord) => {
                const id: string = `#clickable-highlight-${ coord.x }-${ coord.y }`;
                // Then only some pieces should be highlighted
                if (coords.some((c: Coord) => c.equals(coord))) {
                    testUtils.expectElementToHaveClass(id, 'clickable-stroke');
                } else {
                    testUtils.expectElementNotToExist(id);
                }
            });
        }

        async function setupSecondTurn(): Promise<void> {
            const rules: AbstractCheckersRules = testUtils.getGameComponent().rules;
            const previousState: CheckersState = rules.getInitialState(defaultConfig);
            const firstClick: Coord = entries.firstPlayerCoords[0];
            const secondClick: Coord = entries.firstPlayerSecondClicks[0];
            const previousMove: CheckersMove = CheckersMove.fromStep(firstClick, secondClick);
            const state: CheckersState = rules.applyLegalMove(previousMove, previousState, defaultConfig);
            await testUtils.setupState(state, { previousState, previousMove });
        }

        describe('First click', () => {

            it('should highlight possible clicks (at first turn)', fakeAsync(async() => {
                // Given any board (here the initial step)
                const state: CheckersState = testUtils.getGameComponent().getState();

                // When displaying it
                expectCoordsToBeTheOnlyClickable(state, entries.firstPlayerCoords);
            }));

            it('should highlight possible step-landing after selecting normal piece', fakeAsync(async() => {
                // Given any board where steps are possible (initial board)
                const state: CheckersState = testUtils.getGameComponent().getState();

                // When selecting a piece
                const first: Coord = entries.firstPlayerCoords[0];
                await testUtils.expectClickSuccess(`#coord-${ first.x }-${ first.y }`);

                for (const coordAndContent of state.getCoordsAndContents()) {
                    const coord: Coord = coordAndContent.coord;
                    if (entries.firstPlayerSecondClicks.some((c: Coord) => c.equals(coord))) {
                        // Then its landing coord should be landable
                        testUtils.expectElementToHaveClass(`#clickable-highlight-${ coord.x }-${ coord.y }`, 'clickable-stroke');
                    } else {
                        // And no other pieces should be
                        testUtils.expectElementNotToExist(`#clickable-highlight-${ coord.x }-${ coord.y }`);
                    }
                }
            }));

            it('should show clicked stack as selected', fakeAsync(async() => {
                // Given any board
                // When clicking on one of your pieces
                const coord: Coord = entries.firstPlayerCoords[0];
                await testUtils.expectClickSuccess(`#coord-${ coord.x }-${ coord.y }`);

                // Then it should show the clicked piece as 'selected'
                testUtils.expectElementToHaveClass(`#square-${ coord.x }-${ coord.y }-piece-0`, 'selected-stroke');
            }));

            it('should highlight possible step-landing after selecting king', fakeAsync(async() => {
                // Given any board where long steps are possible for a king
                await testUtils.setupState(entries.promotedPieceOrientedState);

                // When selecting a piece
                await testUtils.expectClickSuccess(`#coord-${ entries.promotedPieceCoord.x }-${ entries.promotedPieceCoord.y }`);

                // Then its landing coord should be landable
                for (const landing of entries.promotedLandings) {
                    testUtils.expectElementToHaveClass(
                        `#clickable-highlight-${ landing.x }-${ landing.y }`,
                        'clickable-stroke',
                    );
                }
            }));

            it('should highlight piece that can move this turn (when forced capture)', fakeAsync(async() => {
                // Given a board where current player have 3 "mobile" pieces but one must capture
                // When displaying the board
                await testUtils.setupState(entries.stateWithForcedCapture);

                // Then only the one that must capture must be "clickable-stroke"
                for (const coordAndContent of entries.stateWithForcedCapture.getCoordsAndContents()) {
                    const coord: Coord = coordAndContent.coord;
                    if (coord.equals(entries.forcedToMove)) {
                        testUtils.expectElementToHaveClass(`#clickable-highlight-${ coord.x }-${ coord.y }`, 'clickable-stroke');
                    } else {
                        testUtils.expectElementNotToExist(`#clickable-highlight-${ coord.x }-${ coord.y }`);
                    }
                }
            }));

            it(`should forbid clicking on opponent's pieces`, fakeAsync(async() => {
                // Given any board
                // When clicking on the opponent's piece
                // Then it should fail
                await clickOnOpponentPieceAndFail();
            }));

            it('should forbid clicking on empty square', fakeAsync(async() => {
                // Given any board
                const state: CheckersState = testUtils.getGameComponent().getState();

                // When clicking on an empty square
                // Then it should fail
                const reason: string = RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_EMPTY();
                for (const coord of state.allCoords()) {
                    if (state.getPieceAt(coord).isEmpty()) {
                        await testUtils.expectClickFailure(`#coord-${ coord.x }-${ coord.y }`, reason);
                        break;
                    }
                }
            }));

            it('should forbid clicking on an unmovable stack', fakeAsync(async() => {
                // Given any board
                // When clicking a piece that could not move
                // Then it should fail
                await testUtils.expectClickFailure(
                    `#coord-${ entries.unmovable.x }-${ entries.unmovable.y }`,
                    CheckersFailure.THIS_PIECE_CANNOT_MOVE(),
                );
            }));

            it('should hide last move when selecting stack', fakeAsync(async() => {
                // Given a board with a last move
                await setupSecondTurn();

                // When selecting stack
                const secondPlayerClick: Coord = entries.secondMove.getStartingCoord();
                await testUtils.expectClickSuccess(`#coord-${ secondPlayerClick.x }-${ secondPlayerClick.y }`);

                // Then start and end coord of last move should not be highlighted
                const firstClick: Coord = entries.firstPlayerCoords[0];
                const secondClick: Coord = entries.firstPlayerSecondClicks[0];
                testUtils.expectElementNotToHaveClass(`#square-${ firstClick.x }-${ firstClick.y }`, 'moved-fill');
                testUtils.expectElementNotToHaveClass(`#square-${ secondClick.x }-${ secondClick.y }`, 'moved-fill');
            }));

        });

        describe('Second click', () => {

            it('should fail when clicking on opponent', fakeAsync(async() => {
                // Given any board with a selected piece
                const firstClick: Coord = entries.firstPlayerCoords[0];
                await testUtils.expectClickSuccess(`#coord-${ firstClick.x }-${ firstClick.y }`);

                // When clicking on an opponent
                // Then it should fail
                await clickOnOpponentPieceAndFail();
            }));

            it('should fail when doing impossible click (non ordinal direction)', fakeAsync(async() => {
                // Given any board with a selected piece
                const firstCoord: Coord = entries.firstPlayerCoords[0];
                await testUtils.expectClickSuccess(`#coord-${ firstCoord.x }-${ firstCoord.y }`);

                // When clicking on an empty square in (+2; +1) of selected piece
                // Then it should fail
                const reason: string = DirectionFailure.DIRECTION_MUST_BE_LINEAR();
                await testUtils.expectClickFailure(`#coord-${ firstCoord.x + 2 }-${ firstCoord.y - 1 }`, reason);
            }));

            it('should fail when doing impossible click (ordinal direction)', fakeAsync(async() => {
                // Given any board with a selected piece
                const state: CheckersState = entries.stateWithInvalidVerticalMove;
                const coord: Coord = entries.invalidStepperCoord;
                await testUtils.setupState(state);
                await testUtils.expectClickSuccess(`#coord-${ coord.x }-${ coord.y }`);

                // When clicking on an empty square in (+0; +2) of selected piece
                // Then it should fail
                const reason: string = CheckersFailure.CANNOT_MOVE_ORTHOGONALLY();
                await testUtils.expectClickFailure(`#coord-${ coord.x }-${ coord.y + 2 }`, reason);
            }));

            it('should deselect piece when clicking a second time on it', fakeAsync(async() => {
                // Given any board with a selected piece
                const coord: Coord = entries.firstPlayerCoords[0];
                const coordId: string = `#coord-${ coord.x }-${ coord.y }`;
                await testUtils.expectClickSuccess(coordId);
                testUtils.expectElementToHaveClass(`#square-${ coord.x }-${ coord.y }-piece-0`, 'selected-stroke');

                // When clicking on one of your pieces
                await testUtils.expectClickFailure(coordId);

                // Then it should show the clicked piece as 'selected'
            }));

            it('should show possible first-selection again when deselecting piece', fakeAsync(async() => {
                // Given any board with a selected piece
                const state: CheckersState = testUtils.getGameComponent().getState();
                const firstClick: Coord = entries.firstPlayerCoords[0];
                const firstClickId: string = `#coord-${ firstClick.x }-${ firstClick.y }`;
                await testUtils.expectClickSuccess(firstClickId);
                testUtils.expectElementToHaveClass(`#square-${ firstClick.x }-${ firstClick.y }-piece-0`, 'selected-stroke');

                // When clicking on the selected piece again
                await testUtils.expectClickFailure(firstClickId);

                // Then the possible first choices should be shown again
                expectCoordsToBeTheOnlyClickable(state, entries.firstPlayerCoords);
            }));

            it('should change selected piece when clicking on another one of your pieces', fakeAsync(async() => {
                // Given any board with a selected piece
                const first: Coord = entries.firstPlayerCoords[0];
                const second: Coord = entries.firstPlayerCoords[1];
                await testUtils.expectClickSuccess(`#coord-${ first.x }-${ first.y }`);

                // When clicking on another piece
                await testUtils.expectClickSuccess(`#coord-${ second.x }-${ second.y }`);

                // Then it should deselect the previous and select the new
                testUtils.expectElementNotToHaveClass(`#square-${ first.x }-${ first.y }-piece-0`, 'selected-stroke');
                testUtils.expectElementToHaveClass(`#square-${ second.x }-${ second.y }-piece-0`, 'selected-stroke');
            }));

            it('should allow simple step', fakeAsync(async() => {
                // Given any board on which a step could be done and with a selected piece
                const first: Coord = entries.firstPlayerCoords[0];
                const second: Coord = entries.firstPlayerSecondClicks[0];
                await testUtils.expectClickSuccess(`#coord-${ first.x }-${ first.y }`);

                // When doing a step
                const move: CheckersMove = CheckersMove.fromStep(first, second);

                // Then it should succeed
                await testUtils.expectMoveSuccess(`#coord-${ second.x }-${ second.y }`, move);
            }));

            it('should show left square after single step', fakeAsync(async() => {
                // Given any board on which a step could be done and with a selected piece
                const first: Coord = entries.firstPlayerCoords[0];
                const second: Coord = entries.firstPlayerSecondClicks[0];
                await testUtils.expectClickSuccess(`#coord-${ first.x }-${ first.y }`);

                // When doing simple step
                const move: CheckersMove = CheckersMove.fromStep(first, second);
                await testUtils.expectMoveSuccess(`#coord-${ second.x }-${ second.y }`, move);

                // Then left square and landed square should be showed as moved
                testUtils.expectElementToHaveClass(`#square-${ first.x }-${ first.y }`, 'moved-fill');
                testUtils.expectElementToHaveClass(`#square-${ second.x }-${ second.y }`, 'moved-fill');
            }));

            it('should allow simple capture', fakeAsync(async() => {
                // Given a board with a selected piece and a possible capture
                const state: CheckersState = entries.stateWithSimpleCapture;
                await testUtils.setupState(state);
                const start: Coord = entries.simpleCapture.getStartingCoord();
                await testUtils.expectClickSuccess(`#coord-${ start.x }-${ start.y }`);

                // When doing a capture
                const move: CheckersMove = entries.simpleCapture;

                // Then it should be a success
                const end: Coord = entries.simpleCapture.getEndingCoord();
                await testUtils.expectMoveSuccess(`#coord-${ end.x }-${ end.y }`, move);
            }));

            it(`should have a promotion's symbol on the piece that just got promoted`, fakeAsync(async() => {
                // Given any board with a selected soldier about to become promoted
                const state: CheckersState = entries.stateWithPromotion;
                await testUtils.setupState(state);
                const start: Coord = entries.promotion.getStartingCoord();
                await testUtils.expectClickSuccess(`#coord-${ start.x }-${ start.y }`);

                // When doing the promoting-move
                const end: Coord = entries.promotion.getEndingCoord();
                await testUtils.expectMoveSuccess(`#coord-${ end.x }-${ end.y }`, entries.promotion);

                // Then the officier-logo should be on the piece
                testUtils.expectElementToExist(`#square-${ end.x }-${ end.y }-piece-0-promoted-symbol`);
            }));

            it('should highlight next possible capture and show the captured piece as captured already', fakeAsync(async() => {
                // Given any board with a selected piece that could do a multiple capture
                const state: CheckersState = entries.stateWithComplexeCapture;
                await testUtils.setupState(state);
                const move: CheckersMove = entries.complexeCapture;
                const first: Coord = move.coords.get(0);
                await testUtils.expectClickSuccess(`#coord-${ first.x }-${ first.y }`);

                // When doing the first capture
                const second: Coord = move.coords.get(1);
                await testUtils.expectClickSuccess(`#coord-${ second.x }-${ second.y }`);

                // Then it should already be shown as captured
                const firstCaptureDirection: Direction = first.getDirectionToward(second).get();
                const firstCapture: Coord = first.getNext(firstCaptureDirection, 1);
                testUtils.expectElementToHaveClass(`#square-${ firstCapture.x }-${ firstCapture.y }`, 'captured-fill');
                // And the next possibles ones displayed
                const third: Coord = move.coords.get(2);
                testUtils.expectElementToHaveClass(`#clickable-highlight-${ third.x }-${ third.y }`, 'clickable-stroke');
            }));

            it('should cancel capturing a piece you cannot capture', fakeAsync(async() => {
                // Given a board on which an illegal capture could be made
                const state: CheckersState = entries.stateWithInvalidCapture;
                await testUtils.setupState(state);
                const first: Coord = entries.invalidCapture.getStartingCoord();
                await testUtils.expectClickSuccess(`#coord-${ first.x }-${ first.y}`);

                // When doing that illegal capture
                // Then it should fail
                const second: Coord = entries.invalidCapture.getEndingCoord();
                await testUtils.expectClickFailure(`#coord-${ second.x }-${ second.y}`, RulesFailure.CANNOT_SELF_CAPTURE());
            }));

        });

        describe('experience as second player (reversed board)', () => {

            function reverseCoord(coord: Coord): Coord {
                const gameComponent: CheckersComponent<AbstractCheckersRules> = testUtils.getGameComponent();
                const state: CheckersState = gameComponent.getState();
                const x: number = state.getWidth() - (1 + coord.x);
                const y: number = state.getHeight() - (1 + coord.y);
                return new Coord(x, y);
            }

            function expectBoardToBeSwitched(): void {
                const lowerRight: Coord = reverseCoord(new Coord(0, 0));
                testUtils.expectTranslationYToBe(`#coord-${ lowerRight.x }-${ lowerRight.y }`, 0);
                testUtils.expectTranslationYToBe('#coord-0-0', lowerRight.y * 100);
            }

            it('should have first player on top', fakeAsync(async() => {
                // Given a board that has been reversed
                const gameComponent: CheckersComponent<AbstractCheckersRules> = testUtils.getGameComponent();
                gameComponent.setPointOfView(Player.ONE);

                // When displaying it
                // We need to force the updateBoard to trigger the redrawing of the board
                await gameComponent.updateBoard(false);
                testUtils.detectChanges();

                // Then the square at (0, 0) should be coord (N, N)
                expectBoardToBeSwitched();
            }));

            it('should not duplicate highlight when doing incorrect second click', fakeAsync(async() => {
                // Given a board where you are player two and a moving piece has been selected
                await setupSecondTurn();
                const move: CheckersMove = entries.secondMove;
                const secondPlayerStart: Coord = move.getStartingCoord();
                const secondPlayerEnd: Coord = move.getEndingCoord();
                await testUtils.expectClickSuccess(`#coord-${ secondPlayerStart.x }-${ secondPlayerStart.y }`);

                await testUtils.expectMoveSuccess(`#coord-${ secondPlayerEnd.x }-${ secondPlayerEnd.y }`, move); // First move is set
                await testUtils.getWrapper().setRole(Player.ONE); // changing role
                const thirdMoveStart: Coord = entries.invalidThirdMove[0];
                await testUtils.expectClickSuccess(`#coord-${ thirdMoveStart.x }-${ thirdMoveStart.y }`); // Making the first click

                // When clicking on an invalid landing piece
                const invalidThirdMoveEnd: Coord = entries.invalidThirdMove[1];
                await testUtils.expectClickFailure(`#coord-${ invalidThirdMoveEnd.x }-${ invalidThirdMoveEnd.y }`, DirectionFailure.DIRECTION_MUST_BE_LINEAR());

                // Then the highlight should be at the expected place only, not at their symmetric point
                testUtils.expectElementToHaveClass(`#clickable-highlight-${ thirdMoveStart.x }-${ thirdMoveStart.y }`, 'clickable-stroke');
                const reversedCoord: Coord = reverseCoord(thirdMoveStart);
                testUtils.expectElementNotToExist(`#clickable-highlight-${ reversedCoord.x }-${ reversedCoord.y }`);
            }));

            it('should show last move reversed', fakeAsync(async() => {
                // Given a board with a last move
                await setupSecondTurn();

                // When reversing the board view
                await testUtils.getWrapper().setRole(Player.ONE);

                // Then the last move should be shown at the expected place
                expectBoardToBeSwitched();
            }));

        });

        it('should have a bijective encoder', () => {
            // Given any turn (here we test only the first unfortunately)
            const rules: R = testUtils.getGameComponent().rules;
            const encoder: Encoder<CheckersMove> = testUtils.getGameComponent().encoder;
            const moveGenerator: CheckersMoveGenerator = new CheckersMoveGenerator(rules);
            const initialNode: CheckersNode = rules.getInitialNode(defaultConfig);
            const firstTurnMoves: CheckersMove[] = moveGenerator.getListMoves(initialNode, defaultConfig);
            for (const move of firstTurnMoves) {
                // When checking if they are bijective
                // Then they should be
                EncoderTestUtils.expectToBeBijective(encoder, move);
            }
        });

    });

}
