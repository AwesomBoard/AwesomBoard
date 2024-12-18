import { MGPFallible } from '@everyboard/lib';
import { Coord } from './Coord';
import { Vector } from './Vector';
import { Localized } from '../utils/LocaleUtils';

export abstract class Direction extends Vector {

    public declare readonly x: number;

    public declare readonly y: number;

    public isDown(): boolean {
        return this.y === 1;
    }

    public isUp(): boolean {
        return this.y === -1;
    }

    public isLeft(): boolean {
        return this.x === -1;
    }

    public isRight(): boolean {
        return this.x === 1;
    }

    public isHorizontal(): boolean {
        return this.y === 0 && this.x !== 0;
    }

    public toInt(): number {
        if (this.x === 0 && this.y === -1) return 0;
        if (this.x === 1 && this.y === 0) return 1;
        if (this.x === 0 && this.y === 1) return 2;
        if (this.x === -1 && this.y === 0) return 3;
        if (this.x === -1 && this.y === -1) return 4;
        if (this.x === 1 && this.y === -1) return 5;
        if (this.x === -1 && this.y === 1) return 6;
        else return 7;
    }

    public override toString(): string {
        if (this.x === 0 && this.y === -1) return 'UP';
        if (this.x === 1 && this.y === 0) return 'RIGHT';
        if (this.x === 0 && this.y === 1) return 'DOWN';
        if (this.x === -1 && this.y === 0) return 'LEFT';
        if (this.x === -1 && this.y === -1) return 'UP_LEFT';
        if (this.x === 1 && this.y === -1) return 'UP_RIGHT';
        if (this.x === -1 && this.y === 1) return 'DOWN_LEFT';
        else return 'DOWN_RIGHT';
    }

    public abstract getAngle(): number;

    public abstract getOpposite(): this;

}

export abstract class DirectionFactory<T extends Direction> {

    public abstract all: ReadonlyArray<T>;

    public from(x: number, y: number): MGPFallible<T> {
        for (const dir of this.all) {
            if (dir.x === x && dir.y === y) return MGPFallible.success(dir);
        }
        return MGPFallible.failure('Invalid x or y in direction construction');
    }

    public fromDelta(dx: number, dy: number): MGPFallible<T> {
        if (dx === 0 && dy === 0) {
            return MGPFallible.failure('Empty delta for direction');
        } else if (Math.abs(dx) === Math.abs(dy) ||
                   dx === 0 ||
                   dy === 0)
        {
            return this.from(Math.sign(dx), Math.sign(dy));
        }
        return MGPFallible.failure(DirectionFailure.DIRECTION_MUST_BE_LINEAR());
    }

    public fromMove(start: Coord, end: Coord): MGPFallible<T> {
        return this.fromDelta(end.x - start.x, end.y - start.y);
    }

    public fromString(str: string): MGPFallible<T> {
        switch (str) {
            case 'UP': return this.from(0, -1);
            case 'RIGHT': return this.from(1, 0);
            case 'DOWN': return this.from(0, 1);
            case 'LEFT': return this.from(-1, 0);
            case 'UP_LEFT': return this.from(-1, -1);
            case 'UP_RIGHT': return this.from(1, -1);
            case 'DOWN_LEFT': return this.from(-1, 1);
            case 'DOWN_RIGHT': return this.from(1, 1);
            default: return MGPFallible.failure(`Invalid direction string ${str}`);
        }
    }

    public fromInt(int: number): MGPFallible<T> {
        switch (int) {
            case 0: return this.from(0, -1);
            case 1: return this.from(1, 0);
            case 2: return this.from(0, 1);
            case 3: return this.from(-1, 0);
            case 4: return this.from(-1, -1);
            case 5: return this.from(1, -1);
            case 6: return this.from(-1, 1);
            case 7: return this.from(1, 1);
            default: return MGPFallible.failure(`Invalid int direction: ${int}`);
        }
    }

}

export class DirectionFailure {

    public static readonly DIRECTION_MUST_BE_LINEAR: Localized = () => $localize`You must move in a straight line! You can only move orthogonally or diagonally!`;
}
