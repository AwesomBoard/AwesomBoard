import { Component } from '@angular/core';
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
import { CoerceoCapturesAndFreedomHeuristic } from './CoerceoCapturesAndFreedomHeuristic';
import { Minimax } from 'src/app/jscaip/AI/Minimax';
import { CoerceoMoveGenerator } from './CoerceoMoveGenerator';
import { CoerceoPiecesThreatsTilesHeuristic } from './CoerceoPiecesThreatsTilesHeuristic';
import { CoerceoOrderedMoveGenerator } from './CoerceoOrderedMoveGenerator';
import { ViewBox } from 'src/app/components/game-components/GameComponentUtils';
import { PlayerNumberMap } from 'src/app/jscaip/PlayerMap';
import { CoerceoPiecesTilesFreedomHeuristic } from './CoerceoPiecesTilesFreedomHeuristic';

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

    public constructor(messageDisplayer: MessageDisplayer) {
        super(messageDisplayer);
        this.setRulesAndNode('Coerceo');
        this.availableAIs = [
            new Minimax($localize`Pieces > Threats > Tiles`,
                        this.rules,
                        new CoerceoPiecesThreatsTilesHeuristic(),
                        new CoerceoOrderedMoveGenerator()),
            new Minimax($localize`Captures > Freedom`,
                        this.rules,
                        new CoerceoCapturesAndFreedomHeuristic(),
                        new CoerceoMoveGenerator()),
            new Minimax($localize`Pieces > Tiles > Freedom`,
                        this.rules,
                        new CoerceoPiecesTilesFreedomHeuristic(),
                        new CoerceoMoveGenerator()),
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

    public async onClick(coord: Coord): Promise<MGPValidation> {
        const clickValidity: MGPValidation = await this.canUserPlay('#click-' + coord.x + '-' + coord.y);
        if (clickValidity.isFailure()) {
            return this.cancelMove(clickValidity.getReason());
        }
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
            const previousContent: FourStatePiece = parent.get().gameState.getPieceAt(coord);
            return previousContent === FourStatePiece.EMPTY ||
                   previousContent.is(parent.get().gameState.getCurrentPlayer());
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
        const bx: number = -40; const by: number = -40;
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

    public getIndicatorY(coord: Coord): number {
        const y: number = this.INDICATOR_SIZE / 2;
        const center: number = this.SPACE_SIZE / 2;
        if ((coord.x + coord.y) % 2 === 0) {
            return y + center;
        } else {
            return y + center - 30;
        }
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
        return 'translate(' + (triangleTranslation.x + xHexagonalPadding) + ', ' +
                              (triangleTranslation.y + yHexagonalPadding) + ')';
    }

    public getTilesCountTranslation(player: Player): string {
        let x: number;
        let y: number;
        if (player === Player.ZERO) {
            x = +0.40;
            y = +0.40;
        } else {
            x = 8;
            y = 10;
        }
        x = this.SPACE_SIZE * x;
        y = this.SPACE_SIZE * y;
        return 'translate(' + x + ', ' + y + ')';
    }

    public getViewBox(): ViewBox {
        const left: number = 0;
        const up: number = 0;
        const abstractWidth: number = this.getState().getWidth();
        const abstractHeight: number = this.getState().getHeight();
        const halfStroke: number = this.STROKE_WIDTH / 2;
        const verticalInterPiecesSum: number = (abstractHeight - 2) * this.STROKE_WIDTH;
        const blockWidth: number = abstractWidth / 3; // The number of hexagonal block horizontally
        const horizontalInterPiecesSum: number = 2 * (blockWidth - 1) * this.STROKE_WIDTH;
        const width: number = (this.SPACE_SIZE * (0.5 * (abstractWidth + 1))) + horizontalInterPiecesSum;
        const height: number = this.SPACE_SIZE * abstractHeight + verticalInterPiecesSum;
        return new ViewBox(left, up, width, height).expandAll(halfStroke);
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
