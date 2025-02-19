import { GameNode } from 'src/app/jscaip/AI/GameNode';
import { ConfigurableRules } from 'src/app/jscaip/Rules';
import { TeekoDropMove, TeekoMove, TeekoTranslationMove } from './TeekoMove';
import { TeekoState } from './TeekoState';
import { GameStatus } from 'src/app/jscaip/GameStatus';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { Player, PlayerOrNone } from 'src/app/jscaip/Player';
import { NInARowHelper } from 'src/app/jscaip/NInARowHelper';
import { ArrayUtils, MGPOptional, MGPValidation, Utils } from '@everyboard/lib';
import { Coord, CoordFailure } from 'src/app/jscaip/Coord';
import { Table, TableUtils } from 'src/app/jscaip/TableUtils';
import { BooleanConfig, RulesConfigDescription } from 'src/app/components/wrapper-components/rules-configuration/RulesConfigDescription';
import { PlayerNumberMap } from 'src/app/jscaip/PlayerMap';

export class TeekoNode extends GameNode<TeekoMove, TeekoState> {}

export type TeekoConfig = {
    teleport: boolean;
};

export class TeekoRules extends ConfigurableRules<TeekoMove, TeekoState, TeekoConfig> {

    private static singleton: MGPOptional<TeekoRules> = MGPOptional.empty();

    public static get(): TeekoRules {
        if (TeekoRules.singleton.isAbsent()) {
            TeekoRules.singleton = MGPOptional.of(new TeekoRules());
        }
        return TeekoRules.singleton.get();
    }

    public static readonly RULES_CONFIG_DESCRIPTION: RulesConfigDescription<TeekoConfig> =
        new RulesConfigDescription(
            {
                name: (): string => $localize`Standard Teeko`,
                config: {
                    teleport: new BooleanConfig(false, () => $localize`Piece can teleport`),
                },
            }, [{
                name: (): string => $localize`Teleport Teeko`,
                config: {
                    teleport: true,
                },
            }]);

    public static readonly TEEKO_HELPER: NInARowHelper<PlayerOrNone> =
        new NInARowHelper(Utils.identity, 4);

    public override getRulesConfigDescription(): MGPOptional<RulesConfigDescription<TeekoConfig>> {
        return MGPOptional.of(TeekoRules.RULES_CONFIG_DESCRIPTION);
    }

    public override getInitialState(): TeekoState {
        const board: Table<PlayerOrNone> = TableUtils.create(TeekoState.WIDTH,
                                                             TeekoState.WIDTH,
                                                             PlayerOrNone.NONE);
        return new TeekoState(board, 0);
    }

    public override isLegal(move: TeekoMove, state: TeekoState, optionalConfig: MGPOptional<TeekoConfig>)
    : MGPValidation
    {
        if (state.isInDropPhase()) {
            Utils.assert(move instanceof TeekoDropMove, 'Cannot translate in dropping phase !');
            return this.isLegalDrop(move as TeekoDropMove, state);
        } else {
            Utils.assert(move instanceof TeekoTranslationMove, 'Cannot drop in translation phase !');
            return this.isLegalTranslation(move as TeekoTranslationMove, state, optionalConfig.get());
        }
    }

    private isLegalDrop(move: TeekoDropMove, state: TeekoState): MGPValidation {
        if (state.isNotOnBoard(move.coord)) {
            return MGPValidation.failure(CoordFailure.OUT_OF_RANGE(move.coord));
        }
        if (state.getPieceAt(move.coord).isPlayer()) {
            return MGPValidation.failure(RulesFailure.MUST_LAND_ON_EMPTY_SPACE());
        }
        return MGPValidation.SUCCESS;
    }

    private isLegalTranslation(move: TeekoTranslationMove, state: TeekoState, config: TeekoConfig): MGPValidation {
        if (state.isNotOnBoard(move.getStart())) {
            return MGPValidation.failure(CoordFailure.OUT_OF_RANGE(move.getStart()));
        }
        if (state.isNotOnBoard(move.getEnd())) {
            return MGPValidation.failure(CoordFailure.OUT_OF_RANGE(move.getEnd()));
        }
        const translatedPiece: PlayerOrNone = state.getPieceAt(move.getStart());
        if (translatedPiece === state.getCurrentOpponent()) {
            return MGPValidation.failure(RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_OPPONENT());
        } else if (translatedPiece.isNone()) {
            return MGPValidation.failure(RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_EMPTY());
        }
        if (state.getPieceAt(move.getEnd()).isPlayer()) {
            return MGPValidation.failure(RulesFailure.MUST_LAND_ON_EMPTY_SPACE());
        }
        if (config.teleport === false) {
            if (move.getStart().isNeighborWith(move.getEnd()) === false) {
                return MGPValidation.failure(RulesFailure.MUST_MOVE_ON_NEIGHBOR());
            }
        }
        return MGPValidation.SUCCESS;
    }

    public override applyLegalMove(move: TeekoMove, state: TeekoState, _config: MGPOptional<TeekoConfig>, _info: void)
    : TeekoState
    {
        if (move instanceof TeekoDropMove) {
            return this.applyLegalDrop(move, state);
        } else {
            return this.applyLegalTranslation(move, state);
        }
    }

    private applyLegalDrop(move: TeekoDropMove, state: TeekoState): TeekoState {
        const newBoard: PlayerOrNone[][] = state.getCopiedBoard();
        newBoard[move.coord.y][move.coord.x] = state.getCurrentPlayer();
        return new TeekoState(newBoard, state.turn + 1);
    }

    private applyLegalTranslation(move: TeekoTranslationMove, state: TeekoState): TeekoState {
        const newBoard: PlayerOrNone[][] = state.getCopiedBoard();
        newBoard[move.getStart().y][move.getStart().x] = PlayerOrNone.NONE;
        newBoard[move.getEnd().y][move.getEnd().x] = state.getCurrentPlayer();
        return new TeekoState(newBoard, state.turn + 1);
    }

    public override getGameStatus(node: TeekoNode): GameStatus {
        const state: TeekoState = node.gameState;
        const victoriousCoord: Coord[] = this.getVictoryCoord(state);
        if (victoriousCoord.length > 0) {
            return GameStatus.getVictory(state.getCurrentOpponent());
        } else {
            return GameStatus.ONGOING;
        }
    }

    public getLastCoord(move: TeekoMove): Coord {
        if (move instanceof TeekoDropMove) {
            return move.coord;
        } else {
            return move.getEnd();
        }
    }

    public getSquareInfo(state: TeekoState): { score: number, victoriousCoords: Coord[] } {
        const victoriousCoords: Coord[] = [];
        const possibilies: PlayerNumberMap = PlayerNumberMap.of(0, 0);
        for (let cx: number = 0; cx < TeekoState.WIDTH - 1; cx++) {
            for (let cy: number = 0; cy < TeekoState.WIDTH - 1; cy++) {
                const upLeft: Coord = new Coord(cx, cy);
                const upRight: Coord = new Coord(cx + 1, cy);
                const downLeft: Coord = new Coord(cx, cy + 1);
                const downRight: Coord = new Coord(cx + 1, cy + 1);
                const pieces: PlayerOrNone[] = [
                    state.getPieceAt(upLeft),
                    state.getPieceAt(upRight),
                    state.getPieceAt(downLeft),
                    state.getPieceAt(downRight),
                ];
                const neutralCount: number = ArrayUtils.count(pieces, PlayerOrNone.NONE);
                const zeroCount: number = ArrayUtils.count(pieces, PlayerOrNone.ZERO);
                const oneCount: number = ArrayUtils.count(pieces, PlayerOrNone.ONE);
                if (neutralCount < 4) { // If the square has pieces
                    if (zeroCount === 4 || oneCount === 4) { // There is one player who won, in this square
                        victoriousCoords.push(upLeft, upRight, downLeft, downRight);
                    }
                    else if (zeroCount > 0) { // Only Player.ZERO has pieces in this square
                        possibilies.add(Player.ZERO, 1);
                    } else { // Only Player.ONE has pieces in this square
                        possibilies.add(Player.ONE, 1);
                    }
                }
            }
        }
        return {
            score: possibilies.get(Player.ONE) - possibilies.get(Player.ZERO),
            victoriousCoords,
        };
    }

    public getVictoryCoord(state: TeekoState): Coord[] {
        // Concatenate line victories to square victories
        const linesVictories: Coord[] = TeekoRules.TEEKO_HELPER.getVictoriousCoord(state);
        const squareVictories: Coord[] = this.getSquareInfo(state).victoriousCoords;
        return linesVictories.concat(squareVictories);
    }
}
