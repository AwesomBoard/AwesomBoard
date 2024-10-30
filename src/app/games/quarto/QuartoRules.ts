import { MGPOptional, MGPValidation, Set } from '@everyboard/lib';
import { ConfigurableRules } from '../../jscaip/Rules';
import { GameNode } from 'src/app/jscaip/AI/GameNode';
import { QuartoState } from './QuartoState';
import { QuartoMove } from './QuartoMove';
import { QuartoPiece } from './QuartoPiece';
import { Coord } from 'src/app/jscaip/Coord';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { QuartoFailure } from './QuartoFailure';
import { GameStatus } from 'src/app/jscaip/GameStatus';
import { TableUtils } from 'src/app/jscaip/TableUtils';
import { CoordSet } from 'src/app/jscaip/CoordSet';
import { Debug } from 'src/app/utils/Debug';
import { AlignmentStatus } from 'src/app/jscaip/AI/AlignmentHeuristic';
import { NumberConfig, RulesConfigDescription } from 'src/app/components/wrapper-components/rules-configuration/RulesConfigDescription';
import { MGPValidators } from 'src/app/utils/MGPValidator';
import { Player } from 'src/app/jscaip/Player';

export type QuartoConfig = {
    playerZeroLevel: number;
    playerOneLevel: number;
};

/**
 * A criterion is a list of boolean sub-criteria, so three possible values: true, false, null.
 * false means that we need a specific value (e.g., big), true is the opposite (e.g., small)
 * null means that this criterion has been neutralized
 * (if a pattern contains a big and a small piece, for example).
 */
class QuartoCriterion {

    private readonly subCriterion: MGPOptional<boolean>[] =
        [MGPOptional.empty(), MGPOptional.empty(), MGPOptional.empty(), MGPOptional.empty()];

    public constructor(piece: QuartoPiece) {
        // a criterion is initialized with a piece, it takes the piece's value
        this.subCriterion[0] = MGPOptional.of((piece.value & 8) === 8);
        this.subCriterion[1] = MGPOptional.of((piece.value & 4) === 4);
        this.subCriterion[2] = MGPOptional.of((piece.value & 2) === 2);
        this.subCriterion[3] = MGPOptional.of((piece.value & 1) === 1);
    }
    /**
     * Merge with another criterion.
     * This will keep what both have in common
     * Returns true if at least one criterion is common, false otherwise
     */
    private mergeWith(other: QuartoCriterion): boolean {
        let nonNull: number = 4;
        for (let i: number = 0; i < 4; i++) {
            if (this.subCriterion[i].equals(other.subCriterion[i]) === false) {
                /*
                 * if the piece represented by `other` is different from this piece
                 * on their ith criterion, then there is no common criterion (null)
                 */
                this.subCriterion[i] = MGPOptional.empty();
            }
            if (this.subCriterion[i].isAbsent()) {
                // if after this, the ith criterion is empty, then it lost a criterion
                nonNull--;
            }
        }
        return nonNull > 0;
    }

    public mergeWithQuartoPiece(piece: QuartoPiece): boolean {
        const criterion: QuartoCriterion = new QuartoCriterion(piece);
        return this.mergeWith(criterion);
    }

    public areAllAbsent(): boolean {
        for (let i: number = 0; i < 4; i++) {
            if (this.subCriterion[i].isPresent()) {
                return false;
            }
        }
        return true;
    }

    // returns true if there is at least one sub-criterion in common between the two
    private match(c: QuartoCriterion): boolean {
        for (let i: number = 0; i < 4; i++) {
            if (this.subCriterion[i].equals(c.subCriterion[i])) {
                return true;
            }
        }
        return false;
    }

    public matchPiece(piece: QuartoPiece): boolean {
        return this.match(new QuartoCriterion(piece));
    }

    public toString(): string {
        return 'Criterion{' +
            this.subCriterion.map((b: MGPOptional<boolean>) => {
                if (b.isPresent()) {
                    if (b.get()) {
                        return '1';
                    } else {
                        return '0';
                    }
                } else {
                    return 'x';
                }
            }).join(' ') + '}';
    }
}

export interface BoardStatus {

    status: AlignmentStatus;

    sensitiveSquares: CoordSet;

}

interface BoardStatusUpdate {

    boardStatus: BoardStatus;

    isUpdated: boolean;

}

export class QuartoNode extends GameNode<QuartoMove, QuartoState> {}

interface PatternInfos {

    commonCriterion: MGPOptional<QuartoCriterion>;

    sensitiveCoord: MGPOptional<Coord>;

    boardStatus: MGPOptional<BoardStatus>;
}

export abstract class VictoryPattern {

    public constructor(public readonly level: number,
                       public readonly coordPattern: CoordSet,
                       public readonly initialCoord: Coord,
    ) {}

    public getCoords(): Set<Coord> {
        return this.coordPattern.map((element: Coord) => element.getNext(this.initialCoord));
    }

    public abstract getAllPatterns(state: QuartoState): VictoryPattern[];
}

class VerticalVictoryPattern extends VictoryPattern {

    private static readonly VERTICAL: CoordSet = new CoordSet([
        new Coord(0, 0),
        new Coord(0, 1),
        new Coord(0, 2),
        new Coord(0, 3),
    ]);

    public constructor(initialCoord: Coord) {
        super(1,
              VerticalVictoryPattern.VERTICAL,
              initialCoord);
    }

    public override getAllPatterns(state: QuartoState): VerticalVictoryPattern[] {
        const maxY: number = state.getHeight() - 4;
        return state
            .getCoordsAndContents()
            .map((coordAndContent: { coord: Coord; content: QuartoPiece}) => coordAndContent.coord)
            .filter((coord: Coord) => coord.y <= maxY)
            .map((coord: Coord) => new VerticalVictoryPattern(coord));
    }

}

class HorizontalVictoryPattern extends VictoryPattern {

    private static readonly HORIZONTAL: CoordSet = new CoordSet([
        new Coord(0, 0),
        new Coord(1, 0),
        new Coord(2, 0),
        new Coord(3, 0),
    ]);

    public constructor(initialCoord: Coord) {
        super(1,
              HorizontalVictoryPattern.HORIZONTAL,
              initialCoord);
    }

    public override getAllPatterns(state: QuartoState): HorizontalVictoryPattern[] {
        const maxX: number = state.getWidth() - 4;
        return state
            .getCoordsAndContents()
            .map((coordAndContent: { coord: Coord; content: QuartoPiece}) => coordAndContent.coord)
            .filter((coord: Coord) => coord.x <= maxX)
            .map((coord: Coord) => new HorizontalVictoryPattern(coord));
    }

}

class DescendingDiagonalVictoryPattern extends VictoryPattern {

    private static readonly DESCENDING_DIAGONAL: CoordSet = new CoordSet([
        new Coord(0, 0),
        new Coord(1, 1),
        new Coord(2, 2),
        new Coord(3, 3),
    ]);

    public constructor(initialCoord: Coord) {
        super(1,
              DescendingDiagonalVictoryPattern.DESCENDING_DIAGONAL,
              initialCoord);
    }

    public override getAllPatterns(state: QuartoState): DescendingDiagonalVictoryPattern[] {
        const maxX: number = state.getWidth() - 4;
        const maxY: number = state.getHeight() - 4;
        return state
            .getCoordsAndContents()
            .map((coordAndContent: { coord: Coord; content: QuartoPiece}) => coordAndContent.coord)
            .filter((coord: Coord) => coord.x <= maxX && coord.y <= maxY)
            .map((coord: Coord) => new DescendingDiagonalVictoryPattern(coord));
    }

}

class AscendingDiagonalVictoryPattern extends VictoryPattern {

    private static readonly ASCENDING_DIAGONAL: CoordSet = new CoordSet([
        new Coord(0, 0),
        new Coord(1, -1),
        new Coord(2, -2),
        new Coord(3, -3),
    ]);

    public constructor(initialCoord: Coord) {
        super(1,
              AscendingDiagonalVictoryPattern.ASCENDING_DIAGONAL,
              initialCoord);
    }

    public override getAllPatterns(state: QuartoState): AscendingDiagonalVictoryPattern[] {
        const maxX: number = state.getWidth() - 4;
        const minY: number = 3;
        const maxY: number = state.getHeight() - 1;
        return state
            .getCoordsAndContents()
            .map((coordAndContent: { coord: Coord; content: QuartoPiece}) => coordAndContent.coord)
            .filter((coord: Coord) => coord.x <= maxX && minY <= coord.y && coord.y <= maxY)
            .map((coord: Coord) => new AscendingDiagonalVictoryPattern(coord));
    }

}

class SquareVictoryPattern extends VictoryPattern {

    private static readonly SQUARE: CoordSet = new CoordSet([
        new Coord(0, 0),
        new Coord(0, 1),
        new Coord(1, 0),
        new Coord(1, 1),
    ]);

    public constructor(initialCoord: Coord) {
        super(2,
              SquareVictoryPattern.SQUARE,
              initialCoord);
    }

    public override getAllPatterns(state: QuartoState): SquareVictoryPattern[] {
        const maxX: number = state.getWidth() - 2;
        const maxY: number = state.getHeight() - 2;
        return state
            .getCoordsAndContents()
            .map((coordAndContent: { coord: Coord; content: QuartoPiece}) => coordAndContent.coord)
            .filter((coord: Coord) => coord.x <= maxX &&coord.y <= maxY)
            .map((coord: Coord) => new SquareVictoryPattern(coord));
    }

}

export class QuartoRules extends ConfigurableRules<QuartoMove, QuartoState, QuartoConfig> {

    private static singleton: MGPOptional<QuartoRules> = MGPOptional.empty();

    private static readonly RULES_CONFIG_DESCRIPTION: RulesConfigDescription<QuartoConfig> =
        new RulesConfigDescription<QuartoConfig>({
            name: (): string => $localize`Quarto`,
            config: {
                playerZeroLevel: new NumberConfig(1, () => $localize`Player One Level`, MGPValidators.range(1, 2)),
                playerOneLevel: new NumberConfig(1, () => $localize`Player Two Level`, MGPValidators.range(1, 2)),
            },
        });

    public static get(): QuartoRules {
        if (QuartoRules.singleton.isAbsent()) {
            QuartoRules.singleton = MGPOptional.of(new QuartoRules());
        }
        return QuartoRules.singleton.get();
    }

    public override getRulesConfigDescription(): MGPOptional<RulesConfigDescription<QuartoConfig>> {
        return MGPOptional.of(QuartoRules.RULES_CONFIG_DESCRIPTION);
    }

    public override getInitialState(_: MGPOptional<QuartoConfig>): QuartoState {
        const board: QuartoPiece[][] = TableUtils.create(4, 4, QuartoPiece.EMPTY);
        return new QuartoState(board, 0, QuartoPiece.AAAA);
    }

    private isOccupied(square: QuartoPiece): boolean {
        return (square !== QuartoPiece.EMPTY);
    }

    public override isLegal(move: QuartoMove, state: QuartoState): MGPValidation {
        /**
         * pieceInHand is the one to be placed
         * move.piece is the one given to the next player
         */
        const x: number = move.coord.x;
        const y: number = move.coord.y;
        const pieceToGive: QuartoPiece = move.piece;
        const board: QuartoPiece[][] = state.getCopiedBoard();
        const pieceInHand: QuartoPiece = state.pieceInHand;
        if (this.isOccupied(board[y][x])) {
            // we can't play on an occupied square
            return MGPValidation.failure(RulesFailure.MUST_LAND_ON_EMPTY_SPACE());
        }
        if (pieceToGive === QuartoPiece.EMPTY) {
            if (state.turn === 15) {
                // we must give a piece, except on the last turn
                return MGPValidation.SUCCESS;
            }
            return MGPValidation.failure(QuartoFailure.MUST_GIVE_A_PIECE());
        }
        if (QuartoState.isAlreadyOnBoard(pieceToGive, board)) {
            // the piece is already on the board
            return MGPValidation.failure(QuartoFailure.PIECE_ALREADY_ON_BOARD());
        }
        if (pieceInHand === pieceToGive) {
            // the piece given is the one in our hands, which is illegal
            return MGPValidation.failure(QuartoFailure.CANNOT_GIVE_PIECE_IN_HAND());
        }
        return MGPValidation.SUCCESS;
    }

    public override applyLegalMove(move: QuartoMove,
                                   state: QuartoState,
                                   _config: MGPOptional<QuartoConfig>,
                                   _info: void)
    : QuartoState
    {
        const newBoard: QuartoPiece[][] = state.getCopiedBoard();
        newBoard[move.coord.y][move.coord.x] = state.pieceInHand;
        const resultingState: QuartoState = new QuartoState(newBoard, state.turn + 1, move.piece);
        return resultingState;
    }

    public updateBoardStatus(pattern: VictoryPattern, state: QuartoState, boardStatus: BoardStatus): BoardStatusUpdate {
        if (boardStatus.status === AlignmentStatus.PRE_VICTORY) {
            if (this.isPatternVictorious(pattern, state)) {
                return {
                    boardStatus: {
                        status: AlignmentStatus.VICTORY,
                        sensitiveSquares: new CoordSet(),
                    },
                    isUpdated: true,
                };
            } else {
                return { boardStatus, isUpdated: false };
            }
        } else {
            return this.searchForVictoryOrPreVictoryInPattern(pattern, state, boardStatus);
        }
    }

    private isPatternVictorious(pattern: VictoryPattern, state: QuartoState): boolean {
        /**
         * if we found a pre-victory,
         * the only thing that can change the result is a victory
         */
        const initialCoord: Coord = new Coord(pattern.initialCoord.x, pattern.initialCoord.y);
        let c: QuartoPiece = state.getPieceAt(initialCoord);
        const commonCrit: QuartoCriterion = new QuartoCriterion(c);
        for (const coord of pattern.getCoords()) {
            if (this.isOccupied(c) === false || commonCrit.areAllAbsent()) {
                break;
            }
            c = state.getPieceAt(coord);
            commonCrit.mergeWithQuartoPiece(c);
        }
        if (this.isOccupied(c) && commonCrit.areAllAbsent() === false) {
            /**
             * the last square was occupied, and there was some common criterion on all the four pieces
             * that's what victory is like in Quarto
             */
            return true;
        } else {
            return false;
        }
    }

    private searchForVictoryOrPreVictoryInPattern(pattern: VictoryPattern,
                                                  state: QuartoState,
                                                  boardStatus: BoardStatus)
    : BoardStatusUpdate
    {
        // we're looking for a victory, pre-victory
        const patternInfos: PatternInfos = this.getPatternInfos(pattern, state, boardStatus);
        if (patternInfos.boardStatus.isPresent()) {
            return { boardStatus: patternInfos.boardStatus.get(), isUpdated: false };
        }
        const commonCriterion: MGPOptional<QuartoCriterion> = patternInfos.commonCriterion;
        const sensitiveCoord: MGPOptional<Coord> = patternInfos.sensitiveCoord;
        let isUpdated: boolean = false;

        // we now have looked through the entire pattern, we summarize everything
        if (commonCriterion.isPresent() && (commonCriterion.get().areAllAbsent() === false)) {
            // this pattern is not null and has a common criterion between all of its pieces
            if (sensitiveCoord.isAbsent()) {
                // the pattern is full
                return {
                    boardStatus: {
                        status: AlignmentStatus.VICTORY,
                        sensitiveSquares: new CoordSet(),
                    },
                    isUpdated: true,
                };
            } else {
                // if there is only one empty square, then the sensitive square we found is indeed sensitive
                if (commonCriterion.get().matchPiece(state.pieceInHand)) {
                    isUpdated = true;
                    const coord: Coord = sensitiveCoord.get();
                    boardStatus.sensitiveSquares = boardStatus.sensitiveSquares.addElement(coord);
                    boardStatus.status = AlignmentStatus.PRE_VICTORY;
                }
            }
        }
        return { boardStatus, isUpdated };
    }

    private getPatternInfos(pattern: VictoryPattern, state: QuartoState, boardStatus: BoardStatus): PatternInfos {
        let sensitiveCoord: MGPOptional<Coord> = MGPOptional.empty(); // the first square is empty
        let commonCriterion: MGPOptional<QuartoCriterion> = MGPOptional.empty();

        const coords: Set<Coord> = pattern.getCoords();
        for (const coord of coords) {
            const c: QuartoPiece = state.getPieceAt(coord);
            // we look through the entire pattern
            if (c === QuartoPiece.EMPTY) {
                // if c is unoccupied
                if (sensitiveCoord.isAbsent()) {
                    sensitiveCoord = MGPOptional.of(coord);
                } else {
                    // 2 empty spaces: no victory or pre-victory, or new criterion
                    return {
                        sensitiveCoord: MGPOptional.of(coord),
                        commonCriterion,
                        boardStatus: MGPOptional.of(boardStatus),
                    };
                }
            } else {
                // if c is occupied
                if (commonCriterion.isAbsent()) {
                    commonCriterion = MGPOptional.of(new QuartoCriterion(c));
                    Debug.display('QuartoRules', 'getPatternInfos', 'set commonCrit to ' + commonCriterion.toString());
                } else {
                    commonCriterion.get().mergeWithQuartoPiece(c);
                    Debug.display('QuartoRules', 'getPatternInfos', 'update commonCrit: ' + commonCriterion.toString());
                }
            }
        }
        return { commonCriterion, sensitiveCoord, boardStatus: MGPOptional.empty() };
    }

    public override getGameStatus(node: QuartoNode, config: MGPOptional<QuartoConfig>): GameStatus {
        const state: QuartoState = node.gameState;
        let boardStatus: BoardStatus = {
            status: AlignmentStatus.NOTHING,
            sensitiveSquares: new CoordSet(),
        };
        const maxLevel: number = Math.max(config.get().playerZeroLevel, config.get().playerOneLevel);
        const patterns: VictoryPattern[] = this.getPatterns(maxLevel, state);
        // at turn N, the previous opponent is the current player at turn N+1
        const opponent: Player = state.getCurrentPlayer();
        const player: Player = opponent.getOpponent();
        let playerMadeAVictory: boolean = false;
        for (const pattern of patterns) {
            const boardStatusUpdate: BoardStatusUpdate = this.updateBoardStatus(pattern, state, boardStatus);
            boardStatus = boardStatusUpdate.boardStatus;
            if (boardStatusUpdate.isUpdated && boardStatus.status === AlignmentStatus.VICTORY) {
                if (this.isOnlyPlayerVictory(pattern, config.get(), opponent)) {
                    return GameStatus.getVictory(opponent);
                } else if (this.isPlayerVictory(pattern, config.get(), player)) {
                    playerMadeAVictory = true;
                }
            }
        }
        if (playerMadeAVictory) {
            return GameStatus.getVictory(player);
        }
        if (state.turn === 16) {
            return GameStatus.DRAW;
        } else {
            return GameStatus.ONGOING;
        }
    }

    private isPlayerVictory(pattern: VictoryPattern, config: QuartoConfig, player: Player): boolean {
        if (player === Player.ZERO) {
            return pattern.level <= config.playerZeroLevel;
        } else {
            return pattern.level <= config.playerOneLevel;
        }
    }

    private isOnlyPlayerVictory(pattern: VictoryPattern, config: QuartoConfig, player: Player): boolean {
        return this.isPlayerVictory(pattern, config, player) &&
               this.isPlayerVictory(pattern, config, player.getOpponent()) === false;
    }

    public getPatterns(level: number, state: QuartoState): VictoryPattern[] {
        const verticalInitialPattern: VerticalVictoryPattern =
            new VerticalVictoryPattern(new Coord(0, 0));
        const horizontalInitialPattern: HorizontalVictoryPattern =
            new HorizontalVictoryPattern(new Coord(0, 0));
        const descendingDiagonalPattern: DescendingDiagonalVictoryPattern =
            new DescendingDiagonalVictoryPattern(new Coord(0, 0));
        const ascendingDiagonalPattern: AscendingDiagonalVictoryPattern =
            new AscendingDiagonalVictoryPattern(new Coord(0, 3));
        const initialPatterns: VictoryPattern[] = [
            verticalInitialPattern,
            horizontalInitialPattern,
            descendingDiagonalPattern,
            ascendingDiagonalPattern,
        ];
        if (level >= 2) {
            const squareInitialPattern: SquareVictoryPattern = new SquareVictoryPattern(new Coord(0, 0));
            initialPatterns.push(squareInitialPattern);
        }
        return initialPatterns.flatMap((pattern: VictoryPattern) => pattern.getAllPatterns(state));
    }

    public getVictoriousCoords(state: QuartoState, config: QuartoConfig): Set<Coord> {
        const maxPatternLevel: number = Math.max(config.playerZeroLevel, config.playerOneLevel);
        const patterns: VictoryPattern[] = this.getPatterns(maxPatternLevel, state);
        for (const pattern of patterns) {
            if (this.isPatternVictorious(pattern, state)) {
                return pattern.getCoords();
            }
        }
        return new Set();
    }

}
