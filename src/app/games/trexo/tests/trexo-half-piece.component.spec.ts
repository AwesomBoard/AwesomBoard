/* eslint-disable max-lines-per-function */
import { DebugElement } from '@angular/core';
import { fakeAsync } from '@angular/core/testing';
import { Coord } from 'src/app/jscaip/Coord';
import { Coord3D } from 'src/app/jscaip/Coord3D';
import { SimpleComponentTestUtils } from 'src/app/utils/tests/TestUtils.spec';
import { TrexoHalfPieceComponent } from '../trexo-half-piece.component';
import { TrexoComponent } from '../trexo.component';
import { TrexoMove } from '../TrexoMove';

describe('TrexoHalfSquareComponent', () => {

    function expectAllLinesToBeDisplayed(): void {
        /**
         * Then all those lines should be displayed:
         *     0------1
         *    /      /|
         *   2------3 |
         *   |      | 4
         *   |      |/
         *   5------6
         */
        testUtils.expectElementToExist('#line_0_to_1');
        testUtils.expectElementToExist('#line_2_to_3');
        testUtils.expectElementToExist('#line_5_to_6');
        testUtils.expectElementToExist('#line_0_to_2');
        testUtils.expectElementToExist('#line_1_to_3');
        testUtils.expectElementToExist('#line_4_to_6');
        testUtils.expectElementToExist('#line_2_to_5');
        testUtils.expectElementToExist('#line_3_to_6');
        testUtils.expectElementToExist('#line_1_to_4');
    }

    let testUtils: SimpleComponentTestUtils<TrexoHalfPieceComponent>;

    let component: TrexoHalfPieceComponent;

    /** Those are all the points, and line_A_to_B is the name of the line going from point A to point B
     * Pretty complex notation right ?
     *     0------1
     *    /      /|
     *   2------3 |
     *   |      | 4
     *   |      |/
     *   5------6
     */

    beforeEach(fakeAsync(async() => {
        testUtils = await SimpleComponentTestUtils.create(TrexoHalfPieceComponent);
        component = testUtils.getComponent();
        component.coord = new Coord3D(1, 1, 0);
        component.mode = TrexoComponent.modeMap['3D'];
    }));

    it('should create', fakeAsync(async() => {
        testUtils.detectChanges();
        expect(component).toBeTruthy();
    }));

    it(`should display parallelogram as closed when missing move`, () => {
        // Given a component on which no move is given
        component.pieceClasses = [];

        // When displaying it
        testUtils.detectChanges();

        // Then all lines should be displayed
        expectAllLinesToBeDisplayed();
    });

    it(`should display parallelogram as open to the right when it is the left part of the tile`, () => {
        // Given a component on which the move and coord indicate that the coord is on the left part of the tile
        component.move = TrexoMove.from(new Coord(1, 1), new Coord(2, 1)).get();
        component.pieceClasses = [];

        // When displaying it
        testUtils.detectChanges();

        /**
         * Then all those lines should be displayed:
         *     0------1
         *    /
         *   2------3
         *   |
         *   |
         *   5------6
         */
        testUtils.expectElementToExist('#line_0_to_1');
        testUtils.expectElementToExist('#line_2_to_3');
        testUtils.expectElementToExist('#line_5_to_6');
        testUtils.expectElementToExist('#line_0_to_2');
        testUtils.expectElementToExist('#line_2_to_5');
        testUtils.expectElementNotToExist('#line_1_to_4');
        testUtils.expectElementNotToExist('#line_1_to_3');
        testUtils.expectElementNotToExist('#line_4_to_6');
        testUtils.expectElementNotToExist('#line_3_to_6');
    });

    it(`should display parallelogram as open to the left when it is the rightmost part of the tile`, () => {
        // Given a component on which the move and coord indicate that the coord is on the right part of the tile
        component.move = TrexoMove.from(new Coord(1, 1), new Coord(0, 1)).get();
        component.pieceClasses = [];

        // When displaying it
        testUtils.detectChanges();

        /**
         * Then all those lines should be displayed:
         *     0------1
         *           /|
         *   2------3 |
         *          | 4
         *          |/
         *   5------6
         */
        testUtils.expectElementToExist('#line_0_to_1');
        testUtils.expectElementToExist('#line_2_to_3');
        testUtils.expectElementToExist('#line_5_to_6');
        testUtils.expectElementToExist('#line_1_to_3');
        testUtils.expectElementToExist('#line_4_to_6');
        testUtils.expectElementToExist('#line_3_to_6');
        testUtils.expectElementToExist('#line_1_to_4');
        testUtils.expectElementNotToExist('#line_0_to_2');
        testUtils.expectElementNotToExist('#line_2_to_5');
    });

    it(`should display parallelogram as open to the bottom when it is the upper part of the tile`, () => {
        // Given a component on which the move and coord indicate that the coord is on the top part of the tile
        component.move = TrexoMove.from(new Coord(1, 1), new Coord(1, 2)).get();
        component.pieceClasses = [];

        // When displaying it
        testUtils.detectChanges();

        /**
         * Then all those lines should be displayed:
         *     0------1
         *    /      /|
         *   2      3 |
         *            4
         *           /
         *          6
         */
        testUtils.expectElementToExist('#line_0_to_1');
        testUtils.expectElementToExist('#line_0_to_2');
        testUtils.expectElementToExist('#line_1_to_3');
        testUtils.expectElementToExist('#line_1_to_4');
        testUtils.expectElementToExist('#line_4_to_6');
        testUtils.expectElementNotToExist('#line_2_to_3');
        testUtils.expectElementNotToExist('#line_2_to_5');
        testUtils.expectElementNotToExist('#line_3_to_6');
        testUtils.expectElementNotToExist('#line_5_to_6');
    });

    it(`should display parallelogram as open to the top when it is the lower part of the tile`, () => {
        // Given a component on which the move and coord indicate that the coord is on the bottom part of the tile
        component.move = TrexoMove.from(new Coord(1, 1), new Coord(1, 0)).get();
        component.pieceClasses = [];

        // When displaying it
        testUtils.detectChanges();

        /**
         * Then all those lines should be displayed:
         *     0      1
         *    /      /
         *   2------3
         *   |      | 4
         *   |      |/
         *   5------6
         */
        testUtils.expectElementToExist('#line_2_to_3');
        testUtils.expectElementToExist('#line_5_to_6');
        testUtils.expectElementToExist('#line_0_to_2');
        testUtils.expectElementToExist('#line_1_to_3');
        testUtils.expectElementToExist('#line_4_to_6');
        testUtils.expectElementToExist('#line_2_to_5');
        testUtils.expectElementToExist('#line_3_to_6');
        testUtils.expectElementNotToExist('#line_0_to_1');
        testUtils.expectElementNotToExist('#line_1_to_4');
    });

    it(`should work the same when the coord is the "end" of the move not its start`, () => {
        // Given a component on which the move and coord indicate that the coord is on the bottom part of the tile
        component.move = TrexoMove.from(new Coord(1, 0), new Coord(1, 1)).get();
        component.pieceClasses = [];

        // When displaying it
        testUtils.detectChanges();

        /**
         * Then all those lines should be displayed:
         *     0      1
         *    /      /
         *   2------3
         *   |      | 4
         *   |      |/
         *   5------6
         */
        testUtils.expectElementToExist('#line_2_to_3');
        testUtils.expectElementToExist('#line_5_to_6');
        testUtils.expectElementToExist('#line_0_to_2');
        testUtils.expectElementToExist('#line_1_to_3');
        testUtils.expectElementToExist('#line_4_to_6');
        testUtils.expectElementToExist('#line_2_to_5');
        testUtils.expectElementToExist('#line_3_to_6');
        testUtils.expectElementNotToExist('#line_0_to_1');
        testUtils.expectElementNotToExist('#line_1_to_4');
    });

    it(`should display 'Z' on the piece when mustDisplayHeight is true`, () => {
        // Given a component with mustDisplayHeight as true
        component.mustDisplayHeight = true;
        component.pieceClasses = [];

        // When displaying it
        testUtils.detectChanges();

        // Then height should be displayed
        const height: DebugElement = testUtils.findElement('#height_1_1_0');
        expect(height.nativeElement.innerHTML).toBe('0');
    });

    it(`should not display 'Z' on the piece when mustDisplayHeight is false`, () => {
        // Given a component with mustDisplayHeight as false
        component.mustDisplayHeight = false;
        component.pieceClasses = [];

        // When displaying it
        testUtils.detectChanges();

        // Then height should be displayed
        testUtils.expectElementNotToExist('#height_1_1_0');
    });

    it('should display the full parallelogram when there is a victory highlight', () => {
        // Given a component with a victory highlight
        component.move = TrexoMove.from(new Coord(1, 0), new Coord(1, 1)).get();
        component.pieceClasses = ['victory-stroke'];

        // When displaying it
        testUtils.detectChanges();

        // Then all lines should be displayed
        expectAllLinesToBeDisplayed();
    });

    it('should display the full parallelogram when there is a last move highlight', () => {
        // Given a component with a victory highlight
        component.move = TrexoMove.from(new Coord(1, 0), new Coord(1, 1)).get();
        component.pieceClasses = ['last-move-stroke'];

        // When displaying it
        testUtils.detectChanges();

        // Then all lines should be displayed
        expectAllLinesToBeDisplayed();
    });

});
