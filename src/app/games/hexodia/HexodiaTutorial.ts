import { MGPOptional } from '@everyboard/lib';

import { Tutorial, TutorialStep } from 'src/app/components/wrapper-components/tutorial-game-wrapper/TutorialStep';
import { HexodiaState } from './HexodiaState';
import { HexodiaMove } from './HexodiaMove';
import { Coord } from 'src/app/jscaip/Coord';
import { HexodiaConfig, HexodiaRules } from './HexodiaRules';
import { TutorialStepMessage } from 'src/app/components/wrapper-components/tutorial-game-wrapper/TutorialStepMessage';
import { FourStatePiece } from 'src/app/jscaip/FourStatePiece';

const _: FourStatePiece = FourStatePiece.EMPTY;
const O: FourStatePiece = FourStatePiece.ZERO;
const X: FourStatePiece = FourStatePiece.ONE;
const N: FourStatePiece = FourStatePiece.UNREACHABLE;
const defaultConfig: MGPOptional<HexodiaConfig> = HexodiaRules.get().getDefaultRulesConfig();
const initialState: HexodiaState = HexodiaRules.get().getInitialState(defaultConfig);

export class HexodiaTutorial extends Tutorial {

    public tutorial: TutorialStep[] = [
        TutorialStep.informational(
            TutorialStepMessage.INITIAL_BOARD_AND_OBJECT_OF_THE_GAME(),
            $localize`Hexodia is played on a hexagonal board, your goal is to be the first to align 6 of your pieces.`,
            initialState,
        ),
        TutorialStep.anyMove(
            $localize`First turn`,
            $localize`At the first turn, the first player plays only one piece.<br/><br/>You're playing Dark, place your first piece by clicking on a space.`,
            initialState,
            HexodiaMove.of([new Coord(12, 12)]),
            TutorialStepMessage.CONGRATULATIONS(),
        ),
        TutorialStep.fromMove(
            $localize`Next turns`,
            $localize`On all following turns, the players play two pieces, until a victory or a draw is reached.<br/><br/>You're playing Light, do the winning move.`,
            new HexodiaState([
                [N, N, N, N, N, N, N, N, N, N, N, N, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [N, N, N, N, N, N, N, N, N, N, N, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [N, N, N, N, N, N, N, N, N, N, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [N, N, N, N, N, N, N, N, N, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [N, N, N, N, N, N, N, N, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [N, N, N, N, N, N, N, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [N, N, N, N, N, N, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [N, N, N, N, N, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [N, N, N, N, _, _, _, _, _, X, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [N, N, N, _, _, _, _, _, _, _, O, _, X, O, _, _, _, _, _, _, _, _, _, _, _],
                [N, N, _, _, _, _, _, _, _, _, _, O, O, _, _, X, O, _, _, _, _, _, _, _, _],
                [N, _, _, _, _, _, _, _, _, _, X, O, O, O, O, X, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, X, O, O, O, O, X, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, X, _, X, O, X, X, _, _, _, _, _, _, _, _, _, N],
                [_, _, _, _, _, _, _, _, _, _, _, O, X, O, _, _, _, _, _, _, _, _, _, N, N],
                [_, _, _, _, _, _, _, _, _, _, X, _, X, _, O, _, _, _, _, _, _, _, N, N, N],
                [_, _, _, _, _, _, _, _, _, _, _, _, X, X, _, X, _, _, _, _, _, N, N, N, N],
                [_, _, _, _, _, _, _, _, _, _, _, _, X, _, _, _, _, _, _, _, N, N, N, N, N],
                [_, _, _, _, _, _, _, _, _, _, _, _, O, _, _, _, _, _, _, N, N, N, N, N, N],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, N, N, N, N, N, N, N],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, N, N, N, N, N, N, N, N],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, N, N, N, N, N, N, N, N, N],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, N, N, N, N, N, N, N, N, N, N],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, N, N, N, N, N, N, N, N, N, N, N],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, N, N, N, N, N, N, N, N, N, N, N, N],
            ], 21),
            [HexodiaMove.of([new Coord(10, 16), new Coord(11, 15)])],
            TutorialStepMessage.CONGRATULATIONS(),
            TutorialStepMessage.FAILED_TRY_AGAIN(),
        ),
        TutorialStep.fromMove(
            $localize`Hexagonal Diagonals`,
            $localize`But an unusual kind of diagonal also exist in Hexodia. Here, Dark has made alignment in each of those three direction, in only one a victory is still possible.<br/><br/>You're playing Dark, do the winning move.`,
            new HexodiaState([
                [N, N, N, N, N, N, N, N, N, N, N, N, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [N, N, N, N, N, N, N, N, N, N, N, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [N, N, N, N, N, N, N, N, N, N, _, _, _, _, _, _, _, X, _, _, _, _, _, _, _],
                [N, N, N, N, N, N, N, N, N, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [N, N, N, N, N, N, N, N, _, _, _, _, _, _, _, _, O, _, _, _, _, _, _, _, _],
                [N, N, N, N, N, N, N, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [N, N, N, N, N, N, _, _, _, _, _, _, _, _, _, O, _, _, _, _, _, _, _, _, _],
                [N, N, N, N, N, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [N, N, N, N, _, _, _, _, _, _, _, _, _, _, O, _, _, _, _, _, _, _, _, _, _],
                [N, N, N, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
                [N, N, _, _, _, _, _, _, _, _, _, _, _, O, _, _, _, _, _, _, _, _, _, _, _],
                [N, _, _, _, _, _, _, _, _, _, _, X, _, _, X, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, _, _, O, _, _, _, _, _, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _, _, _, O, _, _, O, _, _, _, _, _, _, _, _, _, _, N],
                [_, _, _, _, _, _, _, _, O, _, _, X, _, _, O, _, _, _, _, _, _, _, _, N, N],
                [_, _, _, _, _, _, O, _, _, _, _, _, _, _, _, O, _, _, _, _, _, _, N, N, N],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, O, _, _, _, _, N, N, N, N],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, X, _, _, N, N, N, N, N],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, N, N, N, N, N, N],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, N, N, N, N, N, N, N],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, N, N, N, N, N, N, N, N],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, N, N, N, N, N, N, N, N, N],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, N, N, N, N, N, N, N, N, N, N],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, _, N, N, N, N, N, N, N, N, N, N, N],
                [_, _, _, _, _, _, _, _, _, _, _, _, _, N, N, N, N, N, N, N, N, N, N, N, N],
            ], 20),
            [HexodiaMove.of([new Coord(2, 17), new Coord(4, 16)])],
            TutorialStepMessage.CONGRATULATIONS(),
            TutorialStepMessage.FAILED_TRY_AGAIN(),
        ),
    ];
}
