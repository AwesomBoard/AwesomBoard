import { GroupData } from 'src/app/jscaip/BoardData';
import { Coord } from 'src/app/jscaip/Coord';
import { MGPMap, Utils } from '@everyboard/lib';
import { GoPiece } from './GoPiece';

export class GoGroupData extends GroupData<GoPiece> {

    public constructor(color: GoPiece,
                       public emptyCoords: Coord[],
                       public darkCoords: Coord[],
                       public lightCoords: Coord[],
                       public deadDarkCoords: Coord[],
                       public deadLightCoords: Coord[],
                       public unreachableCoords: Coord[])
    {
        super(color);
    }

    public getCoords(): Coord[] {
        if (this.color === GoPiece.DARK) {
            return this.darkCoords;
        } else if (this.color === GoPiece.LIGHT) {
            return this.lightCoords;
        } else if (this.color === GoPiece.DEAD_DARK) {
            return this.deadDarkCoords;
        } else if (this.color === GoPiece.DEAD_LIGHT) {
            return this.deadLightCoords;
        } else {
            return this.emptyCoords;
        }
    }

    public contains(coord: Coord): boolean {
        const allCoords: Coord[] = this.darkCoords
            .concat(this.lightCoords)
            .concat(this.emptyCoords)
            .concat(this.deadDarkCoords)
            .concat(this.deadLightCoords)
            .concat(this.unreachableCoords);
        return allCoords.some((c: Coord) => c.equals(coord));
    }

    public addPawn(coord: Coord, color: GoPiece): void {
        Utils.assert(this.contains(coord) === false, 'This group already contains ' + coord.toString());

        switch (color) {
            case GoPiece.DARK:
                this.darkCoords = GroupData.insert(this.darkCoords, coord);
                break;
            case GoPiece.LIGHT:
                this.lightCoords = GroupData.insert(this.lightCoords, coord);
                break;
            case GoPiece.DEAD_DARK:
                this.deadDarkCoords = GroupData.insert(this.deadDarkCoords, coord);
                break;
            case GoPiece.DEAD_LIGHT:
                this.deadLightCoords = GroupData.insert(this.deadLightCoords, coord);
                break;
            case GoPiece.UNREACHABLE:
                this.unreachableCoords = GroupData.insert(this.unreachableCoords, coord);
                break;
            default:
                Utils.expectToBeMultiple(color, [
                    GoPiece.EMPTY,
                    GoPiece.DARK_TERRITORY,
                    GoPiece.LIGHT_TERRITORY,
                ]);
                this.emptyCoords = GroupData.insert(this.emptyCoords, coord);
        }
    }

    public isMonoWrapped(): boolean {
        // If a group is empty, we assign him 1, else 2
        // If only the group of the group and the group of its wrapper are filled, result will be 2*2*1
        const darkWrapper: number = (this.darkCoords.length + this.deadLightCoords.length) === 0 ? 0 : 1;
        const lightWrapper: number = (this.lightCoords.length + this.deadDarkCoords.length) === 0 ? 0 : 1;
        return darkWrapper + lightWrapper === 1;
    }

    public getWrapper(): GoPiece {
        // If a piece is wrapped by a player and/or by dead piece of their opponent, it's returning the player
        // If a piece is wrapped by two player, it's throwing
        // If a piece is wrapped by a player and dead piece of this player, it's throwing
        // color, [empty, dark, light, deadDark, deadLight]
        // empty, [ 0(2),    0,     4,        2,         0] => LIGHT
        // empty, [ 0(2),    2,     2,        0,         0] => throw
        // empty, [ 0(2),    0,     0,        6,         0] => LIGHT
        const wrapperSizes: MGPMap<GoPiece, number> = new MGPMap();
        wrapperSizes.set(GoPiece.EMPTY, this.emptyCoords.length);
        wrapperSizes.set(GoPiece.DARK, this.darkCoords.length + this.deadLightCoords.length);
        wrapperSizes.set(GoPiece.LIGHT, this.lightCoords.length + this.deadDarkCoords.length);
        wrapperSizes.put(this.color.nonTerritory(), 0);
        const nonEmptyWrapper: MGPMap<GoPiece, number> =
            wrapperSizes.filter((_key: GoPiece, value: number) => value > 0);
        Utils.assert(nonEmptyWrapper.size() === 1,
                     `Can't call getWrapper on non-mono-wrapped group`);
        return nonEmptyWrapper.getAnyPair().get().key;
    }

    public getNeighborsEntryPoints(): Coord[] {
        const neighborsEntryPoints: Coord[] = [];
        if (this.color !== GoPiece.EMPTY && this.emptyCoords.length > 0) {
            neighborsEntryPoints.push(this.emptyCoords[0]);
        }
        if (this.color !== GoPiece.DARK && this.darkCoords.length > 0) {
            neighborsEntryPoints.push(this.darkCoords[0]);
        }
        if (this.color !== GoPiece.LIGHT && this.lightCoords.length > 0) {
            neighborsEntryPoints.push(this.lightCoords[0]);
        }
        if (this.color !== GoPiece.DEAD_DARK && this.deadDarkCoords.length > 0) {
            neighborsEntryPoints.push(this.deadDarkCoords[0]);
        }
        if (this.color !== GoPiece.DEAD_LIGHT && this.deadLightCoords.length > 0) {
            neighborsEntryPoints.push(this.deadLightCoords[0]);
        }
        return neighborsEntryPoints;
    }

}
