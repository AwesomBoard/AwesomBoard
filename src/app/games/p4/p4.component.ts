import { ChangeDetectorRef, Component } from '@angular/core';
import { P4State } from './P4State';
import { P4Config, P4Rules } from './P4Rules';
import { RectangularGameComponent } from '../../components/game-components/rectangular-game-component/RectangularGameComponent';
import { MGPOptional, MGPValidation } from '@everyboard/lib';
import { P4Move } from 'src/app/games/p4/P4Move';
import { PlayerOrNone } from 'src/app/jscaip/Player';
import { Coord } from 'src/app/jscaip/Coord';
import { MessageDisplayer } from 'src/app/services/MessageDisplayer';
import { MCTS } from 'src/app/jscaip/AI/MCTS';
import { P4MoveGenerator } from './P4MoveGenerator';
import { P4Minimax } from './P4Minimax';
import { MCTSWithHeuristic } from 'src/app/jscaip/AI/MCTSWithHeuristic';
import { DummyHeuristic, Minimax } from 'src/app/jscaip/AI/Minimax';
import { P4OrderedMoveGenerator } from './P4OrderedMoveGenerator';
import { P4Heuristic } from './P4Heuristic';

@Component({
    selector: 'app-p4',
    templateUrl: './p4.component.html',
    styleUrls: ['../../components/game-components/game-component/game-component.scss'],
})
export class P4Component extends RectangularGameComponent<P4Rules, P4Move, P4State, PlayerOrNone, P4Config> {

    public EMPTY: PlayerOrNone = PlayerOrNone.NONE;
    public last: MGPOptional<Coord> = MGPOptional.empty();
    public victoryCoords: Coord[] = [];

    public constructor(messageDisplayer: MessageDisplayer, cdr: ChangeDetectorRef) {
        super(messageDisplayer, cdr);
        this.setRulesAndNode('P4');
        this.availableAIs = [
            new P4Minimax(),
            new Minimax(`Minimax dummy`, P4Rules.get(), new DummyHeuristic(), new P4OrderedMoveGenerator()),
            new MCTS($localize`MCTS`, new P4MoveGenerator(), this.rules),
            new MCTSWithHeuristic($localize`MCTS Heuristic`, new P4MoveGenerator(), this.rules, new P4Heuristic()),
        ];
        this.encoder = P4Move.encoder;
    }

    public async onClick(x: number, y: number): Promise<MGPValidation> {
        const clickValidity: MGPValidation = await this.canUserPlay(`#click-${ x }-${ y }`);
        if (clickValidity.isFailure()) {
            return this.cancelMove(clickValidity.getReason());
        }
        const chosenMove: P4Move = P4Move.of(x);
        return await this.chooseMove(chosenMove);
    }

    public async updateBoard(_triggerAnimation: boolean): Promise<void> {
        const state: P4State = this.getState();

        this.victoryCoords = P4Rules.get().getVictoriousCoords(state);
        this.board = state.board;
    }

    public override async showLastMove(move: P4Move): Promise<void> {
        const state: P4State = this.getState();
        const y: number = P4Rules.get().getLowestUnoccupiedSpace(state.board, move.x) + 1;
        this.last = MGPOptional.of(new Coord(move.x, y));
    }

    public override hideLastMove(): void {
        this.last = MGPOptional.empty();
    }

    public getSquareFillClass(x: number, y: number): string[] {
        const content: PlayerOrNone = this.board[y][x];
        return [this.getPlayerClass(content)];
    }

}
