import { ChangeDetectorRef, Component } from '@angular/core';
import { MGPFallible, MGPOptional, MGPValidation, Utils } from '@everyboard/lib';

import { HexagonalGameComponent } from 'src/app/components/game-components/game-component/HexagonalGameComponent';
import { Coord } from 'src/app/jscaip/Coord';
import { HexaLayout } from 'src/app/jscaip/HexaLayout';
import { FlatHexaOrientation } from 'src/app/jscaip/HexaOrientation';
import { Player, PlayerOrNone } from 'src/app/jscaip/Player';
import { MessageDisplayer } from 'src/app/services/MessageDisplayer';
import { YinshFailure } from './YinshFailure';
import { YinshState } from './YinshState';
import { YinshCapture, YinshMove } from './YinshMove';
import { YinshPiece } from './YinshPiece';
import { YinshLegalityInformation, YinshRules } from './YinshRules';
import { MCTS } from 'src/app/jscaip/AI/MCTS';
import { YinshMoveGenerator } from './YinshMoveGenerator';
import { PlayerMap, PlayerNumberMap } from 'src/app/jscaip/PlayerMap';
import { EmptyRulesConfig } from 'src/app/jscaip/RulesConfigUtil';
import { YinshScoreMinimax } from './YinshScoreMinimax';
import { CoordSet } from 'src/app/jscaip/CoordSet';

interface ViewInfo {
    targets: Coord[],
    markerSize: number,
    indicatorSize: number,
    ringOuterSize: number,
    ringMidSize: number,
    ringInnerSize: number,
    sideRings: PlayerNumberMap,
    sideRingClass: PlayerMap<string>,
}

@Component({
    selector: 'app-yinsh',
    templateUrl: './yinsh.component.html',
    styleUrls: ['../../components/game-components/game-component/game-component.scss'],
})
export class YinshComponent extends HexagonalGameComponent<YinshRules,
                                                           YinshMove,
                                                           YinshState,
                                                           YinshPiece,
                                                           EmptyRulesConfig,
                                                           YinshLegalityInformation>
{
    private static readonly RING_OUTER_SIZE: number = 40;
    private static readonly RING_MID_SIZE: number = 34;
    private static readonly RING_INNER_SIZE: number = 28;
    private static readonly MARKER_SIZE: number = YinshComponent.RING_INNER_SIZE;
    private static readonly INDICATOR_SIZE: number = 10;

    private constructedState: YinshState;

    private movePhase: 'INITIAL_CAPTURE_SELECT_FIRST' |
                       'INITIAL_CAPTURE_SELECT_LAST' |
                       'INITIAL_CAPTURE_SELECT_RING' |
                       'MOVE_START' |
                       'MOVE_END' |
                       'FINAL_CAPTURE_SELECT_FIRST' |
                       'FINAL_CAPTURE_SELECT_LAST' |
                       'FINAL_CAPTURE_SELECT_RING' =
            'MOVE_START';

    public selectableCoords: CoordSet = new CoordSet();

    // Ongoing move variables
    public removed: Coord[] = [];
    private possibleCaptures: YinshCapture[] = [];
    private initialCaptures: YinshCapture[] = [];
    private finalCaptures: YinshCapture[] = [];
    private currentCapture: MGPOptional<YinshCapture> = MGPOptional.empty();
    public selectedCoords: CoordSet = new CoordSet();
    public selectedRings: CoordSet = new CoordSet();
    private moveStart: MGPOptional<Coord> = MGPOptional.empty();
    private moveEnd: MGPOptional<Coord> = MGPOptional.empty();
    private currentlyMoved: Coord[] = [];

    // Last move variables
    private lastMoved: Coord[] = [];
    private lastCaptures: YinshCapture[] = [];

    public viewInfo: ViewInfo = {
        targets: [],
        markerSize: YinshComponent.MARKER_SIZE,
        ringOuterSize: YinshComponent.RING_OUTER_SIZE,
        ringMidSize: YinshComponent.RING_MID_SIZE,
        ringInnerSize: YinshComponent.RING_INNER_SIZE,
        indicatorSize: YinshComponent.INDICATOR_SIZE,
        sideRings: PlayerNumberMap.of(5, 5),
        sideRingClass: PlayerMap.ofValues('player0-stroke', 'player1-stroke'),
    };

    public constructor(messageDisplayer: MessageDisplayer, cdr: ChangeDetectorRef) {
        super(messageDisplayer, cdr);
        this.setRulesAndNode('Yinsh');
        this.availableAIs = [
            new YinshScoreMinimax(),
            new MCTS($localize`MCTS`, new YinshMoveGenerator(), this.rules),
        ];
        this.encoder = YinshMove.encoder;
        this.scores = MGPOptional.of(PlayerNumberMap.of(0, 0));

        this.hexaLayout = new HexaLayout(YinshComponent.RING_OUTER_SIZE * 1.50,
                                         new Coord(YinshComponent.RING_OUTER_SIZE * 2, 0),
                                         FlatHexaOrientation.INSTANCE);
        this.constructedState = this.getState();
    }

    public override async updateBoard(_triggerAnimation: boolean): Promise<void> {
        const state: YinshState = this.getState();
        this.constructedState = state;
        this.hexaBoard = this.constructedState.board;
        this.scores = MGPOptional.of(state.countScores());
        this.moveToInitialCaptureOrMovePhase();
    }

    private updateViewInfo(): void {
        this.viewInfo.sideRings = this.constructedState.sideRings;
        this.showCurrentMoveCaptures();

        this.viewInfo.targets = [];
        this.selectableCoords = new CoordSet();
        const currentPlayer: Player = this.constructedState.getCurrentPlayer();
        switch (this.movePhase) {
            case 'INITIAL_CAPTURE_SELECT_FIRST':
            case 'INITIAL_CAPTURE_SELECT_LAST':
            case 'FINAL_CAPTURE_SELECT_FIRST':
            case 'FINAL_CAPTURE_SELECT_LAST':
                for (const capture of this.possibleCaptures) {
                    this.selectableCoords = this.selectableCoords.unionList(capture.capturedSpaces);
                }
                break;
            case 'INITIAL_CAPTURE_SELECT_RING':
            case 'FINAL_CAPTURE_SELECT_RING':
                this.selectableCoords =
                    this.selectableCoords.unionList(this.constructedState.getRingCoords(currentPlayer));
                break;
            case 'MOVE_START':
                if (this.getState().isInitialPlacementPhase() === false) {
                    this.selectableCoords =
                        this.selectableCoords.unionList(this.constructedState.getRingCoords(currentPlayer));
                }
                break;
            case 'MOVE_END':
                this.viewInfo.targets =
                    this.rules.getRingTargets(this.constructedState, this.moveStart.get());
                break;
        }
    }

    private showCurrentMoveCaptures(): void {
        this.selectedCoords = new CoordSet();
        if (this.currentCapture.isPresent()) {
            this.markCapture(this.currentCapture.get());
        }
        for (const capture of this.initialCaptures) {
            this.markCapture(capture);
        }
        for (const capture of this.finalCaptures) {
            this.markCapture(capture);
        }
    }

    protected getSpaceClasses(x: number, y: number): string[] {
        const coord: Coord = new Coord(x, y);
        if (this.isInLastCapture(coord)) {
            return ['captured-fill'];
        } else if (this.currentlyMoved.concat(this.lastMoved).some((c: Coord) => c.equals(coord))) {
            return ['moved-fill'];
        } else {
            return [];
        }
    }

    private isInLastCapture(coord: Coord): boolean {
        return this.isCapturedMarker(coord, this.lastCaptures) ||
               this.isCapturedRing(coord, this.lastCaptures);
    }

    private isCapturedMarker(coord: Coord, captures: YinshCapture[]): boolean {
        return captures.some((capture: YinshCapture) => capture.capturedSpaces.some((c: Coord) => c.equals(coord)));
    }

    private isCapturedRing(coord: Coord, captures: YinshCapture[]): boolean {
        return captures.some((capture: YinshCapture) => capture.ringTaken.equalsValue(coord));
    }

    public getPieceGroupClasses(x: number, y: number): string[] {
        const coord: Coord = new Coord(x, y);
        const classes: string[] = [];
        const allSelected: CoordSet = this.selectedCoords.union(this.selectedRings);
        if (allSelected.contains(coord) || this.isInLastCapture(coord)) {
            return ['semi-transparent'];
        } else {
            return classes;
        }
    }

    public isMarker(x: number, y: number): boolean {
        const coord: Coord = new Coord(x, y);
        if (x === 5 && y ===5) console.log(this.constructedState.getPieceAt(coord))
        return this.constructedState.getPieceAt(coord).isMarker() ||
               this.moveStart.equalsValue(coord) ||
               this.isCapturedMarker(coord, this.lastCaptures) ||
               this.selectedCoords.contains(coord);
    }

    public getMarkerClasses(x: number, y: number): string [] {
        const coord: Coord = new Coord(x, y);
        const piece: YinshPiece = this.constructedState.getPieceAt(coord);
        const classes: string[] = [];
        const currentPlayerClass: string = this.getPlayerClass(this.getCurrentPlayer());
        if (piece.isMarker()) {
            const playerClass: string = this.getPlayerClass(piece.player);
            classes.push(playerClass);
        } else if (this.moveStart.equalsValue(coord)) {
            classes.push(currentPlayerClass);
        }
        if (this.selectedCoords.contains(coord)) {
            classes.push(currentPlayerClass);
        }
        if (this.isCapturedMarker(coord, this.lastCaptures)) {
            const currentOpponentClass: string = this.getPlayerClass(this.getCurrentOpponent());
            classes.push(currentOpponentClass);
        }
        return classes;
    }

    public isRing(x: number, y: number): boolean {
        const coord: Coord = new Coord(x, y);
        if (x === 5 && y ===5) console.log('isRing', this.constructedState.getPieceAt(coord).isRing)
        return this.constructedState.getPieceAt(coord).isRing ||
               this.moveEnd.equalsValue(coord) ||
               this.isInitialCaptureRing(coord) ||
               this.isCapturedRing(coord, this.lastCaptures);
    }

    private isInitialCaptureRing(coord: Coord): boolean {
        return this.initialCaptures.some((capture: YinshCapture) => capture.ringTaken.equalsValue(coord));
    }

    public getRingClasses(x: number, y: number): string[] {
        const coord: Coord = new Coord(x, y);
        const piece: YinshPiece = this.constructedState.getPieceAt(coord);
        let owner: PlayerOrNone = piece.player;
        const classes: string[] = [];
        if (this.isCapturedRing(coord, this.lastCaptures) ||
            this.selectedRings.contains(coord))
        {
            classes.push('semi-transparent');
            owner = this.getCurrentOpponent();
        }
        if (this.isInitialCaptureRing(coord)) {
            owner = this.getCurrentPlayer();
        }
        const playerClass: string = this.getPlayerClass(owner, 'stroke');
        classes.push(playerClass);
        return classes;
    }

    public override cancelMoveAttempt(): void {
        this.constructedState = this.getState();
        this.possibleCaptures = [];
        this.initialCaptures = [];
        this.finalCaptures = [];
        this.selectedCoords = new CoordSet();
        this.selectedRings = new CoordSet();
        this.currentCapture = MGPOptional.empty();
        this.moveStart = MGPOptional.empty();
        this.moveEnd = MGPOptional.empty();
        this.currentlyMoved = [];
        this.removed = [];
        this.moveToInitialCaptureOrMovePhase();
    }

    public override async showLastMove(move: YinshMove): Promise<void> {
        if (move.isInitialPlacement()) {
            this.lastMoved = [move.start];
        } else {
            this.lastMoved = this.coordsBetween(move.start, move.end.get());
            this.lastCaptures = [];
            this.lastCaptures = this.lastCaptures.concat(move.initialCaptures).concat(move.finalCaptures);
        }
    }

    public override hideLastMove(): void {
        this.lastMoved = [];
        this.lastCaptures = [];
    }

    private coordsBetween(start: Coord, end: Coord): Coord[] {
        return start.getAllCoordsToward(end);
    }

    private moveToInitialCaptureOrMovePhase(): MGPValidation {
        this.possibleCaptures = this.rules.getPossibleCaptures(this.constructedState);
        if (this.possibleCaptures.length === 0) {
            this.movePhase = 'MOVE_START';
        } else {
            this.movePhase = 'INITIAL_CAPTURE_SELECT_FIRST';
        }
        this.updateViewInfo();
        return MGPValidation.SUCCESS;
    }

    public async onClick(x: number, y: number): Promise<MGPValidation> {
        const coord: Coord = new Coord(x, y);
        const clickValidity: MGPValidation = await this.canUserPlay('#click_' + coord.x + '_' + coord.y);
        if (clickValidity.isFailure()) {
            return this.cancelMove(clickValidity.getReason());
        }
        switch (this.movePhase) {
            case 'INITIAL_CAPTURE_SELECT_FIRST':
            case 'FINAL_CAPTURE_SELECT_FIRST':
                return this.selectCaptureFirstCoord(coord);
            case 'INITIAL_CAPTURE_SELECT_LAST':
            case 'FINAL_CAPTURE_SELECT_LAST':
                return this.selectCaptureLastCoord(coord);
            case 'INITIAL_CAPTURE_SELECT_RING':
            case 'FINAL_CAPTURE_SELECT_RING':
                return this.selectRing(coord);
            case 'MOVE_START':
                return this.selectMoveStart(coord);
            case 'MOVE_END':
                return this.selectMoveEnd(coord);
        }
    }

    private async selectCaptureFirstCoord(coord: Coord): Promise<MGPValidation> {
        const captures: YinshCapture[] = [];
        this.possibleCaptures.forEach((candidate: YinshCapture) => {
            if (candidate.contains(coord)) {
                captures.push(candidate);
            }
        });
        if (captures.length > 1) {
            this.moveToCaptureSelectLast(captures);
        } else if (captures.length === 0) {
            return this.cancelMove(YinshFailure.MISSING_CAPTURES());
        } else {
            this.selectCapture(captures[0]);
        }
        return MGPValidation.SUCCESS;
    }

    private moveToCaptureSelectLast(possibleCaptures: YinshCapture[]): void {
        this.selectableCoords = new CoordSet();
        this.possibleCaptures = possibleCaptures;
        for (const capture of possibleCaptures) {
            this.selectableCoords = this.selectableCoords.unionList(capture.capturedSpaces);
        }
        if (this.movePhase === 'INITIAL_CAPTURE_SELECT_FIRST') {
            this.movePhase = 'INITIAL_CAPTURE_SELECT_LAST';
        } else {
            Utils.expectToBe(this.movePhase, 'FINAL_CAPTURE_SELECT_FIRST', 'moveToCaptureSelectLast did not expect to be called in movePhase' + this.movePhase);
            this.movePhase = 'FINAL_CAPTURE_SELECT_LAST';
        }
    }

    private async selectCaptureLastCoord(coord: Coord): Promise<MGPValidation> {
        const captures: YinshCapture[] = [];
        this.possibleCaptures.forEach((candidate: YinshCapture) => {
            if (candidate.contains(coord)) {
                captures.push(candidate);
            }
        });
        if (captures.length > 1) {
            return this.cancelMove(YinshFailure.AMBIGUOUS_CAPTURE_COORD());
        } else if (captures.length === 0) {
            return this.cancelMove(YinshFailure.MISSING_CAPTURES());
        } else {
            return this.selectCapture(captures[0]);
        }
    }

    private selectCapture(capture: YinshCapture): MGPValidation {
        this.currentCapture = MGPOptional.of(capture);
        this.constructedState = new YinshState(
            this.rules.applyCaptureWithoutTakingRing(this.constructedState, capture),
            this.constructedState.sideRings,
            this.constructedState.turn);

        if (this.movePhase === 'INITIAL_CAPTURE_SELECT_FIRST' ||
            this.movePhase === 'INITIAL_CAPTURE_SELECT_LAST')
        {
            this.movePhase = 'INITIAL_CAPTURE_SELECT_RING';
        } else {
            const message: string = 'selectCapture did not expect to be called in movePhase ' + this.movePhase;
            Utils.assert(this.movePhase === 'FINAL_CAPTURE_SELECT_FIRST' || this.movePhase === 'FINAL_CAPTURE_SELECT_LAST', message);
            this.movePhase = 'FINAL_CAPTURE_SELECT_RING';
        }
        this.updateViewInfo();
        return MGPValidation.SUCCESS;
    }

    private markCapture(capture: YinshCapture): void {
        this.selectedCoords = this.selectedCoords.unionList(capture.capturedSpaces);
        if (capture.ringTaken.isPresent()) {
            this.selectedRings = this.selectedRings.addElement(capture.ringTaken.get());
        }
    }

    private async selectRing(coord: Coord): Promise<MGPValidation> {
        const validity: MGPValidation = this.rules.ringSelectionValidity(this.constructedState, coord);
        if (validity.isFailure()) {
            return this.cancelMove(validity.getReason());
        }
        this.constructedState = this.rules.takeRing(this.constructedState, coord);
        const capture: YinshCapture = this.currentCapture.get().setRingTaken(coord);
        this.currentCapture = MGPOptional.empty();

        this.possibleCaptures = this.rules.getPossibleCaptures(this.constructedState);

        switch (this.movePhase) {
            case 'INITIAL_CAPTURE_SELECT_RING':
                this.initialCaptures.push(capture);
                if (this.possibleCaptures.length === 0) {
                    return this.moveToMovePhase();
                } else {
                    this.movePhase = 'INITIAL_CAPTURE_SELECT_FIRST';
                    this.updateViewInfo();
                    return MGPValidation.SUCCESS;
                }
            default:
                Utils.expectToBe(this.movePhase, 'FINAL_CAPTURE_SELECT_RING');
                this.finalCaptures.push(capture);
                if (this.possibleCaptures.length === 0) {
                    return this.tryMove();
                } else {
                    this.movePhase = 'FINAL_CAPTURE_SELECT_FIRST';
                    this.updateViewInfo();
                    return MGPValidation.SUCCESS;
                }
        }
    }

    private moveToMovePhase(): MGPValidation {
        this.movePhase = 'MOVE_START';
        this.updateViewInfo();
        return MGPValidation.SUCCESS;
    }

    private async tryMove(): Promise<MGPValidation> {
        const move: YinshMove = new YinshMove(this.initialCaptures,
                                              this.moveStart.get(),
                                              this.moveEnd,
                                              this.finalCaptures);
        const validity: MGPValidation = await this.chooseMove(move);
        return validity;
    }

    private async selectMoveStart(coord: Coord): Promise<MGPValidation> {
        if (this.constructedState.isInitialPlacementPhase()) {
            console.log('selectMoveStart > isInitialPlacementPhase')
            const validity: MGPFallible<YinshLegalityInformation> =
                this.rules.initialPlacementValidity(this.constructedState, coord);
            if (validity.isFailure()) {
                return this.cancelMove(validity.getReason());
            }
            this.moveStart = MGPOptional.of(coord);
            return this.tryMove();
        } else {
            console.log('selectMoveStart > NOT isInitialPlacementPhase')
            const validity: MGPValidation = this.rules.moveStartValidity(this.constructedState, coord);
            if (validity.isFailure()) {
                return this.cancelMove(validity.getReason());
            }
            this.moveStart = MGPOptional.of(coord);
            this.movePhase = 'MOVE_END';
            this.updateViewInfo();
        }
        return MGPValidation.SUCCESS;
    }

    private async selectMoveEnd(coord: Coord): Promise<MGPValidation> {
        if (this.moveStart.equalsValue(coord)) {
            return this.cancelMove();
        }
        const currentPlayerRing: YinshPiece = YinshPiece.RINGS.get(this.getState().getCurrentPlayer());
        if (this.constructedState.getPieceAt(coord) === currentPlayerRing) {
            this.cancelMoveAttempt();
            return this.selectMoveStart(coord);
        }
        const validity: MGPValidation = this.rules.moveValidity(this.constructedState, this.moveStart.get(), coord);
        if (validity.isFailure()) {
            return this.cancelMove(validity.getReason());
        }
        this.moveEnd = MGPOptional.of(coord);
        this.currentlyMoved = this.coordsBetween(this.moveStart.get(), coord);
        this.constructedState = this.rules.applyRingMoveAndFlip(this.moveStart.get(), coord, this.constructedState);
        this.updateViewInfo();
        return this.moveToFinalCapturePhaseOrTryMove();
    }

    private async moveToFinalCapturePhaseOrTryMove(): Promise<MGPValidation> {
        this.possibleCaptures = this.rules.getPossibleCaptures(this.constructedState);
        if (this.possibleCaptures.length === 0) {
            return this.tryMove();
        } else {
            this.movePhase = 'FINAL_CAPTURE_SELECT_FIRST';
            this.updateViewInfo();
            return MGPValidation.SUCCESS;
        }
    }

}
