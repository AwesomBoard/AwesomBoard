import { ChangeDetectorRef, Component } from '@angular/core';
import { RectangularGameComponent } from '../../components/game-components/rectangular-game-component/RectangularGameComponent';
import { Coord } from 'src/app/jscaip/Coord';
import { Orthogonal } from 'src/app/jscaip/Orthogonal';
import { QuixoMove } from 'src/app/games/quixo/QuixoMove';
import { QuixoConfig, QuixoState } from 'src/app/games/quixo/QuixoState';
import { QuixoRules } from 'src/app/games/quixo/QuixoRules';
import { MGPOptional, MGPValidation } from '@everyboard/lib';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { PlayerOrNone } from 'src/app/jscaip/Player';
import { MessageDisplayer } from 'src/app/services/MessageDisplayer';
import { MCTS } from 'src/app/jscaip/AI/MCTS';
import { QuixoMoveGenerator } from './QuixoMoveGenerator';
import { QuixoMinimax } from './QuixoMinimax';

@Component({
    selector: 'app-quixo',
    templateUrl: './quixo.component.html',
    styleUrls: ['../../components/game-components/game-component/game-component.scss'],
})
export class QuixoComponent extends RectangularGameComponent<QuixoRules,
                                                             QuixoMove,
                                                             QuixoState,
                                                             PlayerOrNone,
                                                             QuixoConfig>
{

    public QuixoState: typeof QuixoState = QuixoState;

    public lastMoveCoord: MGPOptional<Coord> = MGPOptional.empty();

    public chosenCoord: MGPOptional<Coord> = MGPOptional.empty();

    public chosenDirection: Orthogonal;

    public victoriousCoords: Coord[] = [];

    public constructor(messageDisplayer: MessageDisplayer, cdr: ChangeDetectorRef) {
        super(messageDisplayer, cdr);
        this.setRulesAndNode('Quixo');
        this.availableAIs = [
            new QuixoMinimax(),
            new MCTS($localize`MCTS`, new QuixoMoveGenerator(), this.rules),
        ];
        this.encoder = QuixoMove.encoder;
    }

    public override async showLastMove(move: QuixoMove): Promise<void> {
        this.lastMoveCoord = MGPOptional.of(move.coord);
    }

    public override hideLastMove(): void {
        this.lastMoveCoord = MGPOptional.empty();
    }

    public async updateBoard(_triggerAnimation: boolean): Promise<void> {
        this.state = this.getState();
        this.board = this.state.board;
        this.victoriousCoords = QuixoRules.getVictoriousCoords(this.state);
    }

    public override cancelMoveAttempt(): void {
        this.chosenCoord = MGPOptional.empty();
    }

    public getPieceClasses(x: number, y: number): string[] {
        const coord: Coord = new Coord(x, y);
        const player: PlayerOrNone = this.board[y][x];
        const classes: string[] = [];

        classes.push(this.getPlayerClass(player));
        if (this.chosenCoord.equalsValue(coord)) classes.push('selected-stroke');
        else if (this.lastMoveCoord.equalsValue(coord)) classes.push('last-move-stroke');
        if (this.victoriousCoords.some((c: Coord): boolean => c.equals(coord))) classes.push('victory-stroke');
        return classes;
    }

    public async onBoardClick(x: number, y: number): Promise<MGPValidation> {
        const clickValidity: MGPValidation = await this.canUserPlay('#click_' + x + '_' + y);
        if (clickValidity.isFailure()) {
            return this.cancelMove(clickValidity.getReason());
        }
        const clickedCoord: Coord = new Coord(x, y);
        const state: QuixoState = this.getState();
        const coordLegality: MGPValidation = this.rules.isValidCoord(state, clickedCoord);
        if (coordLegality.isFailure()) {
            return this.cancelMove(coordLegality.getReason());
        }
        if (this.board[y][x] === this.state.getCurrentOpponent()) {
            return this.cancelMove(RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_OPPONENT());
        } else {
            if (this.chosenCoord.equalsValue(clickedCoord)) {
                return this.cancelMove();
            } else {
                this.chosenCoord = MGPOptional.of(clickedCoord);
                return MGPValidation.SUCCESS;
            }
        }
    }

    public getPossiblesDirections(): Orthogonal[] {
        const directions: Orthogonal[] = [];
        const chosenCoord: Coord = this.chosenCoord.get();
        const state: QuixoState = this.getState();
        if (chosenCoord.x < state.getWidth() - 1) directions.push(Orthogonal.RIGHT);
        if (0 < chosenCoord.x) directions.push(Orthogonal.LEFT);
        if (chosenCoord.y < state.getHeight() - 1) directions.push(Orthogonal.DOWN);
        if (0 < chosenCoord.y) directions.push(Orthogonal.UP);
        return directions;
    }

    public async chooseDirection(direction: Orthogonal): Promise<MGPValidation> {
        const clickValidity: MGPValidation = await this.canUserPlay('#chooseDirection_' + direction.toString());
        if (clickValidity.isFailure()) {
            return this.cancelMove(clickValidity.getReason());
        }
        this.chosenDirection = direction;
        return await this.tryMove();
    }

    public async tryMove(): Promise<MGPValidation> {
        const chosenCoord: Coord = this.chosenCoord.get();
        const move: QuixoMove = new QuixoMove(chosenCoord.x,
                                              chosenCoord.y,
                                              this.chosenDirection);
        return this.chooseMove(move);
    }

    public getQuixoArrowTransform(orientation: Orthogonal): string {
        const state: QuixoState = this.getState();
        const boardWidth: number = state.getWidth() * this.SPACE_SIZE;
        const boardHeight: number = state.getHeight() * this.SPACE_SIZE;
        return this.getArrowTransform(boardWidth, boardHeight, orientation);
    }

}
