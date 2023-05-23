import { Component } from '@angular/core';
import { HexagonalGameComponent } from 'src/app/components/game-components/game-component/HexagonalGameComponent';
import { ViewBox } from 'src/app/components/game-components/GameComponentUtils';
import { Coord } from 'src/app/jscaip/Coord';
import { GameStatus } from 'src/app/jscaip/GameStatus';
import { HexaLayout } from 'src/app/jscaip/HexaLayout';
import { FlatHexaOrientation } from 'src/app/jscaip/HexaOrientation';
import { Player } from 'src/app/jscaip/Player';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { MessageDisplayer } from 'src/app/services/MessageDisplayer';
import { ArrayUtils, Table2DWithPossibleNegativeIndices } from 'src/app/utils/ArrayUtils';
import { assert } from 'src/app/utils/assert';
import { MGPFallible } from 'src/app/utils/MGPFallible';
import { MGPOptional } from 'src/app/utils/MGPOptional';
import { MGPSet } from 'src/app/utils/MGPSet';
import { MGPValidation } from 'src/app/utils/MGPValidation';
import { Utils } from 'src/app/utils/utils';
import { HiveFailure } from './HiveFailure';
import { HiveMinimax } from './HiveMinimax';
import { HiveMove, HiveMoveCoordToCoord, HiveMoveDrop, HiveMoveSpider } from './HiveMove';
import { HivePiece, HivePieceStack } from './HivePiece';
import { HiveSpiderRules } from './HivePieceRules';
import { HiveRules } from './HiveRules';
import { HiveState } from './HiveState';
import { HiveTutorial } from './HiveTutorial';

interface GroundInfo {
    spaceClasses: string[];
    strokeClasses: string[];
    selected: boolean;
}

class Ground extends Table2DWithPossibleNegativeIndices<GroundInfo> {
    private highlighted: Coord[] = [];

    public initialize(coord: Coord): void {
        this.set(coord, { spaceClasses: [], strokeClasses: [], selected: false });
    }
    public highlightFill(coord: Coord, fill: string): void {
        this.highlighted.push(coord);
        this.get(coord).map((g: GroundInfo) => g.spaceClasses.push(fill));
    }
    public highlightStroke(coord: Coord, stroke: string): void {
        this.highlighted.push(coord);
        this.get(coord).map((g: GroundInfo) => g.strokeClasses.push(stroke));
    }
    public select(coord: Coord): void {
        this.highlighted.push(coord);
        this.get(coord).map((g: GroundInfo) => g.selected = true);
    }
    public clearHighlights(): void {
        for (const coord of this.highlighted) {
            this.get(coord).map((g: GroundInfo) => {
                g.strokeClasses = [];
                g.spaceClasses = [];
                g.selected = false;
            });
        }
        this.highlighted = [];
    }
}

// What to display at a given (x, y, z)
interface SpaceInLayerInfo {
    piece: HivePiece;
    strokeClasses: string[];
}

class Layer extends Table2DWithPossibleNegativeIndices<SpaceInLayerInfo> {
    private highlighted: Coord[] = [];

    public initialize(coord: Coord, piece: HivePiece): void {
        this.set(coord, { piece, strokeClasses: [] });
    }
    public highlight(coord: Coord, stroke: string): void {
        this.highlighted.push(coord);
        this.get(coord).map((s: SpaceInLayerInfo) => s.strokeClasses.push(stroke));
    }
    public clearHighlights(): void {
        for (const coord of this.highlighted) {
            this.get(coord).map((s: SpaceInLayerInfo) => {
                s.strokeClasses = [];
            });
        }
        this.highlighted = [];
    }
}

@Component({
    selector: 'app-hive',
    templateUrl: './hive.component.html',
    styleUrls: ['../../components/game-components/game-component/game-component.scss'],
})
export class HiveComponent extends HexagonalGameComponent<HiveRules, HiveMove, HiveState, HivePieceStack> {

    public readonly ORIGIN: Coord = new Coord(0, 0);

    public remainingStacks: HivePieceStack[] = [];
    public layers: Layer[] = [];
    public ground: Ground = new Ground();

    public inspectedStack: MGPOptional<HivePieceStack> = MGPOptional.empty();
    public inspectedStackCoord: MGPOptional<Coord> = MGPOptional.empty();
    public selectedRemaining: MGPOptional<HivePiece> = MGPOptional.empty();
    private selectedStart: MGPOptional<Coord> = MGPOptional.empty();
    private selectedSpiderCoords: Coord[] = [];

    public readonly PIECE_HEIGHT: number;

    private boardViewBox: ViewBox;
    public viewBox: string;
    public inspectedStackTransform: string;

    constructor(messageDisplayer: MessageDisplayer) {
        super(messageDisplayer);
        this.rules = HiveRules.get();
        this.node = this.rules.getInitialNode();
        this.availableMinimaxes = [
            new HiveMinimax(this.rules, 'HiveMinimax'),
        ];
        this.encoder = HiveMove.encoder;
        this.tutorial = new HiveTutorial().tutorial;
        this.SPACE_SIZE = 30;
        this.PIECE_HEIGHT = this.SPACE_SIZE / 3;
        this.hexaLayout = new HexaLayout(this.SPACE_SIZE * 1.5,
                                         new Coord(this.SPACE_SIZE * 2, 0),
                                         FlatHexaOrientation.INSTANCE);
        this.canPass = false;
        this.updateBoard();
    }
    public updateBoard(): void {
        this.cancelMoveAttempt();
        this.layers = [];
        for (const coord of this.getState().occupiedSpaces()) {
            const stack: HivePieceStack = this.getState().getAt(coord);
            const x: number = coord.x;
            const y: number = coord.y;
            for (let z: number = 0; z < stack.size(); z++) {
                if (z in this.layers === false) this.layers[z] = new Layer();
                const piece: HivePiece = stack.pieces[stack.size() - 1 - z];
                this.layers[z].initialize(new Coord(x, y), piece);
            }
        }
        this.ground = this.getGround();
        this.computeViewBox();
        this.remainingStacks = this.getState().remainingPieces.toListOfStacks();
        this.canPass = HiveRules.get().shouldPass(this.getState());
        const gameStatus: GameStatus = HiveRules.get().getGameStatus(this.node);
        switch (gameStatus) {
            case GameStatus.ONGOING:
                break;
            case GameStatus.DRAW:
                this.highlight(this.getState().queenBeeLocation(Player.ZERO).get(), 'victory-stroke');
                this.highlight(this.getState().queenBeeLocation(Player.ONE).get(), 'victory-stroke');
                break;
            default:
                // Zero or one won
                const winner: Player = gameStatus.winner as Player;
                const loser: Player = winner.getOpponent();
                this.highlight(this.getState().queenBeeLocation(loser).get(), 'victory-stroke');
        }
    }
    private highlight(coord: Coord, stroke: string): void {
        const stackSize: number = this.getState().getAt(coord).size();
        if (stackSize-1 in this.layers === false) return;
        this.layers[stackSize-1].highlight(coord, stroke);
    }
    public override async pass(): Promise<MGPValidation> {
        Utils.assert(this.canPass, 'DvonnComponent: pass() can only be called if canPass is true');
        return await this.chooseMove(HiveMove.PASS, this.getState());
    }
    private computeViewBox(): void {
        const coords: Coord[] = this.getPieceCoords().union(this.getAllNeighbors()).toList();
        coords.push(new Coord(0, 0)); // Need at least one coord for the first space
        this.boardViewBox = ViewBox.fromHexa(coords, this.hexaLayout, this.STROKE_WIDTH);
        const minimalViewBox: ViewBox = new ViewBox(
            this.getRemainingPieceTransformAsCoord(new HivePiece(Player.ZERO, 'QueenBee')).x,
            0,
            this.SPACE_SIZE * 4 * 5,
            0);

        const spaceForRemainingPieces: number = this.SPACE_SIZE*5;
        let spaceForZero: number = 0;
        if (this.getState().remainingPieces.getAny(Player.ZERO).isPresent()) {
            spaceForZero = spaceForRemainingPieces;
        }
        let spaceForOne: number = 0;
        if (this.getState().remainingPieces.getAny(Player.ONE).isPresent()) {
            spaceForOne = spaceForRemainingPieces;
        }

        const boardAndRemainingViewBox: ViewBox = this.boardViewBox
            .containingAtLeast(minimalViewBox)
            .expand(0, 0, spaceForZero, spaceForOne);
        if (this.inspectedStack.isPresent()) {
            const inspectedStackPosition: Coord =
                new Coord(boardAndRemainingViewBox.right() + this.SPACE_SIZE,
                          boardAndRemainingViewBox.center().y);
            const stackSize: number = this.inspectedStack.get().size();
            // y to get it centered vertically
            const y: number = inspectedStackPosition.y + (stackSize-1)*3*this.PIECE_HEIGHT;
            this.inspectedStackTransform = `translate(${inspectedStackPosition.x} ${y})`;

            const spaceForInspectedStack: number = this.SPACE_SIZE*5;
            this.viewBox = boardAndRemainingViewBox.expand(0, spaceForInspectedStack, 0, 0).toSVGString();
        } else {
            this.viewBox = boardAndRemainingViewBox.toSVGString();
        }
    }
    private getPieceCoords(): MGPSet<Coord> {
        return this.getState().pieces.getKeySet();
    }
    private getGround(): Ground {
        const ground: Ground = new Ground();
        for (const neighbor of this.getAllNeighbors()) {
            ground.initialize(neighbor);
        }
        return ground;
    }
    private getAllNeighbors(): MGPSet<Coord> {
        const neighbors: MGPSet<Coord> = new MGPSet();
        for (const piece of this.getPieceCoords()) {
            neighbors.addAll(new MGPSet(this.getState().emptyNeighbors(piece)));
        }
        if (neighbors.isEmpty()) {
            // We need at least one clickable coord to be playable at first turn
            neighbors.add(new Coord(0, 0));
        }
        return neighbors;
    }
    private clearHighlights(): void {
        for (const layer of this.layers) {
            layer.clearHighlights();
        }
        this.ground.clearHighlights();
    }
    public override cancelMoveAttempt(): void {
        this.clearHighlights();
        this.selectedStart = MGPOptional.empty();
        this.selectedRemaining = MGPOptional.empty();
        this.selectedSpiderCoords = [];
        this.inspectedStack = MGPOptional.empty();
        this.computeViewBox();
    }
    public override showLastMove(move: HiveMove): void {
        for (const coord of this.getLastMoveCoords(move)) {
            this.highlight(coord, 'last-move-stroke');
            this.ground.highlightStroke(coord, 'last-move-stroke');
            this.ground.highlightFill(coord, 'moved-fill');
        }
    }
    private getLastMoveCoords(move: HiveMove): Coord[] {
        let lastMove: Coord[] = [];
        if (move instanceof HiveMoveDrop) {
            lastMove = [move.coord];
        } else if (move instanceof HiveMoveCoordToCoord) {
            lastMove = [move.getStart(), move.getEnd()];
        }
        return lastMove;
    }
    public getRemainingPieceTransformAsCoord(piece: HivePiece): Coord {
        const shift: number = this.getRemainingPieceShift(piece);
        const x: number = this.boardViewBox.center().x + shift * this.SPACE_SIZE * 4;
        let y: number;
        if (piece.owner === this.role) {
            // Current player is below
            y = this.boardViewBox.bottom() + (this.SPACE_SIZE * 3);
        } else {
            y = this.boardViewBox.up - (this.SPACE_SIZE * 2);
        }
        return new Coord(x, y);
    }
    public getRemainingPieceTransform(piece: HivePiece): string {
        const transform: Coord = this.getRemainingPieceTransformAsCoord(piece);
        return `translate(${transform.x} ${transform.y})`;
    }
    public getRemainingPieceHighlightTransform(piece: HivePiece): string {
        const transform: Coord = this.getRemainingPieceTransformAsCoord(piece);
        const size: number = this.getState().remainingPieces.getQuantity(piece);
        return `translate(${transform.x} ${transform.y - (this.PIECE_HEIGHT * size)})`;
    }
    private getRemainingPieceShift(piece: HivePiece): number {
        switch (piece.kind) {
            case 'QueenBee': return -2.5;
            case 'Beetle': return -1.5;
            case 'Grasshopper': return -0.5;
            case 'Spider': return 0.5;
            default:
                Utils.expectToBe(piece.kind, 'SoldierAnt');
                return 1.5;
        }
    }
    public async selectRemaining(piece: HivePiece): Promise<MGPValidation> {
        const clickValidity: MGPValidation = this.canUserPlay(`#remainingPiece_${piece.toString() }`);
        if (clickValidity.isFailure()) {
            return this.cancelMove(clickValidity.getReason());
        }
        if (piece.owner === this.getCurrentPlayer().getOpponent()) {
            return this.cancelMove(RulesFailure.MUST_CHOOSE_PLAYER_PIECE());
        }
        if (piece.kind !== 'QueenBee' && HiveRules.get().mustPlaceQueenBee(this.getState())) {
            return this.cancelMove(HiveFailure.MUST_PLACE_QUEEN_BEE_LATEST_AT_FOURTH_TURN());
        }

        if (this.selectedRemaining.equalsValue(piece)) {
            this.cancelMoveAttempt();
        } else {
            this.cancelMoveAttempt();
            this.selectedRemaining = MGPOptional.of(piece);
            this.clearHighlights();
            const possibleDropLocations: Coord[] = HiveRules.get().getPossibleDropLocations(this.getState()).toList();
            for (const coord of possibleDropLocations) {
                this.ground.highlightStroke(coord, 'clickable-stroke');
            }
        }
        return MGPValidation.SUCCESS;
    }
    public selectStack(x: number, y: number): Promise<MGPValidation> {
        return this.select(new Coord(x, y), 'piece');
    }
    public selectSpace(x: number, y: number): Promise<MGPValidation> {
        return this.select(new Coord(x, y), 'space');
    }
    private async select(coord: Coord, selection: 'piece' | 'space'): Promise<MGPValidation> {
        const clickValidity: MGPValidation = this.canUserPlay(`#${selection}_${coord.x}_${coord.y}`);
        if (clickValidity.isFailure()) {
            return this.cancelMove(clickValidity.getReason());
        }
        const state: HiveState = this.getState();
        const stack: HivePieceStack = state.getAt(coord);
        if (this.selectedRemaining.isPresent()) {
            const move: HiveMove = HiveMove.drop(this.selectedRemaining.get(), coord);
            return this.chooseMove(move, state);
        }
        if (this.selectedStart.isPresent()) {
            const topPiece: HivePiece = state.getAt(this.selectedStart.get()).topPiece();
            if (this.selectedStart.equalsValue(coord)) {
                // Deselect the piece rather than trying a static move
                return this.cancelMove();
            } else {
                return this.selectTarget(coord, topPiece);
            }
        } else {
            if (stack.size() === 0) {
                return this.cancelMove();
            }
            return this.selectStart(coord, stack);
        }
    }
    private async selectTarget(coord: Coord, topPiece: HivePiece): Promise<MGPValidation> {
        if (topPiece.kind === 'Spider') {
            return this.selectNextSpiderSpace(coord);
        } else {
            const move: MGPFallible<HiveMove> = HiveMove.move(this.selectedStart.get(), coord);
            // static moves are prevented in selectSpace
            assert(move.isSuccess(), 'Hive: the only forbidden moves are static moves');
            return this.chooseMove(move.get(), this.getState());
        }
    }
    private async selectStart(coord: Coord, stack: HivePieceStack): Promise<MGPValidation> {
        const state: HiveState = this.getState();
        const piece: HivePiece = stack.topPiece();
        if (piece.owner === state.getCurrentPlayer().getOpponent()) {
            // If the stack clicked is not owned by the player,
            // the player can still select it in order to inspect it
            if (stack.size() === 1) {
                return this.cancelMove(RulesFailure.MUST_CHOOSE_PLAYER_PIECE());
            } else if (this.inspectedStack.isPresent()) {
                this.cancelMoveAttempt();
                this.clearHighlights();
                return MGPValidation.SUCCESS;
            } else {
                // We will only inspect the opponent stack, not do a move
                this.highlight(coord, 'selected-stroke');
                this.inspectedStack = MGPOptional.of(stack);
                this.inspectedStackCoord = MGPOptional.of(coord);
                this.computeViewBox();
                return MGPValidation.SUCCESS;
            }
        }
        this.cancelMoveAttempt(); // To clear inspected stack if needed
        this.clearHighlights();
        if (piece.kind !== 'QueenBee' && HiveRules.get().mustPlaceQueenBee(state)) {
            return this.cancelMove(HiveFailure.MUST_PLACE_QUEEN_BEE_LATEST_AT_FOURTH_TURN());
        }
        this.selectedStart = MGPOptional.of(coord);
        this.highlight(coord, 'selected-stroke');
        if (piece.kind === 'Spider') {
            this.selectedSpiderCoords.push(this.selectedStart.get());
        }
        if (stack.size() > 1) {
            this.inspectedStack = MGPOptional.of(stack);
            this.inspectedStackCoord = MGPOptional.of(coord);
            this.computeViewBox();
        }
        this.highlightNextPossibleCoords(coord);
        return MGPValidation.SUCCESS;
    }
    private highlightNextPossibleCoords(coord: Coord): void {
        for (const indicator of this.getNextPossibleCoords(coord)) {
            this.highlight(indicator, 'clickable-stroke');
            this.ground.highlightStroke(indicator, 'clickable-stroke');
        }
    }
    private getNextPossibleCoords(coord: Coord): Coord[] {
        const state: HiveState = this.getState();
        const topPiece: HivePiece = state.getAt(coord).topPiece();
        const moves: MGPSet<HiveMoveCoordToCoord> = HiveRules.get().getPossibleMovesFrom(state, coord);
        if (topPiece.kind === 'Spider') {
            const spiderMoves: MGPSet<HiveMoveSpider> = moves as MGPSet<HiveMoveSpider>;
            return spiderMoves
                .filter((move: HiveMoveSpider) => ArrayUtils.isPrefix(this.selectedSpiderCoords, move.coords))
                .map((move: HiveMoveSpider) => move.coords[this.selectedSpiderCoords.length])
                .toList();
        } else {
            return moves.map((move: HiveMoveCoordToCoord) => move.getEnd()).toList();
        }
    }
    private async selectNextSpiderSpace(coord: Coord): Promise<MGPValidation> {
        this.selectedSpiderCoords.push(coord);
        if (this.selectedSpiderCoords.length === 4) {
            const move: HiveMove = HiveMove.spiderMove(this.selectedSpiderCoords as [Coord, Coord, Coord, Coord]);
            return this.chooseMove(move, this.getState());
        }
        const validity: MGPValidation =
            HiveSpiderRules.get().prefixLegality(this.selectedSpiderCoords, this.getState());
        if (validity.isFailure()) {
            return this.cancelMove(validity.getReason());
        }
        this.clearHighlights();
        this.highlight(this.selectedStart.get(), 'selected-stroke');
        for (const coord of this.selectedSpiderCoords) {
            this.ground.select(coord);
        }
        this.highlightNextPossibleCoords(this.selectedStart.get());
        return MGPValidation.SUCCESS;
    }
}
