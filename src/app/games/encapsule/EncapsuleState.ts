import { GameStateWithTable } from 'src/app/jscaip/GameStateWithTable';
import { EncapsulePiece, Size } from 'src/app/games/encapsule/EncapsulePiece';
import { Player, PlayerOrNone } from 'src/app/jscaip/Player';
import { ArrayUtils } from 'src/app/utils/ArrayUtils';
import { MGPOptional } from 'src/app/utils/MGPOptional';
import { Utils } from 'src/app/utils/utils';
import { assert } from 'src/app/utils/assert';

export class EncapsuleState extends GameStateWithTable<EncapsuleCase> {

    private readonly remainingPieces: ReadonlyArray<EncapsulePiece>;

    constructor(board: EncapsuleCase[][], turn: number, remainingPieces: EncapsulePiece[]) {
        super(board, turn);
        this.remainingPieces = remainingPieces;
    }
    public static getInitialState(): EncapsuleState {
        const emptyCase: EncapsuleCase = new EncapsuleCase(PlayerOrNone.NONE, PlayerOrNone.NONE, PlayerOrNone.NONE);
        const emptyNumber: number = emptyCase.encode();
        const startingNumberBoard: number[][] = ArrayUtils.createTable(3, 3, emptyNumber);
        const startingBoard: EncapsuleCase[][] = ArrayUtils.mapBiArray(startingNumberBoard,
                                                                       (piece: number) => EncapsuleCase.decode(piece));
        const initialPieces: EncapsulePiece[] = [
            EncapsulePiece.BIG_BLACK, EncapsulePiece.BIG_BLACK, EncapsulePiece.BIG_WHITE,
            EncapsulePiece.BIG_WHITE, EncapsulePiece.MEDIUM_BLACK, EncapsulePiece.MEDIUM_BLACK,
            EncapsulePiece.MEDIUM_WHITE, EncapsulePiece.MEDIUM_WHITE, EncapsulePiece.SMALL_BLACK,
            EncapsulePiece.SMALL_BLACK, EncapsulePiece.SMALL_WHITE, EncapsulePiece.SMALL_WHITE,
        ];
        return new EncapsuleState(startingBoard, 0, initialPieces);
    }
    public getRemainingPieces(): EncapsulePiece[] {
        return ArrayUtils.copyImmutableArray(this.remainingPieces);
    }
    public getRemainingPiecesOfPlayer(player: Player): EncapsulePiece[] {
        return this.getRemainingPieces().filter((piece: EncapsulePiece) => piece.getPlayer() === player);
    }
    public pieceBelongsToCurrentPlayer(piece: EncapsulePiece): boolean {
        return piece.belongsTo(this.getCurrentPlayer());
    }
    public isDroppable(piece: EncapsulePiece): boolean {
        return this.pieceBelongsToCurrentPlayer(piece) && this.isInRemainingPieces(piece);
    }
    public isInRemainingPieces(piece: EncapsulePiece): boolean {
        return this.remainingPieces.some((p: EncapsulePiece) => p === piece);
    }
    public getPlayerRemainingPieces(): EncapsulePiece[] {
        return this.remainingPieces.filter((piece: EncapsulePiece) => this.pieceBelongsToCurrentPlayer(piece));
    }
}

export class EncapsuleCase {

    public static readonly EMPTY: EncapsuleCase =
        new EncapsuleCase(PlayerOrNone.NONE, PlayerOrNone.NONE, PlayerOrNone.NONE);

    public static decode(encapsuleCase: number): EncapsuleCase {
        assert(encapsuleCase % 1 === 0, 'EncapsuleCase must be encoded as integer: ' + encapsuleCase);
        assert(encapsuleCase >= 0, 'To small representation for EncapsuleCase: ' + encapsuleCase);
        assert(encapsuleCase <= 26, 'To big representation for EncapsuleCase: ' + encapsuleCase);
        const small: PlayerOrNone = Player.numberEncoder.decodeNumber(encapsuleCase%3);
        encapsuleCase -= small.value;
        encapsuleCase/=3;
        const medium: PlayerOrNone = Player.numberEncoder.decodeNumber(encapsuleCase%3);
        encapsuleCase -= medium.value;
        encapsuleCase/=3;
        const big: PlayerOrNone = Player.numberEncoder.decodeNumber(encapsuleCase);
        return new EncapsuleCase(small, medium, big);
    }
    constructor(public readonly small: PlayerOrNone,
                public readonly medium: PlayerOrNone,
                public readonly big: PlayerOrNone) {
    }
    public isEmpty(): boolean {
        return this.small === PlayerOrNone.NONE && this.medium === PlayerOrNone.NONE && this.big === PlayerOrNone.NONE;
    }
    public toList(): EncapsulePiece[] {
        const l: EncapsulePiece[] = [];
        if (this.small.isPlayer()) l.push(EncapsulePiece.ofSizeAndPlayer(Size.SMALL, this.small));
        if (this.medium.isPlayer()) l.push(EncapsulePiece.ofSizeAndPlayer(Size.MEDIUM, this.medium));
        if (this.big.isPlayer()) l.push(EncapsulePiece.ofSizeAndPlayer(Size.BIG, this.big));
        return l;
    }
    public toOrderedPieceNames(): string[] {
        const smallPiece: EncapsulePiece = EncapsulePiece.ofSizeAndPlayer(Size.SMALL, this.small);
        const mediumPiece: EncapsulePiece = EncapsulePiece.ofSizeAndPlayer(Size.MEDIUM, this.medium);
        const bigPiece: EncapsulePiece = EncapsulePiece.ofSizeAndPlayer(Size.BIG, this.big);
        return [smallPiece.toString(), mediumPiece.toString(), bigPiece.toString()];
    }
    public getBiggest(): EncapsulePiece {
        if (this.big === Player.ZERO) return EncapsulePiece.BIG_BLACK;
        if (this.big === Player.ONE) return EncapsulePiece.BIG_WHITE;
        if (this.medium === Player.ZERO) return EncapsulePiece.MEDIUM_BLACK;
        if (this.medium === Player.ONE) return EncapsulePiece.MEDIUM_WHITE;
        if (this.small === Player.ZERO) return EncapsulePiece.SMALL_BLACK;
        if (this.small === Player.ONE) return EncapsulePiece.SMALL_WHITE;
        return EncapsulePiece.EMPTY;
    }
    public tryToSuperposePiece(piece: EncapsulePiece): MGPOptional<EncapsuleCase> {
        const biggestPresent: Size = this.getBiggest().getSize();
        if (piece === EncapsulePiece.EMPTY) {
            throw new Error('Cannot move NONE on a space');
        }
        if (piece.getSize() > biggestPresent) {
            return MGPOptional.of(this.put(piece));
        } else {
            return MGPOptional.empty();
        }
    }
    public removeBiggest(): {removedCase: EncapsuleCase, removedPiece: EncapsulePiece} {
        const removedPiece: EncapsulePiece = this.getBiggest();
        if (removedPiece === EncapsulePiece.EMPTY) {
            throw new Error('Cannot removed piece from empty space');
        }
        let removedCase: EncapsuleCase;
        const size: Size = removedPiece.getSize();
        switch (size) {
            case Size.BIG:
                removedCase = new EncapsuleCase(this.small, this.medium, PlayerOrNone.NONE);
                break;
            case Size.MEDIUM:
                removedCase = new EncapsuleCase(this.small, PlayerOrNone.NONE, PlayerOrNone.NONE);
                break;
            default:
                Utils.expectToBe(size, Size.SMALL);
                removedCase = new EncapsuleCase(PlayerOrNone.NONE, PlayerOrNone.NONE, PlayerOrNone.NONE);
        }
        return { removedCase, removedPiece };
    }
    public put(piece: EncapsulePiece): EncapsuleCase {
        if (piece === EncapsulePiece.EMPTY) throw new Error('Cannot put NONE on space');
        const piecePlayer: PlayerOrNone = piece.getPlayer();
        const size: Size = piece.getSize();
        switch (size) {
            case Size.BIG:
                return new EncapsuleCase(this.small, this.medium, piecePlayer);
            case Size.MEDIUM:
                assert(this.big === PlayerOrNone.NONE, 'Cannot put a piece on top of a bigger one');
                return new EncapsuleCase(this.small, piecePlayer, this.big);
            default:
                Utils.expectToBe(size, Size.SMALL);
                assert(this.big === PlayerOrNone.NONE, 'Cannot put a piece on top of a bigger one');
                assert(this.medium === PlayerOrNone.NONE, 'Cannot put a piece on top of a bigger one');
                return new EncapsuleCase(piecePlayer, this.medium, this.big);
        }
    }
    public encode(): number {
        return this.small.value +
               this.medium.value*3 +
               this.big.value*9;
    }
    public belongsTo(player: Player): boolean {
        return this.getBiggest().getPlayer() === player;
    }
    public toString(): string {
        const pieceNames: string[] = this.toOrderedPieceNames();
        return '(' + pieceNames[0] + ', ' + pieceNames[1] + ', ' + pieceNames[2] + ')';
    }
}
