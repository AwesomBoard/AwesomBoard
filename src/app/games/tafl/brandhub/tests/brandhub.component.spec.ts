/* eslint-disable max-lines-per-function */
import { BrandhubComponent } from '../brandhub.component';
import { BrandhubRules } from '../BrandhubRules';
import { BrandhubMove } from '../BrandhubMove';
import { Coord } from 'src/app/jscaip/Coord';
import { TaflPawn } from '../../TaflPawn';
import { DoTaflTests, TaflTestEntries } from '../../tests/GenericTaflTest.spec';
import { TaflState } from '../../TaflState';

const _: TaflPawn = TaflPawn.UNOCCUPIED;
const x: TaflPawn = TaflPawn.PLAYER_ZERO_PAWN;
const i: TaflPawn = TaflPawn.PLAYER_ONE_PAWN;
const A: TaflPawn = TaflPawn.PLAYER_ONE_KING;
const stateReadyForCapture: TaflState = new TaflState([
    [_, A, _, _, _, _, _],
    [_, x, x, _, _, _, _],
    [_, _, i, _, _, _, _],
    [_, _, _, _, _, _, _],
    [_, _, _, _, _, _, _],
    [_, _, _, _, _, _, _],
    [_, _, _, _, _, _, _],
], 1);

const brandhubEntries: TaflTestEntries<BrandhubComponent, BrandhubRules, BrandhubMove> = {
    gameName: 'Brandhub',
    component: BrandhubComponent,
    secondPlayerPiece: new Coord(3, 2),
    validFirstCoord: new Coord(3, 0),
    moveProvider: BrandhubMove.from,
    validSecondCoords: [new Coord(1, 0), new Coord(2, 0), new Coord(4, 0), new Coord(5, 0)], // TODO use all elements
    diagonalSecondCoord: new Coord(2, 1),
    stateReadyForCapture,
    capture: BrandhubMove.from(new Coord(1, 0), new Coord(2, 0)).get(),
    firstCaptured: new Coord(2, 1),
    otherPlayerPiece: new Coord(3, 1),
    stateReadyForJumpOver: stateReadyForCapture,
    jumpOver: BrandhubMove.from(new Coord(1, 0), new Coord(1, 4)).get(),
};
DoTaflTests(brandhubEntries);
