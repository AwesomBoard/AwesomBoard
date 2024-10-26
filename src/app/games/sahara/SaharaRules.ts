import { Rules } from 'src/app/jscaip/Rules';
import { GameNode } from 'src/app/jscaip/AI/GameNode';
import { Player } from 'src/app/jscaip/Player';
import { Coord, CoordFailure } from 'src/app/jscaip/Coord';
import { SaharaMove } from './SaharaMove';
import { SaharaState } from './SaharaState';
import { TriangularCheckerBoard } from 'src/app/jscaip/state/TriangularCheckerBoard';
import { MGPOptional, MGPValidation } from '@everyboard/lib';
import { TriangularGameState } from 'src/app/jscaip/state/TriangularGameState';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { SaharaFailure } from './SaharaFailure';
import { FourStatePiece } from 'src/app/jscaip/FourStatePiece';
import { GameStatus } from 'src/app/jscaip/GameStatus';
import { NoConfig } from 'src/app/jscaip/RulesConfigUtil';
import { Debug } from 'src/app/utils/Debug';
import { CoordSet } from 'src/app/jscaip/CoordSet';
import { HexagonalUtils } from 'src/app/jscaip/HexagonalUtils';

export class SaharaNode extends GameNode<SaharaMove, SaharaState> {}

@Debug.log
export class SaharaRules extends Rules<SaharaMove, SaharaState> {

    private static singleton: MGPOptional<SaharaRules> = MGPOptional.empty();

    public static get(): SaharaRules {
        if (SaharaRules.singleton.isAbsent()) {
            SaharaRules.singleton = MGPOptional.of(new SaharaRules());
        }
        return SaharaRules.singleton.get();
    }

    public override getInitialState(): SaharaState {
        const size: number = 3;
        const N: FourStatePiece = FourStatePiece.UNREACHABLE;
        const O: FourStatePiece = FourStatePiece.ZERO;
        const X: FourStatePiece = FourStatePiece.ONE;
        const _: FourStatePiece = FourStatePiece.EMPTY;

        const board: FourStatePiece[][] = HexagonalUtils.createBoard(size, N, _);
        const start: number = (size + 1) % 2;
        const xEnd: number = (4 * size) - (2 - start);
        const yEnd: number = (size * 2) - 1;
        const first: number = size - (size % 2);
        const second: number = first + 1;
        const third: number = first + (2 * size) - 1;
        const fourth: number = third + 1;

        board[0][first] = O;
        board[0][second] = X;
        board[0][third] = O;
        board[0][fourth] = X;

        board[first - start][start] = X;
        board[second - start][start] = O;
        board[first - start][xEnd] = O;
        board[second - start][xEnd] = X;

        board[yEnd][first] = O;
        board[yEnd][second] = X;
        board[yEnd][third] = O;
        board[yEnd][fourth] = X;
        return new SaharaState(board, 0);
    }

    public static getStartingCoords(state: SaharaState, player: Player): Coord[] {
        const startingCoords: Coord[] = [];
        for (const coordAndContent of state.getCoordsAndContents()) {
            if (coordAndContent.content.is(player)) {
                startingCoords.push(coordAndContent.coord);
            }
        }
        return startingCoords;
    }

    public static getBoardValuesFor(state: SaharaState, player: Player): number[] {
        const playersPiece: Coord[] = SaharaRules.getStartingCoords(state, player);
        const playerFreedoms: number[] = [];
        for (const piece of playersPiece) {
            const freedoms: number =
                TriangularGameState.getEmptyNeighbors(state.board, piece, FourStatePiece.EMPTY).length;
            if (freedoms === 0) {
                return [0, 0, 0, 0, 0, 0]; // Because there are 6 pieces
            }
            playerFreedoms.push(freedoms);
        }
        return playerFreedoms.sort((a: number, b: number) => a - b);
    }

    public override applyLegalMove(move: SaharaMove,
                                   state: SaharaState,
                                   _config: NoConfig,
                                   _info: void)
    : SaharaState
    {
        const board: FourStatePiece[][] = state.getCopiedBoard();
        board[move.getEnd().y][move.getEnd().x] = board[move.getStart().y][move.getStart().x];
        board[move.getStart().y][move.getStart().x] = FourStatePiece.EMPTY;
        const resultingState: SaharaState = new SaharaState(board, state.turn + 1);
        return resultingState;
    }

    public override isLegal(move: SaharaMove, state: SaharaState): MGPValidation {
        const coordsValidity: MGPValidation = this.getCoordsValidity(move, state);
        if (coordsValidity.isFailure()) {
            return coordsValidity;
        }
        const movedPawn: FourStatePiece = state.getPieceAt(move.getStart());
        if (movedPawn.is(state.getCurrentPlayer()) === false) {
            return MGPValidation.failure(RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_OPPONENT());
        }
        const landingSpace: FourStatePiece = state.getPieceAt(move.getEnd());
        if (landingSpace !== FourStatePiece.EMPTY) {
            return MGPValidation.failure(RulesFailure.MUST_LAND_ON_EMPTY_SPACE());
        }
        const commonNeighbor: MGPOptional<Coord> =
            TriangularCheckerBoard.getCommonNeighbor(move.getStart(), move.getEnd());
        if (commonNeighbor.isPresent()) {
            if (state.getPieceAt(commonNeighbor.get()) === FourStatePiece.EMPTY) {
                return MGPValidation.SUCCESS;
            } else {
                return MGPValidation.failure(SaharaFailure.CAN_ONLY_REBOUND_ON_EMPTY_SPACE());
            }
        } else {
            return MGPValidation.SUCCESS;
        }
    }

    private getCoordsValidity(move: SaharaMove, state: SaharaState): MGPValidation {
        if (state.isNotOnBoard(move.getStart())) {
            return MGPValidation.failure(CoordFailure.OUT_OF_RANGE(move.getStart()));
        } else if (state.isNotOnBoard(move.getEnd())) {
            return MGPValidation.failure(CoordFailure.OUT_OF_RANGE(move.getEnd()));
        } else {
            return MGPValidation.SUCCESS;
        }
    }

    public override getGameStatus(node: SaharaNode): GameStatus {
        const board: SaharaState = node.gameState;
        const zeroFreedoms: number[] = SaharaRules.getBoardValuesFor(board, Player.ZERO);
        const oneFreedoms: number[] = SaharaRules.getBoardValuesFor(board, Player.ONE);
        return SaharaRules.getGameStatusFromFreedoms(zeroFreedoms, oneFreedoms);
    }

    public getLandingCoords(state: SaharaState, coord: Coord): Coord[] {
        const isOnBoardAndEmpty: (c: Coord) => boolean = (c: Coord) => {
            return state.hasPieceAt(c, FourStatePiece.EMPTY);
        };
        const landings: CoordSet =
            new CoordSet(TriangularCheckerBoard.getNeighbors(coord).filter(isOnBoardAndEmpty));
        if (TriangularCheckerBoard.isSpaceDark(coord) === true) {
            return landings.toList();
        } else {
            let farLandings: CoordSet = new CoordSet(landings.toList()); // Deep copy
            for (const neighbor of landings) {
                const secondStepNeighbors: Coord[] =
                    TriangularCheckerBoard.getNeighbors(neighbor).filter(isOnBoardAndEmpty);
                for (const secondStepNeighbor of secondStepNeighbors) {
                    farLandings = farLandings.addElement(secondStepNeighbor);
                }
            }
            return farLandings.toList();
        }
    }

    public static getGameStatusFromFreedoms(zeroFreedoms: number[], oneFreedoms: number[]): GameStatus {
        if (zeroFreedoms[0] === 0) {
            return GameStatus.ONE_WON;
        } else if (oneFreedoms[0] === 0) {
            return GameStatus.ZERO_WON;
        }
        return GameStatus.ONGOING;
    }

}
