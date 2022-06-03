import { TutorialStep } from 'src/app/components/wrapper-components/tutorial-game-wrapper/TutorialStep';
import { Coord } from 'src/app/jscaip/Coord';
import { Player } from 'src/app/jscaip/Player';
import { MGPMap } from 'src/app/utils/MGPMap';
import { MGPOptional } from 'src/app/utils/MGPOptional';
import { MGPValidation } from 'src/app/utils/MGPValidation';
import { LodestoneMove } from './LodestoneMove';
import { LodestonePiece, LodestonePieceLodestone, LodestonePieceNone, LodestonePiecePlayer } from './LodestonePiece';
import { LodestonePressurePlate, LodestonePressurePlates, LodestoneState } from './LodestoneState';

const N: LodestonePiece = LodestonePieceNone.UNREACHABLE;
const _: LodestonePiece = LodestonePieceNone.EMPTY;
const A: LodestonePiece = LodestonePiecePlayer.ZERO;
const B: LodestonePiece = LodestonePiecePlayer.ONE;
const X: LodestonePiece = LodestonePieceLodestone.of(Player.ONE, { direction: 'push', orientation: 'orthogonal' });

const allPressurePlates: LodestonePressurePlates = {
    top: MGPOptional.of(LodestonePressurePlate.EMPTY_5),
    bottom: MGPOptional.of(LodestonePressurePlate.EMPTY_5),
    left: MGPOptional.of(LodestonePressurePlate.EMPTY_5),
    right: MGPOptional.of(LodestonePressurePlate.EMPTY_5),
};

export class LodestoneTutorial {

    public tutorial: TutorialStep[] = [
        TutorialStep.informational(
            $localize`Board and aim of the game`,
            $localize`Lodestone is played on a 8x8 board, which contains so-called <i>pressure plates</i> along the board, that will contain captured pieces. The initial board is shown here. The aim of the game is to be the only player with pieces remaining on the board. To do so, you will have to either push your opponent's pieces off the board, or to crush them with your pieces. You will do it by using a lodestone.`,
            LodestoneState.getInitialState(),
        ),
        TutorialStep.forClick(
            $localize`Selecting a lodestone`,
            $localize`To perform a move, you have to place your lodestone on the board. Your lodestone has two sides: <ul><li>its <i>repelling</i> side with which it will repel the opponent's pieces (indicated by the outward triangles of your opponent's color on the lodestone), and</li><li>its <i>attracting</i> side with which it will attract your pieces (indicated by the inward triangles of your color on the lodestone).</li></ul>Your lodestone can be placed to move pieces orthogonally or diagonally. All available lodestone sides and orientation are shown below the board.<br/><br/>You're playing Dark. Select the lodestone that repels your opponent's pieces diagonally.`,
            LodestoneState.getInitialState(),
            ['#lodestone_push_diagonal'],
            $localize`Congratulations!`,
            $localize`This is not the right lodestone, try again.`,
        ),
        TutorialStep.informational(
            $localize`The repelling lodestone`,
            $localize`Upon placing a lodestone on the board, it will move all pieces it acts upon (according to its direction and orientation) simultaneously. Let us first see how the repelling lodestone acts on the pieces. All the opponent's pieces aligned with the lodestone, as indicated by the triangles' orientations, will be pushed one square away from the lodestone. An opponent's piece will be blocked in case it encounters on its way either one of your piece, a lodestone, or another blocked piece. Finally, if an opponent's piece falls out of the board, it captured.`,
            LodestoneState.getInitialState(),
        ),
        TutorialStep.informational(
            $localize`The attracting lodestone`,
            $localize`When the lodestone is on its attracting side it will pull your pieces one square towards it. In case one of your pieces encounters a lodestone on its way or another blocked piece, it is blocked. However, if it encounter an opponent's piece, it will capture it.`,
            LodestoneState.getInitialState(),
        ),
        TutorialStep.informational(
            $localize`Flipping the lodestone`,
            $localize`Note that, after every move, you must flip your lodestone: if it was on its repelling side, you must use it on its attracating side, and vice versa. Also, you are allowed to place your lodestone on the same location as it was on your previous turn.`,
            LodestoneState.getInitialState(),
        ),
        TutorialStep.fromPredicate(
            $localize`Capturing`,
            $localize`To summarize, it is possible to capture the opponent's pieces in two ways:<ul><li>with a repelling lodestone, by pushing your opponent's pieces out of the board, or</li><li>with a attracting lodestone, by moving your pieces over your opponent's pieces.</li></ul>Once a lodestone is placed and the pieces have been moved and/or captured, in case any of the opponent's pieces have been captured, you have to place them on the <i>pressure plates</i> that lie around the board. To do so, click on an empty space of the pressure plate of your choice for each capture. You can cancel this by clicking again on an piece you just put on a pressure plate.<br/><br/>You're playing Dark. Try to perform a move that captures at least one of your opponent's piece, and place your capture(s) on pressure plates.`,
            LodestoneState.getInitialState(),
            new LodestoneMove(new Coord(0, 6), 'pull', 'orthogonal', { top: 2, bottom: 1, left: 1, right: 1 }),
            (_: LodestoneMove, state: LodestoneState) => {
                if (state.remainingSpaces() === 32) {
                    return MGPValidation.failure($localize`You have not captured any of the opponent's pieces, try again!`);
                }
                return MGPValidation.SUCCESS;
            },
            `Congratulations!`,
        ),
        TutorialStep.fromPredicate(
            $localize`Crumbling a first pressure plate`,
            $localize`When a pressure plate is full, it will crumble and take a full row or column of the board with it! All pieces that are on the crumbled squares are considered lost, but will not have to be placed on pressure plates. You have here a board with a pressure plate that only requires one more piece to crumble.<br/><br/>You're playing Dark. Perform a move that captures at least one piece, and fill that pressure plate to make it crumble.`,
            new LodestoneState([
                [_, _, _, _, B, _, _, _],
                [_, _, A, _, _, B, _, _],
                [_, _, X, _, _, _, _, A],
                [_, _, _, _, B, _, _, A],
                [_, _, _, _, _, A, _, _],
                [_, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, _],
            ], 0, new MGPMap([
                { key: Player.ONE, value: new Coord(2, 2) },
            ]), {
                ...allPressurePlates,
                top: LodestonePressurePlate.EMPTY_5.addCaptured(Player.ONE, 4),
            }),
            new LodestoneMove(new Coord(6, 2), 'push', 'diagonal', { top: 1, bottom: 0, left: 0, right: 0 }),
            (_: LodestoneMove, state: LodestoneState) => {
                if (state.pressurePlates.top.get().width === 5) {
                    return MGPValidation.failure($localize`You must capture and place your capture on the top pressure plate to make it crumble!`);
                }
                return MGPValidation.SUCCESS;
            },
            `Congratulations!`,
        ),
        TutorialStep.fromPredicate(
            $localize`Crumbling a second pressure plate`,
            $localize`Once a pressure plate has crumbled, a shorter pressure plate takes it place. It is the case here, where only 3 spots are available on the top pressure plate.<br/><br/>You're playing Dark. Perform a move that captures enough pieces to fill the top pressure plate, and make it crumble.`,
            new LodestoneState([
                [N, N, N, N, N, N, N, N],
                [_, _, _, _, _, _, _, _],
                [_, _, _, _, _, _, _, A],
                [_, _, _, _, _, A, _, A],
                [_, X, _, _, B, _, _, _],
                [_, _, _, _, _, _, _, _],
                [_, _, _, _, B, _, _, _],
                [_, _, _, _, _, _, _, _],
            ], 0, new MGPMap([
                { key: Player.ONE, value: new Coord(1, 4) },
            ]), {
                ...allPressurePlates,
                top: LodestonePressurePlate.EMPTY_3.addCaptured(Player.ONE, 2),
            }),
            new LodestoneMove(new Coord(3, 5), 'pull', 'diagonal', { top: 1, bottom: 0, left: 0, right: 0 }),
            (_: LodestoneMove, state: LodestoneState) => {
                if (state.pressurePlates.top.isPresent()) {
                    return MGPValidation.failure($localize`You must capture and place your capture on the top pressure plate to make it crumble a second time!`);
                }
                return MGPValidation.SUCCESS;
            },
            `Congratulations!`,
        ),
        TutorialStep.informational(
            $localize`Minimal board`,
            $localize`After a pressure plate has crumbled for a second time, there is no more pressure plate available on that side. In case all pressure plates have crumbled, the board is reduced to a 4x4 board.`,
            new LodestoneState([
                [N, N, N, N, N, N, N, N],
                [N, N, N, N, N, N, N, N],
                [N, N, A, B, _, _, N, N],
                [N, N, X, B, _, _, N, N],
                [N, N, _, A, A, _, N, N],
                [N, N, A, _, _, _, N, N],
                [N, N, N, N, N, N, N, N],
                [N, N, N, N, N, N, N, N],
            ], 0, new MGPMap([
                { key: Player.ONE, value: new Coord(2, 3) },
            ]), {
                top: MGPOptional.empty(),
                bottom: MGPOptional.empty(),
                left: MGPOptional.empty(),
                right: MGPOptional.empty(),
            }),
        ),
        TutorialStep.fromMove(
            $localize`Making the lodestone fall`,
            $localize`If, at any point during the game, your lodestone is situated on a square that crumbles with a pressure plate, you will be allowed to select any lodestone side on your next turn.<br/><br/>In this board, playing Dark, you can place your lodestone and make a pressure plate crumble so that your lodestone falls too, allowing to choose more freely its side on your next turn. Do it!`,
            new LodestoneState([
                [_, _, _, _, _, _, _, _],
                [_, _, _, _, _, B, _, _],
                [_, _, _, X, _, _, A, _],
                [_, _, A, A, B, _, _, A],
                [_, _, _, _, _, A, _, _],
                [_, _, A, _, _, _, _, _],
                [_, _, B, _, _, _, _, _],
                [_, _, _, _, _, _, _, _],
            ], 0, new MGPMap([
                { key: Player.ONE, value: new Coord(3, 2) },
            ]), {
                ...allPressurePlates,
                top: LodestonePressurePlate.EMPTY_5.addCaptured(Player.ONE, 4),
            }),
            [new LodestoneMove(new Coord(4, 0), 'pull', 'diagonal', { top: 1, bottom: 0, left: 0, right: 0 })],
            $localize`Congratulations! At your next turn, you will be allowed to place your lodestone on any side.`,
            $localize`Failed, try again.`,
        ),
        TutorialStep.fromMove(
            $localize`End of the game`,
            $localize`In order to win, you must take out all of your opponent's pieces.<br/><br/>Here, you can win in a single move, do it!`,
            new LodestoneState([
                [N, N, N, N, N, N, N, N],
                [N, N, N, N, N, N, N, N],
                [N, B, A, B, _, _, N, N],
                [N, B, X, _, B, _, N, N],
                [N, _, _, A, A, _, N, N],
                [N, B, A, _, B, _, N, N],
                [N, _, _, _, A, _, N, N],
                [N, N, N, N, N, N, N, N],
            ], 0, new MGPMap([
                { key: Player.ONE, value: new Coord(2, 3) },
            ]), {
                top: MGPOptional.empty(),
                bottom: LodestonePressurePlate.EMPTY_3.addCaptured(Player.ZERO, 2),
                left: MGPOptional.of(LodestonePressurePlate.EMPTY_3),
                right: MGPOptional.empty(),
            }),
            [new LodestoneMove(new Coord(4, 2), 'pull', 'orthogonal', { top: 0, bottom: 0, left: 3, right: 0 })],
            $localize`Congratulations, you won!`,
            $localize`This is not the winning move. Try again.`,
        ),
    ]
}
