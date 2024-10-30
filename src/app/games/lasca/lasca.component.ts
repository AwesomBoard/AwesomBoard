import { ChangeDetectorRef, Component } from '@angular/core';
import { MGPFallible, MGPOptional, MGPValidation, Utils, Set } from '@everyboard/lib';
import { ModeConfig, ParallelogramGameComponent } from 'src/app/components/game-components/parallelogram-game-component/ParallelogramGameComponent';
import { Coord } from 'src/app/jscaip/Coord';
import { Vector } from 'src/app/jscaip/Vector';
import { Player } from 'src/app/jscaip/Player';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { MessageDisplayer } from 'src/app/services/MessageDisplayer';
import { LascaFailure } from './LascaFailure';
import { LascaMove } from './LascaMove';
import { LascaRules } from './LascaRules';
import { LascaPiece, LascaStack, LascaState } from './LascaState';
import { MCTS } from 'src/app/jscaip/AI/MCTS';
import { LascaMoveGenerator } from './LascaMoveGenerator';
import { CoordSet } from 'src/app/jscaip/CoordSet';
import { LascaControlMinimax } from './LascaControlMinimax';
import { LascaControlPlusDominationMinimax } from './LascaControlPlusDominationMinimax';

@Component({
    selector: 'app-lasca',
    templateUrl: './lasca.component.html',
    styleUrls: ['../../components/game-components/game-component/game-component.scss'],
})
export class LascaComponent extends ParallelogramGameComponent<LascaRules,
                                                               LascaMove,
                                                               LascaState,
                                                               LascaStack>
{
    public readonly THICKNESS: number = 40;
    public readonly mode: ModeConfig = {
        horizontalWidthRatio: 1.2,
        offsetRatio: 0.4,
        pieceHeightRatio: 1,
        parallelogramHeight: 100,
        abstractBoardSize: LascaState.SIZE,
    };

    public readonly LEFT: number = 0;
    public readonly UP: number = - this.SPACE_SIZE;
    public readonly basicWidth: number = this.mode.abstractBoardSize * this.mode.parallelogramHeight;
    public readonly WIDTH: number = this.basicWidth * (this.mode.horizontalWidthRatio + this.mode.offsetRatio);
    public readonly HEIGHT: number = this.basicWidth + this.THICKNESS + this.STROKE_WIDTH - this.UP;
    public readonly CX: number = this.WIDTH / 2;
    public readonly CY: number = (this.HEIGHT + this.UP) / 2;

    public constructedState: LascaState;
    private currentMoveClicks: Coord[] = [];
    private lastCaptures: Coord[] = [];
    private lastMoveds: Coord[] = [];
    public possibleClicks: Set<Coord> = new Set();
    private capturableCoords: Coord[] = [];
    private selectedStack: MGPOptional<Coord> = MGPOptional.empty();
    private capturedCoords: Coord[] = []; // Only the coords capture by active player during this turn
    private legalMoves: LascaMove[] = [];
    private readonly moveGenerator: LascaMoveGenerator = new LascaMoveGenerator();

    public constructor(messageDisplayer: MessageDisplayer, cdr: ChangeDetectorRef) {
        super(messageDisplayer, cdr);
        this.setRulesAndNode('Lasca');
        this.availableAIs = [
            new LascaControlMinimax(),
            new LascaControlPlusDominationMinimax(),
            new MCTS($localize`MCTS`, this.moveGenerator, this.rules),
        ];
        this.encoder = LascaMove.encoder;
        this.hasAsymmetricBoard = true;
    }

    public async updateBoard(_triggerAnimation: boolean): Promise<void> {
        this.constructedState = this.getState(); // AND SWITCH IT
        this.legalMoves = this.moveGenerator.getListMoves(this.node, this.config);
        this.showPossibleMoves();
    }

    public getSquareClass(x: number, y: number): string[] {
        const coord: Coord = new Coord(x, y);
        const classes: string[] = [];
        if (this.capturedCoords.concat(this.lastCaptures).some((c: Coord) => c.equals(coord))) {
            classes.push('captured-fill');
        }
        if (this.currentMoveClicks.concat(this.lastMoveds).some((c: Coord) => c.equals(coord))) {
            classes.push('moved-fill');
        }
        if (this.capturableCoords.some((c: Coord) => c.equals(coord))) {
            classes.push('capturable-fill');
        }
        return classes;
    }

    public getPieceClasses(x: number, y: number, z: number): string[] {
        const coord: Coord = new Coord(x, y);
        const square: LascaStack = this.constructedState.getPieceAt(coord);
        const max: number = square.getStackSize() - 1;
        const piece: LascaPiece = square.get(max - z);
        const classes: string[] = [this.getPlayerClass(piece.player)];
        if (this.selectedStack.equalsValue(coord)) {
            classes.push('selected-stroke');
        }
        return classes;
    }

    public isPieceOfficer(x: number, y: number, z: number): boolean {
        const coord: Coord = new Coord(x, y);
        const square: LascaStack = this.constructedState.getPieceAt(coord);
        const max: number = square.getStackSize() - 1;
        const piece: LascaPiece = square.get(max - z);
        return piece.isOfficer;
    }

    public override async showLastMove(move: LascaMove): Promise<void> {
        this.showLastCapture(move);
        this.showSteppedOnCoord(move);
    }

    private showLastCapture(move: LascaMove): void {
        this.lastCaptures = [];
        if (move.isStep === false) {
            const jumpedOverCoord: MGPFallible<CoordSet> = move.getCapturedCoords();
            Utils.assert(jumpedOverCoord.isSuccess(), 'Last move is a capture yet has illegal jumps !?');
            for (const coord of jumpedOverCoord.get()) {
                this.lastCaptures.push(coord);
            }
        }
    }

    private showSteppedOnCoord(move: LascaMove): void {
        this.lastMoveds = [];
        for (const steppedCoord of move.coords) {
            this.lastMoveds.push(steppedCoord);
        }
    }

    private showPossibleMoves(): void {
        this.possibleClicks = new Set();
        if (this.interactive) {
            for (const validMove of this.legalMoves) {
                const startingCoord: Coord = validMove.getStartingCoord();
                this.possibleClicks = this.possibleClicks.addElement(startingCoord);
            }
        }
    }

    public override hideLastMove(): void {
        this.lastCaptures = [];
        this.lastMoveds = [];
    }

    public async onClick(x: number, y: number): Promise<MGPValidation> {
        const clickValidity: MGPValidation = await this.canUserPlay('#coord-' + x + '-' + y);
        if (clickValidity.isFailure()) {
            return this.cancelMove(clickValidity.getReason());
        }
        const clickedCoord: Coord = new Coord(x, y);
        const clickedSpace: LascaStack = this.constructedState.getPieceAt(clickedCoord);
        const opponent: Player = this.constructedState.getCurrentOpponent();
        if (clickedSpace.isCommandedBy(opponent)) {
            return this.cancelMove(RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_OPPONENT());
        }
        if (this.currentMoveClicks.length === 0) {
            return this.trySelectingPiece(clickedCoord);
        } else {
            return this.moveClick(clickedCoord);
        }
    }

    public override cancelMoveAttempt(): void {
        this.currentMoveClicks = [];
        this.capturedCoords = [];
        this.selectedStack = MGPOptional.empty();
        this.capturableCoords = [];
        this.showPossibleMoves();
    }

    public async moveClick(clicked: Coord): Promise<MGPValidation> {
        if (clicked.equals(this.currentMoveClicks[0])) {
            return this.cancelMove();
        }
        const clickedSpace: LascaStack = this.constructedState.getPieceAt(clicked);
        const player: Player = this.constructedState.getCurrentPlayer();
        if (clickedSpace.isCommandedBy(player)) {
            this.cancelMoveAttempt();
            return this.trySelectingPiece(clicked);
        }
        if (this.currentMoveClicks.length === 1) {
            // Doing the second click, either a step or a first capture
            const delta: Vector = this.currentMoveClicks[0].getVectorToward(clicked);
            if (delta.isDiagonalOfLength(1)) {
                // It is indeed a step
                const step: LascaMove = LascaMove.fromStep(this.currentMoveClicks[0], clicked).get();
                return this.chooseMove(step);
            }
        }
        // Continuing to capture
        return this.capture(clicked);
    }

    private async capture(clicked: Coord): Promise<MGPValidation> {
        const numberOfClicks: number = this.currentMoveClicks.length;
        const lastCoord: Coord = this.currentMoveClicks[numberOfClicks - 1];
        const delta: Vector = lastCoord.getVectorToward(clicked);
        if (delta.isDiagonalOfLength(2)) {
            const captured: Coord = new Coord(lastCoord.x + (delta.x / 2), lastCoord.y + (delta.y / 2));
            this.capturedCoords.push(captured);
            this.currentMoveClicks.push(clicked);
            const currentMove: LascaMove = LascaMove.fromCapture(this.currentMoveClicks).get();
            if (this.legalMoves.some((capture: LascaMove) => capture.isPrefix(currentMove))) {
                return this.applyPartialCapture();
            } else {
                return this.chooseMove(currentMove);
            }
        } else {
            return this.cancelMove(LascaFailure.CAPTURE_STEPS_MUST_BE_DOUBLE_DIAGONAL());
        }
    }

    private applyPartialCapture(): MGPValidation {
        const lastCaptureIndex: number = this.capturedCoords.length - 1;
        const lastCapturedCoord: Coord = this.capturedCoords[lastCaptureIndex];
        const lastMoveIndex: number = this.currentMoveClicks.length - 2;
        const lastMovedCoord: Coord = this.currentMoveClicks[lastMoveIndex];
        const landingIndex: number = this.currentMoveClicks.length - 1;
        const landingCoord: Coord = this.currentMoveClicks[landingIndex];
        const movingStack: LascaStack = this.constructedState.getPieceAt(lastMovedCoord);
        const capturedStack: LascaStack = this.constructedState.getPieceAt(lastCapturedCoord);
        const capturedCommander: LascaPiece = capturedStack.getCommander();
        const pieceUnderCommander: LascaStack = capturedStack.getPiecesUnderCommander();
        const landingStack: LascaStack = movingStack.capturePiece(capturedCommander);
        this.constructedState = this.constructedState.remove(lastMovedCoord);
        this.constructedState = this.constructedState.set(lastCapturedCoord, pieceUnderCommander);
        this.constructedState = this.constructedState.set(landingCoord, landingStack);
        return MGPValidation.SUCCESS;
    }

    private async trySelectingPiece(clicked: Coord): Promise<MGPValidation> {
        const clickedSpace: LascaStack = this.constructedState.getPieceAt(clicked);
        if (clickedSpace.isEmpty()) {
            return this.cancelMove(RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_EMPTY());
        } else {
            return this.selectPiece(clicked);
        }
    }

    private async selectPiece(coord: Coord): Promise<MGPValidation> {
        this.selectedStack = MGPOptional.of(coord);
        if (this.legalMoves.some((move: LascaMove) => move.getStartingCoord().equals(coord))) {
            this.currentMoveClicks = [coord];
            this.showPossibleLandings(coord, this.constructedState);
            return MGPValidation.SUCCESS;
        } else {
            return this.cancelMove(LascaFailure.THIS_PIECE_CANNOT_MOVE());
        }
    }

    private showPossibleLandings(coord: Coord, state: LascaState): void {
        this.possibleClicks = new Set();
        const possibleCaptures: LascaMove[] = this.rules.getPieceCaptures(state, coord);
        if (possibleCaptures.length === 0) {
            const possibleSteps: LascaMove[] = this.rules.getPieceSteps(state, coord);
            for (const possibleStep of possibleSteps) {
                this.possibleClicks = this.possibleClicks.addElement(possibleStep.getEndingCoord());
            }
        } else {
            const nextLegalLandings: Coord[] = possibleCaptures
                .map((capture: LascaMove) => capture.coords.get(1));
            this.capturableCoords = nextLegalLandings;
        }
    }

    public getTranslationAtXYZ(x: number, y: number, z: number): string {
        const adaptedCoord: Coord = this.adaptXY(x, y);
        const coordTransform: Coord = this.getCoordTranslation(adaptedCoord.x, adaptedCoord.y, z, this.mode);
        return this.getSVGTranslationAt(coordTransform);
    }

    private adaptXY(x: number, y: number): Coord {
        if (this.getPointOfView() === Player.ONE) {
            const maxX: number = this.getState().getWidth() - 1;
            const maxY: number = this.getState().getHeight() - 1;
            return new Coord(maxX - x, maxY - y);
        } else {
            return new Coord(x, y);
        }
    }

    public getParallelogramPoints(): string {
        const parallelogramCoords: Coord[] = this.getParallelogramCoordsForLasca();
        return parallelogramCoords
            .map((coord: Coord) => coord.x + ', ' + coord.y)
            .join(' ');
    }

    public getParallelogramCoordsForLasca(): Coord[] {
        return this.getParallelogramCoords(this.mode);
    }

    public getParallelogramCenter(): Coord {
        const parallelogramCoords: Coord[] = this.getParallelogramCoordsForLasca();
        return this.getParallelogramCenterOf(
            parallelogramCoords[0],
            parallelogramCoords[1],
            parallelogramCoords[2],
            parallelogramCoords[3],
        );
    }

    /**
     * @param a coord of the parallelogram opposite to c
     * @param b coord of the parallelogram opposite to d
     * @param c coord of the parallelogram opposite to a
     * @param d coord of the parallelogram opposite to b
     * @returns the center of the parallelogram
     */
    public getParallelogramCenterOf(a: Coord, b: Coord, c: Coord, d: Coord): Coord {
        const maxX: number = Math.max(a.x, b.x, c.x, d.x);
        const maxY: number = Math.max(a.y, b.y, c.y, d.y);
        const minX: number = Math.min(a.x, b.x, c.x, d.x);
        const minY: number = Math.min(a.y, b.y, c.y, d.y);
        const x: number = (maxX - minX) / 2;
        const y: number = (maxY - minY) / 2;
        return new Coord(x, y);
    }

    public getRightEdge(): string {
        const width: number = this.basicWidth * this.mode.horizontalWidthRatio;
        const offset: number = this.basicWidth * this.mode.offsetRatio;
        const x0: number = offset + width;
        const y0: number = 0;
        const x1: number = offset + width;
        const y1: number = this.THICKNESS;
        const x2: number = width;
        const y2: number = this.basicWidth + this.THICKNESS;
        const x3: number = width;
        const y3: number = this.basicWidth;
        return [x0, y0, x1, y1, x2, y2, x3, y3].join(' ');
    }

    public getPieceTranslation(z: number): string {
        // We want the piece to be in the center of the parallelogram, here are its coords
        const parallelogramCenter: Coord = this.getParallelogramCenter();
        const cy: number = parallelogramCenter.y;
        // We want to center the full piece, which is width=80, height=45, so here are it's center
        // See the define to confirm these
        const pieceCy: number = (50 + 15) / 2;
        // We the need "pieceCx + offsetX" to equal "cx"
        // and "pieceCy + offsetY" to equal "cy", so :
        const offsetY: number = cy - pieceCy;
        // Each piece on the Z axis will be higher, here is how much (see the define to confirm)
        const pieceHeight: number = this.SPACE_SIZE * 0.15;
        return this.getSVGTranslation(0, offsetY - (z * pieceHeight));
    }

}
