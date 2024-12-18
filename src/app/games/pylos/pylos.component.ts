import { ChangeDetectorRef, Component } from '@angular/core';
import { Set, MGPOptional, MGPValidation } from '@everyboard/lib';

import { GameComponent } from '../../components/game-components/game-component/GameComponent';
import { PylosMove, PylosMoveFailure } from 'src/app/games/pylos/PylosMove';
import { PylosState } from 'src/app/games/pylos/PylosState';
import { PylosRules } from 'src/app/games/pylos/PylosRules';
import { PylosCoord } from 'src/app/games/pylos/PylosCoord';
import { Player, PlayerOrNone } from 'src/app/jscaip/Player';
import { MessageDisplayer } from 'src/app/services/MessageDisplayer';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { PylosFailure } from './PylosFailure';
import { MCTS } from 'src/app/jscaip/AI/MCTS';
import { PylosMoveGenerator } from './PylosMoveGenerator';
import { PlayerNumberMap } from 'src/app/jscaip/PlayerMap';
import { PylosMinimax } from './PylosMinimax';

@Component({
    selector: 'app-pylos',
    templateUrl: './pylos.component.html',
    styleUrls: ['../../components/game-components/game-component/game-component.scss'],
})
export class PylosComponent extends GameComponent<PylosRules, PylosMove, PylosState> {

    // 4*100 for each pieces at z=0 level + 2*4 for each direction there is stroke
    public boardWidth: number = (4 * this.SPACE_SIZE) + this.STROKE_WIDTH;
    public pieceRowHeight: number = this.SPACE_SIZE / 2;
    public boardHeight: number = this.boardWidth + 2 * this.pieceRowHeight;
    public constructedState: PylosState;

    public lastLandingCoord: MGPOptional<PylosCoord> = MGPOptional.empty();
    public lastStartingCoord: MGPOptional<PylosCoord> = MGPOptional.empty();
    public lastFirstCapture: MGPOptional<PylosCoord> = MGPOptional.empty();
    public lastSecondCapture: MGPOptional<PylosCoord> = MGPOptional.empty();
    public highCapture: MGPOptional<PylosCoord> = MGPOptional.empty();

    public capturables: Set<PylosCoord> = new Set();

    public chosenStartingCoord: MGPOptional<PylosCoord> = MGPOptional.empty();
    public chosenLandingCoord: MGPOptional<PylosCoord> = MGPOptional.empty();
    public chosenFirstCapture: MGPOptional<PylosCoord> = MGPOptional.empty();
    public chosenSecondCapture: MGPOptional<PylosCoord> = MGPOptional.empty();

    private captured: MGPOptional<PylosCoord>[] = [];
    private lastMoved: PylosCoord[] = [];

    private remainingPieces: PlayerNumberMap = PlayerNumberMap.of(15, 15);

    public constructor(messageDisplayer: MessageDisplayer, cdr: ChangeDetectorRef) {
        super(messageDisplayer, cdr);
        this.setRulesAndNode('Pylos');
        this.availableAIs = [
            new PylosMinimax(),
            new MCTS($localize`MCTS`, new PylosMoveGenerator(), this.rules),
        ];
        this.encoder = PylosMove.encoder;
        this.hasAsymmetricBoard = true;
    }

    public getPiecesCyForPlayer(player: Player): number {
        if (player === Player.ONE) {
            return this.pieceRowHeight / 2;
        } else {
            return this.boardWidth + ( 1.5 * this.pieceRowHeight);
        }
    }

    public getLevelRange(z: number): number[] {
        return PylosState.getLevelRange(z);
    }

    public mustDraw(x: number, y: number, z: number): boolean {
        const coord: PylosCoord = new PylosCoord(x, y, z);
        if (this.constructedState.getPieceAt(coord).isPlayer()) {
            return true;
        }
        if (this.justClimbed(coord)) {
            return true;
        }
        if (this.isCaptured(coord)) {
            return true;
        }
        return this.chosenLandingCoord.isAbsent() && this.constructedState.isLandable(coord);
    }

    private isCaptured(coord: PylosCoord): boolean {
        return this.chosenFirstCapture.equalsValue(coord) ||
               this.chosenSecondCapture.equalsValue(coord);
    }

    public async onPieceClick(x: number, y: number, z: number): Promise<MGPValidation> {
        const clickValidity: MGPValidation = await this.canUserPlay('#piece_' + x + '_' + y + '_' + z);
        if (clickValidity.isFailure()) {
            return this.cancelMove(clickValidity.getReason());
        }
        const clickedCoord: PylosCoord = new PylosCoord(x, y, z);
        const clickedPiece: PlayerOrNone = this.state.getPieceAt(clickedCoord);
        const pieceBelongToOpponent: boolean = clickedPiece === this.state.getCurrentOpponent();
        if (pieceBelongToOpponent) {
            return this.cancelMove(RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_OPPONENT());
        }
        if (this.chosenStartingCoord.equalsValue(clickedCoord)) {
            return this.cancelMove();
        }
        if (this.chosenLandingCoord.isPresent()) {
            // Starting to select capture
            if (this.isSupporting(clickedCoord, this.constructedState)) {
                return this.cancelMove(PylosFailure.CANNOT_MOVE_SUPPORTING_PIECE());
            }
            return this.onCaptureClick(clickedCoord);
        } else {
            if (this.isSupporting(clickedCoord, this.getState())) {
                return this.cancelMove(PylosFailure.CANNOT_MOVE_SUPPORTING_PIECE());
            }
            return this.onClimbClick(clickedCoord);
        }
    }

    private isSupporting(clickedCoord: PylosCoord, state: PylosState): boolean {
        return state.isSupporting(clickedCoord);
    }

    private async onClimbClick(clickedCoord: PylosCoord): Promise<MGPValidation> {
        // Starting do describe a climbing move
        this.chosenStartingCoord = MGPOptional.of(clickedCoord);
        this.constructedState = this.constructedState.removePieceAt(clickedCoord);
        return MGPValidation.SUCCESS;
    }

    private async onCaptureClick(clickedCoord: PylosCoord): Promise<MGPValidation> {
        if (this.chosenFirstCapture.equalsValue(clickedCoord)) {
            this.chosenFirstCapture = MGPOptional.empty();
            this.constructedState = this.constructedState.dropCurrentPlayersPieceAt(clickedCoord);
            this.updateCapturableList();
            return MGPValidation.SUCCESS;
        }
        if (this.chosenSecondCapture.equalsValue(clickedCoord)) {
            this.chosenSecondCapture = MGPOptional.empty();
            this.constructedState = this.constructedState.dropCurrentPlayersPieceAt(clickedCoord);
            this.updateCapturableList();
            return MGPValidation.SUCCESS;
        }
        if (this.chosenFirstCapture.isAbsent()) { // First capture
            this.chosenFirstCapture = MGPOptional.of(clickedCoord);
            this.constructedState = this.constructedState.removePieceAt(clickedCoord);
            this.updateCapturableList();
            return MGPValidation.SUCCESS;
        }
        if (this.chosenSecondCapture.isAbsent()) { // Last capture
            this.chosenSecondCapture = MGPOptional.of(clickedCoord);
            this.constructedState = this.constructedState.removePieceAt(clickedCoord);
            this.updateCapturableList();
            return MGPValidation.SUCCESS;
        }
        return this.cancelMove(PylosMoveFailure.MUST_CAPTURE_MAXIMUM_TWO_PIECES());
    }

    private updateCapturableList(): void {
        this.capturables = this.constructedState.getFreeToMoves();
    }

    public getCaptureValidationButtonClasses(): string {
        if (this.chosenFirstCapture.isPresent() || this.chosenSecondCapture.isPresent()) {
            return '';
        } else {
            return 'semi-transparent';
        }
    }

    public async validateCapture(): Promise<MGPValidation> {
        const clickValidity: MGPValidation = await this.canUserPlay('#capture_validation');
        if (clickValidity.isFailure()) {
            return this.cancelMove(clickValidity.getReason());
        }
        if (this.chosenFirstCapture.isAbsent() && this.chosenSecondCapture.isAbsent()) {
            return MGPValidation.SUCCESS;
        }
        if (this.chosenFirstCapture.isPresent() && this.chosenSecondCapture.isAbsent()) {
            return this.concludeMoveWithCapture([this.chosenFirstCapture.get()]);
        }
        if (this.chosenFirstCapture.isAbsent() && this.chosenSecondCapture.isPresent()) {
            return this.concludeMoveWithCapture([this.chosenSecondCapture.get()]);
        }
        return this.concludeMoveWithCapture([this.chosenFirstCapture.get(), this.chosenSecondCapture.get()]);
    }

    private async concludeMoveWithCapture(captures: PylosCoord[]): Promise<MGPValidation> {
        if (this.chosenStartingCoord.isAbsent()) {
            const move: PylosMove = PylosMove.ofDrop(this.chosenLandingCoord.get(), captures);
            return this.chooseMove(move);
        } else {
            const move: PylosMove = PylosMove.ofClimb(this.chosenStartingCoord.get(),
                                                      this.chosenLandingCoord.get(),
                                                      captures);
            return this.chooseMove(move);
        }
    }

    public override cancelMoveAttempt(): void {
        this.constructedState = this.state;
        this.chosenStartingCoord = MGPOptional.empty();
        this.chosenLandingCoord = MGPOptional.empty();
        this.chosenFirstCapture = MGPOptional.empty();
        this.chosenSecondCapture = MGPOptional.empty();
        this.capturables = new Set();
    }

    public async onDrop(x: number, y: number, z: number): Promise<MGPValidation> {
        const clickValidity: MGPValidation = await this.canUserPlay('#drop_' + x + '_' + y + '_' + z);
        if (clickValidity.isFailure()) {
            return this.cancelMove(clickValidity.getReason());
        }
        const clickedCoord: PylosCoord = new PylosCoord(x, y, z);
        if (PylosRules.canCapture(this.constructedState, clickedCoord)) {
            this.chosenLandingCoord = MGPOptional.of(clickedCoord);
            this.constructedState = this.constructedState.dropCurrentPlayersPieceAt(clickedCoord);
            this.updateCapturableList();
            return MGPValidation.SUCCESS; // now player can click on his captures
        } else {
            this.chosenLandingCoord = MGPOptional.of(clickedCoord);
            return this.concludeMoveWithCapture([]);
        }
    }

    public getSquareClasses(x: number, y: number, z: number): string[] {
        const coord: PylosCoord = new PylosCoord(x, y, z);
        if (this.captured.some((c: MGPOptional<PylosCoord>) => c.equalsValue(coord))) {
            return ['captured-fill'];
        }
        if (this.lastMoved.some((c: PylosCoord) => c.equals(coord))) {
            return ['moved-fill'];
        }
        if (this.justClimbed(coord)) {
            return ['moved-fill'];
        }
        return [];
    }

    private justClimbed(coord: PylosCoord): boolean {
        return this.chosenLandingCoord.isPresent() &&
               this.chosenStartingCoord.equalsValue(coord);
    }

    public getPieceRadius(z: number): number {
        // 0.45 so that the radius take 90% of the place the square had
        // 0.05 so that it become 5% bigger at each level
        return this.SPACE_SIZE * (0.45 + (z * 0.025));
    }

    public getPieceCx(x: number, _y: number, z: number): number {
        // Level one pieces must look like they are in between level zero pieces
        const levelOffset: number = z * 0.5 * this.SPACE_SIZE;
        const localPieceCenter: number = this.SPACE_SIZE / 2;
        return localPieceCenter + levelOffset + (x * this.SPACE_SIZE);
    }

    public getPieceCy(_x: number, y: number, z: number): number {
        // Level one pieces must look like they are in between level zero pieces
        const levelOffset: number = z * 0.5 * this.SPACE_SIZE;
        const localPieceCenter: number = this.SPACE_SIZE / 2;
        return localPieceCenter + levelOffset + (y * this.SPACE_SIZE);
    }

    public getPieceCxByCoord(coord: PylosCoord): number {
        return this.getPieceCx(coord.x, coord.y, coord.z);
    }

    public getPieceCyByCoord(coord: PylosCoord): number {
        return this.getPieceCy(coord.x, coord.y, coord.z);
    }

    public isOccupied(x: number, y: number, z: number): boolean {
        const coord: PylosCoord = new PylosCoord(x, y, z);
        if (this.justClimbed(coord)) {
            return false;
        }
        const reallyOccupied: boolean = this.getState().getPieceAt(coord).isPlayer();
        const landingCoord: boolean = this.chosenLandingCoord.equalsValue(coord);
        return reallyOccupied || landingCoord;
    }

    public getPieceClasses(x: number, y: number, z: number): string[] {
        const c: PylosCoord = new PylosCoord(x, y, z);
        const classes: string[] = [this.getPieceFillClass(c)];
        if (this.lastLandingCoord.equalsValue(c) || this.lastStartingCoord.equalsValue(c)) {
            classes.push('last-move-stroke');
        }
        if (this.chosenStartingCoord.equalsValue(c) || this.chosenLandingCoord.equalsValue(c)) {
            classes.push('selected-stroke');
        }
        if (this.isCaptured(c)) {
            classes.push('pre-captured-fill');
        }
        return classes;
    }

    private getPieceFillClass(c: PylosCoord): string {
        if (this.chosenLandingCoord.equalsValue(c)) {
            return this.getPlayerClass(this.state.getCurrentPlayer());
        }
        return this.getPlayerClass(this.state.getPieceAt(c));
    }

    public getPlayerSidePieces(player: Player): number[] {
        const nPieces: number = this.remainingPieces.get(player);
        const pieces: number[] = [];
        for (let i: number = 0; i < nPieces; i++) {
            pieces.push(i);
        }
        return pieces;
    }

    public override async updateBoard(_triggerAnimation: boolean): Promise<void> {
        this.state = this.getState();
        this.constructedState = this.state;
        const repartition: PlayerNumberMap = this.state.getPiecesRepartition();
        this.remainingPieces = PlayerNumberMap.of(
            15 - repartition.get(Player.ZERO),
            15 - repartition.get(Player.ONE),
        );
    }

    public override async showLastMove(move: PylosMove): Promise<void> {
        this.lastStartingCoord = move.startingCoord;
        this.lastLandingCoord = MGPOptional.of(move.landingCoord);
        this.lastFirstCapture = move.firstCapture;
        this.lastSecondCapture = move.secondCapture;
        if (this.lastFirstCapture.isPresent() &&
            this.mustDrawCoord(this.lastFirstCapture.get()) === false)
        {
            this.highCapture = this.lastFirstCapture;
        }
        this.captured = [
            move.firstCapture,
            move.secondCapture,
        ];
        this.lastMoved = [move.landingCoord];
        if (move.startingCoord.isPresent()) {
            this.lastMoved.push(move.startingCoord.get());
        }
    }

    public override hideLastMove(): void {
        this.lastStartingCoord = MGPOptional.empty();
        this.lastLandingCoord = MGPOptional.empty();
        this.lastFirstCapture = MGPOptional.empty();
        this.lastSecondCapture = MGPOptional.empty();
        this.highCapture = MGPOptional.empty();
        this.lastMoved = [];
        this.captured = [];
    }

    private mustDrawCoord(coord: PylosCoord): boolean {
        const x: number = coord.x;
        const y: number = coord.y;
        const z: number = coord.z;
        return this.mustDraw(x, y, z);
    }

    public mustDisplayLandingCoord(x: number, y: number, z: number): boolean {
        if (this.chosenStartingCoord.isPresent()) {
            if (this.chosenStartingCoord.equalsValue(new PylosCoord(x, y, z))) {
                return true;
            }
            const startingZ: number = this.chosenStartingCoord.get().z;
            return startingZ < z;
        } else {
            return true;
        }
    }

}
