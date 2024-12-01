import { ChangeDetectorRef, Component } from '@angular/core';
import { MGPOptional, MGPValidation } from '@everyboard/lib';

import { HexagonalGameComponent } from 'src/app/components/game-components/game-component/HexagonalGameComponent';
import { Coord } from 'src/app/jscaip/Coord';
import { FourStatePiece } from 'src/app/jscaip/FourStatePiece';
import { HexaLayout } from 'src/app/jscaip/HexaLayout';
import { PointyHexaOrientation } from 'src/app/jscaip/HexaOrientation';
import { PlayerOrNone } from 'src/app/jscaip/Player';
import { MessageDisplayer } from 'src/app/services/MessageDisplayer';
import { MCTS } from 'src/app/jscaip/AI/MCTS';
import { HexodiaConfig, HexodiaRules } from './HexodiaRules';
import { HexodiaMove } from './HexodiaMove';
import { HexodiaState } from './HexodiaState';
import { HexodiaAlignmentMinimax } from './HexodiaAlignmentMinimax';
import { HexodiaMoveGenerator } from './HexodiaMoveGenerator';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { ViewBox } from 'src/app/components/game-components/GameComponentUtils';

@Component({
    selector: 'app-hexodia',
    templateUrl: './hexodia.component.html',
    styleUrls: ['../../components/game-components/game-component/game-component.scss'],
})
export class HexodiaComponent extends HexagonalGameComponent<HexodiaRules,
                                                             HexodiaMove,
                                                             HexodiaState,
                                                             FourStatePiece,
                                                             HexodiaConfig>
{
    public droppedCoords: Coord[] = [];

    public lastMoved: Coord[] = [];

    public victoryCoords: Coord[] = [];

    public constructor(messageDisplayer: MessageDisplayer, cdr: ChangeDetectorRef) {
        super(messageDisplayer, cdr);
        this.setRulesAndNode('Hexodia');
        this.availableAIs = [
            new HexodiaAlignmentMinimax(),
            new MCTS($localize`MCTS`,
                     new HexodiaMoveGenerator(),
                     this.rules),
        ];
        this.encoder = HexodiaMove.encoder;
        this.SPACE_SIZE = 30;
        this.setHexaLayout();
    }

    private setHexaLayout(): void {
        const halfStroke: number = this.STROKE_WIDTH / 2;
        const configSize: number = Math.floor(this.getState().getWidth() / 2);
        const hexaLayoutStartX: number =
            (- halfStroke * 0.5 * (configSize + 1)) + (Math.sqrt(2) * this.SPACE_SIZE);
        const hexaLayoutStartY: number = this.SPACE_SIZE + halfStroke;
        const hexaLayoutStartingCoord: Coord = new Coord(hexaLayoutStartX, hexaLayoutStartY);
        this.hexaLayout = new HexaLayout(this.SPACE_SIZE,
                                         hexaLayoutStartingCoord,
                                         PointyHexaOrientation.INSTANCE);
    }

    public getViewBox(): ViewBox {
        const abstractSize: number = this.getState().getWidth();
        const pieceSize: number = this.SPACE_SIZE * 1.5;
        const size: number = (this.SPACE_SIZE * 0.5) + (abstractSize * pieceSize);
        const configSize: number = Math.floor(abstractSize / 2);
        const halfStroke: number = this.STROKE_WIDTH / 2;
        const left: number = ((configSize - 1) * (this.SPACE_SIZE - halfStroke)) - (1.25 * this.STROKE_WIDTH);
        const width: number = size + (1.75 * configSize * this.STROKE_WIDTH);
        const height: number = size + this.STROKE_WIDTH;
        return new ViewBox(left, 0, width, height);
    }

    public async updateBoard(_triggerAnimation: boolean): Promise<void> {
        const state: HexodiaState = this.getState();
        this.hexaBoard = state.getCopiedBoard();
        const config: MGPOptional<HexodiaConfig> = this.getConfig();
        this.victoryCoords = HexodiaRules.getVictoriousCoords(state, config);
    }

    public override async showLastMove(move: HexodiaMove): Promise<void> {
        this.lastMoved = move.coords.toList();
    }

    public override hideLastMove(): void {
        this.lastMoved = [];
    }

    public async onClick(clickedCoord: Coord): Promise<MGPValidation> {
        const clickValidity: MGPValidation = await this.canUserPlay('#click-' + clickedCoord.x + '-' + clickedCoord.y);
        if (clickValidity.isFailure()) {
            return this.cancelMove(clickValidity.getReason());
        }
        const totalDrop: number = this.getConfig().get().numberOfDrops;
        if (this.getState().turn === 0) {
            const move: HexodiaMove = HexodiaMove.of([clickedCoord]);
            return this.chooseMove(move);
        } else {
            if (this.getState().getPieceAt(clickedCoord).isPlayer()) {
                return this.cancelMove(RulesFailure.MUST_CLICK_ON_EMPTY_SQUARE());
            } else if (this.droppedCoords.some((c: Coord) => c.equals(clickedCoord))) {
                return this.cancelMove();
            } else {
                this.droppedCoords = this.droppedCoords.concat(clickedCoord);
                if (this.droppedCoords.length === totalDrop) {
                    const move: HexodiaMove = HexodiaMove.of(this.droppedCoords);
                    return this.chooseMove(move);
                } else {
                    return MGPValidation.SUCCESS;
                }
            }
        }
    }

    public getSquareClassesAt(coord: Coord): string[] {
        const owner: PlayerOrNone = this.getState().getPieceAt(coord).getPlayer();
        const classes: string[] = [];
        classes.push(this.getPlayerClass(owner));
        if (this.victoryCoords.some((c: Coord) => c.equals(coord))) {
            classes.push('victory-stroke');
        }
        if (this.lastMoved.some((c: Coord) => c.equals(coord))) {
            classes.push('last-move-stroke');
        }
        return classes;
    }

    public override cancelMoveAttempt(): void {
        this.droppedCoords = [];
    }

    public isReachable(piece: FourStatePiece): boolean {
        return piece.isReachable();
    }

}
