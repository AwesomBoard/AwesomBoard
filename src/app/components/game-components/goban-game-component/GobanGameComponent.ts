import { Comparable } from '@everyboard/lib';

import { Move } from '../../../jscaip/Move';
import { Component } from '@angular/core';
import { GameStateWithTable } from 'src/app/jscaip/state/GameStateWithTable';
import { SuperRules } from 'src/app/jscaip/Rules';
import { RectangularGameComponent } from '../rectangular-game-component/RectangularGameComponent';
import { Coord } from 'src/app/jscaip/Coord';
import { GobanConfig } from 'src/app/jscaip/GobanConfig';
import { GobanUtils } from 'src/app/jscaip/GobanUtils';

/**
 * This component is used for games that are played on a Goban.
 * It helps displaying hoshis.
 */
@Component({
    template: '',
})
export abstract class GobanGameComponent<R extends SuperRules<M, S, C, L>,
                                         M extends Move,
                                         S extends GameStateWithTable<P>,
                                         P extends NonNullable<Comparable>,
                                         C extends GobanConfig = GobanConfig,
                                         L = void>
    extends RectangularGameComponent<R, M, S, P, C, L>
{

    public hoshis: Coord[] = [];
    /**
     * Creates the hoshis, filling in the `hoshis` field with the hoshis based on the board size.
     * Must be called after `this.board` has been set, usually in `updateBoard`.
     */
    public createHoshis(): void {
        const height: number = this.getHeight();
        const width: number = this.getWidth();
        this.hoshis = GobanUtils.getHoshis(width, height);
    }

}
