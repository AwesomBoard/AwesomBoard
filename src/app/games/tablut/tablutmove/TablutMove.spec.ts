import { TablutRules } from "../tablutrules/TablutRules";
import { TablutMove } from "./TablutMove";
import { MGPMap } from "src/app/collectionlib/mgpmap/MGPMap";
import { TablutPartSlice } from "../TablutPartSlice";
import { INCLUDE_VERBOSE_LINE_IN_TEST } from "src/app/app.module";
import { Coord } from "src/app/jscaip/Coord";

describe('TablutMove', () => {

    beforeAll(() => {
        TablutRules.VERBOSE = INCLUDE_VERBOSE_LINE_IN_TEST || TablutRules.VERBOSE;
    });
    it('TablutMove.encode and TablutMove.decode should be reversible', () => {
        const rules: TablutRules = new TablutRules();
        const firstTurnMoves: MGPMap<TablutMove, TablutPartSlice> = rules.getListMoves(rules.node);
        for (let i = 0; i < firstTurnMoves.size(); i++) {
            const move: TablutMove = firstTurnMoves.getByIndex(i).key;
            const encodedMove: number = move.encode();
            const decodedMove: TablutMove = TablutMove.decode(encodedMove);
            expect(decodedMove).toEqual(move);
        }
    });
    it("TablutMove creation, as a MoveCoordToCoord, should throw when created immobile", () => {
        expect(() => new TablutMove(new Coord(0, 0), new Coord(0, 0))).toThrowError("MoveCoordToCoord cannot be static");
    });
    it("TablutMove must throw if created non-orthogonally", () => {
        expect(() => new TablutMove(new Coord(0, 0), new Coord(1, 1))).toThrowError("TablutMove cannot be diagonal");
    });
});