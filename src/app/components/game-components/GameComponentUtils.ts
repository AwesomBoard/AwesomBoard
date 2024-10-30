import { Coord } from 'src/app/jscaip/Coord';
import { HexaLayout } from 'src/app/jscaip/HexaLayout';

interface Limits {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number
}

export class ViewBox {

    public static fromLimits(minX: number, maxX: number, minY: number, maxY: number): ViewBox {
        const width: number = maxX - minX;
        const height: number = maxY - minY;
        return new ViewBox(minX, minY, width, height);
    }

    public static fromHexa(coords: Coord[], hexaLayout: HexaLayout, strokeWidth: number): ViewBox {
        const points: Coord[] = coords.flatMap((coord: Coord) => hexaLayout.getCenterAt(coord));
        const limits: Limits = ViewBox.getLimits(points);
        const left: number = limits.minX - (strokeWidth / 2);
        const up: number = limits.minY - (strokeWidth / 2);
        const width: number = strokeWidth + limits.maxX - limits.minX;
        const height: number = strokeWidth + limits.maxY - limits.minY;
        return new ViewBox(left, up, width, height);
    }

    private static getLimits(coords: Coord[]): Limits {
        let maxX: number = Number.MIN_SAFE_INTEGER;
        let maxY: number = Number.MIN_SAFE_INTEGER;
        let minX: number = Number.MAX_SAFE_INTEGER;
        let minY: number = Number.MAX_SAFE_INTEGER;
        for (const coord of coords) {
            minX = Math.min(minX, coord.x);
            minY = Math.min(minY, coord.y);
            maxX = Math.max(maxX, coord.x);
            maxY = Math.max(maxY, coord.y);
        }
        return { minX, minY, maxX, maxY };
    }

    public constructor(public readonly left: number,
                       public readonly up: number,
                       public readonly width: number,
                       public readonly height: number)
    {
    }

    public center(): Coord {
        return new Coord(this.left + this.width / 2, this.up + this.height / 2);
    }

    public bottom(): number {
        return this.up + this.height;
    }

    public right(): number {
        return this.left + this.width;
    }

    public expandAbove(above: number): ViewBox {
        return this.expand(0, 0, above, 0);
    }

    public expandBelow(below: number): ViewBox {
        return this.expand(0, 0, 0, below);
    }

    public expandLeft(left: number): ViewBox {
        return this.expand(left, 0, 0, 0);
    }

    public expandRight(right: number): ViewBox {
        return this.expand(0, right, 0, 0);
    }

    public expand(left: number, right: number, above: number, below: number): ViewBox {
        return new ViewBox(
            this.left - left,
            this.up - above,
            this.width + left + right,
            this.height + above + below,
        );
    }

    public expandAll(offset: number): ViewBox {
        return this.expand(offset, offset, offset, offset);
    }

    public containingAtLeast(viewBox: ViewBox): ViewBox {
        const left: number = Math.min(this.left, viewBox.left);
        const right: number = Math.max(this.right(), viewBox.right());
        const up: number = Math.min(this.up, viewBox.up);
        const bottom: number = Math.max(this.bottom(), viewBox.bottom());
        return ViewBox.fromLimits(left, right, up, bottom);
    }

    public toSVGString(): string {
        return `${this.left} ${this.up} ${this.width} ${this.height}`;
    }
}
