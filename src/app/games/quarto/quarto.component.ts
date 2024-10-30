import { ChangeDetectorRef, Component } from '@angular/core';
import { QuartoMove } from './QuartoMove';
import { QuartoState } from './QuartoState';
import { QuartoConfig, QuartoRules } from './QuartoRules';
import { QuartoPiece } from './QuartoPiece';
import { Coord } from 'src/app/jscaip/Coord';
import { MGPOptional, MGPValidation, Set } from '@everyboard/lib';
import { MessageDisplayer } from 'src/app/services/MessageDisplayer';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { RectangularGameComponent } from 'src/app/components/game-components/rectangular-game-component/RectangularGameComponent';
import { QuartoMoveGenerator } from './QuartoMoveGenerator';
import { MCTS } from 'src/app/jscaip/AI/MCTS';
import { QuartoMinimax } from './QuartoMinimax';

@Component({
    selector: 'app-quarto',
    templateUrl: './quarto.component.html',
    styleUrls: ['../../components/game-components/game-component/game-component.scss'],
})
export class QuartoComponent extends RectangularGameComponent<QuartoRules,
                                                              QuartoMove,
                                                              QuartoState,
                                                              QuartoPiece,
                                                              QuartoConfig>
{
    public EMPTY: QuartoPiece = QuartoPiece.EMPTY;
    public QuartoPiece: typeof QuartoPiece = QuartoPiece;

    public chosen: MGPOptional<Coord> = MGPOptional.empty();
    public lastMove: MGPOptional<Coord> = MGPOptional.empty();
    // the piece that the current user must place on the board
    public pieceInHand: QuartoPiece = QuartoPiece.EMPTY;
    // the piece that the user wants to give to the opponent
    public pieceToGive: MGPOptional<QuartoPiece> = MGPOptional.empty();
    public victoriousCoords: Set<Coord> = new Set();

    public constructor(messageDisplayer: MessageDisplayer, cdr: ChangeDetectorRef) {
        super(messageDisplayer, cdr);
        this.setRulesAndNode('Quarto');
        this.availableAIs = [
            new QuartoMinimax(),
            new MCTS($localize`MCTS`, new QuartoMoveGenerator(), this.rules),
        ];
        this.encoder = QuartoMove.encoder;
        this.pieceInHand = this.getState().pieceInHand;
    }

    public async updateBoard(_triggerAnimation: boolean): Promise<void> {
        const state: QuartoState = this.getState();
        this.board = state.getCopiedBoard();
        this.pieceInHand = state.pieceInHand;
        const config: QuartoConfig = this.getConfig().get();
        this.victoriousCoords = this.rules.getVictoriousCoords(state, config);
    }

    public async clickCoord(x: number, y: number): Promise<MGPValidation> {
        // called when the user click on the quarto board
        const clickValidity: MGPValidation = await this.canUserPlay('#click-coord-' + x + '-' + y);
        if (clickValidity.isFailure()) {
            return this.cancelMove(clickValidity.getReason());
        }
        if (this.board[y][x] === QuartoPiece.EMPTY) {
            // if it's a legal place to put the piece
            this.showPieceInHandOnBoard(x, y); // let's show the user his decision
            if (this.getState().turn === 15) {
                // on last turn user won't be able to click on a piece to give
                // thereby we must put his piece in hand right
                const chosenMove: QuartoMove = new QuartoMove(x, y, QuartoPiece.EMPTY);
                return this.chooseMove(chosenMove);
            } else if (this.pieceToGive.isAbsent()) {
                return MGPValidation.SUCCESS; // the user has just chosen his coord
            } else {
                // the user has already chosen his piece before his coord
                const chosenMove: QuartoMove = new QuartoMove(x, y, this.pieceToGive.get());
                return this.chooseMove(chosenMove);
            }
        } else {
            // the user chose an occupied place of the board, so an illegal move, so we cancel all
            return this.cancelMove(RulesFailure.MUST_CLICK_ON_EMPTY_SPACE());
        }
    }

    public async clickPiece(givenPiece: number): Promise<MGPValidation> {
        const clickValidity: MGPValidation = await this.canUserPlay('#click-piece-' + givenPiece);
        if (clickValidity.isFailure()) {
            return this.cancelMove(clickValidity.getReason());
        }
        if (this.pieceToGive.equalsValue(QuartoPiece.ofInt(givenPiece))) {
            return this.cancelMove();
        }
        this.pieceToGive = MGPOptional.of(QuartoPiece.ofInt(givenPiece));
        if (this.chosen.isAbsent()) {
            return MGPValidation.SUCCESS; // the user has just chosen his piece
        } else {
            // the user has chosen the coord before the piece
            const chosen: Coord = this.chosen.get();
            const chosenMove: QuartoMove = new QuartoMove(chosen.x, chosen.y, this.pieceToGive.get());
            return this.chooseMove(chosenMove);
        }
    }

    public override async showLastMove(move: QuartoMove): Promise<void> {
        this.lastMove = MGPOptional.of(move.coord);
    }

    public override hideLastMove(): void {
        this.lastMove = MGPOptional.empty();
    }

    public override cancelMoveAttempt(): void {
        this.pieceToGive = MGPOptional.empty();
        this.chosen = MGPOptional.empty();
    }

    public async deselectDroppedPiece(): Promise<MGPValidation> {
        // So it does not throw when there is no chosen piece (used in clickValidity test)
        const chosen: Coord = this.chosen.getOrElse(new Coord(404, 404));
        const clickValidity: MGPValidation = await this.canUserPlay(`#dropped-piece-${ chosen.x }-${ chosen.y }`);
        if (clickValidity.isFailure()) {
            return this.cancelMove(clickValidity.getReason());
        }
        return this.cancelMove();
    }

    private showPieceInHandOnBoard(x: number, y: number): void {
        this.chosen = MGPOptional.of(new Coord(x, y));
    }

    public isRemaining(piece: number): boolean {
        return QuartoState.isGivable(QuartoPiece.ofInt(piece), this.board, this.pieceInHand);
    }

    public getSquareClasses(x: number, y: number): string[] {
        const coord: Coord = new Coord(x, y);
        if (this.lastMove.equalsValue(coord)) {
            return ['moved-fill'];
        } else {
            return [];
        }
    }

    public getPieceClasses(piece: number): string[] {
        const classes: string[] = [];
        if (piece % 2 === 0) {
            classes.push('player0-fill');
        } else {
            classes.push('player1-fill');
        }
        return classes;
    }

    public getPieceSize(piece: number): number {
        if (piece < 8) {
            return 35;
        } else {
            return 20;
        }
    }

    public pieceHasDot(piece: number): boolean {
        return piece !== QuartoPiece.EMPTY.value && (piece % 8 < 4);
    }

}
