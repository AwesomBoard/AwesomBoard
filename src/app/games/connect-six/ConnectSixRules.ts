import { ConfigurableRules } from 'src/app/jscaip/Rules';
import { ConnectSixState } from './ConnectSixState';
import { GameNode } from 'src/app/jscaip/AI/GameNode';
import { MGPValidation, MGPOptional, Utils } from '@everyboard/lib';
import { ConnectSixDrops, ConnectSixFirstMove, ConnectSixMove } from './ConnectSixMove';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { Player, PlayerOrNone } from 'src/app/jscaip/Player';
import { Coord, CoordFailure } from 'src/app/jscaip/Coord';
import { NInARowHelper } from 'src/app/jscaip/NInARowHelper';
import { GameStatus } from 'src/app/jscaip/GameStatus';
import { Table, TableUtils } from 'src/app/jscaip/TableUtils';
import { GobanConfig } from 'src/app/jscaip/GobanConfig';
import { RulesConfigDescription, RulesConfigDescriptions } from 'src/app/components/wrapper-components/rules-configuration/RulesConfigDescription';

export class ConnectSixNode extends GameNode<ConnectSixMove, ConnectSixState> {}

export class ConnectSixRules extends ConfigurableRules<ConnectSixMove, ConnectSixState, GobanConfig> {

    private static singleton: MGPOptional<ConnectSixRules> = MGPOptional.empty();

    public static readonly RULES_CONFIG_DESCRIPTION: RulesConfigDescription<GobanConfig> =
        RulesConfigDescriptions.GOBAN;

    public static get(): ConnectSixRules {
        if (ConnectSixRules.singleton.isAbsent()) {
            ConnectSixRules.singleton = MGPOptional.of(new ConnectSixRules());
        }
        return ConnectSixRules.singleton.get();
    }

    public static readonly CONNECT_SIX_HELPER: NInARowHelper<PlayerOrNone> =
        new NInARowHelper(Utils.identity, 6);

    public static getVictoriousCoords(state: ConnectSixState): Coord[] {
        return ConnectSixRules.CONNECT_SIX_HELPER.getVictoriousCoord(state);
    }

    public override getRulesConfigDescription(): MGPOptional<RulesConfigDescription<GobanConfig>> {
        return MGPOptional.of(ConnectSixRules.RULES_CONFIG_DESCRIPTION);
    }

    public override getInitialState(config: MGPOptional<GobanConfig>): ConnectSixState {
        const board: Table<PlayerOrNone> = TableUtils.create(config.get().width,
                                                             config.get().height,
                                                             PlayerOrNone.NONE);
        return new ConnectSixState(board, 0);
    }

    public override applyLegalMove(move: ConnectSixMove,
                                   state: ConnectSixState,
                                   _config: MGPOptional<GobanConfig>,
                                   _info: void)
    : ConnectSixState
    {
        if (move instanceof ConnectSixDrops) {
            return this.applyLegalDrops(move, state);
        } else {
            return this.applyLegalFirstMove(move, state);
        }
    }

    private applyLegalDrops(move: ConnectSixDrops, state: ConnectSixState): ConnectSixState {
        const player: Player = state.getCurrentPlayer();
        const first: Coord = move.getFirst();
        const second: Coord = move.getSecond();
        const newBoard: PlayerOrNone[][] = state.getCopiedBoard();
        newBoard[first.y][first.x] = player;
        newBoard[second.y][second.x] = player;
        return new ConnectSixState(newBoard, state.turn + 1);
    }

    private applyLegalFirstMove(move: ConnectSixFirstMove, state: ConnectSixState): ConnectSixState {
        const player: Player = state.getCurrentPlayer();
        const newBoard: PlayerOrNone[][] = state.getCopiedBoard();
        newBoard[move.coord.y][move.coord.x] = player;
        return new ConnectSixState(newBoard, state.turn + 1);
    }

    public override isLegal(move: ConnectSixMove, state: ConnectSixState): MGPValidation {
        if (move instanceof ConnectSixFirstMove) {
            Utils.assert(state.turn === 0, 'ConnectSixFirstMove should only be used at first move');
            if (state.isNotOnBoard(move.coord)) {
                return MGPValidation.failure(CoordFailure.OUT_OF_RANGE(move.coord));
            }
            return MGPValidation.SUCCESS;
        } else {
            Utils.assert(state.turn > 0, 'ConnectSixDrops should only be used after first move');
            if (state.isNotOnBoard(move.getFirst())) {
                return MGPValidation.failure(CoordFailure.OUT_OF_RANGE(move.getFirst()));
            } else if (state.isNotOnBoard(move.getSecond())) {
                return MGPValidation.failure(CoordFailure.OUT_OF_RANGE(move.getSecond()));
            } else {
                return this.isLegalDrops(move, state);
            }
        }
    }

    public isLegalDrops(move: ConnectSixDrops, state: ConnectSixState): MGPValidation {
        if (state.getPieceAt(move.getFirst()).isPlayer()) {
            return MGPValidation.failure(RulesFailure.MUST_CLICK_ON_EMPTY_SQUARE());
        } else if (state.getPieceAt(move.getSecond()).isPlayer()) {
            return MGPValidation.failure(RulesFailure.MUST_CLICK_ON_EMPTY_SQUARE());
        } else {
            return MGPValidation.SUCCESS;
        }
    }

    public override getGameStatus(node: ConnectSixNode): GameStatus {
        const state: ConnectSixState = node.gameState;
        const victoriousCoord: Coord[] = ConnectSixRules.CONNECT_SIX_HELPER.getVictoriousCoord(state);
        if (victoriousCoord.length > 0) {
            return GameStatus.getVictory(state.getCurrentOpponent());
        }
        if (TableUtils.contains(state.board, PlayerOrNone.NONE)) {
            return GameStatus.ONGOING;
        } else {
            return GameStatus.DRAW;
        }
    }

}
