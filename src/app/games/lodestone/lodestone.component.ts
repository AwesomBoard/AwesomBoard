import { ChangeDetectorRef, Component } from '@angular/core';
import { GameComponent } from 'src/app/components/game-components/game-component/GameComponent';
import { Coord } from 'src/app/jscaip/Coord';
import { Ordinal } from 'src/app/jscaip/Ordinal';
import { Player, PlayerOrNone } from 'src/app/jscaip/Player';
import { MessageDisplayer } from 'src/app/services/MessageDisplayer';
import { TableUtils } from 'src/app/jscaip/TableUtils';
import { MGPMap, MGPOptional, MGPValidation, Utils } from '@everyboard/lib';
import { LodestoneFailure } from './LodestoneFailure';
import { LodestoneCaptures, LodestoneMove } from './LodestoneMove';
import { LodestoneOrientation, LodestoneDirection, LodestonePiece, LodestonePieceNone, LodestonePieceLodestone, LodestoneDescription } from './LodestonePiece';
import { LodestoneInfos, PressurePlatePositionInformation, LodestoneRules, PressurePlateViewPosition } from './LodestoneRules';
import { LodestonePositions, LodestonePressurePlate, LodestonePressurePlateGroup, LodestonePressurePlatePosition, LodestonePressurePlates, LodestoneState } from './LodestoneState';
import { MCTS } from 'src/app/jscaip/AI/MCTS';
import { EmptyRulesConfig } from 'src/app/jscaip/RulesConfigUtil';
import { LodestoneMoveGenerator } from './LodestoneMoveGenerator';
import { PlayerNumberMap } from 'src/app/jscaip/PlayerMap';
import { ViewBox } from 'src/app/components/game-components/GameComponentUtils';
import { LodestoneScoreMinimax } from './LodestoneScoreMinimax';

export type LodestoneInfo = {
    direction: LodestoneDirection,
    owner: Player,
    selectedClass: string,
    movingClass: string,
    orientation: LodestoneOrientation,
};

type PressurePlateGroupInfo = {
    groupPosition: LodestonePressurePlatePosition,
    plateInfos: PressurePlateInfo[],
};

type PressurePlateInfo = {
    plateIndex: number,
    coords: PressurePlateCoordInfo[],
};

type PressurePlateCoordInfo = {
    coord: Coord,
    hasPiece: boolean,
    pieceClasses: string[],
    squareClasses: string[],
    temporary: boolean,
};

type CaptureInfo = {
    pieceClasses: string[],
};

type ViewInfo = {
    availableLodestones: LodestoneInfo[],
    capturesToPlace: CaptureInfo[],
    pressurePlateGroupInfos: PressurePlateGroupInfo[],
};

type PreCaptureInfo = {
    preCaptureState: LodestoneState;
    preCaptureMove: LodestoneMove;
}

@Component({
    selector: 'app-lodestone',
    templateUrl: './lodestone.component.html',
    styleUrls: ['../../components/game-components/game-component/game-component.scss'],
})
export class LodestoneComponent
    extends GameComponent<LodestoneRules, LodestoneMove, LodestoneState, EmptyRulesConfig, LodestoneInfos>
{
    private static readonly PRESSURE_PLATE_EXTRA_SHIFT: number = 0.2;

    private static readonly PRESSURE_PLATES_POSITIONS: PressurePlatePositionInformation = MGPMap.from({
        top: {
            start: (plateIndex: number, plateWidth: number) => new Coord(
                (8 - plateWidth) / 2,
                - (plateIndex + 1) * (1 + LodestoneComponent.PRESSURE_PLATE_EXTRA_SHIFT),
            ),
            direction: Ordinal.RIGHT,
        },
        bottom: {
            start: (plateIndex: number, plateWidth: number) => new Coord(
                (8 - plateWidth) / 2,
                8 + LodestoneComponent.PRESSURE_PLATE_EXTRA_SHIFT +
                plateIndex * (1 + LodestoneComponent.PRESSURE_PLATE_EXTRA_SHIFT),
            ),
            direction: Ordinal.RIGHT,
        },
        left: {
            start: (plateIndex: number, plateWidth: number) => new Coord(
                - (1 + LodestoneComponent.PRESSURE_PLATE_EXTRA_SHIFT) * (1 + plateIndex),
                (8 - plateWidth) / 2,
            ),
            direction: Ordinal.DOWN,
        },
        right: {
            start: (plateIndex: number, plateWidth: number) => new Coord(
                8 + LodestoneComponent.PRESSURE_PLATE_EXTRA_SHIFT +
                plateIndex * (1 + LodestoneComponent.PRESSURE_PLATE_EXTRA_SHIFT),
                (8 - plateWidth) / 2,
            ),
            direction: Ordinal.DOWN,
        },
    });

    public PIECE_RADIUS: number;

    public viewInfo: ViewInfo = {
        availableLodestones: [],
        capturesToPlace: [],
        pressurePlateGroupInfos: [],
    };

    public viewBox: ViewBox;
    public platesGroupSize: number;
    public boardSize: number;

    public displayedState: LodestoneState;
    private stateAfterPlacingLodestone: MGPOptional<LodestoneState> = MGPOptional.empty();

    // Variables used to display ongoing move
    public selectedCoord: MGPOptional<Coord> = MGPOptional.empty();
    private selectedLodestone: MGPOptional<LodestonePieceLodestone> = MGPOptional.empty();
    private ongoingMoves: Coord[] = [];
    private ongoingCaptures: Coord[] = [];
    private capturesToPlace: number = 0;
    private captures: LodestoneCaptures = { top: 0, bottom: 0, left: 0, right: 0 };
    // Variables used to display last move
    private lastMoves: Coord[] = [];
    private lastCaptures: Coord[] = [];

    public constructor(messageDisplayer: MessageDisplayer, cdr: ChangeDetectorRef) {
        super(messageDisplayer, cdr);
        this.setRulesAndNode('Lodestone');
        this.availableAIs = [
            new LodestoneScoreMinimax(),
            new MCTS($localize`MCTS`, new LodestoneMoveGenerator(), this.rules),
        ];
        this.encoder = LodestoneMove.encoder;
        this.PIECE_RADIUS = (this.SPACE_SIZE - (2 * this.STROKE_WIDTH)) * 0.5;
        this.displayedState = this.getState();
        this.scores = MGPOptional.of(PlayerNumberMap.of(0, 0));
    }

    public getViewBox(): ViewBox {
        const left: number = - this.platesGroupSize;
        const up: number = - (this.platesGroupSize + this.SPACE_SIZE + this.STROKE_WIDTH);
        const width: number = this.boardSize + (2 * this.platesGroupSize);
        const height: number = width + (2 * (this.SPACE_SIZE + this.STROKE_WIDTH));
        return new ViewBox(left, up, width, height);
    }

    public async selectCoord(x: number, y: number): Promise<MGPValidation> {
        const coord: Coord = new Coord(x, y);
        const clickValidity: MGPValidation = await this.canUserPlay('#square-' + coord.x + '-' + coord.y);
        if (clickValidity.isFailure()) {
            return this.cancelMove(clickValidity.getReason());
        }
        if (this.capturesToPlace > 0) {
            return this.cancelMove(LodestoneFailure.MUST_PLACE_CAPTURES());
        }
        const targetValidity: MGPValidation = LodestoneRules.get().isTargetLegal(this.getState(), coord);
        if (targetValidity.isFailure()) {
            return this.cancelMove(targetValidity.getReason());
        }
        if (this.selectedCoord.equalsValue(coord)) {
            return this.cancelMove();
        }
        this.selectedCoord = MGPOptional.of(coord);
        if (this.selectedLodestone.isPresent()) {
            return this.putLodestone();
        } else {
            this.updateViewInfo();
            return MGPValidation.SUCCESS;
        }
    }

    public async selectLodestone(lodestone: LodestoneDescription): Promise<MGPValidation> {
        const owner: string = this.getCurrentPlayer().toString();
        const clickedElement: string = '#lodestone-' + lodestone.direction + '-' + lodestone.orientation + '-' + owner;
        const clickValidity: MGPValidation = await this.canUserPlay(clickedElement);
        if (clickValidity.isFailure()) {
            return this.cancelMove(clickValidity.getReason());
        }
        Utils.assert(this.capturesToPlace === 0,
                     'should not be able to click on a lodestone when captures need to be placed');
        const player: Player = this.getCurrentPlayer();
        const playerLodestone: LodestonePieceLodestone = LodestonePieceLodestone.of(player, lodestone);
        if (this.selectedLodestone.equalsValue(playerLodestone)) {
            return this.cancelMove();
        }
        this.selectedLodestone = MGPOptional.of(playerLodestone);
        if (this.selectedCoord.isPresent()) {
            return this.putLodestone();
        } else {
            this.updateViewInfo();
            return MGPValidation.SUCCESS;
        }
    }

    public override hideLastMove(): void {
        this.lastCaptures = [];
        this.lastMoves = [];
        this.updateViewInfo();
    }

    private async putLodestone(): Promise<MGPValidation> {
        Utils.assert(this.selectedCoord.isPresent(), 'coord should have been selected');
        Utils.assert(this.selectedLodestone.isPresent(), 'lodestone should have been selected');
        const coord: Coord = this.selectedCoord.get();
        const lodestone: LodestoneDescription = this.selectedLodestone.get();
        const state: LodestoneState = this.getState();
        const validity: MGPValidation = LodestoneRules.get().isLegalWithoutCaptures(state, coord, lodestone.direction);
        Utils.assert(validity.isSuccess(), 'Lodestone component should only allow creation of legal moves');
        const infos: LodestoneInfos = LodestoneRules.get().applyMoveWithoutPlacingCaptures(state, coord, lodestone);
        this.ongoingCaptures = infos.captures;
        this.ongoingMoves = infos.moved;
        this.capturesToPlace = Math.min(infos.captures.length, state.remainingSpaces());
        if (this.capturesToPlace === 0) {
            return this.applyMove();
        } else {
            this.displayedState = this.displayedState.withBoard(infos.board);
            this.stateAfterPlacingLodestone = MGPOptional.of(this.displayedState);
            this.updateViewInfo();
            return MGPValidation.SUCCESS;
        }
    }

    private async applyMove(): Promise<MGPValidation> {
        Utils.assert(this.selectedCoord.isPresent(), 'coord should have been selected');
        Utils.assert(this.selectedLodestone.isPresent(), 'lodestone should have been selected');
        const coord: Coord = this.selectedCoord.get();
        const lodestone: LodestoneDescription = this.selectedLodestone.get();
        const move: LodestoneMove = new LodestoneMove(coord, lodestone.direction, lodestone.orientation, this.captures);
        return this.chooseMove(move);
    }

    public async onPressurePlateClick(position: LodestonePressurePlatePosition,
                                      plateIndex: number,
                                      pieceIndex: number)
    : Promise<MGPValidation>
    {
        const squareName: string = '#plate-' + position + '-' + plateIndex + '-' + pieceIndex;
        const clickValidity: MGPValidation = await this.canUserPlay(squareName);
        if (clickValidity.isFailure()) {
            return this.cancelMove(clickValidity.getReason());
        }
        return this.selectPressurePlate(position);
    }

    public async onTemporaryPressurePlateClick(position: LodestonePressurePlatePosition,
                                               plateIndex: number,
                                               pieceIndex: number)
    : Promise<MGPValidation>
    {
        const squareName: string = '#plate-' + position + '-' + plateIndex + '-' + pieceIndex;
        const clickValidity: MGPValidation = await this.canUserPlay(squareName);
        if (clickValidity.isFailure()) {
            return this.cancelMove(clickValidity.getReason());
        }
        return this.deselectPressurePlate(position);
    }

    private async selectPressurePlate(position: LodestonePressurePlatePosition): Promise<MGPValidation> {
        if (this.capturesToPlace === 0) {
            return this.cancelMove(LodestoneFailure.NO_CAPTURES_TO_PLACE_YET());
        }
        this.capturesToPlace--;
        this.captures[position]++;
        const state: LodestoneState = this.stateAfterPlacingLodestone.get();
        const opponent: Player = this.getCurrentOpponent();
        const board: LodestonePiece[][] = TableUtils.copy(state.board);
        const pressurePlates: LodestonePressurePlates = { ...state.pressurePlates };
        const lodestones: LodestonePositions = state.lodestones.getCopy();
        LodestoneRules.get().updatePressurePlates(board, pressurePlates, lodestones, opponent, this.captures);
        this.displayedState = new LodestoneState(board, state.turn, lodestones, pressurePlates);
        if (this.capturesToPlace === 0) {
            return this.applyMove();
        } else {
            this.updateViewInfo();
            this.showPressurePlateDifferences(this.getState(), this.displayedState, true);
        }
        return MGPValidation.SUCCESS;
    }

    public async deselectPressurePlate(position: LodestonePressurePlatePosition): Promise<MGPValidation> {
        this.capturesToPlace++;
        this.captures[position]--;
        const state: LodestoneState = this.stateAfterPlacingLodestone.get();
        const opponent: Player = this.getCurrentOpponent();
        const board: LodestonePiece[][] = TableUtils.copy(state.board);
        const pressurePlates: LodestonePressurePlates = { ...state.pressurePlates };
        const lodestones: LodestonePositions = state.lodestones.getCopy();
        LodestoneRules.get().updatePressurePlates(board, pressurePlates, lodestones, opponent, this.captures);
        this.displayedState = new LodestoneState(board, state.turn, lodestones, pressurePlates);
        this.updateViewInfo();
        this.showPressurePlateDifferences(this.getState(), this.displayedState, true);
        return MGPValidation.SUCCESS;
    }

    public async updateBoard(_triggerAnimation: boolean): Promise<void> {
        this.displayedState = this.getState();
        this.removePlayerLodestoneFromDisplayedState();
        this.scores = MGPOptional.of(this.getState().getScores());
        this.boardSize = this.getState().board.length * this.SPACE_SIZE;
        const abstractPlateWidth: number = this.getState().pressurePlates.top.plates.length;
        this.platesGroupSize = abstractPlateWidth * this.SPACE_SIZE * 1.2;
        this.updateViewInfo();
    }

    public override cancelMoveAttempt(): void {
        this.displayedState = this.getState();
        this.stateAfterPlacingLodestone = MGPOptional.empty();
        this.ongoingCaptures = [];
        this.ongoingMoves = [];
        this.removePlayerLodestoneFromDisplayedState();
        this.selectedCoord = MGPOptional.empty();
        this.selectedLodestone = MGPOptional.empty();
        this.capturesToPlace = 0;
        this.captures = { top: 0, bottom: 0, left: 0, right: 0 };
        this.updateViewInfo();
    }

    private removePlayerLodestoneFromDisplayedState(): void {
        const playerLodestone: MGPOptional<Coord> = this.displayedState.lodestones.get(this.getCurrentPlayer());
        if (playerLodestone.isPresent()) {
            // Hide the lodestone so that it is clearer that the player can make its next move here
            const board: LodestonePiece[][] = TableUtils.copy(this.displayedState.board);
            board[playerLodestone.get().y][playerLodestone.get().x] = LodestonePieceNone.EMPTY;
            this.displayedState = this.displayedState.withBoard(board);
        }
    }

    private updateViewInfo(): void {
        this.showAvailableLodestones();
        this.showCapturesToPlace();
        this.showPressurePlates();
    }

    public getPieceClasses(x: number, y: number): string[] {
        const coord: Coord = new Coord(x, y);
        const piece: LodestonePiece = this.displayedState.getPieceAt(coord);
        let classes: string[] = [];
        if (piece.isPlayerPiece()) {
            return [this.getPlayerClass(piece.owner)];
        } else if (piece.isUnreachable()) {
            const preCaptureInfo: MGPOptional<PreCaptureInfo> = this.getPreCaptureInfo();
            if (preCaptureInfo.isAbsent()) {
                return [];
            }
            const pieceThatCrumbledLastEndOfTurn: MGPOptional<LodestonePiece> =
                this.getPieceThatCrumbledLastEndOfTurn(coord,
                                                       preCaptureInfo.get().preCaptureState,
                                                       preCaptureInfo.get().preCaptureMove);
            if (pieceThatCrumbledLastEndOfTurn.isPresent()) {
                const crumbledOwner: PlayerOrNone = pieceThatCrumbledLastEndOfTurn.get().owner;
                classes = [
                    this.getPlayerClass(crumbledOwner),
                    'semi-transparent',
                ];
            }
        }
        return classes;
    }

    public getSquareClasses(x: number, y: number): string[] {
        const coord: Coord = new Coord(x, y);
        if (this.ongoingCaptures.concat(this.lastCaptures).some((c: Coord) => c.equals(coord))) {
            return ['captured-fill'];
        } else if (this.ongoingMoves.concat(this.lastMoves).some((c: Coord) => c.equals(coord))) {
            return ['moved-fill'];
        } else {
            return [];
        }
    }

    public hasPieceToDraw(x: number, y: number): boolean {
        return this.getPieceClasses(x, y).length > 0;
    }

    private getPreCaptureInfo(): MGPOptional<PreCaptureInfo> {
        if (this.selectedCoord.isPresent() && this.selectedLodestone.isPresent()) {
            return MGPOptional.of({
                preCaptureMove: new LodestoneMove(this.selectedCoord.get(),
                                                  this.selectedLodestone.get().direction,
                                                  this.selectedLodestone.get().orientation),
                preCaptureState: this.getState(),
            });
        } else if (this.node.previousMove.isPresent()) {
            return MGPOptional.of({
                preCaptureMove: this.node.previousMove.get(),
                preCaptureState: this.getPreviousState(),
            });
        } else {
            return MGPOptional.empty();
        }
    }

    public getLodestoneInfo(x: number, y: number): MGPOptional<LodestoneInfo> {
        const coord: Coord = new Coord(x, y);
        const piece: LodestonePiece = this.displayedState.getPieceAt(coord);
        if (piece.isLodestone()) {
            return MGPOptional.of(this.getLodestoneInfoAt(this.displayedState, coord));
        } else if (piece.isUnreachable()) {
            const preCaptureInfo: MGPOptional<PreCaptureInfo> = this.getPreCaptureInfo();
            if (preCaptureInfo.isPresent()) {
                if (this.selectedCoord.equalsValue(coord)) {
                    const lodestone: LodestonePieceLodestone = this.selectedLodestone.get();
                    return MGPOptional.of(this.getLodestoneInfoFromLodestone(lodestone));
                } else if (this.wasLastMoveLodestone(coord)) {
                    return MGPOptional.of(this.getDroppedThenCrumbedLodestoneInfo(this.node.previousMove.get()));
                } else if (this.isCrumbledLodestone(coord)) {
                    return MGPOptional.of(this.getCrumbledLodestoneInfo(coord));
                }
            }
        }
        return MGPOptional.empty();
    }

    private getDroppedThenCrumbedLodestoneInfo(lastMove: LodestoneMove): LodestoneInfo {
        const lodestoneDescription: LodestoneDescription = {
            direction: lastMove.direction, orientation: lastMove.orientation,
        };
        const lodestone: LodestonePieceLodestone =
            LodestonePieceLodestone.of(this.getCurrentOpponent(), lodestoneDescription);
        return this.getLodestoneInfoFromLodestone(lodestone);
    }

    private getCrumbledLodestoneInfo(coord: Coord): LodestoneInfo {
        const lodestone: LodestonePiece = this.getPreviousState().getPieceAt(coord);
        Utils.assert(lodestone.isLodestone(),
                     'getCrumbledLodestoneInfo should only be called with coord that contain crumbled lodestone!');
        return this.getLodestoneInfoFromLodestone(lodestone as LodestonePieceLodestone);
    }

    private getLodestoneInfoFromLodestone(lodestone: LodestonePieceLodestone): LodestoneInfo {
        const lodestoneInfo: LodestoneInfo = {
            direction: lodestone.direction,
            movingClass: '',
            orientation: lodestone.orientation,
            owner: lodestone.owner,
            selectedClass: '',
        };
        if (lodestone.direction === 'push') {
            lodestoneInfo.movingClass = this.getPlayerClass(lodestone.owner.getOpponent());
        } else {
            lodestoneInfo.movingClass = this.getPlayerClass(lodestone.owner);
        }
        return lodestoneInfo;
    }

    private wasLastMoveLodestone(coord: Coord): boolean {
        if (this.node.parent.isPresent()) {
            return this.node.previousMove.get().coord.equals(coord);
        } else {
            return false;
        }
    }

    private isCrumbledLodestone(coord: Coord): boolean {
        if (this.node.parent.isPresent()) {
            if (this.selectedLodestone.isPresent()) {
                return false;
            } else {
                const state: LodestoneState = this.node.parent.get().gameState;
                const piece: LodestonePiece = state.getPieceAt(coord);
                return piece.isLodestone() &&
                       piece.owner === state.getCurrentOpponent();
            }
        } else {
            return false;
        }
    }

    private getLodestoneInfoAt(state: LodestoneState, coord: Coord): LodestoneInfo {
        const lodestone: LodestonePieceLodestone = state.getPieceAt(coord) as LodestonePieceLodestone;
        Utils.assert(lodestone.isLodestone(), 'piece should be lodestone');
        return this.getLodestoneInfoFromLodestone(lodestone);
    }

    private getPieceThatCrumbledLastEndOfTurn(coord: Coord,
                                              previousState: LodestoneState,
                                              moveToDisplay: LodestoneMove)
    : MGPOptional<LodestonePiece>
    {
        // This coord was filled after move, then crumbled after captures were placed
        const lodestoneDescription: LodestoneDescription = {
            direction: moveToDisplay.direction,
            orientation: moveToDisplay.orientation,
        };
        const lodestoneInfos: LodestoneInfos =
            this.rules.applyMoveWithoutPlacingCaptures(previousState,
                                                       moveToDisplay.coord,
                                                       lodestoneDescription);
        const previousPiece: LodestonePiece = lodestoneInfos.board[coord.y][coord.x];
        const coordHadAPiece: boolean = previousPiece.isEmpty() === false;
        const pieceWasReachable: boolean = previousPiece.isUnreachable() === false;
        if (coordHadAPiece && pieceWasReachable) {
            return MGPOptional.of(previousPiece);
        } else {
            return MGPOptional.empty();
        }
    }

    private showAvailableLodestones(): void {
        if (this.capturesToPlace > 0) {
            // While placing captures, we don't want to display the lodestones (as the player already selected it)
            this.viewInfo.availableLodestones = [];
        } else {
            // Here, we rely on the state after the move, as the lodestones don't change during a move
            // Moreover, since we remove the lodestone from the board (for displaying purposes),
            // we break an assumption of nextLodestoneDirection
            const player: Player = this.getState().getCurrentPlayer();
            const nextDirection: MGPOptional<LodestoneDirection> = this.getState().nextLodestoneDirection();
            if (nextDirection.isPresent()) {
                const direction: LodestoneDirection = nextDirection.get();
                this.viewInfo.availableLodestones = [
                    this.nextLodestone(player, { direction, orientation: 'orthogonal' }),
                    this.nextLodestone(player, { direction, orientation: 'diagonal' }),
                ];
            } else {
                this.viewInfo.availableLodestones = [
                    this.nextLodestone(player, { direction: 'push', orientation: 'orthogonal' }),
                    this.nextLodestone(player, { direction: 'push', orientation: 'diagonal' }),
                    this.nextLodestone(player, { direction: 'pull', orientation: 'orthogonal' }),
                    this.nextLodestone(player, { direction: 'pull', orientation: 'diagonal' }),
                ];
            }
        }
    }

    private showCapturesToPlace(): void {
        const opponent: Player = this.getCurrentOpponent();
        this.viewInfo.capturesToPlace = [];
        for (let i: number = 0; i < this.capturesToPlace; i++) {
            this.viewInfo.capturesToPlace.push({
                pieceClasses: [this.getPlayerClass(opponent)],
            });
        }
    }

    private nextLodestone(player: Player, description: LodestoneDescription): LodestoneInfo {
        const lodestone: LodestonePieceLodestone = LodestonePieceLodestone.of(player, description);
        const info: LodestoneInfo = this.getLodestoneInfoFromLodestone(lodestone);
        if (this.selectedLodestone.equalsValue(lodestone)) {
            info.selectedClass = 'selected-stroke';
        }
        return info;
    }

    private showPressurePlates(): void {
        this.viewInfo.pressurePlateGroupInfos = [];
        for (const position of LodestonePressurePlate.POSITIONS) {
            const groupInfo: PressurePlateGroupInfo = this.getPressurePlateGroupInfo(position);
            this.viewInfo.pressurePlateGroupInfos.push(groupInfo);
        }
    }

    private getPressurePlateGroupInfo(groupPosition: LodestonePressurePlatePosition): PressurePlateGroupInfo {
        const groupInfo: PressurePlateGroupInfo = {
            groupPosition,
            plateInfos: [],
        };
        const plateGroup: LodestonePressurePlateGroup = this.displayedState.pressurePlates[groupPosition];
        let plateIndex: number = 0;
        for (const plate of plateGroup.plates) {
            const pressurePlateInfo: PressurePlateInfo = this.getPressurePlateInfo(plate, groupPosition, plateIndex);
            groupInfo.plateInfos.push(pressurePlateInfo);
            plateIndex++;
        }
        return groupInfo;
    }

    private getPressurePlateInfo(plate: LodestonePressurePlate,
                                 position: LodestonePressurePlatePosition,
                                 plateIndex: number)
    : PressurePlateInfo
    {
        const plateInfo: PressurePlateInfo = {
            plateIndex,
            coords: [],
        };
        const size: number = plate.width;
        for (let i: number = 0; i < size; i++) {
            const pressurePlateCoordInfo: PressurePlateCoordInfo =
                this.getPressurePlateCoordInfo(plate, position, plateIndex, i);
            plateInfo.coords.push(pressurePlateCoordInfo);
        }
        return plateInfo;
    }

    private getPressurePlateCoordInfo(plate: LodestonePressurePlate,
                                      position: LodestonePressurePlatePosition,
                                      plateIndex: number,
                                      pieceIndex: number)
    : PressurePlateCoordInfo
    {
        const content: LodestonePiece = plate.getPieceAt(pieceIndex);
        let pieceClass: string = '';
        if (content.isPlayerPiece()) {
            pieceClass = this.getPlayerClass(content.owner);
        }
        const plateViewPosition: PressurePlateViewPosition =
            LodestoneComponent.PRESSURE_PLATES_POSITIONS.get(position).get();
        const initialCoord: Coord = plateViewPosition.start(plateIndex, plate.width);
        const coord: Coord = initialCoord.getNext(plateViewPosition.direction, pieceIndex);
        const coordInfo: PressurePlateCoordInfo = {
            coord,
            hasPiece: content.isPlayerPiece(),
            pieceClasses: [pieceClass],
            squareClasses: [],
            temporary: false,
        };
        return coordInfo;
    }

    public override async showLastMove(move: LodestoneMove): Promise<void> {
        const lastState: LodestoneState = this.getPreviousState();
        const infos: LodestoneInfos =
            LodestoneRules.get().applyMoveWithoutPlacingCaptures(lastState, move.coord, move);
        this.lastCaptures = infos.captures;
        this.lastMoves = infos.moved;
        this.updateViewInfo();
        const currentState: LodestoneState = this.getState();
        this.showPressurePlateDifferences(lastState, currentState, false);
    }

    private showPressurePlateDifferences(oldState: LodestoneState, newState: LodestoneState, temporary: boolean): void {
        for (const position of LodestonePressurePlate.POSITIONS) {
            const nbPlates: number = oldState.pressurePlates[position].plates.length;
            for (let plateIndex: number = 0; plateIndex < nbPlates; plateIndex++) {
                const lastPressurePlate: LodestonePressurePlate =
                    oldState.pressurePlates[position].plates[plateIndex];
                const currentPressurePlate: LodestonePressurePlate =
                    newState.pressurePlates[position].plates[plateIndex];
                this.showPressurePlateDifference(lastPressurePlate,
                                                 currentPressurePlate,
                                                 position,
                                                 plateIndex,
                                                 temporary);
            }
        }
    }

    private showPressurePlateDifference(oldPlate: LodestonePressurePlate,
                                        newPlate: LodestonePressurePlate,
                                        position: LodestonePressurePlatePosition,
                                        plateIndex: number,
                                        temporary: boolean)
    : void
    {
        const groupInfos: PressurePlateGroupInfo[] = this.viewInfo.pressurePlateGroupInfos.filter(
            (info: PressurePlateGroupInfo) => info.groupPosition === position,
        );
        const groupInfo: PressurePlateGroupInfo = groupInfos[0];
        const plateInfo: PressurePlateInfo = groupInfo.plateInfos[plateIndex];
        for (let i: number = 0; i < oldPlate.width; i++) {
            const oldPiece: LodestonePiece = oldPlate.getPieceAt(i);
            const newPiece: LodestonePiece = newPlate.getPieceAt(i);
            if (oldPiece.equals(newPiece) === false) {
                plateInfo.coords[i].squareClasses.push('moved-fill');
                plateInfo.coords[i].temporary = temporary;
                if (temporary) {
                    plateInfo.coords[i].pieceClasses.push('semi-transparent');
                }
            }
        }
    }

    public getCaptureTransform(x: number): string {
        const halfSize: number = LodestoneState.SIZE / 2;
        const dx: number = (x + (halfSize - this.viewInfo.capturesToPlace.length / 2)) * this.SPACE_SIZE +
            this.SPACE_SIZE / 2;
        const dy: number = - (this.platesGroupSize + 0.5 * this.SPACE_SIZE + this.STROKE_WIDTH);
        return this.getSVGTranslation(dx, dy);
    }

    public getAvailableLodestoneTransform(x: number): string {
        const halfSize: number = LodestoneState.SIZE / 2;
        const dx: number = (x + (halfSize - this.viewInfo.availableLodestones.length / 2)) * this.SPACE_SIZE;
        const dy: number = this.boardSize + this.platesGroupSize + this.STROKE_WIDTH;
        return this.getSVGTranslation(dx, dy);
    }

}
