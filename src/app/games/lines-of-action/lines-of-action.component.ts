import { ChangeDetectorRef, Component } from '@angular/core';
import { MGPFallible, MGPOptional, MGPValidation } from '@everyboard/lib';

import { RectangularGameComponent } from 'src/app/components/game-components/rectangular-game-component/RectangularGameComponent';
import { Coord } from 'src/app/jscaip/Coord';
import { PlayerOrNone } from 'src/app/jscaip/Player';
import { LinesOfActionMove } from './LinesOfActionMove';
import { LinesOfActionRules } from './LinesOfActionRules';
import { LinesOfActionFailure } from './LinesOfActionFailure';
import { LinesOfActionState } from './LinesOfActionState';
import { MessageDisplayer } from 'src/app/services/MessageDisplayer';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { MCTS } from 'src/app/jscaip/AI/MCTS';
import { LinesOfActionMoveGenerator } from './LinesOfActionMoveGenerator';
import { LinesOfActionMinimax } from './LinesOfActionMinimax';

@Component({
    selector: 'app-lines-of-action',
    templateUrl: './lines-of-action.component.html',
    styleUrls: ['../../components/game-components/game-component/game-component.scss'],
})
export class LinesOfActionComponent extends RectangularGameComponent<LinesOfActionRules,
                                                                     LinesOfActionMove,
                                                                     LinesOfActionState,
                                                                     PlayerOrNone>
{
    public INDICATOR_SIZE: number = 20;
    public EMPTY: PlayerOrNone = PlayerOrNone.NONE;
    public targets: Coord[] = [];
    private selected: MGPOptional<Coord> = MGPOptional.empty();
    private lastMoved: Coord[] = [];
    private captured: MGPOptional<Coord> = MGPOptional.empty();

    public constructor(messageDisplayer: MessageDisplayer, cdr: ChangeDetectorRef) {
        super(messageDisplayer, cdr);
        this.setRulesAndNode('LinesOfAction');
        this.availableAIs = [
            new LinesOfActionMinimax(),
            new MCTS($localize`MCTS`, new LinesOfActionMoveGenerator(), this.rules),
        ];
        this.encoder = LinesOfActionMove.encoder;
    }

    public async onClick(x: number, y: number): Promise<MGPValidation> {
        const clickValidity: MGPValidation = await this.canUserPlay('#click_' + x + '_' + y);
        if (clickValidity.isFailure()) {
            return this.cancelMove(clickValidity.getReason());
        }

        const coord: Coord = new Coord(x, y);
        if (this.selected.equalsValue(coord)) {
            return this.cancelMove();
        }
        const currentPlayer: PlayerOrNone = this.getState().getCurrentPlayer();
        if (this.selected.isAbsent() ||
            this.getState().getPieceAt(coord) === currentPlayer)
        {
            return this.select(coord);
        } else {
            return this.concludeMove(coord);
        }
    }

    private async concludeMove(coord: Coord): Promise<MGPValidation> {
        const move: MGPFallible<LinesOfActionMove> =
            LinesOfActionMove.from(this.selected.get(), coord);
        if (move.isSuccess()) {
            return this.chooseMove(move.get());
        } else {
            return this.cancelMove(move.getReason());
        }
    }

    private async select(coord: Coord): Promise<MGPValidation> {
        const piece: PlayerOrNone = this.getState().getPieceAt(coord);
        if (piece.isNone()) {
            return this.cancelMove(RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_EMPTY());
        } else if (piece === this.getState().getCurrentOpponent()) {
            return this.cancelMove(RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_OPPONENT());
        }
        this.selected = MGPOptional.of(coord);
        this.targets = LinesOfActionRules.possibleTargets(this.getState(), this.selected.get()).toList();
        if (this.targets.length === 0) {
            return this.cancelMove(LinesOfActionFailure.PIECE_CANNOT_MOVE());
        }
        return MGPValidation.SUCCESS;
    }

    public override async updateBoard(_triggerAnimation: boolean): Promise<void> {
        this.board = this.getState().board;
    }

    public override async showLastMove(move: LinesOfActionMove): Promise<void> {
        if (this.getPreviousState().getPieceAt(move.getEnd()).isPlayer()) {
            this.captured = MGPOptional.of(move.getEnd());
        }
        const lastMoveStart: Coord = move.getStart();
        const lastMoveEnd: Coord = move.getEnd();
        this.lastMoved = [lastMoveStart, lastMoveEnd];
    }

    public override hideLastMove(): void {
        this.captured = MGPOptional.empty();
        this.lastMoved = [];
    }

    public override cancelMoveAttempt(): void {
        this.selected = MGPOptional.empty();
        this.targets = [];
    }

    public getSquareClasses(x: number, y: number): string[] {
        const coord: Coord = new Coord(x, y);
        if (this.captured.equalsValue(coord)) {
            return ['captured-fill'];
        }
        if (this.lastMoved.some((c: Coord) => c.equals(coord))) {
            return ['moved-fill'];
        }
        return [];
    }

    public getPieceClasses(x: number, y: number): string[] {
        const content: PlayerOrNone = this.board[y][x];
        const coord: Coord = new Coord(x, y);
        const classes: string[] = [this.getPlayerClass(content)];
        if (this.selected.equalsValue(coord)) {
            classes.push('selected-stroke');
        }
        return classes;
    }

}
