import { Coord } from 'src/app/jscaip/Coord';
import { HexaDirection } from 'src/app/jscaip/HexaDirection';
import { GameNode } from 'src/app/jscaip/AI/GameNode';
import { Player, PlayerOrNone } from 'src/app/jscaip/Player';
import { SixState } from './SixState';
import { SixMove } from './SixMove';
import { SixFailure } from './SixFailure';
import { Rules } from 'src/app/jscaip/Rules';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { MGPFallible, MGPOptional, Set, MGPValidation } from '@everyboard/lib';
import { GameStatus } from 'src/app/jscaip/GameStatus';
import { Table } from 'src/app/jscaip/TableUtils';
import { Debug } from 'src/app/utils/Debug';
import { CoordSet } from 'src/app/jscaip/CoordSet';
import { NoConfig } from 'src/app/jscaip/RulesConfigUtil';
import { PlayerNumberMap } from 'src/app/jscaip/PlayerMap';

export type SixLegalityInformation = CoordSet;

export class SixNode extends GameNode<SixMove, SixState> {
}

export interface SixVictorySource {
    typeSource: 'LINE' | 'TRIANGLE_CORNER' | 'TRIANGLE_EDGE' | 'CIRCLE',
    index: number,
}

@Debug.log
export class SixRules extends Rules<SixMove, SixState, SixLegalityInformation> {

    private static singleton: MGPOptional<SixRules> = MGPOptional.empty();

    private currentVictorySource: SixVictorySource;

    public static get(): SixRules {
        if (SixRules.singleton.isAbsent()) {
            SixRules.singleton = MGPOptional.of(new SixRules());
        }
        return SixRules.singleton.get();
    }

    public override getInitialState(): SixState {
        const board: Table<PlayerOrNone> = [[Player.ZERO], [Player.ONE]];
        return SixState.ofRepresentation(board, 0);
    }

    public override applyLegalMove(move: SixMove,
                                   state: SixState,
                                   _config: NoConfig,
                                   kept: SixLegalityInformation)
    : SixState
    {
        if (state.turn < 40) {
            return state.applyLegalDrop(move.landing);
        } else {
            return state.applyLegalDeplacement(move, kept);
        }
    }

    public override isLegal(move: SixMove, state: SixState): MGPFallible<SixLegalityInformation> {
        const landingLegality: MGPValidation = state.isIllegalLandingZone(move.landing, move.start);
        if (landingLegality.isFailure()) {
            return landingLegality.toOtherFallible();
        }
        if (state.turn < 40) {
            return this.isLegalDrop(move, state);
        } else {
            return SixRules.isLegalPhaseTwoMove(move, state);
        }
    }
    public static getLegalLandings(state: SixState): Coord[] {
        let neighbors: CoordSet = new CoordSet();
        for (const piece of state.getPieceCoords()) {
            for (const dir of HexaDirection.factory.all) {
                const neighbor: Coord = piece.getNext(dir, 1);
                if (state.getPieceAt(neighbor).isNone()) {
                    neighbors = neighbors.addElement(neighbor);
                }
            }
        }
        return neighbors.toList();
    }
    public isLegalDrop(move: SixMove, state: SixState): MGPFallible<SixLegalityInformation> {
        if (move.isDrop() === false) {
            return MGPFallible.failure(SixFailure.NO_MOVEMENT_BEFORE_TURN_40());
        }
        return MGPFallible.success(new CoordSet(state.getPieceCoords()));
    }
    public static isLegalPhaseTwoMove(move: SixMove, state: SixState): MGPFallible<SixLegalityInformation> {
        if (move.isDrop()) {
            return MGPFallible.failure(SixFailure.CAN_NO_LONGER_DROP());
        }
        const pieceOwner: PlayerOrNone = state.getPieceAt(move.start.get());
        if (pieceOwner.isNone()) {
            return MGPFallible.failure(RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_EMPTY());
        } else if (pieceOwner === state.getCurrentOpponent()) {
            return MGPFallible.failure(RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_OPPONENT());
        }
        const stateAfterMove: SixState = state.movePiece(move);
        const groupsAfterMove: Set<CoordSet> = stateAfterMove.getGroups();
        if (SixRules.isSplit(groupsAfterMove)) {
            const biggerGroups: Set<CoordSet> = this.getLargestGroups(groupsAfterMove);
            if (biggerGroups.size() === 1) {
                if (move.keep.isPresent()) {
                    return MGPFallible.failure(SixFailure.CANNOT_CHOOSE_TO_KEEP());
                } else {
                    return MGPFallible.success(biggerGroups.getAnyElement().get());
                }
            } else {
                return this.moveKeepBiggerGroup(move.keep, biggerGroups, stateAfterMove);
            }
        } else {
            return MGPFallible.success(new CoordSet());
        }
    }
    public static isSplit(groups: Set<CoordSet>): boolean {
        return groups.size() > 1;
    }
    public static getLargestGroups(groups: Set<CoordSet>): Set<CoordSet> {
        let biggerSize: number = 0;
        let biggerGroups: Set<CoordSet> = new Set();
        for (const group of groups) {
            const groupSize: number = group.size();
            if (groupSize > biggerSize) {
                biggerSize = groupSize;
                biggerGroups = new Set([group]);
            } else if (groupSize === biggerSize) {
                biggerGroups = biggerGroups.addElement(group);
            }
        }
        return biggerGroups;
    }
    public static moveKeepBiggerGroup(keep: MGPOptional<Coord>,
                                      biggerGroups: Set<CoordSet>,
                                      state: SixState)
    : MGPFallible<SixLegalityInformation>
    {
        if (keep.isAbsent()) {
            return MGPFallible.failure(SixFailure.MUST_CUT());
        }
        if (state.getPieces().get(keep.get()).isAbsent()) {
            return MGPFallible.failure(SixFailure.CANNOT_KEEP_EMPTY_COORD());
        }
        const keptCoord: Coord = keep.get();
        for (const subGroup of biggerGroups) {
            if (subGroup.contains(keptCoord)) {
                return MGPFallible.success(subGroup);
            }
        }
        return MGPFallible.failure(SixFailure.MUST_CAPTURE_BIGGEST_GROUPS());
    }
    public override getGameStatus(node: SixNode): GameStatus {
        const state: SixState = node.gameState;
        const previousPlayer: Player = state.getPreviousPlayer();
        let shapeVictory: Coord[] = [];
        if (node.previousMove.isPresent()) {
            shapeVictory = this.getShapeVictory(node.previousMove.get(), state);
        }
        if (shapeVictory.length === 6) {
            return GameStatus.getVictory(previousPlayer);
        }
        if (state.turn > 39) {
            const pieces: PlayerNumberMap = state.countPieces();
            const zeroPieces: number = pieces.get(Player.ZERO);
            const onePieces: number = pieces.get(Player.ONE);
            if (zeroPieces < 6 && onePieces < 6) {
                if (zeroPieces < onePieces) {
                    return GameStatus.ONE_WON;
                } else if (onePieces < zeroPieces) {
                    return GameStatus.ZERO_WON;
                } else {
                    return GameStatus.DRAW;
                }
            } else if (zeroPieces < 6) {
                return GameStatus.getDefeat(Player.ZERO);
            } else if (onePieces < 6) {
                return GameStatus.getDefeat(Player.ONE);
            } else {
                return GameStatus.ONGOING;
            }
        }
        return GameStatus.ONGOING;
    }
    private startSearchingVictorySources(): void {
        this.currentVictorySource = {
            typeSource: 'LINE',
            index: -1,
        };
    }
    public getShapeVictory(lastMove: SixMove, state: SixState): Coord[] {
        this.startSearchingVictorySources();
        while (this.hasNextVictorySource()) {
            this.getNextVictorySource();
            const shapeVictory: Coord[] = this.searchVictoryOnly(this.currentVictorySource, lastMove, state);
            if (shapeVictory.length === 6) {
                return shapeVictory;
            }
        }
        return [];
    }
    private hasNextVictorySource(): boolean {
        return this.currentVictorySource.typeSource !== 'CIRCLE' ||
               this.currentVictorySource.index !== 5;
    }
    private getNextVictorySource(): SixVictorySource {
        const source: SixVictorySource = this.currentVictorySource;
        if (source.index === 5) {
            let newType: 'TRIANGLE_CORNER' | 'TRIANGLE_EDGE' | 'CIRCLE';
            switch (this.currentVictorySource.typeSource) {
                case 'LINE':
                    newType = 'TRIANGLE_CORNER';
                    break;
                case 'TRIANGLE_CORNER':
                    newType = 'TRIANGLE_EDGE';
                    break;
                default:
                    newType = 'CIRCLE';
                    break;
            }
            this.currentVictorySource = {
                typeSource: newType,
                index: 0,
            };
        } else {
            let increment: number = 1;
            if (this.currentVictorySource.typeSource === 'LINE') {
                increment = 2;
            }
            this.currentVictorySource = {
                typeSource: this.currentVictorySource.typeSource,
                index: this.currentVictorySource.index + increment,
            };
        }
        return this.currentVictorySource;
    }
    private searchVictoryOnly(victorySource: SixVictorySource, move: SixMove, state: SixState): Coord[] {
        const lastDrop: Coord = move.landing;
        switch (victorySource.typeSource) {
            case 'LINE':
                return this.searchVictoryOnlyForLine(victorySource.index, lastDrop, state);
            case 'CIRCLE':
                return this.searchVictoryOnlyForCircle(victorySource.index, lastDrop, state);
            case 'TRIANGLE_CORNER':
                return this.searchVictoryOnlyForTriangleCorner(victorySource.index, lastDrop, state);
            default:
                return this.searchVictoryOnlyForTriangleEdge(victorySource.index, lastDrop, state);
        }
    }
    private searchVictoryOnlyForCircle(index: number, lastDrop: Coord, state: SixState): Coord[] {
        const previousPlayer: Player = state.getPreviousPlayer();
        const initialDirection: HexaDirection = HexaDirection.factory.all[index];
        const victory: Coord[] = [lastDrop];
        let testCoord: Coord = lastDrop.getNext(initialDirection, 1);
        while (victory.length < 6) {
            const testedPiece: PlayerOrNone = state.getPieceAt(testCoord);
            if (testedPiece !== previousPlayer) {
                return [];
            }
            const dirIndex: number = (index + victory.length) % 6;
            victory.push(testCoord);
            const dir: HexaDirection = HexaDirection.factory.all[dirIndex];
            testCoord = testCoord.getNext(dir, 1);
        }
        return victory;
    }
    private searchVictoryOnlyForLine(index: number, lastDrop: Coord, state: SixState): Coord[] {
        const previousPlayer: Player = state.getPreviousPlayer();
        let dir: HexaDirection = HexaDirection.factory.all[index];
        let testCoord: Coord = lastDrop.getNext(dir, 1);
        const victory: Coord[] = [lastDrop];
        let twoDirectionCovered: boolean = false;
        while (victory.length < 6) {
            const testedPiece: PlayerOrNone = state.getPieceAt(testCoord);
            if (testedPiece === previousPlayer) {
                victory.push(testCoord);
            } else {
                if (twoDirectionCovered) {
                    return [];
                } else {
                    twoDirectionCovered = true;
                    dir = dir.getOpposite();
                    testCoord = testCoord.getNext(dir, victory.length);
                }
            }
            testCoord = testCoord.getNext(dir, 1);
        }
        return victory;
    }
    private searchVictoryOnlyForTriangleCorner(index: number, lastDrop: Coord, state: SixState): Coord[] {
        const previousPlayer: Player = state.getPreviousPlayer();
        let edgeDirection: HexaDirection = HexaDirection.factory.all[index];
        const victory: Coord[] = [lastDrop];
        let testCoord: Coord = lastDrop.getNext(edgeDirection, 1);
        while (victory.length < 6) {
            // Testing the corner
            const testedPiece: PlayerOrNone = state.getPieceAt(testCoord);
            if (testedPiece !== previousPlayer) {
                return [];
            }
            if (victory.length % 2 === 0) {
                // reached a corner, let's turn
                const dirIndex: number = (index + victory.length) % 6;
                edgeDirection = HexaDirection.factory.all[dirIndex];
            }
            victory.push(testCoord);
            testCoord = testCoord.getNext(edgeDirection, 1);
        }
        return victory;
    }
    private searchVictoryOnlyForTriangleEdge(index: number, lastDrop: Coord, state: SixState): Coord[] {
        const previousPlayer: Player = state.getPreviousPlayer();
        let edgeDirection: HexaDirection = HexaDirection.factory.all[index];
        const victory: Coord[] = [lastDrop];
        let testCoord: Coord = lastDrop.getNext(edgeDirection, 1);
        while (victory.length < 6) {
            // Testing the corner
            const testedPiece: PlayerOrNone = state.getPieceAt(testCoord);
            if (testedPiece !== previousPlayer) {
                return [];
            }
            victory.push(testCoord);
            if (victory.length % 2 === 0) {
                // reached a corner, let's turn
                const dirIndex: number = (index + victory.length) % 6;
                edgeDirection = HexaDirection.factory.all[dirIndex];
            }
            testCoord = testCoord.getNext(edgeDirection, 1);
        }
        return victory;
    }
}
