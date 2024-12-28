import { MGPOptional, MGPValidation, Utils } from '@everyboard/lib';
import { ChangeDetectorRef, Component } from '@angular/core';
import { GoMove } from 'src/app/games/gos/GoMove';
import { GoConfig, GoRules } from 'src/app/games/gos/go/GoRules';
import { GoLegalityInformation } from '../AbstractGoRules';
import { GoState } from 'src/app/games/gos/GoState';
import { GoPiece } from '../GoPiece';
import { Coord } from 'src/app/jscaip/Coord';
import { GroupData } from 'src/app/jscaip/BoardData';
import { MessageDisplayer } from 'src/app/services/MessageDisplayer';
import { GobanGameComponent } from 'src/app/components/game-components/goban-game-component/GobanGameComponent';
import { MCTS } from 'src/app/jscaip/AI/MCTS';
import { GoMoveGenerator } from './GoMoveGenerator';
import { Debug } from 'src/app/utils/Debug';
import { PlayerNumberMap } from 'src/app/jscaip/PlayerMap';
import { GoPhase } from '../GoPhase';
import { GoMinimax } from './GoMinimax';
import { ScoreName } from 'src/app/components/game-components/game-component/GameComponent';

@Component({
    selector: 'app-go',
    templateUrl: './go.component.html',
    styleUrls: ['../../../components/game-components/game-component/game-component.scss'],
})
@Debug.log
export class GoComponent extends GobanGameComponent<GoRules,
                                                    GoMove,
                                                    GoState,
                                                    GoPiece,
                                                    GoConfig,
                                                    GoLegalityInformation>
{

    public boardInfo: GroupData<GoPiece>;

    public ko: MGPOptional<Coord> = MGPOptional.empty();

    public last: MGPOptional<Coord> = MGPOptional.empty();

    public captures: Coord[]= [];

    public GoPiece: typeof GoPiece = GoPiece;

    public constructor(messageDisplayer: MessageDisplayer, cdr: ChangeDetectorRef) {
        super(messageDisplayer, cdr);
        this.setRulesAndNode('Go');
        this.availableAIs = [
            new GoMinimax(),
            new MCTS($localize`MCTS`, new GoMoveGenerator(), this.rules),
        ];
        this.encoder = GoMove.encoder;
        this.canPass = true;
        this.scores = MGPOptional.of(PlayerNumberMap.of(0, 0));
    }

    public override async showLastMove(move: GoMove): Promise<void> {
        this.last = MGPOptional.of(move.coord);
        this.showCaptures();
    }

    public override hideLastMove(): void {
        this.captures = [];
        this.last = MGPOptional.empty();
    }

    public async onClick(coord: Coord): Promise<MGPValidation> {
        const x: number = coord.x;
        const y: number = coord.y;
        const clickValidity: MGPValidation = await this.canUserPlay('#click-' + x + '-' + y);
        if (clickValidity.isFailure()) {
            return this.cancelMove(clickValidity.getReason());
        }
        const resultlessMove: GoMove = new GoMove(x, y);
        return this.chooseMove(resultlessMove);
    }

    public async updateBoard(_triggerAnimation: boolean): Promise<void> {
        const state: GoState = this.getState();
        const phase: GoPhase = state.phase;

        this.board = state.getCopiedBoard();
        this.updateScores();

        this.ko = state.koCoord;
        this.canPass = phase !== 'FINISHED';
        this.createHoshis();
    }

    private updateScores(): void {
        this.scores = MGPOptional.of(this.getState().captured);
    }

    public override getScoreName(): ScoreName {
        switch (this.getState().phase) {
            case 'COUNTING':
            case 'ACCEPT':
            case 'FINISHED':
                return ScoreName.POINTS;
            default:
                return ScoreName.CAPTURES;
        }
    }

    private showCaptures(): void {
        const previousState: GoState = this.getPreviousState();
        this.captures = [];
        for (let y: number = 0; y < this.getHeight(); y++) {
            for (let x: number = 0; x < this.getWidth(); x++) {
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
        const phase: GoPhase = this.getState().phase;
        if (phase === 'PLAYING' || phase === 'PASSED') {
            return this.onClick(GoMove.PASS.coord);
        }
        Utils.assert(phase === 'COUNTING' || phase === 'ACCEPT',
                     'GoComponent: pass() must be called only in playing, passed, counting, or accept phases');
        return this.onClick(GoMove.ACCEPT.coord);
    }

    public getSpaceClass(coord: Coord): string {
        const state: GoState = this.getState();
        const piece: GoPiece = state.getPieceAt(coord);
        return this.getPlayerClass(piece.getOwner());
    }

    public spaceIsFull(coord: Coord): boolean {
        const state: GoState = this.getState();
        const piece: GoPiece = state.getPieceAt(coord);
        return piece !== GoPiece.EMPTY && this.isTerritory(coord) === false;
    }

    public isLastSpace(coord: Coord): boolean {
        return this.last.equalsValue(coord);
    }

    public isDead(coord: Coord): boolean {
        return this.getState().isDead(coord);
    }

    public isTerritory(coord: Coord): boolean {
        return this.getState().isTerritory(coord);
    }

}
