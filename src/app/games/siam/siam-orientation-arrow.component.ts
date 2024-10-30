import { Component, EventEmitter, Input, Output } from '@angular/core';
import { BaseGameComponent } from 'src/app/components/game-components/game-component/GameComponent';
import { SiamMove } from './SiamMove';
import { Player } from 'src/app/jscaip/Player';
import { Orthogonal } from 'src/app/jscaip/Orthogonal';
import { Ordinal } from 'src/app/jscaip/Ordinal';
import { SiamConfig } from './SiamRules';
import { Coord } from 'src/app/jscaip/Coord';

@Component({
    selector: '[app-siam-orientation-arrow]',
    templateUrl: './siam-orientation-arrow.component.svg',
    styleUrls: ['../../components/game-components/game-component/game-component.scss'],
})
export class SiamOrientationArrowComponent extends BaseGameComponent {

    @Input() orientations: SiamMove[];
    @Input() currentPlayer: Player;
    @Input() config: SiamConfig;
    @Output() moveEmitter: EventEmitter<SiamMove> = new EventEmitter<SiamMove>();

    public getCurrentPlayerClass(): string {
        return this.getPlayerClass(this.currentPlayer);
    }

    public getOrientationTransform(orientation: Orthogonal): string {
        const config: SiamConfig = this.config;

        // Thoses are the calculation for a min size of 5
        const sizeRatio: number = Math.min(config.width, config.height) / 5;
        // Our arrow base needs a width of SPACE_SIZE, they currently have 40
        const arrowRatio: number = this.SPACE_SIZE / 40;
        const scaleValue: number = arrowRatio * sizeRatio;
        const cxAfterScale: number = 0.5 * scaleValue;
        let centralCoord: Coord = new Coord(config.width / 2, config.height / 2);
        centralCoord = centralCoord.getNext(Ordinal.LEFT, cxAfterScale);
        centralCoord = centralCoord.getNext(Ordinal.UP, cxAfterScale);
        centralCoord = centralCoord.getNext(orientation, scaleValue - sizeRatio);
        centralCoord = centralCoord.scale(this.SPACE_SIZE, this.SPACE_SIZE);

        const orientationDegrees: number = (orientation.toInt() - 2) * 90;
        const translation: string = this.getSVGTranslationAt(centralCoord);
        const scale: string = `scale(${ scaleValue })`;
        const rotation: string = `rotate(${orientationDegrees} ${this.SPACE_SIZE/2} ${this.SPACE_SIZE/2})`;
        return [translation, scale, rotation].join(' ');
    }

    public selectMove(move: SiamMove): void {
        this.moveEmitter.emit(move);
    }

}
