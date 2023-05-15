import { Coord } from 'src/app/jscaip/Coord';
import { HexaDirection } from 'src/app/jscaip/HexaDirection';
import { HexagonalUtils } from 'src/app/jscaip/HexagonalUtils';
import { MGPValidation } from 'src/app/utils/MGPValidation';
import { MGPOptional } from 'src/app/utils/MGPOptional';
import { MGPSet } from 'src/app/utils/MGPSet';
import { Utils } from 'src/app/utils/utils';
import { HiveFailure } from './HiveFailure';
import { HiveMoveCoordToCoord, HiveMoveSpider } from './HiveMove';
import { HivePiece, HivePieceKind, HivePieceStack } from './HivePiece';
import { HiveState } from './HiveState';
import { MGPFallible } from '../../utils/MGPFallible';

export abstract class HivePieceRules {

    private static INSTANCES: MGPOptional<Record<HivePieceKind, HivePieceRules>> = MGPOptional.empty();

    public static from(piece: HivePiece): HivePieceRules {
        if (HivePieceRules.INSTANCES.isAbsent()) {
            HivePieceRules.INSTANCES = MGPOptional.of({
                'QueenBee': HiveQueenBeeRules.get(),
                'Beetle': HiveBeetleRules.get(),
                'Grasshopper': HiveGrasshopperRules.get(),
                'Spider': HiveSpiderRules.get(),
                'SoldierAnt': HiveSoldierAntRules.get(),
            });
        }
        return HivePieceRules.INSTANCES.get()[piece.kind];
    }
    protected checkEmptyDestination(move: HiveMoveCoordToCoord, state: HiveState): MGPValidation {
        if (state.getAt(move.getEnd()).hasPieces()) {
            return MGPValidation.failure(HiveFailure.THIS_PIECE_CANNOT_CLIMB());
        }
        return MGPValidation.SUCCESS;
    }
    protected canSlideBetweenNeighbors(state: HiveState, start: Coord, end: Coord): boolean {
        // For the piece to slide from start to end,
        // one of the two common neighbors of start and end coord should be empty
        const startNeighbors: MGPSet<Coord> = new MGPSet(HexagonalUtils.getNeighbors(start));
        const endNeighbors: MGPSet<Coord> = new MGPSet(HexagonalUtils.getNeighbors(end));
        const commonNeighbors: MGPSet<Coord> = startNeighbors.intersection(endNeighbors);
        for (const neighbor of commonNeighbors) {
            if (state.getAt(neighbor).isEmpty()) {
                return true;
            }
        }
        return false;
    }
    public abstract moveValidity(move: HiveMoveCoordToCoord, state: HiveState): MGPValidation;

    public abstract getPotentialMoves(coord: Coord, state: HiveState): HiveMoveCoordToCoord[];
}

export class HiveQueenBeeRules extends HivePieceRules {

    private static INSTANCE: MGPOptional<HiveQueenBeeRules> = MGPOptional.empty();

    public static get(): HiveQueenBeeRules {
        if (this.INSTANCE.isAbsent()) {
            this.INSTANCE = MGPOptional.of(new HiveQueenBeeRules());
        }
        return this.INSTANCE.get();
    }
    public moveValidity(move: HiveMoveCoordToCoord, state: HiveState): MGPValidation {
        if (HexagonalUtils.areNeighbors(move.getStart(), move.getEnd()) === false) {
            return MGPValidation.failure(HiveFailure.QUEEN_BEE_CAN_ONLY_MOVE_TO_DIRECT_NEIGHBORS());
        }
        if (this.canSlideBetweenNeighbors(state, move.getStart(), move.getEnd()) === false) {
            return MGPValidation.failure(HiveFailure.MUST_BE_ABLE_TO_SLIDE());
        }
        return this.checkEmptyDestination(move, state);
    }
    public getPotentialMoves(coord: Coord, state: HiveState): HiveMoveCoordToCoord[] {
        const moves: HiveMoveCoordToCoord[] = [];
        for (const neighbor of HexagonalUtils.getNeighbors(coord)) {
            if (state.getAt(neighbor).isEmpty()) {
                moves.push(HiveMoveCoordToCoord.from(coord, neighbor).get());
            }
        }
        return moves;
    }
}

export class HiveBeetleRules extends HivePieceRules {

    private static INSTANCE: MGPOptional<HiveBeetleRules> = MGPOptional.empty();

    public static get(): HiveBeetleRules {
        if (this.INSTANCE.isAbsent()) {
            this.INSTANCE = MGPOptional.of(new HiveBeetleRules());
        }
        return this.INSTANCE.get();
    }
    public moveValidity(move: HiveMoveCoordToCoord, state: HiveState): MGPValidation {
        if (HexagonalUtils.areNeighbors(move.getStart(), move.getEnd()) === false) {
            return MGPValidation.failure(HiveFailure.BEETLE_CAN_ONLY_MOVE_TO_DIRECT_NEIGHBORS());
        }
        return MGPValidation.SUCCESS;
    }
    public getPotentialMoves(coord: Coord, state: HiveState): HiveMoveCoordToCoord[] {
        const moves: HiveMoveCoordToCoord[] = [];
        for (const neighbor of HexagonalUtils.getNeighbors(coord)) {
            moves.push(HiveMoveCoordToCoord.from(coord, neighbor).get());
        }
        return moves;
    }
}

export class HiveGrasshopperRules extends HivePieceRules {

    private static INSTANCE: MGPOptional<HiveGrasshopperRules> = MGPOptional.empty();

    public static get(): HiveGrasshopperRules {
        if (this.INSTANCE.isAbsent()) {
            this.INSTANCE = MGPOptional.of(new HiveGrasshopperRules());
        }
        return this.INSTANCE.get();
    }
    public moveValidity(move: HiveMoveCoordToCoord, state: HiveState): MGPValidation {

        const direction: MGPFallible<HexaDirection> = HexaDirection.factory.fromMove(move.getStart(), move.getEnd());
        if (direction.isFailure()) {
            return MGPValidation.failure(HiveFailure.GRASSHOPPER_MUST_MOVE_IN_STRAIGHT_LINE());
        }
        const jumpedCoords: Coord[] = move.getStart().getCoordsToward(move.getEnd());
        if (jumpedCoords.length === 0) {
            return MGPValidation.failure(HiveFailure.GRASSHOPPER_MUST_JUMP_OVER_PIECES());
        }
        for (const coord of jumpedCoords) {
            if (state.getAt(coord).isEmpty()) {
                return MGPValidation.failure(HiveFailure.GRASSHOPPER_MUST_JUMP_OVER_PIECES());
            }
        }
        return this.checkEmptyDestination(move, state);
    }
    public getPotentialMoves(coord: Coord, state: HiveState): HiveMoveCoordToCoord[] {
        const moves: HiveMoveCoordToCoord[] = [];
        for (const direction of HexaDirection.factory.all) {
            const neighbor: Coord = coord.getNext(direction);
            if (state.getAt(neighbor).hasPieces()) {
                // We can jump in that direction
                let end: Coord = neighbor;
                while (state.getAt(end).hasPieces()) {
                    end = end.getNext(direction);
                }
                moves.push(HiveMoveCoordToCoord.from(coord, end).get());
            }
        }
        return moves;
    }
}

export class HiveSpiderRules extends HivePieceRules {

    private static INSTANCE: MGPOptional<HiveSpiderRules> = MGPOptional.empty();

    public static get(): HiveSpiderRules {
        if (this.INSTANCE.isAbsent()) {
            this.INSTANCE = MGPOptional.of(new HiveSpiderRules());
        }
        return this.INSTANCE.get();
    }
    public prefixLegality(coords: Coord[], state: HiveState): MGPValidation {
        const visited: MGPSet<Coord> = new MGPSet();
        const stateWithoutMovedSpider: HiveState = state.update()
            .setAt(coords[0], HivePieceStack.EMPTY)
            .increaseTurnAndFinalizeUpdate();
        coords = coords.map((c: Coord) => c.getNext(stateWithoutMovedSpider.offset));
        for (let i: number = 1; i < coords.length; i++) {
            if (stateWithoutMovedSpider.getAt(coords[i]).hasPieces()) {
                return MGPValidation.failure(HiveFailure.THIS_PIECE_CANNOT_CLIMB());
            }
            if (HexagonalUtils.areNeighbors(coords[i-1], coords[i]) === false) {
                return MGPValidation.failure(HiveFailure.SPIDER_MUST_MOVE_ON_NEIGHBORING_SPACES());
            }
            if (stateWithoutMovedSpider.haveCommonNeighbor(coords[i], coords[i-1]) === false) {
                return MGPValidation.failure(HiveFailure.SPIDER_CAN_ONLY_MOVE_WITH_DIRECT_CONTACT());
            }
            if (this.canSlideBetweenNeighbors(stateWithoutMovedSpider, coords[i-1], coords[i]) === false) {
                return MGPValidation.failure(HiveFailure.MUST_BE_ABLE_TO_SLIDE());
            }
            if (visited.contains(coords[i])) {
                return MGPValidation.failure(HiveFailure.SPIDER_CANNOT_BACKTRACK());
            }
            visited.add(coords[i]);
        }
        return MGPValidation.SUCCESS;
    }
    public moveValidity(move: HiveMoveCoordToCoord, state: HiveState): MGPValidation {
        Utils.assert(move instanceof HiveMoveSpider, 'HiveSpiderRules: move should be a spider move');
        const spiderMove: HiveMoveSpider = move as HiveMoveSpider;
        const prefixLegality: MGPValidation = this.prefixLegality(spiderMove.coords, state);
        if (prefixLegality.isFailure()) {
            return prefixLegality;
        }
        return this.checkEmptyDestination(move, state);
    }
    public getPotentialMoves(coord: Coord, state: HiveState): HiveMoveCoordToCoord[] {
        const stateWithoutMovedSpider: HiveState = state.update()
            .setAt(coord, HivePieceStack.EMPTY)
            .increaseTurnAndFinalizeUpdate();
        coord = coord.getNext(stateWithoutMovedSpider.offset);

        let movesSoFar: Coord[][] = [[coord]];
        for (let i: number = 0; i < 3; i++) {
            movesSoFar = movesSoFar.flatMap((move: Coord[]) => this.nextMoveStep(stateWithoutMovedSpider, move));
        }
        function makeMove(move: Coord[]): HiveMoveSpider {
            move = move.map((c: Coord) => c.getPrevious(stateWithoutMovedSpider.offset));
            return HiveMoveSpider.fromCoords(move as [Coord, Coord, Coord, Coord]);
        }
        const uniqueMoves: MGPSet<HiveMoveCoordToCoord> = new MGPSet(movesSoFar.map(makeMove));
        return uniqueMoves.toList();
    }
    private nextMoveStep(state: HiveState, move: Coord[]): Coord[][] {
        const lastCoord: Coord = move[move.length - 1];
        function neighborsFilter(coord: Coord): boolean {
            if (state.getAt(coord).hasPieces()) {
                // We can only go through empty spaces
                return false;
            }
            if (move.find((c: Coord) => coord.equals(c)) !== undefined) {
                // We cannot backtrack
                return false;
            }
            // Must have a common neighbor with the previous coord
            return state.haveCommonNeighbor(coord, lastCoord);
        }
        const possibleNeighbors: MGPSet<Coord> =
            new MGPSet(HexagonalUtils.getNeighbors(lastCoord)).filter(neighborsFilter);
        return possibleNeighbors.toList().map((coord: Coord): Coord[] => [...move, coord]);
    }
}

export class HiveSoldierAntRules extends HivePieceRules {

    private static INSTANCE: MGPOptional<HiveSoldierAntRules> = MGPOptional.empty();

    public static get(): HiveSoldierAntRules {
        if (this.INSTANCE.isAbsent()) {
            this.INSTANCE = MGPOptional.of(new HiveSoldierAntRules());
        }
        return this.INSTANCE.get();
    }
    public pathExists(state: HiveState, start: Coord, end: Coord): boolean {
        const visited: MGPSet<Coord> = new MGPSet();
        const worklist: Coord[] = [start];
        while (worklist.length > 0) {
            const coord: Coord = worklist.pop() as Coord;
            if (visited.contains(coord)) {
                continue;
            }
            visited.add(coord);

            if (coord.equals(end)) {
                return true;
            }
            for (const neighbor of HexagonalUtils.getNeighbors(coord)) {
                const isEmpty: boolean = state.getAt(neighbor).isEmpty();
                const hasOccupiedNeighbors: boolean = state.getOccupiedNeighbors(neighbor).size() > 0;
                const canSlide: boolean = this.canSlideBetweenNeighbors(state, coord, neighbor);
                if (isEmpty && hasOccupiedNeighbors && canSlide) {
                    worklist.push(neighbor);
                }
            }
        }
        return false;
    }
    public moveValidity(move: HiveMoveCoordToCoord, state: HiveState): MGPValidation {
        if (this.pathExists(state, move.getStart(), move.getEnd()) === false) {
            return MGPValidation.failure(HiveFailure.MUST_BE_ABLE_TO_SLIDE());
        }
        return this.checkEmptyDestination(move, state);
    }
    public getPotentialMoves(coord: Coord, state: HiveState): HiveMoveCoordToCoord[] {
        const moves: MGPSet<HiveMoveCoordToCoord> = new MGPSet();
        for (const occupiedSpace of state.occupiedSpaces()) {
            if (occupiedSpace.equals(coord)) {
                // We will move so we don't look at this space
                continue;
            }
            for (const unoccupied of state.emptyNeighbors(occupiedSpace)) {
                moves.add(HiveMoveCoordToCoord.from(coord, unoccupied).get());
            }
        }
        return moves.toList();
    }
}
