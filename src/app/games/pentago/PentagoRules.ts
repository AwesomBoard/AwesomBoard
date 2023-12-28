import { Coord } from 'src/app/jscaip/Coord';
import { Vector } from 'src/app/jscaip/Vector';
import { GameNode } from 'src/app/jscaip/GameNode';
import { PlayerOrNone } from 'src/app/jscaip/Player';
import { Rules } from 'src/app/jscaip/Rules';
import { RulesFailure } from 'src/app/jscaip/RulesFailure';
import { MGPValidation } from 'src/app/utils/MGPValidation';
import { MGPOptional } from 'src/app/utils/MGPOptional';
import { PentagoFailure } from './PentagoFailure';
import { PentagoMove } from './PentagoMove';
import { PentagoState } from './PentagoState';
import { GameStatus } from 'src/app/jscaip/GameStatus';
import { NoConfig } from 'src/app/jscaip/RulesConfigUtil';
import { Table, TableUtils } from 'src/app/utils/ArrayUtils';

export class PentagoNode extends GameNode<PentagoMove, PentagoState> {}

export class PentagoRules extends Rules<PentagoMove, PentagoState> {

    private static singleton: MGPOptional<PentagoRules> = MGPOptional.empty();

    public static get(): PentagoRules {
        if (PentagoRules.singleton.isAbsent()) {
            PentagoRules.singleton = MGPOptional.of(new PentagoRules());
        }
        return PentagoRules.singleton.get();
    }

    public override getInitialState(): PentagoState {
        const initialBoard: Table<PlayerOrNone> = TableUtils.create(PentagoState.SIZE,
                                                                    PentagoState.SIZE,
                                                                    PlayerOrNone.NONE);
        return new PentagoState(initialBoard, 0);
    }

    public static VICTORY_SOURCE: [Coord, Vector, boolean][] = [
        // [ firstCoordToTest, directionToTest, shouldLookTheSpaceBeforeAsWellAsSpaceAfter]
        [new Coord(1, 0), new Vector(1, 1), false], // 4 short diagonals
        [new Coord(0, 1), new Vector(1, 1), false],
        [new Coord(4, 0), new Vector(-1, 1), false],
        [new Coord(5, 1), new Vector(-1, 1), false],

        [new Coord(1, 1), new Vector(1, 1), true], // 2 long diagonals
        [new Coord(4, 1), new Vector(-1, 1), true],

        [new Coord(0, 1), new Vector(0, 1), true], // 6 verticals
        [new Coord(1, 1), new Vector(0, 1), true],
        [new Coord(2, 1), new Vector(0, 1), true],
        [new Coord(3, 1), new Vector(0, 1), true],
        [new Coord(4, 1), new Vector(0, 1), true],
        [new Coord(5, 1), new Vector(0, 1), true],

        [new Coord(1, 0), new Vector(1, 0), true], // 6 horizontal
        [new Coord(1, 1), new Vector(1, 0), true],
        [new Coord(1, 2), new Vector(1, 0), true],
        [new Coord(1, 3), new Vector(1, 0), true],
        [new Coord(1, 4), new Vector(1, 0), true],
        [new Coord(1, 5), new Vector(1, 0), true],
    ];

    public override applyLegalMove(move: PentagoMove, state: PentagoState, _config: NoConfig, _info: void)
    : PentagoState
    {
        return state.applyLegalMove(move);
    }

    public override isLegal(move: PentagoMove, state: PentagoState): MGPValidation {
        if (state.getPieceAt(move.coord).isPlayer()) {
            return MGPValidation.failure(RulesFailure.MUST_LAND_ON_EMPTY_SPACE());
        }
        const postDropState: PentagoState = state.applyLegalDrop(move);
        if (postDropState.neutralBlocks.length === 0) {
            if (move.blockTurned.isAbsent()) {
                return MGPValidation.failure(PentagoFailure.MUST_CHOOSE_BLOCK_TO_ROTATE());
            }
        } else {
            if (move.blockTurned.isPresent()) {
                const blockTurned: number = move.blockTurned.get();
                if (postDropState.neutralBlocks.includes(blockTurned)) {
                    return MGPValidation.failure(PentagoFailure.CANNOT_ROTATE_NEUTRAL_BLOCK());
                }
            }
        }
        return MGPValidation.SUCCESS;
    }
    public getVictoryCoords(state: PentagoState): Coord[] {
        let victoryCoords: Coord[] = [];
        for (const maybeVictory of PentagoRules.VICTORY_SOURCE) {
            const firstValue: PlayerOrNone = state.getPieceAt(maybeVictory[0]);
            const subVictory: Coord[] = [maybeVictory[0]];
            if (firstValue.isPlayer()) {
                let testedCoord: Coord = maybeVictory[0].getNext(maybeVictory[1]);
                let fourAligned: boolean = true;
                for (let i: number = 0; i < 3 && fourAligned; i++) {
                    if (state.getPieceAt(testedCoord) !== firstValue) {
                        fourAligned = false;
                    } else {
                        subVictory.push(testedCoord);
                        testedCoord = testedCoord.getNext(maybeVictory[1]);
                    }
                }
                if (fourAligned) {
                    // check first alignement
                    if (state.getPieceAt(testedCoord) === firstValue) {
                        subVictory.push(testedCoord);
                        victoryCoords = victoryCoords.concat(subVictory);
                    }
                    if (maybeVictory[2]) {
                        const coordZero: Coord = maybeVictory[0].getPrevious(maybeVictory[1], 1);
                        if (state.getPieceAt(coordZero) === firstValue) {
                            subVictory.push(coordZero);
                            victoryCoords = victoryCoords.concat(subVictory);
                        }
                    }
                }
            }
        }
        return victoryCoords;
    }
    public getGameStatus(node: PentagoNode): GameStatus {
        const state: PentagoState = node.gameState;
        const victoryCoords: Coord[] = this.getVictoryCoords(state);
        const victoryFound: [boolean, boolean] = [false, false];
        for (let i: number = 0; i < victoryCoords.length; i += 5) {
            victoryFound[state.getPieceAt(victoryCoords[i]).getValue()] = true;
        }
        if (victoryFound[0] === true) {
            if (victoryFound[1] === true) {
                return GameStatus.DRAW;
            } else {
                return GameStatus.ZERO_WON;
            }
        }
        if (victoryFound[1] === true) {
            return GameStatus.ONE_WON;
        }
        if (state.turn === PentagoState.SIZE * PentagoState.SIZE) {
            return GameStatus.DRAW;
        } else {
            return GameStatus.ONGOING;
        }
    }
}
