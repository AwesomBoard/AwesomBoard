import { Coord } from 'src/app/jscaip/Coord';
import { Orthogonal } from 'src/app/jscaip/Direction';
import { MGPNode } from 'src/app/jscaip/MGPNode';
import { Player, PlayerOrNone } from 'src/app/jscaip/Player';
import { Rules } from 'src/app/jscaip/Rules';
import { QuixoState } from './QuixoState';
import { QuixoMove } from './QuixoMove';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { MGPValidation } from 'src/app/utils/MGPValidation';
import { NInARowHelper } from 'src/app/jscaip/NInARowHelper';
import { Utils } from 'src/app/utils/utils';
import { MGPSet } from 'src/app/utils/MGPSet';
import { GameStatus } from 'src/app/jscaip/GameStatus';
import { MGPOptional } from 'src/app/utils/MGPOptional';

export class QuixoNode extends MGPNode<QuixoRules, QuixoMove, QuixoState> {}

export class QuixoRules extends Rules<QuixoMove, QuixoState> {

    private static singleton: MGPOptional<QuixoRules> = MGPOptional.empty();

    public static get(): QuixoRules {
        if (QuixoRules.singleton.isAbsent()) {
            QuixoRules.singleton = MGPOptional.of(new QuixoRules());
        }
        return QuixoRules.singleton.get();
    }
    private constructor() {
        super(QuixoState);
    }
    public static readonly QUIXO_HELPER: NInARowHelper<PlayerOrNone> =
        new NInARowHelper(QuixoMove.isInRange, Utils.identity, 5);

    public static getVerticalCoords(node: QuixoNode): Coord[] {
        const currentOpponent: Player = node.gameState.getCurrentOpponent();
        const verticalCoords: Coord[] = [];
        for (let y: number = 0; y < 5; y++) {
            if (node.gameState.getPieceAtXY(0, y) !== currentOpponent) {
                verticalCoords.push(new Coord(0, y));
            }
            if (node.gameState.getPieceAtXY(4, y) !== currentOpponent) {
                verticalCoords.push(new Coord(4, y));
            }
        }
        return verticalCoords;
    }
    public static getHorizontalCenterCoords(node: QuixoNode): Coord[] {
        const currentOpponent: Player = node.gameState.getCurrentOpponent();
        const horizontalCenterCoords: Coord[] = [];
        for (let x: number = 1; x < 4; x++) {
            if (node.gameState.getPieceAtXY(x, 0) !== currentOpponent) {
                horizontalCenterCoords.push(new Coord(x, 0));
            }
            if (node.gameState.getPieceAtXY(x, 4) !== currentOpponent) {
                horizontalCenterCoords.push(new Coord(x, 4));
            }
        }
        return horizontalCenterCoords;
    }
    public static getPossibleDirections(coord: Coord): Orthogonal[] {
        const possibleDirections: Orthogonal[] = [];
        if (coord.x !== 0) possibleDirections.push(Orthogonal.LEFT);
        if (coord.y !== 0) possibleDirections.push(Orthogonal.UP);
        if (coord.x !== 4) possibleDirections.push(Orthogonal.RIGHT);
        if (coord.y !== 4) possibleDirections.push(Orthogonal.DOWN);
        return possibleDirections;
    }
    public static getLinesSums(state: QuixoState): {[player: number]: {[lineType: string]: number[]}} {
        const sums: {[player: number]: {[lineType: string]: number[]}} = {};
        sums[Player.ZERO.value] = {
            columns: [0, 0, 0, 0, 0],
            rows: [0, 0, 0, 0, 0],
            diagonals: [0, 0],
        };
        sums[Player.ONE.value] = {
            columns: [0, 0, 0, 0, 0],
            rows: [0, 0, 0, 0, 0],
            diagonals: [0, 0],
        };
        for (let y: number = 0; y < 5; y++) {
            for (let x: number = 0; x < 5; x++) {
                const content: PlayerOrNone = state.getPieceAtXY(x, y);
                if (content.isPlayer()) {
                    const c: number = content.value;
                    sums[c].columns[x] = sums[c].columns[x] + 1;
                    sums[c].rows[y] = sums[c].rows[y] + 1;
                    if (x === y) sums[c].diagonals[0] = sums[c].diagonals[0] + 1;
                    if (x + y === 4) sums[c].diagonals[1] = sums[c].diagonals[1] + 1;
                }
            }
        }
        return sums;
    }
    public static getVictoriousCoords(state: QuixoState): Coord[] {
        return QuixoRules.QUIXO_HELPER.getVictoriousCoord(state);
    }
    public static getFullestLine(playersLinesInfo: {[lineType: string]: number[]}): number {
        const linesScores: number[] = playersLinesInfo.columns.concat(
            playersLinesInfo.rows.concat(
                playersLinesInfo.diagonals));
        return Math.max(...linesScores);
    }
    public applyLegalMove(move: QuixoMove, state: QuixoState, status: void): QuixoState {
        return QuixoRules.applyLegalMove(move, state, status);
    }
    public static applyLegalMove(move: QuixoMove, state: QuixoState, _status: void): QuixoState {
        return state.applyLegalMove(move);
    }
    public isLegal(move: QuixoMove, state: QuixoState): MGPValidation {
        if (state.getPieceAt(move.coord) === state.getCurrentOpponent()) {
            return MGPValidation.failure(RulesFailure.CANNOT_CHOOSE_OPPONENT_PIECE());
        } else {
            return MGPValidation.SUCCESS;
        }
    }
    public getGameStatus(node: QuixoNode): GameStatus {
        const state: QuixoState = node.gameState;
        const victoriousCoord: Coord[] = QuixoRules.QUIXO_HELPER.getVictoriousCoord(state);
        const unreducedWinners: PlayerOrNone[] = victoriousCoord.map((coord: Coord) => state.getPieceAt(coord));
        const winners: MGPSet<PlayerOrNone> = new MGPSet(unreducedWinners);
        if (winners.size() === 0) {
            return GameStatus.ONGOING;
        } else if (winners.size() === 1) {
            return GameStatus.getVictory(winners.getAnyElement().get() as Player);
        } else {
            return GameStatus.getVictory(state.getCurrentPlayer());
        }
    }
}
