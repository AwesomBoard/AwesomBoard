import { KamisadoMove } from 'src/app/games/kamisado/kamisado-move/KamisadoMove';
import { KamisadoColor } from 'src/app/games/kamisado/KamisadoColor';
import { KamisadoPartSlice } from 'src/app/games/kamisado/KamisadoPartSlice';
import { KamisadoPiece } from 'src/app/games/kamisado/KamisadoPiece';
import { Coord } from 'src/app/jscaip/coord/Coord';
import { MGPOptional } from 'src/app/utils/mgp-optional/MGPOptional';
import { DidacticialStep } from '../DidacticialStep';

const __: number = KamisadoPiece.NONE.getValue();
const or: number = KamisadoPiece.ZERO.ORANGE.getValue();
const Or: number = KamisadoPiece.ONE.ORANGE.getValue();
const bl: number = KamisadoPiece.ZERO.BLUE.getValue();
const Bl: number = KamisadoPiece.ONE.BLUE.getValue();
const pu: number = KamisadoPiece.ZERO.PURPLE.getValue();
const Pu: number = KamisadoPiece.ONE.PURPLE.getValue();
const pi: number = KamisadoPiece.ZERO.PINK.getValue();
const Pi: number = KamisadoPiece.ONE.PINK.getValue();
const ye: number = KamisadoPiece.ZERO.YELLOW.getValue();
const Ye: number = KamisadoPiece.ONE.YELLOW.getValue();
const re: number = KamisadoPiece.ZERO.RED.getValue();
const Re: number = KamisadoPiece.ONE.RED.getValue();
const gr: number = KamisadoPiece.ZERO.GREEN.getValue();
const Gr: number = KamisadoPiece.ONE.GREEN.getValue();
const br: number = KamisadoPiece.ZERO.BROWN.getValue();
const Br: number = KamisadoPiece.ONE.BROWN.getValue();

export const kamisadoDidacticial: DidacticialStep[] = [
    new DidacticialStep(
        'But du jeu',
        `À Kamisado, il y a deux façons de gagner: soit en plaçant une de vos pièces sur la ligne de départ de
         l'adversaire, soit en forçant l'adversaire à faire un coup qui empêche tout déplacement futur dans le jeu.
         Ici, le joueur noir gagne car il a sa pièce rouge sur la ligne de départ du joueur blanc.`,
        new KamisadoPartSlice(5, KamisadoColor.ORANGE, MGPOptional.of(new Coord(1, 3)), false, [
            [__, re, __, __, __, __, __, __],
            [__, __, __, __, __, __, __, __],
            [__, __, __, Ye, Gr, or, Or, __],
            [bl, __, __, Bl, __, __, __, pi],
            [pu, __, Pu, __, ye, __, __, Pi],
            [__, __, __, __, __, __, Re, gr],
            [__, __, __, __, br, __, Br, __],
            [__, __, __, __, __, __, __, __],
        ]),
        [], [], '', ''),
    new DidacticialStep(
        'Plateau de départ et déplacement initial',
        `Voici le plateau de départ.
         À Kamisado, les pièces ne peuvent se déplacer que vers l'avant, orthogonalement ou diagonalement.
         Vous jouez avec les pièces noires, vous pouvez faire votre premier déplacement:
         avancez votre pièce bleue de deux cases.`,
        KamisadoPartSlice.getInitialSlice(),
        [KamisadoMove.of(new Coord(6, 7), new Coord(6, 5))],
        [],
        `Parfait! Notez bien que chacune de vos pièces a une couleur différente.`,
        `Vous n'avez pas avancé votre pièce bleue de deux cases`),
    new DidacticialStep(
        'Déplacement',
        `Considérons maintenant le coup du joueur blanc, après le déplacement de la pièce bleue.
         Tous les déplacements après le déplacement initial se font obligatoirement à partir de la pièce correspondant
         à la couleur sur laquelle le dernier déplacement s'est terminé. Ici, le déplacement précédent s'étant terminé
         sur une case rose, c'est au pion rose de se déplacer. Il est d'ailleurs déjà sélectionné. Déplacez-le
         jusqu'à la case bleue.`,
        new KamisadoPartSlice(1, KamisadoColor.PINK, MGPOptional.of(new Coord(3, 0)), false, [
            [Or, Bl, Pu, Pi, Ye, Re, Gr, Br],
            [__, __, __, __, __, __, __, __],
            [__, __, __, __, __, __, __, __],
            [__, __, __, __, __, __, __, __],
            [__, __, __, __, __, __, __, __],
            [__, __, __, __, __, __, bl, __],
            [__, __, __, __, __, __, __, __],
            [br, gr, re, ye, pi, pu, __, or],
        ]),
        [KamisadoMove.of(new Coord(3, 0), new Coord(3, 6))],
        [],
        'Parfait!',
        `Vous n'avez pas avancé votre pièce rose sur la case bleue`),
    new DidacticialStep(
        'Blocage',
        `Noir s'est déplacé sur une autre case rose, et vous oblige donc à déplacer votre pièce rose.
         Cependant, votre pièce rose est bloquée ! Dans ce cas ci, vous êtes obligé de passer votre tour.
         Noir devra jouer son prochain tour en déplaçant lui-même sa pièce rose.`,
        new KamisadoPartSlice(1, KamisadoColor.PINK, MGPOptional.empty(), false, [
            [Or, Bl, Pu, __, Ye, Re, Gr, Br],
            [__, __, __, __, __, __, __, __],
            [__, __, __, __, __, __, __, __],
            [__, __, __, __, __, __, __, __],
            [__, __, __, __, __, __, __, bl],
            [__, __, __, __, __, __, __, __],
            [__, __, __, Pi, __, __, __, __],
            [br, gr, re, ye, pi, pu, __, or],
        ]),
        [KamisadoMove.PASS],
        [],
        'Parfait!',
        `Vous n'avez pas avancé votre pièce rose sur la case bleue`),
    new DidacticialStep(
        'Victoire par blocage',
        `À tout moment, si un joueur provoque un blocage total du jeu, c'est-à-dire qu'il vous oblige à
         déplacer une pièce que vous ne pouvez bouger, et que lui-même ne peut pas déplacer sa pièce de
         la même couleur, ce joueur perd. Ici, en jouant avec les pions noirs, vous pouvez obliger votre adversaire à
         provoquer cette situation et donc l'obliger à perdre ! Essayez de faire ce mouvement.`,
        new KamisadoPartSlice(2, KamisadoColor.RED, MGPOptional.of(new Coord(2, 4)), false, [
            [__, Bl, Pu, __, Ye, Re, __, __],
            [__, __, __, __, __, __, __, __],
            [__, __, __, Pi, __, Pu, __, __],
            [__, __, __, ye, __, __, __, __],
            [__, __, re, __, __, __, __, __],
            [__, __, __, __, __, __, Gr, __],
            [Or, __, __, __, __, pi, __, Br],
            [br, gr, __, __, __, __, bl, or],
        ]),
        [KamisadoMove.of(new Coord(2, 4), new Coord(0, 2))],
        [],
        `Parfait! Blanc est obligé d'avancer son pion vert sur la case orange, vous obligeant à joueur avec
         votre pion orange. Hors, votre pion orange est bloqué et vous devez donc passer votre tour. Blanc
         devra ensuite aussi passer son tour car son pion orange est aussi bloqué : la partie est totalement
         bloquée. Dans ce cas, le dernier joueur à avoir déplacé une pièce perd la partie. Ici, blanc a déplacé
         sa pièce verte en dernier, vous êtes donc vainqueurs !`,
        `Raté !`),
];
