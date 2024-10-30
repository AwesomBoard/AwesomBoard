import { ChangeDetectorRef, Component } from '@angular/core';
import { GameComponent } from 'src/app/components/game-components/game-component/GameComponent';
import { MCTS } from 'src/app/jscaip/AI/MCTS';
import { Player, PlayerOrNone } from 'src/app/jscaip/Player';
import { MessageDisplayer } from 'src/app/services/MessageDisplayer';
import { MGPOptional, MGPValidation } from '@everyboard/lib';
import { ApagosFailure } from './ApagosFailure';
import { ApagosMove } from './ApagosMove';
import { ApagosMoveGenerator } from './ApagosMoveGenerator';
import { ApagosConfig, ApagosRules } from './ApagosRules';
import { ApagosSquare } from './ApagosSquare';
import { ApagosState } from './ApagosState';
import { ApagosFullBoardMinimax } from './ApagosFullBoardMinimax';
import { ApagosRightmostMinimax } from './ApagosRightmostMinimax';
import { ViewBox } from 'src/app/components/game-components/GameComponentUtils';

interface PieceLocation {

    square: number,

    piece: number,
}

interface DropArrow {

    x: number,

    player: Player,
}

@Component({
    selector: 'app-apagos',
    templateUrl: './apagos.component.html',
    styleUrls: ['../../components/game-components/game-component/game-component.scss'],
})
export class ApagosComponent extends GameComponent<ApagosRules, ApagosMove, ApagosState, ApagosConfig> {
    public PlayerOrNone: typeof PlayerOrNone = PlayerOrNone;

    public board: readonly ApagosSquare[];

    public remainingZero: number;
    public remainingOne: number;

    public ARROW_COORD: string = ApagosComponent.getArrowCoord();

    public PIECE_RADIUS: number;

    public PIECE_DELTA: number = 0;

    public BOARD_WIDTH: number;

    public BOARD_HEIGHT: number;

    public lastMoveSquares: number[];

    public lastMoveDrop: MGPOptional<PieceLocation> = MGPOptional.empty();

    public selectedPiece: MGPOptional<PieceLocation> = MGPOptional.empty();

    public leftPiece: MGPOptional<PieceLocation> = MGPOptional.empty();

    public displayableArrow: DropArrow[] = [];

    private static getArrowCoord(): string {
        // Coordinates calculated to match with a SPACE_SIZE = 100
        const upLeft: string = 12.5 + ',' + 0;
        const upRight: string = 37.5 + ',' + 0;
        const middleMiddleRight: string = 37.5 + ',' + 25;
        const middleExtremeRight: string = 50 + ',' + 25;
        const lowCenter: string = 25 + ',' + 50;
        const middleExtremeLeft: string = 0 + ',' + 25;
        const middleMiddleLeft: string = 12.5 + ',' + 25;
        return upLeft + ' ' + upRight + ' ' + middleMiddleRight + ' ' + middleExtremeRight + ' ' +
               lowCenter + ' ' + middleExtremeLeft + ' ' + middleMiddleLeft;
    }

    public constructor(messageDisplayer: MessageDisplayer, cdr: ChangeDetectorRef) {
        super(messageDisplayer, cdr);
        this.setRulesAndNode('Apagos');
        this.availableAIs = [
            new ApagosRightmostMinimax(),
            new ApagosFullBoardMinimax(),
            new MCTS($localize`MCTS`, new ApagosMoveGenerator(), this.rules),
        ];
        this.encoder = ApagosMove.encoder;
        this.hasAsymmetricBoard = true;
    }

    public getViewBox(): ViewBox {
        return new ViewBox(0, 0, this.BOARD_WIDTH, this.BOARD_HEIGHT).expandAll(this.STROKE_WIDTH / 2);
    }

    public override cancelMoveAttempt(): void {
        this.selectedPiece = MGPOptional.empty();
        this.showPossibleDrops();
    }

    public async updateBoard(_triggerAnimation: boolean): Promise<void> {
        const state: ApagosState = this.getState();
        this.board = state.board;
        const width: number = this.board.length;
        this.BOARD_WIDTH = width * this.SPACE_SIZE;
        this.BOARD_HEIGHT = (width + 0.5) * this.SPACE_SIZE;
        const nPieces: number = state.getMaxPiecesPerPlayer();
        this.PIECE_RADIUS = ((width - 1) * this.SPACE_SIZE) / (nPieces + 1);
        this.PIECE_DELTA = this.PIECE_RADIUS;
        this.remainingZero = state.remaining.get(Player.ZERO);
        this.remainingOne = state.remaining.get(Player.ONE);
        this.showPossibleDrops();
    }

    public override hideLastMove(): void {
        this.lastMoveSquares = [];
        this.lastMoveDrop = MGPOptional.empty();
        this.leftPiece = MGPOptional.empty();
    }

    public override async showLastMove(move: ApagosMove): Promise<void> {
        if (move.isDrop()) {
            this.showLastDrop(move);
        } else {
            this.showLastTransfer(move);
        }
    }

    public showLastDrop(lastMove: ApagosMove): void {
        const width: number = this.getConfig().get().width;
        const piece: Player = lastMove.piece.get();
        let higherIndex: number = lastMove.landing;
        this.lastMoveSquares = [higherIndex];
        if (lastMove.landing !== width - 1) {
            higherIndex += 1;
            this.lastMoveSquares.push(higherIndex);
        }
        const climbingSquare: ApagosSquare = this.board[higherIndex];
        const landingIndex: number = this.getLowestPlayerPiece(climbingSquare, piece);
        this.lastMoveDrop = MGPOptional.of({
            square: higherIndex,
            piece: landingIndex,
        });
    }

    private getLowestPlayerPiece(square: ApagosSquare, player: Player): number {
        const nbPiecePlayer: number = square.count(player);
        if (player === Player.ZERO) {
            return nbPiecePlayer - 1;
        } else {
            const totalPieces: number = square.count(PlayerOrNone.NONE);
            return totalPieces - nbPiecePlayer;
        }
    }

    public showLastTransfer(lastMove: ApagosMove): void {
        const previousState: ApagosState = this.getPreviousState();
        const previousPlayer: Player = previousState.getCurrentPlayer();
        const leftSquare: number = lastMove.starting.get();
        const previousSquare: ApagosSquare = previousState.board[leftSquare];
        const leftPieceIndex: number = this.getLowestPlayerPiece(previousSquare, previousPlayer);
        this.leftPiece = MGPOptional.of({
            square: leftSquare,
            piece: leftPieceIndex,
        });

        const landingCoord: number = lastMove.landing;
        const landedSquare: ApagosSquare = this.board[landingCoord];
        const landedPieceIndex: number = this.getLowestPlayerPiece(landedSquare, previousPlayer);
        this.lastMoveDrop = MGPOptional.of({
            square: landingCoord,
            piece: landedPieceIndex,
        });
    }

    private showPossibleDrops(): void {
        this.displayableArrow = [];
        const state: ApagosState = this.getState();
        for (let x: number = 0; x < state.board.length; x++) {
            if (state.board[x].isFull() === false) {
                if (state.remaining.get(Player.ZERO) > 0) {
                    this.displayableArrow.push({ x, player: Player.ZERO });
                }
                if (state.remaining.get(Player.ONE) > 0) {
                    this.displayableArrow.push({ x, player: Player.ONE });
                }
            }
        }
    }

    public getCircleTransform(i: number, square: ApagosSquare): string {
        const x: number = this.SPACE_SIZE / 2;
        const y: number = this.SPACE_SIZE / 2;
        if (square.count(PlayerOrNone.NONE) === 1) {
            return this.getSVGTranslation(x, y);
        }
        const nbCircle: number = square.count(PlayerOrNone.NONE);
        const angle: number = (i * 2 * Math.PI / nbCircle) - (Math.PI / 2);
        const radius: number = this.SPACE_SIZE * 0.30;
        const deltaX: number = radius * Math.cos(angle);
        const deltaY: number = radius * Math.sin(angle);
        return this.getSVGTranslation(x + deltaX, y + deltaY);
    }

    public canDisplayArrow(x: number, player: Player): boolean {
        return this.displayableArrow.some((a: DropArrow) => a.x === x && a.player.equals(player));
    }

    public getArrowClasses(player: Player): string[] {
        const classes: string[] = [this.getPlayerClass(player)];
        return classes;
    }

    public getBlockTransform(x: number): string {
        const yOffset: number = ((this.board.length - 1 - x) * this.SPACE_SIZE) + (0.5 * this.SPACE_SIZE);
        const xOffset: number = x * this.SPACE_SIZE;
        return this.getSVGTranslation(xOffset, yOffset);
    }

    public getSquareClasses(x: number): string[] {
        const classes: string[] = ['base'];
        if (this.selectedPiece.isPresent() && this.selectedPiece.get().square === x) {
            classes.push('selected-stroke');
        } else if (this.lastMoveSquares.includes(x)) {
            classes.push('last-move-stroke');
        }
        return classes;
    }

    public async onArrowClick(x: number, player: Player): Promise<MGPValidation> {
        const playerString: string = (player === Player.ZERO) ? 'zero' : 'one';
        const clickValidity: MGPValidation = await this.canUserPlay('#dropArrow_' + playerString + '_' + x);
        if (clickValidity.isFailure()) {
            return this.cancelMove(clickValidity.getReason());
        }
        if (this.selectedPiece.isPresent()) {
            const square: number = this.selectedPiece.get().square;
            const move: ApagosMove = ApagosMove.transfer(square, x).get();
            return this.chooseMove(move);
        } else {
            const move: ApagosMove = ApagosMove.drop(x, player);
            return this.chooseMove(move);
        }
    }

    public getPieceClasses(x: number, i: number, square: ApagosSquare): string[] {
        const pieceLocation: PieceLocation = { square: x, piece: i };
        const classes: string[] = [];
        let zero: number = square.count(Player.ZERO);
        let one: number = square.count(Player.ONE);
        if (this.selectedPiece.equalsValue(pieceLocation)) {
            classes.push('selected-stroke');
        } else if (this.lastMoveDrop.equalsValue(pieceLocation)) {
            classes.push('last-move-stroke');
        } else if (this.leftPiece.isPresent() && this.leftPiece.get().square === x) {
            if (this.leftPiece.get().piece === i) {
                classes.push('captured-stroke');
                return classes;
            } else {
                const opponent: Player = this.getState().getCurrentOpponent();
                if (opponent === Player.ZERO) zero++;
                else one++;
            }
        }
        const neutral: number = square.count(PlayerOrNone.NONE) - (one + zero);
        const pieceColor: string = this.getPieceColor(i, zero, neutral);
        if (pieceColor !== '') {
            classes.push(pieceColor);
        }
        return classes;
    }

    private getPieceColor(i: number, zero: number, neutral: number): string {
        if (i < zero) {
            return 'player0-fill';
        } else if (i < (zero + neutral)) {
            return '';
        } else {
            return 'player1-fill';
        }

    }

    public async onSquareClick(x: number): Promise<MGPValidation> {
        const clickValidity: MGPValidation = await this.canUserPlay('#square_' + x);
        if (clickValidity.isFailure()) {
            return this.cancelMove(clickValidity.getReason());
        }
        if (this.selectedPiece.isPresent() && this.selectedPiece.get().square === x) {
            return this.cancelMove();
        }
        const currentPlayer: Player = this.getState().getCurrentPlayer();
        const square: ApagosSquare = this.board[x];
        const nbPiecePresent: number = square.count(currentPlayer);
        if (nbPiecePresent <= 0) {
            return this.cancelMove(ApagosFailure.NO_PIECE_OF_YOU_IN_CHOSEN_SQUARE());
        }
        this.selectedPiece = MGPOptional.of({
            square: x,
            piece: this.getLowestPlayerPiece(square, currentPlayer),
        });
        if (this.showAndGetPossibleTranfers().length === 0) {
            return this.cancelMove(ApagosFailure.NO_POSSIBLE_TRANSFER_REMAINS());
        }
        return MGPValidation.SUCCESS;
    }

    private showAndGetPossibleTranfers(): DropArrow[] {
        this.displayableArrow = [];
        let landingX: number = this.selectedPiece.get().square - 1;
        const currentPlayer: Player = this.getState().getCurrentPlayer();
        while (0 <= landingX) {
            if (this.board[landingX].isFull() === false) {
                this.displayableArrow.push({
                    x: landingX,
                    player: currentPlayer,
                });
            }
            landingX--;
        }
        return this.displayableArrow;
    }

    public getRemainingPieceCx(x: number): number {
        return (1 + x) * this.PIECE_DELTA;
    }

}
