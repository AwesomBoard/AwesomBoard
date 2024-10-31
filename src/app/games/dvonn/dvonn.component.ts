import { ChangeDetectorRef, Component } from '@angular/core';
import { Coord } from 'src/app/jscaip/Coord';
import { DvonnMove } from 'src/app/games/dvonn/DvonnMove';
import { DvonnState } from 'src/app/games/dvonn/DvonnState';
import { DvonnRules } from 'src/app/games/dvonn/DvonnRules';
import { DvonnPieceStack } from 'src/app/games/dvonn/DvonnPieceStack';
import { HexaLayout } from 'src/app/jscaip/HexaLayout';
import { PointyHexaOrientation } from 'src/app/jscaip/HexaOrientation';
import { HexagonalGameComponent }
    from 'src/app/components/game-components/game-component/HexagonalGameComponent';
import { MessageDisplayer } from 'src/app/services/MessageDisplayer';
import { MGPFallible, MGPOptional, MGPValidation, Utils } from '@everyboard/lib';
import { MCTS } from 'src/app/jscaip/AI/MCTS';
import { DvonnMoveGenerator } from './DvonnMoveGenerator';
import { DvonnMaxStacksMinimax } from './DvonnMaxStacksMinimax';
import { DvonnScoreMinimax } from './DvonnScoreMinimax';

@Component({
    selector: 'app-dvonn',
    templateUrl: './dvonn.component.html',
    styleUrls: ['../../components/game-components/game-component/game-component.scss'],
})

export class DvonnComponent extends HexagonalGameComponent<DvonnRules, DvonnMove, DvonnState, DvonnPieceStack> {

    public lastMove: MGPOptional<DvonnMove> = MGPOptional.empty();
    public chosen: MGPOptional<Coord> = MGPOptional.empty();
    public disconnectedSpaces: { coord: Coord, spaceContent: DvonnPieceStack }[] = [];

    public constructor(messageDisplayer: MessageDisplayer, cdr: ChangeDetectorRef) {
        super(messageDisplayer, cdr);
        this.setRulesAndNode('Dvonn');
        this.availableAIs = [
            new DvonnMaxStacksMinimax(),
            new DvonnScoreMinimax(),
            new MCTS($localize`MCTS`, new DvonnMoveGenerator(), this.rules),
        ];
        this.encoder = DvonnMove.encoder;
        this.scores = MGPOptional.of(DvonnRules.getScores(this.getState()));

        this.SPACE_SIZE = 30;
        this.hexaLayout = new HexaLayout(this.SPACE_SIZE * 1.50,
                                         new Coord(-this.SPACE_SIZE, this.SPACE_SIZE * 2),
                                         PointyHexaOrientation.INSTANCE);
        this.state = this.getState();
        this.hexaBoard = this.getState().board;
    }

    public override hideLastMove(): void {
        this.lastMove = MGPOptional.empty();
        this.disconnectedSpaces = [];
    }

    public async updateBoard(_triggerAnimation: boolean): Promise<void> {
        this.state = this.getState();
        this.canPass = this.rules.canOnlyPass(this.state);
        this.scores = MGPOptional.of(DvonnRules.getScores(this.state));
    }

    public override async showLastMove(move: DvonnMove): Promise<void> {
        this.lastMove = MGPOptional.of(move);
        const previousState: DvonnState = this.getPreviousState();
        const state: DvonnState = this.getState();
        for (let y: number = 0; y < state.getHeight(); y++) {
            for (let x: number = 0; x < state.board[y].length; x++) {
                const coord: Coord = new Coord(x, y);
                if (state.isOnBoard(coord) === true &&
                    coord.equals(this.lastMove.get().getStart()) === false)
                {
                    const stack: DvonnPieceStack = state.getPieceAt(coord);
                    const previousStack: DvonnPieceStack = previousState.getPieceAt(coord);
                    if (stack.isEmpty() && previousStack.hasPieces()) {
                        const disconnected: { coord: Coord, spaceContent: DvonnPieceStack } =
                            { coord, spaceContent: previousStack };
                        this.disconnectedSpaces.push(disconnected);
                    }
                }
            }
        }
    }

    public override cancelMoveAttempt(): void {
        this.chosen = MGPOptional.empty();
    }

    public override async pass(): Promise<MGPValidation> {
        Utils.assert(this.canPass, 'DvonnComponent: pass() can only be called if canPass is true');
        return await this.chooseMove(DvonnMove.PASS);
    }

    public async onClick(x: number, y: number): Promise<MGPValidation> {
        const clickValidity: MGPValidation = await this.canUserPlay('#click-' + x + '-' + y);
        if (clickValidity.isFailure()) {
            return this.cancelMove(clickValidity.getReason());
        }
        if (this.chosen.isAbsent()) {
            return this.choosePiece(x, y);
        } else if (this.chosen.equalsValue(new Coord(x, y))) {
            // Deselects the piece
            return this.cancelMove();
        } else {
            return await this.chooseDestination(x, y);
        }
    }

    public async choosePiece(x: number, y: number): Promise<MGPValidation> {
        const coord: Coord = new Coord(x, y);
        const legal: MGPValidation = this.rules.isMovablePiece(this.getState(), coord);
        if (legal.isSuccess()) {
            this.chosen = MGPOptional.of(coord);
            return MGPValidation.SUCCESS;
        } else {
            return this.cancelMove(legal.getReason());
        }
    }

    private async chooseDestination(x: number, y: number): Promise<MGPValidation> {
        const state: DvonnState = this.getState();
        const chosenPiece: Coord = this.chosen.get();
        const chosenDestination: Coord = new Coord(x, y);
        const move: MGPFallible<DvonnMove> = DvonnMove.from(chosenPiece, chosenDestination);
        if (move.isFailure()) {
            if (this.rules.isMovablePiece(state, chosenDestination).isSuccess()) {
                // Change piece selection
                return this.choosePiece(x, y);
            } else {
                return this.cancelMove(move.getReason());
            }
        } else {
            // The only way to know whether we can select the other piece is to check the move legality
            const legality: MGPValidation = this.rules.isLegal(move.get(), state, this.config);
            if (legality.isFailure() && this.rules.isMovablePiece(state, chosenDestination).isSuccess()) {
                return this.choosePiece(x, y);
            } else {
                return this.chooseMove(move.get());
            }
        }
    }

    public getPieceClasses(stack: DvonnPieceStack): string[] {
        if (stack.containsSource() && stack.getSize() === 1) {
            return ['nonplayer-fill', 'dashed-stroke'];
        }
        const playerColor: string = this.getPlayerClass(stack.getOwner());
        if (stack.containsSource()) {
            return [playerColor, 'nonplayer-stroke', 'dashed-stroke'];
        }
        return [playerColor];
    }

    public getTextSizeClass(spaceContent: DvonnPieceStack): string {
        if (spaceContent.containsSource()) {
            if (spaceContent.size <= 9) {
                return 'text-medium';
            } else {
                return 'text-small-plus';
            }
        } else {
            return 'text-medium-plus';
        }
    }

    public getSourceSymbolTransform(spaceContent: DvonnPieceStack): string {
        if (spaceContent.size === 1) { // 1 -> no number written
            return 'translate(-18, -16) scale(0.10)';
        } else if (spaceContent.size <= 9) { // 2 to 9 written
            return 'translate(-3, -12) scale(0.07)';
        } else { // [10, 49] written
            return 'translate(3, -12) scale(0.06)';
        }
    }

    public getTextTransform(spaceContent: DvonnPieceStack): string {
        const containsSource: boolean = spaceContent.containsSource();
        if (spaceContent.size <= 9) {
            if (containsSource) { // X Z ou Z
                return 'translate(-7, 0)';
            } else { // X or ""
                return 'translate(0, 0)';
            }
        } else {
            if (containsSource) { // X X Z
                return 'translate(-9, -3)';
            } else { // X X
                return 'translate(0, 0)';
            }
        }
    }

}
