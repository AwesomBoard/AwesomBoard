/* eslint-disable max-lines-per-function */
import { JSONValue, MGPFallible } from '@everyboard/lib';
import { Coord } from 'src/app/jscaip/Coord';
import { CheckersMove } from '../CheckersMove';
import { CheckersFailure } from '../CheckersFailure';

describe('CheckersMove', () => {

    describe('Move', () => {

        it('should allow simple step', () => {
            // When trying to create a simple move
            const move: CheckersMove = CheckersMove.fromStep(new Coord(0, 0), new Coord(1, 1));

            // Then it should succeed
            expect(move).toBeTruthy();
        });

    });

    describe('Capture', () => {

        it('should forbid to pass over the same coord several times', () => {
            // When trying to create a capture that passes twice over the same Coord
            const coords: Coord[] = [new Coord(0, 0), new Coord(2, 2), new Coord(0, 0)];
            const move: MGPFallible<CheckersMove> = CheckersMove.fromCapture(coords);

            // Then it should fail
            expect(move).toEqual(MGPFallible.failure(CheckersFailure.CANNOT_CAPTURE_TWICE_THE_SAME_COORD()));
        });

        it('should allow simple capture', () => {
            // When trying to create a simple move
            const move: MGPFallible<CheckersMove> = CheckersMove.fromCapture([new Coord(0, 0), new Coord(2, 2)]);

            // Then it should succeed
            expect(move.isSuccess()).toBeTrue();
        });

        it('should allow complexe capture', () => {
            // When trying to create a simple move
            const captures: Coord[] = [new Coord(0, 0), new Coord(3, 3), new Coord(1, 5)];
            const move: MGPFallible<CheckersMove> = CheckersMove.fromCapture(captures);

            // Then it should succeed
            expect(move.isSuccess()).toBeTrue();
        });

        it('should allow "frisian-capture"', () => {
            // When trying to create a frisian capture
            const move: MGPFallible<CheckersMove> = CheckersMove.fromCapture([new Coord(0, 0), new Coord(0, 4)]);

            // Then it should succeed
            expect(move.isSuccess()).toBeTrue();
        });

    });

    describe('Encoder', () => {

        it('should encode steps', () => {
            // Given a step
            const move: CheckersMove = CheckersMove.fromStep(new Coord(0, 0), new Coord(1, 1));

            // When encoding it then decoding the result
            const encoded: JSONValue = CheckersMove.encoder.encode(move);
            const decoded: CheckersMove = CheckersMove.encoder.decode(encoded);

            // Then the decoded value should be the original value
            expect(decoded).toEqual(move);
        });

        it('should encode captures', () => {
            // Given a capture
            const steppedCoords: Coord[] = [new Coord(0, 0), new Coord(2, 2), new Coord(0, 4)];
            const move: CheckersMove = CheckersMove.fromCapture(steppedCoords).get();

            // When encoding it then decoding the result
            const encoded: JSONValue = CheckersMove.encoder.encode(move);
            const decoded: CheckersMove = CheckersMove.encoder.decode(encoded);

            // Then the decoded value should be the original value
            expect(decoded).toEqual(move);
        });

    });

    describe('equals', () => {

        it('should see as equal identical moves', () => {
            // Given two identical moves
            const first: CheckersMove = CheckersMove.fromStep(new Coord(2, 2), new Coord(3, 3));
            const second: CheckersMove = CheckersMove.fromStep(new Coord(2, 2), new Coord(3, 3));

            // When comparing them
            // Then the result should be true
            expect(first.equals(second)).toBeTrue();
        });

        it('should see as unequal different moves', () => {
            // Given two different moves
            const first: CheckersMove = CheckersMove.fromStep(new Coord(2, 2), new Coord(3, 3));
            const second: CheckersMove = CheckersMove.fromStep(new Coord(0, 4), new Coord(1, 5));

            // When comparing them
            // Then the result should be false
            expect(first.equals(second)).toBeFalse();
        });

    });

    describe('isPrefix', () => {

        it('should see as prefix move that is the same without the ending captures', () => {
            // Given one capture and a second one identical but without the last capture
            const captures: Coord[] = [new Coord(2, 2), new Coord(4, 4), new Coord(6, 6)];
            const long: CheckersMove = CheckersMove.fromCapture(captures).get();
            const short: CheckersMove = CheckersMove.fromCapture([new Coord(2, 2), new Coord(4, 4)]).get();

            // When calling isPrefix on one and passing the other
            // Then the result should be true
            expect(long.isPrefix(short)).toBeTrue();
            expect(short.isPrefix(long)).toBeTrue();
        });

        it('should not consider equal move as prefix to each others', () => {
            // Given two different moves
            const first: CheckersMove = CheckersMove.fromCapture([new Coord(2, 2), new Coord(4, 4)]).get();
            const second: CheckersMove = CheckersMove.fromCapture([new Coord(2, 2), new Coord(4, 4)]).get();

            // When calling isPrefix on them
            // Then the result should be false
            expect(first.isPrefix(second)).toBeFalse();
        });

    });

    describe('getStartingCoord', () => {

        it('should return the first coord', () => {
            // Given any move
            const move: CheckersMove = CheckersMove.fromCapture([new Coord(2, 2), new Coord(4, 4)]).get();

            // When calling getStartingCoord
            const startingCoord: Coord = move.getStartingCoord();

            // Then it should return first coord
            expect(startingCoord.equals(move.coords.get(0))).toBeTrue();
        });

    });

    describe('getEndingCoord', () => {

        it('should return the last coord', () => {
            // Given any move
            const move: CheckersMove = CheckersMove.fromCapture([new Coord(2, 2), new Coord(4, 4)]).get();

            // When calling getEndingCoord
            const endingCoord: Coord = move.getEndingCoord();

            // Then it should return last coord
            expect(endingCoord.equals(move.coords.get(1))).toBeTrue();
        });

    });

    describe('getSteppedOverCoords', () => {

        it('should return the coords between move.coords', () => {
            // Given a capture
            const move: CheckersMove = CheckersMove.fromCapture([new Coord(2, 2), new Coord(4, 4)]).get();

            // When calling getSteppedOverCoords
            const steppedOverCoords: Coord[] = move.getSteppedOverCoords().get().toList();

            // Then we should get the list of coords stepped over
            expect(steppedOverCoords).toEqual([new Coord(2, 2), new Coord(3, 3), new Coord(4, 4)]);
        });

    });

    describe('concatenate', () => {

        it('should concatenate moves and return a new one', () => {
            // Given two moves, the second starting where the first ends
            const start: CheckersMove = CheckersMove.fromCapture([new Coord(0, 0), new Coord(2, 2)]).get();
            const end: CheckersMove = CheckersMove.fromCapture([new Coord(2, 2), new Coord(4, 4)]).get();

            // When concatenating them
            const concatenated: CheckersMove = start.concatenate(end).get();

            // Then the concatenated move should have all the coords
            const coords: Coord[] = [
                new Coord(0, 0),
                new Coord(2, 2),
                new Coord(4, 4),
            ];
            const expected: CheckersMove = CheckersMove.fromCapture(coords).get();
            expect(concatenated.equals(expected)).toBeTrue();
        });

    });

    describe('toString', () => {

        it('should stringify as a coord list', () => {
            // Given any move
            const move: CheckersMove = CheckersMove.fromCapture([new Coord(0, 0), new Coord(2, 2)]).get();

            // When stringifying it
            const stringification: string = move.toString();

            // Then it should look like this
            expect(stringification).toBe('CheckersMove((0, 0), (2, 2))');
        });

    });

});
