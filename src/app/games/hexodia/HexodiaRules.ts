import { MGPValidation, MGPOptional, Utils, MGPMap } from '@everyboard/lib';

import { ConfigurableRules } from 'src/app/jscaip/Rules';
import { HexodiaState } from './HexodiaState';
import { GameNode } from 'src/app/jscaip/AI/GameNode';
import { HexodiaMove } from './HexodiaMove';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { Coord, CoordFailure } from 'src/app/jscaip/Coord';
import { AbstractNInARowHelper } from 'src/app/jscaip/NInARowHelper';
import { GameStatus } from 'src/app/jscaip/GameStatus';
import { TableUtils } from 'src/app/jscaip/TableUtils';
import { FourStatePiece } from 'src/app/jscaip/FourStatePiece';
import { NumberConfig, RulesConfigDescription, RulesConfigDescriptionLocalizable } from 'src/app/components/wrapper-components/rules-configuration/RulesConfigDescription';
import { MGPValidators } from 'src/app/utils/MGPValidator';
import { DodecaHexaDirection } from 'src/app/jscaip/DodecaHexaDirection';

export type HexodiaConfig = {

    size: number;

    nInARow: number;

    numberOfDrops: number;

};

export class HexodiaNode extends GameNode<HexodiaMove, HexodiaState> {}

export class HexodiaRules extends ConfigurableRules<HexodiaMove, HexodiaState, HexodiaConfig> {

    private static singleton: MGPOptional<HexodiaRules> = MGPOptional.empty();

    private static readonly helpers: MGPMap<number, AbstractNInARowHelper<FourStatePiece>> = new MGPMap();

    public static readonly RULES_CONFIG_DESCRIPTION: RulesConfigDescription<HexodiaConfig> =
        new RulesConfigDescription<HexodiaConfig>({
            name: (): string => $localize`Hexodia`,
            config: {
                size: new NumberConfig(12,
                                       RulesConfigDescriptionLocalizable.SIZE,
                                       MGPValidators.range(1, 99)),
                nInARow: new NumberConfig(6,
                                          RulesConfigDescriptionLocalizable.ALIGNMENT_SIZE,
                                          MGPValidators.range(1, 99)),
                numberOfDrops: new NumberConfig(2,
                                                RulesConfigDescriptionLocalizable.NUMBER_OF_DROPS,
                                                MGPValidators.range(1, 99)),
            },
        });

    public static get(): HexodiaRules {
        if (HexodiaRules.singleton.isAbsent()) {
            HexodiaRules.singleton = MGPOptional.of(new HexodiaRules());
        }
        return HexodiaRules.singleton.get();
    }

    public static getHexodiaHelper(config: MGPOptional<HexodiaConfig>): AbstractNInARowHelper<FourStatePiece> {
        return HexodiaRules.getHexodiaHelperBySize(config.get().nInARow);
    }

    public static getHexodiaHelperBySize(size: number): AbstractNInARowHelper<FourStatePiece> {
        if (HexodiaRules.helpers.get(size).isAbsent()) {
            const helper: AbstractNInARowHelper<FourStatePiece> =
                new AbstractNInARowHelper<FourStatePiece, DodecaHexaDirection>(
                    (piece: FourStatePiece) => piece.getPlayer(),
                    size,
                    DodecaHexaDirection.factory.all,
                );
            HexodiaRules.helpers.put(size, helper);
        }
        return HexodiaRules.helpers.get(size).get();
    }

    public static getVictoriousCoords(state: HexodiaState, config: MGPOptional<HexodiaConfig>): Coord[] {
        return HexodiaRules.getHexodiaHelper(config).getVictoriousCoord(state);
    }

    public override getRulesConfigDescription(): MGPOptional<RulesConfigDescription<HexodiaConfig>> {
        return MGPOptional.of(HexodiaRules.RULES_CONFIG_DESCRIPTION);
    }

    public override getInitialState(config: MGPOptional<HexodiaConfig>): HexodiaState {
        const size: number = config.get().size;
        const boardSize: number = (size * 2) - 1;
        const maximumDiagonalIndex: number = (3 * size) - 2;
        const board: FourStatePiece[][] = TableUtils.create(boardSize, boardSize, FourStatePiece.UNREACHABLE);
        for (let y: number = 0; y < boardSize; y++) {
            for (let x: number = 0; x < boardSize; x++) {
                const diagonalIndex: number = x + y;
                if (size - 2 < diagonalIndex && diagonalIndex < maximumDiagonalIndex) {
                    board[y][x] = FourStatePiece.EMPTY;
                }
            }
        }
        return new HexodiaState(board, 0);
    }

    public override applyLegalMove(move: HexodiaMove,
                                   state: HexodiaState)
    : HexodiaState
    {
        const player: FourStatePiece = FourStatePiece.ofPlayer(state.getCurrentPlayer());
        const newBoard: FourStatePiece[][] = state.getCopiedBoard();
        for (const coord of move.coords) {
            newBoard[coord.y][coord.x] = player;
        }
        return new HexodiaState(newBoard, state.turn + 1);
    }

    public override isLegal(move: HexodiaMove, state: HexodiaState, config: MGPOptional<HexodiaConfig>): MGPValidation {
        const configuration: HexodiaConfig = config.get();
        const numberOfDrops: number = move.coords.size();
        if (state.turn === 0) {
            Utils.assert(numberOfDrops === 1, 'HexodiaMove should only drop one piece at first turn');
        } else {
            const remainingSpaces: number = TableUtils.count(state.board, FourStatePiece.EMPTY);
            const requiredDrop: number = Math.min(remainingSpaces, configuration.numberOfDrops);
            Utils.assert(numberOfDrops === requiredDrop,
                         'HexodiaMove should have exactly ' + configuration.numberOfDrops+ ' drops (got ' + numberOfDrops + ')');
        }
        return this.isLegalDrop(move, state);
    }

    public isLegalDrop(move: HexodiaMove, state: HexodiaState): MGPValidation {
        for (const coord of move.coords) {
            if (state.isOnBoard(coord) === false) {
                return MGPValidation.failure(CoordFailure.OUT_OF_RANGE(coord));
            }
            if (state.getPieceAt(coord).isPlayer()) {
                return MGPValidation.failure(RulesFailure.MUST_CLICK_ON_EMPTY_SQUARE());
            }
        }
        return MGPValidation.SUCCESS;
    }

    public override getGameStatus(node: HexodiaNode, config: MGPOptional<HexodiaConfig>): GameStatus {
        const state: HexodiaState = node.gameState;
        const victoriousCoord: Coord[] = HexodiaRules.getVictoriousCoords(state, config);
        if (victoriousCoord.length > 0) {
            return GameStatus.getVictory(state.getCurrentOpponent());
        }
        if (TableUtils.contains(state.board, FourStatePiece.EMPTY)) {
            return GameStatus.ONGOING;
        } else {
            return GameStatus.DRAW;
        }
    }

}
