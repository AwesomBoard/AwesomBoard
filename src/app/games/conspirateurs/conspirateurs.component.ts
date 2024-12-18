import { ChangeDetectorRef, Component } from '@angular/core';
import { MGPFallible, MGPOptional, MGPValidation } from '@everyboard/lib';

import { GameComponent } from 'src/app/components/game-components/game-component/GameComponent';
import { Coord } from 'src/app/jscaip/Coord';
import { Vector } from 'src/app/jscaip/Vector';
import { PlayerOrNone } from 'src/app/jscaip/Player';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { MessageDisplayer } from 'src/app/services/MessageDisplayer';
import { ConspirateursMove, ConspirateursMoveDrop, ConspirateursMoveJump, ConspirateursMoveSimple } from './ConspirateursMove';
import { ConspirateursRules } from './ConspirateursRules';
import { ConspirateursState } from './ConspirateursState';
import { GameStatus } from 'src/app/jscaip/GameStatus';
import { MCTS } from 'src/app/jscaip/AI/MCTS';
import { ConspirateursMoveGenerator } from './ConspirateursMoveGenerator';
import { ConspirateursJumpMinimax } from './ConspirateursJumpMinimax';
import { PlayerNumberMap } from 'src/app/jscaip/PlayerMap';

interface ViewInfo {
    boardInfo: SquareInfo[][],
    dropPhase: boolean,
    victory: Coord[],
    lastMoveArrow: string,
    sidePieces: PlayerNumberMap,
}

interface SquareInfo {
    coord: Coord,
    squareClasses: string[],
    shelterClasses: string[],
    hasPieceToDraw: boolean,
    isShelter: boolean,
    isOccupiedShelter: boolean,
}

@Component({
    selector: 'app-conspirateurs',
    templateUrl: './conspirateurs.component.html',
    styleUrls: ['../../components/game-components/game-component/game-component.scss'],
})
export class ConspirateursComponent extends GameComponent<ConspirateursRules, ConspirateursMove, ConspirateursState> {

    public PIECE_RADIUS: number;
    public ALL_SHELTERS: Coord[] = ConspirateursState.ALL_SHELTERS;
    public CENTRAL_ZONE_START: Coord = ConspirateursState.CENTRAL_ZONE_TOP_LEFT;
    public CENTRAL_ZONE_SIZE: Vector = new Vector(
        ConspirateursState.CENTRAL_ZONE_BOTTOM_RIGHT.x - ConspirateursState.CENTRAL_ZONE_TOP_LEFT.x + 1,
        ConspirateursState.CENTRAL_ZONE_BOTTOM_RIGHT.y - ConspirateursState.CENTRAL_ZONE_TOP_LEFT.y + 1,
    );
    public viewInfo: ViewInfo = {
        dropPhase: true,
        boardInfo: [],
        victory: [],
        lastMoveArrow: '',
        sidePieces: PlayerNumberMap.of(20, 20),
    };
    private selected: MGPOptional<Coord> = MGPOptional.empty();

    private jumpInConstruction: MGPOptional<ConspirateursMoveJump> = MGPOptional.empty();

    public lastMoveArrow: MGPOptional<string> = MGPOptional.empty();

    private lastDrop: MGPOptional<Coord> = MGPOptional.empty();
    private lastJump: MGPOptional<ConspirateursMoveJump> = MGPOptional.empty();
    private lastStep: MGPOptional<ConspirateursMoveSimple> = MGPOptional.empty();
    private victoriousCoords: Coord[] = [];

    public constructor(messageDisplayer: MessageDisplayer, cdr: ChangeDetectorRef) {
        super(messageDisplayer, cdr);
        this.setRulesAndNode('Conspirateurs');
        this.availableAIs = [
            new ConspirateursJumpMinimax(),
            new MCTS($localize`MCTS`, new ConspirateursMoveGenerator(), this.rules),
        ];
        this.encoder = ConspirateursMove.encoder;
        this.PIECE_RADIUS = (this.SPACE_SIZE / 2) - this.STROKE_WIDTH;
    }

    public override async updateBoard(_triggerAnimation: boolean): Promise<void> {
        this.updateViewInfo();
    }

    private updateViewInfo(): void {
        const state: ConspirateursState = this.getState();
        this.viewInfo.dropPhase = state.isDropPhase();
        this.viewInfo.boardInfo = [];
        for (let y: number = 0; y < state.getHeight(); y++) {
            this.viewInfo.boardInfo.push([]);
            for (let x: number = 0; x < state.getWidth(); x++) {
                const coord: Coord = new Coord(x, y);
                const content: PlayerOrNone = state.getPieceAt(coord);
                const squareInfo: SquareInfo = {
                    coord,
                    squareClasses: [],
                    shelterClasses: ['no-fill'],
                    hasPieceToDraw: content.isPlayer(),
                    isShelter: false,
                    isOccupiedShelter: false,
                };
                this.viewInfo.boardInfo[y].push(squareInfo);
            }
        }
        this.viewInfo.sidePieces = state.getSidePieces();
        this.updateSelected();
        this.updateShelterHighlights();
    }

    private updateSelected(): void {
        if (this.selected.isPresent()) {
            if (this.jumpInConstruction.isPresent()) {
                const jump: ConspirateursMoveJump = this.jumpInConstruction.get();
                const jumpStart: Coord = jump.getStartingCoord();
                const jumpCurrent: Coord = jump.getEndingCoord();
                this.viewInfo.boardInfo[jumpStart.y][jumpStart.x].hasPieceToDraw = false;
                this.viewInfo.boardInfo[jumpCurrent.y][jumpCurrent.x].hasPieceToDraw = true;
                for (const coord of jump.coords) {
                    this.viewInfo.boardInfo[coord.y][coord.x].squareClasses.push('moved-fill');
                }
            }
        }
    }

    private updateShelterHighlights(): void {
        const state: ConspirateursState = this.getState();
        const gameStatus: GameStatus = ConspirateursRules.get().getGameStatus(this.node);
        const gameFinished: boolean = gameStatus.isEndGame;
        this.victoriousCoords = [];
        for (const shelter of ConspirateursState.ALL_SHELTERS) {
            const squareInfo: SquareInfo = this.viewInfo.boardInfo[shelter.y][shelter.x];
            const owner: PlayerOrNone = state.getPieceAt(shelter);
            const spaceIsOccupiedButNobodyWon: boolean = gameFinished === false && owner.isPlayer();
            const shelterBelongToWinner: boolean = gameFinished && owner === gameStatus.winner;
            if (shelterBelongToWinner || spaceIsOccupiedButNobodyWon)
            {
                squareInfo.shelterClasses.push('selectable-stroke');
                // squareInfo.pieceClasses.push('victory-stroke');
                this.victoriousCoords.push(shelter);
                squareInfo.squareClasses.push('victory-fill');
            }
        }
    }

    public hasPieceToDraw(x: number, y: number): boolean {
        const coord: Coord = new Coord(x, y);
        if (this.isStartingCoordOfMovingPiece(coord)) {
            return false;
        }
        return this.getState().getPieceAt(coord).isPlayer() ||
               this.isLandingCoordOfMovingPiece(coord);
    }

    private isStartingCoordOfMovingPiece(coord: Coord): boolean {
        return this.jumpInConstruction.isPresent() &&
               this.jumpInConstruction.get().getStartingCoord().equals(coord);
    }

    private isLandingCoordOfMovingPiece(coord: Coord): boolean {
        return this.jumpInConstruction.isPresent() &&
               this.jumpInConstruction.get().getEndingCoord().equals(coord);
    }

    public getPieceClasses(x: number, y: number): string[] {
        const coord: Coord = new Coord(x, y);
        const piece: PlayerOrNone = this.getState().getPieceAt(coord);
        const classes: string[] = [
            this.getPlayerClass(piece),
        ];
        if (this.selected.equalsValue(coord)) {
            classes.push('selected-stroke');
        }
        if (this.jumpInConstruction.isPresent() &&
            this.jumpInConstruction.get().coords.some((c: Coord) => c.equals(coord)))
        {
            const currentPlayerFill: string = this.getPlayerClass(this.getCurrentPlayer());
            classes.push('selected-stroke', currentPlayerFill);
        }
        if (this.victoriousCoords.some((c: Coord) => c.equals(coord))) {
            classes.push('victory-stroke');
        }
        return classes;
    }

    public getSpaceClasses(x: number, y: number): string[] {
        const coord: Coord = new Coord(x, y);
        if (this.isPartOfJumpInProgress(coord) ||
            this.isPartOfLastMove(coord))
        {
            return ['moved-fill'];
        } else if (this.victoriousCoords.some((c: Coord) => c.equals(coord))) {
            return ['victory-fill'];
        } else {
            return [];
        }
    }

    private isPartOfLastMove(coord: Coord): boolean {
        return this.lastDrop.equalsValue(coord) ||
               this.isPartOfLastJump(coord) ||
               this.isPartOfLastStep(coord);
    }

    private isPartOfLastStep(coord: Coord): boolean {
        return this.lastStep.isPresent() &&
               this.lastStep.get().getCoords().some((c: Coord) => c.equals(coord));
    }

    private isPartOfLastJump(coord: Coord): boolean {
        return this.lastJump.isPresent() &&
               this.lastJump.get().coords.some((c: Coord) => c.equals(coord));
    }

    private isPartOfJumpInProgress(coord: Coord): boolean {
        return this.jumpInConstruction.isPresent() &&
               this.jumpInConstruction.get().coords.some((c: Coord) => c.equals(coord));
    }

    public override async showLastMove(move: ConspirateursMove): Promise<void> {
        if (ConspirateursMove.isDrop(move)) {
            this.lastDrop = MGPOptional.of(move.coord);
        } else if (ConspirateursMove.isSimple(move)) {
            this.lastStep = MGPOptional.of(move);
        } else {
            let lastMoveArrow: string = '';
            for (const coord of move.coords) {
                this.viewInfo.boardInfo[coord.y][coord.x].squareClasses.push('moved-fill');
                lastMoveArrow += (coord.x * this.SPACE_SIZE) + this.SPACE_SIZE/2 + this.STROKE_WIDTH;
                lastMoveArrow += ' ';
                lastMoveArrow += (coord.y * this.SPACE_SIZE) + this.SPACE_SIZE/2 + this.STROKE_WIDTH;
                lastMoveArrow += ' ';
            }
            this.lastMoveArrow = MGPOptional.of(lastMoveArrow);
            this.lastJump = MGPOptional.of(move);
        }
    }

    public override hideLastMove(): void {
        this.lastMoveArrow = MGPOptional.empty();
        this.lastDrop = MGPOptional.empty();
        this.lastJump = MGPOptional.empty();
        this.lastStep = MGPOptional.empty();
    }

    public override async cancelMoveAttempt(): Promise<void> {

        this.jumpInConstruction = MGPOptional.empty();
        this.selected = MGPOptional.empty();
    }

    public async onClick(coord: Coord): Promise<MGPValidation> {
        const clickValidity: MGPValidation = await this.canUserPlay('#click_' + coord.x + '_' + coord.y);
        if (clickValidity.isFailure()) {
            return this.cancelMove(clickValidity.getReason());
        }

        const state: ConspirateursState = this.getState();
        const piece: PlayerOrNone = state.getPieceAt(coord);
        if (state.getPieceAt(coord) === this.getCurrentPlayer()) {
            if (this.selected.equalsValue(coord)) {
                return this.cancelMove();
            } else {
                this.selected = MGPOptional.of(coord);
                this.jumpInConstruction = MGPOptional.empty();
            }
            this.updateViewInfo();
            return MGPValidation.SUCCESS;
        } else if (this.jumpInConstruction.isPresent()) {
            return this.constructJump(coord);
        } else if (this.selected.isPresent()) {
            return this.selectNextCoord(coord);
        } else if (state.isDropPhase()) {
            const move: ConspirateursMove = ConspirateursMoveDrop.of(coord);
            return this.chooseMove(move);
        } else if (piece.isNone()) {
            return this.cancelMove(RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_EMPTY());
        } else {
            return this.cancelMove(RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_OPPONENT());
        }

    }

    private async constructJump(nextTarget: Coord): Promise<MGPValidation> {
        const jump: ConspirateursMoveJump = this.jumpInConstruction.get();
        const state: ConspirateursState = this.getState();
        if (nextTarget.equals(jump.getEndingCoord())) {
            // double clicking on an early destination performs the jump
            return this.chooseMove(jump);
        } else {
            const newJump: MGPFallible<ConspirateursMoveJump> = jump.addJump(nextTarget);
            if (newJump.isFailure()) {
                return this.cancelMove(newJump.getReason());
            }
            const jumpLegality: MGPValidation = this.rules.jumpLegality(newJump.get(), state);
            if (jumpLegality.isFailure()) {
                return this.cancelMove(jumpLegality.getReason());
            }
            return this.updateJump(newJump.get());
        }
    }

    private async updateJump(jump: ConspirateursMoveJump): Promise<MGPValidation> {
        const state: ConspirateursState = this.getState();
        if (this.rules.jumpHasPossibleNextTargets(jump, state)) {
            this.jumpInConstruction = MGPOptional.of(jump);
            this.updateViewInfo();
            return MGPValidation.SUCCESS;
        } else {
            return this.chooseMove(jump);
        }
    }

    private async selectNextCoord(coord: Coord): Promise<MGPValidation> {
        const selected: Coord = this.selected.get();
        const move: MGPFallible<ConspirateursMove> = ConspirateursMoveSimple.from(selected, coord);
        if (move.isSuccess()) {
            return this.chooseMove(move.get());
        } else {
            const jump: MGPFallible<ConspirateursMoveJump> = ConspirateursMoveJump.from([selected, coord]);
            if (jump.isFailure()) {
                return this.cancelMove(jump.getReason());
            }
            return this.updateJump(jump.get());
        }
    }

}
