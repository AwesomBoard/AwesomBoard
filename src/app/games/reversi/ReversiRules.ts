import { MGPFallible, MGPOptional, Utils } from '@everyboard/lib';
import { GameNode } from 'src/app/jscaip/AI/GameNode';
import { ConfigurableRules } from '../../jscaip/Rules';
import { ReversiState } from './ReversiState';
import { Coord } from '../../jscaip/Coord';
import { Ordinal } from 'src/app/jscaip/Ordinal';
import { ReversiMove } from './ReversiMove';
import { Player, PlayerOrNone } from 'src/app/jscaip/Player';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { ReversiFailure } from './ReversiFailure';
import { GameStatus } from 'src/app/jscaip/GameStatus';
import { TableUtils } from 'src/app/jscaip/TableUtils';
import { Debug } from 'src/app/utils/Debug';
import { PlayerNumberMap } from 'src/app/jscaip/PlayerMap';
import { NumberConfig, RulesConfigDescription, RulesConfigDescriptionLocalizable } from 'src/app/components/wrapper-components/rules-configuration/RulesConfigDescription';
import { MGPValidators } from 'src/app/utils/MGPValidator';

export type ReversiLegalityInformation = Coord[];

export class ReversiMoveWithSwitched {

    public constructor(public readonly move: ReversiMove,
                       public readonly switched: number) {
    }
}

export class ReversiNode extends GameNode<ReversiMove, ReversiState> {}

export type ReversiConfig = {
    width: number,
    height: number,
};

@Debug.log
export class ReversiRules extends ConfigurableRules<ReversiMove,
                                                    ReversiState,
                                                    ReversiConfig,
                                                    ReversiLegalityInformation>
{

    private static singleton: MGPOptional<ReversiRules> = MGPOptional.empty();

    public static get(): ReversiRules {
        if (ReversiRules.singleton.isAbsent()) {
            ReversiRules.singleton = MGPOptional.of(new ReversiRules());
        }
        return ReversiRules.singleton.get();
    }

    public static readonly RULES_CONFIG_DESCRIPTION: RulesConfigDescription<ReversiConfig> =
        new RulesConfigDescription<ReversiConfig>({
            name: (): string => $localize`Reversi`,
            config: {
                width: new NumberConfig(8, RulesConfigDescriptionLocalizable.WIDTH, MGPValidators.range(3, 99)),
                height: new NumberConfig(8, RulesConfigDescriptionLocalizable.HEIGHT, MGPValidators.range(3, 99)),
            },
        });

    public override getRulesConfigDescription(): MGPOptional<RulesConfigDescription<ReversiConfig>> {
        return MGPOptional.of(ReversiRules.RULES_CONFIG_DESCRIPTION);
    }

    public override getInitialState(optionalConfig: MGPOptional<ReversiConfig>): ReversiState {
        const config: ReversiConfig = optionalConfig.get();
        const board: PlayerOrNone[][] = TableUtils.create(config.width, config.height, PlayerOrNone.NONE);
        const downRightCenter: Coord = new Coord(Math.floor(config.width / 2), Math.floor(config.height / 2));
        board[downRightCenter.y - 1][downRightCenter.x - 1] = Player.ZERO;
        board[downRightCenter.y][downRightCenter.x] = Player.ZERO;
        board[downRightCenter.y - 1][downRightCenter.x] = Player.ONE;
        board[downRightCenter.y][downRightCenter.x - 1] = Player.ONE;
        return new ReversiState(board, 0);
    }

    public override applyLegalMove(move: ReversiMove,
                                   state: ReversiState,
                                   _config: MGPOptional<ReversiConfig>,
                                   info: ReversiLegalityInformation)
    : ReversiState
    {
        const turn: number = state.turn;
        const player: Player = state.getCurrentPlayer();
        const board: PlayerOrNone[][] = state.getCopiedBoard();
        if (move.equals(ReversiMove.PASS)) { // if the player pass
            const sameBoardDifferentTurn: ReversiState =
                new ReversiState(board, turn + 1);
            return sameBoardDifferentTurn;
        }
        for (const s of info) {
            board[s.y][s.x] = player;
        }
        board[move.coord.y][move.coord.x] = player;
        const resultingState: ReversiState = new ReversiState(board, turn + 1);
        return resultingState;
    }

    public getAllSwitcheds(move: ReversiMove, player: Player, state: ReversiState): Coord[] {
        // try the move, do it if legal, and return the switched pieces
        const switcheds: Coord[] = [];
        const opponent: Player = player.getOpponent();

        for (const direction of Ordinal.ORDINALS) {
            const firstSpace: Coord = move.coord.getNext(direction);
            if (state.hasPieceAt(firstSpace, opponent)) {
                // let's test this direction
                const switchedInDir: Coord[] = this.getSandwicheds(player, direction, firstSpace, state);
                for (const switched of switchedInDir) {
                    switcheds.push(switched);
                }
            }
        }
        return switcheds;
    }

    public getSandwicheds(capturer: Player,
                          direction: Ordinal,
                          start: Coord,
                          state: ReversiState)
    : Coord[]
    {
        /* expected that 'start' is in range, and is captured
         * if we don't reach another capturer, returns []
         * else : return all the coord between start and the first 'capturer' found (exluded)
         */

        const sandwichedsCoord: Coord[] = [start]; // here we know it in range and captured
        let testedCoord: Coord = start.getNext(direction);
        while (state.isOnBoard(testedCoord)) {
            const testedCoordContent: PlayerOrNone = state.getPieceAt(testedCoord);
            if (testedCoordContent === capturer) {
                // we found a sandwicher, in range, in this direction
                return sandwichedsCoord;
            }
            if (testedCoordContent.isNone()) {
                // we found the emptyness before a capturer, so there won't be a next space
                return [];
            } // we found a switched/captured
            sandwichedsCoord.push(testedCoord); // we add it
            testedCoord = testedCoord.getNext(direction); // next loop will observe the next
        }
        return []; // we found the end of the board before we found the new piece like 'searchedPawn'
    }

    public isGameEnded(state: ReversiState, config: MGPOptional<ReversiConfig>): boolean {
        return this.playerCanOnlyPass(state, config) &&
               this.nextPlayerCantOnlyPass(state, config);
    }

    public override getGameStatus(node: ReversiNode, config: MGPOptional<ReversiConfig>): GameStatus {
        const state: ReversiState = node.gameState;
        const gameIsEnded: boolean = this.isGameEnded(state, config);
        if (gameIsEnded === false) {
            return GameStatus.ONGOING;
        }
        const scores: PlayerNumberMap = state.countScore();
        const diff: number = scores.get(Player.ONE) - scores.get(Player.ZERO);
        if (diff < 0) {
            return GameStatus.ZERO_WON;
        }
        if (diff > 0) {
            return GameStatus.ONE_WON;
        }
        return GameStatus.DRAW;
    }

    public playerCanOnlyPass(state: ReversiState, config: MGPOptional<ReversiConfig>): boolean {
        const currentPlayerChoices: ReversiMoveWithSwitched[] = this.getListMoves(state, config);
        // if the current player cannot start, then the part is ended
        return (currentPlayerChoices.length === 1) &&
                currentPlayerChoices[0].move.equals(ReversiMove.PASS);
    }

    public nextPlayerCantOnlyPass(reversiState: ReversiState, config: MGPOptional<ReversiConfig>): boolean {
        const nextBoard: PlayerOrNone[][] = reversiState.getCopiedBoard();
        const nextTurn: number = reversiState.turn + 1;
        const nextState: ReversiState = new ReversiState(nextBoard, nextTurn);
        return this.playerCanOnlyPass(nextState, config);
    }

    public getListMoves(state: ReversiState, _config: MGPOptional<ReversiConfig>): ReversiMoveWithSwitched[] {
        const moves: ReversiMoveWithSwitched[] = [];

        let nextBoard: PlayerOrNone[][];

        const player: Player = state.getCurrentPlayer();
        const opponent: Player = state.getCurrentOpponent();
        for (const coordAndContent of state.getCoordsAndContents()) {
            const coord: Coord = coordAndContent.coord;
            if (state.getPieceAt(coord).isNone()) {
                // For each empty spaces
                nextBoard = state.getCopiedBoard();
                const opponentNeighbors: Coord[] = state.getNeighboringPawnLike(opponent, coord);
                if (opponentNeighbors.length > 0) {
                    // if one of the 8 neighboring space is an opponent then, there could be a switch,
                    // and hence a legal move
                    const move: ReversiMove = new ReversiMove(coord.x, coord.y);
                    const result: Coord[] = this.getAllSwitcheds(move, player, state);
                    if (result.length > 0) {
                        // there was switched piece and hence, a legal move
                        for (const switched of result) {
                            Utils.assert(player !== state.getPieceAt(switched), switched + 'was already switched!');
                            nextBoard[switched.y][switched.x] = player;
                        }
                        nextBoard[coord.y][coord.x] = player;
                        moves.push(new ReversiMoveWithSwitched(move, result.length));
                    }
                }
            }
        }
        if (moves.length === 0) {
            // When the user cannot start, his only move is to pass, which he cannot do otherwise
            // board unchanged, only the turn changed "pass"
            moves.push(new ReversiMoveWithSwitched(ReversiMove.PASS, 0));
        }
        return moves;
    }

    public override isLegal(move: ReversiMove, state: ReversiState, config: MGPOptional<ReversiConfig>)
    : MGPFallible<ReversiLegalityInformation>
    {
        if (move.equals(ReversiMove.PASS)) { // if the player passes
            // let's check that pass is a legal move right now
            // if there was no choice but to pass, then passing is legal!
            // else, passing was illegal
            if (this.playerCanOnlyPass(state, config)) {
                return MGPFallible.success([]);
            } else {
                return MGPFallible.failure(RulesFailure.CANNOT_PASS());
            }
        }
        if (state.getPieceAt(move.coord).isPlayer()) {
            return MGPFallible.failure(RulesFailure.MUST_CLICK_ON_EMPTY_SPACE());
        }
        const switched: Coord[] = this.getAllSwitcheds(move, state.getCurrentPlayer(), state);
        if (switched.length === 0) {
            return MGPFallible.failure(ReversiFailure.NO_ELEMENT_SWITCHED());
        } else {
            return MGPFallible.success(switched);
        }
    }

}
