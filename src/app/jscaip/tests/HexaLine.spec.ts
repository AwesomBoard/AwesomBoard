/* eslint-disable max-lines-per-function */
import { MGPOptional } from '@everyboard/lib';
import { Coord } from '../Coord';
import { HexaDirection } from '../HexaDirection';
import { HexaLine } from '../HexaLine';

describe('HexaLine', () => {

    describe('fromTwoCoords', () => {
        it('should create a line from two coordinates', () => {
            const line1: MGPOptional<HexaLine> = HexaLine.fromTwoCoords(new Coord(0, 3), new Coord(0, 4));
            expect(line1.isPresent()).toBeTrue();
            expect(line1.get()).toEqual(HexaLine.constantQ(0));
            const line2: MGPOptional<HexaLine> = HexaLine.fromTwoCoords(new Coord(0, 5), new Coord(0, 6));
            expect(line2.isPresent()).toBeTrue();
            expect(line1.get()).toEqual(line2.get());
        });
        it('should not create invalid lines', () => {
            const line: MGPOptional<HexaLine> = HexaLine.fromTwoCoords(new Coord(0, 4), new Coord(2, 3));
            expect(line.isPresent()).toBeFalse();
        });
        it('should not create a line if the two coordinates are the same', () => {
            const line: MGPOptional<HexaLine> = HexaLine.fromTwoCoords(new Coord(0, 4), new Coord(0, 4));
            expect(line.isPresent()).toBeFalse();
        });
    });
    describe('areOnSameLine', () => {
        it('should consider a single coord to be on the same line as itself', () => {
            expect(HexaLine.areOnSameLine([new Coord(3, 0)])).toBeTrue();
        });
        it('should detect when coords are on the same line', () => {
            const coords: Coord[] = [new Coord(3, 0), new Coord(3, 2), new Coord(3, 5), new Coord(3, 5)];
            expect(HexaLine.areOnSameLine(coords)).toBeTrue();
        });
        it('should detect when coords are not on the same line', () => {
            const coords: Coord[] = [new Coord(3, 0), new Coord(3, 2), new Coord(4, 5), new Coord(3, 4)];
            expect(HexaLine.areOnSameLine(coords)).toBeFalse();

            const coords2: Coord[] = [new Coord(3, 0), new Coord(4, 5), new Coord(3, 2), new Coord(3, 4)];
            expect(HexaLine.areOnSameLine(coords2)).toBeFalse();
        });
    });
    describe('contains', () => {
        it('should detect when a coordinate is contained in a line', () => {
            const line: HexaLine = HexaLine.constantQ(0);
            const coord: Coord = new Coord(0, 6);
            expect(line.contains(coord)).toBeTrue();
        });
        it('should detect when a coordinate is not contained in a line', () => {
            const line: HexaLine = HexaLine.constantQ(0);
            const coord: Coord = new Coord(1, 5);
            expect(line.contains(coord)).toBeFalse();
        });
    });
    describe('getDirection', () => {
        it('should consider lines with constant q going down', () => {
            expect(HexaLine.constantQ(0).getDirection()).toEqual(HexaDirection.DOWN);
        });
        it('should consider lines with constant r going down right', () => {
            expect(HexaLine.constantR(0).getDirection()).toEqual(HexaDirection.RIGHT);
        });
        it('should consider lines with constant s going down left', () => {
            expect(HexaLine.constantS(0).getDirection()).toEqual(HexaDirection.DOWN_LEFT);
        });
    });
    describe('equals', () => {
        it('should consider a line equal to itself', () => {
            const line: HexaLine = HexaLine.constantQ(3);
            expect(line.equals(line)).toBeTrue();
        });
        it('should consider a line equal to the same line', () => {
            expect(HexaLine.constantQ(3).equals(HexaLine.constantQ(3))).toBeTrue();
        });
        it('should consider lines different due to different offset', () => {
            expect(HexaLine.constantQ(3).equals(HexaLine.constantQ(4))).toBeFalse();
        });
        it('should consider lines different due to different constant', () => {
            expect(HexaLine.constantQ(3).equals(HexaLine.constantR(3))).toBeFalse();
        });
    });

});

