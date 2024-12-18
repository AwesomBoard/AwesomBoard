import { ChangeDetectorRef, Component } from '@angular/core';
import { MGPOptional, MGPValidation } from '@everyboard/lib';

import { TeekoConfig, TeekoRules } from './TeekoRules';
import { TeekoDropMove, TeekoMove, TeekoTranslationMove } from './TeekoMove';
import { TeekoState } from './TeekoState';
import { MessageDisplayer } from 'src/app/services/MessageDisplayer';
import { RectangularGameComponent } from 'src/app/components/game-components/rectangular-game-component/RectangularGameComponent';
import { Player, PlayerOrNone } from 'src/app/jscaip/Player';
import { Coord } from 'src/app/jscaip/Coord';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { MCTS } from 'src/app/jscaip/AI/MCTS';
import { TeekoMoveGenerator } from './TeekoMoveGenerator';
import { TeekoMinimax } from './TeekoMinimax';

@Component({
    selector: 'app-teeko',
    templateUrl: './teeko.component.html',
    styleUrls: ['../../components/game-components/game-component/game-component.scss'],
})

export class TeekoComponent extends RectangularGameComponent<TeekoRules,
                                                             TeekoMove,
                                                             TeekoState,
                                                             PlayerOrNone,
                                                             TeekoConfig>
{
    public selected: MGPOptional<Coord> = MGPOptional.empty();
    public last: MGPOptional<Coord> = MGPOptional.empty();
    public moved: Coord[] = [];
    public victory: Coord[] = [];

    public constructor(messageDisplayer: MessageDisplayer, cdr: ChangeDetectorRef) {
        super(messageDisplayer, cdr);
        this.setRulesAndNode('Teeko');
        this.availableAIs = [
            new TeekoMinimax(),
            new MCTS($localize`MCTS`, new TeekoMoveGenerator(), this.rules),
        ];
        this.encoder = TeekoMove.encoder;
    }

    public override async updateBoard(_triggerAnimation: boolean): Promise<void> {
        this.board = this.node.gameState.board;
    }

    public override async showLastMove(move: TeekoMove): Promise<void> {
        this.last = MGPOptional.of(this.rules.getLastCoord(move));
        if (move instanceof TeekoTranslationMove) {
            this.moved = [move.getStart(), move.getEnd()];
        } else {
            this.moved = [];
        }
        this.victory = this.rules.getVictoryCoord(this.getState());
    }

    public override async hideLastMove(): Promise<void> {
        this.last = MGPOptional.empty();
        this.moved = [];
        this.victory = [];
    }

    public override cancelMoveAttempt(): void {
        this.selected = MGPOptional.empty();
    }

    public async onClick(x: number, y: number): Promise<MGPValidation> {
        const clickValidity: MGPValidation = await this.canUserPlay('#click_' + x + '_' + y);
        if (clickValidity.isFailure()) {
            return this.cancelMove(clickValidity.getReason());
        }
        const clickedCoord: Coord = new Coord(x, y);
        if (this.getState().isInDropPhase()) {
            const move: TeekoDropMove = TeekoDropMove.from(clickedCoord).get();
            return this.chooseMove(move);
        } else {
            if (this.selected.isPresent()) {
                if (this.selected.equalsValue(clickedCoord)) {
                    return this.cancelMove();
                } else {
                    const move: TeekoTranslationMove =
                        TeekoTranslationMove.from(this.selected.get(), clickedCoord).get();
                    return this.chooseMove(move);
                }
            } else {
                const currentPlayer: Player = this.getState().getCurrentPlayer();
                const clickedPiece: PlayerOrNone = this.getState().getPieceAt(clickedCoord);
                if (clickedPiece === currentPlayer) {
                    this.selected = MGPOptional.of(clickedCoord);
                    return MGPValidation.SUCCESS;
                } else if (clickedPiece.isNone()) {
                    return this.cancelMove(RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_EMPTY());
                } else {
                    return this.cancelMove(RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_OPPONENT());
                }
            }
        }
    }

    public getPieceClasses(x: number, y: number): string[] {
        const coord: Coord = new Coord(x, y);
        const playerClass: string = this.getPlayerClass(this.getState().getPieceAt(coord));
        const classes: string[] = [playerClass];
        if (this.victory.some((c: Coord) => c.equals(coord))) {
            classes.push('victory-stroke');
        } else if (this.last.equalsValue(coord)) {
            classes.push('last-move-stroke');
        } else if (this.selected.equalsValue(coord)) {
            classes.push('selected-stroke');
        }
        return classes;
    }

    public getSpaceClasses(x: number, y: number): string[] {
        const coord: Coord = new Coord(x, y);
        if (this.moved.some((c: Coord) => c.equals(coord))) {
            return ['moved-fill'];
        } else {
            return [];
        }
    }

}
