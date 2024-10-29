import { ChangeDetectorRef, Component } from '@angular/core';
import { RectangularGameComponent } from '../../components/game-components/rectangular-game-component/RectangularGameComponent';
import { SiamMove } from 'src/app/games/siam/SiamMove';
import { SiamState } from 'src/app/games/siam/SiamState';
import { SiamConfig, SiamLegalityInformation, SiamRules } from 'src/app/games/siam/SiamRules';
import { SiamPiece } from 'src/app/games/siam/SiamPiece';
import { Coord } from 'src/app/jscaip/Coord';
import { Orthogonal } from 'src/app/jscaip/Orthogonal';
import { MGPOptional, MGPValidation, Utils } from '@everyboard/lib';
import { MessageDisplayer } from 'src/app/services/MessageDisplayer';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { Player } from 'src/app/jscaip/Player';
import { SiamFailure } from './SiamFailure';
import { MCTS } from 'src/app/jscaip/AI/MCTS';
import { SiamMoveGenerator } from './SiamMoveGenerator';
import { SiamMinimax } from './SiamMinimax';
import { ViewBox } from 'src/app/components/game-components/GameComponentUtils';
import { Debug } from 'src/app/utils/Debug';
import { CoordSet } from 'src/app/jscaip/CoordSet';

export type SiamIndicatorArrow = {
    source: MGPOptional<{ coord: Coord, piece: SiamPiece }>,
    target: Coord,
    direction: Orthogonal,
    move: SiamMove,
}

@Component({
    selector: 'app-siam',
    templateUrl: './siam.component.html',
    styleUrls: ['../../components/game-components/game-component/game-component.scss'],
})
@Debug.log
export class SiamComponent extends RectangularGameComponent<SiamRules,
                                                            SiamMove,
                                                            SiamState,
                                                            SiamPiece,
                                                            SiamConfig,
                                                            SiamLegalityInformation>
{
    public SiamState: typeof SiamState = SiamState;
    public lastMove: MGPOptional<SiamMove> = MGPOptional.empty();
    public movedPieces: Coord[] = [];
    public selectedPiece: MGPOptional<Coord> = MGPOptional.empty();
    public selectedLanding: MGPOptional<Coord> = MGPOptional.empty();
    public orientations: SiamMove[] = [];
    public clickableCoords: CoordSet = new CoordSet();
    public indicatorArrows: SiamIndicatorArrow[] = [];

    private insertingPiece: boolean = false;

    public constructor(messageDisplayer: MessageDisplayer, cdr: ChangeDetectorRef) {
        super(messageDisplayer, cdr);
        this.setRulesAndNode('Siam');
        this.availableAIs = [
            new SiamMinimax(),
            new MCTS($localize`MCTS`, new SiamMoveGenerator(), this.rules),
        ];
        this.encoder = SiamMove.encoder;
    }

    public override getViewBox(): ViewBox {
        return super.getViewBox()
            .expand(0, 0, this.SPACE_SIZE, this.SPACE_SIZE);
    }

    public async updateBoard(_triggerAnimation: boolean): Promise<void> {
        const state: SiamState = this.getState();
        this.board = state.board;
    }

    public override async showLastMove(move: SiamMove): Promise<void> {
        this.lastMove = MGPOptional.of(move);
        const previousGameState: SiamState = this.getPreviousState();
        const config: MGPOptional<SiamConfig> = this.getConfig();
        this.movedPieces = this.rules.isLegal(this.lastMove.get(), previousGameState, config).get().moved;
    }

    public override hideLastMove(): void {
        this.lastMove = MGPOptional.empty();
        this.movedPieces = [];
    }

    public override cancelMoveAttempt(): void {
        this.insertingPiece = false;
        this.selectedPiece = MGPOptional.empty();
        this.selectedLanding = MGPOptional.empty();
        this.orientations = [];
        this.clickableCoords = new CoordSet();
        this.indicatorArrows = [];
    }

    public async selectPieceForInsertion(player: Player): Promise<MGPValidation> {
        const clickValidity: MGPValidation = await this.canUserPlay('#remainingPieces_' + player.toString());
        if (clickValidity.isFailure()) {
            return this.cancelMove(clickValidity.getReason());
        }
        if (player === this.getCurrentOpponent()) {
            return this.cancelMove(RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_OPPONENT());
        }
        if (this.insertingPiece) {
            // We were already inserting, we deselect the piece
            return this.cancelMove();
        }
        this.cancelMoveAttempt();
        const config: SiamConfig = this.getConfig().get();
        for (const move of SiamRules.get().getInsertions(this.getState(), config)) {
            const target: Coord = move.coord.getNext(move.direction.get());
            // For every pushing insertion, we draw an arrow in case it will push a piece
            if (this.board[target.y][target.x] !== SiamPiece.EMPTY) {
                const arrow: SiamIndicatorArrow = {
                    source: MGPOptional.empty(),
                    target,
                    direction: move.direction.get(),
                    move,
                };
                this.indicatorArrows.push(arrow);
            }
            this.clickableCoords = this.clickableCoords.addElement(target);
        }
        this.insertingPiece = true;
        return MGPValidation.SUCCESS;
    }

    public async selectOrientation(move: SiamMove): Promise<MGPValidation> {
        const clickValidity: MGPValidation = await this.canUserPlay('#orientation_' + move.landingOrientation.toString());
        if (clickValidity.isFailure()) {
            return this.cancelMove(clickValidity.getReason());
        }
        // The player has clicked on an orientation arrow, we know the move directly
        return this.chooseMove(move);
    }

    public async clickSquare(x: number, y: number, externalCall: boolean = true): Promise<MGPValidation> {
        if (externalCall) {
            const clickValidity: MGPValidation = await this.canUserPlay('#square_' + x + '_' + y);
            if (clickValidity.isFailure()) {
                return this.cancelMove(clickValidity.getReason());
            }
        }
        const clickedCoord: Coord = new Coord(x, y);
        if (this.insertingPiece) {
            return this.insertPiece(clickedCoord);
        } else {
            // Clicking a square to select a piece or end a non-insertion move
            if (this.selectedLanding.isPresent()) {
                // Player clicked somewhere on the board instead of an orientation arrow, cancel the move
                return this.cancelMove();
            } else if (this.selectedPiece.isPresent()) {
                // Select the landing
                this.selectedLanding = MGPOptional.of(clickedCoord);
                const moves: SiamMove[] =
                    SiamRules.get().getMovesBetween(this.getState(),
                                                    this.getState().getPieceAt(this.selectedPiece.get()),
                                                    this.selectedPiece.get(),
                                                    clickedCoord);
                if (moves.length === 0) {
                    return this.changeMoveDestinationClick(clickedCoord);
                }
                return this.performMoveOrShowOrientationArrows(moves);
            } else {
                Utils.assert(this.getState().isOnBoard(clickedCoord), 'SiamComponent: user clicked outside of board when it should not be possible');
                const clickedPiece: SiamPiece = this.board[y][x];
                if (clickedPiece.getOwner().isNone()) {
                    return this.cancelMove(RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_EMPTY());
                } else if (clickedPiece.getOwner() === this.getCurrentPlayer()) {
                    // Select the piece
                    return this.selectPiece(clickedCoord, clickedPiece);
                } else {
                    return this.cancelMove(RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_OPPONENT());
                }
            }
        }
    }

    private async insertPiece(clickedCoord: Coord): Promise<MGPValidation> {
        if (this.selectedLanding.isPresent()) {
            // The landing is already selected, we cancel the move to avoid any confusion
            await this.cancelMove(SiamFailure.MUST_SELECT_ORIENTATION());
            return MGPValidation.SUCCESS;
        }
        // Inserting a new piece, the player just clicked on the landing
        this.selectedLanding = MGPOptional.of(clickedCoord);
        const config: SiamConfig = this.getConfig().get();
        const insertions: SiamMove[] =
            SiamRules.get().getInsertionsAt(this.getState(), clickedCoord.x, clickedCoord.y, config);
        if (insertions.length === 0) {
            return this.changeMoveDestinationClick(clickedCoord);
        }
        return this.performMoveOrShowOrientationArrows(insertions);
    }

    private async changeMoveDestinationClick(clickedCoord: Coord): Promise<MGPValidation> {
        // The player clicked somewhere where there are no possible move, cancel the move
        this.cancelMoveAttempt();
        const piece: SiamPiece = this.getState().getPieceAt(clickedCoord);
        if (piece.getOwner() === this.getCurrentPlayer()) {
            // The click was made on another piece of the player, likely to select it
            return this.clickSquare(clickedCoord.x, clickedCoord.y, false);
        } else {
            // The click was made on an invalid destination
            return this.cancelMove(SiamFailure.MUST_SELECT_VALID_DESTINATION());
        }
    }

    private async performMoveOrShowOrientationArrows(availableMoves: SiamMove[]): Promise<MGPValidation> {
        Utils.assert(availableMoves.length > 0, 'SiamComponent.performMoveOrShowOrientationArrows expects at least one move');
        if (availableMoves.length === 1) {
            // There's only one possible move, so perform it
            return this.chooseMove(availableMoves[0]);
        } else {
            // Since there's more than a single move, the player will have to select the orientation
            this.clickableCoords = new CoordSet();
            this.indicatorArrows = [];
            this.orientations = availableMoves;
            return MGPValidation.SUCCESS;
        }
    }

    private selectPiece(clickedCoord: Coord, clickedPiece: SiamPiece): MGPValidation {
        this.cancelMoveAttempt();
        const state: SiamState = this.getState();
        this.selectedPiece = MGPOptional.of(clickedCoord);
        const moves: SiamMove[] =
            SiamRules.get().getMovesFrom(state, clickedPiece, clickedCoord.x, clickedCoord.y);
        for (const move of moves) {
            if (move.direction.isPresent()) {
                const target: Coord = move.coord.getNext(move.direction.get());
                this.clickableCoords = this.clickableCoords.addElement(target);
                if (state.isOnBoard(target) && state.getPieceAt(target) !== SiamPiece.EMPTY) {
                    const arrow: SiamIndicatorArrow = {
                        source: MGPOptional.of({
                            coord: clickedCoord,
                            piece: clickedPiece,
                        }),
                        target,
                        direction: move.direction.get(),
                        move,
                    };
                    this.indicatorArrows.push(arrow);
                }
            } else {
                this.clickableCoords = this.clickableCoords.addElement(move.coord);
            }
        }
        return MGPValidation.SUCCESS;
    }

    public async clickArrow(arrow: SiamIndicatorArrow): Promise<MGPValidation> {
        const clickValidity: MGPValidation = await this.canUserPlay('#indicator_' + arrow.target.x + '_' + arrow.target.y + '_' + arrow.move.landingOrientation);
        if (clickValidity.isFailure()) {
            return this.cancelMove(clickValidity.getReason());
        }
        // The user clicked on an arrow directly instead of a square,
        // we can perform the move without asking for the orientation
        return this.chooseMove(arrow.move);
    }

    public isMountain(piece: SiamPiece): boolean {
        return piece === SiamPiece.MOUNTAIN;
    }

    public getSiamArrowTransform(x: number, y: number, direction: Orthogonal): string {
        const orientation: number = direction.toInt() - 2;
        const rotation: string = this.getRotation(orientation);
        const translation: string = this.getSVGTranslation(x * this.SPACE_SIZE, y * this.SPACE_SIZE);
        return [translation, rotation].join(' ');
    }

    private getRotation(orientation: number): string {
        return `rotate(${orientation * 90} ${this.SPACE_SIZE / 2} ${this.SPACE_SIZE / 2})`;
    }

    public getPieceRotation(x: number, y: number): string {
        const piece: SiamPiece = this.board[y][x];
        const orientation: number = piece.getDirection().toInt() - 2;
        return this.getRotation(orientation);
    }

    public getPieceTransform(x: number, y: number): string {
        const piece: SiamPiece = this.board[y][x];
        return this.getSiamArrowTransform(x, y, piece.getDirection());
    }

    public getIndicatorTransform(arrow: SiamIndicatorArrow): string {
        const startingAt: Coord = arrow.target.getPrevious(arrow.direction, 0.5);
        return this.getSiamArrowTransform(startingAt.x, startingAt.y, arrow.direction);
    }

    public getRemainingPieceTransform(piece: number, player: Player): string {
        const config: SiamConfig = this.getConfig().get();
        const cx: number = config.width / 2;
        const offset: number = 1 / 2;
        const pieceOnBoard: number = this.getState().countPlayersPawn().get(player);
        const nbPieceToDraw: number = config.numberOfPiece - pieceOnBoard;
        const width: number = 1 + ((nbPieceToDraw - 1) * offset);
        let x: number;
        let y: number;
        let orientation: Orthogonal;
        if (player === this.getPointOfView()) {
            x = cx - (width / 2) + (piece * offset);
            y = config.height;
            orientation = Orthogonal.LEFT;
        } else {
            // Top pieces are stacked right-to-left for better visuals
            x = cx + (width / 2) - 1 - (piece * offset);
            y = -1;
            orientation = Orthogonal.RIGHT;
        }
        return this.getSiamArrowTransform(x, y, orientation);
    }

    public getPieceClasses(x: number, y: number, c: SiamPiece): string[] {
        const coord: Coord = new Coord(x, y);
        const classes: string[] = [this.getPlayerClass(c.getOwner())];
        if (this.selectedPiece.equalsValue(coord)) {
            classes.push('selected-stroke');
        }
        return classes;
    }

    public getSquareClasses(x: number, y: number): string[] {
        const coord: Coord = new Coord(x, y);

        if (this.movedPieces.some((c: Coord) => c.equals(coord))) {
            return ['moved-fill'];
        }
        return [];
    }

    public getRemainingPieceClasses(player: Player, pieceIndex: number): string[] {
        const classes: string[] = [this.getPlayerClass(player)];
        if (this.insertingPiece && this.getCurrentPlayer() === player && pieceIndex === this.playerPieces(player)-1) {
            classes.push('selected-stroke');
        }
        return classes;
    }

    public playerPieces(player: Player): number {
        const maxPiece: number = this.getConfig().get().numberOfPiece;
        const pieceOnBoard: number = this.getState().countPlayersPawn().get(player);
        return maxPiece - pieceOnBoard;
    }

}
