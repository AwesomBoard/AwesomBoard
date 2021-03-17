import { Coord } from 'src/app/jscaip/coord/Coord';
import { LegalityStatus } from 'src/app/jscaip/LegalityStatus';
import { Rules } from 'src/app/jscaip/Rules';
import { NumberTable } from 'src/app/utils/collection-lib/array-utils/ArrayUtils';
import { CoerceoMove, CoerceoStep } from '../coerceo-move/CoerceoMove';
import { CoerceoPartSlice, CoerceoPiece } from '../coerceo-part-slice/CoerceoPartSlice';
import { CoerceoFailure, CoerceoRules } from './CoerceoRules';

describe('CoerceoRules', () => {
    let rules: CoerceoRules;

    const _: number = CoerceoPiece.EMPTY.value;
    const N: number = CoerceoPiece.NONE.value;
    const O: number = CoerceoPiece.ZERO.value;
    const X: number = CoerceoPiece.ONE.value;

    beforeEach(() => {
        rules = new CoerceoRules(CoerceoPartSlice);
    });
    it('Should forbid to start move from outside the board', () => {
        const board: NumberTable = [
            [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
            [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
            [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
            [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
            [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
            [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
            [N, N, N, N, N, N, X, _, _, N, N, N, N, N, N],
            [N, N, N, N, N, N, _, _, O, N, N, N, N, N, N],
            [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
            [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
        ];
        const slice: CoerceoPartSlice = new CoerceoPartSlice(board, 1, { zero: 0, one: 0 }, { zero: 0, one: 0 });
        const move: CoerceoMove = CoerceoMove.fromMove(new Coord(0, 0), CoerceoStep.RIGHT);
        const status: LegalityStatus = rules.isLegal(move, slice);
        expect(status.legal.getReason()).toBe('Cannot start with a coord outside the board (0, 0).');
    });
    it('Should forbid to end move outside the board', () => {
        const board: NumberTable = [
            [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
            [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
            [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
            [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
            [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
            [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
            [N, N, N, N, N, N, X, _, _, N, N, N, N, N, N],
            [N, N, N, N, N, N, _, _, O, N, N, N, N, N, N],
            [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
            [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
        ];
        const slice: CoerceoPartSlice = new CoerceoPartSlice(board, 1, { zero: 0, one: 0 }, { zero: 0, one: 0 });
        const move: CoerceoMove = CoerceoMove.fromMove(new Coord(6, 6), CoerceoStep.LEFT);
        const status: LegalityStatus = rules.isLegal(move, slice);
        expect(status.legal.getReason()).toBe('Cannot end with a coord outside the board (4, 6).');
    });
    it('Should forbid to move ennemy pieces', () => {
        const board: NumberTable = [
            [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
            [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
            [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
            [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
            [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
            [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
            [N, N, N, N, N, N, X, _, _, N, N, N, N, N, N],
            [N, N, N, N, N, N, _, _, O, N, N, N, N, N, N],
            [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
            [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
        ];
        const slice: CoerceoPartSlice = new CoerceoPartSlice(board, 0, { zero: 0, one: 0 }, { zero: 0, one: 0 });
        const move: CoerceoMove = CoerceoMove.fromMove(new Coord(6, 6), CoerceoStep.RIGHT);
        const status: LegalityStatus = rules.isLegal(move, slice);
        expect(status.legal.getReason()).toBe(Rules.CANNOT_CHOOSE_ENNEMY_PIECE);
    });
    it('Should forbid to move empty pieces', () => {
        const board: NumberTable = [
            [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
            [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
            [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
            [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
            [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
            [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
            [N, N, N, N, N, N, X, _, _, N, N, N, N, N, N],
            [N, N, N, N, N, N, _, _, O, N, N, N, N, N, N],
            [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
            [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
        ];
        const slice: CoerceoPartSlice = new CoerceoPartSlice(board, 0, { zero: 0, one: 0 }, { zero: 0, one: 0 });
        const move: CoerceoMove = CoerceoMove.fromMove(new Coord(7, 7), CoerceoStep.UP_RIGHT);
        const status: LegalityStatus = rules.isLegal(move, slice);
        expect(status.legal.getReason()).toBe(CoerceoFailure.MUST_CHOOSE_OWN_PIECE_NOT_EMPTY);
    });
    it('Should forbid to land on occupied piece', () => {
        const board: NumberTable = [
            [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
            [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
            [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
            [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
            [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
            [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
            [N, N, N, N, N, N, X, _, _, N, N, N, N, N, N],
            [N, N, N, N, N, N, _, X, O, N, N, N, N, N, N],
            [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
            [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
        ];
        const slice: CoerceoPartSlice = new CoerceoPartSlice(board, 1, { zero: 0, one: 0 }, { zero: 0, one: 0 });
        const move: CoerceoMove = CoerceoMove.fromMove(new Coord(6, 6), CoerceoStep.DOWN_RIGHT);
        const status: LegalityStatus = rules.isLegal(move, slice);
        expect(status.legal.getReason()).toBe(CoerceoFailure.CANNOT_LAND_ON_ALLY);
    });
    it('Should remove pieces captured by move', () => {
        const board: NumberTable = [
            [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
            [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
            [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
            [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
            [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
            [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
            [N, N, N, N, N, N, X, _, X, N, N, N, N, N, N],
            [N, N, N, N, N, N, _, _, O, N, N, N, N, N, N],
            [N, N, N, N, N, N, _, _, _, N, N, N, N, N, N],
            [N, N, N, N, N, N, O, _, _, N, N, N, N, N, N],
        ];
        const expectedBoard: NumberTable = [
            [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
            [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
            [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
            [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
            [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
            [N, N, N, N, N, N, N, N, N, N, N, N, N, N, N],
            [N, N, N, N, N, N, _, _, X, N, N, N, N, N, N],
            [N, N, N, N, N, N, _, X, _, N, N, N, N, N, N],
            [N, N, N, N, N, N, _, _, _, N, N, N, N, N, N],
            [N, N, N, N, N, N, O, _, _, N, N, N, N, N, N],
        ];
        const slice: CoerceoPartSlice = new CoerceoPartSlice(board, 1, { zero: 0, one: 0 }, { zero: 0, one: 0 });
        const move: CoerceoMove = CoerceoMove.fromMove(new Coord(6, 6), CoerceoStep.DOWN_RIGHT);
        const status: LegalityStatus = rules.isLegal(move, slice);
        expect(status.legal.isSuccess()).toBeTrue();
        const resultingSlice: CoerceoPartSlice = rules.applyLegalMove(move, slice, status).resultingSlice;
        const expectedSlice: CoerceoPartSlice =
            new CoerceoPartSlice(expectedBoard, 2, { zero: 0, one: 0 }, { zero: 0, one: 1 });
        expect(resultingSlice).toEqual(expectedSlice);
    });
    it('Should remove piece pice captured by tiles exchange');
    it('Should remove tiles left by current player, when connected by 3 adjacent sides');
    it('Should not remove tiles left by current player, when connected by 3 separated sides');
});
