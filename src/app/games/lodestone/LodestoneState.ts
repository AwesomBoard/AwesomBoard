import { LodestoneDirection, LodestonePiece, LodestonePieceLodestone, LodestonePieceNone, LodestonePiecePlayer } from 'src/app/games/lodestone/LodestonePiece';
import { Coord } from 'src/app/jscaip/Coord';
import { GameStateWithTable } from 'src/app/jscaip/state/GameStateWithTable';
import { Player } from 'src/app/jscaip/Player';
import { Table } from 'src/app/jscaip/TableUtils';
import { ArrayUtils, MGPMap, MGPOptional, Utils } from '@everyboard/lib';
import { LodestoneCaptures } from './LodestoneMove';
import { PlayerNumberMap } from 'src/app/jscaip/PlayerMap';

/**
 * Represent different LodestonePressurePlate from the same side of the board
 */
export class LodestonePressurePlateGroup {

    public static of(sizes: number[]): LodestonePressurePlateGroup {
        let plates: LodestonePressurePlate[] = [];
        for (const size of sizes) {
            const newPlate: LodestonePressurePlate = new LodestonePressurePlate(size, []);
            plates = plates.concat(newPlate);
        }
        return new LodestonePressurePlateGroup(plates);
    }

    public constructor(public readonly plates: LodestonePressurePlate[]) {
    }

    public getCrumbledPlates(): LodestonePressurePlate[] {
        const fullPlates: LodestonePressurePlate[] = [];
        for (const plate of this.plates) {
            if (plate.getRemainingSpaces() === 0) {
                fullPlates.push(plate);
            } else {
                return fullPlates;
            }
        }
        return fullPlates;
    }

    public getCurrentPlate(): MGPOptional<LodestonePressurePlate> {
        for (const plate of this.plates) {
            if (plate.getRemainingSpaces() > 0) {
                return MGPOptional.of(plate);
            }
        }
        return MGPOptional.empty();
    }

    private getFollowingPlates(): LodestonePressurePlate[] {
        const nextPlates: LodestonePressurePlate[] = [];
        let currentPlateReached: boolean = false;
        for (const plate of this.plates) {
            if (currentPlateReached) {
                nextPlates.push(plate);
            } else if (plate.getRemainingSpaces() > 0) {
                currentPlateReached = true;
            }
        }
        return nextPlates;
    }

    public getCurrentPlateWidth(): number {
        const currentPlate: MGPOptional<LodestonePressurePlate> = this.getCurrentPlate();
        const emptyplate: LodestonePressurePlate = new LodestonePressurePlate(0, []);
        return currentPlate.getOrElse(emptyplate).width;
    }

    /**
     * @returns the number of piece that can be put in that pressure plate group, all pressures plates included
     */
    public getGroupRemainingSpaces(): number {
        const remainingSpaces: number[] =
            this.plates.map((plate: LodestonePressurePlate) => plate.getRemainingSpaces());
        const totalRemainingSpaces: number = remainingSpaces.reduce((left: number, right: number) => left + right);
        return totalRemainingSpaces;
    }

    public addCaptured(player: Player, quantity: number): LodestonePressurePlateGroup {
        if (quantity === 0) {
            return this;
        }
        const remainingSpaces: number = this.getGroupRemainingSpaces();
        Utils.assert(quantity <= remainingSpaces,
                     `should never put more pieces than the plate can support (${ remainingSpaces } > ${ quantity})`);
        const fullPlates: LodestonePressurePlate[] = this.getCrumbledPlates();
        const currentPlate: LodestonePressurePlate = this.getCurrentPlate().get();
        const nextPlates: LodestonePressurePlate[] = this.getFollowingPlates();
        const newPieces: LodestonePiecePlayer[] = ArrayUtils.copy(currentPlate.getPiecesCopy());
        const maxPiecesToPut: number = Math.min(quantity, currentPlate.getRemainingSpaces());
        for (let i: number = 0; i < maxPiecesToPut; i++) {
            newPieces.push(LodestonePiecePlayer.of(player));
            quantity--;
        }
        const newCurrentPlate: LodestonePressurePlate =
            new LodestonePressurePlate(currentPlate.width, newPieces);
        const newGroup: LodestonePressurePlateGroup =
            new LodestonePressurePlateGroup(fullPlates.concat(newCurrentPlate).concat(nextPlates));
        return newGroup.addCaptured(player, quantity);
    }

    public getFillablePlateIndex(): number {
        let i: number = 0;
        for (const plate of this.plates) {
            if (plate.getRemainingSpaces() > 0) {
                return i;
            }
            i++;
        }
        return -1;
    }

}

export class LodestonePressurePlate {

    public static POSITIONS: LodestonePressurePlatePosition[] = ['top', 'bottom', 'left', 'right'];

    public constructor(public readonly width: number,
                       private readonly pieces: readonly LodestonePiecePlayer[]) {
    }

    public getPieceAt(index: number): LodestonePiece {
        if (index < this.pieces.length) {
            return this.pieces[index];
        } else {
            return LodestonePieceNone.EMPTY;
        }
    }

    public getRemainingSpaces(): number {
        return this.width - this.pieces.length;
    }

    public getPiecesCopy(): LodestonePiecePlayer[] {
        return ArrayUtils.copy(this.pieces);
    }

}

export type LodestonePressurePlatePosition = 'top' | 'bottom' | 'left' | 'right';

export type LodestonePressurePlates = Record<LodestonePressurePlatePosition,
                                             LodestonePressurePlateGroup>;

// eslint-disable-next-line @typescript-eslint/no-redeclare
export namespace LodestonePressurePlates {

    export function getInitialLodestonePressurePlates(sizes: number[]): LodestonePressurePlates {
        const newLodestonePressurePlates: LodestonePressurePlates = {} as LodestonePressurePlates;
        for (const position of LodestonePressurePlate.POSITIONS) {
            newLodestonePressurePlates[position] = LodestonePressurePlateGroup.of(sizes);
        }
        return newLodestonePressurePlates;
    }

}

export type LodestonePositions = MGPMap<Player, Coord>;

export class LodestoneState extends GameStateWithTable<LodestonePiece> {

    public static readonly SIZE: number = 8;

    public static readonly NUMBER_OF_PIECES: number = 24;

    public static readonly INITIAL_PRESSURE_PLATES: LodestonePressurePlates =
        LodestonePressurePlates.getInitialLodestonePressurePlates([5, 3]);

    public constructor(board: Table<LodestonePiece>,
                       turn: number,
                       public readonly lodestones: LodestonePositions,
                       public readonly pressurePlates: LodestonePressurePlates)
    {
        super(board, turn);
    }

    public withBoard(board: Table<LodestonePiece>): LodestoneState {
        return new LodestoneState(board, this.turn, this.lodestones, this.pressurePlates);
    }

    public remainingSpaces(): number {
        const remaining: LodestoneCaptures = this.remainingSpacesDetails();
        return remaining.top + remaining.bottom + remaining.left + remaining.right;
    }

    public remainingSpacesDetails(): LodestoneCaptures {
        const remaining: LodestoneCaptures = { top: 0, bottom: 0, left: 0, right: 0 };
        for (const position of LodestonePressurePlate.POSITIONS) {
            const pressurePlates: LodestonePressurePlateGroup = this.pressurePlates[position];
            const currentlyFillablePlateIndex: number = pressurePlates.getFillablePlateIndex();
            if (currentlyFillablePlateIndex === -1) {
                remaining[position] = 0;
            } else {
                remaining[position] = pressurePlates.getGroupRemainingSpaces();
            }
        }
        return remaining;
    }

    public numberOfPieces(): PlayerNumberMap {
        const playerPieces: PlayerNumberMap = PlayerNumberMap.of(0, 0);
        for (let y: number = 0; y < LodestoneState.SIZE; y++) {
            for (let x: number = 0; x < LodestoneState.SIZE; x++) {
                const piece: LodestonePiece = this.getPieceAtXY(x, y);
                if (piece.isPlayerPiece()) {
                    playerPieces.add(piece.owner, 1);
                }
            }
        }
        return playerPieces;
    }

    public getScores(): PlayerNumberMap {
        const remainingPieces: PlayerNumberMap = this.numberOfPieces();
        return PlayerNumberMap.of(
            LodestoneState.NUMBER_OF_PIECES - remainingPieces.get(Player.ONE),
            LodestoneState.NUMBER_OF_PIECES - remainingPieces.get(Player.ZERO),
        );
    }

    public nextLodestoneDirection(): MGPOptional<LodestoneDirection> {
        const currentPlayer: Player = this.getCurrentPlayer();
        const lodestonePosition: MGPOptional<Coord> = this.lodestones.get(currentPlayer);
        if (lodestonePosition.isPresent()) {
            const piece: LodestonePiece = this.getPieceAt(lodestonePosition.get());
            Utils.assert(piece.isLodestone(), 'Piece must be lodestone (invariant from LodestoneState)' + lodestonePosition.get());
            const lodestone: LodestonePieceLodestone = piece as LodestonePieceLodestone;
            const currentDirection: LodestoneDirection = lodestone.direction;
            switch (currentDirection) {
                case 'push': return MGPOptional.of('pull');
                case 'pull': return MGPOptional.of('push');
            }
        } else {
            return MGPOptional.empty();
        }
    }

    public coordIsOwnedBy(coord: Coord, player: Player): boolean {
        const optional: MGPOptional<LodestonePiece> = this.getOptionalPieceAt(coord);
        if (optional.isPresent()) {
            return optional.get().owner.equals(player);
        } else {
            return false;
        }
    }

}
