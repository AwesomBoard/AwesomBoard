import { Coord } from 'src/app/jscaip/Coord';
import { Ordinal } from 'src/app/jscaip/Ordinal';
import { KamisadoBoard } from './KamisadoBoard';
import { KamisadoColor } from './KamisadoColor';
import { KamisadoMove } from './KamisadoMove';
import { KamisadoState } from './KamisadoState';
import { KamisadoPiece } from './KamisadoPiece';
import { Player } from 'src/app/jscaip/Player';
import { Rules } from 'src/app/jscaip/Rules';
import { KamisadoFailure } from './KamisadoFailure';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { MGPFallible, MGPOptional, MGPValidation, Utils } from '@everyboard/lib';
import { GameStatus } from 'src/app/jscaip/GameStatus';
import { GameNode } from 'src/app/jscaip/AI/GameNode';
import { NoConfig } from 'src/app/jscaip/RulesConfigUtil';
import { PlayerNumberMap } from 'src/app/jscaip/PlayerMap';

export class KamisadoNode extends GameNode<KamisadoMove, KamisadoState> {}

export class KamisadoRules extends Rules<KamisadoMove, KamisadoState> {

    private static singleton: MGPOptional<KamisadoRules> = MGPOptional.empty();

    public static get(): KamisadoRules {
        if (KamisadoRules.singleton.isAbsent()) {
            KamisadoRules.singleton = MGPOptional.of(new KamisadoRules());
        }
        return KamisadoRules.singleton.get();
    }

    public override getInitialState(): KamisadoState {
        return new KamisadoState(0,
                                 KamisadoColor.ANY,
                                 MGPOptional.empty(),
                                 false,
                                 KamisadoBoard.INITIAL);
    }

    public static getColorMatchingPiece(state: KamisadoState): Array<Coord> {
        if (state.coordToPlay.isPresent()) {
            // Only one piece can move, and its coord is stored in state.coordToPlay
            return [state.coordToPlay.get()];
        }
        // Otherwise, this is the first turn and all pieces can move
        // Player 0 starts the game, so we don't have to compute the list of movable pieces
        return [
            new Coord(0, 7),
            new Coord(1, 7),
            new Coord(2, 7),
            new Coord(3, 7),
            new Coord(4, 7),
            new Coord(5, 7),
            new Coord(6, 7),
            new Coord(7, 7),
        ];
    }

    public static getMovablePieces(state: KamisadoState): Array<Coord> {
        return KamisadoRules.getColorMatchingPiece(state)
            .filter((startCoord: Coord): boolean => {
                // For each direction, create a move of 1 in that direction
                for (const dir of this.playerDirections(state.getCurrentPlayer())) {
                    const endCoord: Coord = startCoord.getNext(dir);
                    if (state.isEmptyAt(endCoord)) {
                        // Move is legal
                        return true;
                    }
                }
                return false;
            });
    }

    // Returns the directions allowed for the move of a player
    public static playerDirections(player: Player): Array<Ordinal> {
        if (player === Player.ONE) {
            return [Ordinal.DOWN, Ordinal.DOWN_LEFT, Ordinal.DOWN_RIGHT];
        } else {
            return [Ordinal.UP, Ordinal.UP_LEFT, Ordinal.UP_RIGHT];
        }
    }

    // Check if a direction is allowed for a given player
    public static directionAllowedForPlayer(dir: Ordinal, player: Player): boolean {
        if (player === Player.ZERO) {
            return dir.y < 0;
        } else {
            return dir.y > 0;
        }
    }

    // Check if the only possible move is to pass
    public static mustPass(state: KamisadoState): boolean {
        return this.getMovablePieces(state).length === 0;
    }

    public static getFurthestPiecePositions(state: KamisadoState): PlayerNumberMap {
        let furthest0: number = 7; // player 0 goes from bottom (7) to top (0)
        let furthest1: number = 0; // player 1 goes from top (0) to bottom (7)

        state.allPieceCoords().forEach((c: Coord) => {
            const piece: KamisadoPiece = state.getPieceAt(c);
            Utils.assert(piece !== KamisadoPiece.EMPTY, 'allPieceCoords failed to filter KamisadoPiece.EMPTY');
            if (piece.player === Player.ONE) { // player 1, top (0) to bottom (7) so we want the max
                furthest1 = Math.max(furthest1, c.y);
            } else { // player 0, bottom (7) to top (0), so we want the min
                furthest0 = Math.min(furthest0, c.y);
            }
        });
        return PlayerNumberMap.of(furthest0, furthest1);
    }

    public static isLegal(move: KamisadoMove, state: KamisadoState): MGPValidation {
        if (KamisadoMove.isPiece(move)) {
            const start: Coord = move.getStart();
            const end: Coord = move.getEnd();
            const colorToPlay: KamisadoColor = state.colorToPlay;

            // A move is legal if:
            //    - the move is within the board (this has been checked when constructing the move)
            //    - start piece should be owned by the current player
            const piece: KamisadoPiece = state.getPieceAt(start);
            if (piece.isEmpty()) {
                return MGPValidation.failure(RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_EMPTY());
            }
            if (piece.belongsTo(state.getCurrentOpponent())) {
                return MGPValidation.failure(RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_OPPONENT());
            }
            //    - start space should contain a piece of the right color (or any color can be played)
            if (colorToPlay !== KamisadoColor.ANY && piece.color !== colorToPlay) {
                return MGPValidation.failure(KamisadoFailure.NOT_RIGHT_COLOR());
            }
            //    - end space should be empty
            const endPiece: KamisadoPiece = state.getPieceAt(end);
            if (endPiece.isEmpty() === false) {
                return MGPValidation.failure(RulesFailure.MUST_CLICK_ON_EMPTY_SPACE());
            }
            //    - move direction is linear
            const directionOptional: MGPFallible<Ordinal> = Ordinal.factory.fromMove(start, end);
            if (directionOptional.isFailure()) {
                return MGPValidation.failure(KamisadoFailure.DIRECTION_NOT_ALLOWED());
            }
            //    - move direction is toward the opponent's line
            const dir: Ordinal = directionOptional.get();
            if (KamisadoRules.directionAllowedForPlayer(dir, state.getCurrentPlayer()) === false) {
                return MGPValidation.failure(KamisadoFailure.DIRECTION_NOT_ALLOWED());
            }
            //    - there is no piece between starting and landing coord
            let currentCoord: Coord = start;
            while (currentCoord.equals(end) === false) {
                currentCoord = currentCoord.getNext(dir);
                if (state.getPieceAt(currentCoord).isEmpty() === false) {
                    return MGPValidation.failure(KamisadoFailure.MOVE_BLOCKED());
                }
            }
            return MGPValidation.SUCCESS;
        } else {
            return this.isLegalPass(state);
        }
    }

    private static isLegalPass(state: KamisadoState): MGPValidation {
        if (this.mustPass(state) && state.alreadyPassed === false) {
            return MGPValidation.SUCCESS;
        } else {
            return MGPValidation.failure(RulesFailure.CANNOT_PASS());
        }
    }

    // Returns the next coord that plays
    public nextCoordToPlay(state: KamisadoState, colorToPlay: KamisadoColor): MGPOptional<Coord> {
        return MGPOptional.ofNullable(state.allPieceCoords().find((c: Coord): boolean => {
            const piece: KamisadoPiece = state.getPieceAt(c);
            return piece.player === state.getCurrentOpponent() && piece.color === colorToPlay;
        }));
    }

    // Apply the move by only relying on tryMove
    public override applyLegalMove(move: KamisadoMove, state: KamisadoState, _config: NoConfig, _info: void)
    : KamisadoState
    {
        if (KamisadoMove.isPiece(move)) {
            const start: Coord = move.getStart();
            const end: Coord = move.getEnd();

            const newBoard: KamisadoPiece[][] = state.getCopiedBoard();
            newBoard[end.y][end.x] = newBoard[start.y][start.x]; // actual move
            newBoard[start.y][start.x] = KamisadoPiece.EMPTY; // becomes unoccupied
            const newColorToPlay: KamisadoColor = KamisadoBoard.getColorAt(end.x, end.y);

            // Get the next piece that can move
            const nextCoord: MGPOptional<Coord> = this.nextCoordToPlay(state, newColorToPlay);

            // Construct the next state
            const resultingState: KamisadoState =
                new KamisadoState(state.turn + 1, newColorToPlay, nextCoord, false, newBoard);

            return resultingState;
        } else {
            const nextCoord: MGPOptional<Coord> = this.nextCoordToPlay(state, state.colorToPlay);
            const resultingState: KamisadoState =
                new KamisadoState(state.turn + 1, state.colorToPlay, nextCoord, true, state.board);
            return resultingState;
        }
    }

    public override isLegal(move: KamisadoMove, state: KamisadoState): MGPValidation {
        return KamisadoRules.isLegal(move, state);
    }

    public override getGameStatus(node: KamisadoNode): GameStatus {
        const state: KamisadoState = node.gameState;
        const player: Player = state.getCurrentPlayer();
        if (KamisadoRules.mustPass(state) && state.alreadyPassed) {
            return GameStatus.getDefeat(player);
        }

        const furthest: PlayerNumberMap = KamisadoRules.getFurthestPiecePositions(state);
        // Board value is how far my piece is - how far my opponent piece is, except in case of victory
        if (furthest.get(Player.ONE) === 7) {
            return GameStatus.ONE_WON;
        } else if (furthest.get(Player.ZERO) === 0) {
            return GameStatus.ZERO_WON;
        } else {
            return GameStatus.ONGOING;
        }
    }

}
