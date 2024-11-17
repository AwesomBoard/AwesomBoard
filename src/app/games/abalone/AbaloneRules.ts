import { Coord } from 'src/app/jscaip/Coord';
import { Ordinal } from 'src/app/jscaip/Ordinal';
import { FourStatePiece } from 'src/app/jscaip/FourStatePiece';
import { GameNode } from 'src/app/jscaip/AI/GameNode';
import { ConfigurableRules } from 'src/app/jscaip/Rules';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { MGPFallible, MGPOptional, MGPValidation } from '@everyboard/lib';
import { AbaloneFailure } from './AbaloneFailure';
import { AbaloneState } from './AbaloneState';
import { AbaloneMove } from './AbaloneMove';
import { Table } from 'src/app/jscaip/TableUtils';
import { GameStatus } from 'src/app/jscaip/GameStatus';
import { PlayerNumberMap } from 'src/app/jscaip/PlayerMap';
import { Player } from 'src/app/jscaip/Player';
import { NumberConfig, RulesConfigDescription } from 'src/app/components/wrapper-components/rules-configuration/RulesConfigDescription';
import { MGPValidators } from 'src/app/utils/MGPValidator';

export type AbaloneConfig = {

    nbToCapture: number;

    maximumPushingGroupSize: number;
}

export type AbaloneLegalityInformation = Table<FourStatePiece>;

export class AbaloneNode extends GameNode<AbaloneMove, AbaloneState> {}

export class AbaloneRules extends ConfigurableRules<AbaloneMove,
                                                    AbaloneState,
                                                    AbaloneConfig,
                                                    AbaloneLegalityInformation>
{

    private static singleton: MGPOptional<AbaloneRules> = MGPOptional.empty();

    public static readonly RULES_CONFIG_DESCRIPTION: RulesConfigDescription<AbaloneConfig> =
        new RulesConfigDescription<AbaloneConfig>({
            name: (): string => $localize`Abalone`,
            config: {
                nbToCapture: new NumberConfig(6, () => $localize`Number of pieces to capture in order to win`, MGPValidators.range(1, 14)),
                maximumPushingGroupSize: new NumberConfig(3, () => $localize`Maximum pushing group size`, MGPValidators.range(1, 9)),
            },
        });

    public static get(): AbaloneRules {
        if (AbaloneRules.singleton.isAbsent()) {
            AbaloneRules.singleton = MGPOptional.of(new AbaloneRules());
        }
        return AbaloneRules.singleton.get();
    }

    public override getRulesConfigDescription(): MGPOptional<RulesConfigDescription<AbaloneConfig>> {
        return MGPOptional.of(AbaloneRules.RULES_CONFIG_DESCRIPTION);
    }

    public override getInitialState(): AbaloneState {
        const _: FourStatePiece = FourStatePiece.EMPTY;
        const N: FourStatePiece = FourStatePiece.UNREACHABLE;
        const O: FourStatePiece = FourStatePiece.ZERO;
        const X: FourStatePiece = FourStatePiece.ONE;
        const board: Table<FourStatePiece> = [
            [N, N, N, N, X, X, X, X, X],
            [N, N, N, X, X, X, X, X, X],
            [N, N, _, _, X, X, X, _, _],
            [N, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, _],
            [_, _, _, _, _, _, _, _, N],
            [_, _, O, O, O, _, _, N, N],
            [O, O, O, O, O, O, N, N, N],
            [O, O, O, O, O, N, N, N, N],
        ];
        return new AbaloneState(board, 0);
    }

    private static isLegalRealPush(firstOpponent: Coord,
                                   move: AbaloneMove,
                                   state: AbaloneState,
                                   pushingPieces: number,
                                   newBoard: FourStatePiece[][])
    : MGPFallible<AbaloneLegalityInformation>
    {
        let opponentPieces: number = 0;
        const opponent: FourStatePiece = FourStatePiece.ofPlayer(state.getCurrentOpponent());
        const player: FourStatePiece = FourStatePiece.ofPlayer(state.getCurrentPlayer());
        while (opponentPieces < pushingPieces &&
               state.isOnBoard(firstOpponent) &&
               state.getPieceAt(firstOpponent) === opponent) {
            opponentPieces++;
            firstOpponent = firstOpponent.getNext(move.dir);
        }
        if (pushingPieces <= opponentPieces) {
            return MGPFallible.failure(AbaloneFailure.NOT_ENOUGH_PIECE_TO_PUSH());
        } else if (AbaloneState.isOnBoard(firstOpponent)) {
            if (state.getPieceAt(firstOpponent) === FourStatePiece.EMPTY) {
                newBoard[firstOpponent.y][firstOpponent.x] = opponent;
            }
            if (state.getPieceAt(firstOpponent) === player) {
                return MGPFallible.failure(AbaloneFailure.CANNOT_PUSH_YOUR_OWN_PIECES());
            }
        }
        return MGPFallible.success(newBoard);
    }

    public override applyLegalMove(_move: AbaloneMove,
                                   state: AbaloneState,
                                   _config: MGPOptional<AbaloneConfig>,
                                   newBoard: AbaloneLegalityInformation)
    : AbaloneState
    {
        return new AbaloneState(newBoard, state.turn + 1);
    }

    public override isLegal(move: AbaloneMove, state: AbaloneState, config: MGPOptional<AbaloneConfig>)
    : MGPFallible<AbaloneLegalityInformation>
    {
        const firstPieceValidity: MGPValidation = this.getFirstPieceValidity(move, state);
        if (firstPieceValidity.isFailure()) {
            return firstPieceValidity.toOtherFallible();
        }
        if (move.isSingleCoord()) {
            return this.isLegalPush(move, state, config.get());
        } else {
            return this.isLegalSideStep(move, state);
        }
    }

    private getFirstPieceValidity(move: AbaloneMove, state: AbaloneState): MGPValidation {
        const firstPiece: FourStatePiece = state.getPieceAt(move.coord);
        if (state.isPiece(move.coord) === false) {
            return MGPValidation.failure(RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_EMPTY());
        } else if (firstPiece === FourStatePiece.ofPlayer(state.getCurrentOpponent())) {
            return MGPValidation.failure(RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_OPPONENT());
        } else {
            return MGPValidation.SUCCESS;
        }
    }

    private isLegalPush(move: AbaloneMove, state: AbaloneState, config: AbaloneConfig)
    : MGPFallible<AbaloneLegalityInformation>
    {
        let pieces: number = 1;
        let tested: Coord = move.coord.getNext(move.dir);
        const player: FourStatePiece = FourStatePiece.ofPlayer(state.getCurrentPlayer());
        const empty: FourStatePiece = FourStatePiece.EMPTY;
        const newBoard: FourStatePiece[][] = state.getCopiedBoard();
        newBoard[move.coord.y][move.coord.x] = empty;
        while (pieces <= config.maximumPushingGroupSize &&
               state.isOnBoard(tested) &&
               state.getPieceAt(tested) === player)
        {
            pieces++;
            tested = tested.getNext(move.dir);
        }
        if (pieces > config.maximumPushingGroupSize) {
            return MGPFallible.failure(AbaloneFailure.CANNOT_MOVE_MORE_THAN_N_PIECES(config.maximumPushingGroupSize));
        } else if (AbaloneState.isOnBoard(tested) === false) {
            return MGPFallible.success(newBoard);
        }
        newBoard[tested.y][tested.x] = player;
        if (state.getPieceAt(tested) === empty) {
            return MGPFallible.success(newBoard);
        }
        return AbaloneRules.isLegalRealPush(tested, move, state, pieces, newBoard);
    }

    private isLegalSideStep(move: AbaloneMove, state: AbaloneState): MGPFallible<AbaloneLegalityInformation> {
        let last: Coord = move.lastPiece.get();
        const alignment: Ordinal = move.coord.getDirectionToward(last).get();
        last = last.getNext(alignment); // to include lastPiece as well
        let tested: Coord = move.coord;
        const player: FourStatePiece = FourStatePiece.ofPlayer(state.getCurrentPlayer());
        const newBoard: FourStatePiece[][] = state.getCopiedBoard();
        while (tested.equals(last) === false && AbaloneState.isOnBoard(tested)) {
            if (state.getPieceAt(tested) !== player) {
                return MGPFallible.failure(AbaloneFailure.MUST_ONLY_TRANSLATE_YOUR_PIECES());
            }
            const landing: Coord = tested.getNext(move.dir);
            newBoard[tested.y][tested.x] = FourStatePiece.EMPTY;
            if (AbaloneState.isOnBoard(landing)) {
                if (state.isPiece(landing)) {
                    return MGPFallible.failure(AbaloneFailure.TRANSLATION_IMPOSSIBLE());
                }
                if (state.getPieceAt(landing) === FourStatePiece.EMPTY) {
                    newBoard[landing.y][landing.x] = player;
                }
            }
            tested = tested.getNext(alignment);
        }
        return MGPFallible.success(newBoard);
    }

    public override getGameStatus(node: AbaloneNode, config: MGPOptional<AbaloneConfig>): GameStatus {
        const scores: PlayerNumberMap = node.gameState.getScores();
        const nbToCapture: number = config.get().nbToCapture;
        if (nbToCapture <= scores.get(Player.ZERO)) {
            return GameStatus.ZERO_WON;
        } else if (nbToCapture <= scores.get(Player.ONE)) {
            return GameStatus.ONE_WON;
        } else {
            return GameStatus.ONGOING;
        }
    }
}
