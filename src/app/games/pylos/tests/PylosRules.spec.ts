/* eslint-disable max-lines-per-function */
import { Player, PlayerOrNone } from 'src/app/jscaip/Player';
import { PylosCoord } from '../PylosCoord';
import { PylosMove } from '../PylosMove';
import { PylosState } from '../PylosState';
import { PylosNode, PylosRules } from '../PylosRules';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { PylosFailure } from '../PylosFailure';
import { MGPOptional, MGPValidation } from '@everyboard/lib';
import { RulesUtils } from 'src/app/jscaip/tests/RulesUtils.spec';
import { NoConfig } from 'src/app/jscaip/RulesConfigUtil';

describe('PylosRules', () => {

    let rules: PylosRules;
    const defaultConfig: NoConfig = PylosRules.get().getDefaultRulesConfig();

    const _: PlayerOrNone = PlayerOrNone.NONE;
    const O: PlayerOrNone = PlayerOrNone.ZERO;
    const X: PlayerOrNone = PlayerOrNone.ONE;

    beforeEach(() => {
        rules = PylosRules.get();
    });

    it(`should forbid move who'se landing coord is not empty`, () => {
        const board: PlayerOrNone[][][] = [
            [
                [O, _, _, _],
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

        const state: PylosState = new PylosState(board, 0);
        const move: PylosMove = PylosMove.ofDrop(new PylosCoord(0, 0, 0), []);

        // Then the move should be illegal
        const reason: string = RulesFailure.MUST_LAND_ON_EMPTY_SPACE();
        RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
    });

    it('should forbid move starting by an empty piece', () => {
        const board: PlayerOrNone[][][] = [
            [
                [_, _, _, _],
                [_, _, _, _],
                [_, _, O, X],
                [_, _, X, O],
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

        const state: PylosState = new PylosState(board, 0);
        const move: PylosMove = PylosMove.ofClimb(new PylosCoord(0, 0, 0), new PylosCoord(2, 2, 1), []);

        // Then the move should be illegal
        const reason: string = RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_EMPTY();
        RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
    });

    it('should forbid move starting by an opponent piece', () => {
        const board: PlayerOrNone[][][] = [
            [
                [X, _, _, _],
                [_, _, _, _],
                [_, _, O, X],
                [_, _, X, O],
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

        const state: PylosState = new PylosState(board, 0);
        const move: PylosMove = PylosMove.ofClimb(new PylosCoord(0, 0, 0), new PylosCoord(2, 2, 1), []);

        // Then the move should be illegal
        const reason: string = RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_OPPONENT();
        RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
    });

    it(`should forbid move who'se landing coord is not landable (not on the floor, not over 4 lower pieces)`, () => {
        const board: PlayerOrNone[][][] = [
            [
                [_, _, _, _],
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

        const state: PylosState = new PylosState(board, 0);
        const move: PylosMove = PylosMove.ofDrop(new PylosCoord(0, 0, 1), []);

        // Then the move should be illegal
        const reason: string = PylosFailure.SHOULD_HAVE_SUPPORTING_PIECES();
        RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
    });

    it('should forbid move who capture without having formed a squared', () => {
        const board: PlayerOrNone[][][] = [
            [
                [O, _, _, _],
                [_, _, _, _],
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

        const state: PylosState = new PylosState(board, 0);
        const move: PylosMove =
            PylosMove.ofDrop(new PylosCoord(0, 3, 0), [new PylosCoord(0, 0, 0), new PylosCoord(3, 3, 0)]);

        // Then the move should be illegal
        const reason: string = PylosFailure.CANNOT_CAPTURE();
        RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
    });

    it('should forbid move who capture non-player piece or supporting-piece', () => {
        const board: PlayerOrNone[][][] = [
            [
                [_, O, O, _],
                [O, O, X, _],
                [_, _, _, _],
                [_, _, _, _],
            ], [
                [_, O, _],
                [_, _, _],
                [_, _, _],
            ], [
                [_, _],
                [_, _],
            ], [
                [_],
            ],
        ];

        const state: PylosState = new PylosState(board, 0);

        const move: PylosMove = PylosMove.ofDrop(new PylosCoord(0, 0, 0), [new PylosCoord(2, 2, 0)]);

        // Then the move should be illegal
        let reason: string = PylosFailure.INVALID_FIRST_CAPTURE();
        RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);

        const otherMove: PylosMove = PylosMove.ofDrop(new PylosCoord(0, 0, 0),
                                                      [new PylosCoord(0, 0, 0), new PylosCoord(1, 0, 0)]);
        // Then the move should be illegal
        reason = PylosFailure.INVALID_SECOND_CAPTURE();
        RulesUtils.expectMoveFailure(rules, state, otherMove, reason, defaultConfig);
    });

    it('should forbid move who capture a piece that became supporting during the same move', () => {
        // Given a board where a capture is about to happend
        const board: PlayerOrNone[][][] = [
            [
                [X, O, O, _],
                [O, O, X, _],
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
        const state: PylosState = new PylosState(board, 0);

        // When trying to capture a piece below the landed piece
        // Then the move should be illegal
        const move: PylosMove = PylosMove.ofDrop(new PylosCoord(1, 1, 1), [new PylosCoord(2, 2, 0)]);

        // Then the move should be illegal
        const reason: string = PylosFailure.INVALID_FIRST_CAPTURE();
        RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
    });

    it('should allow legal capture to include landing piece', () => {
        const board: PlayerOrNone[][][] = [
            [
                [_, O, _, _],
                [O, O, _, _],
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

        const state: PylosState = new PylosState(board, 0);
        const move: PylosMove = PylosMove.ofDrop(new PylosCoord(0, 0, 0), [new PylosCoord(0, 0, 0)]);
        const status: MGPValidation = rules.isLegal(move, state);
        expect(status.isSuccess()).toBeTrue();
    });

    it('should forbid piece to climb over itself', () => {
        const board: PlayerOrNone[][][] = [
            [
                [X, O, _, _],
                [O, O, _, _],
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

        const state: PylosState = new PylosState(board, 0);
        const move: PylosMove = PylosMove.ofClimb(new PylosCoord(1, 1, 0), new PylosCoord(0, 0, 1), []);

        // Then the move should be illegal
        const reason: string = PylosFailure.SHOULD_HAVE_SUPPORTING_PIECES();
        RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
    });

    it('should forbid piece to climb when supporting', () => {
        const board: PlayerOrNone[][][] = [
            [
                [X, O, _, _],
                [O, O, _, _],
                [X, X, _, _],
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

        const state: PylosState = new PylosState(board, 0);
        const move: PylosMove = PylosMove.ofClimb(new PylosCoord(1, 0, 0), new PylosCoord(0, 1, 1), []);

        // Then the move should be illegal
        const reason: string = PylosFailure.CANNOT_MOVE_SUPPORTING_PIECE();
        RulesUtils.expectMoveFailure(rules, state, move, reason, defaultConfig);
    });

    it('should allow legal capture to include piece supporting previously captured piece', () => {
        const board: PlayerOrNone[][][] = [
            [
                [X, O, X, O],
                [O, X, O, X],
                [X, O, X, O],
                [O, _, _, _],
            ], [
                [_, O, X],
                [O, O, X],
                [_, _, _],
            ], [
                [_, O],
                [_, _],
            ], [
                [_],
            ],
        ];

        const state: PylosState = new PylosState(board, 0);
        const move: PylosMove = PylosMove.ofClimb(new PylosCoord(0, 3, 0),
                                                  new PylosCoord(0, 0, 1),
                                                  [new PylosCoord(1, 0, 2), new PylosCoord(1, 0, 1)]);
        const status: MGPValidation = rules.isLegal(move, state);
        expect(status.isSuccess()).toBeTrue();
    });

    it('should declare loser Player.ZERO when he put their 15th ball', () => {
        const board: PlayerOrNone[][][] = [
            [
                [X, O, X, O],
                [O, O, O, O],
                [X, O, X, O],
                [O, O, O, O],
            ], [
                [O, _, _],
                [_, O, _],
                [_, _, _],
            ], [
                [_, _],
                [_, _],
            ], [
                [_],
            ],
        ];

        const state: PylosState = new PylosState(board, 0);
        const move: PylosMove = PylosMove.ofDrop(new PylosCoord(2, 2, 1), []);
        const expectedBoard: PlayerOrNone[][][] = [
            [
                [X, O, X, O],
                [O, O, O, O],
                [X, O, X, O],
                [O, O, O, O],
            ], [
                [O, _, _],
                [_, O, _],
                [_, _, O],
            ], [
                [_, _],
                [_, _],
            ], [
                [_],
            ],
        ];

        const expectedState: PylosState = new PylosState(expectedBoard, 1);
        RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
        const node: PylosNode = new PylosNode(expectedState, MGPOptional.empty(), MGPOptional.of(move));
        RulesUtils.expectToBeVictoryFor(rules, node, Player.ONE, defaultConfig);
    });

    it('should declare loser Player.ONE when they put their 15th ball', () => {
        const board: PlayerOrNone[][][] = [
            [
                [O, X, O, X],
                [X, X, X, X],
                [O, X, O, X],
                [X, X, X, X],
            ], [
                [X, _, _],
                [_, X, _],
                [_, _, _],
            ], [
                [_, _],
                [_, _],
            ], [
                [_],
            ],
        ];

        const state: PylosState = new PylosState(board, 1);
        const move: PylosMove = PylosMove.ofDrop(new PylosCoord(2, 2, 1), []);
        const expectedBoard: PlayerOrNone[][][] = [
            [
                [O, X, O, X],
                [X, X, X, X],
                [O, X, O, X],
                [X, X, X, X],
            ], [
                [X, _, _],
                [_, X, _],
                [_, _, X],
            ], [
                [_, _],
                [_, _],
            ], [
                [_],
            ],
        ];
        const expectedState: PylosState = new PylosState(expectedBoard, 2);
        RulesUtils.expectMoveSuccess(rules, state, move, expectedState, defaultConfig);
        const node: PylosNode = new PylosNode(expectedState, MGPOptional.empty(), MGPOptional.of(move));
        RulesUtils.expectToBeVictoryFor(rules, node, Player.ZERO, defaultConfig);
    });

});
