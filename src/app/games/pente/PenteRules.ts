import { Coord, CoordFailure } from 'src/app/jscaip/Coord';
import { Ordinal } from 'src/app/jscaip/Ordinal';
import { GameNode } from 'src/app/jscaip/AI/GameNode';
import { NInARowHelper } from 'src/app/jscaip/NInARowHelper';
import { Player, PlayerOrNone } from 'src/app/jscaip/Player';
import { ConfigurableRules } from 'src/app/jscaip/Rules';
import { GameStatus } from 'src/app/jscaip/GameStatus';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { MGPOptional, MGPValidation, Utils } from '@everyboard/lib';
import { PenteMove } from './PenteMove';
import { PenteState } from './PenteState';
import { TableUtils } from 'src/app/jscaip/TableUtils';
import { NumberConfig, RulesConfigDescription, RulesConfigDescriptionLocalizable } from 'src/app/components/wrapper-components/rules-configuration/RulesConfigDescription';
import { PlayerNumberMap } from 'src/app/jscaip/PlayerMap';
import { PenteConfig } from './PenteConfig';
import { MGPValidators } from 'src/app/utils/MGPValidator';

export class PenteNode extends GameNode<PenteMove, PenteState> {}

export class PenteRules extends ConfigurableRules<PenteMove, PenteState, PenteConfig> {

    public static readonly RULES_CONFIG_DESCRIPTION: RulesConfigDescription<PenteConfig> =
        new RulesConfigDescription<PenteConfig>({
            name: (): string => $localize`Default`,
            config: {
                width: new NumberConfig(19, RulesConfigDescriptionLocalizable.WIDTH, MGPValidators.range(1, 99)),
                height: new NumberConfig(19, RulesConfigDescriptionLocalizable.HEIGHT, MGPValidators.range(1, 99)),
                capturesNeededToWin: new NumberConfig(10, () => $localize`Captured stones needed to win`, MGPValidators.range(1, 123456)),
                nInARow: new NumberConfig(5,
                                          RulesConfigDescriptionLocalizable.ALIGNMENT_SIZE,
                                          MGPValidators.range(3, 99)),
                sizeOfSandwich: new NumberConfig(2, () => $localize`Size of captures`, MGPValidators.range(1, 99)),
            },
        });

    private static singleton: MGPOptional<PenteRules> = MGPOptional.empty();

    public static get(): PenteRules {
        if (PenteRules.singleton.isAbsent()) {
            PenteRules.singleton = MGPOptional.of(new PenteRules());
        }
        return PenteRules.singleton.get();
    }

    public override getInitialState(optionalConfig: MGPOptional<PenteConfig>): PenteState {
        const config: PenteConfig = optionalConfig.get();
        const board: PlayerOrNone[][] = TableUtils.create(config.width,
                                                          config.height,
                                                          PlayerOrNone.NONE);
        const cx: number = Math.floor(config.width / 2);
        const cy: number = Math.floor(config.height / 2);
        board[cy][cx] = PlayerOrNone.ONE;
        return new PenteState(board, PlayerNumberMap.of(0, 0), 0);
    }

    public override getRulesConfigDescription(): MGPOptional<RulesConfigDescription<PenteConfig>> {
        return MGPOptional.of(PenteRules.RULES_CONFIG_DESCRIPTION);
    }

    public override isLegal(move: PenteMove, state: PenteState): MGPValidation {
        if (state.isNotOnBoard(move.coord)) {
            return MGPValidation.failure(CoordFailure.OUT_OF_RANGE(move.coord));
        } else if (state.getPieceAt(move.coord).isPlayer()) {
            return MGPValidation.failure(RulesFailure.MUST_CLICK_ON_EMPTY_SQUARE());
        } else {
            return MGPValidation.SUCCESS;
        }
    }

    public override applyLegalMove(move: PenteMove, state: PenteState, config: MGPOptional<PenteConfig>, _info: void)
    : PenteState
    {
        const player: Player = state.getCurrentPlayer();
        const newBoard: PlayerOrNone[][] = state.getCopiedBoard();
        newBoard[move.coord.y][move.coord.x]= player;
        const capturedPieces: Coord[] = this.getCaptures(move.coord, state, config.get(), player);
        for (const captured of capturedPieces) {
            newBoard[captured.y][captured.x] = PlayerOrNone.NONE;
        }
        const captures: PlayerNumberMap = state.captures.getCopy();
        captures.add(player, capturedPieces.length);
        return new PenteState(newBoard, captures, state.turn + 1);
    }

    public getCaptures(coord: Coord, state: PenteState, config: PenteConfig, player: Player): Coord[] {
        const opponent: Player = player.getOpponent();
        const captures: Coord[] = [];
        const sizeOfCapture: number = config.sizeOfSandwich;
        for (const direction of Ordinal.factory.all) {
            let i: number = 1;
            let potentialCapture: Coord = coord.getNext(direction, i);
            const captured: Coord[] = [potentialCapture];
            while (state.hasPieceAt(potentialCapture, opponent) && i < sizeOfCapture)
            {
                i++;
                potentialCapture = potentialCapture.getNext(direction, 1);
                captured.push(potentialCapture);
            }
            const sandwicher: Coord = coord.getNext(direction, sizeOfCapture + 1);
            if (state.hasPieceAt(potentialCapture, opponent) &&
                i === sizeOfCapture &&
                state.hasPieceAt(sandwicher, player))
            {
                captures.push(...captured);
            }
        }
        return captures;
    }

    public override getGameStatus(node: PenteNode, config: MGPOptional<PenteConfig>): GameStatus {
        const state: PenteState = node.gameState;
        const opponent: Player = state.getCurrentOpponent();
        const capturesNeededToWin: number = config.get().capturesNeededToWin;
        if (capturesNeededToWin <= state.captures.get(opponent)) {
            return GameStatus.getVictory(opponent);
        }
        const victoriousCoord: Coord[] = this.getHelper(config.get()).getVictoriousCoord(state);
        if (victoriousCoord.length > 0) {
            return GameStatus.getVictory(opponent);
        }
        if (this.stillHaveEmptySquare(state)) {
            return GameStatus.ONGOING;
        } else {
            return GameStatus.DRAW;
        }
    }

    public getHelper(config: PenteConfig): NInARowHelper<PlayerOrNone> {
        return new NInARowHelper(Utils.identity, config.nInARow);
    }

    private stillHaveEmptySquare(state: PenteState): boolean {
        const width: number = state.getWidth();
        const height: number = state.getHeight();
        for (let y: number = 0; y < height; y++) {
            for (let x: number = 0; x < width; x++) {
                if (state.board[y][x].isNone()) {
                    return true;
                }
            }
        }
        return false;
    }

}
