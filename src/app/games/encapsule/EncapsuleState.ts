import { ArrayUtils, MGPMap, MGPOptional, NumberMap, Utils } from '@everyboard/lib';
import { GameStateWithTable } from 'src/app/jscaip/state/GameStateWithTable';
import { EncapsulePiece } from 'src/app/games/encapsule/EncapsulePiece';
import { Player, PlayerOrNone } from 'src/app/jscaip/Player';
import { Table } from 'src/app/jscaip/TableUtils';
import { PlayerMap } from 'src/app/jscaip/PlayerMap';

export class EncapsuleRemainingPieces extends PlayerMap<EncapsuleSizeToNumberMap> {
}
export class EncapsuleSizeToNumberMap extends NumberMap<number> {
}

export class EncapsuleState extends GameStateWithTable<EncapsuleSpace> {

    public readonly remainingPieces: EncapsuleRemainingPieces;

    public readonly nbOfPieceSize: number;

    public constructor(
        board: Table<EncapsuleSpace>,
        turn: number,
        remainingPieces: EncapsuleRemainingPieces,
        nbOfPieceSize: number)
    {
        super(board, turn);
        this.remainingPieces = remainingPieces;
        this.remainingPieces.get(Player.ZERO).makeImmutable();
        this.remainingPieces.get(Player.ONE).makeImmutable();
        this.remainingPieces.makeImmutable();
        this.nbOfPieceSize = nbOfPieceSize;
    }

    public getRemainingPiecesCopy(): EncapsuleRemainingPieces {
        const playerZeroValue: EncapsuleSizeToNumberMap = this.remainingPieces.get(Player.ZERO).getCopy();
        const playerOneValue: EncapsuleSizeToNumberMap = this.remainingPieces.get(Player.ONE).getCopy();
        playerZeroValue.makeImmutable();
        playerOneValue.makeImmutable();
        return PlayerMap.ofValues(playerZeroValue, playerOneValue);
    }

    public getRemainingPiecesOfPlayer(player: Player): EncapsuleSizeToNumberMap {
        return this.getRemainingPiecesCopy().get(player);
    }

    public pieceBelongsToCurrentPlayer(piece: EncapsulePiece): boolean {
        return piece.belongsTo(this.getCurrentPlayer());
    }

    public isDroppable(piece: EncapsulePiece): boolean {
        return this.pieceBelongsToCurrentPlayer(piece) &&
               this.isInRemainingPieces(piece);
    }

    public isInRemainingPieces(piece: EncapsulePiece): boolean {
        const playerPieces: EncapsuleSizeToNumberMap = this.remainingPieces.get(piece.getPlayer() as Player);
        const numberOfPieces: number = playerPieces.get(piece.getSize()).getOrElse(0);
        return numberOfPieces > 0;
    }

}

export class EncapsuleSpace {

    public static readonly EMPTY: EncapsuleSpace = new EncapsuleSpace(new MGPMap());

    public constructor(public readonly pieces: MGPMap<number, Player>) {
        this.pieces.makeImmutable();
    }

    public getOccupiedCircles(): MGPMap<number, Player> {
        return this.pieces.filter(this.isEmptyKeyValue);
    }

    public isEmpty(): boolean {
        const occupiedCircles: MGPMap<number, Player> = this.getOccupiedCircles();
        return occupiedCircles.size() === 0;
    }

    private isEmptyKeyValue(_: number, value: PlayerOrNone): boolean {
        return value.isPlayer();
    }

    public toList(): EncapsulePiece[] {
        const pieces: EncapsulePiece[] = [];
        for (const size of this.pieces.getKeyList()) {
            const player: PlayerOrNone = this.pieces.get(size).get();
            if (player.isPlayer()) {
                const newPiece: EncapsulePiece = EncapsulePiece.ofSizeAndPlayer(size, player);
                pieces.push(newPiece);
            }
        }
        return pieces;
    }

    public getBiggest(): EncapsulePiece {
        const occupiedCircles: MGPMap<number, Player> = this.getOccupiedCircles();
        const occupiedSizes: number[] = occupiedCircles.getKeyList();
        const sortedSizes: number[] = ArrayUtils.maximumsBy(occupiedSizes, (value: number) => value);
        if (sortedSizes.length === 0) {
            return EncapsulePiece.NONE;
        } else {
            const biggestSize: number = sortedSizes[0];
            const biggestPlayer: PlayerOrNone = this.pieces.get(biggestSize).get();
            return EncapsulePiece.ofSizeAndPlayer(biggestSize, biggestPlayer);
        }
    }

    public tryToSuperposePiece(piece: EncapsulePiece): MGPOptional<EncapsuleSpace> {
        const biggestPresent: number = this.getBiggest().getSize();
        if (piece === EncapsulePiece.NONE) {
            throw new Error('Cannot move EMPTY on a space');
        }
        if (piece.getSize() > biggestPresent) {
            return MGPOptional.of(this.put(piece));
        } else {
            return MGPOptional.empty();
        }
    }

    public removeBiggest(): {removedSpace: EncapsuleSpace, removedPiece: EncapsulePiece} {
        const removedPiece: EncapsulePiece = this.getBiggest();
        if (removedPiece === EncapsulePiece.NONE) {
            throw new Error('Cannot remove piece from empty space');
        }
        const size: number = removedPiece.getSize();
        const removedPieces: MGPMap<number, Player> = this.pieces.getCopy();
        removedPieces.delete(size);
        removedPieces.makeImmutable();
        const removedSpace: EncapsuleSpace = new EncapsuleSpace(removedPieces);
        return { removedSpace: removedSpace, removedPiece };
    }

    public put(piece: EncapsulePiece): EncapsuleSpace {
        if (piece === EncapsulePiece.NONE) throw new Error('Cannot put NONE on space');
        const biggest: EncapsulePiece = this.getBiggest();
        Utils.assert(biggest.size < piece.size, 'Cannot put a piece on top of a bigger one');
        const addedPieces: MGPMap<number, Player> = this.pieces.getCopy();
        addedPieces.put(piece.getSize(), piece.getPlayer() as Player);
        addedPieces.makeImmutable();
        return new EncapsuleSpace(addedPieces);
    }

    public belongsTo(player: Player): boolean {
        return this.getBiggest().getPlayer() === player;
    }

}
