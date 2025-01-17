import { MGPFallible } from '@everyboard/lib';
import { GoState } from './GoState';
import { GoPiece } from './GoPiece';
import { GoMove } from './GoMove';
import { GoLegalityInformation, GoNode, AbstractGoRules } from './AbstractGoRules';
import { GoGroupData } from './GoGroupsData';
import { Coord } from 'src/app/jscaip/Coord';
import { MoveGenerator } from 'src/app/jscaip/AI/AI';
import { Debug } from 'src/app/utils/Debug';
import { RulesConfig } from 'src/app/jscaip/RulesConfigUtil';

@Debug.log
export class AbstractGoMoveGenerator<C extends RulesConfig> extends MoveGenerator<GoMove, GoState, C> {

    public constructor(private readonly rules: AbstractGoRules<C>) {
        super();
    }

    public override getListMoves(node: GoNode): GoMove[] {
        const currentState: GoState = node.gameState;
        const playingMoves: GoMove[] = this.getPlayingMovesList(currentState);
        if (currentState.phase.isPlaying() || currentState.phase.isPassed()) {
            playingMoves.push(GoMove.PASS);
            return playingMoves;
        } else {
            const markingMoves: GoMove[] = this.getCountingMovesList(currentState);
            if (markingMoves.length === 0) {
                return [GoMove.ACCEPT];
            } else {
                return markingMoves;
            }
        }
    }

    public getPlayingMovesList(state: GoState): GoMove[] {
        const choices: GoMove[] = [];
        for (const coordAndContent of state.getCoordsAndContents()) {
            const coord: Coord = coordAndContent.coord;
            const content: GoPiece = coordAndContent.content;
            const newMove: GoMove = new GoMove(coord.x, coord.y);
            if (content === GoPiece.EMPTY) {
                const legality: MGPFallible<GoLegalityInformation> = this.rules.isLegal(newMove, state);
                if (legality.isSuccess()) {
                    choices.push(newMove);
                }
            }
        }
        return choices;
    }

    public getCountingMovesList(currentState: GoState): GoMove[] {
        const choices: GoMove[] = [];

        // 1. put all to dead
        // 2. find all mono-wrapped empty group
        // 3. set alive their unique wrapper
        // 4. list the remaining "entry points" of dead group
        // 5. remove the entry points which on the true actual board are link to an already dead group
        // 6. return that list of alive group that AI consider dead

        const correctBoard: GoPiece[][] = this.getCorrectBoard(currentState).getCopiedBoard();

        const groupsData: GoGroupData[] =
            this.rules.getGroupsDataWhere(
                correctBoard,
                (piece: GoPiece) => piece !== GoPiece.EMPTY && piece !== GoPiece.UNREACHABLE);

        for (const group of groupsData) {
            const coord: Coord = group.getCoords()[0];
            const correctContent: GoPiece = correctBoard[coord.y][coord.x];
            const actualContent: GoPiece = currentState.getPieceAt(coord);
            if (actualContent !== correctContent) {
                const move: GoMove = new GoMove(coord.x, coord.y);
                choices.push(move);
                return choices;
            }
        }
        return choices;
    }

    public getCorrectBoard(currentState: GoState): GoState {
        const markAsDead: (piece: GoPiece) => GoPiece = (piece: GoPiece) => {
            if (piece === GoPiece.DARK) return GoPiece.DEAD_DARK;
            if (piece === GoPiece.LIGHT) return GoPiece.DEAD_LIGHT;
            if (piece.isTerritory()) {
                return GoPiece.EMPTY;
            } else {
                return piece;
            }
        };
        const allDeadBoard: GoPiece[][] = this.mapBoard(currentState.getCopiedBoard(), markAsDead);
        const allDeadState: GoState = new GoState(allDeadBoard,
                                                  currentState.getCapturedCopy(),
                                                  currentState.turn,
                                                  currentState.koCoord,
                                                  currentState.phase);
        const territoryLikeGroups: GoGroupData[] = this.rules.getTerritoryLikeGroup(allDeadState);

        return this.setAliveUniqueWrapper(allDeadState, territoryLikeGroups);
    }

    public mapBoard(board: GoPiece[][], mapper: (piece: GoPiece) => GoPiece): GoPiece[][] {
        const newBoard: GoPiece[][] = [];
        for (let y: number = 0; y < board.length; y++) {
            newBoard[y] = [];
            for (let x: number = 0; x < board[0].length; x++) {
                newBoard[y][x] = mapper(board[y][x]);
            }
        }
        return newBoard;
    }

    public setAliveUniqueWrapper(allDeadState: GoState,
                                 monoWrappedEmptyGroups: GoGroupData[])
    : GoState
    {
        let resultingState: GoState = allDeadState.copy();
        let aliveCoords: Coord[];
        for (const monoWrappedEmptyGroup of monoWrappedEmptyGroups) {
            aliveCoords = monoWrappedEmptyGroup.deadDarkCoords.concat(monoWrappedEmptyGroup.deadLightCoords);
            for (const aliveCoord of aliveCoords) {
                if (resultingState.isDead(aliveCoord)) {
                    resultingState = this.rules.switchAliveness(aliveCoord, resultingState);
                }
            }
        }
        return resultingState;
    }

}
