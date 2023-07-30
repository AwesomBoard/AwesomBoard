import { Coord } from 'src/app/jscaip/Coord';
import { GameStateWithTable } from 'src/app/jscaip/GameStateWithTable';
import { Player } from 'src/app/jscaip/Player';
import { Table } from 'src/app/utils/ArrayUtils';
import { MGPMap } from 'src/app/utils/MGPMap';
import { MGPOptional } from 'src/app/utils/MGPOptional';
import { MGPSet } from 'src/app/utils/MGPSet';
import { MartianChessMove } from './MartianChessMove';
import { MartianChessPiece } from './MartianChessPiece';

export class MartianChessCapture {

    public static of(pieces: MartianChessPiece[]): MartianChessCapture {
        const map: MGPMap<MartianChessPiece, number> = new MGPMap<MartianChessPiece, number>();
        for (const piece of pieces) {
            MartianChessCapture.addToMap(map, piece);
        }
        return new MartianChessCapture(map);
    }
    public static addToMap(map: MGPMap<MartianChessPiece, number>, piece: MartianChessPiece): void {
        const oldValue: MGPOptional<number> = map.get(piece);
        if (oldValue.isPresent()) {
            map.replace(piece, oldValue.get() + 1);
        } else {
            map.set(piece, 1);
        }
    }
    public constructor(public readonly captures: MGPMap<MartianChessPiece, number>) {
        captures.makeImmutable();
    }
    public toValue(): number {
        let sum: number = 0;
        this.captures.forEach((item: {key: MartianChessPiece, value: number}) => {
            sum += item.key.getValue() * item.value;
        });
        return sum;
    }
    public add(piece: MartianChessPiece): MartianChessCapture {
        const newMap: MGPMap<MartianChessPiece, number> = this.captures.getCopy();
        MartianChessCapture.addToMap(newMap, piece);
        return new MartianChessCapture(newMap);
    }
}
export class MartianChessState extends GameStateWithTable<MartianChessPiece> {

    public static readonly PLAYER_ZERO_TERRITORY: MGPSet<number> = new MGPSet([4, 5, 6, 7]);

    public static readonly PLAYER_ONE_TERRITORY: MGPSet<number> = new MGPSet([0, 1, 2, 3]);

    public static getInitialState(): MartianChessState {
        const _: MartianChessPiece = MartianChessPiece.EMPTY;
        const A: MartianChessPiece = MartianChessPiece.PAWN;
        const B: MartianChessPiece = MartianChessPiece.DRONE;
        const C: MartianChessPiece = MartianChessPiece.QUEEN;
        const board: Table<MartianChessPiece> = [
            [C, C, B, _],
            [C, B, A, _],
            [B, A, A, _],
            [_, _, _, _],
            [_, _, _, _],
            [_, A, A, B],
            [_, A, B, C],
            [_, B, C, C],
        ];
        return new MartianChessState(board, 0, MGPOptional.empty());
    }
    public readonly captured: MGPMap<Player, MartianChessCapture>;

    public constructor(board: Table<MartianChessPiece>,
                       turn: number,
                       public readonly lastMove: MGPOptional<MartianChessMove> = MGPOptional.empty(),
                       public readonly countDown: MGPOptional<number> = MGPOptional.empty(),
                       captured?: MGPMap<Player, MartianChessCapture>)
    {
        super(board, turn);
        if (captured == null) {
            captured = new MGPMap([
                { key: Player.ZERO, value: MartianChessCapture.of([]) },
                { key: Player.ONE, value: MartianChessCapture.of([]) },
            ]);
        }
        captured.makeImmutable();
        this.captured = captured;
    }
    public getPlayerTerritory(player: Player): MGPSet<number> {
        if (player === Player.ZERO) {
            return MartianChessState.PLAYER_ZERO_TERRITORY;
        } else {
            return MartianChessState.PLAYER_ONE_TERRITORY;
        }
    }
    public isTherePieceOnPlayerSide(piece: MartianChessPiece): boolean {
        const currentPlayer: Player = this.getCurrentPlayer();
        const playerTerritory: MGPSet<number> = this.getPlayerTerritory(currentPlayer);
        for (const y of playerTerritory) {
            for (let x: number = 0; x < 4; x++) {
                if (this.getPieceAtXY(x, y) === piece) {
                    return true;
                }
            }
        }
        return false;
    }
    public getScoreOf(player: Player): number {
        return this.captured.get(player).get().toValue();
    }
    public getEmptyTerritory(): MGPOptional<Player> {
        if (this.isTerritoryEmpty(Player.ZERO)) {
            return MGPOptional.of(Player.ZERO);
        } else if (this.isTerritoryEmpty(Player.ONE)) {
            return MGPOptional.of(Player.ONE);
        } else {
            return MGPOptional.empty();
        }
    }
    public isTerritoryEmpty(player: Player): boolean {
        const playerTerritory: MGPSet<number> = this.getPlayerTerritory(player);
        for (const y of playerTerritory) {
            for (let x: number = 0; x < 4; x++) {
                if (this.getPieceAtXY(x, y) !== MartianChessPiece.EMPTY) {
                    return false;
                }
            }
        }
        return true;
    }
    public isInOpponentTerritory(coord: Coord): boolean {
        const opponent: Player = this.getCurrentOpponent();
        const opponentTerritory: MGPSet<number> = this.getPlayerTerritory(opponent);
        return opponentTerritory.contains(coord.y);
    }
    public isInPlayerTerritory(coord: Coord): boolean {
        const player: Player = this.getCurrentPlayer();
        const playerTerritory: MGPSet<number> = this.getPlayerTerritory(player);
        return playerTerritory.contains(coord.y);
    }
    public getCapturesOf(player: Player): [number, number, number] {
        const capture: MartianChessCapture = this.captured.get(player).get();
        return [
            capture.captures.get(MartianChessPiece.PAWN).getOrElse(0),
            capture.captures.get(MartianChessPiece.DRONE).getOrElse(0),
            capture.captures.get(MartianChessPiece.QUEEN).getOrElse(0),
        ];
    }
}
