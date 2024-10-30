import { ConfigurableRules } from 'src/app/jscaip/Rules';
import { SiamMove } from './SiamMove';
import { SiamState } from './SiamState';
import { SiamPiece } from './SiamPiece';
import { Player, PlayerOrNone } from 'src/app/jscaip/Player';
import { Coord } from 'src/app/jscaip/Coord';
import { Orthogonal } from 'src/app/jscaip/Orthogonal';
import { MGPFallible, MGPOptional, MGPValidation, Utils } from '@everyboard/lib';
import { SiamFailure } from './SiamFailure';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { Table, TableUtils } from 'src/app/jscaip/TableUtils';
import { GameStatus } from 'src/app/jscaip/GameStatus';
import { GameNode } from 'src/app/jscaip/AI/GameNode';
import { NumberConfig, RulesConfigDescription, RulesConfigDescriptionLocalizable } from 'src/app/components/wrapper-components/rules-configuration/RulesConfigDescription';
import { MGPValidators } from 'src/app/utils/MGPValidator';
import { Debug } from 'src/app/utils/Debug';

export class SiamLegalityInformation {

    public constructor(public readonly resultingBoard: Table<SiamPiece>,
                       public readonly moved: Coord[]) {
    }

}

export class SiamNode extends GameNode<SiamMove, SiamState> {}

type ClosestPusher = {

    distance: number,

    coord: Coord

};

type InitialLineInfo = {
    resistance: Orthogonal,
    previousPiece: SiamPiece,
    closestPusher: ClosestPusher,
    almostPusher: MGPOptional<Coord>,
    pusherFound: boolean,
    mountainEncountered: boolean,
    missingForce: number,
};

export type SiamConfig = {
    width: number,
    height: number,
    numberOfPiece: number,
    numberOfBonusMountain: number,
};

@Debug.log
export class SiamRules extends ConfigurableRules<SiamMove, SiamState, SiamConfig, SiamLegalityInformation> {

    private static singleton: MGPOptional<SiamRules> = MGPOptional.empty();

    public static get(): SiamRules {
        if (SiamRules.singleton.isAbsent()) {
            SiamRules.singleton = MGPOptional.of(new SiamRules());
        }
        return SiamRules.singleton.get();
    }

    public static readonly RULES_CONFIG_DESCRIPTION: RulesConfigDescription<SiamConfig> =
        new RulesConfigDescription<SiamConfig>({
            name: (): string => $localize`Siam`,
            config: {
                // minimum 3 so that there are spaces around the mountain
                width: new NumberConfig(5, RulesConfigDescriptionLocalizable.WIDTH, MGPValidators.range(3, 99)),
                height: new NumberConfig(5, RulesConfigDescriptionLocalizable.HEIGHT, MGPValidators.range(3, 99)),
                numberOfPiece: new NumberConfig(5, () => $localize`Number of piece by player`, MGPValidators.range(1, 99)),
                // -1 on two ends because there will always be the first mountain
                numberOfBonusMountain: new NumberConfig(2, () => $localize`Number of bonus mountains`, MGPValidators.range(0, 98)),
            },
        });

    public override getRulesConfigDescription(): MGPOptional<RulesConfigDescription<SiamConfig>> {
        return MGPOptional.of(SiamRules.RULES_CONFIG_DESCRIPTION);
    }

    public override getInitialState(optionalConfig: MGPOptional<SiamConfig>): SiamState {
        const config: SiamConfig = optionalConfig.get();
        const board: SiamPiece[][] = TableUtils.create(config.width, config.height, SiamPiece.EMPTY);
        const cy: number = Math.floor(config.height / 2);
        const cx: number = Math.floor(config.width / 2);
        board[cy][cx] = SiamPiece.MOUNTAIN;
        config.numberOfBonusMountain = Math.min(config.numberOfBonusMountain, config.width - 1);
        let numberOfBonusMountainDropped: number = 0;
        while (numberOfBonusMountainDropped < config.numberOfBonusMountain) {
            const mountainExcentricity: number = Math.ceil((numberOfBonusMountainDropped + 1) / 2);
            board[cy][cx + mountainExcentricity] = SiamPiece.MOUNTAIN;
            numberOfBonusMountainDropped++;
            if (numberOfBonusMountainDropped < config.numberOfBonusMountain) {
                board[cy][cx - mountainExcentricity] = SiamPiece.MOUNTAIN;
                numberOfBonusMountainDropped++;
            }
        }
        return new SiamState(board, 0);
    }

    private getMoveValidity(move: SiamMove, state: SiamState): MGPValidation {
        const startedOutside: boolean = state.isOnBoard(move.coord) === false;
        if (move.isRotation()) {
            if (startedOutside) {
                return MGPFallible.failure($localize`Cannot rotate piece outside the board: ${move.toString()}`);
            }
        } else {
            const finishedOutside: boolean = state.isOnBoard(move.coord.getNext(move.direction.get())) === false;
            if (finishedOutside) {
                if (startedOutside) {
                    return MGPFallible.failure($localize`SiamMove should end or start on the board: ${ move.toString() }`);
                }
                if (move.direction.get() !== move.landingOrientation) {
                    return MGPFallible.failure($localize`SiamMove should have moveDirection and landingOrientation matching when a piece goes out of the board: ${ move.toString() }`);
                }
            }
        }
        return MGPValidation.SUCCESS;
    }

    public isInsertion(move: SiamMove, state: SiamState): boolean {
        return move.coord.x === -1 ||
               move.coord.x === state.getWidth() ||
               move.coord.y === -1 ||
               move.coord.y === state.getHeight();
    }

    public override isLegal(move: SiamMove, state: SiamState, optionalConfig: MGPOptional<SiamConfig>)
    : MGPFallible<SiamLegalityInformation>
    {
        const moveValidity: MGPValidation = this.getMoveValidity(move, state);
        if (moveValidity.isFailure()) {
            return moveValidity.toOtherFallible();
        }
        if (this.isInsertion(move, state) === false) {
            const movedPiece: SiamPiece = state.getPieceAt(move.coord);
            if (movedPiece === SiamPiece.EMPTY) {
                return MGPFallible.failure(RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_EMPTY());
            } else if (movedPiece.belongsTo(state.getCurrentOpponent())) {
                return MGPFallible.failure(RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_OPPONENT());
            }
        }
        if (move.isRotation()) {
            return this.isLegalRotation(move, state);
        } else {
            let movingPiece: SiamPiece;
            if (this.isInsertion(move, state)) {
                const insertionInfo: {insertedPiece: SiamPiece, legal: MGPValidation} =
                    this.isLegalInsertion(move.coord, state, optionalConfig.get());
                if (insertionInfo.legal.isFailure()) {
                    return MGPFallible.failure(insertionInfo.legal.getReason());
                }
                movingPiece = insertionInfo.insertedPiece;
            } else {
                movingPiece = state.getPieceAt(move.coord);
            }
            return this.isLegalForwarding(move, state, movingPiece);
        }
    }

    private isLegalInsertion(coord: Coord, state: SiamState, config: SiamConfig)
    : {insertedPiece: SiamPiece, legal: MGPValidation}
    {
        const numberOnBoard: number = state.countCurrentPlayerPawn();
        const currentPlayer: Player = state.getCurrentPlayer();
        const legal: MGPValidation = (numberOnBoard < config.numberOfPiece) ?
            MGPValidation.SUCCESS :
            MGPValidation.failure(SiamFailure.NO_REMAINING_PIECE_TO_INSERT());
        const insertedPiece: SiamPiece = this.getInsertedPiece(coord, currentPlayer, state.getWidth());
        return { insertedPiece, legal };
    }

    private getInsertedPiece(entrance: Coord, player: Player, width: number): SiamPiece {
        if (entrance.x === -1) return SiamPiece.of(Orthogonal.RIGHT, player);
        if (entrance.y === -1) return SiamPiece.of(Orthogonal.DOWN, player);
        if (entrance.x === width) return SiamPiece.of(Orthogonal.LEFT, player);
        return SiamPiece.of(Orthogonal.UP, player);
    }

    private isLegalForwarding(move: SiamMove, state: SiamState, firstPiece: SiamPiece)
    : MGPFallible<SiamLegalityInformation>
    {
        Utils.assert(firstPiece !== SiamPiece.MOUNTAIN && firstPiece !== SiamPiece.EMPTY, 'forwarding must be done with player piece');

        const movedPieces: Coord[] = [];
        let movingPiece: SiamPiece = SiamPiece.of(move.landingOrientation, state.getCurrentPlayer());
        const pushingDir: Orthogonal = move.direction.get();
        let landingCoord: Coord = move.coord.getNext(pushingDir);
        if (state.isOnBoard(landingCoord) &&
            state.getPieceAt(landingCoord) !== SiamPiece.EMPTY &&
            this.isStraight(firstPiece, move) === false)
        {
            return MGPFallible.failure(SiamFailure.ILLEGAL_PUSH());
        }
        let currentDirection: MGPOptional<Orthogonal> = MGPOptional.of(pushingDir);
        const resistingDir: Orthogonal = pushingDir.getOpposite();
        let totalForce: number = 0;
        const resultingBoard: SiamPiece[][] = state.getCopiedBoard();
        if (state.isOnBoard(move.coord)) {
            resultingBoard[move.coord.y][move.coord.x] = SiamPiece.EMPTY;
            movedPieces.push(move.coord);
        }
        let pushingPossible: boolean = state.isOnBoard(landingCoord) &&
                                       movingPiece !== SiamPiece.EMPTY;
        while (pushingPossible) {
            if (currentDirection.equalsValue(pushingDir)) totalForce++;
            else if (currentDirection.equalsValue(resistingDir)) totalForce--;
            const tmpPiece: SiamPiece = resultingBoard[landingCoord.y][landingCoord.x];
            if (tmpPiece === SiamPiece.MOUNTAIN) totalForce -= 0.9;
            resultingBoard[landingCoord.y][landingCoord.x] = movingPiece;
            movedPieces.push(landingCoord);
            movingPiece = tmpPiece;
            landingCoord = landingCoord.getNext(pushingDir);
            currentDirection = movingPiece.getOptionalDirection();
            pushingPossible = state.isOnBoard(landingCoord) &&
                              movingPiece !== SiamPiece.EMPTY &&
                              totalForce > 0;
        }
        if (state.isOnBoard(landingCoord) === false) {
            if (currentDirection.equalsValue(pushingDir)) totalForce++;
            else if (currentDirection.equalsValue(resistingDir)) totalForce--;
        }
        if (totalForce <= 0) {
            return MGPFallible.failure(SiamFailure.NOT_ENOUGH_FORCE_TO_PUSH());
        }

        return MGPFallible.success(new SiamLegalityInformation(resultingBoard, movedPieces));
    }

    private isStraight(piece: SiamPiece, move: SiamMove): boolean {
        const pieceDirection: Orthogonal = piece.getDirection();
        return (move.direction.equalsValue(pieceDirection) &&
                pieceDirection === move.landingOrientation);
    }

    private isLegalRotation(rotation: SiamMove, state: SiamState): MGPFallible<SiamLegalityInformation> {
        const coord: Coord = rotation.coord;
        const currentPiece: SiamPiece = state.getPieceAt(coord);
        const currentPlayer: Player = state.getCurrentPlayer();
        if (currentPiece.getDirection() === rotation.landingOrientation) {
            return MGPFallible.failure(SiamFailure.MUST_MOVE_OR_ROTATE());
        }
        const resultingBoard: SiamPiece[][] = state.getCopiedBoard();
        resultingBoard[coord.y][coord.x] = SiamPiece.of(rotation.landingOrientation, currentPlayer);
        return MGPFallible.success(new SiamLegalityInformation(resultingBoard, [coord]));
    }

    public override applyLegalMove(_move: SiamMove,
                                   state: SiamState,
                                   _config: MGPOptional<SiamConfig>,
                                   info: SiamLegalityInformation)
    : SiamState
    {
        const newBoard: Table<SiamPiece> = TableUtils.copy(info.resultingBoard);
        const newTurn: number = state.turn + 1;
        const resultingState: SiamState = new SiamState(newBoard, newTurn);
        return resultingState;
    }

    public getScoreFromShortestDistances(zeroShortestDistance: number,
                                         oneShortestDistance: number,
                                         currentPlayer: Player)
    : number
    {
        if (zeroShortestDistance === Number.MAX_SAFE_INTEGER) zeroShortestDistance = 6;
        if (oneShortestDistance === Number.MAX_SAFE_INTEGER) oneShortestDistance = 6;
        const zeroScore: number = 6 - zeroShortestDistance;
        const oneScore: number = 6 - oneShortestDistance;
        if (zeroScore === oneScore) {
            return currentPlayer.getScoreModifier();
        } else if (zeroScore > oneScore) {
            return (-10 * (zeroScore + 1)) + (oneScore + 1);
        } else {
            return (10 * (oneScore + 1)) - (zeroScore + 1);
        }
    }

    public getMountainsRowsAndColumns(state: SiamState)
    : { rows: number[], columns: number[], nbMountain: number }
    {
        const rows: number[] = [];
        const columns: number[] = [];
        let nbMountain: number = 0;
        for (const coordAndContent of state.getCoordsAndContents()) {
            if (coordAndContent.content === SiamPiece.MOUNTAIN) {
                if (rows.includes(coordAndContent.coord.y) === false) {
                    rows.push(coordAndContent.coord.y);
                }
                if (columns.includes(coordAndContent.coord.x) === false) {
                    columns.push(coordAndContent.coord.x);
                }
                nbMountain++;
            }
        }
        return { rows, columns, nbMountain };
    }

    private getWinner(state: SiamState,
                      move: MGPOptional<SiamMove>,
                      nbMountain: number,
                      config: SiamConfig)
    : PlayerOrNone
    {
        if (nbMountain === config.numberOfBonusMountain) {
            return this.getPusher(state, move.get());
        } else {
            return PlayerOrNone.NONE;
        }
    }

    public getPusher(state: SiamState, finishingMove: SiamMove): PlayerOrNone {
        // here we will call the piece that started the move "moveStarter", obviously
        // and the piece in the right direction that was the closest to the falling mountain: the pusher

        const moveStarterCoord: Coord = finishingMove.coord;
        let moveStarterPiece: SiamPiece;
        if (state.isOnBoard(moveStarterCoord)) {
            const moveStarterDir: Orthogonal = finishingMove.landingOrientation;
            moveStarterPiece = state.getPieceAt(moveStarterCoord.getNext(moveStarterDir));
        } else { // insertion
            moveStarterPiece = this.getInsertedPiece(moveStarterCoord, state.getCurrentOpponent(), state.getWidth());
        }
        const pushingDirection: Orthogonal = moveStarterPiece.getDirection();
        const pusherCoord: Coord = this.getPusherCoord(state, pushingDirection, moveStarterCoord);
        const winner: PlayerOrNone = state.getPieceAt(pusherCoord).getOwner();
        Debug.display('SiamRules', 'getPusher',
                      moveStarterCoord.toString() + ' belong to ' + state.getCurrentOpponent().getValue() + ', ' +
                      pusherCoord.toString() + ' belong to ' + winner.getValue() + ', ' + winner.getValue() + ' win');
        return winner;
    }

    private getPusherCoord(state: SiamState, pushingDirection: Orthogonal, pusher: Coord): Coord {
        let pushed: Coord = pusher.getNext(pushingDirection);
        let lastCorrectPusher: Coord = pusher;
        while (state.isOnBoard(pushed)) {
            pusher = pushed;
            pushed = pushed.getNext(pushingDirection);
            const pushingPiece: SiamPiece = state.getPieceAt(pusher);
            if (pushingPiece !== SiamPiece.MOUNTAIN && pushingPiece.getDirection() === pushingDirection) {
                lastCorrectPusher = pusher;
            }
        }
        return lastCorrectPusher;
    }

    public getPushers(state: SiamState,
                      mountainsColumn: number[],
                      mountainsRow: number[],
                      config: SiamConfig)
    : { coord: Coord; distance: number; }[]
    {
        let pushers: { coord: Coord; distance: number; }[] = [];
        const lineDirections: { direction: Orthogonal, fallingCoord: Coord}[] = [];
        for (const x of mountainsColumn) {
            let direction: Orthogonal = Orthogonal.DOWN;
            let fallingCoord: Coord = new Coord(x, config.height - 1);
            lineDirections.push({ direction, fallingCoord });

            direction = Orthogonal.UP;
            fallingCoord = new Coord(x, 0);
            lineDirections.push({ direction, fallingCoord });
        }
        for (const y of mountainsRow) {
            let direction: Orthogonal = Orthogonal.LEFT;
            let fallingCoord: Coord = new Coord(0, y);
            lineDirections.push({ direction, fallingCoord });

            direction = Orthogonal.RIGHT;
            fallingCoord = new Coord(config.width - 1, y);
            lineDirections.push({ direction, fallingCoord });
        }
        for (const lineDirection of lineDirections) {
            const fallingCoord: Coord = lineDirection.fallingCoord;
            const direction: Orthogonal = lineDirection.direction;
            pushers = this.addPotentialDirectionPusher(state, fallingCoord, direction, pushers, config);
        }
        return pushers;
    }

    private addPotentialDirectionPusher(state: SiamState,
                                        fallingCoord: Coord,
                                        direction: Orthogonal,
                                        pushers: { coord: Coord, distance: number }[],
                                        config: SiamConfig)
    : { coord: Coord, distance: number }[]
    {
        const directionClosestPusher: MGPOptional<{ distance: number, coord: Coord }> =
            this.getLineClosestPusher(state, fallingCoord, direction, config);
        if (directionClosestPusher.isAbsent()) {
            return pushers;
        }
        const pusher: { distance: number, coord: Coord } = directionClosestPusher.get();
        const distance: number = pusher.distance;
        const pusherCoord: Coord = pusher.coord;
        // find who own that pushing piece found
        pushers.push({
            coord: pusherCoord,
            distance, // : distance + malus
        });
        return pushers;
    }

    private getInitialLineInfo(state: SiamState, fallingCoord: Coord, direction: Orthogonal): InitialLineInfo {
        return {
            resistance: direction.getOpposite(),
            previousPiece: state.getPieceAt(fallingCoord),
            closestPusher: {
                coord: fallingCoord,
                distance: 1,
            },
            almostPusher: MGPOptional.empty(),
            pusherFound: false,
            mountainEncountered: false,
            missingForce: 0,
        };
    }

    public getLineClosestPusher(state: SiamState, fallingCoord: Coord, direction: Orthogonal, config: SiamConfig)
    : MGPOptional<ClosestPusher> {
        let lineInfo: InitialLineInfo = this.getInitialLineInfo(state, fallingCoord, direction);
        while (state.isOnBoard(lineInfo.closestPusher.coord) && lineInfo.pusherFound === false) {
            lineInfo = this.updateLineInfo(state, lineInfo, direction);
        }
        if (lineInfo.pusherFound === false && lineInfo.almostPusher.isPresent()) {
            lineInfo.closestPusher.distance++;
            lineInfo.missingForce -= 1;
            while (lineInfo.closestPusher.coord.equals(lineInfo.almostPusher.get()) === false) {
                lineInfo.closestPusher.coord = lineInfo.closestPusher.coord.getNext(direction);
                lineInfo.closestPusher.distance--;
            }
        }
        if (state.isOnBoard(lineInfo.closestPusher.coord) === false) {
            lineInfo.missingForce -= 1;
            if (state.countCurrentPlayerPawn() === config.numberOfPiece) {
                return MGPOptional.empty();
            }
        }
        if (lineInfo.missingForce > 0) {
            return MGPOptional.empty();
        }
        return MGPOptional.of(lineInfo.closestPusher);
    }

    private updateLineInfo(state: SiamState, lineInfo: InitialLineInfo, direction: Orthogonal): InitialLineInfo {
        const currentPiece: SiamPiece = state.getPieceAt(lineInfo.closestPusher.coord);
        if (currentPiece.isEmptyOrMountain()) {
            if (currentPiece === SiamPiece.MOUNTAIN) {
                lineInfo.missingForce += 0.9;
                lineInfo.mountainEncountered = true;
            } else { // Encountered empty space
                lineInfo.closestPusher.distance++;
            }
        } else { // Player found
            const playerOrientation: Orthogonal = currentPiece.getDirection();
            if (playerOrientation === direction) {
                if (lineInfo.mountainEncountered) {
                    lineInfo.missingForce -= 1; // We count her as active pusher
                    // We found a piece pushing right in the good direction
                    if (lineInfo.missingForce <= 0) {// And she has enough force to push
                        lineInfo.pusherFound = true;
                        lineInfo.closestPusher.coord =
                        lineInfo.closestPusher.coord.getNext(direction);
                    }
                }
            } else if (playerOrientation === lineInfo.resistance) {
                // We found a piece resisting the pushing direction
                lineInfo.missingForce += 1;
                if (lineInfo.mountainEncountered === false) {
                    lineInfo.closestPusher.distance++;
                }
            } else {
                if (lineInfo.mountainEncountered) {
                    lineInfo.almostPusher = MGPOptional.of(lineInfo.closestPusher.coord);
                    if (lineInfo.previousPiece !== SiamPiece.EMPTY) {
                        lineInfo.closestPusher.distance++;
                    }
                } else {
                    lineInfo.closestPusher.distance++;
                }
            }
        }
        // Still no player there, let's go back further
        lineInfo.previousPiece = currentPiece;
        lineInfo.closestPusher.coord = lineInfo.closestPusher.coord.getPrevious(direction);
        return lineInfo;
    }

    public getInsertions(state: SiamState, config: SiamConfig): SiamMove[] {
        let moves: SiamMove[] = [];
        const maxX: number = config.width - 1;
        const maxY: number = config.height - 1;
        for (let x: number = 1; x < maxX; x++) {
            moves = moves.concat(this.getInsertionsAt(state, x, 0, config));
            moves = moves.concat(this.getInsertionsAt(state, x, maxY, config));
        }
        for (let y: number = 1; y < maxY; y++) {
            moves = moves.concat(this.getInsertionsAt(state, 0, y, config));
            moves = moves.concat(this.getInsertionsAt(state, maxX, y, config));
        }
        moves = moves.concat(this.getInsertionsAt(state, 0, 0, config));
        moves = moves.concat(this.getInsertionsAt(state, 0, maxY, config));
        moves = moves.concat(this.getInsertionsAt(state, maxX, 0, config));
        moves = moves.concat(this.getInsertionsAt(state, maxX, maxY, config));
        return moves;
    }

    public getInsertionsAt(state: SiamState, x: number, y: number, config: SiamConfig): SiamMove[] {
        const moves: SiamMove[] = [];
        for (const direction of Orthogonal.ORTHOGONALS) {
            const entrance: Coord = new Coord(x, y).getPrevious(direction);
            if (state.isOnBoard(entrance) === false) {
                for (const orientation of Orthogonal.ORTHOGONALS) {
                    const move: SiamMove =
                        SiamMove.of(entrance.x, entrance.y, MGPOptional.of(direction), orientation);
                    Utils.assert(this.getMoveValidity(move, state).isSuccess(),
                                 'SiamRules.getInsertionsAt should only construct valid insertions');
                    const legality: MGPFallible<SiamLegalityInformation> =
                        this.isLegal(move, state, MGPOptional.of(config));
                    if (legality.isSuccess()) {
                        moves.push(move);
                    }
                }
            }
        }
        return moves;
    }

    public getMovesFrom(state: SiamState, piece: SiamPiece, x: number, y: number): SiamMove[] {
        const coord: Coord = new Coord(x, y);
        // Three rotations
        let moves: SiamMove[] = this.getRotationMovesAt(coord, piece);

        for (const direction of Orthogonal.ORTHOGONALS) {
            // All legal forward moves
            const landingCoord: Coord = coord.getNext(direction);
            moves = moves.concat(this.getForwardMovesBetween(state, coord, landingCoord));
        }
        return moves;
    }

    public getMovesBetween(state: SiamState, piece: SiamPiece, start: Coord, end: Coord): SiamMove[] {
        if (start.equals(end)) {
            return this.getRotationMovesAt(start, piece);
        } else {
            const directionOpt: MGPFallible<Orthogonal> = Orthogonal.factory.fromMove(start, end);
            if (directionOpt.isSuccess() && start.getLinearDistanceToward(end) === 1) {
                return this.getForwardMovesBetween(state, start, end);
            } else {
                // There are no possible moves here
                return [];
            }
        }
    }

    private getRotationMovesAt(coord: Coord, piece: SiamPiece): SiamMove[] {
        const moves: SiamMove[] = [];
        const currentOrientation: Orthogonal = piece.getDirection();
        for (const direction of Orthogonal.ORTHOGONALS) {
            if (direction !== currentOrientation) {
                const newMove: SiamMove = SiamMove.of(coord.x, coord.y, MGPOptional.empty(), direction);
                moves.push(newMove);
            }
        }
        return moves;
    }

    private getForwardMovesBetween(state: SiamState,
                                   start: Coord,
                                   end: Coord)
    : SiamMove[]
    {
        const moves: SiamMove[] = [];
        let orientations: ReadonlyArray<Orthogonal>;
        const direction: Orthogonal = Orthogonal.factory.fromMove(start, end).get();
        const piece: SiamPiece = state.getPieceAt(start);
        if (state.isOnBoard(end)) {
            orientations = Orthogonal.ORTHOGONALS;
        } else {
            orientations = [direction];
        }
        for (const orientation of orientations) {
            const move: SiamMove = SiamMove.of(start.x, start.y, MGPOptional.of(direction), orientation);
            const legality: MGPFallible<SiamLegalityInformation> = this.isLegalForwarding(move, state, piece);
            if (legality.isSuccess()) {
                moves.push(move);
            }
        }
        return moves;
    }

    public override getGameStatus(node: SiamNode, config: MGPOptional<SiamConfig>): GameStatus {
        const mountainsInfo: { rows: number[], columns: number[], nbMountain: number } =
            this.getMountainsRowsAndColumns(node.gameState);

        const winner: PlayerOrNone =
            this.getWinner(node.gameState, node.previousMove, mountainsInfo.nbMountain, config.get());
        if (winner.isPlayer()) {
            return GameStatus.getVictory(winner);
        } else {
            return GameStatus.ONGOING;
        }
    }

}
