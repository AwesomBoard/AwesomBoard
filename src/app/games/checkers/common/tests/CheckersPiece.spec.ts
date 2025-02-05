import { CheckersPiece } from '../CheckersState';

describe('CheckersPiece ', () => {

    const X: CheckersPiece = CheckersPiece.ONE_PROMOTED;
    const O: CheckersPiece = CheckersPiece.ZERO_PROMOTED;
    const V: CheckersPiece = CheckersPiece.ONE;
    const U: CheckersPiece = CheckersPiece.ZERO;

    describe('toString', () => {

        it('should display promoted pieces as the player owning them and non promoted as half of it', () => {
            expect(X.toString()).toBe('X');
            expect(O.toString()).toBe('O');
            expect(V.toString()).toBe('v');
            expect(U.toString()).toBe('u');
        });

    });

    describe('equal', () => {

        it('should work', () => {
            expect(X.equals(X)).toBeTrue();
            expect(X.equals(O)).toBeFalse();
        });

    });

});
