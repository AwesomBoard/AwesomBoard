import { Coord } from 'src/app/jscaip/Coord';
import { Orthogonal } from 'src/app/jscaip/Orthogonal';
import { GameNode } from 'src/app/jscaip/AI/GameNode';
import { Player, PlayerOrNone } from 'src/app/jscaip/Player';
import { ConfigurableRules } from 'src/app/jscaip/Rules';
import { QuixoConfig, QuixoState } from './QuixoState';
import { QuixoMove } from './QuixoMove';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { NInARowHelper } from 'src/app/jscaip/NInARowHelper';
import { MGPMap, MGPOptional, Set, MGPValidation, NumberMap, Utils } from '@everyboard/lib';
import { GameStatus } from 'src/app/jscaip/GameStatus';
import { TableUtils } from 'src/app/jscaip/TableUtils';
import { QuixoFailure } from './QuixoFailure';
import { NumberConfig, RulesConfigDescription, RulesConfigDescriptionLocalizable } from 'src/app/components/wrapper-components/rules-configuration/RulesConfigDescription';
import { MGPValidators } from 'src/app/utils/MGPValidator';
import { PlayerMap } from 'src/app/jscaip/PlayerMap';

export class QuixoNode extends GameNode<QuixoMove, QuixoState> {}

export class QuixoRules extends ConfigurableRules<QuixoMove, QuixoState, QuixoConfig> {

    private static singleton: MGPOptional<QuixoRules> = MGPOptional.empty();

    public static readonly RULES_CONFIG_DESCRIPTION: RulesConfigDescription<QuixoConfig> =
        new RulesConfigDescription<QuixoConfig>({
            name: (): string => $localize`Quixo`,
            config: {
                width: new NumberConfig(5, RulesConfigDescriptionLocalizable.WIDTH, MGPValidators.range(1, 99)),
                height: new NumberConfig(5, RulesConfigDescriptionLocalizable.HEIGHT, MGPValidators.range(1, 99)),
            },
        });

    public static readonly QUIXO_HELPER: NInARowHelper<PlayerOrNone> =
        new NInARowHelper(Utils.identity, 5);

    public static getVerticalCoords(node: QuixoNode): Coord[] {
        const currentOpponent: Player = node.gameState.getCurrentOpponent();
        const verticalCoords: Coord[] = [];
        const state: QuixoState = node.gameState;
        for (let y: number = 0; y < state.getHeight(); y++) {
            if (state.getPieceAtXY(0, y) !== currentOpponent) {
                verticalCoords.push(new Coord(0, y));
            }
            if (state.getPieceAtXY(state.getWidth() - 1, y) !== currentOpponent) {
                verticalCoords.push(new Coord(state.getWidth() - 1, y));
            }
        }
        return verticalCoords;
    }

    public static getHorizontalCenterCoords(node: QuixoNode): Coord[] {
        const currentOpponent: Player = node.gameState.getCurrentOpponent();
        const horizontalCenterCoords: Coord[] = [];
        const state: QuixoState = node.gameState;
        for (let x: number = 1; x < state.getWidth() - 1; x++) {
            if (state.getPieceAtXY(x, 0) !== currentOpponent) {
                horizontalCenterCoords.push(new Coord(x, 0));
            }
            if (state.getPieceAtXY(x, state.getHeight() - 1) !== currentOpponent) {
                horizontalCenterCoords.push(new Coord(x, state.getHeight() - 1));
            }
        }
        return horizontalCenterCoords;
    }

    public static getLinesSums(state: QuixoState): PlayerMap<MGPMap<string, NumberMap<number>>> {
        const sums: PlayerMap<MGPMap<string, NumberMap<number>>> = PlayerMap.ofValues(
            new MGPMap([
                { key: 'columns', value: new NumberMap<number>() },
                { key: 'rows', value: new NumberMap<number>() },
                { key: 'ascendingDiagonal', value: new NumberMap<number>() },
                { key: 'descendingDiagonal', value: new NumberMap<number>() },
            ]),
            new MGPMap([
                { key: 'columns', value: new NumberMap<number>() },
                { key: 'rows', value: new NumberMap<number>() },
                { key: 'ascendingDiagonal', value: new NumberMap<number>() },
                { key: 'descendingDiagonal', value: new NumberMap<number>() },
            ]));
        for (const coordAndContent of state.getPlayerCoordsAndContent()) {
            const content: Player = coordAndContent.content;
            const x: number = coordAndContent.coord.x;
            const y: number = coordAndContent.coord.y;
            sums.get(content).get('columns').get().addOrSet(x, 1);
            sums.get(content).get('rows').get().addOrSet(y, 1);
            sums.get(content).get('ascendingDiagonal').get().addOrSet(x + y, 1);
            sums.get(content).get('descendingDiagonal').get().addOrSet(x - y, 1);
        }
        return sums;
    }

    public static getVictoriousCoords(state: QuixoState): Coord[] {
        const victoriousCoord: Coord[] = QuixoRules.QUIXO_HELPER.getVictoriousCoord(state);
        const opponentCoords: Coord[] =
            QuixoRules.getPlayersCoords(victoriousCoord, state, state.getPreviousOpponent());
        const playerCoords: Coord[] = QuixoRules.getPlayersCoords(victoriousCoord, state, state.getPreviousPlayer());
        if (opponentCoords.length === 0) {
            if (playerCoords.length === 0) {
                return []; // Nobody won
            } else {
                return playerCoords; // Player won
            }
        } else {
            // if there is no player coords, then opponent won
            // if there is both player coords,
            // Then player made opponent win by making two victories
            return opponentCoords;
        }
    }

    public static getPlayersCoords(coords: Coord[], state: QuixoState, player: Player): Coord[] {
        return coords.filter((coord: Coord) => {
            return state.getPieceAt(coord).equals(player);
        });
    }

    public static getFullestLine(playerLinesInfo: MGPMap<string, NumberMap<number>>): number {
        let linesScores: number[] = playerLinesInfo.get('columns').get().getValueList();
        linesScores = linesScores.concat(playerLinesInfo.get('rows').get().getValueList());
        linesScores = linesScores.concat(playerLinesInfo.get('ascendingDiagonal').get().getValueList());
        linesScores = linesScores.concat(playerLinesInfo.get('descendingDiagonal').get().getValueList());
        return Math.max(...linesScores);
    }

    public static get(): QuixoRules {
        if (QuixoRules.singleton.isAbsent()) {
            QuixoRules.singleton = MGPOptional.of(new QuixoRules());
        }
        return QuixoRules.singleton.get();
    }

    public override getRulesConfigDescription(): MGPOptional<RulesConfigDescription<QuixoConfig>> {
        return MGPOptional.of(QuixoRules.RULES_CONFIG_DESCRIPTION);
    }

    public override getInitialState(config: MGPOptional<QuixoConfig>): QuixoState {
        const initialBoard: PlayerOrNone[][] = TableUtils.create(config.get().width,
                                                                 config.get().height,
                                                                 PlayerOrNone.NONE);
        return new QuixoState(initialBoard, 0);
    }

    public getPossibleDirections(state: QuixoState, coord: Coord): Orthogonal[] {
        const possibleDirections: Orthogonal[] = [];
        if (coord.x !== 0) possibleDirections.push(Orthogonal.LEFT);
        if (coord.y !== 0) possibleDirections.push(Orthogonal.UP);
        if (coord.x !== (state.getWidth() - 1)) possibleDirections.push(Orthogonal.RIGHT);
        if (coord.y !== (state.getHeight() - 1)) possibleDirections.push(Orthogonal.DOWN);
        return possibleDirections;
    }

    public isValidCoord(state: QuixoState, coord: Coord): MGPValidation {
        Utils.assert(state.isOnBoard(coord),
                     'Invalid coord for QuixoMove: ' + coord.toString() + ' is outside the board.');
        if (coord.x !== 0 &&
            coord.x !== (state.getWidth() - 1) &&
            coord.y !== 0 &&
            coord.y !== (state.getHeight() - 1))
        {
            return MGPValidation.failure(QuixoFailure.NO_INSIDE_CLICK());
        }
        return MGPValidation.SUCCESS;
    }

    private assertDirectionValidity(move: QuixoMove, state: QuixoState): void {
        const x: number = move.coord.x;
        const y: number = move.coord.y;
        const direction: Orthogonal = move.direction;
        Utils.assert(x !== (state.getWidth() - 1) || direction !== Orthogonal.RIGHT,
                     `Invalid direction: piece on the right side can't be moved to the right.`);
        Utils.assert(y !== (state.getHeight() - 1) || direction !== Orthogonal.DOWN,
                     `Invalid direction: piece on the bottom side can't be moved down.`);
        Utils.assert(x !== 0 || direction !== Orthogonal.LEFT,
                     `Invalid direction: piece on the left side can't be moved to the left.`);
        Utils.assert(y !== 0 || direction !== Orthogonal.UP,
                     `Invalid direction: piece on the top side can't be moved up.`);
    }

    public override applyLegalMove(move: QuixoMove, state: QuixoState, _config: MGPOptional<QuixoConfig>, _info: void)
    : QuixoState
    {
        return state.applyLegalMove(move);
    }

    public override isLegal(move: QuixoMove, state: QuixoState): MGPValidation {
        const coordValidity: MGPValidation = this.isValidCoord(state, move.coord);
        if (coordValidity.isFailure()) {
            return coordValidity;
        }
        this.assertDirectionValidity(move, state);
        if (state.getPieceAt(move.coord) === state.getCurrentOpponent()) {
            return MGPValidation.failure(RulesFailure.MUST_CHOOSE_OWN_PIECE_NOT_OPPONENT());
        } else {
            return MGPValidation.SUCCESS;
        }
    }

    public override getGameStatus(node: QuixoNode): GameStatus {
        const state: QuixoState = node.gameState;
        const victoriousCoord: Coord[] = QuixoRules.QUIXO_HELPER.getVictoriousCoord(state);
        const unreducedWinners: PlayerOrNone[] = victoriousCoord.map((coord: Coord) => state.getPieceAt(coord));
        const winners: Set<PlayerOrNone> = new Set(unreducedWinners);
        if (winners.size() === 0) {
            return GameStatus.ONGOING;
        } else if (winners.size() === 1) {
            return GameStatus.getVictory(winners.getAnyElement().get() as Player);
        } else {
            return GameStatus.getVictory(state.getCurrentPlayer());
        }
    }

}
