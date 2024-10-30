/* eslint-disable max-lines-per-function */
import { Type } from '@angular/core';
import { fakeAsync } from '@angular/core/testing';
import { Coord } from 'src/app/jscaip/Coord';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { Encoder, EncoderTestUtils, MGPFallible, MGPOptional } from '@everyboard/lib';
import { ComponentTestUtils } from 'src/app/utils/tests/TestUtils.spec';
import { TaflComponent } from '../tafl.component';
import { TaflFailure } from '../TaflFailure';
import { TaflMove } from '../TaflMove';
import { TaflMoveGenerator } from '../TaflMoveGenerator';
import { TaflRules } from '../TaflRules';
import { TaflState } from '../TaflState';
import { RulesConfigUtils } from 'src/app/jscaip/RulesConfigUtil';
import { TaflConfig } from '../TaflConfig';

export class TaflTestEntries<C extends TaflComponent<R, M>,
                             R extends TaflRules<M>,
                             M extends TaflMove>
{
    component: Type<C>; // TablutComponent, BrandhubComponent, etc
    gameName: string; // 'Tablut', 'Brandhub', etc
    secondPlayerPiece: Coord; // The coord of a piece belonging to Player.ONE
    validFirstCoord: Coord; // The coord of a piece belonging to Player.ZERO that could move this turn (in initialState)
    moveProvider: (start: Coord, end: Coord) => MGPFallible<M>;
    validSecondCoord: Coord; // The coord of an empty space that could be the landing coord of validFirstCoord
    diagonalSecondCoord: Coord; // An empty space coord in diagonal of validFirstCoord
    stateReadyForCapture: TaflState; // A state in which a capture is possible for current player
    capture: M; // The capture possible in stateReadyForCapture
    firstCaptured: Coord; // The capture made by 'capture'
    otherPlayerPiece: Coord; // A different coord as validFirstCoord of the same player
    stateReadyForJumpOver: TaflState;
    jumpOver: M; // An illegal move on stateReadyForJumpOver, that could make a piece jump over another
}

export function DoTaflTests<C extends TaflComponent<R, M>,
                            R extends TaflRules<M>,
                            M extends TaflMove>(entries: TaflTestEntries<C, R, M>)
    : void
{

    let testUtils: ComponentTestUtils<C>;

    describe(entries.gameName + ' component generic tests', () => {

        beforeEach(fakeAsync(async() => {
            testUtils = await ComponentTestUtils.forGame<C>(entries.gameName);
        }));

        it('should create', () => {
            testUtils.expectToBeCreated();
        });

        describe('First click', () => {

            it('should cancel move when clicking on opponent piece', fakeAsync( async() => {
                // Given any state
                // When clicking on an opponent piece
                // Then it should fail
                const opponentPiece: string = '#click-' + entries.secondPlayerPiece.x + '-' + entries.secondPlayerPiece.y;
                const reason: string = RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_OPPONENT();
                await testUtils.expectClickFailure(opponentPiece, reason);
            }));

            it('should cancel move when first click on empty space', fakeAsync( async() => {
                // Given any state
                // When clicking on an empty space
                // Then it should fail
                await testUtils.expectClickFailure('#click-0-0', RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_EMPTY());
            }));

            it('should highlight selected piece', fakeAsync(async() => {
                // Given any state
                // When clicking on one of your piece
                const playersCoord: string = entries.validFirstCoord.x + '-' + entries.validFirstCoord.y;
                await testUtils.expectClickSuccess('#click-' + playersCoord);

                // Then it should have selected the piece
                testUtils.expectElementToHaveClass('#piece-' + playersCoord, 'selected-stroke');
            }));

        });

        describe('Second click', () => {

            it('should allow simple move', fakeAsync(async() => {
                // Given a state where first click selected one of your pieces
                const start: Coord = entries.validFirstCoord;
                const end: Coord = entries.validSecondCoord;
                const playersCoord: string = start.x + '-' + start.y;
                await testUtils.expectClickSuccess('#click-' + playersCoord);

                // When moving your piece
                const move: M = entries.moveProvider(start, end).get();

                // Then the move should succeed
                const landingSpace: string = '#click-' + end.x + '-' + end.y;
                await testUtils.expectMoveSuccess(landingSpace, move);
                // And the square on the way should be highlighted
                const movedOverCoords: Coord[] = move.getMovedOverCoords();
                for (const movedOverCoord of movedOverCoords) {
                    const elementName: string = '#space-' + movedOverCoord.x + '-' + movedOverCoord.y;
                    testUtils.expectElementToHaveClass(elementName, 'moved-fill');
                }
            }));

            it('should fail but not throw during diagonal move attempt', fakeAsync(async() => {
                // Given a state where first click selected one of your pieces
                const playersCoord: string = entries.validFirstCoord.x + '-' + entries.validFirstCoord.y;
                await testUtils.expectClickSuccess('#click-' + playersCoord);

                // When attempting diagonal move
                const message: string = TaflFailure.MOVE_MUST_BE_ORTHOGONAL();

                // Then it should not have throwed
                const secondClick: string = '#click-' + entries.diagonalSecondCoord.x + '-' + entries.diagonalSecondCoord.y;
                expect(async() => await testUtils.expectClickFailure(secondClick, message)).not.toThrow();
            }));

            it('should show captured piece and left spaces', fakeAsync(async() => {
                // Given a board where a capture is ready to be made
                await testUtils.setupState(entries.stateReadyForCapture);
                const firstCoord: Coord = entries.capture.getStart();
                await testUtils.expectClickSuccess('#click-' + firstCoord.x + '-' + firstCoord.y);

                // When finalizing the capture
                const secondCoord: Coord = entries.capture.getEnd();
                await testUtils.expectMoveSuccess('#click-' + secondCoord.x + '-' + secondCoord.y, entries.capture);

                // Then captured and move highlight should be shown
                const component: C = testUtils.getGameComponent();
                expect(component.getRectClasses(entries.firstCaptured.x, entries.firstCaptured.y)).toContain('captured-fill');
                expect(component.getRectClasses(firstCoord.x, firstCoord.y)).toContain('moved-fill');
                expect(component.getRectClasses(secondCoord.x, secondCoord.y)).toContain('moved-fill');
            }));

            it('should select other piece when clicking on another piece of the player', fakeAsync(async() => {
                // Given a state where first click selected one of your pieces
                const playersCoord: string = entries.validFirstCoord.x + '-' + entries.validFirstCoord.y;
                await testUtils.expectClickSuccess('#click-' + playersCoord);

                // When clicking another piece of yours
                const otherCoord: string = entries.otherPlayerPiece.x + '-' + entries.otherPlayerPiece.y;
                await testUtils.expectClickSuccess('#click-' + otherCoord);

                // Then that piece should be selected and the previous unselected
                testUtils.expectElementToHaveClass('#piece-' + otherCoord, 'selected-stroke');
                testUtils.expectElementNotToHaveClass('#piece-' + playersCoord, 'selected-stroke');
            }));

            it('should deselect piece when clicking a second time on it', fakeAsync(async() => {
                // Given a state where first click selected one of your pieces
                const playersCoord: string = entries.validFirstCoord.x + '-' + entries.validFirstCoord.y;
                await testUtils.expectClickSuccess('#click-' + playersCoord);

                // When clicking on it again
                await testUtils.expectClickFailure('#click-' + playersCoord);

                // Then that piece should be deselected
                testUtils.expectElementNotToHaveClass('#piece-' + playersCoord, 'selected-stroke');
            }));

            it('should cancel the move when trying to jump over another piece', fakeAsync(async() => {
                // Given a state where first click selected one of your pieces
                await testUtils.setupState(entries.stateReadyForJumpOver);
                const firstCoord: string = entries.jumpOver.getStart().x + '-' + entries.jumpOver.getStart().y;
                await testUtils.expectClickSuccess('#click-' + firstCoord);

                // When trying an illegal move
                const move: M = entries.jumpOver;

                // Then the move should have failed
                const reason: string = RulesFailure.SOMETHING_IN_THE_WAY();
                const secondCoord: string = entries.jumpOver.getEnd().x + '-' + entries.jumpOver.getEnd().y;
                await testUtils.expectMoveFailure('#click-' + secondCoord, reason, move);
                // And the piece should be unselected
                testUtils.expectElementNotToHaveClass('#piece-' + firstCoord, 'selected-stroke');
            }));

        });

        it('should have a bijective encoder', () => {
            // Given any turn (here we test only the first unfortunately)
            const rules: R = testUtils.getGameComponent().rules;
            const encoder: Encoder<M> = testUtils.getGameComponent().encoder;
            const moveGenerator: TaflMoveGenerator<M> = new TaflMoveGenerator(rules);
            const defaultConfig: MGPOptional<TaflConfig> = RulesConfigUtils.getGameDefaultConfig(entries.gameName);
            const firstTurnMoves: M[] = moveGenerator
                .getListMoves(rules.getInitialNode(defaultConfig), defaultConfig)
                .map((move: TaflMove) => {
                    return entries.moveProvider(move.getStart(), move.getEnd()).get();
                });
            for (const move of firstTurnMoves) {
                // When checking if they are bijective
                // Then they should be
                EncoderTestUtils.expectToBeBijective(encoder, move);
            }
        });

        it('should hide first move when taking back', fakeAsync(async() => {
            // Given a state with a first move done
            const playersCoord: string = entries.validFirstCoord.x + '-' + entries.validFirstCoord.y;
            await testUtils.expectClickSuccess('#click-' + playersCoord);
            const move: M = entries.moveProvider(entries.validFirstCoord, entries.validSecondCoord).get();
            const landingCoord: string = entries.validSecondCoord.x + '-' + entries.validSecondCoord.y;
            const landingSpace: string = '#click-' + landingCoord;
            await testUtils.expectMoveSuccess(landingSpace, move);

            // When taking it back
            await testUtils.expectInterfaceClickSuccess('#take-back');

            // Then no highlight should be found
            testUtils.expectElementNotToHaveClass('#space-' + playersCoord, 'moved-fill');
            testUtils.expectElementNotToHaveClass('#space-' + landingCoord, 'moved-fill');
        }));

    });

}
