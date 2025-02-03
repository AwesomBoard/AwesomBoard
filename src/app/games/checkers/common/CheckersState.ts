import { Coord } from 'src/app/jscaip/Coord';
import { GameStateWithTable } from 'src/app/jscaip/state/GameStateWithTable';
import { Player } from 'src/app/jscaip/Player';
import { Table } from 'src/app/jscaip/TableUtils';
import { MGPOptional, Utils } from '@everyboard/lib';
import { PlayerNumberMap } from 'src/app/jscaip/PlayerMap';

export class CheckersPiece {

    public static readonly ZERO: CheckersPiece = new CheckersPiece(Player.ZERO, false);
    public static readonly ONE: CheckersPiece = new CheckersPiece(Player.ONE, false);
    public static readonly ZERO_PROMOTED: CheckersPiece = new CheckersPiece(Player.ZERO, true);
    public static readonly ONE_PROMOTED: CheckersPiece = new CheckersPiece(Player.ONE, true);

    private constructor(public readonly player: Player, public readonly isPromoted: boolean) {}

    public toString(): string {
        switch (this) {
            case CheckersPiece.ZERO: return 'u';
            case CheckersPiece.ONE: return 'v';
            case CheckersPiece.ZERO_PROMOTED: return 'O';
            default:
                Utils.expectToBe(this, CheckersPiece.ONE_PROMOTED);
                return 'X';
        }
    }

    public equals(other: CheckersPiece): boolean {
        return this === other;
    }

    /**
     * Returns a promoted version of this piece
     */
    public promote(): CheckersPiece {
        if (this.player === Player.ZERO) {
            return CheckersPiece.ZERO_PROMOTED;
        } else {
            return CheckersPiece.ONE_PROMOTED;
        }
    }

}
export class CheckersStack {

    public static EMPTY: CheckersStack = new CheckersStack([]);

    // The list of pieces is from top to bottom, hence [commander, its allies, its prisoners, more prisoners]
    public constructor(public readonly pieces: ReadonlyArray<CheckersPiece>) {}

    public isEmpty(): boolean {
        return this.pieces.length === 0;
    }

    public isOccupied(): boolean {
        return this.pieces.length > 0;
    }

    public isCommandedBy(player: Player): boolean {
        if (this.isEmpty()) {
            return false;
        }
        return this.getCommander().player === player;
    }

    public getCommander(): CheckersPiece {
        return this.pieces[0];
    }

    public getPiecesUnderCommander(): CheckersStack {
        return new CheckersStack(this.pieces.slice(1));
    }

    public capturePiece(piece: CheckersPiece): CheckersStack {
        return new CheckersStack(this.pieces.concat(piece));
    }

    public addStackBelow(stack: CheckersStack): CheckersStack {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        let resultingStack: CheckersStack = this;
        for (const piece of stack.pieces) {
            resultingStack = resultingStack.capturePiece(piece);
        }
        return resultingStack;
    }

    public getStackSize(): number {
        return this.pieces.length;
    }

    public promoteCommander(): CheckersStack {
        let commander: CheckersPiece = this.getCommander();
        if (commander.isPromoted) {
            return this;
        } else {
            commander = commander.promote();
            const remainingStack: CheckersStack = this.getPiecesUnderCommander();
            const commandingStack: CheckersStack = new CheckersStack([commander]);
            return commandingStack.addStackBelow(remainingStack);
        }
    }

    public get(index: number): CheckersPiece {
        return this.pieces[index];
    }

    public toString(length: number): string {
        let leftFill: number = length - this.getStackSize();
        let result: string = '';
        while (leftFill > 0) {
            result += '_';
            leftFill--;
        }
        for (const piece of this.pieces) {
            result += piece.toString();
        }
        return result;
    }
}

export class CheckersState extends GameStateWithTable<CheckersStack> {

    public static readonly SIZE: number = 7;

    public static of(board: Table<CheckersStack>, turn: number): CheckersState {
        return new CheckersState(board, turn);
    }

    public getStacksOf(player: Player): Coord[] {
        const stackCoords: Coord[] = [];
        for (const coordAndContent of this.getCoordsAndContents()) {
            if (coordAndContent.content.isCommandedBy(player)) {
                stackCoords.push(coordAndContent.coord);
            }
        }
        return stackCoords;
    }

    public set(coord: Coord, value: CheckersStack): CheckersState {
        const newBoard: CheckersStack[][] = this.getCopiedBoard();
        newBoard[coord.y][coord.x] = value;
        return new CheckersState(newBoard, this.turn);
    }

    public remove(coord: Coord): CheckersState {
        return this.set(coord, CheckersStack.EMPTY);
    }

    public incrementTurn(): CheckersState {
        return new CheckersState(this.getCopiedBoard(), this.turn + 1);
    }

    public getFinishLineOf(player: Player): number {
        if (player === Player.ZERO) {
            return 0;
        } else {
            return this.getHeight() - 1;
        }
    }

    public coordIsCommandedBy(coord: Coord, player: Player): boolean {
        const optional: MGPOptional<CheckersStack> = this.getOptionalPieceAt(coord);
        if (optional.isPresent()) {
            return optional.get().isCommandedBy(player);
        } else {
            return false;
        }
    }

    public isEmptyAt(coord: Coord): boolean {
        const optional: MGPOptional<CheckersStack> = this.getOptionalPieceAt(coord);
        if (optional.isPresent()) {
            return optional.get().isEmpty();
        } else {
            return false;
        }
    }

    public getScores(): MGPOptional<PlayerNumberMap> {
        const zeroScore: number = this.getStacksOf(Player.ZERO).length;
        const oneScore: number = this.getStacksOf(Player.ONE).length;
        const scores: PlayerNumberMap = PlayerNumberMap.of(zeroScore, oneScore);
        return MGPOptional.of(scores);
    }

    public override toString(): string {
        let biggerStack: number = 1;
        const height: number = this.getHeight();
        const width: number = this.getWidth();
        for (let y: number = 0; y < height; y++) {
            for (let x: number = 0; x < width; x++) {
                const newStackSize: number = this.getPieceAtXY(x, y).getStackSize();
                biggerStack = Math.max(biggerStack, newStackSize);
            }
        }
        const lines: string[] = [];
        for (let y: number = 0; y < height; y++) {
            const squares: string[] = [];
            for (let x: number = 0; x < width; x++) {
                squares.push(this.getPieceAtXY(x, y).toString(biggerStack));
            }
            lines.push(squares.join(' '));
        }
        return lines.join('\n');
    }
}
