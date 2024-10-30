import { AfterContentChecked, Component, Input } from '@angular/core';
import { BaseGameComponent } from 'src/app/components/game-components/game-component/GameComponent';
import { Coord } from 'src/app/jscaip/Coord';
import { HexaLayout } from 'src/app/jscaip/HexaLayout';
import { HivePiece } from './HivePiece';

@Component({
    selector: '[app-hive-piece]',
    templateUrl: './hive-piece.component.svg',
    styleUrls: ['../../components/game-components/game-component/game-component.scss'],
})
export class HivePieceComponent extends BaseGameComponent implements AfterContentChecked {

    @Input() piece: HivePiece;
    @Input() x: number;
    @Input() y: number;
    @Input() hexaLayout: HexaLayout;
    @Input() layer: number;
    @Input() pieceHeight: number;

    public hexaPoints: string = '';
    public pieceClass: string = '';
    public isoPointsLight: string = '';
    public isoPointsDark: string = '';
    public isoPointsStroke: string = '';
    public layerTransform: string = '';
    public hexaCenter: Coord = new Coord(0, 0);

    public ngAfterContentChecked(): void {
        // This needs to be done after every content check,
        // otherwise modifications to selected will not be properly propagated
        const coord: Coord = new Coord(this.x, this.y);
        this.pieceClass = this.getPlayerClass(this.piece.owner);
        this.hexaPoints = this.hexaLayout.getHexaPoints();
        this.hexaCenter = new Coord(0, 0);
        const isoPoints: [Coord[], Coord[], Coord[]] = this.hexaLayout.getIsoPoints(coord, this.pieceHeight);
        const isoPointsSVG: string[] = isoPoints.map((coords: Coord[]) =>
            coords.map((c: Coord) => c.toSVGPoint()).join(' '));
        this.isoPointsLight = isoPointsSVG[0];
        this.isoPointsDark = isoPointsSVG[1];
        this.isoPointsStroke = isoPointsSVG[2];
        this.layerTransform = this.getSVGTranslation(0, -(this.layer + 1) * this.pieceHeight);
    }

}
