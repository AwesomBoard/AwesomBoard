import { Component } from '@angular/core';
import { Coord } from 'src/app/jscaip/Coord';
import { Move } from 'src/app/jscaip/Move';
import { GameComponent } from './GameComponent';
import { GameState } from 'src/app/jscaip/state/GameState';
import { Table } from 'src/app/jscaip/TableUtils';
import { SuperRules } from 'src/app/jscaip/Rules';
import { EmptyRulesConfig, RulesConfig } from 'src/app/jscaip/RulesConfigUtil';

@Component({ template: '' })
export abstract class TriangularGameComponent<R extends SuperRules<M, S, C, L>,
                                              M extends Move,
                                              S extends GameState,
                                              P,
                                              C extends RulesConfig = EmptyRulesConfig,
                                              L = void>
    extends GameComponent<R, M, S, C, L>
{
    public override SPACE_SIZE: number = 100;

    public board: Table<P>;

    protected getTriangleCornerCoordsAtXY(x: number, y: number): Coord[] {
        if ((x + y) % 2 === 0) {
            return this.getUpwardCoordinate();
        } else {
            return this.getDownwardCoordinate();
        }
    }

    public getTrianglePointsAt(coord: Coord): string {
        return this.getTrianglePointsAtXY(coord.x, coord.y);
    }

    public getTrianglePointsAtXY(x: number, y: number): string {
        const coords: Coord[] = this.getTriangleCornerCoordsAtXY(x, y);
        return this.mapCoordsToPoints(coords);
    }

    public getTriangleTranslationCoord(coord: Coord): Coord {
        const translationX: number = 0.5 * coord.x * this.SPACE_SIZE;
        const translationY: number = coord.y * this.SPACE_SIZE;
        return new Coord(translationX, translationY);
    }

    public getTriangleTranslationAt(coord: Coord): string {
        return this.getTriangleTranslationAtXY(coord.x, coord.y);
    }

    public getTriangleTranslationAtXY(x: number, y: number): string {
        const coord: Coord = new Coord(x, y);
        const translation: Coord = this.getTriangleTranslationCoord(coord);
        return this.getSVGTranslationAt(translation);
    }

    private getDownwardCoordinate(): Coord[] {
        const left: number = 0;
        const middle: number = this.SPACE_SIZE / 2;
        const right: number = this.SPACE_SIZE;
        const top: number = 0;
        const bottom: number = this.SPACE_SIZE;
        const leftCorner: Coord = new Coord(left, top);
        const middleCorner: Coord = new Coord(middle, bottom);
        const rightCorner: Coord = new Coord(right, top);
        return [leftCorner, middleCorner, rightCorner, leftCorner];
    }

    private getUpwardCoordinate(): Coord[] {
        const left: number = 0;
        const middle: number = this.SPACE_SIZE / 2;
        const right: number = this.SPACE_SIZE;
        const top: number = 0;
        const bottom: number = this.SPACE_SIZE;
        const leftCorner: Coord = new Coord(left, bottom);
        const middleCorner: Coord = new Coord(middle, top);
        const rightCorner: Coord = new Coord(right, bottom);
        return [leftCorner, middleCorner, rightCorner, leftCorner];
    }

    public getPyramidPointsAt(coord: Coord): string {
        return this.getPyramidPointsAtXY(coord.x, coord.y);
    }

    public getPyramidPointsAtXY(x: number, y: number): string {
        if ((x + y) % 2 === 1) {
            return this.getDownwardPyramidPoints();
        } else {
            return this.getUpwardPyramidPoints();
        }
    }

    private getDownwardPyramidCoords(): Coord[] {
        const width: number = this.SPACE_SIZE;
        const halfWidth: number = this.SPACE_SIZE / 2;
        const UP_LEFT: Coord = new Coord(0, 0);
        const UP_RIGHT: Coord = new Coord(width, 0);
        const DOWN_CENTER: Coord = new Coord(halfWidth, width);
        const CENTER: Coord = new Coord(halfWidth, halfWidth);
        return [
            UP_LEFT,
            DOWN_CENTER,
            CENTER,
            UP_LEFT,
            CENTER,
            UP_RIGHT,
            UP_LEFT,
            UP_RIGHT,
            DOWN_CENTER,
            CENTER,
            UP_RIGHT,
        ];
    }

    private getDownwardPyramidPoints(): string {
        const coords: Coord[] = this.getDownwardPyramidCoords();
        return this.mapCoordsToPoints(coords);
    }

    private mapCoordsToPoints(coords: Coord[]): string {
        return coords
            .map((coord: Coord) => coord.toSVGPoint())
            .join(', ');
    }

    private getUpwardPyramidCoords(): Coord[] {
        const halfWidth: number = this.SPACE_SIZE / 2;
        const width: number = this.SPACE_SIZE;
        const DOWN_LEFT: Coord = new Coord(0, width);
        const DOWN_RIGHT: Coord = new Coord(width, width);
        const UP_CENTER: Coord = new Coord(halfWidth, 0);
        const CENTER: Coord = new Coord(halfWidth, halfWidth);
        return [
            DOWN_LEFT,
            UP_CENTER,
            CENTER,
            DOWN_LEFT,
            CENTER,
            DOWN_RIGHT,
            DOWN_LEFT,
            DOWN_RIGHT,
            UP_CENTER,
            CENTER,
            DOWN_RIGHT,
        ];
    }

    private getUpwardPyramidPoints(): string {
        const coords: Coord[] = this.getUpwardPyramidCoords();
        return this.mapCoordsToPoints(coords);
    }

}
