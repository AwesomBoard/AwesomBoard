import { Component } from '@angular/core';
import { GoMove } from 'src/app/games/go/GoMove';
import { GoLegalityInformation, GoRules } from 'src/app/games/go/GoRules';
import { GoMinimax } from 'src/app/games/go/GoMinimax';
import { GoState, Phase, GoPiece } from 'src/app/games/go/GoState';
import { Coord } from 'src/app/jscaip/Coord';
import { Debug } from 'src/app/utils/utils';
import { assert } from 'src/app/utils/assert';
import { MGPValidation } from 'src/app/utils/MGPValidation';
import { MGPOptional } from 'src/app/utils/MGPOptional';
import { GroupDatas } from 'src/app/jscaip/BoardDatas';
import { MessageDisplayer } from 'src/app/services/MessageDisplayer';
import { GoTutorial } from './GoTutorial';
import { GobanGameComponent } from 'src/app/components/game-components/goban-game-component/GobanGameComponent';

@Component({
    selector: 'app-go',
    templateUrl: './go.component.html',
    styleUrls: ['../../components/game-components/game-component/game-component.scss'],
})
@Debug.log
export class GoComponent extends GobanGameComponent<GoRules, GoMove, GoState, GoPiece, GoLegalityInformation> {

    public boardInfo: GroupDatas<GoPiece>;

    public ko: MGPOptional<Coord> = MGPOptional.empty();

    public last: MGPOptional<Coord> = MGPOptional.empty();

    public captures: Coord[]= [];

    public GoPiece: typeof GoPiece = GoPiece;

    public boardHeight: number = GoState.HEIGHT;
    public boardWidth: number = GoState.WIDTH;

    public constructor(messageDisplayer: MessageDisplayer) {
        super(messageDisplayer);
        this.scores = MGPOptional.of([0, 0]);
        this.rules = GoRules.get();
        this.node = this.rules.getInitialNode();
        this.availableMinimaxes = [
            new GoMinimax(this.rules, 'GoMinimax'),
        ];
        this.encoder = GoMove.encoder;
        this.tutorial = new GoTutorial().tutorial;
        this.canPass = true;
        this.boardHeight = this.getState().board.length;
        this.boardWidth = this.getState().board[0].length;
        this.updateBoard();
    }
    public async onClick(x: number, y: number): Promise<MGPValidation> {
        const clickValidity: MGPValidation = this.canUserPlay('#click_' + x + '_' + y);
        if (clickValidity.isFailure()) {
            return this.cancelMove(clickValidity.getReason());
        }
        this.last = MGPOptional.empty(); // now that the user stopped trying to do a move
        // we stop showing the user the last move
        const resultlessMove: GoMove = new GoMove(x, y);
        return this.chooseMove(resultlessMove);
    }
    public updateBoard(): void {
        const state: GoState = this.getState();
        const move: MGPOptional<GoMove> = this.node.move;
        const phase: Phase = state.phase;

        this.board = state.getCopiedBoard();
        this.scores = MGPOptional.of(state.getCapturedCopy());

        this.ko = state.koCoord;
        if (move.isPresent()) {
            this.showCaptures();
        } else {
            this.captures = [];
        }
        this.last = move.map((move: GoMove) => move.coord);
        this.canPass = phase !== Phase.FINISHED;
        this.createHoshis();
    }
    private showCaptures(): void {
        const previousState: GoState = this.getPreviousState();
        this.captures = [];
        for (let y: number = 0; y < this.board.length; y++) {
            for (let x: number = 0; x < this.board[0].length; x++) {
                const coord: Coord = new Coord(x, y);
                const wasOccupied: boolean = previousState.getPieceAt(coord).isOccupied();
                const isEmpty: boolean = this.board[y][x] === GoPiece.EMPTY;
                const isNotKo: boolean = this.ko.equalsValue(coord) === false;
                if (wasOccupied && isEmpty && isNotKo) {
                    this.captures.push(coord);
                }
            }
        }
    }
    public override async pass(): Promise<MGPValidation> {
        const phase: Phase = this.getState().phase;
        if (phase === Phase.PLAYING || phase === Phase.PASSED) {
            return this.onClick(GoMove.PASS.coord.x, GoMove.PASS.coord.y);
        }
        assert(phase === Phase.COUNTING || phase === Phase.ACCEPT,
               'GoComponent: pass() must be called only in playing, passed, counting, or accept phases');
        return this.onClick(GoMove.ACCEPT.coord.x, GoMove.ACCEPT.coord.y);
    }
    public getSpaceClass(x: number, y: number): string {
        const piece: GoPiece = this.getState().getPieceAtXY(x, y);
        return this.getPlayerClass(piece.getOwner());
    }
    public spaceIsFull(x: number, y: number): boolean {
        const piece: GoPiece = this.getState().getPieceAtXY(x, y);
        return piece !== GoPiece.EMPTY && !this.isTerritory(x, y);
    }
    public isLastSpace(x: number, y: number): boolean {
        if (this.last.isPresent()) {
            const last: Coord = this.last.get();
            return x === last.x && y === last.y;
        } else {
            return false;
        }
    }
    public isDead(x: number, y: number): boolean {
        return this.getState().isDead(new Coord(x, y));
    }
    public isTerritory(x: number, y: number): boolean {
        return this.getState().isTerritory(new Coord(x, y));
    }
}
