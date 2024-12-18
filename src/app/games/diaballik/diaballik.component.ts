import { ChangeDetectorRef, Component } from '@angular/core';
import { MGPFallible, MGPOptional, MGPValidation, Utils } from '@everyboard/lib';

import { DefeatCoords, DiaballikRules, VictoryCoord, VictoryOrDefeatCoords } from './DiaballikRules';
import { DiaballikMove, DiaballikBallPass, DiaballikSubMove, DiaballikTranslation } from './DiaballikMove';
import { DiaballikPiece, DiaballikState } from './DiaballikState';
import { MessageDisplayer } from 'src/app/services/MessageDisplayer';
import { Coord } from 'src/app/jscaip/Coord';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { DiaballikDistanceMinimax } from './DiaballikDistanceMinimax';
import { DiaballikMoveGenerator } from './DiaballikMoveGenerator';
import { MCTS } from 'src/app/jscaip/AI/MCTS';
import { RectangularGameComponent } from 'src/app/components/game-components/rectangular-game-component/RectangularGameComponent';
import { DiaballikFailure } from './DiaballikFailure';
import { Line } from 'src/app/jscaip/Line';
import { Player } from 'src/app/jscaip/Player';
import { DiaballikFilteredMoveGenerator } from './DiaballikFilteredMoveGenerator';
import { ViewBox } from 'src/app/components/game-components/GameComponentUtils';
import { EmptyRulesConfig } from 'src/app/jscaip/RulesConfigUtil';

@Component({
    selector: 'app-diaballik',
    templateUrl: './diaballik.component.html',
    styleUrls: ['../../components/game-components/game-component/game-component.scss'],
})

export class DiaballikComponent extends RectangularGameComponent<DiaballikRules,
                                                                 DiaballikMove,
                                                                 DiaballikState,
                                                                 DiaballikPiece,
                                                                 EmptyRulesConfig,
                                                                 DiaballikState>
{

    public stateInConstruction: DiaballikState;

    public WIDTH: number;
    public HEIGHT: number;
    public INDICATOR_SIZE: number = 20;

    public victoryCoord: MGPOptional<Coord> = MGPOptional.empty();
    public loserCoords: Coord[] = [];
    public blockedLines: Line[] = [];

    public indicators: Coord[] = [];

    private currentSelection: MGPOptional<Coord> = MGPOptional.empty();
    public hasMadePass: boolean = false;
    public translationsMade: number = 0;
    private subMoves: DiaballikSubMove[] = [];

    private lastMovedBalls: Coord[] = [];
    private lastMovedPieces: Coord[] = [];
    private currentlyMovedBalls: Coord[] = [];
    private currentlyMovedPieces: Coord[] = [];

    private readonly moveGenerator: DiaballikMoveGenerator = new DiaballikMoveGenerator(false);

    public constructor(messageDisplayer: MessageDisplayer, cdr: ChangeDetectorRef) {
        super(messageDisplayer, cdr);
        this.setRulesAndNode('Diaballik');
        this.hasAsymmetricBoard = true;
        this.WIDTH = this.getState().getWidth();
        this.HEIGHT = this.getState().getHeight();
        this.encoder = DiaballikMove.encoder;
        this.availableAIs = [
            new DiaballikDistanceMinimax($localize`AllMoves`, new DiaballikMoveGenerator(true)),
            new MCTS($localize`MCTS`, this.moveGenerator, this.rules),
            new MCTS($localize`MCTS (3 only)`, new DiaballikFilteredMoveGenerator(3, false), this.rules),
            new MCTS($localize`MCTS (without dups)`, new DiaballikMoveGenerator(true), this.rules),
            new MCTS($localize`MCTS (3, no dups)`, new DiaballikFilteredMoveGenerator(3, false), this.rules),
        ];
        for (let i: number = 1; i <= 3; i++) {
            this.availableAIs.push(new DiaballikDistanceMinimax($localize`Distance (${i})`, new DiaballikFilteredMoveGenerator(i)));
        }
    }

    public override async updateBoard(_triggerAnimation: boolean): Promise<void> {
        const state: DiaballikState = this.node.gameState;
        this.board = state.board; // Needed by RectangularGameComponent
        this.stateInConstruction = state;
        const possibleVictory: MGPOptional<VictoryOrDefeatCoords> = this.rules.getVictoryOrDefeatCoords(state);
        this.victoryCoord = MGPOptional.empty();
        this.loserCoords = [];
        this.blockedLines = [];
        if (possibleVictory.isPresent()) {
            const victory: VictoryOrDefeatCoords = possibleVictory.get();
            if (victory instanceof VictoryCoord) {
                this.victoryCoord = MGPOptional.of(victory.coord);
            } else if (victory instanceof DefeatCoords) {
                this.loserCoords = victory.allLoserPieces;
                // If Player.ZERO won, the line will be placed in front of their piece directly.
                // If Player.ONE won, we need to shift them by one space size so that they appear in front of the piece
                const shift: number = victory.winner === Player.ZERO ? 0 : this.SPACE_SIZE;
                for (const blockedPiece of victory.opponentPiecesInContact) {
                    const x: number = blockedPiece.x * this.SPACE_SIZE;
                    const y: number = blockedPiece.y * this.SPACE_SIZE + shift;
                    const line: Line = new Line(x, y, x + this.SPACE_SIZE, y);
                    this.blockedLines.push(line);
                }
            }
        }
    }

    public override async showLastMove(move: DiaballikMove): Promise<void> {
        for (const subMove of move.getSubMoves()) {
            if (subMove instanceof DiaballikTranslation) {
                this.lastMovedPieces.push(subMove.getStart(), subMove.getEnd());
            } else {
                Utils.assert(subMove instanceof DiaballikBallPass, 'DiaballikMove can only be a translation or a pass');
                this.lastMovedBalls.push(subMove.getStart(), subMove.getEnd());
            }
        }
    }

    private showSubMove(subMove: DiaballikSubMove): void {
        if (subMove instanceof DiaballikTranslation) {
            this.currentlyMovedPieces.push(subMove.getStart(), subMove.getEnd());
        } else {
            Utils.assert(subMove instanceof DiaballikBallPass, 'DiaballikMove can only be a translation or a pass');
            this.currentlyMovedBalls.push(subMove.getStart(), subMove.getEnd());
        }
    }

    public override hideLastMove(): void {
        this.lastMovedPieces = [];
        this.lastMovedBalls = [];
    }

    public override cancelMoveAttempt(): void {
        this.stateInConstruction = this.getState();
        this.currentSelection = MGPOptional.empty();
        this.hasMadePass = false;
        this.translationsMade = 0;
        this.subMoves = [];
        this.indicators = [];
        this.currentlyMovedBalls = [];
        this.currentlyMovedPieces = [];
    }

    public getSpaceClasses(x: number, y: number): string[] {
        const coord: Coord = new Coord(x, y);
        const classes: string[] = [];
        const moved: Coord[] = this.lastMovedBalls
            .concat(this.lastMovedPieces)
            .concat(this.currentlyMovedBalls)
            .concat(this.currentlyMovedPieces);
        if (moved.some((c: Coord) => c.equals(coord))) {
            classes.push('moved-fill');
        }
        return classes;
    }

    public getPieceClasses(x: number, y: number, piece: DiaballikPiece): string[] {
        const coord: Coord = new Coord(x, y);
        const classes: string[] = [this.getPlayerClass(piece.owner)];
        if (this.isPieceMoved(coord)) {
            classes.push('last-move-stroke');
        }
        if (piece.holdsBall === false && this.currentSelection.equalsValue(new Coord(x, y))) {
            classes.push('selected-stroke');
        }
        if (this.victoryCoord.equalsValue(coord)) {
            classes.push('victory-stroke');
        }
        if (this.loserCoords.some((c: Coord) => c.equals(coord))) {
            classes.push('defeat-stroke');
        }
        return classes;
    }

    private isPieceMoved(coord: Coord): boolean {
        return this
            .lastMovedPieces
            .concat(this.currentlyMovedPieces)
            .some((c: Coord) => c.equals(coord));
    }

    public getBallClasses(x: number, y: number, piece: DiaballikPiece): string[] {
        const coord: Coord = new Coord(x, y);
        const classes: string[] = [this.getPlayerClass(piece.owner)];
        if (this.isBallMoved(coord)) {
            classes.push('last-move-stroke');
        }
        if (this.currentSelection.equalsValue(new Coord(x, y))) {
            classes.push('selected-stroke');
        }
        return classes;
    }

    private isBallMoved(coord: Coord): boolean {
        return this
            .lastMovedBalls
            .concat(this.currentlyMovedBalls)
            .some((c: Coord) => c.equals(coord));
    }

    private async addSubMove(subMove: DiaballikSubMove, stateAfterSubMove: DiaballikState): Promise<MGPValidation> {
        this.currentSelection = MGPOptional.empty();
        this.indicators = [];
        this.subMoves.push(subMove);
        this.stateInConstruction = stateAfterSubMove;
        if (this.subMoves.length === 3) {
            const move: DiaballikMove =
                new DiaballikMove(this.subMoves[0], MGPOptional.of(this.subMoves[1]), MGPOptional.of(this.subMoves[2]));
            return this.chooseMove(move);
        } else {
            this.showSubMove(subMove);
            return MGPValidation.SUCCESS;
        }
    }

    public async onClick(x: number, y: number): Promise<MGPValidation> {
        const clickValidity: MGPValidation = await this.canUserPlay('#click_' + x + '_' + y);
        if (clickValidity.isFailure()) {
            return this.cancelMove(clickValidity.getReason());
        }

        const clickedCoord: Coord = new Coord(x, y);
        return this.onLegalClick(clickedCoord);
    }

    private async onLegalClick(clickedCoord: Coord): Promise<MGPValidation> {
        const clickedPiece: DiaballikPiece = this.stateInConstruction.getPieceAt(clickedCoord);
        if (this.currentSelection.isPresent()) {
            const selection: Coord = this.currentSelection.get();
            if (selection.equals(clickedCoord)) {
                // Just deselects
                this.currentSelection = MGPOptional.empty();
                this.indicators = [];
                if (this.subMoves.length === 0) {
                    // No sub moves constructed at all, cancel the move to show the last one
                    return this.cancelMove();
                }
                return MGPValidation.SUCCESS;
            }
            if (this.stateInConstruction.getPieceAt(selection).holdsBall) {
                return this.performPass(selection, clickedCoord);
            } else {
                return this.performTranslation(selection, clickedCoord);
            }
        } else {
            // No piece selected, select this one if it is a player piece
            if (clickedPiece.owner === this.getCurrentPlayer()) {
                if (this.hasMadePass && clickedPiece.holdsBall) {
                    // Only one pass is allowed, so we don't allow to select the piece holding the ball anymore
                    return this.cancelMove(DiaballikFailure.CAN_ONLY_DO_ONE_PASS());
                } else if (this.translationsMade === 2 && clickedPiece.holdsBall === false) {
                    // At most two translations are allowed
                    return this.cancelMove(DiaballikFailure.CAN_ONLY_TRANSLATE_TWICE());
                } else {
                    this.currentSelection = MGPOptional.of(clickedCoord);
                    if (clickedPiece.holdsBall) {
                        this.indicators = this.moveGenerator.getPassEnds(this.stateInConstruction, clickedCoord);
                    } else {
                        this.indicators = this.moveGenerator.getTranslationEnds(this.stateInConstruction, clickedCoord);
                    }
                    return MGPValidation.SUCCESS;
                }
            } else if (clickedPiece.owner.isNone()) {
                return this.cancelMove(RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_EMPTY());
            } else {
                return this.cancelMove(RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_OPPONENT());
            }
        }
    }

    private performPass(start: Coord, end: Coord): Promise<MGPValidation> {
        const pass: MGPFallible<DiaballikBallPass> = DiaballikBallPass.from(start, end);
        if (pass.isSuccess()) {
            const passLegality: MGPFallible<DiaballikState> =
                this.rules.isLegalPass(this.stateInConstruction, pass.get());
            if (passLegality.isSuccess()) {
                this.hasMadePass = true;
                return this.addSubMove(pass.get(), passLegality.get());
            } else {
                return this.cancelMove(passLegality.getReason());
            }
        } else {
            return this.cancelMove(pass.getReason());
        }
    }

    private performTranslation(start: Coord, end: Coord): Promise<MGPValidation> {
        const translation: MGPFallible<DiaballikTranslation> = DiaballikTranslation.from(start, end);
        if (translation.isSuccess()) {
            const translationLegality: MGPFallible<DiaballikState> =
                this.rules.isLegalTranslation(this.stateInConstruction, translation.get());
            if (translationLegality.isSuccess()) {
                this.translationsMade++;
                return this.addSubMove(translation.get(), translationLegality.get());
            } else {
                return this.cancelMove(translationLegality.getReason());
            }
        } else {
            return this.cancelMove(translation.getReason());
        }
    }

    public showDoneButton(): boolean {
        return this.interactive && this.subMoves.length >= 1;
    }

    public async done(): Promise<MGPValidation> {
        const clickValidity: MGPValidation = await this.canUserPlay('#done');
        if (clickValidity.isFailure()) {
            return this.cancelMove(clickValidity.getReason());
        }

        let second: MGPOptional<DiaballikSubMove> = MGPOptional.empty();
        if (this.subMoves.length >= 2) {
            second = MGPOptional.of(this.subMoves[1]);
        }
        // Note: user can't click on done if there are either no sub move (button doesn't appear)
        // or if there are three submoves (as the move would have been performed directly)

        const move: DiaballikMove = new DiaballikMove(this.subMoves[0], second, MGPOptional.empty());
        return this.chooseMove(move);
    }

    public getBoardRotation(): string {
        const rotation: number = this.getPointOfView().getValue() * 180;
        const boardWidth: number = this.getState().getWidth() * this.SPACE_SIZE + this.STROKE_WIDTH;
        const boardHeight: number = this.getState().getHeight() * this.SPACE_SIZE + this.STROKE_WIDTH;
        const centerX: number = boardWidth / 2;
        const centerY: number = boardHeight / 2;
        return `rotate(${rotation} ${centerX} ${centerY})`;
    }

    public override getViewBox(): ViewBox {
        return super.getViewBox().expand(0, 0, this.SPACE_SIZE, this.SPACE_SIZE);
    }

}
