import { QuartoMove } from 'src/app/games/quarto/QuartoMove';
import { QuartoState } from 'src/app/games/quarto/QuartoState';
import { QuartoPiece } from 'src/app/games/quarto/QuartoPiece';
import { TutorialStep } from '../../components/wrapper-components/tutorial-game-wrapper/TutorialStep';

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
const NONE: QuartoPiece = QuartoPiece.NONE;

export const quartoTutorial: TutorialStep[] = [
    TutorialStep.informational(
        $localize`Goal of the game`,
        $localize`Quarto is an alignment game.
        The goal is to align four pieces that have at least one common aspect:
        <ul>
          <li>their color (light or dark),</li>
          <li>their size (big or small),</li>
          <li>their pattern (empty or dotted),</li>
          <li>their shape (round or square).</li>
        </ul>
        Here, we have a board with a victory by an alignment of dark pieces.`,
        new QuartoState([
            [BBBA, BBAA, ABAA, AABA],
            [NONE, NONE, NONE, NONE],
            [NONE, NONE, NONE, NONE],
            [NONE, NONE, NONE, NONE],
        ], 7, QuartoPiece.ABAB),
    ),
    TutorialStep.anyMove(
        $localize`Placement`,
        $localize`Every placement occurs in two steps: placing the piece you have in hand (in the small square) on a square of the board,
        and picking a piece that the opponent will have to place, by clicking on one of the pieces inside the dotted square.
        If you prefer, the order of these two steps can be reversed.
        Keep in mind that the second click confirms the move.<br/><br/>
        Make a move.`,
        new QuartoState([
            [BBBA, AABB, ABBA, NONE],
            [NONE, NONE, NONE, NONE],
            [NONE, BAAA, NONE, NONE],
            [NONE, NONE, NONE, NONE],
        ], 7, QuartoPiece.ABAA),
        new QuartoMove(2, 2, QuartoPiece.BAAB),
        $localize`Perfect!`,
    ),
    TutorialStep.fromMove(
        $localize`Situation`,
        $localize`We have here a tricky situation.<br/><br/>
        Analyze the board and play your move, carefully paying attention not to let the opponent win on the next move.`,
        new QuartoState([
            [BBBB, BBBA, BBAB, NONE],
            [ABAA, BABB, BBAA, NONE],
            [ABAB, BAAA, BAAB, NONE],
            [NONE, NONE, NONE, NONE],
        ], 7, QuartoPiece.AABA),
        [new QuartoMove(3, 3, QuartoPiece.AABB)],
        $localize`Well done!`,
        $localize`Failed!`,
    ),
];
