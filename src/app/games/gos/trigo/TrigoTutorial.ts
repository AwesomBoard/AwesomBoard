import { MGPOptional } from '@everyboard/lib';
import { GoState } from 'src/app/games/gos/GoState';
import { GoPiece } from '../GoPiece';
import { Tutorial, TutorialStep } from '../../../components/wrapper-components/tutorial-game-wrapper/TutorialStep';
import { PlayerNumberMap } from 'src/app/jscaip/PlayerMap';
import { TrigoConfig, TrigoRules } from './TrigoRules';
import { GoPhase } from '../GoPhase';

const X: GoPiece = GoPiece.LIGHT;
const O: GoPiece = GoPiece.DARK;
const _: GoPiece = GoPiece.EMPTY;
const N: GoPiece = GoPiece.UNREACHABLE;

const defaultConfig: MGPOptional<TrigoConfig> = TrigoRules.get().getDefaultRulesConfig();

export class TrigoTutorial extends Tutorial {

    public tutorial: TutorialStep[] = [
        TutorialStep.informational(
            $localize`Preliminary information`,
            $localize`The game of Trigo is a triangular adaptation of the game of Go. Go is present on Everyboard, you can go learn it <a href="/tutorial/Go">here<a/>. This tutorial will only review the small differences that this experimental adaptation induced.`,
            TrigoRules.get().getInitialState(defaultConfig),
        ),
        TutorialStep.informational(
            $localize`Freedom` + ' (1/4)',
            $localize`Since the board is triangular, pieces have only one freedom in the corners.`,
            new GoState([
                [N, N, N, N, N, N, _, N, N, N, N, N, N],
                [N, N, N, N, N, _, _, _, N, N, N, N, N],
                [N, N, N, N, _, _, _, _, _, N, N, N, N],
                [N, N, N, _, _, _, _, _, _, _, N, N, N],
                [N, N, _, _, _, _, _, _, _, _, _, N, N],
                [N, _, _, _, _, _, _, _, _, _, _, _, N],
                [O, _, _, _, _, _, _, _, _, _, _, _, X],
            ], PlayerNumberMap.of(0, 0), 0, MGPOptional.empty(), GoPhase.PLAYING),
        ),
        TutorialStep.informational(
            $localize`Freedom` + ' (2/4)',
            $localize`Since the board is triangular, pieces have only two freedoms on the edges.<br/> When pieces touch the board's edge with their corner only, like the pieces on the right, they're not really on the edges.`,
            new GoState([
                [N, N, N, N, N, N, _, N, N, N, N, N, N],
                [N, N, N, N, N, O, _, _, N, N, N, N, N],
                [N, N, N, N, _, _, _, _, _, N, N, N, N],
                [N, N, N, X, _, _, _, _, O, _, N, N, N],
                [N, N, _, _, _, _, _, _, _, _, _, N, N],
                [N, O, _, _, _, _, _, _, _, _, X, _, N],
                [_, _, _, _, O, _, _, _, X, _, _, _, _],
            ], PlayerNumberMap.of(0, 0), 0, MGPOptional.empty(), GoPhase.PLAYING),
        ),
        TutorialStep.informational(
            $localize`Freedom` + ' (3/4)',
            $localize`Since the board is triangular, pieces have three freedoms when they don't touch the edge.`,
            new GoState([
                [N, N, N, N, N, N, _, N, N, N, N, N, N],
                [N, N, N, N, N, _, _, _, N, N, N, N, N],
                [N, N, N, N, _, _, O, _, _, N, N, N, N],
                [N, N, N, _, _, _, _, _, _, _, N, N, N],
                [N, N, _, _, _, _, _, _, _, _, _, N, N],
                [N, _, _, X, _, _, _, _, _, _, _, _, N],
                [_, _, _, _, _, _, _, _, _, _, _, _, _],
            ], PlayerNumberMap.of(0, 0), 0, MGPOptional.empty(), GoPhase.PLAYING),
        ),
        TutorialStep.informational(
            $localize`Freedom` + ' (4/4)',
            $localize`Since the board is triangular, groups of two pieces have only one more freedom (making an atari a shisho by default).`,
            new GoState([
                [N, N, N, N, N, N, O, N, N, N, N, N, N],
                [N, N, N, N, N, _, O, _, N, N, N, N, N],
                [N, N, N, N, _, _, _, _, _, N, N, N, N],
                [N, N, N, _, _, _, _, O, _, _, N, N, N],
                [N, N, O, O, _, _, _, O, _, _, _, N, N],
                [N, _, _, _, _, _, _, _, _, _, _, _, N],
                [_, _, _, _, _, _, _, _, _, _, _, _, _],
            ], PlayerNumberMap.of(0, 0), 0, MGPOptional.empty(), GoPhase.PLAYING),
        ),
    ];
}
