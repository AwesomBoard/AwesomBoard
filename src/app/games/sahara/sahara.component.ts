import { ChangeDetectorRef, Component } from '@angular/core';
import { MGPFallible, MGPOptional, MGPValidation } from '@everyboard/lib';

import { TriangularGameComponent } from 'src/app/components/game-components/game-component/TriangularGameComponent';
import { Coord } from 'src/app/jscaip/Coord';
import { SaharaMove } from 'src/app/games/sahara/SaharaMove';
import { SaharaState } from 'src/app/games/sahara/SaharaState';
import { SaharaRules } from 'src/app/games/sahara/SaharaRules';
import { Player } from 'src/app/jscaip/Player';
import { MessageDisplayer } from 'src/app/services/MessageDisplayer';
import { SaharaFailure } from './SaharaFailure';
import { FourStatePiece } from 'src/app/jscaip/FourStatePiece';
import { MCTS } from 'src/app/jscaip/AI/MCTS';
import { SaharaMoveGenerator } from './SaharaMoveGenerator';
import { SaharaMinimax } from './SaharaMinimax';

@Component({
    selector: 'app-sahara',
    templateUrl: './sahara.component.html',
    styleUrls: ['../../components/game-components/game-component/game-component.scss'],
})
export class SaharaComponent extends TriangularGameComponent<SaharaRules,
                                                             SaharaMove,
                                                             SaharaState,
                                                             FourStatePiece>
{
    public lastCoord: MGPOptional<Coord> = MGPOptional.empty();

    public lastMoved: MGPOptional<Coord> = MGPOptional.empty();

    public chosenCoord: MGPOptional<Coord> = MGPOptional.empty();

    public possibleLandings: Coord[] = [];

    public constructor(messageDisplayer: MessageDisplayer, cdr: ChangeDetectorRef) {
        super(messageDisplayer, cdr);
        this.setRulesAndNode('Sahara');
        this.availableAIs = [
            new SaharaMinimax(),
            new MCTS($localize`MCTS`, new SaharaMoveGenerator(), this.rules),
        ];
        this.encoder = SaharaMove.encoder;
    }

    public override async showLastMove(move: SaharaMove): Promise<void> {
        this.lastCoord = MGPOptional.of(move.getStart());
        this.lastMoved = MGPOptional.of(move.getEnd());
    }

    public override hideLastMove(): void {
        this.lastCoord = MGPOptional.empty();
        this.lastMoved = MGPOptional.empty();
    }

    public override cancelMoveAttempt(): void {
        this.possibleLandings = [];
        this.chosenCoord = MGPOptional.empty();
    }

    public async onClick(x: number, y: number): Promise<MGPValidation> {
        const clickValidity: MGPValidation = await this.canUserPlay('#click_' + x + '_' + y);
        if (clickValidity.isFailure()) {
            return this.cancelMove(clickValidity.getReason());
        }
        const currentPlayer: Player = this.getState().getCurrentPlayer();
        const player: FourStatePiece = FourStatePiece.ofPlayer(currentPlayer);
        if (this.chosenCoord.equalsValue(new Coord(x, y))) {
            return this.cancelMove();
        } else if (this.chosenCoord.isAbsent() ||
                  this.board[y][x] === player)
        { // Must select pyramid
            return this.choosePiece(x, y);
        } else { // Must choose empty landing space
            return this.chooseLandingCoord(x, y);
        }
    }

    private async choosePiece(x: number, y: number): Promise<MGPValidation> {
        if (this.board[y][x] === FourStatePiece.EMPTY) { // Did not select pyramid
            return this.cancelMove(SaharaFailure.MUST_CHOOSE_PYRAMID_FIRST());
        } else if (this.board[y][x].is(Player.ofTurn(this.getTurn()))) { // selected player's pyramid
            const coord: Coord = new Coord(x, y);
            this.selectPiece(coord);
            return MGPValidation.SUCCESS;
        } else { // Selected opponent pyramid
            return this.cancelMove(SaharaFailure.MUST_CHOOSE_OWN_PYRAMID());
        }
    }

    private selectPiece(coord: Coord): void {
        this.chosenCoord = MGPOptional.of(coord);
        this.possibleLandings = this.rules.getLandingCoords(this.board, coord);
    }

    private async chooseLandingCoord(x: number, y: number): Promise<MGPValidation> {
        const clickedCoord: Coord = new Coord(x, y);
        const newMove: MGPFallible<SaharaMove> = SaharaMove.from(this.chosenCoord.get(), clickedCoord);
        if (newMove.isFailure()) {
            return this.cancelMove(newMove.getReason());
        }
        return await this.chooseMove(newMove.get());
    }

    public override async updateBoard(_triggerAnimation: boolean): Promise<void> {
        this.board = this.getState().board;
    }

    public getPlayerClassAtXY(x: number, y: number): string {
        const piece: FourStatePiece = this.board[y][x];
        return this.getPlayerClass(piece.getPlayer());
    }

}
