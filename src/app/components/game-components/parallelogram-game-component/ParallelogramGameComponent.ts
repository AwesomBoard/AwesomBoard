import { Component } from '@angular/core';
import { RectangularGameComponent } from '../rectangular-game-component/RectangularGameComponent';
import { SuperRules } from 'src/app/jscaip/Rules';
import { Move } from 'src/app/jscaip/Move';
import { GameStateWithTable } from 'src/app/jscaip/state/GameStateWithTable';
import { Coord } from 'src/app/jscaip/Coord';
import { EmptyRulesConfig, RulesConfig } from 'src/app/jscaip/RulesConfigUtil';

export interface ModeConfig {

    offsetRatio: number;

    horizontalWidthRatio: number;

    pieceHeightRatio: number;

    parallelogramHeight: number,

    abstractBoardWidth: number,

    abstractBoardHeight: number,
}

@Component({
    template: '',
})
export abstract class ParallelogramGameComponent<R extends SuperRules<M, S, C, L>,
                                                 M extends Move,
                                                 S extends GameStateWithTable<P>,
                                                 P extends NonNullable<unknown>,
                                                 C extends RulesConfig = EmptyRulesConfig,
                                                 L = void>
    extends RectangularGameComponent<R, M, S, P, C, L>
{
    public getParallelogramCoords(mode: ModeConfig): Coord[] {
        const parallelogramHeight: number = mode.parallelogramHeight;
        const parallelogramWidth: number = parallelogramHeight * mode.horizontalWidthRatio;
        const parallelogramOffset: number = parallelogramHeight * mode.offsetRatio;
        const x1: number = parallelogramWidth;
        const y1: number = 0;
        const x2: number = parallelogramWidth - parallelogramOffset;
        const y2: number = parallelogramHeight;
        const x3: number = - parallelogramOffset;
        const y3: number = parallelogramHeight;
        return [
            new Coord(0, 0),
            new Coord(x1, y1),
            new Coord(x2, y2),
            new Coord(x3, y3),
        ];
    }
    /**
     * @param x the x coord on the state of the piece to draw
     * @param y the y coord on the state of the piece to draw
     * @param z the z coord on the state of the piece to draw
     * @param mode the mode in which the component is to be drawn
     * @returns the coord(x, y) of the upper left parallelogram to draw on the SVG;
     */
    protected getCoordTranslation(x: number, y: number, z: number, mode: ModeConfig): Coord {
        const spaceHeight: number = mode.parallelogramHeight;
        const spaceWidth: number = spaceHeight * mode.horizontalWidthRatio;
        const spaceOffset: number = mode.offsetRatio * spaceHeight;
        const numberOfOffset: number = mode.abstractBoardHeight - y;
        const xBase: number = (x * spaceWidth) + (numberOfOffset * spaceOffset);
        const yBase: number = (y * spaceHeight) - (mode.pieceHeightRatio * spaceHeight * z);
        return new Coord(xBase, yBase);
    }
}
