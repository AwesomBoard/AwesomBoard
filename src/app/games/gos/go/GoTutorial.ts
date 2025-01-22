import { GoMove } from 'src/app/games/gos/GoMove';
import { GoState } from 'src/app/games/gos/GoState';
import { GoPiece } from '../GoPiece';
import { MGPOptional } from '@everyboard/lib';
import { Tutorial, TutorialStep } from '../../../components/wrapper-components/tutorial-game-wrapper/TutorialStep';
import { PlayerNumberMap } from 'src/app/jscaip/PlayerMap';
import { TutorialStepMessage } from 'src/app/components/wrapper-components/tutorial-game-wrapper/TutorialStepMessage';
import { GoConfig, GoRules } from './GoRules';
import { GoPhase } from '../GoPhase';

const X: GoPiece = GoPiece.LIGHT;
const O: GoPiece = GoPiece.DARK;
const k: GoPiece = GoPiece.DEAD_LIGHT;
const w: GoPiece = GoPiece.LIGHT_TERRITORY;
const b: GoPiece = GoPiece.DARK_TERRITORY;
const _: GoPiece = GoPiece.EMPTY;

const defaultConfig: MGPOptional<GoConfig> = GoRules.get().getDefaultRulesConfig();

export class GoTutorial extends Tutorial {

    public tutorial: TutorialStep[] = [
        TutorialStep.informational(
            $localize`Preliminary information`,
            $localize`The game of Go is played on a board called a Goban, and the stones are placed on the intersections.
        The traditional board is made of 19x19 intersections, but on this website we have the 13x13 board.
        (For shorter parts, 9x9 and 5x5 boards exist, but are not yet available here).
        For this tutorial, we will use a smaller board for pedagogical purposes.`,
            GoRules.get().getInitialState(defaultConfig),
        ),
        TutorialStep.informational(
            TutorialStepMessage.OBJECT_OF_THE_GAME(),
            $localize`The object of the game is to have the most points at the end of the game. We call "territories" the intersections that are empty and isolated from the rest of the Goban by the stones of a single player. Here, Dark has 9 territories on the left, and Light has 8 on the right. The top part belongs to no one. Each player's score at the end of the game is the sum of that player's territories and captures.`,
            new GoState([
                [_, O, _, _, X, X],
                [_, O, _, _, X, _],
                [_, O, O, X, X, _],
                [_, _, O, X, _, _],
                [_, _, O, X, _, _],
                [_, _, O, X, _, _],
            ], PlayerNumberMap.of(0, 0), 0, MGPOptional.empty(), GoPhase.PLAYING),
        ),
        TutorialStep.fromMove(
            $localize`Simple capture`,
            $localize`An isolated stone, like the one in the middle here, has 4 neighboring intersections (not 8, because we do not count diagonals).
        It is said of a group which has exactly 2 free neighboring squares, that this group has two liberties.
        If Dark plays on the last liberty of the light stone, this stone is removed from the Goban (captured) and Dark earns one point.<br/><br/>
        You're playing Dark. The light piece on the board only has one liberty left, play there.`,
            new GoState([
                [_, _, _, _, _],
                [_, _, O, _, _],
                [_, O, X, _, _],
                [_, _, O, _, _],
                [_, _, _, _, _],
            ], PlayerNumberMap.of(0, 0), 0, MGPOptional.empty(), GoPhase.PLAYING),
            [new GoMove(3, 2)],
            $localize`Congratulations, you have earned one point.`,
            $localize`Failed, try again by playing on one of the intersections directly next to the light stone.`,
        ),
        TutorialStep.fromMove(
            $localize`Capturing multiple stones`,
            $localize`Stones that are connected horizontally or vertically must be captured at the same time, and are not capturable in isolation.<br/><br/>
        You're playing Dark. The light group here only has one liberty left, capture it.`,
            new GoState([
                [_, O, _, _, _],
                [O, X, _, _, _],
                [O, X, X, O, _],
                [_, O, O, _, _],
                [_, _, _, _, _],
            ], PlayerNumberMap.of(0, 0), 0, MGPOptional.empty(), GoPhase.PLAYING),
            [new GoMove(2, 1)],
            $localize`Congratulations, you have earned three points and formed a territory.`,
            $localize`Failed, you have not captured the group. Play on the last liberty of that group.`,
        ),
        TutorialStep.informational(
            $localize`Suicide`,
            $localize`In Go, suicide is forbidden.
        If putting a piece on an intersection removes the last liberty of your group and does not capture any stone, playing on that intersection would be a suicide and is therefore forbidden.
        Here, the top left intersection is a suicide for Light.
        On the bottom right, it would be a suicide for Dark, and on the bottom left it is not a suicide for any player.`,
            new GoState([
                [_, O, _, _, _],
                [O, _, _, _, _],
                [O, _, _, _, X],
                [X, O, _, X, _],
                [_, X, _, X, O],
            ], PlayerNumberMap.of(0, 0), 0, MGPOptional.empty(), GoPhase.PLAYING),
        ),
        TutorialStep.informational(
            $localize`Life and death (death)`,
            $localize`From the capture rule follows the life and death notion:
        dead stones are stones that are definitely capturable (without losing anything else).
        Alive stones are stones that can never be captured.
        From the capture rule, Dark can play inside Light's territory and make a capture.
        In this case, we say that Light has only one eye (its last liberty) and that Light is dead (even if not yet captured).
        At the end of the game, the dead stones will count as captures, and the intersections they occupy as territories.`,
            new GoState([
                [_, _, _, _, _],
                [O, O, O, _, _],
                [X, X, O, _, _],
                [_, X, O, _, _],
                [X, X, O, _, _],
            ], PlayerNumberMap.of(0, 0), 0, MGPOptional.empty(), GoPhase.PLAYING),
        ),
        TutorialStep.informational(
            $localize`Life and death (eyes)`,
            $localize`Here, Light cannot play on the top left, nor on the bottom left.
        Light will never be able to capture Dark.
        We say that Dark has two eyes (the eye on the top left, and the one on the bottom left) and that Dark is alive.`,
            new GoState([
                [_, O, X, _, _],
                [X, O, X, _, _],
                [O, O, X, _, _],
                [X, O, X, _, _],
                [_, O, X, _, _],
            ], PlayerNumberMap.of(0, 0), 0, MGPOptional.empty(), GoPhase.PLAYING),
        ),
        TutorialStep.informational(
            $localize`Seki`,
            $localize`If Dark plays on the middle line, Light will play on the opposite intersection and capture Dark.
        Similarly, if Light plays on the middle line, Dark will capture Light.
        In other words, there is no point in playing on the middle line.
        In that case, we say that stones in the middle are alive by Seki, and that both intersections in the middle are neutral.`,
            new GoState([
                [_, X, O, _, X, O, _],
                [_, X, O, O, X, O, _],
                [_, X, O, O, X, O, _],
                [_, X, O, O, X, O, _],
                [_, X, O, X, X, O, _],
                [_, X, O, X, X, O, _],
                [_, X, O, _, X, O, _],
            ], PlayerNumberMap.of(0, 0), 0, MGPOptional.empty(), GoPhase.PLAYING),
        ),
        TutorialStep.fromMove(
            $localize`Ko`,
            $localize`A player, by putting a stone, cannot go back to an identical state of the Goban as before, in order to avoid an endless game.<br/><br/>
        You're playing Dark, capture the light stone.`,
            new GoState([
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, O, X, _, _],
                [_, _, O, X, _, X, _],
                [_, _, _, O, X, _, _],
                [_, _, _, _, _, _, _],
                [_, _, _, _, _, _, _],
            ], PlayerNumberMap.of(0, 0), 0, MGPOptional.empty(), GoPhase.PLAYING),
            [new GoMove(4, 3)],
            $localize`Now, if Light tries to recapture the stone that Dark has just put on the Goban, this one would go back to its previous state, opening the door for an endless game.
        This intersection is therefore marked with a red square, to remind the players that this intersection is forbidden.
        This rule is called the Ko.
        The trick for Light is to try to create a big enough threat so that Dark must answer immediately, and does not have the time to protect its last stone, so that Light can capture it right after.`,
            TutorialStepMessage.FAILED_TRY_AGAIN(),
        ),
        TutorialStep.fromMove(
            TutorialStepMessage.END_OF_THE_GAME(),
            $localize`When a player feels that there is no advantage to putting a new stone, that player can pass a turn.
        The game phase stops when both players pass consecutively, and we move on to the counting phase.
        The dead groups are then marked by clicking on them.
        Every intersection in a player's territory earns that player a point.
        The winner is the one with most points.<br/><br/>
        You're playing Dark. A last stone is dead, mark it.`,
            new GoState([
                [X, O, O, O, O, O, b, b, b],
                [X, X, X, X, O, O, O, b, b],
                [X, w, X, X, O, k, k, O, b],
                [O, X, X, X, X, O, b, b, b],
                [_, X, w, X, O, O, k, O, b],
                [X, w, X, X, O, O, O, O, O],
                [X, X, O, O, O, X, X, O, X],
                [O, O, O, X, X, X, w, X, X],
                [b, b, O, O, O, X, X, w, w],
            ], PlayerNumberMap.of(0, 0), 0, MGPOptional.empty(), GoPhase.COUNTING),
            [new GoMove(0, 3)],
            $localize`Congratulations, Dark has 15 territories and 3 light stones still present, called prisoners at the end of the game.
        The intersections where the prisoners are count as Dark's territory
        Light has 8 territories and 1 prisoner.
        The end result is therefore 18 - 9 for Dark.`,
            TutorialStepMessage.FAILED_TRY_AGAIN(),
        ),
    ];
}
