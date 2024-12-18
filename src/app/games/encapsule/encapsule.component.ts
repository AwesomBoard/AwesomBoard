import { ChangeDetectorRef, Component } from '@angular/core';
import { MGPMap, MGPOptional, MGPValidation, Utils } from '@everyboard/lib';

import { RectangularGameComponent } from '../../components/game-components/rectangular-game-component/RectangularGameComponent';
import { EncapsuleLegalityInformation, EncapsuleRules } from 'src/app/games/encapsule/EncapsuleRules';
import { EncapsuleState, EncapsuleSpace } from 'src/app/games/encapsule/EncapsuleState';
import { EncapsuleMove } from 'src/app/games/encapsule/EncapsuleMove';
import { EncapsulePiece, Size } from 'src/app/games/encapsule/EncapsulePiece';
import { Coord } from 'src/app/jscaip/Coord';
import { Player, PlayerOrNone } from 'src/app/jscaip/Player';
import { MessageDisplayer } from 'src/app/services/MessageDisplayer';
import { EncapsuleFailure } from './EncapsuleFailure';
import { MCTS } from 'src/app/jscaip/AI/MCTS';
import { EmptyRulesConfig } from 'src/app/jscaip/RulesConfigUtil';
import { EncapsuleMoveGenerator } from './EncapsuleMoveGenerator';
import { ViewBox } from 'src/app/components/game-components/GameComponentUtils';
import { EncapsuleDummyMinimax } from './EncapsuleDummyMinimax';

@Component({
    selector: 'app-encapsule',
    templateUrl: './encapsule.component.html',
    styleUrls: ['../../components/game-components/game-component/game-component.scss'],
})
export class EncapsuleComponent extends RectangularGameComponent<EncapsuleRules,
                                                                 EncapsuleMove,
                                                                 EncapsuleState,
                                                                 EncapsuleSpace,
                                                                 EmptyRulesConfig,
                                                                 EncapsuleLegalityInformation>
{
    public readonly CENTER: number = this.getPieceCenter(1);
    public readonly UPLEFT: number = - (this.SPACE_SIZE + (this.STROKE_WIDTH * 0.5));
    public readonly WIDTH: number = (5 * this.SPACE_SIZE) + (3 * this.STROKE_WIDTH);
    private lastLandingCoord: MGPOptional<Coord> = MGPOptional.empty();
    private lastStartingCoord: MGPOptional<Coord> = MGPOptional.empty();
    public chosenCoord: MGPOptional<Coord> = MGPOptional.empty();
    private chosenPiece: MGPOptional<EncapsulePiece> = MGPOptional.empty();
    private chosenPieceIndex: MGPOptional<number>;
    public remainingPieceCenterCoords: MGPMap<Player, Coord[]> = new MGPMap();
    public victoryCoords: Coord[] = [];

    public constructor(messageDisplayer: MessageDisplayer, cdr: ChangeDetectorRef) {
        super(messageDisplayer, cdr);
        this.setRulesAndNode('Encapsule');
        this.availableAIs = [
            new EncapsuleDummyMinimax(),
            new MCTS($localize`MCTS`, new EncapsuleMoveGenerator(), this.rules),
        ];
        this.encoder = EncapsuleMove.encoder;
    }

    public override getViewBox(): ViewBox {
        const boardViewBox: ViewBox = super.getViewBox();
        return boardViewBox.expandAll(this.SPACE_SIZE);
    }

    public override async showLastMove(move: EncapsuleMove): Promise<void> {
        this.lastLandingCoord = MGPOptional.of(move.landingCoord);
        this.lastStartingCoord = move.startingCoord;
    }

    public override hideLastMove(): void {
        this.lastLandingCoord = MGPOptional.empty();
        this.lastStartingCoord = MGPOptional.empty();
    }

    public override async updateBoard(_triggerAnimation: boolean): Promise<void> {
        const state: EncapsuleState = this.getState();
        this.board = state.getCopiedBoard();
        this.calculateLeftPieceCoords();
        this.victoryCoords = EncapsuleRules.get().getVictoriousCoords(state);
    }

    public getListPieces(content: EncapsuleSpace): EncapsulePiece[] {
        return content.toList();
    }

    public getRemainingPieces(player: Player): EncapsulePiece[] {
        return this.getState().getRemainingPiecesOfPlayer(player);
    }

    public async onBoardClick(x: number, y: number): Promise<MGPValidation> {
        const clickValidity: MGPValidation = await this.canUserPlay('#click-' + x + '-' + y);
        if (clickValidity.isFailure()) {
            return this.cancelMove(clickValidity.getReason());
        }

        const clickedCoord: Coord = new Coord(x, y);
        const state: EncapsuleState = this.getState();
        if (this.chosenCoord.isAbsent()) {
            this.chosenCoord = MGPOptional.of(clickedCoord);
            if (this.chosenPiece.isPresent()) {
                const chosenMove: EncapsuleMove =
                    EncapsuleMove.ofDrop(this.chosenPiece.get(), clickedCoord);
                return this.chooseMove(chosenMove);
            } else if (state.getPieceAt(clickedCoord).belongsTo(state.getCurrentPlayer()) === false) {
                return this.cancelMove(EncapsuleFailure.INVALID_PIECE_SELECTED());
            } else {
                // A coord has been selected for a future move
                return MGPValidation.SUCCESS;
            }
        } else {
            if (this.chosenCoord.equalsValue(clickedCoord)) {
                return this.cancelMove();
            } else {
                const chosenMove: EncapsuleMove =
                    EncapsuleMove.ofMove(this.chosenCoord.get(), clickedCoord);
                return this.chooseMove(chosenMove);
            }
        }
    }

    public override cancelMoveAttempt(): void {
        this.chosenCoord = MGPOptional.empty();
        this.chosenPiece = MGPOptional.empty();
        this.chosenPieceIndex = MGPOptional.empty();
    }

    public async onPieceClick(player: Player, piece: EncapsulePiece, index: number): Promise<MGPValidation> {
        const clickedId: string = '#piece-' + player.toString() + '-' + piece.toString() + '-' + index;
        const clickValidity: MGPValidation = await this.canUserPlay(clickedId);
        if (clickValidity.isFailure()) {
            return this.cancelMove(clickValidity.getReason());
        }

        const state: EncapsuleState = this.getState();
        if (state.isDroppable(piece) === false) {
            return this.cancelMove(EncapsuleFailure.NOT_DROPPABLE());
        } else if (this.chosenCoord.isAbsent()) {
            if (this.chosenPiece.equalsValue(piece) && this.chosenPieceIndex.equalsValue(index)) {
                return this.cancelMove();
            } else {
                this.chosenPiece = MGPOptional.of(piece);
                this.chosenPieceIndex = MGPOptional.of(index);
                return MGPValidation.SUCCESS;
            }
        } else {
            return this.cancelMove(EncapsuleFailure.END_YOUR_MOVE());
        }
    }

    public getRectClasses(x: number, y: number): string {
        if (this.isSelected(x, y)) {
            return 'moved-fill';
        }
        return '';
    }

    private isSelected(x: number, y: number): boolean {
        const coord: Coord = new Coord(x, y);
        if (this.lastStartingCoord.equalsValue(coord)) {
            return true;
        }
        if (this.lastLandingCoord.equalsValue(coord)) {
            return true;
        }
        return false;
    }

    public getPieceClasses(piece: EncapsulePiece): string[] {
        return [this.getPieceStrokeClass(piece)];
    }

    public getPieceCenter(xOrY: number): number {
        return (this.SPACE_SIZE * xOrY) + (this.SPACE_SIZE / 2);
    }

    private getPieceStrokeClass(piece: EncapsulePiece): string {
        const player: PlayerOrNone = piece.getPlayer();
        Utils.assert(player.isPlayer(), 'EncapsuleComponent.getPieceStrokeClass should only be called with actual pieces!');
        return this.getPlayerClass(player, 'stroke');
    }

    public getPieceRadius(piece: EncapsulePiece): number {
        switch (piece.getSize()) {
            case Size.BIG:
                return (this.SPACE_SIZE / 2) - (1 * this.STROKE_WIDTH);
            case Size.MEDIUM:
                return (this.SPACE_SIZE / 2) - (2 * this.STROKE_WIDTH) - 3;
            default:
                Utils.expectToBe(piece.getSize(), Size.SMALL);
                return (this.SPACE_SIZE / 2) - (3 * this.STROKE_WIDTH) - 6;
        }
    }

    public getSidePieceClasses(piece: EncapsulePiece, index: number): string[] {
        const pieceClasses: string[] = this.getPieceClasses(piece);
        if (this.isSelectedPiece(piece) && this.chosenPieceIndex.equalsValue(index)) {
            pieceClasses.push('selected-stroke');
        }
        return pieceClasses;
    }

    private isSelectedPiece(piece: EncapsulePiece): boolean {
        return this.chosenPiece.equalsValue(piece);
    }

    private calculateLeftPieceCoords(): void {
        /**
         * Must have the maximum of piece below the board (for current player)
         * And the rest of them on the left of the board (for current player)
         * Aimed pattern (for current player):
         * 5 . . .
         * 4 . . .
         * 3 . . .
         *   2 1 0
         */
        this.remainingPieceCenterCoords = new MGPMap();
        for (const player of Player.PLAYERS) {
            const playersRemainingPieceLeftPieceCoords: Coord[] = [];
            const pieces: EncapsulePiece[] = this.getRemainingPieces(player);
            for (let index: number = 0; index < pieces.length; index++) {
                let abstractCoord: Coord;
                let offsetX: number = 0;
                let offsetY: number = 0;
                if (index <= 2) {
                    abstractCoord = new Coord(2 - index, 3);
                    offsetY = this.STROKE_WIDTH;
                } else {
                    abstractCoord = new Coord(-1, 5 - index);
                    offsetX = - this.STROKE_WIDTH;
                }
                const realX: number = this.getPieceCenter(abstractCoord.x);
                const realY: number = this.getPieceCenter(abstractCoord.y);
                playersRemainingPieceLeftPieceCoords.push(new Coord(realX + offsetX, realY + offsetY));
            }
            this.remainingPieceCenterCoords.set(player, playersRemainingPieceLeftPieceCoords);
        }
    }

    public getRemainingPieceCenterCoord(player: Player, pieceIdx: number): Coord {
        return this.remainingPieceCenterCoords.get(player).get()[pieceIdx];
    }

}
