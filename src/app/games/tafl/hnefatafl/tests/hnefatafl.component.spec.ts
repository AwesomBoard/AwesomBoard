/* eslint-disable max-lines-per-function */
import { HnefataflComponent } from '../hnefatafl.component';
import { HnefataflRules } from '../HnefataflRules';
import { HnefataflMove } from '../HnefataflMove';
import { Coord } from 'src/app/jscaip/Coord';
import { TaflPawn } from '../../TaflPawn';
import { DoTaflTests, TaflTestEntries } from '../../tests/GenericTaflTest.spec';
import { TaflState } from '../../TaflState';

const _: TaflPawn = TaflPawn.UNOCCUPIED;
const x: TaflPawn = TaflPawn.PLAYER_ZERO_PAWN;
const i: TaflPawn = TaflPawn.PLAYER_ONE_PAWN;
const A: TaflPawn = TaflPawn.PLAYER_ONE_KING;
const stateReadyForCapture: TaflState = new TaflState([
    [_, A, _, _, _, _, _, _, _, _, _],
    [_, x, x, _, _, _, _, _, _, _, _],
    [_, _, i, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _],
], 1);

const hnefataflEntries: TaflTestEntries<HnefataflComponent, HnefataflRules, HnefataflMove> = {
    gameName: 'Hnefatafl',
    component: HnefataflComponent,
    secondPlayerPiece: new Coord(5, 3),
    validFirstCoord: new Coord(3, 0),
    moveProvider: HnefataflMove.from,
    validSecondCoords: [
        new Coord(1, 0),
        new Coord(2, 0),
        new Coord(3, 1),
        new Coord(3, 2),
        new Coord(3, 3),
        new Coord(3, 4),
    ],
    diagonalSecondCoord: new Coord(2, 1),
    stateReadyForCapture,
    capture: HnefataflMove.from(new Coord(1, 0), new Coord(2, 0)).get(),
    firstCaptured: new Coord(2, 1),
    otherPlayerPiece: new Coord(7, 0),
    stateReadyForJumpOver: stateReadyForCapture,
    jumpOver: HnefataflMove.from(new Coord(1, 0), new Coord(1, 4)).get(),
};
DoTaflTests(hnefataflEntries);
