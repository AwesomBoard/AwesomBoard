import { ChangeDetectorRef, Component } from '@angular/core';
import { ReversiConfig, ReversiLegalityInformation, ReversiRules } from './ReversiRules';
import { ReversiState } from './ReversiState';
import { ReversiMove } from 'src/app/games/reversi/ReversiMove';
import { Coord } from 'src/app/jscaip/Coord';
import { Player, PlayerOrNone } from 'src/app/jscaip/Player';
import { Ordinal } from 'src/app/jscaip/Ordinal';
import { MessageDisplayer } from 'src/app/services/MessageDisplayer';
import { RectangularGameComponent } from 'src/app/components/game-components/rectangular-game-component/RectangularGameComponent';
import { MGPOptional, MGPValidation, Utils } from '@everyboard/lib';
import { MCTS } from 'src/app/jscaip/AI/MCTS';
import { ReversiMoveGenerator } from './ReversiMoveGenerator';
import { ReversiMinimax } from './ReversiMinimax';
import { PlayerNumberMap } from 'src/app/jscaip/PlayerMap';

@Component({
    selector: 'app-reversi',
    templateUrl: './reversi.component.html',
    styleUrls: ['../../components/game-components/game-component/game-component.scss'],
})
export class ReversiComponent extends RectangularGameComponent<ReversiRules,
                                                               ReversiMove,
                                                               ReversiState,
                                                               PlayerOrNone,
                                                               ReversiConfig,
                                                               ReversiLegalityInformation>
{
    public lastMove: MGPOptional<Coord> = MGPOptional.empty();

    private capturedCoords: Coord[] = [];

    public constructor(messageDisplayer: MessageDisplayer, cdr: ChangeDetectorRef) {
        super(messageDisplayer, cdr);
        this.setRulesAndNode('Reversi');
        this.availableAIs = [
            new ReversiMinimax(),
            new MCTS($localize`MCTS`, new ReversiMoveGenerator(), this.rules),
        ];
        this.encoder = ReversiMove.encoder;
        this.scores = MGPOptional.of(PlayerNumberMap.of(2, 2));
    }

    public async onClick(x: number, y: number): Promise<MGPValidation> {
        const clickValidity: MGPValidation = await this.canUserPlay('#click_' + x + '_' + y);
        if (clickValidity.isFailure()) {
            return this.cancelMove(clickValidity.getReason());
        }
        const chosenMove: ReversiMove = new ReversiMove(x, y);
        return await this.chooseMove(chosenMove);
    }

    public async updateBoard(_triggerAnimation: boolean): Promise<void> {
        const state: ReversiState = this.getState();

        this.board = state.getCopiedBoard();

        this.scores = MGPOptional.of(state.countScore());
        this.canPass = this.rules.playerCanOnlyPass(state, this.config);
    }

    public override async showLastMove(move: ReversiMove): Promise<void> {
        this.lastMove = MGPOptional.of(move.coord);
        const player: Player = this.getState().getCurrentPlayer();
        const opponent: Player = this.getState().getCurrentOpponent();
        for (const dir of Ordinal.ORDINALS) {
            let captured: Coord = move.coord.getNext(dir, 1);
            while (this.getState().isOnBoard(captured) &&
                   this.getState().getPieceAt(captured) === opponent &&
                   this.getPreviousState().getPieceAt(captured) === player)
            {
                this.capturedCoords.push(captured);
                captured = captured.getNext(dir, 1);
            }
        }
    }

    public override hideLastMove(): void {
        this.capturedCoords = [];
        this.lastMove = MGPOptional.empty();
    }

    public getRectClasses(x: number, y: number): string[] {
        const coord: Coord = new Coord(x, y);
        if (this.capturedCoords.some((c: Coord) => c.equals(coord))) {
            return ['captured-fill'];
        } else if (this.lastMove.equalsValue(coord)) {
            return ['moved-fill'];
        } else {
            return [];
        }
    }

    public getPieceClass(x: number, y: number): string {
        return this.getPlayerClass(this.board[y][x]);
    }

    public override async pass(): Promise<MGPValidation> {
        Utils.assert(this.canPass, 'ReversiComponent: pass() can only be called if canPass is true');
        return this.onClick(ReversiMove.PASS.coord.x, ReversiMove.PASS.coord.y);
    }

}
