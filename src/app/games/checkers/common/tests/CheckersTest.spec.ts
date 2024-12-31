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
import { DirectionFailure } from 'src/app/jscaip/Direction';

export class CheckersTestEntries<C extends CheckersComponent<R>,
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

    // Coord that Player.ONE can do after firstPlayerCoord[0] then firstPlayerSecondClics[0] has been done
    secondPlayerCoord: Coord;

    // A state on which a vertical step of 2 would be possible, if it was legal
    stateWithInvalidVerticalMove: CheckersState;
    // The coord of the piece able to move (0, 2), of Player.ONE on stateWithInvalidVerticalMove
    invalidStepperCoord: Coord;
}

export function DoCheckersTests<C extends CheckersComponent<R>,
                                R extends AbstractCheckersRules>(
    entries: CheckersTestEntries<C, R>)
    : void
{

    let testUtils: ComponentTestUtils<C>;

    const defaultConfig: MGPOptional<CheckersConfig> = RulesConfigUtils.getGameDefaultConfig(entries.gameName);

    fdescribe(entries.gameName + ' component generic tests', () => {

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
                const rules: AbstractCheckersRules = testUtils.getGameComponent().rules;
                const previousState: CheckersState = rules.getInitialState(defaultConfig);
                const firstClick: Coord = entries.firstPlayerCoords[0];
                const secondClick: Coord = entries.firstPlayerSecondClicks[0];
                const previousMove: CheckersMove = CheckersMove.fromStep(firstClick, secondClick);
                const state: CheckersState = rules.applyLegalMove(previousMove, previousState, defaultConfig);
                await testUtils.setupState(state, { previousState, previousMove });

                // When selecting stack
                await testUtils.expectClickSuccess(`#coord-${ entries.secondPlayerCoord.x }-${ entries.secondPlayerCoord.y }`);

                // // Then start and end coord of last move should not be highlighted
                // testUtils.expectElementNotToHaveClass(`#square-${ firstClick.x }-${ firstClick.y }`, 'moved-fill');
                // testUtils.expectElementNotToHaveClass(`#square-${ secondClick.x }-${ secondClick.y }`, 'moved-fill');
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
