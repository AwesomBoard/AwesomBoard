import { ComparableObject, MathUtils } from '@everyboard/lib';

export class Vector implements ComparableObject {

    public constructor(public readonly x: number, public readonly y: number) {}

    public equals(other: Vector): boolean {
        return this.x === other.x && this.y === other.y;
    }

    public isSingleOrthogonalStep(): boolean {
        const isUnitary: boolean = Math.abs(this.x) + Math.abs(this.y) === 1;
        return this.isOrthogonal() && isUnitary;
    }

    public isOrthogonal(): boolean {
        return this.x === 0 || this.y === 0;
    }

    public isDiagonal(): boolean {
        return this.x !== 0 &&
               Math.abs(this.x) === Math.abs(this.y);
    }

    public isDiagonalOfLength(length: number): boolean {
        return Math.abs(this.x) === length &&
               Math.abs(this.y) === length;
    }

    public toMinimalVector(): Vector {
        const greatestCommonDivisor: number = MathUtils.gcd(this.x, this.y);
        return new Vector(this.x / greatestCommonDivisor,
                          this.y / greatestCommonDivisor);
    }

    /**
      * @param otherVector the other vector to add to this
      * @param times the number of time you want to add it
      * @returns the vector that is the sum of this vector and otherVector * times
     */
    public combine(otherVector: Vector, times: number = 1): Vector {
        const newX: number = this.x + (times * otherVector.x);
        const newY: number = this.y + (times * otherVector.y);
        return new Vector(newX, newY);
    }

    public toString(): string {
        return '(' + this.x + ', ' + this.y + ')';
    }

    public toHTMLClassName(): string {
        return this.toString().replace('_', '-');
    }

}
