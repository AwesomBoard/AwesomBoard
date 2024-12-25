import { Coord, CoordFailure } from 'src/app/jscaip/Coord';
import { GameStatus } from 'src/app/jscaip/GameStatus';
import { GameNode } from 'src/app/jscaip/AI/GameNode';
import { Player, PlayerOrNone } from 'src/app/jscaip/Player';
import { Rules } from 'src/app/jscaip/Rules';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { MGPFallible, MGPOptional, MGPValidation, Utils } from '@everyboard/lib';
import { ConspirateursFailure } from './ConspirateursFailure';
import { ConspirateursMove, ConspirateursMoveDrop, ConspirateursMoveJump, ConspirateursMoveSimple } from './ConspirateursMove';
import { ConspirateursState } from './ConspirateursState';
import { TableUtils } from 'src/app/jscaip/TableUtils';
import { NoConfig } from 'src/app/jscaip/RulesConfigUtil';
import { PlayerNumberMap } from 'src/app/jscaip/PlayerMap';

export class ConspirateursNode extends GameNode<ConspirateursMove, ConspirateursState> {}

export class ConspirateursRules extends Rules<ConspirateursMove, ConspirateursState> {

    public static readonly NUMBER_OF_PIECES: number = 40;

    private static singleton: MGPOptional<ConspirateursRules> = MGPOptional.empty();

    public static get(): ConspirateursRules {
        if (ConspirateursRules.singleton.isAbsent()) {
            ConspirateursRules.singleton = MGPOptional.of(new ConspirateursRules());
        }
        return ConspirateursRules.singleton.get();
    }

    public override getInitialState(): ConspirateursState {
        const board: PlayerOrNone[][] = TableUtils.create(ConspirateursState.WIDTH,
                                                          ConspirateursState.HEIGHT,
                                                          PlayerOrNone.NONE);
        return new ConspirateursState(board, 0);
    }

    public override applyLegalMove(move: ConspirateursMove, state: ConspirateursState, _config: NoConfig, _info: void)
    : ConspirateursState
    {
        const updatedBoard: PlayerOrNone[][] = state.getCopiedBoard();
        if (ConspirateursMove.isDrop(move)) {
            updatedBoard[move.coord.y][move.coord.x] = state.getCurrentPlayer();
        } else if (ConspirateursMove.isSimple(move)) {
            updatedBoard[move.getStart().y][move.getStart().x] = PlayerOrNone.NONE;
            updatedBoard[move.getEnd().y][move.getEnd().x] = state.getCurrentPlayer();
        } else {
            const start: Coord = move.getStartingCoord();
            const end: Coord = move.getEndingCoord();
            updatedBoard[start.y][start.x] = PlayerOrNone.NONE;
            updatedBoard[end.y][end.x] = state.getCurrentPlayer();
        }
        return new ConspirateursState(updatedBoard, state.turn + 1);
    }

    public override isLegal(move: ConspirateursMove, state: ConspirateursState): MGPValidation {
        if (ConspirateursMove.isDrop(move)) {
            return this.dropLegality(move, state);
        } else if (ConspirateursMove.isSimple(move)) {
            return this.simpleMoveLegality(move, state);
        } else {
            return this.jumpLegality(move, state);
        }
    }

    public dropLegality(move: ConspirateursMoveDrop, state: ConspirateursState): MGPValidation {
        Utils.assert(state.isOnBoard(move.coord), 'Move out of board');
        if (ConspirateursRules.NUMBER_OF_PIECES <= state.turn) {
            return MGPValidation.failure(ConspirateursFailure.CANNOT_DROP_WHEN_OUT_OF_PIECE());
        }
        if (state.getPieceAt(move.coord).isPlayer()) {
            return MGPValidation.failure(RulesFailure.MUST_LAND_ON_EMPTY_SPACE());
        }
        if (state.isCentralZone(move.coord) === false) {
            return MGPValidation.failure(ConspirateursFailure.MUST_DROP_IN_CENTRAL_ZONE());
        }
        return MGPValidation.SUCCESS;
    }

    public simpleMoveLegality(move: ConspirateursMoveSimple, state: ConspirateursState): MGPValidation {
        const startInRange: boolean = state.isOnBoard(move.getStart());
        const endInRange: boolean = state.isOnBoard(move.getEnd());
        Utils.assert(startInRange && endInRange, 'Move out of board');
        if (state.turn < ConspirateursRules.NUMBER_OF_PIECES) {
            return MGPValidation.failure(ConspirateursFailure.CANNOT_MOVE_BEFORE_DROPPING_ALL_PIECES());
        }
        const startPiece: PlayerOrNone = state.getPieceAt(move.getStart());
        if (startPiece.isNone()) {
            return MGPValidation.failure(RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_EMPTY());
        }
        if (startPiece === state.getCurrentOpponent()) {
            return MGPValidation.failure(RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_OPPONENT());
        }
        if (state.getPieceAt(move.getEnd()).isPlayer()) {
            return MGPValidation.failure(RulesFailure.MUST_LAND_ON_EMPTY_SPACE());
        }
        return MGPValidation.SUCCESS;
    }

    public jumpLegality(move: ConspirateursMoveJump, state: ConspirateursState): MGPValidation {
        for (const coord of move.coords) {
            if (state.isOnBoard(coord) === false) {
                return MGPFallible.failure(CoordFailure.OUT_OF_RANGE(coord));
            }
        }
        if (state.turn < ConspirateursRules.NUMBER_OF_PIECES) {
            return MGPValidation.failure(ConspirateursFailure.CANNOT_MOVE_BEFORE_DROPPING_ALL_PIECES());
        }
        const startPiece: PlayerOrNone = state.getPieceAt(move.getStartingCoord());
        if (startPiece.isNone()) {
            return MGPValidation.failure(RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_EMPTY());
        }
        if (startPiece === state.getCurrentOpponent()) {
            return MGPValidation.failure(RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_OPPONENT());
        }
        for (const jumpedOver of move.getJumpedOverCoords()) {
            if (state.getPieceAt(jumpedOver).isNone()) {
                return MGPValidation.failure(ConspirateursFailure.MUST_JUMP_OVER_PIECES());
            }
        }
        for (const landing of move.getLandingCoords()) {
            if (state.getPieceAt(landing).isPlayer()) {
                return MGPValidation.failure(RulesFailure.MUST_LAND_ON_EMPTY_SPACE());
            }
        }
        return MGPValidation.SUCCESS;
    }

    public jumpTargetsFrom(state: ConspirateursState, start: Coord): Coord[] {
        const targets: Coord[] = [
            new Coord(start.x + 2, start.y),
            new Coord(start.x - 2, start.y),
            new Coord(start.x, start.y + 2),
            new Coord(start.x, start.y - 2),
            new Coord(start.x + 2, start.y + 2),
            new Coord(start.x + 2, start.y - 2),
            new Coord(start.x - 2, start.y + 2),
            new Coord(start.x - 2, start.y - 2),
        ];
        const validTargets: Coord[] = [];
        for (const target of targets) {
            if (state.isOnBoard(target)) {
                const move: MGPFallible<ConspirateursMoveJump> = ConspirateursMoveJump.from([start, target]);
                if (move.isSuccess()) {
                    validTargets.push(target);
                }
            }
        }
        return validTargets;
    }

    public nextJumps(jump: ConspirateursMoveJump, state: ConspirateursState): ConspirateursMoveJump[] {
        const ending: Coord = jump.getEndingCoord();
        const nextJumps: ConspirateursMoveJump[] = [];
        for (const target of this.jumpTargetsFrom(state, ending)) {
            const move: MGPFallible<ConspirateursMoveJump> = jump.addJump(target);
            if (move.isSuccess() && this.jumpLegality(move.get(), state).isSuccess()) {
                nextJumps.push(move.get());
            }
        }
        return nextJumps;
    }

    public jumpHasPossibleNextTargets(jump: ConspirateursMoveJump, state: ConspirateursState): boolean {
        return this.nextJumps(jump, state).length > 0;
    }

    public override getGameStatus(node: ConspirateursNode): GameStatus {
        const protectedPawns: PlayerNumberMap = this.getProtectedPawns(node.gameState);
        for (const player of Player.PLAYERS) {
            if (protectedPawns.get(player) === 20) {
                return GameStatus.getVictory(player);
            }
        }
        return GameStatus.ONGOING;
    }

    public getProtectedPawns(state: ConspirateursState): PlayerNumberMap {
        const protectedPawns: PlayerNumberMap = PlayerNumberMap.of(0, 0);
        for (const shelter of ConspirateursState.ALL_SHELTERS) {
            const content: PlayerOrNone = state.getPieceAt(shelter);
            if (content.isPlayer()) {
                protectedPawns.add(content, 1);
            }
        }
        return protectedPawns;
    }

}
