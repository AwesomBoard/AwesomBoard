/* eslint-disable max-lines-per-function */
import { CoordSet } from '../CoordSet';
import { Coord } from '../Coord';
import { PieceThreat, SandwichThreat } from '../PieceThreat';

describe('PieceThreat', () => {
    it('should define equality', () => {
        const threat: PieceThreat = new PieceThreat(
            new CoordSet(),
            new CoordSet([new Coord(1, 2)]),
        );
        const differentThreat: PieceThreat = new PieceThreat(new CoordSet([new Coord(2, 2)]),
                                                             new CoordSet([new Coord(1, 2)]));
        const otherDifferentThreat: PieceThreat = new PieceThreat(new CoordSet(),
                                                                  new CoordSet([new Coord(3, 2)]));
        expect(threat.equals(differentThreat)).toBeFalse();
        expect(threat.equals(otherDifferentThreat)).toBeFalse();
    });

});

describe('SandwichThreat', () => {
    it('should define equality', () => {
        const threat: SandwichThreat = new SandwichThreat(new Coord(2, 2), new CoordSet([new Coord(1, 2)]));
        const differentThreat: SandwichThreat = new SandwichThreat(
            new Coord(3, 2),
            new CoordSet([new Coord(1, 2)]),
        );

        const otherDifferentThreat: SandwichThreat = new SandwichThreat(
            new Coord(2, 2),
            new CoordSet([new Coord(3, 2)]),
        );
        expect(threat.equals(differentThreat)).toBeFalse();
        expect(threat.equals(otherDifferentThreat)).toBeFalse();
    });

});
