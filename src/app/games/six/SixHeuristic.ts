import { Coord } from 'src/app/jscaip/Coord';
import { HexaDirection } from 'src/app/jscaip/HexaDirection';
import { Player, PlayerOrNone } from 'src/app/jscaip/Player';
import { MGPOptional, Utils } from '@everyboard/lib';
import { SixState } from './SixState';
import { SixMove } from './SixMove';
import { SixVictorySource, SixNode } from './SixRules';
import { BoardValue } from 'src/app/jscaip/AI/BoardValue';
import { AlignmentHeuristic, AlignmentStatus, BoardInfo } from 'src/app/jscaip/AI/AlignmentHeuristic';
import { NoConfig } from 'src/app/jscaip/RulesConfigUtil';
import { PlayerNumberMap } from 'src/app/jscaip/PlayerMap';

export class SixHeuristic extends AlignmentHeuristic<SixMove, SixState, SixVictorySource> {

    public VERBOSE: boolean = false;

    public currentVictorySource: SixVictorySource;

    public getBoardValue(node: SixNode, _config: NoConfig): BoardValue {
        const move: MGPOptional<SixMove> = node.previousMove;
        const state: SixState = node.gameState;
        const previousPlayer: Player = state.getPreviousPlayer();
        const victoryValue: number = previousPlayer.getVictoryValue();
        let shapeInfo: BoardInfo = {
            status: AlignmentStatus.NOTHING,
            victory: MGPOptional.empty(),
            preVictory: MGPOptional.empty(),
            sum: 0,
        };
        if (move.isPresent()) {
            shapeInfo = this.calculateBoardValue(move.get(), state);
        }
        if (shapeInfo.status === AlignmentStatus.VICTORY) {
            return BoardValue.of(victoryValue);
        }
        if (state.turn > 39) {
            const pieces: PlayerNumberMap = state.countPieces();
            return BoardValue.ofPlayerNumberMap(pieces);
        }
        if (shapeInfo.status === AlignmentStatus.PRE_VICTORY) {
            return BoardValue.of(previousPlayer.getPreVictory());
        }
        return BoardValue.of(shapeInfo.sum * previousPlayer.getScoreModifier());
    }

    public startSearchingVictorySources(): void {
        this.currentVictorySource = {
            typeSource: 'LINE',
            index: -1,
        };
    }

    public hasNextVictorySource(): boolean {
        return this.currentVictorySource.typeSource !== 'CIRCLE' ||
            this.currentVictorySource.index !== 5;
    }

    public getNextVictorySource(): SixVictorySource {
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

    public searchVictoryOnly(victorySource: SixVictorySource, move: SixMove, state: SixState): BoardInfo {
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

    public searchVictoryOnlyForCircle(index: number, lastDrop: Coord, state: SixState): BoardInfo {
        const previousPlayer: Player = state.getPreviousPlayer();
        const initialDirection: HexaDirection = HexaDirection.factory.all[index];
        const testedCoords: Coord[] = [lastDrop];
        let testCoord: Coord = lastDrop.getNext(initialDirection, 1);
        while (testedCoords.length < 6) {
            const testedPiece: PlayerOrNone = state.getPieceAt(testCoord);
            if (testedPiece !== previousPlayer) {
                return {
                    status: AlignmentStatus.PRE_VICTORY,
                    victory: MGPOptional.empty(),
                    preVictory: MGPOptional.empty(),
                    sum: 0,
                };
            }
            const dirIndex: number = (index + testedCoords.length) % 6;
            testedCoords.push(testCoord);
            const dir: HexaDirection = HexaDirection.factory.all[dirIndex];
            testCoord = testCoord.getNext(dir, 1);
        }
        return {
            status: AlignmentStatus.VICTORY,
            victory: MGPOptional.of(testedCoords),
            preVictory: MGPOptional.empty(),
            sum: 0,
        };
    }

    public searchVictoryOnlyForLine(index: number, lastDrop: Coord, state: SixState): BoardInfo {
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
                    return {
                        status: AlignmentStatus.PRE_VICTORY,
                        victory: MGPOptional.empty(),
                        preVictory: MGPOptional.empty(),
                        sum: 0,
                    };
                } else {
                    twoDirectionCovered = true;
                    dir = dir.getOpposite();
                    testCoord = testCoord.getNext(dir, victory.length - 1);
                }
            }
            testCoord = testCoord.getNext(dir, 1);
        }
        return {
            status: AlignmentStatus.VICTORY,
            victory: MGPOptional.of(victory),
            preVictory: MGPOptional.empty(),
            sum: 0,
        };
    }

    public searchVictoryOnlyForTriangleCorner(index: number, lastDrop: Coord, state: SixState): BoardInfo {
        const previousPlayer: Player = state.getPreviousPlayer();
        let edgeDirection: HexaDirection = HexaDirection.factory.all[index];
        const testedCoords: Coord[] = [lastDrop];
        let testCoord: Coord = lastDrop.getNext(edgeDirection, 1);
        while (testedCoords.length < 6) {
            // Testing the corner
            const testedPiece: PlayerOrNone = state.getPieceAt(testCoord);
            if (testedPiece !== previousPlayer) {
                return {
                    status: AlignmentStatus.PRE_VICTORY,
                    victory: MGPOptional.empty(),
                    preVictory: MGPOptional.empty(),
                    sum: 0,
                };
            }
            if (testedCoords.length % 2 === 0) {
                // reached a corner, let's turn
                const dirIndex: number = (index + testedCoords.length) % 6;
                edgeDirection = HexaDirection.factory.all[dirIndex];
            }
            testedCoords.push(testCoord);
            testCoord = testCoord.getNext(edgeDirection, 1);
        }
        return {
            status: AlignmentStatus.VICTORY,
            victory: MGPOptional.of(testedCoords),
            preVictory: MGPOptional.empty(),
            sum: 0,
        };
    }

    public searchVictoryOnlyForTriangleEdge(index: number, lastDrop: Coord, state: SixState): BoardInfo {
        const previousPlayer: Player = state.getPreviousPlayer();
        let edgeDirection: HexaDirection = HexaDirection.factory.all[index];
        const testedCoords: Coord[] = [lastDrop];
        let testCoord: Coord = lastDrop.getNext(edgeDirection, 1);
        while (testedCoords.length < 6) {
            // Testing the corner
            const testedPiece: PlayerOrNone = state.getPieceAt(testCoord);
            if (testedPiece !== previousPlayer) {
                return {
                    status: AlignmentStatus.PRE_VICTORY,
                    victory: MGPOptional.empty(),
                    preVictory: MGPOptional.empty(),
                    sum: 0,
                };
            }
            testedCoords.push(testCoord);
            if (testedCoords.length % 2 === 0) {
                // reached a corner, let's turn
                const dirIndex: number = (index + testedCoords.length) % 6;
                edgeDirection = HexaDirection.factory.all[dirIndex];
            }
            testCoord = testCoord.getNext(edgeDirection, 1);
        }
        return {
            status: AlignmentStatus.VICTORY,
            victory: MGPOptional.of(testedCoords),
            preVictory: MGPOptional.empty(),
            sum: 0,
        };
    }

    public getBoardInfo(victorySource: SixVictorySource,
                        move: SixMove,
                        state: SixState,
                        boardInfo: BoardInfo)
    : BoardInfo
    {
        const lastDrop: Coord = move.landing;
        switch (victorySource.typeSource) {
            case 'CIRCLE':
                return this.getBoardInfoForCircle(victorySource.index, lastDrop, state, boardInfo);
            case 'LINE':
                return this.getBoardInfoForLine(victorySource.index, lastDrop, state, boardInfo);
            case 'TRIANGLE_CORNER':
                return this.getBoardInfoForTriangleCorner(victorySource.index, lastDrop, state, boardInfo);
            default:
                return this.getBoardInfoForTriangleEdge(victorySource.index, lastDrop, state, boardInfo);
        }
    }

    public getBoardInfoForCircle(index: number, lastDrop: Coord, state: SixState, boardInfo: BoardInfo): BoardInfo {
        const previousOpponent: Player = state.getPreviousOpponent();
        const initialDirection: HexaDirection = HexaDirection.factory.all[index];
        const testedCoords: Coord[] = [lastDrop];
        let testCoord: Coord = lastDrop.getNext(initialDirection, 1);
        let subSum: number = 0;
        let lastEmpty: MGPOptional<Coord> = MGPOptional.empty();
        while (testedCoords.length < 6) {
            const testedPiece: PlayerOrNone = state.getPieceAt(testCoord);
            if (testedPiece === previousOpponent) {
                return boardInfo; // nothing to add here
            }
            const dirIndex: number = (index + testedCoords.length) % 6;
            testedCoords.push(testCoord);
            const dir: HexaDirection = HexaDirection.factory.all[dirIndex];
            if (testedPiece.isNone()) {
                subSum += 0.16; // roughly 1/6
                lastEmpty = MGPOptional.of(testCoord);
            } else {
                subSum++;
            }
            testCoord = testCoord.getNext(dir, 1);
        }
        return this.getBoardInfoResult(subSum, lastEmpty, testedCoords, boardInfo);
    }

    public getBoardInfoResult(subSum: number,
                              lastEmpty: MGPOptional<Coord>,
                              testedCoords: Coord[],
                              boardInfo: BoardInfo)
    : BoardInfo
    {
        let preVictory: MGPOptional<Coord> = boardInfo.preVictory;
        if (subSum === 4.16) {
            // We found 5 pieces aligned and one space, so that space is a preVictory coord
            if (preVictory.isPresent() && (preVictory.equals(lastEmpty) === false)) {
                return {
                    status: AlignmentStatus.PRE_VICTORY,
                    victory: MGPOptional.empty(),
                    preVictory: MGPOptional.empty(),
                    sum: 0,
                };
            } else {
                preVictory = lastEmpty;
            }
        } else if (subSum === 5) {
            return {
                status: AlignmentStatus.VICTORY,
                victory: MGPOptional.of(testedCoords),
                preVictory: MGPOptional.empty(),
                sum: 0,
            };
        }
        return {
            status: boardInfo.status,
            victory: MGPOptional.empty(),
            preVictory,
            sum: boardInfo.sum + subSum,
        };
    }

    public getBoardInfoForLine(index: number, lastDrop: Coord, state: SixState, boardInfo: BoardInfo): BoardInfo {
        const dir: HexaDirection = HexaDirection.factory.all[index];
        let testedCoord: Coord = lastDrop.getPrevious(dir, 5);
        let testedCoords: Coord[] = [];
        let encountered: number[] = [];
        let lastEmpty: MGPOptional<Coord> = MGPOptional.empty();
        for (let i: number = 0; i < 6; i++) {
            const empty: MGPOptional<Coord> = this.updateEncounterAndReturnLastEmpty(state, testedCoord, encountered);
            if (empty.isPresent()) {
                lastEmpty = empty;
            }
            testedCoords.push(testedCoord);
            testedCoord = testedCoord.getNext(dir, 1);
        }
        let status: AlignmentStatus = boardInfo.status;
        let preVictory: MGPOptional<Coord> = boardInfo.preVictory;
        let nbTested: number = 0;
        let finalSubSum: number = 0;
        while (nbTested < 6) {
            const subSum: number = encountered.reduce((a: number, b: number) => a + b);
            if (subSum === 5.16 && status === AlignmentStatus.NOTHING) {
                if (preVictory.isPresent()) {
                    Utils.assert(preVictory.equals(lastEmpty) === false,
                                 'Impossible to have point aligned with different line to a same point');
                    status = AlignmentStatus.PRE_VICTORY;
                } else {
                    preVictory = lastEmpty;
                }
            }
            finalSubSum = Math.max(finalSubSum, subSum);
            testedCoords = testedCoords.slice(1, 6);
            testedCoords.push(testedCoord);
            encountered = encountered.slice(1, 6);
            const newEmpty: MGPOptional<Coord> =
                this.updateEncounterAndReturnLastEmpty(state, testedCoord, encountered);
            if (newEmpty.isPresent()) {
                lastEmpty = newEmpty;
            }
            nbTested++;
            testedCoord = testedCoord.getNext(dir, 1);
        }
        const newBoardInfo: BoardInfo = {
            status,
            victory: MGPOptional.of(testedCoords),
            preVictory,
            sum: finalSubSum,
        };
        return this.getBoardInfoResult(finalSubSum, lastEmpty, testedCoords, newBoardInfo);
    }

    private updateEncounterAndReturnLastEmpty(state: SixState,
                                              testedCoord: Coord,
                                              encountered: number[]): MGPOptional<Coord> {
        const previousOpponent: Player = state.getPreviousOpponent();
        switch (state.getPieceAt(testedCoord)) {
            case previousOpponent:
                encountered.push(-7);
                // just enough to make sum negative when opponent encountered
                return MGPOptional.empty();
            case PlayerOrNone.NONE:
                encountered.push(0.16);
                return MGPOptional.of(testedCoord);
            default:
                encountered.push(1);
                return MGPOptional.empty();
        }
    }

    public getBoardInfoForTriangleCorner(index: number,
                                         lastDrop: Coord,
                                         state: SixState,
                                         boardInfo: BoardInfo)
    : BoardInfo
    {
        const previousOpponent: Player = state.getPreviousOpponent();
        let edgeDirection: HexaDirection = HexaDirection.factory.all[index];
        const testedCoords: Coord[] = [lastDrop];
        let testCoord: Coord = lastDrop.getNext(edgeDirection, 1);
        let subSum: number = 0;
        let lastEmpty: MGPOptional<Coord> = MGPOptional.empty();
        while (testedCoords.length < 6) {
            // Testing the corner
            const testedPiece: PlayerOrNone = state.getPieceAt(testCoord);
            if (testedPiece === previousOpponent) {
                return boardInfo;
            }
            if (testedPiece.isNone()) {
                subSum += 0.16; // rougly 1/6
                lastEmpty = MGPOptional.of(testCoord);
            } else {
                subSum++;
            }
            if (testedCoords.length % 2 === 0) {
                // reached a corner, let's turn
                const dirIndex: number = (index + testedCoords.length) % 6;
                edgeDirection = HexaDirection.factory.all[dirIndex];
            }
            testedCoords.push(testCoord);
            testCoord = testCoord.getNext(edgeDirection, 1);
        }
        return this.getBoardInfoResult(subSum, lastEmpty, testedCoords, boardInfo);
    }

    public getBoardInfoForTriangleEdge(index: number,
                                       lastDrop: Coord,
                                       state: SixState,
                                       boardInfo: BoardInfo): BoardInfo {

        const previousOpponent: Player = state.getPreviousOpponent();
        let edgeDirection: HexaDirection = HexaDirection.factory.all[index];
        const testedCoords: Coord[] = [lastDrop];
        let testCoord: Coord = lastDrop.getNext(edgeDirection, 1);
        let subSum: number = 0;
        let lastEmpty: MGPOptional<Coord> = MGPOptional.empty();
        while (testedCoords.length < 6) {
            // Testing the corner
            const testedPiece: PlayerOrNone = state.getPieceAt(testCoord);
            if (testedPiece === previousOpponent) {
                return boardInfo;
            }
            if (testedPiece.isNone()) {
                subSum += 0.16; // rougly 1/6
                lastEmpty = MGPOptional.of(testCoord);
            } else {
                subSum++;
            }
            testedCoords.push(testCoord);
            if (testedCoords.length % 2 === 0) {
                // reached a corner, let's turn
                const dirIndex: number = (index + testedCoords.length) % 6;
                edgeDirection = HexaDirection.factory.all[dirIndex];
            }
            testCoord = testCoord.getNext(edgeDirection, 1);
        }
        return this.getBoardInfoResult(subSum, lastEmpty, testedCoords, boardInfo);
    }

}
