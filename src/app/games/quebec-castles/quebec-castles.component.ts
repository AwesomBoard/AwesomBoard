import { ChangeDetectorRef, Component } from '@angular/core';
import { MGPOptional, MGPValidation, Set, Utils } from '@everyboard/lib';

import { QuebecCastlesConfig, QuebecCastlesRules } from './QuebecCastlesRules';
import { QuebecCastlesDrop, QuebecCastlesMove, QuebecCastlesTranslation } from './QuebecCastlesMove';
import { QuebecCastlesState } from './QuebecCastlesState';
import { MessageDisplayer } from 'src/app/services/MessageDisplayer';
import { MCTS } from 'src/app/jscaip/AI/MCTS';
import { QuebecCastlesMoveGenerator } from './QuebecCastlesMoveGenerator';
import { QuebecCastlesMinimax } from './QuebecCastlesMinimax';
import { PlayerNumberMap } from 'src/app/jscaip/PlayerMap';
import { Player, PlayerOrNone } from 'src/app/jscaip/Player';
import { RectangularGameComponent } from 'src/app/components/game-components/rectangular-game-component/RectangularGameComponent';
import { Coord } from 'src/app/jscaip/Coord';
import { ViewBox } from 'src/app/components/game-components/GameComponentUtils';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';

    // TODO: if available space === number of soldier to put --> autofill
    // TODO: show droppable territory else
@Component({
    selector: 'app-quebec-castles',
    templateUrl: './quebec-castles.component.html',
    styleUrls: ['../../components/game-components/game-component/game-component.scss'],
})
export class QuebecCastlesComponent extends RectangularGameComponent<QuebecCastlesRules,
                                                                     QuebecCastlesMove,
                                                                     QuebecCastlesState,
                                                                     PlayerOrNone,
                                                                     QuebecCastlesConfig>
{

    // Last Move
    private leftSquare: MGPOptional<Coord> = MGPOptional.empty();
    private landingSquare: MGPOptional<Coord> = MGPOptional.empty();
    private isCaptured: boolean = false;
    private lastDropped: Coord[] = [];

    // Current Move Attempt
    private dropped: Set<Coord> = new Set();
    private selected: MGPOptional<Coord> = MGPOptional.empty();

    // Board
    public constructedState: QuebecCastlesState;
    public missingPieces: PlayerNumberMap;
    public isDroppingGroup: boolean = false;
    public unextendedHeight: number = 0;
    private minX: number = 0;
    private maxX: number = 0;
    private minY: number = 0;

    public constructor(messageDisplayer: MessageDisplayer, cdr: ChangeDetectorRef) {
        super(messageDisplayer, cdr);
        this.setRulesAndNode('QuebecCastles');
        this.availableAIs = [
            new QuebecCastlesMinimax(),
            new MCTS($localize`MCTS`, new QuebecCastlesMoveGenerator(), this.rules),
        ];
        this.encoder = QuebecCastlesMove.encoder;
        this.hasAsymmetricBoard = true;
        this.scores = MGPOptional.of(PlayerNumberMap.of(0, 0));
    }

    public override getViewBox(): ViewBox {
        let viewBox: ViewBox = super.getViewBox();
        if (this.getConfig().get().isRhombic) {
            const state: QuebecCastlesState = this.constructedState;
            const width: number = state.getWidth();
            const height: number = state.getHeight();
            const rotationInRadius: number = -45 * Math.PI / 180;
            const upperCoord: Coord = new Coord(0, 0);
            const leftCoord: Coord = upperCoord.getNext(new Coord(0, height), this.SPACE_SIZE);
            const rightCoord: Coord = upperCoord.getNext(new Coord(width, 0), this.SPACE_SIZE);
            const lowerCoord: Coord = upperCoord.getNext(new Coord(width, height), this.SPACE_SIZE);
            const rotationCenter: Coord = new Coord(
                width * 0.5 * this.SPACE_SIZE,
                height * 0.5 * this.SPACE_SIZE,
            );
            const minY: number = this.getRotated(upperCoord, rotationCenter, rotationInRadius).y;
            const minX: number = this.getRotated(leftCoord, rotationCenter, rotationInRadius).x;
            const maxX: number = this.getRotated(rightCoord, rotationCenter, rotationInRadius).x;
            const maxY: number = this.getRotated(lowerCoord, rotationCenter, rotationInRadius).y;
            viewBox = ViewBox.fromLimits(minX, maxX, minY, maxY);
            this.unextendedHeight = maxY;
            this.maxX = maxX;
            this.minX = minX;
            this.minY = minY;
        }
        if (this.isPlayerDropping()) {
            viewBox = viewBox.expandAbove(this.SPACE_SIZE);
            viewBox = viewBox.expandBelow(this.SPACE_SIZE);
        }
        return viewBox;
    }

    public isPlayerDropping(): boolean {
        return this.isInteractive() && this.isDroppingGroup;
    }

    private getRotated(coord: Coord, center: Coord, rotationInRadius: number): Coord {
        let x: number = center.x;
        x += Math.cos(rotationInRadius) * (coord.x - center.x);
        x += Math.sin(rotationInRadius) * (coord.y - center.y);
        let y: number = center.y;
        y -= Math.sin(rotationInRadius) * (coord.x - center.x);
        y += Math.cos(rotationInRadius) * (coord.y - center.y);
        return new Coord(x, y);
    }

    private updateMissingPieces(): void {
        const config: QuebecCastlesConfig = this.getConfig().get();
        const nbDefender: number = this.constructedState.count(Player.ZERO);
        const nbInvader: number = this.constructedState.count(Player.ONE);
        this.missingPieces = PlayerNumberMap.of(
            config.defender - nbDefender,
            config.invader - nbInvader,
        );
        // this.isDroppingGroup = this.missingPieces.get(Player.ZERO) > 0 ||
        //                        this.missingPieces.get(Player.ONE) > 0;
        this.isDroppingGroup = this.rules.isDropPhase(this.constructedState, config);
    }

    public async onClick(coord: Coord): Promise<MGPValidation> {
        const clickValidity: MGPValidation = await this.canUserPlay('#square-' + coord.x + '-' + coord.y);
        if (clickValidity.isFailure()) {
            return this.cancelMove(clickValidity.getReason());
        }
        const config: QuebecCastlesConfig = this.getConfig().get();
        if (this.rules.isDropPhase(this.constructedState, config)) {
            return this.onDrop(coord, config);
        } else {
            return this.onMove(coord);
        }
    }

    private async onDrop(coord: Coord, config: QuebecCastlesConfig): Promise<MGPValidation> {
        Utils.assert(config.dropPieceYourself, 'enterred "onDrop" on a non-dropping-config');
        if (config.dropPieceByPiece) {
            const chosenMove: QuebecCastlesDrop = QuebecCastlesDrop.of([coord]);
            return await this.chooseMove(chosenMove);
        } else {
            const currentPlayer: Player = this.constructedState.getCurrentPlayer();
            if (this.dropped.contains(coord)) {
                this.constructedState = this.constructedState.setPieceAt(coord, PlayerOrNone.NONE);
                this.dropped = this.dropped.removeElement(coord);
            } else {
                if (0 < this.getNumberOfAwaitedDrop()) {
                    const dropValidity: boolean = this.rules.isValidDropCoord(coord, currentPlayer, config);
                    if (dropValidity) {
                        this.constructedState = this.constructedState.setPieceAt(coord, currentPlayer);
                        this.dropped = this.dropped.addElement(coord);
                    }
                }
            }
            return MGPValidation.SUCCESS;
        }
    }

    private async onMove(coord: Coord): Promise<MGPValidation> {
        if (this.selected.isPresent()) {
            if (this.selected.equalsValue(coord)) {
                return this.cancelMove(); // TODO test ?
            } else {
                return this.chooseMove(QuebecCastlesTranslation.of(this.selected.get(), coord));
            }
        } else {
            const state: QuebecCastlesState = this.constructedState;
            const opponent: Player = state.getCurrentOpponent();
            const clickedPiece: PlayerOrNone = state.getPieceAt(coord);
            if (clickedPiece === opponent) {
                return this.cancelMove(RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_OPPONENT());
            } else if (clickedPiece === PlayerOrNone.NONE) {
                return this.cancelMove(RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_EMPTY());
            } else {
                this.selected = MGPOptional.of(coord);
                return MGPValidation.SUCCESS;
            }
        }
    }

    public async validateGroupDrop(): Promise<MGPValidation> {
        const clickValidity: MGPValidation = await this.canUserPlay('#drop-validator');
        if (clickValidity.isFailure()) {
            return this.cancelMove(clickValidity.getReason());
        }
        const move: QuebecCastlesDrop = QuebecCastlesDrop.of(this.dropped.toList());
        return this.chooseMove(move);
    }

    public async updateBoard(_triggerAnimation: boolean): Promise<void> {
        const state: QuebecCastlesState = this.getState();
        this.constructedState = state;
        this.board = state.getCopiedBoard();
        this.updateMissingPieces();
    }

    public override async showLastMove(move: QuebecCastlesMove): Promise<void> {
        if (move instanceof QuebecCastlesTranslation) {
            console.log('show last move is translation')
            this.leftSquare = MGPOptional.of(move.getStart());
            this.landingSquare = MGPOptional.of(move.getEnd());
            this.isCaptured = this.getPreviousState().getPieceAt(move.getEnd()).isPlayer();
            console.log(this.landingSquare.toString(), this.isCaptured)
        } else {
            console.log('show last move is drop')
            this.lastDropped = move.coords.toList();
            this.isCaptured = false;
        }
    }

    public override hideLastMove(): void {
        this.leftSquare = MGPOptional.empty();
        this.landingSquare = MGPOptional.empty();
        this.lastDropped = [];
        this.isCaptured = false;
    }

    public override cancelMoveAttempt(): void {
        this.dropped = new Set();
        this.selected = MGPOptional.empty();
    }

    public getRectClasses(coord: Coord): string[] {
        const classes: string[] = [];
        if (this.leftSquare.equalsValue(coord) ||
            this.lastDropped.some((c: Coord) => coord.equals(c)))
        {
            classes.push('moved-fill');
        }
        if (this.landingSquare.equalsValue(coord)) {
            if (this.isCaptured) {
                classes.push('captured-fill');
            } else {
                classes.push('moved-fill');
            }
        }
        return classes;
    }

    public getPieceClasses(coord: Coord): string[] {
        const classes: string[] = [
            this.getPlayerClass(this.constructedState.getPieceAt(coord)),
        ];
        if (this.selected.equalsValue(coord) || this.dropped.contains(coord)) {
            classes.push('selected-stroke');
        }
        return classes;
    }

    public getBoardTransform(): string {
        if (this.getConfig().get().isRhombic) {
            const state: QuebecCastlesState = this.constructedState;
            const cx: number = (state.getWidth() / 2) * this.SPACE_SIZE;
            const cy: number = (state.getHeight() / 2) * this.SPACE_SIZE;
            return `rotate(45, ${ cx }, ${ cy })`;
        } else {
            return '';
        }
    }

    public getGroupDropValidationButtonClasses(): string[] {
        const numberToDrop: number = this.getNumberOfAwaitedDrop();
        const classes: string[] = ['capturable-fill'];
        if (this.dropped.size() < numberToDrop) {
            classes.push('semi-transparent');
        }
        return classes;
    }

    private getTotalPieceToDrop(): number {
        const player: Player = this.constructedState.getCurrentPlayer();
        if (player === Player.ZERO) {
            return this.getConfig().get().defender;
        } else {
            return this.getConfig().get().invader;
        }
    }

    public getNumberOfAwaitedDrop(): number {
        const player: Player = this.constructedState.getCurrentPlayer();
        const totalPieceToDrop: number = this.getTotalPieceToDrop();
        return totalPieceToDrop - this.constructedState.count(player);

    }

    public getRemainingCx(i: number): number {
        const remainingPieceToDrop: number = this.getNumberOfAwaitedDrop();
        const availableSpace: number = (this.maxX - this.minX);
        if (remainingPieceToDrop === 1) {
            return this.minX + (availableSpace / 2);
        } else {
            const interSpace: number = (availableSpace - this.SPACE_SIZE) / (remainingPieceToDrop - 1);
            return this.minX + (this.SPACE_SIZE / 2) + (i * interSpace);
        }
    }

    public getRemaininPieceClasses(): string[] {
        return [
            this.constructedState.getCurrentPlayer().getHTMLClass('-fill'),
        ];
    }

    public getGroupValidatorTransform(): string {
        const y: number = this.getRemainingCy();
        const x: number = (this.maxX + this.minX) / 2;
        return 'translate(' + x + ', ' + y + ')';
    }

    public getRemainingCy(): number {
        if (this.getCurrentPlayer() === Player.ZERO) {
            return this.unextendedHeight + (this.SPACE_SIZE * 0.5);
        } else {
            return this.minY - (this.SPACE_SIZE * 0.5);
        }
    }

}
