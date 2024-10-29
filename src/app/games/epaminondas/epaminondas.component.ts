import { ChangeDetectorRef, Component } from '@angular/core';
import { MGPOptional, MGPValidation, Utils } from '@everyboard/lib';
import { EpaminondasMove } from 'src/app/games/epaminondas/EpaminondasMove';
import { EpaminondasState } from 'src/app/games/epaminondas/EpaminondasState';
import { EpaminondasConfig, EpaminondasLegalityInformation, EpaminondasNode, EpaminondasRules } from 'src/app/games/epaminondas/EpaminondasRules';
import { Coord } from 'src/app/jscaip/Coord';
import { Ordinal } from 'src/app/jscaip/Ordinal';
import { Player, PlayerOrNone } from 'src/app/jscaip/Player';
import { RectangularGameComponent } from '../../components/game-components/rectangular-game-component/RectangularGameComponent';
import { MessageDisplayer } from 'src/app/services/MessageDisplayer';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { EpaminondasFailure } from './EpaminondasFailure';
import { MCTS } from 'src/app/jscaip/AI/MCTS';
import { EpaminondasMoveGenerator } from './EpaminondasMoveGenerator';
import { EpaminondasAttackMinimax } from './EpaminondasAttackMinimax';
import { EpaminondasPositionalMinimax } from './EpaminondasPositionalMinimax';
import { EpaminondasMinimax } from './EpaminondasMinimax';
import { PlayerNumberMap } from 'src/app/jscaip/PlayerMap';
import { Arrow } from 'src/app/components/game-components/arrow-component/Arrow';

export type PossibleMove = {

    arrow: Arrow<Ordinal>;

    endingCoord: Coord;

    relatedMove: EpaminondasMove;
};

@Component({
    selector: 'app-epaminondas',
    templateUrl: './epaminondas.component.html',
    styleUrls: ['../../components/game-components/game-component/game-component.scss'],
})
export class EpaminondasComponent extends RectangularGameComponent<EpaminondasRules,
                                                                   EpaminondasMove,
                                                                   EpaminondasState,
                                                                   PlayerOrNone,
                                                                   EpaminondasConfig,
                                                                   EpaminondasLegalityInformation>
{

    public NONE: PlayerOrNone = PlayerOrNone.NONE;

    public firstPiece: MGPOptional<Coord> = MGPOptional.empty();

    public possibleMoves: PossibleMove[] = [];

    public lastPiece: MGPOptional<Coord> = MGPOptional.empty();

    private moveds: Coord[] = [];

    private capturedCoords: Coord[] = [];

    public constructor(messageDisplayer: MessageDisplayer, cdr: ChangeDetectorRef) {
        super(messageDisplayer, cdr);
        this.setRulesAndNode('Epaminondas');
        this.availableAIs = [
            new EpaminondasMinimax(),
            new EpaminondasPositionalMinimax(),
            new EpaminondasAttackMinimax(),
            new MCTS($localize`MCTS`, new EpaminondasMoveGenerator(), this.rules),
        ];
        this.encoder = EpaminondasMove.encoder;
        this.hasAsymmetricBoard = true;
    }

    public async updateBoard(_triggerAnimation: boolean): Promise<void> {
        this.board = this.getState().getCopiedBoard();
        this.scores = this.getScores();
    }

    private getScores(): MGPOptional<PlayerNumberMap> {
        const state: EpaminondasState = this.getState();
        const playerMap: PlayerNumberMap = PlayerNumberMap.of(
            state.count(Player.ZERO),
            state.count(Player.ONE),
        );
        return MGPOptional.of(playerMap);
    }

    public override async showLastMove(move: EpaminondasMove): Promise<void> {
        let moved: Coord = move.coord;
        this.moveds = [moved];
        for (let i: number = 1; i < (move.stepSize + move.phalanxSize); i++) {
            moved = moved.getNext(move.direction, 1);
            this.moveds.push(moved);
        }
        const previousNode: EpaminondasNode = this.node.parent.get();
        const previousOpponent: Player = this.getState().getPreviousOpponent();
        while (previousNode.gameState.isOnBoard(moved) &&
               previousNode.gameState.getPieceAt(moved) === previousOpponent)
        {
            this.capturedCoords.push(moved);
            moved = moved.getNext(move.direction, 1);
        }
    }

    public async onClick(x: number, y: number): Promise<MGPValidation> {
        const clickValidity: MGPValidation = await this.canUserPlay('#click-' + x + '-' + y);
        if (clickValidity.isFailure()) {
            return this.cancelMove(clickValidity.getReason());
        }
        if (this.firstPiece.isPresent()) {
            return this.secondClick(x, y);
        } else {
            return this.firstClick(x, y);
        }
    }

    private async firstClick(x: number, y: number): Promise<MGPValidation> {
        const opponent: Player = this.getState().getCurrentOpponent();
        const player: Player = this.getState().getCurrentPlayer();
        switch (this.board[y][x]) {
            case player:
                this.firstPiece = MGPOptional.of(new Coord(x, y));
                this.possibleMoves = this.getPossibleMoves();
                return MGPValidation.SUCCESS;
            case opponent:
                return this.cancelMove(RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_OPPONENT());
            default:
                Utils.expectToBe(this.board[y][x], PlayerOrNone.NONE);
                return this.cancelMove(RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_EMPTY());
        }
    }

    public override hideLastMove(): void {
        this.capturedCoords = [];
        this.moveds = [];
    }

    private getPossibleMoves(): PossibleMove[] {
        const state: EpaminondasState = this.getState();
        const possibleMoves: PossibleMove[] = [];
        for (const direction of Ordinal.ORDINALS) {
            const phalanxSize: number = this.countPhalanxSize(direction);
            let coord: Coord = this.firstPiece.get().getNext(direction, phalanxSize);
            for (let stepSize: number = 1; stepSize <= phalanxSize; stepSize++) {
                const move: EpaminondasMove = new EpaminondasMove(
                    this.firstPiece.get().x,
                    this.firstPiece.get().y,
                    phalanxSize,
                    stepSize,
                    direction,
                );
                if (this.rules.isLegal(move, state).isSuccess()) {
                    const arrow: Arrow<Ordinal> = new Arrow<Ordinal>(
                        this.firstPiece.get(),
                        coord,
                        direction,
                        (c: Coord) => this.getCenterAt(c),
                    );
                    possibleMoves.push({ arrow, endingCoord: coord, relatedMove: move });
                } else {
                    break;
                }
                coord = coord.getNext(direction, 1);
            }
        }
        return possibleMoves;
    }

    public getCenterAt(coord: Coord): Coord {
        return new Coord(
            this.SPACE_SIZE * (coord.x + 0.5),
            this.SPACE_SIZE * (coord.y + 0.5),
        );
    }

    public override cancelMoveAttempt(): void {
        this.firstPiece = MGPOptional.empty();
        this.possibleMoves = [];
        this.lastPiece = MGPOptional.empty();
    }

    private async secondClick(x: number, y: number): Promise<MGPValidation> {
        const clicked: Coord = new Coord(x, y);
        const firstPiece: Coord = this.firstPiece.get();
        if (clicked.equals(firstPiece)) {
            return this.cancelMove();
        }
        const validMoves: PossibleMove[] =
            this.possibleMoves.filter((m: PossibleMove) => m.endingCoord.equals(clicked));
        if (validMoves.length > 0) {
            return this.chooseMove(validMoves[0].relatedMove);
        }
        const player: Player = this.getCurrentPlayer();
        if (this.getState().getPieceAt(clicked) === player) {
            return this.firstClick(x, y);
        }
        if (clicked.isAlignedWith(firstPiece) === false) {
            return this.cancelMove(EpaminondasFailure.SQUARE_NOT_ALIGNED_WITH_PHALANX());
        }
        return this.chooseMoveFromClicks(clicked);
    }

    private chooseMoveFromClicks(clicked: Coord): Promise<MGPValidation> {
        const direction: Ordinal = this.firstPiece.get().getDirectionToward(clicked).get();
        const phalanxSize: number = this.countPhalanxSize(direction);
        const stepSize: number = this.getStepSize(clicked, phalanxSize);
        if (stepSize > phalanxSize) {
            return this.cancelMove(EpaminondasFailure.PHALANX_CANNOT_JUMP_FURTHER_THAN_ITS_SIZE(stepSize, phalanxSize));
        }
        const move: EpaminondasMove = new EpaminondasMove(this.firstPiece.get().x,
                                                          this.firstPiece.get().y,
                                                          phalanxSize,
                                                          stepSize,
                                                          direction);
        return this.chooseMove(move);
    }

    private countPhalanxSize(direction: Ordinal): number {
        let phalanxSize: number = 1;
        let coord: Coord = this.firstPiece.get().getNext(direction, 1);
        const currentPlayer: Player = this.getState().getCurrentPlayer();
        while (this.getState().getOptionalPieceAt(coord).equalsValue(currentPlayer)) {
            phalanxSize++;
            coord = coord.getNext(direction, 1);
        }
        return phalanxSize;
    }

    private getStepSize(clicked: Coord, phalanxSize: number): number {
        // Only called if clicked is aligned with first piece
        const direction: Ordinal = this.firstPiece.get().getDirectionToward(clicked).get();
        let stepSize: number = 1;
        let coord: Coord = this.firstPiece.get().getNext(direction, phalanxSize);
        while (coord.equals(clicked) === false) {
            stepSize++;
            coord = coord.getNext(direction, 1);
        }
        return stepSize;
    }

    public getPieceClasses(x: number, y: number): string[] {
        const player: string = this.getPlayerClass(this.board[y][x]);
        const stroke: string[] = this.getPieceStrokeClasses(x, y);
        return stroke.concat([player]);
    }

    private getPieceStrokeClasses(x: number, y: number): string[] {
        // Show pieces belonging to the phalanx to move
        const coord: Coord = new Coord(x, y);
        if (this.firstPiece.equalsValue(coord)) {
            return ['selected-stroke'];
        } else {
            return [];
        }
    }

    public getRectClasses(x: number, y: number): string[] {
        const clicked: Coord = new Coord(x, y);
        if (this.capturedCoords.some((c: Coord) => c.equals(clicked))) {
            return ['captured-fill'];
        } else if (this.moveds.some((c: Coord) => c.equals(clicked))) {
            return ['moved-fill'];
        }
        return [];
    }

    public getHighlightedCoords(): Coord[] {
        if (this.interactive === false) {
            return [];
        }
        if (this.firstPiece.isPresent()) {
            return this.possibleMoves.map((p: PossibleMove) => p.endingCoord);
        } else {
            return this.getCurrentPlayerPieces();
        }
    }

    private getCurrentPlayerPieces(): Coord[] {
        const pieces: Coord[] = [];
        const state: EpaminondasState = this.getState();
        const player: Player = state.getCurrentPlayer();
        for (let y: number = 0; y < this.getHeight(); y++) {
            for (let x: number = 0; x < this.getWidth(); x++) {
                if (this.board[y][x] === player) {
                    pieces.push(new Coord(x, y));
                }
            }
        }
        return pieces;
    }

}
