import { ChangeDetectorRef, Component } from '@angular/core';
import { TriangularGameComponent }
    from 'src/app/components/game-components/game-component/TriangularGameComponent';
import { CoerceoMove, CoerceoRegularMove, CoerceoTileExchangeMove } from 'src/app/games/coerceo/CoerceoMove';
import { CoerceoState } from 'src/app/games/coerceo/CoerceoState';
import { MGPOptional, MGPValidation } from '@everyboard/lib';
import { Coord } from 'src/app/jscaip/Coord';
import { CoerceoConfig, CoerceoNode, CoerceoRules } from 'src/app/games/coerceo/CoerceoRules';
import { CoerceoFailure } from 'src/app/games/coerceo/CoerceoFailure';
import { Player } from 'src/app/jscaip/Player';
import { MessageDisplayer } from 'src/app/services/MessageDisplayer';
import { FourStatePiece } from 'src/app/jscaip/FourStatePiece';
import { MCTS } from 'src/app/jscaip/AI/MCTS';
import { CoerceoMoveGenerator } from './CoerceoMoveGenerator';
import { ViewBox } from 'src/app/components/game-components/GameComponentUtils';
import { PlayerNumberMap } from 'src/app/jscaip/PlayerMap';
import { CoerceoPiecesThreatsTilesMinimax } from './CoerceoPiecesThreatsTilesMinimax';
import { CoerceoCapturesAndFreedomMinimax } from './CoerceoCapturesAndFreedomMinimax';
import { CoerceoPiecesTilesFreedomMinimax } from './CoerceoPiecesTilesFreedomMinimax';

@Component({
    selector: 'app-coerceo',
    templateUrl: './coerceo.component.html',
    styleUrls: ['../../components/game-components/game-component/game-component.scss'],
})
export class CoerceoComponent extends TriangularGameComponent<CoerceoRules,
                                                              CoerceoMove,
                                                              CoerceoState,
                                                              FourStatePiece,
                                                              CoerceoConfig>
{

    public tiles: PlayerNumberMap = PlayerNumberMap.of(0, 0);

    public NONE: FourStatePiece = FourStatePiece.UNREACHABLE;
    public INDICATOR_SIZE: number = 10;

    public chosenCoord: MGPOptional<Coord> = MGPOptional.empty();
    public lastStart: MGPOptional<Coord> = MGPOptional.empty();
    public lastEnd: MGPOptional<Coord> = MGPOptional.empty();

    public possibleLandings: Coord[] = [];

    public constructor(messageDisplayer: MessageDisplayer, cdr: ChangeDetectorRef) {
        super(messageDisplayer, cdr);
        this.setRulesAndNode('Coerceo');
        this.availableAIs = [
            new CoerceoPiecesThreatsTilesMinimax(),
            new CoerceoCapturesAndFreedomMinimax(),
            new CoerceoPiecesTilesFreedomMinimax(),
            new MCTS($localize`MCTS`,
                     new CoerceoMoveGenerator(),
                     this.rules),
        ];
        this.encoder = CoerceoMove.encoder;
        this.scores = MGPOptional.of(PlayerNumberMap.of(0, 0));
    }

    public async updateBoard(_triggerAnimation: boolean): Promise<void> {
        this.state = this.getState();
        this.scores = MGPOptional.of(this.state.captures);
        this.tiles = this.state.tiles;
        this.board = this.getState().board;
    }

    private showHighlight(): void {
        this.possibleLandings = this.state.getLegalLandings(this.chosenCoord.get());
    }

    public override cancelMoveAttempt(): void {
        this.chosenCoord = MGPOptional.empty();
        this.possibleLandings = [];
    }

    public override async showLastMove(move: CoerceoMove): Promise<void> {
        if (move instanceof CoerceoRegularMove) {
            this.lastStart = MGPOptional.of(move.getStart());
            this.lastEnd = MGPOptional.of(move.getEnd());
        }
    }

    public override hideLastMove(): void {
        this.lastStart = MGPOptional.empty();
        this.lastEnd = MGPOptional.empty();
    }

    public async onPyramidClick(coord: Coord): Promise<MGPValidation> {
        const clickValidity: MGPValidation = await this.canUserPlay('#pyramid-' + coord.x + '-' + coord.y);
        if (clickValidity.isFailure()) {
            return this.cancelMove(clickValidity.getReason());
        }
        return this.onClick(coord);
    }

    public async onSpaceClick(coord: Coord): Promise<MGPValidation> {
        const clickValidity: MGPValidation = await this.canUserPlay('#space-' + coord.x + '-' + coord.y);
        if (clickValidity.isFailure()) {
            return this.cancelMove(clickValidity.getReason());
        }
        return this.onClick(coord);
    }

    private async onClick(coord: Coord): Promise<MGPValidation> {
        const currentPlayer: Player = this.state.getCurrentPlayer();
        if (this.chosenCoord.equalsValue(coord)) {
            // Deselects the piece
            return this.cancelMove();
        } else if (this.chosenCoord.isAbsent() ||
                   this.state.getPieceAt(coord).is(currentPlayer))
        {
            return this.firstClick(coord);
        } else {
            return this.secondClick(coord);
        }
    }

    private async firstClick(coord: Coord): Promise<MGPValidation> {
        const clickedPiece: FourStatePiece = this.state.getPieceAt(coord);
        if (clickedPiece.is(this.state.getCurrentOpponent())) {
            const move: CoerceoMove = CoerceoTileExchangeMove.of(coord);
            return this.chooseMove(move);
        } else if (clickedPiece.is(this.state.getCurrentPlayer())) {
            this.chosenCoord = MGPOptional.of(coord);
            this.showHighlight();
            return MGPValidation.SUCCESS;
        } else {
            return this.cancelMove(CoerceoFailure.FIRST_CLICK_SHOULD_NOT_BE_NULL());
        }
    }

    private async secondClick(coord: Coord): Promise<MGPValidation> {
        if (this.possibleLandings.some((c: Coord) => c.equals(coord))) {
            const move: CoerceoMove = CoerceoRegularMove.of(this.chosenCoord.get(), coord);
            return this.chooseMove(move);
        } else {
            return this.cancelMove(CoerceoFailure.INVALID_DISTANCE());
        }
    }

    public isPyramid(coord: Coord): boolean {
        const spaceContent: FourStatePiece = this.state.getPieceAt(coord);
        return spaceContent.isPlayer() || this.wasOpponent(coord);
    }

    private wasOpponent(coord: Coord): boolean {
        const parent: MGPOptional<CoerceoNode> = this.node.parent;
        if (parent.isPresent()) {
            const opponent: Player = parent.get().gameState.getCurrentOpponent();
            return parent.get().gameState.getPieceAt(coord).is(opponent);
        } else {
            return false;
        }
    }

    public getPyramidClass(coord: Coord): string {
        const spaceContent: FourStatePiece = this.state.getPieceAt(coord);
        if (spaceContent.isPlayer()) {
            return this.getPlayerClass(spaceContent.getPlayer());
        } else {
            return 'captured-fill';
        }
    }

    public mustDraw(coord: Coord): boolean {
        const spaceContent: FourStatePiece = this.state.getPieceAt(coord);
        if (spaceContent === FourStatePiece.UNREACHABLE) {
            // If it was just removed, we want to draw it
            return this.wasRemoved(coord);
        } else {
            // If piece is reachable on the board, we want to draw it
            return true;
        }
    }

    private wasRemoved(coord: Coord): boolean {
        const spaceContent: FourStatePiece = this.state.getPieceAt(coord);
        const parent: MGPOptional<CoerceoNode> = this.node.parent;
        if (spaceContent === FourStatePiece.UNREACHABLE && parent.isPresent()) {
            const previousState: CoerceoState = parent.get().gameState;
            const previousContent: FourStatePiece = previousState.getPieceAt(coord);
            return previousContent === FourStatePiece.EMPTY ||
                   previousContent.is(previousState.getCurrentPlayer());
        } else {
            return false;
        }
    }

    public getSpaceClass(coord: Coord): string {
        if (this.wasRemoved(coord)) {
            return 'captured-alternate-fill';
        } else {
            if ((coord.x + coord.y) % 2 === 1) {
                return 'background';
            } else {
                return 'background2';
            }
        }
    }

    public getTilesCountCoordinate(): string {
        const bx: number = 0; const by: number = 0;
        const corner0x: number = bx + 25; const corner0y: number = by;
        const corner1x: number = bx + 75; const corner1y: number = by;
        const corner2x: number = bx + 100; const corner2y: number = by + 50;
        const corner3x: number = bx + 75; const corner3y: number = by + 100;
        const corner4x: number = bx + 25; const corner4y: number = by + 100;
        const corner5x: number = bx + 0; const corner5y: number = by + 50;
        return '' + corner0x + ', ' + corner0y + ', ' +
                    corner1x + ', ' + corner1y + ', ' +
                    corner2x + ', ' + corner2y + ', ' +
                    corner3x + ', ' + corner3y + ', ' +
                    corner4x + ', ' + corner4y + ', ' +
                    corner5x + ', ' + corner5y + ', ' +
                    corner0x + ', ' + corner0y;
    }

    public mustShowTilesOf(player: Player): boolean {
        if (this.tiles.get(player) > 0) {
            return true;
        } else {
            return this.lastTurnWasTilesExchange(player);
        }
    }

    public lastTurnWasTilesExchange(player: Player): boolean {
        if (this.node.parent.isAbsent()) {
            return false;
        }
        const previousTiles: number = this.getPreviousState().tiles.get(player);
        return previousTiles > this.tiles.get(player);
    }

    public getTriangleInHexTranslation(coord: Coord): string {
        const x: number = coord.x;
        const y: number = coord.y;
        const triangleTranslation: Coord = this.getTriangleTranslationCoord(coord);
        const xHexagonalPadding: number = 2 * Math.floor(x / 3) * this.STROKE_WIDTH;
        let yHexagonalPadding: number;
        if (Math.floor(x / 3) % 2 === 0) {
            yHexagonalPadding = 2 * Math.floor(y / 2) * this.STROKE_WIDTH;
        } else {
            yHexagonalPadding = 2 * Math.abs(Math.floor((y - 1) / 2)) * this.STROKE_WIDTH;
            yHexagonalPadding += this.STROKE_WIDTH;
        }
        return this.getSVGTranslation(
            triangleTranslation.x + xHexagonalPadding,
            triangleTranslation.y + yHexagonalPadding,
        );
    }

    public getTilesCountTranslation(player: Player): string {
        let x: number;
        let y: number;
        if (player === Player.ZERO) {
            x = 0;
            y = 0;
        } else {
            x = this.getWidth() - this.SPACE_SIZE;
            y = this.getHeight() - this.SPACE_SIZE;
        }
        return this.getSVGTranslation(x, y);
    }

    public getViewBox(): ViewBox {
        const left: number = 0;
        const up: number = 0;
        const width: number = this.getWidth();
        const height: number = this.getHeight();
        const halfStroke: number = this.STROKE_WIDTH / 2;
        return new ViewBox(left, up, width, height).expandAll(halfStroke);
    }

    private getWidth(): number {
        const abstractWidth: number = this.getState().getWidth();
        const blockWidth: number = abstractWidth / 3; // The number of hexagonal blocks horizontally
        const horizontalInterPiecesSum: number = 2 * (blockWidth - 1) * this.STROKE_WIDTH;
        return (this.SPACE_SIZE * (0.5 * (abstractWidth + 1))) + horizontalInterPiecesSum;
    }

    private getHeight(): number {
        const abstractHeight: number = this.getState().getHeight();
        const verticalInterPiecesSum: number = (abstractHeight - 2) * this.STROKE_WIDTH;
        return this.SPACE_SIZE * abstractHeight + verticalInterPiecesSum;
    }

    public getTilesCountClasses(player: Player): string[] {
        const classes: string[] = ['base'];
        if (this.lastTurnWasTilesExchange(player)) {
            classes.push('captured-fill');
        } else {
            classes.push(this.getPlayerClass(player));
        }
        return classes;
    }

}
