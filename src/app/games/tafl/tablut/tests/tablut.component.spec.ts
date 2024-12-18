/* eslint-disable max-lines-per-function */
import { TablutMove } from 'src/app/games/tafl/tablut/TablutMove';
import { Coord } from 'src/app/jscaip/Coord';
import { TablutRules } from '../TablutRules';
import { TaflPawn } from '../../TaflPawn';
import { DoTaflTests, TaflTestEntries } from '../../tests/GenericTaflTest.spec';
import { TablutComponent } from '../tablut.component';
import { TaflConfig } from '../../TaflConfig';
import { TaflState } from '../../TaflState';
import { MGPOptional } from '@everyboard/lib';

const _: TaflPawn = TaflPawn.UNOCCUPIED;
const x: TaflPawn = TaflPawn.PLAYER_ZERO_PAWN;
const i: TaflPawn = TaflPawn.PLAYER_ONE_PAWN;
const A: TaflPawn = TaflPawn.PLAYER_ONE_KING;

const defaultConfig: MGPOptional<TaflConfig> = TablutRules.get().getDefaultRulesConfig();

const tablutEntries: TaflTestEntries<TablutComponent, TablutRules, TablutMove> = {
    component: TablutComponent,
    gameName: 'Tablut',
    secondPlayerPiece: new Coord(4, 4),
    validFirstCoord: new Coord(4, 1),
    moveProvider: TablutMove.from,
    validSecondCoords: [
        new Coord(0, 1),
        new Coord(1, 1),
        new Coord(2, 1),
        new Coord(3, 1),
        new Coord(5, 1),
        new Coord(6, 1),
        new Coord(7, 1),
        new Coord(8, 1),
    ],
    diagonalSecondCoord: new Coord(5, 2),
    stateReadyForCapture: new TaflState([
        [_, A, _, _, _, _, _, _, _],
        [_, x, x, _, _, _, _, _, _],
        [_, _, i, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, _, _],
    ], 1),
    capture: TablutMove.from(new Coord(1, 0), new Coord(2, 0)).get(),
    firstCaptured: new Coord(2, 1),
    otherPlayerPiece: new Coord(5, 0),
    stateReadyForJumpOver: TablutRules.get().getInitialState(defaultConfig),
    jumpOver: TablutMove.from(new Coord(5, 0), new Coord(5, 5)).get(),
};
DoTaflTests(tablutEntries);
