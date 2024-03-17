import { RectanglzRules as RectanglzRules } from './RectanglzRules';
import { RectanglzMove as RectanglzMove } from './RectanglzMove';
import { RectanglzState } from './RectanglzState';
import { Component } from '@angular/core';
import { MessageDisplayer } from 'src/app/services/MessageDisplayer';
import { MCTS } from 'src/app/jscaip/AI/MCTS';
import { RectanglzMoveGenerator } from './RectanglzMoveGenerator';
import { RectanglzMinimax } from './RectanglzMinimax';
import { RectangularGameComponent } from 'src/app/components/game-components/rectangular-game-component/RectangularGameComponent';
import { Player, PlayerOrNone } from 'src/app/jscaip/Player';
import { MGPOptional } from 'src/app/utils/MGPOptional';
import { PlayerNumberMap } from 'src/app/jscaip/PlayerMap';
import { Coord } from 'src/app/jscaip/Coord';
import { MGPValidation } from 'src/app/utils/MGPValidation';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { MGPFallible } from 'src/app/utils/MGPFallible';

@Component({
    selector: 'app-rectanglz',
    templateUrl: './rectanglz.component.html',
    styleUrls: ['../../components/game-components/game-component/game-component.scss'],
})
export class RectanglzComponent extends RectangularGameComponent<RectanglzRules,
                                                                 RectanglzMove,
                                                                 RectanglzState,
                                                                 PlayerOrNone>
{
    public EMPTY: PlayerOrNone = PlayerOrNone.NONE;

    private lastStart: MGPOptional<Coord> = MGPOptional.empty();
    private lastLanding: MGPOptional<Coord> = MGPOptional.empty();

    public selected: MGPOptional<Coord> = MGPOptional.empty();

    public constructor(messageDisplayer: MessageDisplayer) {
        super(messageDisplayer);
        this.setRulesAndNode('Rectanglz');
        this.availableAIs = [
            new RectanglzMinimax(),
            new MCTS($localize`MCTS`, new RectanglzMoveGenerator(), this.rules),
        ];
        this.encoder = RectanglzMove.encoder;

        this.scores = MGPOptional.of(PlayerNumberMap.of(0, 0));
    }

    public async updateBoard(_triggerAnimation: boolean): Promise<void> {
        const state: RectanglzState = this.getState();
        this.board = state.getCopiedBoard();
    }

    public override async showLastMove(move: RectanglzMove): Promise<void> {
        console.log('show last move', move.toString());
        this.lastStart = MGPOptional.of(move.getStart());
        this.lastLanding = MGPOptional.of(move.getEnd());
    }

    public override hideLastMove(): void {
        console.log('hide last move');
        this.lastStart = MGPOptional.empty();
        this.lastLanding = MGPOptional.empty();
    }

    public override cancelMoveAttempt(): void {
        this.selected = MGPOptional.empty();
    }

    public async onClick(x: number, y: number): Promise<MGPValidation> {
        console.log('onClick!')
        const clickValidity: MGPValidation = await this.canUserPlay('#click_' + x + '_' + y);
        if (clickValidity.isFailure()) {
            return this.cancelMove(clickValidity.getReason());
        }
        const clicked: Coord = new Coord(x, y);
        if (this.selected.equalsValue(clicked)) {
            this.cancelMoveAttempt();
            return MGPValidation.SUCCESS;
        }
        if (this.selected.isAbsent() ||
            this.pieceBelongsToCurrentPlayer(clicked))
        {
            return this.choosePiece(clicked);
        } else {
            return this.chooseDestination(x, y);
        }
    }

    private pieceBelongsToCurrentPlayer(coord: Coord): boolean {
        const state: RectanglzState = this.getState();
        const player: Player = state.getCurrentPlayer();
        return state.getPieceAt(coord) === player;
    }

    private async choosePiece(coord: Coord): Promise<MGPValidation> {
        if (this.board[coord.y][coord.x].isNone()) {
            return this.cancelMove(RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_EMPTY());
        }
        if (this.pieceBelongsToCurrentPlayer(coord) === false) {
            return this.cancelMove(RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_OPPONENT());
        }

        this.selected = MGPOptional.of(coord);
        return MGPValidation.SUCCESS;
    }

    private async chooseDestination(x: number, y: number): Promise<MGPValidation> {
        const chosenPiece: Coord = this.selected.get();
        const chosenDestination: Coord = new Coord(x, y);
        const move: MGPFallible<RectanglzMove> = RectanglzMove.from(chosenPiece, chosenDestination);
        if (move.isSuccess()) {
            return await this.chooseMove(move.get());
        } else {
            return this.cancelMove(move.getReason());
        }
    }

    public getRectClasses(x: number, y: number): string[] {
        const coord: Coord = new Coord(x, y);
        if (this.lastLanding.equalsValue(coord)) {
            return ['moved-fill'];
        } else {
            return [];
        }
    }

    public getPieceClasses(x: number, y: number): string[] {
        const classes: string[] = [];
        const coord: Coord = new Coord(x, y);

        const owner: PlayerOrNone = this.getState().getPieceAt(coord);
        classes.push(this.getPlayerClass(owner));

        if (this.selected.equalsValue(coord)) {
            classes.push('selected-stroke');
        } else if (this.lastStart.equalsValue(coord) ||
                   this.lastLanding.equalsValue(coord))
        {
            classes.push('last-move-stroke');
        }
        return classes;
    }

    // TODO: PlayerOrNoneRectangularGameComponent

}
