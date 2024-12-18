/* eslint-disable max-lines-per-function */
import { PylosComponent } from '../pylos.component';
import { PylosMove, PylosMoveFailure } from 'src/app/games/pylos/PylosMove';
import { PylosCoord } from 'src/app/games/pylos/PylosCoord';
import { PylosState } from 'src/app/games/pylos/PylosState';
import { PlayerOrNone } from 'src/app/jscaip/Player';
import { ComponentTestUtils } from 'src/app/utils/tests/TestUtils.spec';
import { fakeAsync } from '@angular/core/testing';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { PylosFailure } from '../PylosFailure';

describe('PylosComponent', () => {

    let testUtils: ComponentTestUtils<PylosComponent>;

    const _: PlayerOrNone = PlayerOrNone.NONE;
    const O: PlayerOrNone = PlayerOrNone.ZERO;
    const X: PlayerOrNone = PlayerOrNone.ONE;

    const climbableBoard: PlayerOrNone[][][] = [
        [
            [O, X, _, _],
            [X, O, _, _],
            [_, _, _, _],
            [_, _, _, O],
        ], [
            [_, _, _],
            [_, _, _],
            [_, _, _],
        ], [
            [_, _],
            [_, _],
        ], [
            [_],
        ],
    ];
    const preCaptureBoard: PlayerOrNone[][][] = [
        [
            [O, O, _, _],
            [O, _, _, _],
            [_, _, _, _],
            [_, _, _, _],
        ], [
            [_, _, _],
            [_, _, _],
            [_, _, _],
        ], [
            [_, _],
            [_, _],
        ], [
            [_],
        ],
    ];
    const climbableState: PylosState = new PylosState(climbableBoard, 0);

    beforeEach(fakeAsync(async() => {
        testUtils = await ComponentTestUtils.forGame<PylosComponent>('Pylos');
    }));

    it('should create', () => {
        testUtils.expectToBeCreated();
    });

    describe('First click', () => {

        it('should allow dropping piece on occupable space', fakeAsync(async() => {
            // Given a board where a drop is possible
            // When clicking on it
            // Then the move should succeed
            const move: PylosMove = PylosMove.ofDrop(new PylosCoord(0, 0, 0), []);
            await testUtils.expectMoveSuccess('#drop_0_0_0', move);
        }));

        it('should forbid clicking on opponent piece', fakeAsync(async() => {
            // Given a board with opponent's pieces
            const initialBoard: PlayerOrNone[][][] = [
                [
                    [X, _, _, _],
                    [_, _, _, _],
                    [_, _, _, _],
                    [_, _, _, _],
                ], [
                    [_, _, _],
                    [_, _, _],
                    [_, _, _],
                ], [
                    [_, _],
                    [_, _],
                ], [
                    [_],
                ],
            ];
            const initialState: PylosState = new PylosState(initialBoard, 0);
            await testUtils.setupState(initialState);

            // When clicking on one
            // Then it should fail
            await testUtils.expectClickFailure('#piece_0_0_0', RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_OPPONENT());
        }));

        it('should cancel move when clicking on a supporting piece', fakeAsync(async() => {
            // Given a board where there are supporting pieces
            const initialBoard: PlayerOrNone[][][] = [
                [
                    [O, X, _, _],
                    [X, O, O, _],
                    [_, O, _, _],
                    [_, _, _, _],
                ], [
                    [O, _, _],
                    [_, _, _],
                    [_, _, _],
                ], [
                    [_, _],
                    [_, _],
                ], [
                    [_],
                ],
            ];
            const initialState: PylosState = new PylosState(initialBoard, 0);
            await testUtils.setupState(initialState);

            // When clicking on the supporting piece
            // Then it should fail
            await testUtils.expectClickFailure('#piece_0_0_0', PylosFailure.CANNOT_MOVE_SUPPORTING_PIECE());
        }));

        it('should select coord when clicking on it', fakeAsync(async() => {
            // Given a board on which there are pieces
            await testUtils.setupState(climbableState);

            // When clicking on a space
            await testUtils.expectClickSuccess('#piece_0_0_0');

            // Then it should be selected
            testUtils.expectElementToHaveClass('#piece_0_0_0', 'selected-stroke');
        }));

    });

    describe('Second click', () => {

        it('should refuse to change selected piece to a supporting one', fakeAsync(async() => {
            // Given a board with a high piece selected
            const initialBoard: PlayerOrNone[][][] = [
                [
                    [O, X, _, _],
                    [X, O, _, _],
                    [_, _, O, _],
                    [_, _, _, _],
                ], [
                    [O, _, _],
                    [_, _, _],
                    [_, _, _],
                ], [
                    [_, _],
                    [_, _],
                ], [
                    [_],
                ],
            ];
            const initialState: PylosState = new PylosState(initialBoard, 0);
            await testUtils.setupState(initialState);
            await testUtils.expectClickSuccess('#piece_0_0_1');

            // When choosing a piece that support selected piece
            // Then it should fail
            const error: string = PylosFailure.CANNOT_MOVE_SUPPORTING_PIECE();
            await testUtils.expectClickFailure('#piece_0_0_0', error);
        }));

        it('should cancel piece selection when clicking on it again', fakeAsync(async() => {
            // Given a board on which a piece is selected
            await testUtils.setupState(climbableState);
            await testUtils.expectClickSuccess('#piece_0_0_0');

            // When clicking on it again
            await testUtils.expectClickFailure('#piece_0_0_0');

            // Then it should no longer be selected
            testUtils.expectElementNotToHaveClass('#piece_0_0_0', 'selected-stroke');
        }));

        it(`should show as 'left' climbing piece during the capture`, fakeAsync(async() => {
            // Given a board where by climbing you can make a capture
            const initialBoard: PlayerOrNone[][][] = [
                [
                    [O, X, O, _],
                    [X, O, X, _],
                    [X, X, X, _],
                    [_, _, _, O],
                ], [
                    [O, O, _],
                    [O, _, _],
                    [_, _, _],
                ], [
                    [_, _],
                    [_, _],
                ], [
                    [_],
                ],
            ];
            const initialState: PylosState = new PylosState(initialBoard, 0);
            await testUtils.setupState(initialState);

            // When the climb is done, and the capture is awaited
            await testUtils.expectClickSuccess('#piece_3_3_0');
            await testUtils.expectClickSuccess('#drop_1_1_1');

            // Then the starting coord of the move should be 'left', and not selected
            testUtils.expectElementNotToExist('#piece_3_3_0');
            testUtils.expectElementToHaveClass('#drop_3_3_0', 'moved-fill');
            // And its landing coord should be visible and selected to indicate a capture is to be done
            testUtils.expectElementToExist('#piece_1_1_1');
            testUtils.expectElementToHaveClass('#piece_1_1_1', 'selected-stroke');
        }));

    });

    describe('climbing', () => {

        it('should not allow a piece climbing on itself', fakeAsync(async() => {
            // Given a board where a piece could climb on itself then capture
            const initialBoard: PlayerOrNone[][][] = [
                [
                    [O, X, O, _],
                    [X, O, X, _],
                    [X, X, O, _],
                    [_, _, _, _],
                ], [
                    [O, O, _],
                    [O, _, _],
                    [_, _, _],
                ], [
                    [_, _],
                    [_, _],
                ], [
                    [_],
                ],
            ];
            const initialState: PylosState = new PylosState(initialBoard, 0);
            await testUtils.setupState(initialState);

            // When selecting the piece and making it climg on itsef
            await testUtils.expectClickSuccess('#piece_2_2_0');

            // Then landing on itself should not even be suggested
            testUtils.expectElementNotToExist('#drop_1_1_1');
        }));

        it('should allow climbing', fakeAsync(async() => {
            // Given a board where climbing is possible
            await testUtils.setupState(climbableState);

            // When clicking the first piece then its landing place
            await testUtils.expectClickSuccess('#piece_3_3_0');
            const move: PylosMove = PylosMove.ofClimb(new PylosCoord(3, 3, 0), new PylosCoord(0, 0, 1), []);

            // Then the climb should be legal
            await testUtils.expectMoveSuccess('#drop_0_0_1', move);
            testUtils.expectElementToHaveClasses('#drop_3_3_0', ['base', 'mid-stroke', 'moved-fill']);
        }));

        it('should no longer display unlandable coord', fakeAsync(async() => {
            // Given a board on which a climbing is possible
            const initialBoard: PlayerOrNone[][][] = [
                [
                    [X, O, _, _],
                    [O, X, _, _],
                    [_, _, O, _],
                    [_, _, _, _],
                ], [
                    [_, _, _],
                    [_, _, _],
                    [_, _, _],
                ], [
                    [_, _],
                    [_, _],
                ], [
                    [_],
                ],
            ];
            const initialState: PylosState = new PylosState(initialBoard, 0);
            await testUtils.setupState(initialState);
            testUtils.expectElementToExist('#drop_3_3_0');

            // When selecting the climbing piece
            await testUtils.expectClickSuccess('#piece_2_2_0');

            // Then non landable coord should no longer be displayed
            testUtils.expectElementNotToExist('#drop_3_3_0');
            testUtils.expectElementToExist('#drop_0_0_1');
        }));

    });

    describe('capture', () => {

        it('should display a disabled capture-validation button when capture start to be possible', fakeAsync(async() => {
            // Given a board where a capture is about to be possible
            const initialState: PylosState = new PylosState(preCaptureBoard, 0);
            await testUtils.setupState(initialState);

            // When doing the drop just before the capture
            await testUtils.expectClickSuccess('#drop_1_1_0'); // drop

            // Then a disabled capture-validation button should be displayed
            testUtils.expectElementToExist('#capture_validation');
            testUtils.expectElementToHaveClass('#capture_validation > circle', 'semi-transparent');
        }));

        it('should show capturable piece when capture start to be possible', fakeAsync(async() => {
            // Given a board where a capture is about to be possible
            const initialState: PylosState = new PylosState(preCaptureBoard, 0);
            await testUtils.setupState(initialState);

            // When doing the drop just before the capture
            await testUtils.expectClickSuccess('#drop_1_1_0'); // drop

            // Then "capturable" indicator should be displayed
            testUtils.expectElementToExist('#capturable_0_0_0');
            testUtils.expectElementToExist('#capturable_0_1_0');
            testUtils.expectElementToExist('#capturable_1_0_0');
            testUtils.expectElementToExist('#capturable_1_1_0');
        }));

        it('should nor cancelMove nor chooseMove when clicking on disabled capture-validation button', fakeAsync(async() => {
            // Given a board where a capture has started
            const initialState: PylosState = new PylosState(preCaptureBoard, 0);
            await testUtils.setupState(initialState);
            await testUtils.expectClickSuccess('#drop_1_1_0'); // drop

            // When doing clicking on the capture-validation button
            // Then nothing should happned
            await testUtils.expectClickSuccess('#capture_validation');
        }));

        it('should highlight selected first capture when clicking on it', fakeAsync(async() => {
            // Given a board on which a capture can be done
            const initialState: PylosState = new PylosState(preCaptureBoard, 0);
            await testUtils.setupState(initialState);
            await testUtils.expectClickSuccess('#drop_1_1_0'); // drop

            // When clicking on the first captured piece
            await testUtils.expectClickSuccess('#piece_1_1_0'); // capture

            // Then it should be selected
            const expectedClasses: string[] = ['base', 'player0-fill', 'selected-stroke', 'pre-captured-fill', 'mid-stroke'];
            testUtils.expectElementToHaveClasses('#piece_1_1_0', expectedClasses);
        }));

        it('should highlight selected second capture when clicking on it', fakeAsync(async() => {
            // Given a board on which a capture has started
            const initialState: PylosState = new PylosState(preCaptureBoard, 0);
            await testUtils.setupState(initialState);
            await testUtils.expectClickSuccess('#drop_1_1_0'); // drop
            await testUtils.expectClickSuccess('#piece_0_1_0'); // first capture

            // When clicking on the second captured piece
            await testUtils.expectClickSuccess('#piece_0_0_0');

            // Then both should be shown as captured
            const expectedClasses: string[] = ['base', 'player0-fill', 'pre-captured-fill', 'mid-stroke'];
            testUtils.expectElementToHaveClasses('#piece_0_0_0', expectedClasses);
            testUtils.expectElementToHaveClasses('#piece_0_1_0', expectedClasses);
        }));

        it('should enable capture-validation button when one captured piece has been selected', fakeAsync(async() => {
            // Given a board on which a capture can be done
            const initialState: PylosState = new PylosState(preCaptureBoard, 0);
            await testUtils.setupState(initialState);
            await testUtils.expectClickSuccess('#drop_1_1_0'); // drop

            // When clicking on the first captured piece
            await testUtils.expectClickSuccess('#piece_1_1_0'); // capture

            // Then capture-validation button should be no longer transparent
            testUtils.expectElementNotToHaveClass('#capture_validation > circle', 'semi-transparent');
        }));

        it('should deselect pre-captured (first) piece when clicking on it again', fakeAsync(async() => {
            // Given a board where capture has started
            const initialState: PylosState = new PylosState(preCaptureBoard, 0);
            await testUtils.setupState(initialState);
            await testUtils.expectClickSuccess('#drop_1_1_0'); // drop
            await testUtils.expectClickSuccess('#piece_0_0_0'); // capture

            // When clicking a second time on the captured piece
            await testUtils.expectClickSuccess('#piece_0_0_0'); // un-capture

            // Then it should no longer be selected
            const expectedClasses: string[] = ['base', 'player0-fill', 'mid-stroke']; // No longer 'selected' and 'pre-captured'
            testUtils.expectElementToHaveClasses('#piece_0_0_0', expectedClasses);
        }));

        it('should deselect pre-captured (second) piece when clicking on it again', fakeAsync(async() => {
            // Given a board where capture has started (with two capture)
            const initialState: PylosState = new PylosState(preCaptureBoard, 0);
            await testUtils.setupState(initialState);
            await testUtils.expectClickSuccess('#drop_1_1_0'); // drop
            await testUtils.expectClickSuccess('#piece_0_0_0'); // first capture
            await testUtils.expectClickSuccess('#piece_0_1_0'); // first capture

            // When clicking a second time on the second captured piece
            await testUtils.expectClickSuccess('#piece_0_1_0'); // un-capture

            // Then it should no longer be selected
            const expectedClasses: string[] = ['base', 'player0-fill', 'mid-stroke']; // No longer 'selected' and 'pre-captured'
            testUtils.expectElementToHaveClasses('#piece_0_1_0', expectedClasses);
        }));

        it('should allow to capture two pieces, and show capture during move and after', fakeAsync(async() => {
            // Given a board where two captures has been selected
            const initialState: PylosState = new PylosState(preCaptureBoard, 0);
            await testUtils.setupState(initialState);
            await testUtils.expectClickSuccess('#drop_1_1_0');
            await testUtils.expectClickSuccess('#piece_0_0_0');
            await testUtils.expectClickSuccess('#piece_0_1_0');

            // When clicking on the capture validation button
            const captures: PylosCoord[] = [new PylosCoord(0, 0, 0), new PylosCoord(0, 1, 0)];
            const move: PylosMove = PylosMove.ofDrop(new PylosCoord(1, 1, 0), captures);
            await testUtils.expectMoveSuccess('#capture_validation', move);

            // Then the two captures should be displayed as captured
            testUtils.expectElementToHaveClass('#drop_0_0_0', 'captured-fill');
            testUtils.expectElementToHaveClass('#drop_0_1_0', 'captured-fill');
        }));

        it('should allow to capture first piece', fakeAsync(async() => {
            // Given a board where one capture has been selected
            const initialState: PylosState = new PylosState(preCaptureBoard, 0);
            await testUtils.setupState(initialState);
            await testUtils.expectClickSuccess('#drop_1_1_0');
            await testUtils.expectClickSuccess('#piece_0_0_0'); // selecting first

            // When clicking on the capture validation button
            const captures: PylosCoord[] = [new PylosCoord(0, 0, 0)];
            const move: PylosMove = PylosMove.ofDrop(new PylosCoord(1, 1, 0), captures);
            await testUtils.expectMoveSuccess('#capture_validation', move);

            // Then the second capture should be displayed as captured (but not the first, eh !)
            testUtils.expectElementToHaveClass('#drop_0_0_0', 'captured-fill');
        }));

        it('should allow to capture second piece', fakeAsync(async() => {
            // Given a board where two captures has been selected then the first deselected
            const initialState: PylosState = new PylosState(preCaptureBoard, 0);
            await testUtils.setupState(initialState);
            await testUtils.expectClickSuccess('#drop_1_1_0');
            await testUtils.expectClickSuccess('#piece_0_0_0'); // selecting first
            await testUtils.expectClickSuccess('#piece_0_1_0'); // selecting second
            await testUtils.expectClickSuccess('#piece_0_0_0'); // deselecting first

            // When clicking on the capture validation button
            const captures: PylosCoord[] = [new PylosCoord(0, 1, 0)];
            const move: PylosMove = PylosMove.ofDrop(new PylosCoord(1, 1, 0), captures);
            await testUtils.expectMoveSuccess('#capture_validation', move);

            // Then the second capture should be displayed as captured (but not the first, eh !)
            testUtils.expectElementNotToExist('#drop_0_0_0');
            testUtils.expectElementToHaveClass('#drop_0_1_0', 'captured-fill');
        }));

        it('should fail when clicking on a third capturable piece', fakeAsync(async() => {
            // Given a board on which two captured piece has been selected but the capture not finalized
            const initialState: PylosState = new PylosState(preCaptureBoard, 0);
            await testUtils.setupState(initialState);
            await testUtils.expectClickSuccess('#drop_1_1_0');
            await testUtils.expectClickSuccess('#piece_0_0_0');
            await testUtils.expectClickSuccess('#piece_0_1_0');

            // When clicking on a third piece to capture
            // Then it should fail
            await testUtils.expectClickFailure('#piece_1_0_0', PylosMoveFailure.MUST_CAPTURE_MAXIMUM_TWO_PIECES());
        }));

        it('should show disappeared square when it has been captured, even if no longer landable', fakeAsync(async() => {
            // Given a board where a capture is possible
            const initialBoard: PlayerOrNone[][][] = [
                [
                    [O, X, _, _],
                    [X, O, O, _],
                    [_, O, _, _],
                    [_, _, _, _],
                ], [
                    [O, _, _],
                    [_, _, _],
                    [_, _, _],
                ], [
                    [_, _],
                    [_, _],
                ], [
                    [_],
                ],
            ];
            const initialState: PylosState = new PylosState(initialBoard, 0);
            await testUtils.setupState(initialState);

            // When dropping a piece then clicking on two pieces to capture
            await testUtils.expectClickSuccess('#drop_2_2_0');
            await testUtils.expectClickSuccess('#piece_0_0_1');
            const captures: PylosCoord[] = [new PylosCoord(0, 0, 1), new PylosCoord(1, 1, 0)];
            await testUtils.expectClickSuccess('#piece_1_1_0');
            const move: PylosMove = PylosMove.ofDrop(new PylosCoord(2, 2, 0), captures);
            await testUtils.expectMoveSuccess('#capture_validation', move);

            // Then the non longer landable square should be displayed
            testUtils.expectElementToHaveClass('#highCapture_0_0_1', 'captured-fill');
        }));

        it('should cancel move (during capture) when clicking on a non capturable piece', fakeAsync(async() => {
            // Given a board where a capture is ongoing
            const initialBoard: PlayerOrNone[][][] = [
                [
                    [O, X, O, _],
                    [X, X, O, _],
                    [X, X, X, _],
                    [_, _, _, O],
                ], [
                    [O, O, _],
                    [O, _, _],
                    [_, _, _],
                ], [
                    [_, _],
                    [_, _],
                ], [
                    [_],
                ],
            ];
            const initialState: PylosState = new PylosState(initialBoard, 0);
            await testUtils.setupState(initialState);
            await testUtils.expectClickSuccess('#piece_3_3_0');
            await testUtils.expectClickSuccess('#drop_1_1_1');

            // When clicking on a non capturable piece
            // Then it should fail
            await testUtils.expectClickFailure('#piece_2_1_0', PylosFailure.CANNOT_MOVE_SUPPORTING_PIECE());
        }));

        it('should allow capturing piece supporting captured-piece', fakeAsync(async() => {
            // Given a board where a piece has been captured
            // so now the piece previously supporting it are now capturable
            const initialBoard: PlayerOrNone[][][] = [
                [
                    [O, X, O, _],
                    [X, X, O, _],
                    [X, X, X, _],
                    [_, _, _, O],
                ], [
                    [O, O, _],
                    [O, _, _],
                    [_, _, _],
                ], [
                    [_, _],
                    [_, _],
                ], [
                    [_],
                ],
            ];
            const initialState: PylosState = new PylosState(initialBoard, 0);
            await testUtils.setupState(initialState);
            await testUtils.expectClickSuccess('#piece_3_3_0');
            await testUtils.expectClickSuccess('#drop_1_1_1');
            await testUtils.expectClickSuccess('#piece_0_0_1');

            // When clicking on the newly capturable piece then validating the capture
            // Then the move should succeed
            const captures: PylosCoord[] = [new PylosCoord(0, 0, 1), new PylosCoord(0, 0, 0)];
            const move: PylosMove = PylosMove.ofClimb(new PylosCoord(3, 3, 0), new PylosCoord(1, 1, 1), captures);
            await testUtils.expectClickSuccess('#piece_0_0_0');
            await testUtils.expectMoveSuccess('#capture_validation', move);
        }));

        it('should no longer show drop during capture phase', fakeAsync(async() => {
            // Given a board where a capture is about to be possible
            const initialBoard: PlayerOrNone[][][] = [
                [
                    [O, X, O, _],
                    [X, X, O, _],
                    [X, X, X, O],
                    [_, _, X, O],
                ], [
                    [O, O, _],
                    [O, _, _],
                    [_, _, _],
                ], [
                    [_, _],
                    [_, _],
                ], [
                    [_],
                ],
            ];
            const initialState: PylosState = new PylosState(initialBoard, 0);
            await testUtils.setupState(initialState);

            // When passing in capture phase
            await testUtils.expectClickSuccess('#drop_1_1_1');

            // Then the landing coord should disappear
            testUtils.expectElementNotToExist('#drop_0_0_2');
            testUtils.expectElementNotToExist('#drop_2_2_1');
        }));

    });

});
