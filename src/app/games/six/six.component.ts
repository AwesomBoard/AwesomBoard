import { Component } from '@angular/core';
import { SixState } from 'src/app/games/six/SixState';
import { SixMove } from 'src/app/games/six/SixMove';
import { SixFailure } from 'src/app/games/six/SixFailure';
import { SixLegalityInformation, SixRules } from 'src/app/games/six/SixRules';
import { Coord } from 'src/app/jscaip/Coord';
import { HexaLayout } from 'src/app/jscaip/HexaLayout';
import { FlatHexaOrientation } from 'src/app/jscaip/HexaOrientation';
import { Player, PlayerOrNone } from 'src/app/jscaip/Player';
import { MGPSet } from 'src/app/utils/MGPSet';
import { MGPValidation } from 'src/app/utils/MGPValidation';
import { HexagonalGameComponent }
    from '../../components/game-components/game-component/HexagonalGameComponent';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { MessageDisplayer } from 'src/app/services/MessageDisplayer';
import { MGPOptional } from 'src/app/utils/MGPOptional';
import { MGPFallible } from 'src/app/utils/MGPFallible';
import { ViewBox } from 'src/app/components/game-components/GameComponentUtils';
import { MCTS } from 'src/app/jscaip/AI/MCTS';
import { Minimax } from 'src/app/jscaip/AI/Minimax';
import { EmptyRulesConfig } from 'src/app/jscaip/RulesConfigUtil';
import { SixHeuristic } from './SixHeuristic';
import { SixMoveGenerator } from './SixMoveGenerator';
import { SixFilteredMoveGenerator } from './SixFilteredMoveGenerator';

@Component({
    selector: 'app-six',
    templateUrl: './six.component.html',
    styleUrls: ['../../components/game-components/game-component/game-component.scss'],
})
export class SixComponent
    extends HexagonalGameComponent<SixRules, SixMove, SixState, Player, EmptyRulesConfig, SixLegalityInformation>
{
    public state: SixState;

    public pieces: Coord[];
    public disconnectedCoords: Coord[] = [];
    public cuttableGroups: Coord[][] = [];
    public victoryCoords: Coord[];
    public neighbors: Coord[];
    public leftCoord: MGPOptional<Coord> = MGPOptional.empty();
    public lastDrop: MGPOptional<Coord> = MGPOptional.empty();

    public selectedPiece: MGPOptional<Coord> = MGPOptional.empty();
    public chosenLanding: MGPOptional<Coord> = MGPOptional.empty();

    private nextClickShouldSelectGroup: boolean = false;

    public constructor(messageDisplayer: MessageDisplayer) {
        super(messageDisplayer);
        this.setRulesAndNode('Six');
        this.availableAIs = [
            new Minimax($localize`Minimax`, this.rules, new SixHeuristic(), new SixFilteredMoveGenerator()),
            new MCTS($localize`MCTS`, new SixMoveGenerator(), this.rules),
        ];
        this.encoder = SixMove.encoder;
        this.SPACE_SIZE = 30;
        this.hexaLayout = new HexaLayout(this.SPACE_SIZE * 1.50,
                                         new Coord(this.SPACE_SIZE * 2, 0),
                                         FlatHexaOrientation.INSTANCE);
    }

    public override async cancelMoveAttempt(): Promise<void> {
        this.selectedPiece = MGPOptional.empty();
        this.chosenLanding = MGPOptional.empty();
        this.cuttableGroups = [];
        this.nextClickShouldSelectGroup = false;
        this.resetPieceAndNeighbors();
    }

    public async updateBoard(_triggerAnimation: boolean): Promise<void> {
        this.resetPieceAndNeighbors();
    }

    private resetPieceAndNeighbors(): void {
        this.state = this.node.gameState;
        this.pieces = this.state.getPieceCoords();
        this.neighbors = this.getEmptyNeighbors();
    }

    public override hideLastMove(): void {
        this.leftCoord = MGPOptional.empty();
        this.lastDrop = MGPOptional.empty();
        this.victoryCoords = [];
        this.disconnectedCoords = [];
    }

    public getViewBox(): ViewBox {
        const coords: Coord[] = this.pieces.concat(this.disconnectedCoords).concat(this.neighbors);
        return ViewBox
            .fromHexa(coords, this.hexaLayout, this.STROKE_WIDTH)
            .expandAbove(this.SPACE_SIZE + this.STROKE_WIDTH)
            .expandBelow(this.SPACE_SIZE + this.STROKE_WIDTH)
            .expandLeft(this.SPACE_SIZE + (2 * this.STROKE_WIDTH))
            .expandRight(this.SPACE_SIZE + (2 * this.STROKE_WIDTH));
    }

    public override async showLastMove(move: SixMove): Promise<void> {
        this.lastDrop = MGPOptional.of(move.landing);
        if (move.isDrop() === false) {
            this.leftCoord = MGPOptional.of(move.start.get());
        } else {
            this.leftCoord = MGPOptional.empty();
        }
        const state: SixState = this.getState();
        if (this.rules.getGameStatus(this.node).isEndGame) {
            this.victoryCoords = this.rules.getShapeVictory(move, state);
        }
        this.disconnectedCoords = this.getDisconnected();
    }

    private getDisconnected(): Coord[] {
        const oldPieces: Coord[] = this.getPreviousState().getPieceCoords();
        const newPieces: Coord[] = this.getState().getPieceCoords();
        const disconnecteds: Coord[] =[];
        for (const oldPiece of oldPieces) {
            const start: MGPOptional<Coord> = this.node.previousMove.get().start;
            if (start.equalsValue(oldPiece) === false &&
                newPieces.some((newCoord: Coord) => newCoord.equals(oldPiece)) === false)
            {
                disconnecteds.push(oldPiece);
            }
        }
        const lastDrop: Coord = this.lastDrop.get();
        if (this.pieces.some((coord: Coord) => coord.equals(lastDrop)) === false &&
            newPieces.some((coord: Coord) => coord.equals(lastDrop)) === false)
        {
            disconnecteds.push(lastDrop); // Dummy captured his own piece
        }
        return disconnecteds;
    }

    public getEmptyNeighbors(): Coord[] {
        let legalLandings: Coord[] = SixRules.getLegalLandings(this.state);
        if (this.chosenLanding.isPresent()) {
            const chosenLanding: Coord = this.chosenLanding.get();
            legalLandings = legalLandings.filter((c: Coord) => c.equals(chosenLanding) === false);
        }
        return legalLandings;
    }

    public getPieceClass(coord: Coord): string {
        const player: PlayerOrNone = this.getState().getPieceAt(coord);
        return this.getPlayerClass(player);
    }

    public async onPieceClick(piece: Coord): Promise<MGPValidation> {
        const clickValidity: MGPValidation = await this.canUserPlay('#piece_' + piece.x + '_' + piece.y);
        if (clickValidity.isFailure()) {
            return this.cancelMove(clickValidity.getReason());
        }
        if (this.state.turn < 40) {
            return this.cancelMove(SixFailure.NO_MOVEMENT_BEFORE_TURN_40());
        } else if (this.chosenLanding.isAbsent()) {
            if (this.state.getPieceAt(piece) === this.state.getCurrentOpponent()) {
                return this.cancelMove(RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_OPPONENT());
            } else if (this.selectedPiece.equalsValue(piece)) {
                return this.cancelMove();
            } else {
                this.selectedPiece = MGPOptional.of(piece);
                return MGPValidation.SUCCESS;
            }
        } else {
            const cuttingMove: SixMove = SixMove.ofCut(this.selectedPiece.get(),
                                                       this.chosenLanding.get(),
                                                       piece);
            return this.chooseMove(cuttingMove);
        }
    }

    public async onNeighborClick(neighbor: Coord): Promise<MGPValidation> {
        const clickValidity: MGPValidation = await this.canUserPlay('#neighbor_' + neighbor.x + '_' + neighbor.y);
        if (clickValidity.isFailure()) {
            return this.cancelMove(clickValidity.getReason());
        }
        if (this.nextClickShouldSelectGroup) {
            return this.cancelMove(SixFailure.MUST_CUT());
        }
        if (this.state.turn < 40) {
            return this.chooseMove(SixMove.ofDrop(neighbor));
        } else {
            if (this.selectedPiece.isAbsent()) {
                return this.cancelMove(SixFailure.CAN_NO_LONGER_DROP());
            } else {
                const movement: SixMove = SixMove.ofMovement(this.selectedPiece.get(), neighbor);
                const legality: MGPFallible<SixLegalityInformation> =
                    SixRules.isLegalPhaseTwoMove(movement, this.state);
                if (this.neededCutting(legality)) {
                    this.chosenLanding = MGPOptional.of(neighbor);
                    this.moveVirtuallyPiece();
                    this.showCuttable();
                    this.nextClickShouldSelectGroup = true;
                    return MGPValidation.SUCCESS;
                } else {
                    return this.chooseMove(movement);
                }
            }
        }
    }

    private neededCutting(legality: MGPFallible<SixLegalityInformation>): boolean {
        return legality.isFailure() && legality.getReason() === SixFailure.MUST_CUT();
    }

    private moveVirtuallyPiece(): void {
        const selectedPiece: Coord = this.selectedPiece.get();
        this.pieces = this.pieces.filter((c: Coord) => c.equals(selectedPiece) === false);
        this.neighbors = this.getEmptyNeighbors();
    }

    private showCuttable(): void {
        const movement: SixMove = SixMove.ofMovement(this.selectedPiece.get(), this.chosenLanding.get());
        const stateAfterMove: SixState = this.state.movePiece(movement);
        const groupsAfterMove: MGPSet<MGPSet<Coord>> = stateAfterMove.getGroups();
        const biggerGroups: MGPSet<MGPSet<Coord>> = SixRules.getLargestGroups(groupsAfterMove);
        this.cuttableGroups = [];
        for (const cuttableGroup of biggerGroups) {
            this.cuttableGroups.push(cuttableGroup.toList());
        }
    }

    public getSelectedPieceClass(): string {
        if (this.chosenLanding.isPresent()) {
            return 'moved-fill';
        } else {
            return 'selected-stroke';
        }
    }

}
