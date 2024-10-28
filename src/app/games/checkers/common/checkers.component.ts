import { MGPFallible, MGPOptional, MGPValidation, Utils, Set } from '@everyboard/lib';
import { ModeConfig, ParallelogramGameComponent } from 'src/app/components/game-components/parallelogram-game-component/ParallelogramGameComponent';
import { Coord } from 'src/app/jscaip/Coord';
import { Vector } from 'src/app/jscaip/Vector';
import { Player } from 'src/app/jscaip/Player';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { CheckersFailure } from '../common/CheckersFailure';
import { CheckersMove } from '../common/CheckersMove';
import { AbstractCheckersRules, CheckersConfig } from '../common/AbstractCheckersRules';
import { CheckersPiece, CheckersStack, CheckersState } from '../common/CheckersState';
import { CheckersMoveGenerator } from '../common/CheckersMoveGenerator';
import { CoordSet } from 'src/app/jscaip/CoordSet';
import { ViewBox } from 'src/app/components/game-components/GameComponentUtils';

export abstract class CheckersComponent<R extends AbstractCheckersRules>
    extends ParallelogramGameComponent<R,
                                       CheckersMove,
                                       CheckersState,
                                       CheckersStack,
                                       CheckersConfig>
{
    public readonly THICKNESS: number = 40;
    public readonly mode: ModeConfig = {
        horizontalWidthRatio: 1.2,
        offsetRatio: 0.4,
        pieceHeightRatio: 1,
        parallelogramHeight: 100,
        abstractBoardWidth: CheckersState.SIZE,
        abstractBoardHeight: CheckersState.SIZE,
    };

    private LEFT: number;
    private UP: number;
    public basicWidth: number;
    public basicHeight: number;
    private WIDTH: number;
    private HEIGHT: number;
    public CX: number;
    public CY: number;

    public constructedState: CheckersState;
    private currentMoveClicks: Coord[] = [];
    private lastCaptures: Coord[] = [];
    private lastMoveds: Coord[] = [];
    public possibleClicks: Set<Coord> = new Set();
    private selectedStack: MGPOptional<Coord> = MGPOptional.empty();
    private capturedCoords: Coord[] = []; // Only the coords capture by active player during this turn
    private flyiedOverCoords: Coord[] = []; // Coord that where flewed over during ongoing turn
    private legalMoves: CheckersMove[] = [];
    protected moveGenerator: CheckersMoveGenerator;

    public override getViewBox(): ViewBox {
        const abstractWidth: number = this.mode.abstractBoardWidth;
        const abstractHeight: number = this.mode.abstractBoardHeight;
        this.LEFT = 0;
        this.UP = - this.SPACE_SIZE;
        this.basicWidth = abstractWidth * this.mode.parallelogramHeight;
        this.basicHeight = abstractHeight * this.mode.parallelogramHeight;
        const boardOffset: number = abstractHeight * this.mode.offsetRatio * this.mode.parallelogramHeight;
        this.WIDTH = (this.basicWidth * this.mode.horizontalWidthRatio) + boardOffset;
        this.HEIGHT = this.basicHeight + this.THICKNESS + this.STROKE_WIDTH - this.UP;
        this.CX = this.WIDTH / 2;
        this.CY = (this.HEIGHT + this.UP) / 2;
        return new ViewBox(this.LEFT, this.UP, this.WIDTH, this.HEIGHT);
    }

    public async updateBoard(_triggerAnimation: boolean): Promise<void> {
        this.constructedState = this.getState(); // AND SWITCH IT
        this.mode.abstractBoardWidth = this.constructedState.getWidth();
        this.mode.abstractBoardHeight = this.constructedState.getHeight();
        this.legalMoves = this.moveGenerator.getListMoves(this.node, this.config);
        this.scores = this.constructedState.getScores();
        this.showPossibleClicks();
    }

    public getSquareClass(x: number, y: number): string[] {
        const coord: Coord = new Coord(x, y);
        const classes: string[] = [];
        if (this.capturedCoords.concat(this.lastCaptures).some((c: Coord) => c.equals(coord))) {
            classes.push('captured-fill');
        }
        const flyiedOverCoords: Coord[] = this.currentMoveClicks.concat(this.lastMoveds.concat(this.flyiedOverCoords));
        if (flyiedOverCoords.some((c: Coord) => c.equals(coord))) {
            classes.push('moved-fill');
        }
        return classes;
    }

    public getPieceClasses(x: number, y: number, z: number): string[] {
        const coord: Coord = new Coord(x, y);
        const square: CheckersStack = this.constructedState.getPieceAt(coord);
        const max: number = square.getStackSize() - 1;
        const piece: CheckersPiece = square.get(max - z);
        const classes: string[] = [this.getPlayerClass(piece.player)];
        if (this.selectedStack.equalsValue(coord)) {
            classes.push('selected-stroke');
        }
        return classes;
    }

    public isPiecePromoted(x: number, y: number, z: number): boolean {
        const coord: Coord = new Coord(x, y);
        const square: CheckersStack = this.constructedState.getPieceAt(coord);
        const max: number = square.getStackSize() - 1;
        const piece: CheckersPiece = square.get(max - z);
        return piece.isPromoted;
    }

    public override async showLastMove(move: CheckersMove): Promise<void> {
        this.lastCaptures = [];
        this.lastMoveds = [move.getStartingCoord()];
        if (this.rules.isMoveStep(move)) {
            this.lastMoveds.push(move.getEndingCoord());
        } else {
            const jumpedOverCoord: MGPFallible<CoordSet> = move.getSteppedOverCoords();
            Utils.assert(jumpedOverCoord.isSuccess(), 'Last move is a capture yet has illegal jumps !?');
            for (const coord of jumpedOverCoord.get().toList().slice(1)) {
                if (this.getPreviousState().getPieceAt(coord).isOccupied()) {
                    this.lastCaptures.push(coord);
                } else {
                    this.lastMoveds.push(coord);
                }
            }
        }
    }

    private showPossibleClicks(): void {
        this.possibleClicks = new Set();
        if (this.interactive) {
            for (const validMove of this.legalMoves) {
                const numberOfClicks: number = this.currentMoveClicks.length;
                if (numberOfClicks < validMove.coords.size()) {
                    const possibleCoord: Coord = validMove.coords.get(numberOfClicks);
                    if (CheckersMove.getRelation(this.currentMoveClicks, validMove.coords.toList()) === 'PREFIX') {
                        this.possibleClicks = this.possibleClicks.addElement(possibleCoord);
                    }
                }
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
        const clickedSpace: CheckersStack = this.constructedState.getPieceAt(clickedCoord);
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
        this.constructedState = this.getState();
        this.currentMoveClicks = [];
        this.capturedCoords = [];
        this.flyiedOverCoords = [];
        this.selectedStack = MGPOptional.empty();
        this.showPossibleClicks();
    }

    private async moveClick(clicked: Coord): Promise<MGPValidation> {
        if (clicked.equals(this.currentMoveClicks[0])) {
            return this.cancelMove();
        }
        const clickedSpace: CheckersStack = this.constructedState.getPieceAt(clicked);
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
                const step: CheckersMove = CheckersMove.fromStep(this.currentMoveClicks[0], clicked);
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
        if (delta.isDiagonal() === false) {
            return this.cancelMove(CheckersFailure.CAPTURE_STEPS_MUST_BE_DIAGONAL());
        } else {
            for (const flyiedOver of lastCoord.getCoordsToward(clicked)) {
                if (this.constructedState.getPieceAt(flyiedOver).isOccupied()) {
                    this.capturedCoords.push(flyiedOver);
                } else {
                    this.flyiedOverCoords.push(flyiedOver);
                }
            }
            this.currentMoveClicks.push(clicked);
            const currentMove: CheckersMove = CheckersMove.fromCapture(this.currentMoveClicks).get();
            if (this.legalMoves.some((capture: CheckersMove) => capture.isPrefix(currentMove))) {
                this.showPossibleClicks();
                return this.applyPartialCapture();
            } else {
                return this.chooseMove(currentMove);
            }
        }
    }

    private applyPartialCapture(): MGPValidation {
        const lastCaptureIndex: number = this.capturedCoords.length - 1;
        const lastCapturedCoord: Coord = this.capturedCoords[lastCaptureIndex];
        const lastMoveIndex: number = this.currentMoveClicks.length - 2;
        const lastMovedCoord: Coord = this.currentMoveClicks[lastMoveIndex];
        const landingIndex: number = this.currentMoveClicks.length - 1;
        const landingCoord: Coord = this.currentMoveClicks[landingIndex];
        const movingStack: CheckersStack = this.constructedState.getPieceAt(lastMovedCoord);
        const capturedStack: CheckersStack = this.constructedState.getPieceAt(lastCapturedCoord);
        const capturedCommander: CheckersPiece = capturedStack.getCommander();
        const pieceUnderCommander: CheckersStack = capturedStack.getPiecesUnderCommander();
        const landingStack: CheckersStack = movingStack.capturePiece(capturedCommander);
        this.constructedState = this.constructedState.remove(lastMovedCoord);
        this.constructedState = this.constructedState.set(lastCapturedCoord, pieceUnderCommander);
        this.constructedState = this.constructedState.set(landingCoord, landingStack);
        return MGPValidation.SUCCESS;
    }

    private async trySelectingPiece(clicked: Coord): Promise<MGPValidation> {
        const clickedSpace: CheckersStack = this.constructedState.getPieceAt(clicked);
        if (clickedSpace.isEmpty()) {
            return this.cancelMove(RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_EMPTY());
        } else {
            return this.selectPiece(clicked);
        }
    }

    private async selectPiece(coord: Coord): Promise<MGPValidation> {
        this.selectedStack = MGPOptional.of(coord);
        if (this.legalMoves.some((move: CheckersMove) => move.getStartingCoord().equals(coord))) {
            this.currentMoveClicks = [coord];
            this.showPossibleClicks();
            return MGPValidation.SUCCESS;
        } else {
            return this.cancelMove(CheckersFailure.THIS_PIECE_CANNOT_MOVE());
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
        const parallelogramCoords: Coord[] = this.getParallelogramCoordsForCheckers();
        return parallelogramCoords
            .map((coord: Coord) => coord.x + ', ' + coord.y)
            .join(' ');
    }

    private getParallelogramCoordsForCheckers(): Coord[] {
        return this.getParallelogramCoords(this.mode);
    }

    private getParallelogramCenter(): Coord {
        const parallelogramCoords: Coord[] = this.getParallelogramCoordsForCheckers();
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
    private getParallelogramCenterOf(a: Coord, b: Coord, c: Coord, d: Coord): Coord {
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
        const offset: number = this.basicHeight * this.mode.offsetRatio;
        const x0: number = offset + width;
        const y0: number = 0;
        const x1: number = offset + width;
        const y1: number = this.THICKNESS;
        const x2: number = width;
        const y2: number = this.basicHeight + this.THICKNESS;
        const x3: number = width;
        const y3: number = this.basicHeight;
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
