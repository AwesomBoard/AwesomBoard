import { SiamMove } from 'src/app/games/siam/SiamMove';
import { SiamPiece } from 'src/app/games/siam/SiamPiece';
import { SiamState } from 'src/app/games/siam/SiamState';
import { Orthogonal } from 'src/app/jscaip/Orthogonal';
import { MGPOptional } from '@everyboard/lib';
import { Tutorial, TutorialStep } from '../../components/wrapper-components/tutorial-game-wrapper/TutorialStep';
import { SiamConfig, SiamRules } from './SiamRules';
import { TutorialStepMessage } from 'src/app/components/wrapper-components/tutorial-game-wrapper/TutorialStepMessage';

const _: SiamPiece = SiamPiece.EMPTY;
const M: SiamPiece = SiamPiece.MOUNTAIN;

const U: SiamPiece = SiamPiece.LIGHT_UP;
const L: SiamPiece = SiamPiece.LIGHT_LEFT;
const R: SiamPiece = SiamPiece.LIGHT_RIGHT;
const D: SiamPiece = SiamPiece.LIGHT_DOWN;

const u: SiamPiece = SiamPiece.DARK_UP;
const l: SiamPiece = SiamPiece.DARK_LEFT;
const r: SiamPiece = SiamPiece.DARK_RIGHT;
const d: SiamPiece = SiamPiece.DARK_DOWN;

const defaultConfig: MGPOptional<SiamConfig> = SiamRules.get().getDefaultRulesConfig();

export class SiamTutorial extends Tutorial {
    public tutorial: TutorialStep[] = [
        TutorialStep.informational(
            TutorialStepMessage.OBJECT_OF_THE_GAME(),
            $localize`The goal at Siam is to be the first to push a mountain out of the board. The initial board contains three mountains, and no pieces are initially on the board. During its turn, a player can do one of the following actions:<ol><li>Put a new piece on the board.</li><li>Change the orientation of one of its piece</li><li>Move one of its piece and optionally reorient it.</li><li>Take one of its pieces out of the board.</li></ol>`,
            SiamRules.get().getInitialState(defaultConfig),
        ),
        TutorialStep.anyMove(
            $localize`Inserting a piece`,
            $localize`Each player has 5 pieces in total. As long as you have remaining pieces next to the board, you can insert new pieces. To do so:<ol><li>Click on one of your pieces from your reserve, next to board.</li><li>Click on one of the highlighted squares to select a landing for your piece.</li><li>Select an orientation for your piece by clicking on one of the arrows that appear on top of the board.</li></ol><br/>You're playing Dark, insert a piece on the board.`,
            SiamRules.get().getInitialState(defaultConfig),
            SiamMove.of(2, -1, MGPOptional.of(Orthogonal.DOWN), Orthogonal.DOWN),
            TutorialStepMessage.CONGRATULATIONS(),
        ),
        TutorialStep.fromMove(
            $localize`Moving a piece`,
            $localize`We will distinguish here "moving" and "pushing". A move is made from a piece's square to an empty neighboring square, horizontally or vertically. You can also move a piece out of the board. To move a piece:<ol><li>Click on it.</li><li>Click on the square on which you want the piece to move. You can also click a second time on your piece to change its orientation without moving it.</li><li>Select the orientation of your piece by clicking one one of the arrows that appear on top of the board.</li></ol><br/>You're playing Dark. Try to move your piece that is already on the board one square upwards and to orient it to the left.`,
            new SiamState([
                [_, _, _, _, _],
                [_, _, _, _, _],
                [_, M, M, M, _],
                [_, _, _, _, _],
                [_, _, u, _, _],
            ], 0),
            [SiamMove.of(2, 4, MGPOptional.of(Orthogonal.UP), Orthogonal.LEFT)],
            $localize`Congratulations, you made a side-slip!`,
            TutorialStepMessage.FAILED_TRY_AGAIN(),
        ),
        TutorialStep.fromMove(
            $localize`Moving a piece out of the board`,
            $localize`To move a piece out of the board, you do not have to pick an orientation after the move.<br/><br/> You're playing Dark, get that piece out of the board!`,
            new SiamState([
                [_, _, _, _, _],
                [_, _, _, _, _],
                [_, M, M, M, _],
                [_, _, _, _, _],
                [_, _, u, _, _],
            ], 0),
            [SiamMove.of(2, 4, MGPOptional.of(Orthogonal.DOWN), Orthogonal.DOWN)],
            $localize`Congratulations, even if in this context it was not a useful move.`,
            $localize`Failed, the piece is still on the board.`,
        ),
        TutorialStep.fromMove(
            $localize`Pushing` + ' (1/2)',
            $localize`When the landing square of your move is occupied, we use the term "push". In order to push player pieces, the following conditions must hold:<ol><li>Your piece must already be oriented in the direction of the push.</li><li>Along the line that you are pushing, the number of pieces (yours or your opponent's) that are oriented in the same way as the push should be strictly greater than the number of pieces oriented in the opposite way.</li></ol>Look closely at the board. On the first row, you cannot push as there is exactly one piece in the opposite direction. On the second row, you can push because there are two pieces against one.<br/><br/>You're playing Dark. Vertically, you can push using your piece in the center, as there is no resistance on that axis. Do it.`,
            new SiamState([
                [_, r, L, _, _],
                [r, R, L, _, _],
                [_, _, u, _, _],
                [_, _, _, _, _],
                [_, _, _, _, _],
            ], 0),
            [SiamMove.of(2, 2, MGPOptional.of(Orthogonal.UP), Orthogonal.UP)],
            TutorialStepMessage.CONGRATULATIONS(),
            TutorialStepMessage.FAILED_TRY_AGAIN(),
        ),
        TutorialStep.fromMove(
            $localize`Pushing` + ' (2/2)',
            $localize`To be able to push a mountain, you need at least one pusher per mountain. Each resistant (pieces in the opposite way) cancel the force of one pusher. In short, if there is no mountain, you need strictly more pushers than resistants. If there is a mountain, you need at least as much pushers than there are resistants and mountains. On the following board, as Dark, you can push the mountain on the first row. On the second and third row, because of the resisting forces, you cannot push. On the fourth row, you can push as there is one more pusher than resistant pieces.<br/><br/>You're playing Dark, push on the fourth row it.`,
            new SiamState([
                [_, _, r, M, _],
                [_, _, r, M, l],
                [_, r, M, M, _],
                [_, r, R, L, M],
                [_, _, _, _, _],
            ], 0),
            [SiamMove.of(1, 3, MGPOptional.of(Orthogonal.RIGHT), Orthogonal.RIGHT)],
            $localize`Congratulations! Note that this move made you lose the game, you will see why in the next step.`,
            TutorialStepMessage.FAILED_TRY_AGAIN(),
        ),
        TutorialStep.fromMove(
            $localize`Victory`,
            $localize`The game ends when a mountain is pushed out of the board. If you pushed it and nobody is in front of you, you're the winner. However, if you were pushing an opponent oriented in the same direction as you, your opponent will win because that piece is closer to the mountain. However, if that opponent is closer to the mountain but not oriented toward it, victory will be yours.<br/><br/>Here, playing Dark, you can push a mountain off the board and either win, or lose. Choose correctly!`,
            new SiamState([
                [_, _, _, _, _],
                [_, _, _, _, _],
                [M, U, l, _, d],
                [_, _, _, _, D],
                [_, _, _, _, M],
            ], 0),
            [SiamMove.of(2, 2, MGPOptional.of(Orthogonal.LEFT), Orthogonal.LEFT)],
            TutorialStepMessage.CONGRATULATIONS_YOU_WON(),
            $localize`Failed, you lost.`,
        ),
    ];
}
