import { ArrayUtils } from "src/app/collectionlib/arrayutils/ArrayUtils";
import { Coord } from "src/app/jscaip/coord/Coord";
import { KamisadoBoard } from "../KamisadoBoard";
import { KamisadoMove } from "./KamisadoMove";
import { KamisadoPiece } from "../KamisadoPiece";

describe('KamisadoMove', () => {

    it('should toString in a readable way', () => {
        expect((new KamisadoMove(new Coord(0, 0), new Coord(1, 5))).toString()).toEqual("KamisadoMove((0, 0)->(1, 5))");
        expect(KamisadoMove.PASS.toString()).toEqual("KamisadoMove(PASS)");
    });
    it('should correctly encode and decode all moves', () => {
        for (let y1 = 0; y1 < KamisadoBoard.SIZE; y1++) {
            for (let x1 = 0; x1 < KamisadoBoard.SIZE; x1++) {
                const startCoord: Coord = new Coord(x1, y1);
                for (let y2 = 0; y2 < KamisadoBoard.SIZE; y2++) {
                    for (let x2 = 0; x2 < KamisadoBoard.SIZE; x2++) {
                        if (x2 != x1 || y2 != y1) {
                            const endCoord: Coord = new Coord(x2, y2);
                            const move: KamisadoMove = new KamisadoMove(startCoord, endCoord);
                            const encodedMove: number = move.encode();
                            const decodedMove: KamisadoMove = KamisadoMove.decode(encodedMove);
                            expect(decodedMove).toEqual(move);
                        }
                    }
                }
            }
        }
    });
    it('should correctly encode and decode PASS', () => {
        const encodedMove: number = KamisadoMove.PASS.encode();
        const decodedMove: KamisadoMove = KamisadoMove.decode(encodedMove);
        expect(decodedMove).toEqual(KamisadoMove.PASS);
    });
    it('should delegate decoding to static method', () => {
        const testMove: KamisadoMove = new KamisadoMove(new Coord(0, 0), new Coord(1, 1));
        spyOn(KamisadoMove, "decode").and.callThrough();
        testMove.decode(testMove.encode());
        expect(KamisadoMove.decode).toHaveBeenCalledTimes(1);
    });
    it("should force move to start and end inside the board", () => {
        expect(() => new KamisadoMove(new Coord(-1, 2), new Coord(2, 2))).toThrowError();
        expect(() => new KamisadoMove(new Coord(0, 0), new Coord(-1, -1))).toThrowError();
        expect(() => new KamisadoMove(new Coord(0, 0), new Coord(9, 9))).toThrowError();
        expect(() => new KamisadoMove(new Coord(8, 5), new Coord(5, 5))).toThrowError();

    });
    it('should override correctly equality', () => {
        const move: KamisadoMove = new KamisadoMove(new Coord(2, 2), new Coord(3, 3));
        const sameMove: KamisadoMove = new KamisadoMove(new Coord(2, 2), new Coord(3, 3));
        const moveAsObject: Object = {
            start: new Coord(2, 2),
            end: new Coord(3, 3)
        };
        const neighboor: KamisadoMove = new KamisadoMove(new Coord(3, 3), new Coord(2, 2));
        const stranger: KamisadoMove = new KamisadoMove(new Coord(5, 5), new Coord(6, 5));
        expect(move.equals(move)).toBeTruthy("Move should equals himself");
        expect(move.equals(moveAsObject)).toBeFalsy("Instance should be checked");
        expect(move.equals(sameMove)).toBeTruthy("Move should be equals");
        expect(move.equals(neighboor)).toBeFalsy("Different move should be different");
        expect(move.equals(stranger)).toBeFalsy("Different move should be different");
    });
});
