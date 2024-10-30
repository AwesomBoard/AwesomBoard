import { ChangeDetectorRef, Component } from '@angular/core';
import { RectangularGameComponent } from 'src/app/components/game-components/rectangular-game-component/RectangularGameComponent';
import { Coord } from 'src/app/jscaip/Coord';
import { PlayerOrNone } from 'src/app/jscaip/Player';
import { MGPOptional, MGPValidation, Utils } from '@everyboard/lib';
import { PentagoMove } from './PentagoMove';
import { PentagoRules } from './PentagoRules';
import { PentagoState } from './PentagoState';
import { MessageDisplayer } from 'src/app/services/MessageDisplayer';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { GameStatus } from 'src/app/jscaip/GameStatus';
import { MCTS } from 'src/app/jscaip/AI/MCTS';
import { PentagoMoveGenerator } from './PentagoMoveGenerator';
import { ViewBox } from 'src/app/components/game-components/GameComponentUtils';
import { PentagoDummyMinimax } from './PentagoDummyMinimax';

interface ArrowInfo {
    path: string;
    coord: Coord;
    blockIndex: number;
    clockwise: boolean;
}

@Component({
    selector: 'app-pentago',
    templateUrl: './pentago.component.html',
    styleUrls: ['../../components/game-components/game-component/game-component.scss'],
})
export class PentagoComponent extends RectangularGameComponent<PentagoRules,
                                                               PentagoMove,
                                                               PentagoState,
                                                               PlayerOrNone>
{
    public readonly BLOCK_WIDTH: number;
    public readonly BLOCK_SEPARATION: number;
    public readonly PIECE_SEPARATION: number;
    public readonly DIAGONAL_BAR_OFFSET: number;
    public readonly ARROW_WIDTH: number;

    public arrows: ArrowInfo[] = [];
    public victoryCoords: Coord[] = [];
    public canSkipRotation: boolean;
    public currentDrop: MGPOptional<Coord> = MGPOptional.empty();

    public movedBlock: MGPOptional<number> = MGPOptional.empty();
    public lastDrop: MGPOptional<Coord> = MGPOptional.empty();
    public lastRotation: MGPOptional<ArrowInfo> = MGPOptional.empty();

    public ARROWS: ArrowInfo[];

    public constructor(messageDisplayer: MessageDisplayer, cdr: ChangeDetectorRef) {
        super(messageDisplayer, cdr);
        this.setRulesAndNode('Pentago');
        this.availableAIs = [
            new PentagoDummyMinimax(),
            new MCTS($localize`MCTS`, new PentagoMoveGenerator(), this.rules),
        ];
        this.encoder = PentagoMove.encoder;
        this.PIECE_SEPARATION = 4 * this.STROKE_WIDTH;
        const blockPadding: number = this.STROKE_WIDTH;
        this.BLOCK_WIDTH = (2 * blockPadding) + (3 * this.SPACE_SIZE) + (2 * this.PIECE_SEPARATION);
        this.BLOCK_SEPARATION = 2 * this.STROKE_WIDTH;
        this.DIAGONAL_BAR_OFFSET = Math.cos(Math.PI / 4) * 0.75 * this.SPACE_SIZE;
        this.ARROW_WIDTH = this.SPACE_SIZE + this.PIECE_SEPARATION;
        this.ARROWS = this.generateArrowsCoord();
    }

    public override getViewBox(): ViewBox {
        const stroke: number = 2 * this.STROKE_WIDTH + 75;
        return new ViewBox(
            0,
            0,
            2 * this.BLOCK_WIDTH + this.PIECE_SEPARATION,
            2 * this.BLOCK_WIDTH + this.PIECE_SEPARATION,
        ).expand(stroke + 8, stroke -8, stroke + 8, stroke - 8);
    }

    public getPieceTranslate(coord: Coord): string {
        let xTranslate: number = (this.SPACE_SIZE + this.PIECE_SEPARATION) * coord.x;
        let yTranslate: number = (this.SPACE_SIZE + this.PIECE_SEPARATION) * coord.y;
        xTranslate += this.STROKE_WIDTH;
        yTranslate += this.STROKE_WIDTH;
        return this.getSVGTranslation(xTranslate, yTranslate);
    }

    public async updateBoard(_triggerAnimation: boolean): Promise<void> {
        this.state = this.getState();
        this.victoryCoords = this.rules.getVictoryCoords(this.getState());
    }

    public override async showLastMove(move: PentagoMove): Promise<void> {
        this.movedBlock = move.blockTurned;
        const localCoord: Coord = new Coord(move.coord.x % 3 - 1, move.coord.y % 3 - 1);
        if (move.blockTurned.isPresent()) {
            this.showLastRotation(move);
            if (localCoord.equals(new Coord(0, 0)) === false && this.coordBelongToBlock(move)) {
                return this.showLastDrop(move, localCoord);
            }
        }
        this.lastDrop = MGPOptional.of(move.coord);
    }

    private showLastRotation(lastMove: PentagoMove): void {
        if (lastMove.blockTurned.isPresent()) {
            const blockIndex: number = lastMove.blockTurned.get();
            const lastArrow: ArrowInfo = this.ARROWS.filter((arrow: ArrowInfo) => {
                return arrow.blockIndex === blockIndex &&
                       arrow.clockwise === lastMove.turnedClockwise;
            })[0];
            this.lastRotation = MGPOptional.of(lastArrow);
        }
    }

    private showLastDrop(lastMove: PentagoMove, localCoord: Coord): void {
        // This half will calculate the new coordinate of last turn dropped coord
        // (which is encoded in its pre-rotation coord)
        // Note, this is a local coord for each 3x3 block, so a coord between (0, 0) and (2, 2)
        let postRotation: Coord;
        if (lastMove.turnedClockwise) {
            postRotation = Utils.getNonNullable(PentagoState.ROTATION_MAP.find((value: [Coord, Coord]) => {
                return value[0].equals(localCoord);
            }))[1];
        } else {
            postRotation = Utils.getNonNullable(PentagoState.ROTATION_MAP.find((value: [Coord, Coord]) => {
                return value[1].equals(localCoord);
            }))[0];
        }
        // This half translate this local coord to its final coord
        // so the central coord (1, 1) of the low-right block is moved in (1 + 4, 1 + 4)
        const turnedBlockIndex: number = lastMove.blockTurned.get();
        const cx: number = turnedBlockIndex % 2 === 0 ? 1 : 4;
        const cy: number = turnedBlockIndex < 2 ? 1 : 4;
        const turnedBlockCenterCoord: Coord = new Coord(cx, cy);
        postRotation = postRotation.getNext(turnedBlockCenterCoord, 1);
        this.lastDrop = MGPOptional.of(postRotation);
    }

    private coordBelongToBlock(lastMove: PentagoMove): boolean {
        const lastMoveBlockY: number = lastMove.coord.y < 3 ? 0 : 1;
        const lastMoveBlockX: number = lastMove.coord.x < 3 ? 0 : 1;
        const lastMoveBlockIndex: number = lastMoveBlockY * 2 + lastMoveBlockX;
        return lastMove.blockTurned.equalsValue(lastMoveBlockIndex);
    }

    public override hideLastMove(): void {
        this.lastDrop = MGPOptional.empty();
        this.movedBlock = MGPOptional.empty();
        this.lastRotation = MGPOptional.empty();
        this.victoryCoords = [];
    }

    private generateArrowsCoord(): ArrowInfo[] {
        const B2: number = 2 * this.BLOCK_WIDTH + this.PIECE_SEPARATION;
        const z0: number = 0.5 * this.PIECE_SEPARATION;
        const C2: number = this.ARROW_WIDTH;
        const D1: number = B2 - this.SPACE_SIZE + this.PIECE_SEPARATION;
        const C4: number = 2 * C2;
        const C1: number = 0.5 * this.SPACE_SIZE;
        const path0: string = 'M  ' + C1 + ' -' + z0 + ' q  ' + C2 + ' -' + C2 + '  ' + C4 + ' -' + z0;
        const path1: string = 'M -' + z0 + '  ' + C1 + ' q -' + C2 + '  ' + C2 + ' -' + z0 + '  ' + C4;
        const path2: string = 'M  ' + B2 + '  ' + C1 + ' q  ' + C2 + '  ' + C2 + '  ' + z0 + '  ' + C4;
        const path3: string = 'M  ' + D1 + ' -' + z0 + ' q -' + C2 + ' -' + C2 + ' -' + C4 + ' -' + z0;
        const path4: string = 'M -' + z0 + '  ' + D1 + ' q -' + C2 + ' -' + C2 + ' -' + z0 + ' -' + C4;
        const path5: string = 'M  ' + C1 + '  ' + B2 + ' q  ' + C2 + '  ' + C2 + '  ' + C4 + '  ' + z0;
        const path6: string = 'M  ' + D1 + '  ' + B2 + ' q -' + C2 + '  ' + C2 + ' -' + C4 + '  ' + z0;
        const path7: string = 'M  ' + B2 + '  ' + D1 + ' q  ' + C2 + ' -' + C2 + '  ' + z0 + ' -' + C4;
        return [
            { path: path0, coord: new Coord(+C1, +z0), blockIndex: 0, clockwise: true },
            { path: path1, coord: new Coord(-z0, +C1), blockIndex: 0, clockwise: false },
            { path: path2, coord: new Coord(+B2, +C1), blockIndex: 1, clockwise: true },
            { path: path3, coord: new Coord(+D1, -z0), blockIndex: 1, clockwise: false },
            { path: path4, coord: new Coord(-z0, +D1), blockIndex: 2, clockwise: true },
            { path: path5, coord: new Coord(+C1, +B2), blockIndex: 2, clockwise: false },
            { path: path6, coord: new Coord(+D1, +B2), blockIndex: 3, clockwise: true },
            { path: path7, coord: new Coord(+B2, +D1), blockIndex: 3, clockwise: false },
        ];
    }

    public override cancelMoveAttempt(): void {
        this.arrows = [];
        this.currentDrop = MGPOptional.empty();
        this.canSkipRotation = false;
    }

    public async onClick(coord: Coord): Promise<MGPValidation> {
        const x: number = coord.x;
        const y: number = coord.y;
        const clickValidity: MGPValidation = await this.canUserPlay('#click-' + x + '-' + y);
        if (clickValidity.isFailure()) {
            return this.cancelMove(clickValidity.getReason());
        }
        if (this.state.board[y][x].isPlayer()) {
            return this.cancelMove(RulesFailure.MUST_LAND_ON_EMPTY_SPACE());
        }
        const drop: PentagoMove = PentagoMove.rotationless(x, y);
        const state: PentagoState = this.getState();
        const postDropState: PentagoState = state.applyLegalDrop(drop);
        if (postDropState.neutralBlocks.length === 4) {
            return this.chooseMove(drop);
        }
        const gameStatus: GameStatus = this.rules.getGameStatus(this.node);
        this.canSkipRotation = postDropState.neutralBlocks.length > 0 && gameStatus.isEndGame === false;
        this.currentDrop = MGPOptional.of(coord);
        this.displayArrows(postDropState.neutralBlocks);
        return MGPValidation.SUCCESS;
    }

    public displayArrows(neutralBlocks: number[]): void {
        this.arrows = [];
        for (let blockIndex: number = 0; blockIndex < 4; blockIndex++) {
            if (neutralBlocks.includes(blockIndex) === false) {
                const arrows: ArrowInfo[] = this.ARROWS.filter((arrow: ArrowInfo) => {
                    return arrow.blockIndex === blockIndex;
                });
                this.arrows = this.arrows.concat(arrows);
            }
        }
    }

    public getBlockClasses(x: number, y: number): string[] {
        const blockIndex: number = x + 2 * y;
        if (this.movedBlock.equalsValue(blockIndex)) {
            return ['last-move-stroke'];
        }
        return [];
    }

    public getSquareClasses(coord: Coord): string[] {
        const x: number = coord.x;
        const y: number = coord.y;
        const classes: string[] = [];
        const player: string = this.getPlayerClass(this.state.board[y][x]);
        classes.push(player);
        if (this.lastDrop.equalsValue(coord)) {
            classes.push('last-move-stroke');
        }
        return classes;
    }

    public async rotate(arrow: ArrowInfo): Promise<MGPValidation> {
        const clockwise: string = arrow.clockwise ? 'clockwise' : 'counterclockwise';
        const clickValidity: MGPValidation = await this.canUserPlay('#rotate-' + arrow.blockIndex + '-' + clockwise);
        if (clickValidity.isFailure()) {
            return this.cancelMove(clickValidity.getReason());
        }
        const currentDrop: Coord = this.currentDrop.get();
        const move: PentagoMove =
            PentagoMove.withRotation(currentDrop.x, currentDrop.y, arrow.blockIndex, arrow.clockwise);
        return this.chooseMove(move);
    }

    public async skipRotation(): Promise<MGPValidation> {
        const clickValidity: MGPValidation = await this.canUserPlay('#skip-rotation');
        if (clickValidity.isFailure()) {
            return this.cancelMove(clickValidity.getReason());
        }
        const currentDrop: Coord = this.currentDrop.get();
        const drop: PentagoMove = PentagoMove.rotationless(currentDrop.x, currentDrop.y);
        return this.chooseMove(drop);
    }

    public getSkipRotationCircleTranslate(): string {
        const translate: number = this.BLOCK_WIDTH + (this.PIECE_SEPARATION / 2) - this.STROKE_WIDTH;
        return this.getSVGTranslation(translate, translate);
    }

}
