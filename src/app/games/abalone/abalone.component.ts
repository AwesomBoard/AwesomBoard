import { ChangeDetectorRef, Component } from '@angular/core';
import { ArrayUtils, MGPFallible, MGPOptional, MGPValidation, Utils, Set } from '@everyboard/lib';
import { HexagonalGameComponent } from 'src/app/components/game-components/game-component/HexagonalGameComponent';
import { Coord } from 'src/app/jscaip/Coord';
import { Direction } from 'src/app/jscaip/Direction';
import { Ordinal } from 'src/app/jscaip/Ordinal';
import { FourStatePiece } from 'src/app/jscaip/FourStatePiece';
import { HexaDirection } from 'src/app/jscaip/HexaDirection';
import { HexaLayout } from 'src/app/jscaip/HexaLayout';
import { PointyHexaOrientation } from 'src/app/jscaip/HexaOrientation';
import { Player, PlayerOrNone } from 'src/app/jscaip/Player';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { MessageDisplayer } from 'src/app/services/MessageDisplayer';
import { AbaloneFailure } from './AbaloneFailure';
import { AbaloneState } from './AbaloneState';
import { AbaloneMove } from './AbaloneMove';
import { AbaloneConfig, AbaloneLegalityInformation, AbaloneRules } from './AbaloneRules';
import { AbaloneMoveGenerator } from './AbaloneMoveGenerator';
import { PlayerNumberMap } from 'src/app/jscaip/PlayerMap';
import { Arrow } from 'src/app/components/game-components/arrow-component/Arrow';
import { MCTS } from 'src/app/jscaip/AI/MCTS';
import { AbaloneScoreMinimax } from './AbaloneScoreMinimax';

type CapturedInfo = {
    coord: Coord,
    pieceClasses: string[],
};

type AbaloneArrowInfo = {

    start: Coord;

    end: Coord;

    pointed: Coord;
};

@Component({
    selector: 'app-abalone',
    templateUrl: './abalone.component.html',
    styleUrls: ['../../components/game-components/game-component/game-component.scss'],
})
export class AbaloneComponent extends HexagonalGameComponent<AbaloneRules,
                                                             AbaloneMove,
                                                             AbaloneState,
                                                             FourStatePiece,
                                                             AbaloneConfig,
                                                             AbaloneLegalityInformation>
{
    public moveds: Coord[] = [];

    public captureds: CapturedInfo[] = [];

    public directions: Arrow<HexaDirection>[] = [];

    public selecteds: Coord[] = [];

    public boardNeighboringCoords: Coord[] = new Set(AbaloneRules
        .get()
        .getInitialState()
        .getCoordsAndContents()
        .flatMap((coordAndContent: { coord: Coord }) => coordAndContent.coord.getOrdinalNeighbors())).toList();

    public constructor(messageDisplayer: MessageDisplayer, cdr: ChangeDetectorRef) {
        super(messageDisplayer, cdr);
        this.setRulesAndNode('Abalone');
        this.availableAIs = [
            new AbaloneScoreMinimax(),
            new MCTS($localize`MCTS`, new AbaloneMoveGenerator(), this.rules),
        ];
        this.encoder = AbaloneMove.encoder;
        this.scores = MGPOptional.of(PlayerNumberMap.of(0, 0));
        this.SPACE_SIZE = 30;
        this.hexaLayout = new HexaLayout(this.SPACE_SIZE,
                                         new Coord(- 8 * this.SPACE_SIZE, 2 * this.SPACE_SIZE),
                                         PointyHexaOrientation.INSTANCE);
    }

    public async updateBoard(_triggerAnimation: boolean): Promise<void> {
        this.hexaBoard = this.getState().getCopiedBoard();
        this.scores = MGPOptional.of(this.getState().getScores());
    }

    public override hideLastMove(): void {
        this.moveds = [];
        this.captureds = [];
    }

    public override cancelMoveAttempt(): void {
        this.directions = [];
        this.selecteds = [];
    }

    public override async showLastMove(move: AbaloneMove): Promise<void> {
        if (move.isSingleCoord()) {
            this.showPushingMove(move);
        } else {
            this.showSideStepMove(move);
        }
    }

    private showPushingMove(move: AbaloneMove): void {
        const previousState: AbaloneState = this.getPreviousState();
        let moved: Coord = move.coord;
        this.moveds = [moved];
        moved = moved.getNext(move.dir);
        while (AbaloneState.isOnBoard(moved) && previousState.isPiece(moved)) {
            this.moveds.push(moved);
            moved = moved.getNext(move.dir);
        }
        if (AbaloneState.isOnBoard(moved)) {
            this.moveds.push(moved);
        } else {
            const fallenPieceCoord: Coord = moved.getPrevious(move.dir);
            const fallenPlayer: FourStatePiece = previousState.getPieceAt(fallenPieceCoord);
            this.captureds = [{
                coord: moved,
                pieceClasses: [this.getPlayerClass(fallenPlayer.getPlayer())],
            }];
        }
    }

    private showSideStepMove(move: AbaloneMove): void {
        let last: Coord = move.lastPiece.get();
        const alignment: HexaDirection = move.coord.getDirectionToward(last).get();
        last = last.getNext(alignment);
        let processed: Coord = move.coord;
        while (processed.equals(last) === false) {
            this.moveds.push(processed);
            const landing: Coord = processed.getNext(move.dir);
            if (AbaloneState.isOnBoard(landing)) {
                this.moveds.push(landing);
            } else {
                // Since only current player could have translated out their pieces
                const previousPlayer: Player = this.getState().getPreviousPlayer();
                this.captureds.push({
                    coord: landing,
                    pieceClasses: [this.getPlayerClass(previousPlayer)],
                });
            }
            processed = processed.getNext(alignment);
        }
    }

    public async onPieceClick(coord: Coord): Promise<MGPValidation> {
        const x: number = coord.x;
        const y: number = coord.y;
        const clickValidity: MGPValidation = await this.canUserPlay('#piece-' + x + '-' + y);
        if (clickValidity.isFailure()) {
            return this.cancelMove(clickValidity.getReason());
        }
        return this.onLegalPieceClick(coord);
    }

    private async onLegalPieceClick(coord: Coord): Promise<MGPValidation> {
        const x: number = coord.x;
        const y: number = coord.y;
        const opponent: Player = this.getState().getCurrentOpponent();
        if (this.hexaBoard[y][x].is(opponent)) {
            return this.opponentClick(coord);
        }
        if (this.selecteds.length === 0) {
            return this.firstClick(coord);
        } else if (this.selecteds.length === 1) {
            return this.secondClick(coord);
        } else {
            return this.thirdClick(coord);
        }
    }

    private async opponentClick(coord: Coord): Promise<MGPValidation> {
        return this.tryChoosingDirection(coord);
    }

    private async firstClick(coord: Coord): Promise<MGPValidation> {
        this.selecteds = [coord];
        this.showPossibleDirections();
        return MGPValidation.SUCCESS;
    }

    private showPossibleDirections(): void {
        this.directions = [];
        Utils.assert(this.selecteds.length > 0, 'do not call showPossibleDirections if there is no selected piece');
        this.showDirection();
    }

    private showDirection(): void {
        const state: AbaloneState = this.getState();
        const config: MGPOptional<AbaloneConfig> = this.getConfig();
        for (const dir of HexaDirection.factory.all) {
            const startToEnd: AbaloneArrowInfo = this.getArrowPath(dir);
            let theoretical: AbaloneMove;
            if (this.selecteds.length === 1) {
                theoretical = AbaloneMove.ofSingleCoord(startToEnd.start, dir);
            } else {
                theoretical = AbaloneMove.ofDoubleCoord(startToEnd.start, startToEnd.end, dir);
            }
            const isLegal: MGPFallible<AbaloneLegalityInformation> = this.rules.isLegal(theoretical, state, config);
            if (isLegal.isSuccess()) {
                const arrow: Arrow<HexaDirection> =
                    new Arrow<HexaDirection>(startToEnd.start,
                                             startToEnd.pointed,
                                             dir,
                                             (c: Coord) => this.hexaLayout.getCenterAt(c));
                this.directions.push(arrow);
            }
        }
    }

    private getArrowPath(direction: HexaDirection): AbaloneArrowInfo {
        let start: Coord = this.selecteds[0];
        let end: Coord = this.selecteds[this.selecteds.length - 1];
        if (this.selecteds.length > 1 &&
            start.getDirectionToward(end).get().equals(direction.getOpposite()))
        {
            // If we selected (B, C) and a move from C to A is possible, then we swap them
            // So the drawn line goes from C to A instead of only B to A.
            const tmp: Coord = start;
            start = end;
            end = tmp;
        }
        return { start, end, pointed: this.getPointed(start, end, direction) };
    }

    private getPointed(start: Coord, end: Coord, direction: HexaDirection): Coord {
        const isPush: boolean = this.selecteds.length === 1 || start.getDirectionToward(end).get().equals(direction);
        if (isPush) {
            const state: AbaloneState = this.getState();
            const currentPlayer: Player = state.getCurrentPlayer();
            let pointed: Coord = end;
            while (state.isOnBoard(pointed) && state.getPieceAt(pointed).is(currentPlayer)) {
                pointed = pointed.getNext(direction, 1);
            }
            return pointed;
        } else {
            return start.getNext(direction, 1);
        }
    }

    public isReachable(c: FourStatePiece): boolean {
        return c !== FourStatePiece.UNREACHABLE;
    }

    public isPiece(c: FourStatePiece): boolean {
        return c !== FourStatePiece.EMPTY;
    }

    private async secondClick(coord: Coord): Promise<MGPValidation> {
        const maxGroup: number = this.getConfig().get().maximumPushingGroupSize;
        const firstPiece: Coord = this.selecteds[0];
        if (coord.equals(firstPiece)) {
            return this.cancelMove();
        }
        if (coord.isHexagonallyAlignedWith(firstPiece) === false) {
            return this.firstClick(coord);
        }
        const distance: number = coord.getLinearDistanceToward(firstPiece);
        if (maxGroup <= distance) {
            return this.cancelMove(AbaloneFailure.CANNOT_MOVE_MORE_THAN_N_PIECES(maxGroup));
        }
        const alignment: Direction = firstPiece.getDirectionToward(coord).get();
        this.selecteds = [firstPiece];
        for (let i: number = 0; i < distance; i++) {
            const testedCoord: Coord = firstPiece.getNext(alignment, i + 1);
            const player: Player = this.getState().getCurrentPlayer();
            if (this.hexaBoard[testedCoord.y][testedCoord.x].is(player) === false) {
                return this.firstClick(coord);
            }
            this.selecteds.push(testedCoord);
        }
        this.showPossibleDirections();
        return MGPValidation.SUCCESS;
    }

    private async thirdClick(clicked: Coord): Promise<MGPValidation> {
        const firstPiece: Coord = this.selecteds[0];
        if (clicked.equals(firstPiece)) {
            return this.deselectExtremity(true);
            // move firstPiece one step closer to lastPiece if possible
        }
        const lastPiece: Coord = this.selecteds[this.selecteds.length - 1];
        if (clicked.equals(lastPiece)) {
            return this.deselectExtremity(false);
            // move lastPiece one step closer to firstPiece if possible
        }
        if (this.selecteds.length > 2 && this.isClickedCoordSelected(clicked)) {
            return this.cancelMove();
        }
        return this.tryExtension(clicked, firstPiece, lastPiece);
    }

    private isClickedCoordSelected(clicked: Coord): boolean {
        return this.selecteds.length > 2 &&
               this.selecteds.some((coord: Coord) => coord.equals(clicked));
    }

    private async tryExtension(clicked: Coord, firstPiece: Coord, lastPiece: Coord): Promise<MGPValidation> {
        const alignment: MGPFallible<Ordinal> = Ordinal.factory.fromMove(firstPiece, clicked);
        if (alignment.isSuccess()) {
            const secondAlignment: MGPFallible<Ordinal> = Ordinal.factory.fromMove(lastPiece, clicked);
            if (alignment.equals(secondAlignment)) {
                // Then it's an extension of the line
                const firstDistance: number = firstPiece.getLinearDistanceToward(clicked);
                const secondDistance: number = lastPiece.getLinearDistanceToward(clicked);
                const config: AbaloneConfig = this.getConfig().get();
                const maxSizeGroup: number = config.maximumPushingGroupSize;
                if (Math.max(firstDistance, secondDistance) === maxSizeGroup - 1) {
                    this.selecteds.push(clicked);
                    ArrayUtils.sortByDescending(this.selecteds, AbaloneMove.sortCoord);
                    this.showPossibleDirections();
                    return MGPValidation.SUCCESS;
                } else {
                    return this.cancelMove(AbaloneFailure.CANNOT_MOVE_MORE_THAN_N_PIECES(maxSizeGroup));
                }
            }
        }
        const legality: MGPValidation = await this.cancelMove(AbaloneFailure.LINE_AND_COORD_NOT_ALIGNED());
        await this.firstClick(clicked);
        return legality;
    }

    private async deselectExtremity(first: boolean): Promise<MGPValidation> {
        const start: number = first ? 1 : 0;
        const end: number | undefined = first ? undefined : -1;
        this.selecteds = this.selecteds.slice(start, end);
        this.showPossibleDirections();
        return MGPValidation.SUCCESS;
    }

    public async chooseDirection(dir: HexaDirection): Promise<MGPValidation> {
        const clickValidity: MGPValidation = await this.canUserPlay('#direction-' + dir.toString());
        if (clickValidity.isFailure()) {
            return this.cancelMove(clickValidity.getReason());
        }
        return this._chooseDirection(dir);
    }

    private async _chooseDirection(dir: HexaDirection): Promise<MGPValidation> {
        const firstPiece: Coord = this.selecteds[0];
        if (this.selecteds.length === 1) {
            const move: AbaloneMove = AbaloneMove.ofSingleCoord(firstPiece, dir);
            return this.chooseMove(move);
        } else {
            const lastPiece: Coord = this.selecteds[this.selecteds.length - 1];
            const move: AbaloneMove = AbaloneMove.ofDoubleCoord(firstPiece, lastPiece, dir);
            return this.chooseMove(move);
        }
    }

    public async onInvisibleSpaceClick(coord: Coord): Promise<MGPValidation> {
        const clickValidity: MGPValidation = await this.canUserPlay('#invisible-space-' + coord.x + '-' + coord.y);
        if (clickValidity.isFailure()) {
            return this.cancelMove(clickValidity.getReason());
        }
        return this.tryChoosingDirection(coord);
    }

    public async onSpaceClick(coord: Coord): Promise<MGPValidation> {
        const clickValidity: MGPValidation = await this.canUserPlay('#space-' + coord.x + '-' + coord.y);
        if (clickValidity.isFailure()) {
            return this.cancelMove(clickValidity.getReason());
        }
        if (this.getState().getPieceAt(coord).isPlayer()) {
            return this.onLegalPieceClick(coord);
        }
        if (this.selecteds.length === 0) {
            return this.cancelMove(RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_EMPTY());
        } else {
            return this.tryChoosingDirection(coord);
        }
    }

    private async tryChoosingDirection(clicked: Coord): Promise<MGPValidation> {
        for (const direction of this.directions) {
            if (direction.landing.equals(clicked)) {
                return this._chooseDirection(direction.dir);
            }
        }
        return this.cancelMove();
    }

    public getSquareClassesAt(coord: Coord): string[] {
        const classes: string[] = [];
        if (this.moveds.some((c: Coord) => c.equals(coord))) {
            classes.push('moved-fill');
        }
        return classes;
    }

    public getPieceClasses(coord: Coord): string[] {
        const player: PlayerOrNone = this.getState().getPieceAt(coord).getPlayer();
        const classes: string[] = [this.getPlayerClass(player)];
        if (this.selecteds.some((c: Coord) => c.equals(coord))) {
            classes.push('selected-stroke');
        }
        return classes;
    }

}
