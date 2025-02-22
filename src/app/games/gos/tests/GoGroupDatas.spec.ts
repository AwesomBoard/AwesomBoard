/* eslint-disable max-lines-per-function */
import { Utils, TestUtils } from '@everyboard/lib';
import { GoPiece } from '../GoPiece';
import { Coord } from 'src/app/jscaip/Coord';
import { GoGroupData } from 'src/app/games/gos/GoGroupsData';
import { ErrorLoggerServiceMock } from 'src/app/services/tests/ErrorLoggerServiceMock.spec';
import { fakeAsync } from '@angular/core/testing';

describe('GoGroupData', () => {

    const coord: Coord = new Coord(0, 0);

    // dead wrapping => that wrapping alive opposite
    // dead wrapping and its opposite => that opposing
    // two alive wrapping => error

    it('should throw when getWrapped is called on a multi wrapped group', () => {
        const group: GoGroupData = new GoGroupData(GoPiece.EMPTY,
                                                   [coord, coord],
                                                   [coord, coord],
                                                   [coord, coord],
                                                   [],
                                                   [],
                                                   []);
        TestUtils.expectToThrowAndLog(
            () => group.getWrapper(),
            `Can't call getWrapper on non-mono-wrapped group`,
        );
    });

    it('should throw when addPawn is called two times with the same coord', fakeAsync(() => {
        // Given any GoGroupData containing "coord" already
        const group: GoGroupData = new GoGroupData(GoPiece.EMPTY, [], [], [], [], [], []);
        group.addPawn(coord, GoPiece.DARK);

        // When adding the coord again
        // Then it should throw
        const expectedError: string = 'This group already contains (0, 0)';
        spyOn(Utils, 'logError').and.callFake(ErrorLoggerServiceMock.logError);
        expect(() => group.addPawn(coord, GoPiece.DARK)).toThrowError('Assertion failure: ' + expectedError);
    }));

    it('should not throw when getWrapped is called on a multi wrapped group where one is the alive opposite of the other', () => {
        const group: GoGroupData = new GoGroupData(GoPiece.EMPTY,
                                                   [coord, coord],
                                                   [],
                                                   [coord, coord],
                                                   [coord, coord],
                                                   [],
                                                   []);
        expect(group.getWrapper()).toEqual(GoPiece.LIGHT);
    });

    it('should return the mono wrapper when alive', () => {
        const group: GoGroupData = new GoGroupData(GoPiece.EMPTY, [coord], [coord, coord], [], [], [], []);
        expect(group.getWrapper()).toEqual(GoPiece.DARK);
    });

    it('should return the alive version of the monowrapper when dead', () => {
        const deadWrapper: GoGroupData = new GoGroupData(GoPiece.EMPTY,
                                                         [coord],
                                                         [coord, coord],
                                                         [],
                                                         [],
                                                         [coord, coord],
                                                         []);
        expect(deadWrapper.getWrapper()).toEqual(GoPiece.DARK);
    });

    it('should count territory as empty', () => {
        const group: GoGroupData = new GoGroupData(GoPiece.DARK_TERRITORY, [coord], [coord, coord], [], [], [], []);
        expect(group.getWrapper()).toEqual(GoPiece.DARK);
    });

    describe('getNeighborsEntryPoint', () => {

        it('should give entry points for each neighbor groups', () => {
            // Given a group with all kind of neighbors
            const group: GoGroupData = new GoGroupData(GoPiece.DARK_TERRITORY,
                                                       [coord],
                                                       [],
                                                       [coord],
                                                       [coord],
                                                       [coord],
                                                       []);
            // When asking for neighbors entry points
            const neighborsEntryPoint: Coord[] = group.getNeighborsEntryPoints();

            // Then the four entry coords should be there
            expect(neighborsEntryPoint.length).toBe(4);
        });

    });

});
