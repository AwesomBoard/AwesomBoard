import { CheckersPiece, CheckersStack, CheckersState } from '../CheckersState';

describe('CheckersState', () => {

    const zero: CheckersPiece = CheckersPiece.ZERO;
    const one: CheckersPiece = CheckersPiece.ONE;
    const zeroPromoted: CheckersPiece = CheckersPiece.ZERO_PROMOTED;
    const onePromoted: CheckersPiece = CheckersPiece.ONE_PROMOTED;
    const __u: CheckersStack = new CheckersStack([zero]);
    const __O: CheckersStack = new CheckersStack([zeroPromoted]);
    const __v: CheckersStack = new CheckersStack([one]);
    const _vu: CheckersStack = new CheckersStack([one, zero]);
    const _uv: CheckersStack = new CheckersStack([zero, one]);
    const _Ov: CheckersStack = new CheckersStack([zeroPromoted, one]);
    const __X: CheckersStack = new CheckersStack([onePromoted]);
    const ___: CheckersStack = CheckersStack.EMPTY;

    describe('toString', () => {

        it('should display state', () => {
            const state: CheckersState = CheckersState.of([
                [_uv, ___, __v, ___, __v, ___, __v],
                [___, _vu, ___, __v, ___, __v, ___],
                [_Ov, ___, __O, ___, __v, ___, __v],
                [___, ___, ___, ___, ___, ___, ___],
                [___, ___, ___, ___, __u, ___, __u],
                [___, __X, ___, __u, ___, __u, ___],
                [__u, ___, ___, ___, __u, ___, __u],
            ], 0);
            const representation: string = `uv __ _v __ _v __ _v
__ vu __ _v __ _v __
Ov __ _O __ _v __ _v
__ __ __ __ __ __ __
__ __ __ __ _u __ _u
__ _X __ _u __ _u __
_u __ __ __ _u __ _u`;
            expect(state.toString()).toBe(representation);
        });

    });

});
