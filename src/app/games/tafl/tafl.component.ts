import { RectangularGameComponent } from 'src/app/components/game-components/rectangular-game-component/RectangularGameComponent';
import { Coord } from 'src/app/jscaip/Coord';
import { Orthogonal } from 'src/app/jscaip/Orthogonal';
import { Player, PlayerOrNone } from 'src/app/jscaip/Player';
import { RelativePlayer } from 'src/app/jscaip/RelativePlayer';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { MessageDisplayer } from 'src/app/services/MessageDisplayer';
import { MGPFallible, MGPOptional, MGPValidation } from '@everyboard/lib';
import { TaflMove } from './TaflMove';
import { TaflPawn } from './TaflPawn';
import { TaflRules } from './TaflRules';
import { TaflState } from './TaflState';
import { TaflConfig } from './TaflConfig';
import { TaflMoveGenerator } from './TaflMoveGenerator';
import { AI, AIOptions } from 'src/app/jscaip/AI/AI';
import { MCTS } from 'src/app/jscaip/AI/MCTS';
import { TaflPieceAndInfluenceMinimax } from './TaflPieceAndInfluenceMinimax';
import { TaflPieceMinimax } from './TaflPieceMinimax';
import { TaflPieceAndControlMinimax } from './TaflPieceAndControlMinimax';
import { TaflEscapeThenPieceThenControlMinimax } from './TaflEscapeThenPieceThenControlMinimax';
import { ChangeDetectorRef } from '@angular/core';
import { PlayerNumberMap } from 'src/app/jscaip/PlayerMap';
import { ScoreName } from 'src/app/components/game-components/game-component/GameComponent';

export abstract class TaflComponent<R extends TaflRules<M>, M extends TaflMove>
    extends RectangularGameComponent<R, M, TaflState, TaflPawn, TaflConfig>
{

    public viewInfo: { pieceClasses: string[][][] } = { pieceClasses: [] };

    public EMPTY: TaflPawn = TaflPawn.UNOCCUPIED;

    protected capturedCoords: Coord[] = [];

    protected passedByCoords: Coord[] = [];

    public chosen: MGPOptional<Coord> = MGPOptional.empty();

    public constructor(messageDisplayer: MessageDisplayer,
                       cdr: ChangeDetectorRef,
                       public generateMove: (start: Coord, end: Coord) => MGPFallible<M>)
    {
        super(messageDisplayer, cdr);
    }

    public async updateBoard(_triggerAnimation: boolean): Promise<void> {
        this.board = this.getState().getCopiedBoard();
        this.updateViewInfo();
        this.updateScores();
    }

    private updateScores(): void {
        const state: TaflState = this.getState();
        const scoreZero: number = this.rules.getPlayerListPawns(Player.ZERO, state).length;
        const scoreOne: number = this.rules.getPlayerListPawns(Player.ONE, state).length;
        this.scores = MGPOptional.of(PlayerNumberMap.of(scoreZero, scoreOne));
    }

    public override getScoreName(): ScoreName {
        return ScoreName.REMAINING_PIECES;
    }

    public override async showLastMove(move: M): Promise<void> {
        const previousState: TaflState = this.getPreviousState();
        const opponent: Player = this.getState().getCurrentOpponent();
        for (const orthogonal of Orthogonal.ORTHOGONALS) {
            const captured: Coord = move.getEnd().getNext(orthogonal, 1);
            if (previousState.isOnBoard(captured)) {
                const previousOwner: RelativePlayer = previousState.getRelativeOwner(opponent, captured);
                const wasOpponent: boolean = previousOwner === RelativePlayer.OPPONENT;
                const currentPiece: TaflPawn = this.getState().getPieceAt(captured);
                const isEmpty: boolean = currentPiece === TaflPawn.UNOCCUPIED;
                if (wasOpponent && isEmpty) {
                    this.capturedCoords.push(captured);
                }
            }
        }
        this.passedByCoords = move.getMovedOverCoords();
    }

    public override hideLastMove(): void {
        this.capturedCoords = [];
        this.passedByCoords = [];
    }

    private updateViewInfo(): void {
        const pieceClasses: string[][][] = [];
        this.board = this.getState().getCopiedBoard();
        for (let y: number = 0; y < this.getHeight(); y++) {
            const newLine: string[][] = [];
            for (let x: number = 0; x < this.getWidth(); x++) {
                let newSpace: string[] = [];
                if (this.board[y][x].getOwner().isNone()) {
                    newSpace = [''];
                } else {
                    newSpace = this.getPieceClasses(x, y);
                }
                newLine.push(newSpace);
            }
            pieceClasses.push(newLine);
        }
        this.viewInfo = { pieceClasses };
    }

    public async onClick(x: number, y: number): Promise<MGPValidation> {
        const clickValidity: MGPValidation = await this.canUserPlay('#click-' + x + '-' + y);
        if (clickValidity.isFailure()) {
            return this.cancelMove(clickValidity.getReason());
        }
        const clicked: Coord = new Coord(x, y);
        if (this.chosen.equalsValue(clicked)) {
            return this.cancelMove();
        }
        if (this.chosen.isAbsent() ||
            this.pieceBelongsToCurrentPlayer(clicked))
        {
            return this.choosePiece(clicked);
        } else {
            return this.chooseDestination(x, y);
        }
    }

    private async chooseDestination(x: number, y: number): Promise<MGPValidation> {
        const chosenPiece: Coord = this.chosen.get();
        const chosenDestination: Coord = new Coord(x, y);
        const move: MGPFallible<M> = this.generateMove(chosenPiece, chosenDestination);
        if (move.isSuccess()) {
            return await this.chooseMove(move.get());
        } else {
            return this.cancelMove(move.getReason());
        }
    }

    private async choosePiece(coord: Coord): Promise<MGPValidation> {
        if (this.board[coord.y][coord.x] === TaflPawn.UNOCCUPIED) {
            return this.cancelMove(RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_EMPTY());
        }
        if (this.pieceBelongsToCurrentPlayer(coord) === false) {
            return this.cancelMove(RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_OPPONENT());
        }

        this.chosen = MGPOptional.of(coord);
        this.updateViewInfo();
        return MGPValidation.SUCCESS;
    }

    private pieceBelongsToCurrentPlayer(coord: Coord): boolean {
        const state: TaflState = this.getState();
        const player: Player = state.getCurrentPlayer();
        return state.getRelativeOwner(player, coord) === RelativePlayer.PLAYER;
    }

    public override cancelMoveAttempt(): void {
        this.chosen = MGPOptional.empty();
        this.updateViewInfo();
    }

    public isThrone(x: number, y: number): boolean {
        const state: TaflState = this.getState();
        return this.rules.isThrone(state, new Coord(x, y));
    }

    public isCentralThrone(x: number, y: number): boolean {
        return this.getState().isCentralThrone(new Coord(x, y));
    }

    public getPieceClasses(x: number, y: number): string[] {
        const classes: string[] = [];
        const coord: Coord = new Coord(x, y);

        const owner: PlayerOrNone = this.getState().getAbsoluteOwner(coord);
        classes.push(this.getPlayerClass(owner));

        if (this.chosen.equalsValue(coord)) {
            classes.push('selected-stroke');
        }

        return classes;
    }

    public getRectClasses(x: number, y: number): string[] {
        const classes: string[] = [];

        const coord: Coord = new Coord(x, y);
        if (this.capturedCoords.some((c: Coord) => c.equals(coord))) {
            classes.push('captured-fill');
        } else if (this.passedByCoords.some((c: Coord) => c.equals(coord))) {
            classes.push('moved-fill');
        }
        return classes;
    }

    public getClickables(): Coord[] {
        const coords: Coord[] = [];
        for (let y: number = 0; y < this.getHeight(); y++) {
            for (let x: number = 0; x < this.board[y].length; x++) {
                const coord: Coord = new Coord(x, y);
                if (this.isClickable(coord)) {
                    coords.push(coord);
                }
            }
        }
        return coords;
    }

    private isClickable(coord: Coord): boolean {
        // Show if the piece can be clicked
        return this.interactive && this.pieceBelongsToCurrentPlayer(coord);
    }

    public isInvader(x: number, y: number): boolean {
        return this.board[y][x] === TaflPawn.PLAYER_ZERO_PAWN;
    }

    public isKing(x: number, y: number): boolean {
        return this.board[y][x].isKing();
    }

    protected createAIs(): AI<TaflMove, TaflState, AIOptions, TaflConfig>[] {
        const moveGenerator: TaflMoveGenerator<M> = new TaflMoveGenerator(this.rules);
        return [
            new TaflPieceMinimax(this.rules),
            new TaflPieceAndInfluenceMinimax(this.rules),
            new TaflPieceAndControlMinimax(this.rules),
            new TaflEscapeThenPieceThenControlMinimax(this.rules),
            new MCTS($localize`MCTS`, moveGenerator, this.rules),
        ];
    }

}
