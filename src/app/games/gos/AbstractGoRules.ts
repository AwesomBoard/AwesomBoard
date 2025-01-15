import { MGPFallible, MGPOptional, Utils } from '@everyboard/lib';
import { GameNode } from 'src/app/jscaip/AI/GameNode';
import { GoState } from './GoState';
import { GoPhase } from './GoPhase';
import { GoPiece } from './GoPiece';
import { GoMove } from './GoMove';
import { Player } from 'src/app/jscaip/Player';
import { GoGroupData } from './GoGroupsData';
import { Table } from 'src/app/jscaip/TableUtils';
import { ConfigurableRules } from 'src/app/jscaip/Rules';
import { Coord } from 'src/app/jscaip/Coord';
import { GoFailure } from './GoFailure';
import { GameStatus } from 'src/app/jscaip/GameStatus';
import { Debug } from 'src/app/utils/Debug';
import { PlayerNumberMap } from 'src/app/jscaip/PlayerMap';
import { RulesConfig } from 'src/app/jscaip/RulesConfigUtil';
import { Direction } from 'src/app/jscaip/Direction';
import { GroupDataFactory } from 'src/app/jscaip/BoardData';

export type GoLegalityInformation = Coord[];

export class GoNode extends GameNode<GoMove, GoState> {}

@Debug.log
export abstract class AbstractGoRules<C extends RulesConfig>
    extends ConfigurableRules<GoMove, GoState, C, GoLegalityInformation>
{

    protected abstract getGoGroupDataFactory(): GroupDataFactory<GoPiece>;

    private getNewKo(move: GoMove, newBoard: GoPiece[][], captures: Coord[]): MGPOptional<Coord> {
        if (captures.length === 1) {
            const captured: Coord = captures[0];
            const capturerCoord: Coord = move.coord;
            const capturer: GoPiece = newBoard[capturerCoord.y][capturerCoord.x];
            const goGroupDataFactory: GroupDataFactory<GoPiece> = this.getGoGroupDataFactory();
            const capturersInfo: GoGroupData =
                goGroupDataFactory.getGroupData(capturerCoord, newBoard) as GoGroupData;
            const capturersFreedoms: Coord[] = capturersInfo.emptyCoords;
            const capturersGroup: Coord[] =
                GoPiece.pieceBelongTo(capturer, Player.ZERO) ? capturersInfo.darkCoords : capturersInfo.lightCoords;
            if (capturersFreedoms.length === 1 &&
                capturersFreedoms[0].equals(captured) &&
                capturersGroup.length === 1)
            {
                return MGPOptional.of(captured);
            }
        }
        return MGPOptional.empty();
    }

    public markTerritoryAndCount(state: GoState): GoState {
        const resultingBoard: GoPiece[][] = state.getCopiedBoard();
        const emptyZones: GoGroupData[] = this.getTerritoryLikeGroup(state);
        const captured: PlayerNumberMap = state.getCapturedCopy();

        for (const emptyZone of emptyZones) {
            const pointMaker: GoPiece = emptyZone.getWrapper();
            if (pointMaker === GoPiece.LIGHT) {
                // light territory
                captured.add(Player.ONE, emptyZone.emptyCoords.length);
                for (const territory of emptyZone.getCoords()) {
                    resultingBoard[territory.y][territory.x] = GoPiece.LIGHT_TERRITORY;
                }
            } else {
                Utils.assert(pointMaker === GoPiece.DARK, 'territory should be wrapped by dark or light, not by ' + pointMaker.toString());
                // dark territory
                captured.add(Player.ZERO, emptyZone.emptyCoords.length);
                for (const territory of emptyZone.getCoords()) {
                    resultingBoard[territory.y][territory.x] = GoPiece.DARK_TERRITORY;
                }
            }
        }
        return new GoState(resultingBoard, captured, state.turn, state.koCoord, state.phase);
    }

    private removeAndSubstractTerritory(state: GoState): GoState {
        const resultingBoard: GoPiece[][] = state.getCopiedBoard();
        const captured: PlayerNumberMap = state.getCapturedCopy();
        for (const coordAndContent of state.getCoordsAndContents()) {
            const coord: Coord = coordAndContent.coord;
            if (coordAndContent.content.isTerritory()) {
                resultingBoard[coord.y][coord.x] = GoPiece.EMPTY;
                const owner: Player = coordAndContent.content.getOwner() as Player;
                captured.add(owner, - 1);
            }
        }
        return new GoState(resultingBoard, captured, state.turn, state.koCoord, state.phase);
    }

    private getEmptyZones(deadlessState: GoState): GoGroupData[] {
        return this.getGroupsDataWhere(deadlessState.getCopiedBoard(), (piece: GoPiece) => piece.isEmpty());
    }

    public getGroupsDataWhere(board: GoPiece[][], condition: (piece: GoPiece) => boolean): GoGroupData[] {
        const groups: GoGroupData[] = [];
        let coord: Coord;
        let group: GoGroupData;
        let currentSpace: GoPiece;
        const goGroupDataFactory: GroupDataFactory<GoPiece> = this.getGoGroupDataFactory();
        for (let y: number = 0; y < board.length; y++) {
            for (let x: number = 0; x < board[0].length; x++) {
                coord = new Coord(x, y);
                currentSpace = board[y][x];
                if (condition(currentSpace)) {
                    if (groups.some((currentGroup: GoGroupData) => currentGroup.selfContains(coord)) === false) {
                        group = goGroupDataFactory.getGroupData(coord, board) as GoGroupData;
                        groups.push(group);
                    }
                }
            }
        }
        return groups;
    }

    public addDeadToScore(state: GoState): number[] {
        const captured: PlayerNumberMap = state.getCapturedCopy();
        let playerOneScore: number = captured.get(Player.ONE);
        let playerZeroScore: number = captured.get(Player.ZERO);
        let currentSpace: GoPiece;
        for (let y: number = 0; y < state.getHeight(); y++) {
            for (let x: number = 0; x < state.getWidth(); x++) {
                currentSpace = state.getPieceAtXY(x, y);
                if (currentSpace === GoPiece.DEAD_DARK) {
                    playerOneScore++;
                } else if (currentSpace === GoPiece.DEAD_LIGHT) {
                    playerZeroScore++;
                }
            }
        }
        return [playerZeroScore, playerOneScore];
    }

    public switchAliveness(groupCoord: Coord, switchedState: GoState): GoState {
        const switchedBoard: GoPiece[][] = switchedState.getCopiedBoard();
        const switchedPiece: GoPiece = switchedBoard[groupCoord.y][groupCoord.x];
        Utils.assert(switchedPiece.isOccupied(), `Can't switch emptyness aliveness`);

        const goGroupDataFactory: GroupDataFactory<GoPiece> = this.getGoGroupDataFactory();
        const group: GoGroupData = goGroupDataFactory.getGroupData(groupCoord, switchedBoard) as GoGroupData;
        const captured: PlayerNumberMap = switchedState.getCapturedCopy();
        switch (group.color) {
            case GoPiece.DEAD_DARK:
                captured.add(Player.ONE, - 2 * group.deadDarkCoords.length);
                for (const deadDarkCoord of group.deadDarkCoords) {
                    switchedBoard[deadDarkCoord.y][deadDarkCoord.x] = GoPiece.DARK;
                }
                break;
            case GoPiece.DEAD_LIGHT:
                captured.add(Player.ZERO, - 2 * group.deadLightCoords.length);
                for (const deadLightCoord of group.deadLightCoords) {
                    switchedBoard[deadLightCoord.y][deadLightCoord.x] = GoPiece.LIGHT;
                }
                break;
            case GoPiece.LIGHT:
                captured.add(Player.ZERO, 2 * group.lightCoords.length);
                for (const lightCoord of group.lightCoords) {
                    switchedBoard[lightCoord.y][lightCoord.x] = GoPiece.DEAD_LIGHT;
                }
                break;
            default:
                Utils.expectToBe(group.color, GoPiece.DARK);
                captured.add(Player.ONE, 2 * group.darkCoords.length);
                for (const darkCoord of group.darkCoords) {
                    switchedBoard[darkCoord.y][darkCoord.x] = GoPiece.DEAD_DARK;
                }
                break;
        }
        return new GoState(switchedBoard,
                           captured,
                           switchedState.turn,
                           switchedState.koCoord,
                           switchedState.phase);
    }

    private isPass(move: GoMove): boolean {
        return move.equals(GoMove.PASS);
    }

    private isAccept(move: GoMove): boolean {
        return move.equals(GoMove.ACCEPT);
    }

    private isLegalDeadMarking(move: GoMove, state: GoState): boolean {
        return this.isOccupied(move.coord, state.getCopiedBoard()) &&
               (state.phase === 'COUNTING' || state.phase === 'ACCEPT');
    }

    private isLegalNormalMove(move: GoMove, state: GoState): MGPFallible<GoLegalityInformation> {

        const boardCopy: GoPiece[][] = state.getCopiedBoard();
        if (this.isKo(move, state)) {
            return MGPFallible.failure(GoFailure.ILLEGAL_KO());
        }
        if (['COUNTING', 'ACCEPT'].includes(state.phase)) {
            state = this.resurrectStones(state);
        }
        const captureState: CaptureState = this.getCaptureState(move, state);
        if (captureState.isCapturing()) {
            return MGPFallible.success(captureState.capturedCoords);
        } else {
            boardCopy[move.coord.y][move.coord.x] = state.turn%2 === 0 ? GoPiece.DARK : GoPiece.LIGHT;
            const goGroupDataFactory: GroupDataFactory<GoPiece> = this.getGoGroupDataFactory();
            const goGroupsData: GoGroupData =
                goGroupDataFactory.getGroupData(move.coord, boardCopy) as GoGroupData;
            const isSuicide: boolean = goGroupsData.emptyCoords.length === 0;
            boardCopy[move.coord.y][move.coord.x] = GoPiece.EMPTY;

            if (isSuicide) {
                return MGPFallible.failure(GoFailure.CANNOT_COMMIT_SUICIDE());
            } else {
                return MGPFallible.success([]);
            }
        }
    }

    private isOccupied(coord: Coord, board: Table<GoPiece>): boolean {
        return board[coord.y][coord.x].isOccupied();
    }

    private isKo(move: GoMove, state: GoState): boolean {
        if (state.koCoord.isPresent()) {
            return move.coord.equals(state.koCoord.get());
        } else {
            return false;
        }
    }

    private getCaptureState(move: GoMove, state: GoState): CaptureState {
        const captureState: CaptureState = new CaptureState();
        let capturedInDirection: Coord[];
        for (const direction of this.getGoGroupDataFactory().getDirections(move.coord)) {
            capturedInDirection = this.getCapturedInDirection(move.coord, direction, state);
            if (capturedInDirection.length > 0 &&
                captureState.capturedCoords.every((coord: Coord) => capturedInDirection[0].equals(coord) === false))
            {
                captureState.capturedCoords = captureState.capturedCoords.concat(capturedInDirection);
            }
        }
        return captureState;
    }

    public getCapturedInDirection(coord: Coord, direction: Direction, state: GoState): Coord[] {
        const copiedBoard: GoPiece[][] = state.getCopiedBoard();
        const neightbooringCoord: Coord = coord.getNext(direction);
        if (this.isReachable(neightbooringCoord, state)) {
            const opponent: GoPiece = state.turn%2 === 0 ? GoPiece.LIGHT : GoPiece.DARK;
            if (copiedBoard[neightbooringCoord.y][neightbooringCoord.x] === opponent) {
                Debug.display('GoRules', 'getCapturedInDirection', 'a group could be captured');
                const goGroupDataFactory: GroupDataFactory<GoPiece> = this.getGoGroupDataFactory();
                const neightbooringGroup: GoGroupData =
                    goGroupDataFactory.getGroupData(neightbooringCoord, copiedBoard) as GoGroupData;
                const koCoord: MGPOptional<Coord> = state.koCoord;
                if (this.isCapturableGroup(neightbooringGroup, koCoord)) {
                    Debug.display('GoRules', 'getCapturedInDirection', {
                        neightbooringGroupCoord: neightbooringGroup.getCoords(),
                        message: 'is capturable',
                    });
                    return neightbooringGroup.getCoords();
                }
            }
        }
        return [];
    }

    private isReachable(coord: Coord, state: GoState): boolean {
        return state.hasInequalPieceAt(coord, GoPiece.UNREACHABLE);
    }

    private isCapturableGroup(groupData: GoGroupData, koCoord: MGPOptional<Coord>): boolean {
        if (groupData.color.isOccupied() && groupData.emptyCoords.length === 1) {
            return koCoord.equalsValue(groupData.emptyCoords[0]) === false; // Ko Rules Block Capture
        } else {
            return false;
        }
    }

    public getTerritoryLikeGroup(state: GoState): GoGroupData[] {
        const emptyGroups: GoGroupData[] = this.getEmptyZones(state);
        return emptyGroups.filter((currentGroup: GoGroupData) => currentGroup.isMonoWrapped());
    }

    private applyPass(state: GoState): GoState {
        const oldBoard: GoPiece[][] = state.getCopiedBoard();
        const oldCaptured: PlayerNumberMap = state.getCapturedCopy();
        const oldTurn: number = state.turn;
        let newPhase: GoPhase;
        let resultingState: GoState;
        if (state.phase === 'PASSED') {
            newPhase = 'COUNTING';
            resultingState = new GoState(oldBoard, oldCaptured, oldTurn + 1, MGPOptional.empty(), newPhase);
            resultingState = this.markTerritoryAndCount(resultingState);
        } else {
            Utils.assert(state.phase === 'PLAYING', 'Cannot pass in counting phase!');
            newPhase = 'PASSED';
            resultingState = new GoState(oldBoard, oldCaptured, oldTurn + 1, MGPOptional.empty(), newPhase);
        }
        return resultingState;
    }

    private applyLegalAccept(state: GoState): GoState {
        const countingBoard: GoPiece[][] = state.getCopiedBoard();
        let phase: GoPhase;
        if (state.phase === 'COUNTING') {
            phase = 'ACCEPT';
        } else {
            phase = 'FINISHED';
        }
        return new GoState(countingBoard,
                           state.getCapturedCopy(),
                           state.turn + 1,
                           MGPOptional.empty(),
                           phase);
    }

    private applyNormalLegalMove(legalMove: GoMove, currentState: GoState, capturedCoords: GoLegalityInformation)
    : GoState
    {
        let state: GoState;
        if (['COUNTING', 'ACCEPT'].includes(currentState.phase)) {
            state = this.resurrectStones(currentState);
        } else {
            state = currentState.copy();
        }
        const x: number = legalMove.coord.x;
        const y: number = legalMove.coord.y;

        const newBoard: GoPiece[][] = state.getCopiedBoard();
        const currentTurn: number = state.turn;
        const currentPlayer: Player = state.getCurrentPlayer();
        const currentPlayerPiece: GoPiece = GoPiece.ofPlayer(currentPlayer);
        const newTurn: number = currentTurn + 1;
        newBoard[y][x] = currentPlayerPiece;
        for (const capturedCoord of capturedCoords) {
            newBoard[capturedCoord.y][capturedCoord.x] = GoPiece.EMPTY;
        }
        const newKoCoord: MGPOptional<Coord> = this.getNewKo(legalMove, newBoard, capturedCoords);
        const newCaptured: PlayerNumberMap = state.getCapturedCopy();
        newCaptured.add(currentPlayer, capturedCoords.length);
        return new GoState(newBoard, newCaptured, newTurn, newKoCoord, 'PLAYING');
    }

    private resurrectStones(state: GoState): GoState {
        for (let y: number = 0; y < state.getHeight(); y++) {
            for (let x: number = 0; x < state.getWidth(); x++) {
                if (state.getPieceAtXY(x, y).isDead()) {
                    state = this.switchAliveness(new Coord(x, y), state);
                }
            }
        }
        return this.removeAndSubstractTerritory(state);
    }

    private applyDeadMarkingMove(legalMove: GoMove, state: GoState): GoState {
        const territorylessState: GoState = this.removeAndSubstractTerritory(state);
        const switchedState: GoState = this.switchAliveness(legalMove.coord, territorylessState);
        const resultingState: GoState =
            new GoState(switchedState.getCopiedBoard(),
                        switchedState.getCapturedCopy(),
                        switchedState.turn + 1,
                        MGPOptional.empty(),
                        'COUNTING');
        return this.markTerritoryAndCount(resultingState);
    }

    public override isLegal(move: GoMove, state: GoState): MGPFallible<GoLegalityInformation> {
        if (this.isPass(move)) {
            const playing: boolean = state.phase === 'PLAYING';
            const passed: boolean = state.phase === 'PASSED';
            Debug.display('GoRules', 'isLegal',
                          'at ' + state.phase + ((playing || passed) ? ' forbid' : ' allowed') +
                          ' passing on ' + state.getCopiedBoard());
            if (playing || passed) {
                return MGPFallible.success([]);
            } else {
                return MGPFallible.failure(GoFailure.CANNOT_PASS_AFTER_PASSED_PHASE());
            }
        } else if (this.isAccept(move)) {
            const counting: boolean = state.phase === 'COUNTING';
            const accept: boolean = state.phase === 'ACCEPT';
            if (counting || accept) {
                return MGPFallible.success([]);
            } else {
                return MGPFallible.failure(GoFailure.CANNOT_ACCEPT_BEFORE_COUNTING_PHASE());
            }
        } else if (this.isOccupied(move.coord, state.getCopiedBoard())) {
            Debug.display('GoRules', 'isLegal', 'move is marking');
            const legal: boolean = this.isLegalDeadMarking(move, state);
            if (legal) {
                return MGPFallible.success([]);
            } else {
                return MGPFallible.failure(GoFailure.OCCUPIED_INTERSECTION());
            }
        } else {
            Debug.display('GoRules', 'isLegal', 'move is normal stuff: ' + move.toString());
            return this.isLegalNormalMove(move, state);
        }
    }

    public override applyLegalMove(legalMove: GoMove,
                                   state: GoState,
                                   _config: MGPOptional<C>,
                                   infos: GoLegalityInformation)
    : GoState
    {
        if (this.isPass(legalMove)) {
            Debug.display('GoRules', 'applyLegalMove', 'isPass');
            return this.applyPass(state);
        } else if (this.isAccept(legalMove)) {
            Debug.display('GoRules', 'applyLegalMove', 'isAccept');
            return this.applyLegalAccept(state);
        } else if (this.isLegalDeadMarking(legalMove, state)) {
            Debug.display('GoRules', 'applyLegalMove', 'isDeadMarking');
            return this.applyDeadMarkingMove(legalMove, state);
        } else {
            Debug.display('GoRules', 'applyLegalMove', 'else it is normal move');
            return this.applyNormalLegalMove(legalMove, state, infos);
        }
    }

    public override getGameStatus(node: GoNode): GameStatus {
        const state: GoState = node.gameState;
        if (state.phase === 'FINISHED') {
            const capturedZero: number = state.captured.get(Player.ZERO);
            const capturedOne: number = state.captured.get(Player.ONE);
            if (capturedOne < capturedZero) {
                return GameStatus.ZERO_WON;
            } else if (capturedZero < capturedOne) {
                return GameStatus.ONE_WON;
            } else {
                return GameStatus.DRAW;
            }
        } else {
            return GameStatus.ONGOING;
        }
    }

}

class CaptureState {

    public capturedCoords: Coord[] = [];

    public isCapturing(): boolean {
        return this.capturedCoords.length > 0;
    }

}
