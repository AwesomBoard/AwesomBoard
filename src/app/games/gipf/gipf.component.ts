import { ChangeDetectorRef, Component } from '@angular/core';
import { MGPFallible, MGPOptional, MGPValidation, Utils, MGPMap } from '@everyboard/lib';

import { Coord } from 'src/app/jscaip/Coord';
import { HexaLayout } from 'src/app/jscaip/HexaLayout';
import { FlatHexaOrientation } from 'src/app/jscaip/HexaOrientation';
import { Player } from 'src/app/jscaip/Player';
import { HexaDirection } from 'src/app/jscaip/HexaDirection';
import { HexagonalGameComponent } from '../../components/game-components/game-component/HexagonalGameComponent';
import { FourStatePiece } from 'src/app/jscaip/FourStatePiece';
import { Arrow } from 'src/app/components/game-components/arrow-component/Arrow';
import { MessageDisplayer } from 'src/app/services/MessageDisplayer';
import { MCTS } from 'src/app/jscaip/AI/MCTS';
import { EmptyRulesConfig } from 'src/app/jscaip/RulesConfigUtil';
import { PlayerNumberMap } from 'src/app/jscaip/PlayerMap';

import { GipfLegalityInformation, GipfRules } from 'src/app/games/gipf/GipfRules';
import { GipfFailure } from 'src/app/games/gipf/GipfFailure';
import { GipfMove, GipfPlacement } from 'src/app/games/gipf/GipfMove';
import { GipfState } from 'src/app/games/gipf/GipfState';
import { GipfMoveGenerator } from './GipfMoveGenerator';
import { GipfCapture } from 'src/app/jscaip/GipfProjectHelper';
import { GipfScoreMinimax } from './GipfScoreMinimax';
import { ViewBox } from 'src/app/components/game-components/GameComponentUtils';

@Component({
    selector: 'app-gipf',
    templateUrl: './gipf.component.html',
    styleUrls: ['../../components/game-components/game-component/game-component.scss'],
})
export class GipfComponent extends HexagonalGameComponent<GipfRules,
                                                          GipfMove,
                                                          GipfState,
                                                          FourStatePiece,
                                                          EmptyRulesConfig,
                                                          GipfLegalityInformation>
{
    private static readonly PHASE_INITIAL_CAPTURE: number = 0;
    private static readonly PHASE_PLACEMENT_COORD: number = 1;
    private static readonly PHASE_PLACEMENT_DIRECTION: number = 2;
    private static readonly PHASE_FINAL_CAPTURE: number = 3;

    public inserted: MGPOptional<Arrow<HexaDirection>> = MGPOptional.empty();
    public arrows: Arrow<HexaDirection>[] = [];
    public captured: MGPMap<Coord, Player> = new MGPMap();
    public moved: Coord[] = [];

    public readonly hexagonWidth: number = this.SPACE_SIZE;
    public readonly sharedHexagonX: number = Math.cos(30) * this.hexagonWidth * 0.5;
    public readonly boardWidth: number = this.hexagonWidth +
                                         (6 * (this.hexagonWidth - this.sharedHexagonX)) +
                                         (3 * this.STROKE_WIDTH / 2);
    public readonly boardHeight: number = (7 * this.hexagonWidth) + (4.5 * this.STROKE_WIDTH);
    private movePhase: number = GipfComponent.PHASE_PLACEMENT_COORD;

    // This state contains the board that is actually displayed
    private constructedState: GipfState;

    public possibleCaptures: ReadonlyArray<GipfCapture> = [];
    private initialCaptures: GipfCapture[] = [];
    private placement: MGPOptional<GipfPlacement> = MGPOptional.empty();
    private placementEntrance: MGPOptional<Coord> = MGPOptional.empty();
    private finalCaptures: GipfCapture[] = [];

    public constructor(messageDisplayer: MessageDisplayer, cdr: ChangeDetectorRef) {
        super(messageDisplayer, cdr);
        this.setRulesAndNode('Gipf');
        this.availableAIs = [
            new GipfScoreMinimax(),
            new MCTS($localize`MCTS`, new GipfMoveGenerator(), this.rules),
        ];
        this.encoder = GipfMove.encoder;
        this.hasAsymmetricBoard = true;
        this.scores = MGPOptional.of(PlayerNumberMap.of(0, 0));

        this.SPACE_SIZE = 40;
        this.constructedState = this.getState();
        this.hexaLayout = new HexaLayout(this.SPACE_SIZE * 1.50,
                                         new Coord((this.hexagonWidth / 2) + (3 * this.STROKE_WIDTH/ 4),
                                                   - this.hexagonWidth),
                                         FlatHexaOrientation.INSTANCE);
    }

    public override async updateBoard(_triggerAnimation: boolean): Promise<void> {
        this.constructedState = this.getState();
        this.scores = MGPOptional.of(this.constructedState.getScores());
        this.moveToInitialCaptureOrPlacementPhase();
    }

    public override async showLastMove(move: GipfMove): Promise<void> {
        const previousState: GipfState = this.getPreviousState();
        move.initialCaptures.forEach((c: GipfCapture) => this.markCapture(c, previousState));
        const stateAfterInitialCaptures: GipfState = GipfRules.applyCaptures(move.initialCaptures, previousState);
        const stateAfterPlacement: GipfState = GipfRules.applyPlacement(move.placement, stateAfterInitialCaptures);
        move.finalCaptures.forEach((c: GipfCapture) => this.markCapture(c, stateAfterPlacement));
        this.moved = this.rules.getPiecesMoved(previousState, move.initialCaptures, move.placement);
        this.inserted = MGPOptional.empty();
        if (move.placement.direction.isPresent()) {
            const lastPlacement: GipfPlacement = move.placement;
            this.inserted = MGPOptional.of(this.arrowTowards(lastPlacement.coord, lastPlacement.direction.get()));
        }
    }

    public getViewBox(): ViewBox {
        return new ViewBox(
            -this.STROKE_WIDTH,
            0,
            this.boardWidth,
            this.boardHeight,
        );
    }

    private arrowTowards(placement: Coord, direction: HexaDirection): Arrow<HexaDirection> {
        const previous: Coord = placement.getNext(direction.getOpposite());
        return new Arrow<HexaDirection>(previous,
                                        placement,
                                        direction,
                                        (c: Coord) => this.getCenterAt(c));
    }

    private markCapture(capture: GipfCapture, constructedState: GipfState): void {
        capture.forEach((coord: Coord) => {
            const capturedPiece: Player = constructedState.getPieceAt(coord).getPlayer() as Player;
            this.captured.put(coord, capturedPiece);
        });
    }

    public getAllCoords(): Coord[] {
        return this.constructedState.allCoords();
    }

    public getPlayerSidePieces(player: Player): number[] {
        const nPieces: number = this.constructedState.getNumberOfPiecesToPlace(player);
        const pieces: number[] = [];
        for (let i: number = 0; i < nPieces; i += 1) {
            pieces.push(i);
        }
        return pieces;
    }

    public isPiece(coord: Coord): boolean {
        const piece: FourStatePiece = this.getPiece(coord);
        return piece !== FourStatePiece.EMPTY;
    }

    private getPiece(coord: Coord): FourStatePiece {
        const piece: FourStatePiece = this.constructedState.getPieceAt(coord);
        return piece;
    }

    public async onClick(coord: Coord): Promise<MGPValidation> {
        const clickValidity: MGPValidation = await this.canUserPlay('#click-' + coord.x + '-' + coord.y);
        if (clickValidity.isFailure()) {
            return this.cancelMove(clickValidity.getReason());
        }
        switch (this.movePhase) {
            case GipfComponent.PHASE_INITIAL_CAPTURE:
            case GipfComponent.PHASE_FINAL_CAPTURE:
                return this.selectCapture(coord);
            case GipfComponent.PHASE_PLACEMENT_COORD:
                return this.selectPlacementCoord(coord);
            default:
                Utils.expectToBe(this.movePhase, GipfComponent.PHASE_PLACEMENT_DIRECTION);
                return this.selectPlacementDirectionOrPlacementCoord(coord);
        }
    }

    private async selectCapture(coord: Coord): Promise<MGPValidation> {
        const captures: GipfCapture[] = [];
        this.possibleCaptures.forEach((candidate: GipfCapture) => {
            if (candidate.contains(coord)) {
                captures.push(candidate);
            }
        });
        if (captures.length > 1) {
            // Two captures contain this coordinate
            // We don't let the user choose it as it is ambiguous
            return this.cancelMove(GipfFailure.AMBIGUOUS_CAPTURE_COORD());
        } else if (captures.length === 0) {
            return this.cancelMove(GipfFailure.MISSING_CAPTURES());
        }
        const capture: GipfCapture = captures[0];

        // Capture validity is not checked because by construction the user can only select valid captures
        this.markCapture(capture, this.constructedState);
        this.constructedState = GipfRules.applyCapture(capture, this.constructedState);
        this.possibleCaptures = GipfRules.getPossibleCaptures(this.constructedState);
        switch (this.movePhase) {
            case GipfComponent.PHASE_INITIAL_CAPTURE:
                this.initialCaptures.push(capture);
                if (this.possibleCaptures.length === 0) {
                    return this.moveToPlacementPhase();
                } else {
                    return MGPValidation.SUCCESS;
                }
            default:
                Utils.expectToBe(this.movePhase, GipfComponent.PHASE_FINAL_CAPTURE);
                this.finalCaptures.push(capture);
                if (this.possibleCaptures.length === 0) {
                    return this.tryMove(this.initialCaptures, this.placement.get(), this.finalCaptures);
                } else {
                    return MGPValidation.SUCCESS;
                }
        }
    }

    private moveToPlacementPhase(): MGPValidation {
        this.movePhase = GipfComponent.PHASE_PLACEMENT_COORD;
        return MGPValidation.SUCCESS;
    }

    private moveToInitialCaptureOrPlacementPhase(): MGPValidation {
        this.possibleCaptures = GipfRules.getPossibleCaptures(this.constructedState);
        if (this.possibleCaptures.length === 0) {
            this.movePhase = GipfComponent.PHASE_PLACEMENT_COORD;
        } else {
            this.movePhase = GipfComponent.PHASE_INITIAL_CAPTURE;
        }
        return MGPValidation.SUCCESS;
    }

    private async moveToFinalCapturePhaseOrTryMove(): Promise<MGPValidation> {
        this.possibleCaptures = GipfRules.getPossibleCaptures(this.constructedState);
        if (this.possibleCaptures.length === 0) {
            return this.tryMove(this.initialCaptures, this.placement.get(), this.finalCaptures);
        } else {
            this.movePhase = GipfComponent.PHASE_FINAL_CAPTURE;
        }
        return MGPValidation.SUCCESS;
    }

    private computeArrows(placement: Coord): void {
        this.arrows = [];
        for (const dir of GipfRules.getAllDirectionsForEntrance(this.constructedState, placement)) {
            if (GipfRules.isLineComplete(this.constructedState, placement, dir) === false) {
                const nextSpace: Coord = placement.getNext(dir);
                this.arrows.push(
                    new Arrow<HexaDirection>(placement, nextSpace, dir, (c: Coord) => this.getCenterAt(c)),
                );
            }
        }
    }

    private async selectPlacementCoord(coord: Coord): Promise<MGPValidation> {
        const validity: MGPValidation = this.rules.placementCoordValidity(this.constructedState, coord);
        if (validity.isFailure()) {
            return this.cancelMove(validity.getReason());
        }
        if (this.placementEntrance.equalsValue(coord)) {
            return this.cancelMove();
        }
        this.placementEntrance = MGPOptional.of(coord);
        const clickedPiece: FourStatePiece = this.constructedState.getPieceAt(coord);
        if (clickedPiece === FourStatePiece.EMPTY) {
            // Because the coord of insertion is empty, there is no need for the user to choose a direction.
            return this.selectPlacementDirection(MGPOptional.empty());
        } else {
            this.movePhase = GipfComponent.PHASE_PLACEMENT_DIRECTION;
            this.computeArrows(coord);
            if (this.arrows.length === 0) {
                await this.cancelMove(GipfFailure.NO_DIRECTIONS_AVAILABLE());
            }
        }
        return MGPValidation.SUCCESS;
    }

    private async selectPlacementDirection(dir: MGPOptional<HexaDirection>): Promise<MGPValidation> {
        this.placement = MGPOptional.of(new GipfPlacement(this.placementEntrance.get(), dir));
        const validity: MGPValidation = this.rules.placementValidity(this.constructedState, this.placement.get());
        if (validity.isFailure()) {
            return this.cancelMove(validity.getReason());
        }
        this.arrows = [];
        this.constructedState = GipfRules.applyPlacement(this.placement.get(), this.constructedState);
        return this.moveToFinalCapturePhaseOrTryMove();
    }

    private async selectPlacementDirectionOrPlacementCoord(coord: Coord): Promise<MGPValidation> {
        const entrance: Coord = this.placementEntrance.get();
        if (entrance.isAlignedWith(coord) === false ||
            entrance.getLinearDistanceToward(coord) !== 1)
        {
            return this.selectPlacementCoord(coord);
        }
        const direction: MGPFallible<HexaDirection> = HexaDirection.factory.fromMove(entrance, coord);
        return this.selectPlacementDirection(direction.toOptional());
    }

    private tryMove(initialCaptures: ReadonlyArray<GipfCapture>,
                    placement: GipfPlacement,
                    finalCaptures: ReadonlyArray<GipfCapture>): Promise<MGPValidation> {
        const move: GipfMove = new GipfMove(placement, initialCaptures, finalCaptures);
        return this.chooseMove(move);
    }

    public override cancelMoveAttempt(): void {
        this.constructedState = this.getState();
        this.captured = new MGPMap();
        this.moved = [];
        this.initialCaptures = [];
        this.finalCaptures = [];
        this.placementEntrance = MGPOptional.empty();
        this.placement = MGPOptional.empty();
        this.arrows = [];
        this.moveToInitialCaptureOrPlacementPhase();
    }

    public override hideLastMove(): void {
        this.arrows = [];
        this.inserted = MGPOptional.empty();
    }

    public getSpaceClass(coord: Coord): string {
        if (this.isCapturedPiece(coord)) {
            return 'captured-fill';
        } else if (this.moved.some((c: Coord) => c.equals(coord))) {
            return 'moved-fill';
        } else {
            return '';
        }
    }

    public getPieceClass(coord: Coord): string {
        const piece: FourStatePiece = this.getPiece(coord);
        return this.getPlayerClass(piece.getPlayer());
    }

    public getRemainingPieceCy(player: Player): number {
        const absoluteY: number = 25;
        if (player === Player.ONE) {
            return absoluteY;
        } else {
            return this.boardHeight - absoluteY;
        }
    }

    public getRemainingPieceCx(player: Player, p: number): number {
        const absoluteX: number = 20 + (p * this.SPACE_SIZE * 0.5);
        if (player === Player.ONE) {
            return absoluteX;
        } else {
            return this.boardWidth - (15 + absoluteX);
        }
    }

    public isCapturedPiece(coord: Coord): boolean {
        return this.captured.getKeyList().some((c: Coord) => c.equals(coord));
    }

    public getCapturedPieceClass(coord: Coord): string {
        const previousPiece: Player = this.captured.get(coord).get();
        return this.getPlayerClass(previousPiece, 'fill');
    }

}
