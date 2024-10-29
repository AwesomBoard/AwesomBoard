import { QuartoMove } from 'src/app/games/quarto/QuartoMove';
import { QuartoState } from 'src/app/games/quarto/QuartoState';
import { QuartoPiece } from 'src/app/games/quarto/QuartoPiece';
import { Tutorial, TutorialStep } from '../../components/wrapper-components/tutorial-game-wrapper/TutorialStep';
import { TutorialStepMessage } from 'src/app/components/wrapper-components/tutorial-game-wrapper/TutorialStepMessage';
import { MGPValidation } from '@everyboard/lib';
import { Coord } from 'src/app/jscaip/Coord';

const AAAA: QuartoPiece = QuartoPiece.AAAA;
const AAAB: QuartoPiece = QuartoPiece.AAAB;
const AABA: QuartoPiece = QuartoPiece.AABA;
const AABB: QuartoPiece = QuartoPiece.AABB;
const ABAA: QuartoPiece = QuartoPiece.ABAA;
const ABAB: QuartoPiece = QuartoPiece.ABAB;
const ABBA: QuartoPiece = QuartoPiece.ABBA;
const BAAA: QuartoPiece = QuartoPiece.BAAA;
const BAAB: QuartoPiece = QuartoPiece.BAAB;
const BABB: QuartoPiece = QuartoPiece.BABB;
const BBAA: QuartoPiece = QuartoPiece.BBAA;
const BBAB: QuartoPiece = QuartoPiece.BBAB;
const BBBA: QuartoPiece = QuartoPiece.BBBA;
const BBBB: QuartoPiece = QuartoPiece.BBBB;
const ____: QuartoPiece = QuartoPiece.EMPTY;

export class QuartoTutorial extends Tutorial {

    public tutorial: TutorialStep[] = [
        TutorialStep.informational(
            TutorialStepMessage.OBJECT_OF_THE_GAME(),
            $localize`Quarto is an alignment game. The goal is to align four pieces that have at least one common aspect:<ul><li>their color (light or dark),</li><li>their size (big or small),</li><li>their pattern (empty or dotted),</li><li>their shape (round or square).</li></ul>Here, we have a board with a victory by an alignment of dark pieces. Note that the pieces are not owned by any player.`,
            new QuartoState([
                [BBBA, BBAA, ABAA, AABA],
                [____, ____, ____, ____],
                [____, ____, ____, ____],
                [____, ____, ____, ____],
            ], 7, ABAB),
        ),
        TutorialStep.anyMove(
            $localize`Placement`,
            $localize`Every placement occurs in two steps: placing the piece you have in hand (in the small square) on a square of the board, and picking a piece that the opponent will have to place, by clicking on one of the pieces inside the dotted square. If you prefer, the order of these two steps can be reversed. Keep in mind that the second click confirms the move.<br/><br/> Make a move.`,
            new QuartoState([
                [BBBA, AABB, ABBA, ____],
                [____, ____, ____, ____],
                [____, BAAA, ____, ____],
                [____, ____, ____, ____],
            ], 7, ABAA),
            new QuartoMove(2, 2, BAAB),
            $localize`Perfect!`,
        ),
        TutorialStep.fromMove(
            $localize`Situation`,
            $localize`We have here a tricky situation.<br/><br/>Analyze the board and play your move, carefully paying attention not to let the opponent win on the next move.`,
            new QuartoState([
                [BBBB, BBBA, BBAB, ____],
                [ABAA, BABB, BBAA, ____],
                [ABAB, BAAA, BAAB, ____],
                [____, ____, ____, ____],
            ], 7, AABA),
            [new QuartoMove(3, 3, AABB)],
            $localize`Well done!`,
            $localize`Failed! Your opponent can either align:<ul><li>the squares horizontally on the third line or vertically on the third column,</li><li>small pieces horizontally on the first line or vertically on the second or third column,</li><li>empty pieces horizontally on the first line or vertically on the first column,</li><li>clear pieces diagonally.</li></ul>`,
        ),
        TutorialStep.fromPredicate(
            TutorialStepMessage.RULES_CONFIGURATION(),
            $localize`A game of Quarto can be configured to make it more complicated for one or both players.<br/>When you create a game and you want to change the original configuration, you can add a level to one or both players. When your level increases, it becomes easier for you to win. So, if the first player is weaker at this game, make the first player play at level two and the game will be more even and interesting.<br/>At level two, a player can win by grouping pieces with a common criterion on a 2x2 square.<br/>In this board, Light can win by making a square.<br/><br/>You're playing Light, win.`,
            new QuartoState([
                [AAAA, AAAB, ____, ____],
                [AABA, ____, ____, ____],
                [____, ____, ____, ____],
                [____, ____, ____, ____],
            ], 7, AAAA),
            new QuartoMove(1, 1, AABB),
            (move: QuartoMove) => {
                if (move.coord.equals(new Coord(1, 1))) {
                    return MGPValidation.SUCCESS;
                } else {
                    return MGPValidation.failure($localize`Wrong, you could have won by making a square.`);
                }
            },
            $localize`Well done!`,
        ),
    ];
}
