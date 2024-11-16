import { MGPOptional } from '@everyboard/lib';
import { DiamPiece } from 'src/app/games/diam/DiamPiece';
import { EncapsulePiece } from 'src/app/games/encapsule/EncapsulePiece';
import { HivePiece } from 'src/app/games/hive/HivePiece';
import { SiamMove } from 'src/app/games/siam/SiamMove';
import { Coord } from 'src/app/jscaip/Coord';
import { Orthogonal } from 'src/app/jscaip/Orthogonal';
import { Ordinal } from 'src/app/jscaip/Ordinal';
import { Player, PlayerOrNone } from 'src/app/jscaip/Player';

export const clickableMethods: { [gameName: string]: { [methodName: string]: unknown[]; }; } = {
    Abalone: {
        onPieceClick: [new Coord(0, 0)],
        onSpaceClick: [new Coord(0, 0)],
        onInvisibleSpaceClick: [new Coord(0, 0)],
        chooseDirection: [Ordinal.UP],
    },
    Apagos: {
        onSquareClick: [0],
        onArrowClick: [0, Player.ONE],
    },
    Awale: { onClick: [0, 0] },
    BaAwa: { onClick: [0, 0] },
    Brandhub: { onClick: [0, 0] },
    Coerceo: {
        onPyramidClick: [new Coord(0, 0)],
        onSpaceClick: [new Coord(0, 0)],
    },
    ConnectSix: { onClick: [0, 0] },
    Conspirateurs: { onClick: [new Coord(0, 0)] },
    Diaballik: {
        onClick: [0, 0],
        done: [],
    },
    Diam: {
        onSpaceClick: [0],
        onPieceInGameClick: [0, 0],
        onRemainingPieceClick: [DiamPiece.ZERO_FIRST],
    },
    Dvonn: { onClick: [0, 0] },
    Encapsule: {
        onBoardClick: [0, 0],
        onPieceClick: [0, EncapsulePiece.ofSizeAndPlayer(3, PlayerOrNone.ONE), 0],
    },
    Epaminondas: { onClick: [0, 0] },
    Gipf: { onClick: [0, 0] },
    Go: {
        onClick: [new Coord(0, 0)],
    },
    Hexodia: {
        onClick: [0, 0],
    },
    Hive: {
        selectSpace: [0, 0],
        selectPiece: [0, 0, 0],
        selectRemaining: [new HivePiece(Player.ZERO, 'QueenBee')],
    },
    Hnefatafl: { onClick: [0, 0] },
    Kalah: {
        onClick: [0, 0],
        onStoreClick: [Player.ZERO],
    },
    Kamisado: { onClick: [0, 0] },
    Lasca: { onClick: [0, 0] },
    LinesOfAction: { onClick: [0, 0] },
    Lodestone: {
        selectCoord: [new Coord(0, 0)],
        selectLodestone: ['push', false],
        onTemporaryPressurePlateClick: ['top', 1, 1],
        onPressurePlateClick: ['top', 1, 1],
    },
    MartianChess: {
        onClick: [0, 0],
        onClockClick: [],
    },
    MinimaxTesting: {
        chooseRight: [],
        chooseDown: [],
    },
    P4: { onClick: [0, 0] },
    Pentago: {
        onClick: [0, 0],
        rotate: [['not relevant', 0, true]],
        skipRotation: [],
    },
    Pente: {
        onClick: [new Coord(0, 0)],
    },
    Pylos: {
        onPieceClick: [0, 0, 0],
        onDrop: [0, 0, 0],
        validateCapture: [],
    },
    Quarto: {
        clickCoord: [0, 0],
        clickPiece: [0],
        deselectDroppedPiece: [],
    },
    Quixo: {
        onBoardClick: [0, 0],
        chooseDirection: [0],
    },
    Reversi: { onClick: [0, 0] },
    Sahara: { onClick: [0, 0] },
    Siam: {
        selectPieceForInsertion: [Player.ZERO, 0],
        selectOrientation: [SiamMove.of(0, 0, MGPOptional.of(Orthogonal.DOWN), Orthogonal.DOWN)],
        clickSquare: [0, 0],
        clickArrow: [{
            source: MGPOptional.empty(),
            target: new Coord(0, 0),
            direction: Orthogonal.DOWN,
            move: SiamMove.of(0, 0, MGPOptional.of(Orthogonal.DOWN), Orthogonal.DOWN),
        }],
    },
    Six: {
        onPieceClick: [0, 0],
        onNeighborClick: [0, 0],
    },
    Squarz: { onClick: [0, 0] },
    Tablut: { onClick: [0, 0] },
    Teeko: { onClick: [0, 0] },
    Trexo: {
        onClick: [0, 0],
    },
    Trigo: {
        onClick: [new Coord(0, 0)],
    },
    Yinsh: { onClick: [0, 0] },
};
